/**
 * Qwen LLM service — turns a merchant's free-form WhatsApp text
 * into one structured command. Pure service layer: no Express, no DB.
 *
 * Two interchangeable hosts, selected via LLM_PROVIDER env (no code edits):
 * - groq (default when GROQ_API_KEY is set): free tier, no card, and hosts
 *   current Qwen models (qwen/qwen3.8-27b) via the OpenAI-compatible API.
 * - dashscope: Alibaba Cloud Model Studio — needs an activated key; intl
 *   keys (sk-ws-...) only work on dashscope-intl.aliyuncs.com.
 */
import axios from 'axios';

// Alibaba Cloud DashScope — Qwen chat completions. China (dashscope.aliyuncs.com)
// and International (dashscope-intl.aliyuncs.com) are SEPARATE services with
// separate keys — the base URL must match the console the key came from.
// Our key is from Model Studio (International), hence the intl default.

const SYSTEM_PROMPT = `You convert a Pakistani merchant's WhatsApp message (which may be in
English, Urdu, or Roman Urdu) into exactly one JSON object — no prose, no markdown fences,
JSON only. Pick ONE of these three shapes:

1. Logging a sale:
{"type":"log_sale","item":{"name":"<item name as the merchant referred to it>","quantity":<number>},"paymentMethod":"easypaisa"|"jazzcash"|"bank"|"cash","amount":<number or null>}

2. Creating an automation:
{"type":"create_workflow","trigger":"message"|"schedule"|"threshold","condition":{...},"action":{...},"rawInstruction":"<original text>"}

3. Anything else (a question, a greeting, unclear intent):
{"type":"unknown","rawText":"<original text>"}

If required fields aren't confidently extractable, use "unknown" — never guess numbers or
item names that weren't actually said.`;

const BUSINESS_DETAILS_PROMPT = `You extract business details from a Pakistani merchant's
WhatsApp onboarding message (which may be in English, Urdu, or Roman Urdu). Reply with
exactly one JSON object — no prose, no markdown fences, JSON only:
{"businessName":"<name or null>","location":"<city/area or null>","sells":"<what they sell or null>"}
Use null for anything the message doesn't clearly state. Never guess or invent details.`;

const INVENTORY_PROMPT = `You parse a Pakistani merchant's WhatsApp stock list (which may be
in English, Urdu, or Roman Urdu) into line items. Reply with exactly one JSON object — no
prose, no markdown fences, JSON only:
{"items":[{"name":"<item name>","quantity":<number or 0>,"price":<number or null>,"unit":"<bag|kg|litre|piece etc, or null>"}]}
One entry per distinct item the merchant listed. Quantity means how many units are in stock.
Use quantity 0 and price null when not stated — never invent numbers.`;

/** Which host the LLM calls go to — env-overridable, defaults to the free path. */
function llmProvider() {
  return process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'dashscope');
}

/** True when the selected provider actually has a key to call with. */
function llmConfigured() {
  return llmProvider() === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.DASHSCOPE_API_KEY;
}

/**
 * Shared LLM chat call — intent parsing and the onboarding extractors
 * all funnel through here so auth/timeout behaviour lives in one place.
 */
async function chatCompletion(systemPrompt, userText) {
  if (llmProvider() === 'groq') {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.LLM_MODEL || 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
        temperature: 0,
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 15_000,
      }
    );
    return data?.choices?.[0]?.message?.content ?? '';
  }

  const baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com';
  const { data } = await axios.post(
    `${baseUrl}/api/v1/services/aigc/text-generation/generation`,
    {
      model: process.env.QWEN_MODEL || 'qwen2.5-72b-instruct',
      input: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
      },
      parameters: { result_format: 'message' },
    },
    {
      headers: { Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}` },
      timeout: 15_000,
    }
  );

  return data?.output?.choices?.[0]?.message?.content ?? data?.output?.text ?? '';
}

/**
 * Returns one of the three command-contract shapes above. Shared by the
 * typed-text path and (via the agent module) the voice-transcript path, so
 * both inputs converge on identical downstream handling.
 */
export async function parseIntent(text) {
  if (!llmConfigured()) {
    console.warn('No LLM provider key set — falling back to unknown intent');
    return { type: 'unknown', rawText: text };
  }

  const raw = await chatCompletion(SYSTEM_PROMPT, text);

  try {
    const parsed = JSON.parse(raw);
    if (!['log_sale', 'create_workflow', 'unknown'].includes(parsed.type)) {
      return { type: 'unknown', rawText: text };
    }
    return parsed;
  } catch {
    console.warn('Qwen returned non-JSON, falling back to unknown:', raw);
    return { type: 'unknown', rawText: text };
  }
}

/**
 * Extracts { businessName, location, sells } from the onboarding message,
 * with null for anything not clearly stated. Returns null when the model is
 * unavailable or returns garbage — callers fall back to the raw text rather
 * than blocking onboarding on a flaky NLP call.
 */
export async function extractBusinessDetails(text) {
  if (!llmConfigured()) return null;

  try {
    const parsed = JSON.parse(await chatCompletion(BUSINESS_DETAILS_PROMPT, text));
    const strOrNull = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const details = {
      businessName: strOrNull(parsed.businessName),
      location: strOrNull(parsed.location),
      sells: strOrNull(parsed.sells),
    };
    return details.businessName || details.location || details.sells ? details : null;
  } catch {
    return null;
  }
}

/**
 * Parses a free-form stock list ("5 rice bags 2000 each, 3 kg sugar...") into
 * normalized line items for onboarding. Returns a non-empty array, or null
 * when extraction can't run / yields nothing usable — callers then keep the
 * raw text as a single unparsed item so onboarding still completes.
 */
export async function extractInventoryItems(text) {
  if (!llmConfigured()) return null;

  try {
    const parsed = JSON.parse(await chatCompletion(INVENTORY_PROMPT, text));
    if (!Array.isArray(parsed.items)) return null;

    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

    const items = parsed.items
      .filter((i) => typeof i?.name === 'string' && i.name.trim())
      .map((i) => ({
        name: i.name.trim().slice(0, 100),
        quantity: Math.max(0, Math.round(num(i.quantity) ?? 0)),
        price: num(i.price),
        unit: typeof i.unit === 'string' && i.unit.trim() ? i.unit.trim().slice(0, 30) : null,
      }))
      .slice(0, 100);

    return items.length ? items : null;
  } catch {
    return null;
  }
}
