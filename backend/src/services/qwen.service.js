/**
 * Qwen-2.5 (DashScope) service — turns a merchant's free-form WhatsApp text
 * into one structured command. Pure service layer: no Express, no DB.
 */
import axios from 'axios';

// Alibaba Cloud DashScope — Qwen-2.5 chat completions endpoint.
const DASHSCOPE_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

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

/**
 * Returns one of the three command-contract shapes above. Shared by the
 * typed-text path and (via the agent module) the voice-transcript path, so
 * both inputs converge on identical downstream handling.
 */
export async function parseIntent(text) {
  if (!process.env.DASHSCOPE_API_KEY) {
    console.warn('DASHSCOPE_API_KEY not set — falling back to unknown intent');
    return { type: 'unknown', rawText: text };
  }

  const { data } = await axios.post(
    DASHSCOPE_URL,
    {
      model: 'qwen2.5-72b-instruct',
      input: {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      },
      parameters: { result_format: 'message' },
    },
    {
      headers: { Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}` },
      timeout: 15_000,
    }
  );

  const raw =
    data?.output?.choices?.[0]?.message?.content ?? data?.output?.text ?? '{}';

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
