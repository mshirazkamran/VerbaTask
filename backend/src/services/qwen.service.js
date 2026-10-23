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
import { normalizePaymentMethod } from '../constants/paymentMethods.js';

// Alibaba Cloud DashScope — Qwen chat completions. China (dashscope.aliyuncs.com)
// and International (dashscope-intl.aliyuncs.com) are SEPARATE services with
// separate keys — the base URL must match the console the key came from.
// Our key is from Model Studio (International), hence the intl default.

import { getMerchantCatalog } from './catalogCache.service.js';
import { logger, errorSummary } from './logger.service.js';

const SYSTEM_PROMPT = `You convert a Pakistani merchant's WhatsApp message (which may be in
English, Urdu script, or Roman Urdu) for ANY retail trade (general store, grocery/kiryana, medical/pharmacy, clothing/boutique, auto parts, electronics, restaurant/bakery, hardware) into exactly one JSON object — no prose, no markdown fences, JSON only. Pick ONE of these shapes:

1. Logging a sale (customer purchased goods, selling items):
{"type":"log_sale","items":[{"name":"<item name as the merchant referred to it>","quantity":<number>}],"paymentMethod":"cash"|"easypaisa"|"jazzcash"|"sadapay"|"nayapay"|"raast"|"meezan"|"hbl"|"ubl"|"alfalah"|"mcb"|"faysal"|"allied"|"askari"|"bank"|"udhaar","customerName":"<person name or null>","amount":<number or null>,"isIncomplete":<boolean>}
- Used when items are SOLD (e.g. "2 panadol cash", "1 lawn suit 3500", "3 spark plug udhaar to ali", "2 chawal usman ke khate mein", "becha", "sold", "furokht", "bechi", "beche", "دیے", "سیل").
- Can contain one or multiple items. List EVERY item as its own entry — never merge two items into one name and never drop one, even when the message (often a voice transcript) has no commas: "Ali ko udhaar 2 kilo chawal 1 kilo chini 3 doodh" -> {"type":"log_sale","items":[{"name":"chawal","quantity":2},{"name":"chini","quantity":1},{"name":"doodh","quantity":3}],"paymentMethod":"udhaar","customerName":"ali","amount":null,"isIncomplete":false}.
- The customer's name and words like udhaar/khata/cash are never part of an item name. "amount" is the total money for the whole sale, or null if not every item's money was said.
- Set isIncomplete: true if the message appears cut-off or trailing (e.g. ends with "aur...", "and...", "phir...", trailing numbers, or ellipsis "..."). Otherwise false.
- If the merchant mentions ANY product name without restock words, it is a sale.
- If quantity is not explicitly stated, default quantity to 1.
- Supported payment methods: cash, easypaisa, jazzcash, sadapay, nayapay, raast, meezan, hbl, ubl, alfalah, mcb, faysal, allied, askari, bank, or udhaar (khata/credit). Default to "cash".
- If paymentMethod is "udhaar", extract the customer's name into customerName (e.g. "udhaar ali", "khata osama", "credit for john"). Otherwise null.
- Adding goods to a customer's khata/udhaar is a log_sale with paymentMethod "udhaar": "soban bhai ke khate me lipton yellow label daal do" -> {"type":"log_sale","items":[{"name":"lipton yellow label","quantity":1}],"paymentMethod":"udhaar","customerName":"soban bhai","amount":null,"isIncomplete":false}; "soban bhai ko lipton yellow label udhaar pe de diya" -> the same.
- A customer paying money back toward their udhaar ("ne ... de diye", "udhaar me se", "jama karwaye") is NEVER a log_sale: see settle_khata below. Creating a khata ("khata bnao") is NEVER a log_sale: see create_khata below.

2. Updating inventory / Adding incoming stock (restock/delivery):
{"type":"update_stock","items":[{"name":"<item name>","quantity":<number>,"price":<number or null>,"unit":"<unit or null>"}],"action":"add"|"set"}
- Used when new stock ARRIVES, goods are received, inventory is added, or stock is updated.
- Supports ONE or MULTIPLE items in a single message (e.g. "maal aya 20 chini 150 aur 10 daal 200").
- If price is not mentioned, set price to null. Default quantity to 1 if not stated.
- Common keywords: "maal aya", "aaya", "aayi", "restock", "add stock", "add inventory", "add to stock", "add to inventory", "stock update", "stock add", "inventory add", "added", "delivered", "وصول", "مال آیا", "آئے ہیں", "اسٹاک میں شامل کریں", "نیا مال", "ایڈ اسٹاک".
- Examples: "maal aya 50 panadol 300" -> {"type":"update_stock","items":[{"name":"panadol","quantity":50,"price":300}],"action":"add"}
- "add stock 20 rice" -> {"type":"update_stock","items":[{"name":"rice","quantity":20}],"action":"add"}
- "add 20 rice to inventory" -> {"type":"update_stock","items":[{"name":"rice","quantity":20}],"action":"add"}
- "add inventory 20 rice" -> {"type":"update_stock","items":[{"name":"rice","quantity":20}],"action":"add"}
- "add rice 20" -> {"type":"update_stock","items":[{"name":"rice","quantity":20}],"action":"add"}
- "maal aya 20 chini 150 aur 10 daal 200" -> {"type":"update_stock","items":[{"name":"chini","quantity":20,"price":150},{"name":"daal","quantity":10,"price":200}],"action":"add"}
- "20 کلو چاول آئے ہیں" -> {"type":"update_stock","items":[{"name":"چاول","quantity":20,"unit":"کلو"}],"action":"add"}
- If the merchant asks generally how to add stock/inventory or says "add stock" / "add inventory" without items or quantities: {"type":"stock_guide"}
- CRITICAL: ANY request mentioning "add stock", "add inventory", "to stock", "to inventory", "restock", "maal aya", "مال آیا", "اسٹاک میں شامل" is an update_stock or stock_guide, NEVER a log_sale!

3. Checking stock of a specific item:
{"type":"check_stock","item":{"name":"<item name>"}}
- Used when the merchant asks how much stock is left of a product.
- Examples: "panadol kitna hai", "check stock sugar", "lawn suit kitne bache hain", "spark plug stock", "how much oil left", "چاول کا اسٹاک کتنا ہے".

4. Creating an automation (the merchant asks you to do something automatically later: "when...", "every day...", "jab...", "roz...", "har...").
An automation has exactly ONE trigger and exactly ONE action from the lists below — nothing else exists.
Triggers:
  a) Stock threshold: {"trigger":"threshold","condition":{"item":"<item name, or null for any item>","operator":"<"|"<=","value":<number>}}
     "below 5"/"less than 5"/"5 se kam" -> operator "<", value 5. "reaches 0"/"finishes"/"khatam ho" -> operator "<=", value 0.
  b) Daily/weekly time: {"trigger":"schedule","condition":{"frequency":"daily"|"weekly","time":"HH:mm" (24h),"dayOfWeek":<0=Sunday..6=Saturday, weekly only>}}
     "every night at 9" / "roz raat 9 baje" -> {"frequency":"daily","time":"21:00"}. "every Monday 10am" -> {"frequency":"weekly","time":"10:00","dayOfWeek":1}. "subah" = morning, "shaam" = evening, "raat" = night.
  c) Merchant's own shortcut word: {"trigger":"message","condition":{"keywords":["<the exact word(s) the merchant will type>"]}}
     "when I say end, send me the sales report" -> keywords ["end"].
Actions:
  - {"type":"notify","message":"<text to send the merchant, or null for stock alerts>"}
  - {"type":"send_report","reportType":"sales"|"inventory"|"low_stock"|"top_selling"|"expiring"}  ("end of day"/"din ka hisab"/"daily" report = "sales")
Shape: {"type":"create_workflow","trigger":"...","condition":{...},"action":{...},"rawInstruction":"<original text>"}
Examples:
  "alert me when sugar is below 5" -> {"type":"create_workflow","trigger":"threshold","condition":{"item":"sugar","operator":"<","value":5},"action":{"type":"notify","message":null},"rawInstruction":"alert me when sugar is below 5"}
  "roz raat 10 baje sales report bhejo" -> {"type":"create_workflow","trigger":"schedule","condition":{"frequency":"daily","time":"22:00"},"action":{"type":"send_report","reportType":"sales"},"rawInstruction":"roz raat 10 baje sales report bhejo"}
  "when I type end send me end day report" -> {"type":"create_workflow","trigger":"message","condition":{"keywords":["end"]},"action":{"type":"send_report","reportType":"sales"},"rawInstruction":"when I type end send me end day report"}
If the merchant asks for an automation whose action is NOT one of the two actions above (e.g. delete/remove/change stock, order from a supplier, call someone, anything unrelated to the shop, anything physical or personal), or whose trigger is not one of the three above, DO NOT invent one. Reply:
{"type":"unsupported_workflow","rawText":"<original text>"}

5. Greetings or casual opening (e.g. "assalam o alaikum", "suno", "hello", "hi", "bhai"):
{"type":"greeting","rawText":"<original text>"}

6. Requesting a PDF report (e.g. "send me sales report", "inventory report", "mujhe inventory ki report bhejo", "sales ki report", "short stock report", "رپورٹ بھیجو"):
{"type":"generate_report","reportType":"inventory"|"sales"|"low_stock"|"top_selling"|"expiring"}

7. Returning an item or order:
{"type":"return_order","orderNumber":"<order number or null>","items":[{"name":"<item name>","quantity":<number>}],"reason":"<reason or null>"}
- Used when a customer returns goods (e.g. "ye wapis aa gaya", "wapis aaya", "return order VT-123456", "chawal wapis kar lo", "مال واپس آیا").

8. Exchanging an item:
{"type":"exchange_order","orderNumber":"<order number or null>","returnItem":{"name":"<returned item name>","quantity":<number>},"newItem":{"name":"<new replacement item name>","quantity":<number>}}
- Used when a customer swaps one item for another (e.g. "is ki jagah 2 daal de do", "badal ke daal de do", "exchange with sugar", "اس کی جگہ دال دے دو").

9. Settling or paying Khata / Customer debt:
{"type":"settle_khata","customerName":"<customer name>","amount":<number>}
- Used when a customer pays cash to clear their debt/credit/ledger/khata balance (e.g. "ali ne 500 diye", "ali se 500 wasool hue", "ali ne 1000 jama karwaye", "settle 500 ali", "ali paid 500", "500 jama rashid", "علی نے 500 روپے دیے", "علی سے 500 وصول ہوئے", "علی کا 500 جمع کرو").
- Also: "soban bhai ne 3 rupay udhaar me se de diye", "soban bhai ne apne udhaar me se 500 diye", "سوبان بھائی نے ادھار میں سے 500 دیے" -> {"type":"settle_khata","customerName":"soban bhai","amount":3} (amount = the money paid, customerName = the person who paid).
- CRITICAL: Never classify debt payment / khata settlement as log_sale! Logging a sale is selling store inventory/goods to a customer. Settling khata is a customer paying off money they already owed from earlier purchases.

10. Inquiring customer Khata balance:
{"type":"check_khata","customerName":"<customer name>"}
- Used when asking how much a customer owes (e.g. "ali ka khata", "check khata ali", "ali ka kitna baqi hai", "علی کا کھاتہ", "علی کے کتنے باقی ہیں").

11. Creating a new customer khata (ledger account) — only when the merchant explicitly asks to make/open one:
{"type":"create_khata","customerName":"<customer name>","phone":"<phone number digits exactly as said, or null>"}
- Examples: "Soban bhai ka udhaar ka khata bnao jin ka phone number 03001234567" -> {"type":"create_khata","customerName":"soban bhai","phone":"03001234567"}; "create khata for ali 03211234567" -> {"type":"create_khata","customerName":"ali","phone":"03211234567"}; "ali ka khata banao" -> {"type":"create_khata","customerName":"ali","phone":null}.
- Never create a khata just because a customer name appears in a sale.

12. Sending a customer's khata/udhaar statement as a PDF report (what they bought, dates, payments):
{"type":"khata_report","customerName":"<customer name>"}
- Examples: "soban bhai ke udhaar ya khata ki report bhej do", "ali ka khata report", "send ledger report of usman", "سوبان بھائی کے کھاتے کی رپورٹ بھیجو".
- Asking only for the balance ("ali ka khata", "ali ka kitna baqi hai") is check_khata, not khata_report.

13. Anything else where NO product, report, greeting, stock update, khata action, or automation can be identified:
{"type":"unknown","rawText":"<original text>"}`;

const BUSINESS_DETAILS_PROMPT = `You extract business details from a merchant's
WhatsApp onboarding message (which may be in English, Urdu, or Roman Urdu). Reply with
exactly one JSON object — no prose, no markdown fences, JSON only:
{"businessName":"<name or null>","businessType":"<general|kiryana|medical|clothing|restaurant|electronics|services|auto|salon or null>","location":"<city/area or null>","sells":"<what they sell or null>"}
Infer businessType from context (e.g. "pharmacy"/"medical store" -> medical, "boutique"/"tailor" -> clothing, "dhaba"/"restaurant" -> restaurant, "cash & carry"/"general store"/"kiryana" -> kiryana, "mobile shop" -> electronics, "workshop"/"garage" -> auto, "parlour"/"salon" -> salon).
Use null for anything the message doesn't clearly state. Never guess or invent details.`;

const INVENTORY_PROMPT = `You parse a merchant's WhatsApp stock list (which may be
in English, Urdu, or Roman Urdu) into line items. Many merchants make phonetic spelling errors (e.g. "rise" or "riece" for Rice, "sugr" or "cheni" for Sugar, "coking oel" for Cooking Oil, "atta" or "aata" for Flour/Atta, "dall" for Daal).
Auto-correct misspelled item names to clean, properly capitalized standard product names (e.g. "Rice", "Sugar", "Cooking Oil", "Atta", "Daal Channa").
Reply with exactly one JSON object — no prose, no markdown fences, JSON only:
{"items":[{"name":"<clean corrected item name>","quantity":<number or 0>,"price":<number or null>,"unit":"<piece|box|kg|litre|bottle|packet|strip|meter etc, or null>"}]}
One entry per distinct item the merchant listed. Quantity means how many units are in stock.
Use quantity 0 and price null when not stated — never invent numbers.`;

const ITEM_RESOLVE_PROMPT = `A merchant said they sold an item. Match it against their
inventory list — names may be in English, Urdu script, or Roman Urdu, and may contain phonetic misspellings (e.g. "rise" or "riece" for Rice, "chawal" or "چاول" for Rice, "cheni" or "sugr" for Sugar, "dal mash" for "Daal Maash").
Match by MEANING, translations, synonyms, and phonetic variants. Reply with exactly
one line and nothing else: either the exact matching inventory name copied character-for-character from the inventory list, or
the word null if nothing in the inventory is a plausible match. Never invent a name.`;

/** Which host the LLM calls go to — env-overridable, defaults to groq -> gemini -> dashscope cascade. */
function llmProvider() {
  if (process.env.LLM_PROVIDER) return process.env.LLM_PROVIDER.toLowerCase();
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'dashscope';
}

/** True when at least one supported provider has an API key configured. */
function llmConfigured() {
  return !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.DASHSCOPE_API_KEY);
}

/**
 * Direct call to Google Gemini API (Free tier from Google AI Studio).
 * Serves as resilient secondary provider when Groq rate limits (429) hit.
 */
async function chatCompletionWithGemini(systemPrompt, userText, models = null, purpose = 'intent') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const modelsToTry = models || [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    // Last-resort fallback: a Gemma model served by the same Google AI Studio key.
    process.env.GEMMA_MODEL || 'gemma-4-31b-it',
  ];

  let lastError = null;
  for (const rawModel of modelsToTry) {
    const model = rawModel.replace(/^models\//, ''); // accept ids with or without the "models/" prefix
    const startedAt = Date.now();
    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Input: ${userText}` }],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        },
        // Key in a header, not the URL: axios errors carry the URL, and errors get logged.
        { headers: { 'x-goog-api-key': apiKey }, timeout: 18_000 }
      );
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      logger.info('llm.call', { purpose, provider: 'gemini', model, outcome: text ? 'success' : 'empty', latencyMs: Date.now() - startedAt });
      if (text) return text;
    } catch (err) {
      lastError = err;
      logger.warn('llm.call', { purpose, provider: 'gemini', model, outcome: 'error', latencyMs: Date.now() - startedAt, error: errorSummary(err) });
    }
  }
  throw lastError || new Error('All Gemini chat models failed');
}

/**
 * Safely extracts a JSON object or array from raw LLM output,
 * stripping markdown code fences, conversational preambles, or trailing text.
 */
export function extractJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // 3. Outermost { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // 4. Outermost [ ... ]
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}

/**
 * Shared LLM chat call — intent parsing and the onboarding extractors
 * all funnel through here so auth/timeout behaviour lives in one place.
 * Includes cascading multi-provider fallback (Groq -> Gemini -> DashScope)
 * to prevent single-point-of-failure errors and handle rate limiting seamlessly.
 */
async function chatCompletion(systemPrompt, userText, purpose = 'intent') {
  const provider = llmProvider();

  // If explicitly configured for Gemini (each model attempt is logged inside)
  if (provider === 'gemini') {
    try {
      return await chatCompletionWithGemini(systemPrompt, userText, null, purpose);
    } catch {
      // fall through to the other providers
    }
  }

  // Ordered fallback cascade: Groq Qwen -> Gemma -> Groq gpt-oss -> Gemini flash-lite.
  // Steps whose API key / model isn't configured are skipped.
  const groq = (model) => async () => {
    const startedAt = Date.now();
    try {
      const { data } = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userText },
          ],
          temperature: 0,
        },
        {
          headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          timeout: 10_000,
        }
      );
      const content = data?.choices?.[0]?.message?.content;
      logger.info('llm.call', { purpose, provider: 'groq', model, outcome: content ? 'success' : 'empty', latencyMs: Date.now() - startedAt });
      return content;
    } catch (err) {
      logger.warn('llm.call', { purpose, provider: 'groq', model, outcome: 'error', latencyMs: Date.now() - startedAt, error: errorSummary(err) });
      throw err;
    }
  };
  const gemini = (...models) => () => chatCompletionWithGemini(systemPrompt, userText, models, purpose);

  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const gemmaModel = process.env.GEMMA_MODEL || 'gemma-4-31b-it';
  const steps = [
    ...(hasGroq ? [[`Groq ${process.env.LLM_MODEL || 'qwen/qwen3.8-27b'}`, groq(process.env.LLM_MODEL || 'qwen/qwen3.8-27b')]] : []),
    ...(hasGemini ? [[`Gemma ${gemmaModel}`, gemini(gemmaModel)]] : []),
    ...(hasGroq
      ? [
          ['Groq openai/gpt-oss-120b', groq('openai/gpt-oss-120b')],
          ['Groq openai/gpt-oss-20b', groq('openai/gpt-oss-20b')],
        ]
      : []),
    ...(hasGemini ? [['Gemini gemini-3.5-flash-lite', gemini('gemini-3.5-flash-lite')]] : []),
  ];

  // Each step logs its own llm.call event (provider, model, latency, outcome).
  let lastError = null;
  for (const [, run] of steps) {
    try {
      const content = await run();
      if (content) return content;
    } catch (err) {
      lastError = err;
    }
  }

  if (!process.env.DASHSCOPE_API_KEY && steps.length) {
    throw lastError || new Error('All configured LLM models failed');
  }

  // Secondary or fallback: Alibaba Cloud DashScope
  if (process.env.DASHSCOPE_API_KEY) {
    const model = process.env.QWEN_MODEL || 'qwen2.5-72b-instruct';
    const startedAt = Date.now();
    try {
      const baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com';
      const { data } = await axios.post(
        `${baseUrl}/api/v1/services/aigc/text-generation/generation`,
        {
          model,
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
          timeout: 12_000,
        }
      );

      const content = data?.output?.choices?.[0]?.message?.content ?? data?.output?.text ?? '';
      logger.info('llm.call', { purpose, provider: 'dashscope', model, outcome: content ? 'success' : 'empty', latencyMs: Date.now() - startedAt });
      return content;
    } catch (dashErr) {
      logger.warn('llm.call', { purpose, provider: 'dashscope', model, outcome: 'error', latencyMs: Date.now() - startedAt, error: errorSummary(dashErr) });
    }
  }

  throw lastError || new Error('All configured LLM providers failed');
}

const URDU_DIGITS_MAP = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export const NUMBER_WORDS_MAP = {
  'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
  'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'انیس': 19, 'بیس': 20,
  'پچیس': 25, 'تیس': 30, 'چالیس': 40, 'پچاس': 50, 'سو': 100,
  'پاؤ': 0.25, 'پاو': 0.25, 'آدھا': 0.5, 'ادھا': 0.5, 'سوا': 1.25, 'ڈیڑھ': 1.5, 'پونے': 0.75, 'ڈھائی': 2.5,
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'panch': 5, 'che': 6, 'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15, 'solah': 16, 'satrah': 17, 'atharah': 18, 'unnees': 19, 'bees': 20,
  'pachees': 25, 'tees': 30, 'chalees': 40, 'pachas': 50, 'sau': 100,
  'pao': 0.25, 'paon': 0.25, 'aadha': 0.5, 'adha': 0.5, 'half': 0.5,
  'sawa': 1.25, 'dedh': 1.5, 'derh': 1.5, 'pone': 0.75, 'paune': 0.75, 'dhai': 2.5, 'dhaiy': 2.5,
};

const NUMBER_WORDS_REGEX = new RegExp(
  `\\b(?:${Object.keys(NUMBER_WORDS_MAP).filter((w) => /^[a-z]+$/i.test(w)).join('|')})\\b|(?:${Object.keys(NUMBER_WORDS_MAP).filter((w) => !/^[a-z]+$/i.test(w)).join('|')})`,
  'gi'
);

const UNIT_REGEX = /(?:^|\s)(kg|kilo|kilos|kilogram|g|gram|grams|gm|pao|paon|litre|liter|litres|liters|ml|packet|packets|pkt|box|boxes|bottle|bottles|strip|strips|piece|pieces|pcs|pc|dana|adad|item|darjan|dozen|bori|sack|suit|meter|meters|کلو|گرام|پاؤ|پاو|لیٹر|درجن|پیکٹ|بوری|بوتل|ڈبہ|پتہ|میٹر|عدد|دانہ)(?:\s|$)/i;

export const UNIT_CANONICAL_MAP = {
  'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg', 'kilogram': 'kg', 'کلو': 'کلو',
  'g': 'gram', 'gram': 'gram', 'grams': 'gram', 'gm': 'gram', 'گرام': 'گرام',
  'pao': 'pao', 'paon': 'pao', 'پاؤ': 'پاؤ', 'پاو': 'پاؤ',
  'litre': 'litre', 'liter': 'litre', 'litres': 'litre', 'liters': 'litre', 'l': 'litre', 'ltr': 'litre', 'لیٹر': 'لیٹر',
  'ml': 'ml',
  'packet': 'packet', 'packets': 'packet', 'pkt': 'packet', 'پیکٹ': 'پیکٹ',
  'box': 'box', 'boxes': 'box', 'ڈبہ': 'ڈبہ', 'dabba': 'box',
  'bottle': 'bottle', 'bottles': 'bottle', 'بوتل': 'بوتل',
  'strip': 'strip', 'strips': 'strip', 'پتہ': 'پتہ', 'patti': 'strip',
  'piece': 'piece', 'pieces': 'piece', 'pcs': 'piece', 'pc': 'piece', 'dana': 'piece', 'عدد': 'عدد', 'adad': 'piece', 'item': 'piece', 'دانہ': 'دانہ',
  'dozen': 'dozen', 'darjan': 'dozen', 'dz': 'dozen', 'درجن': 'درجن',
  'bori': 'bori', 'sack': 'bori', 'بوری': 'بوری',
  'meter': 'meter', 'meters': 'meter', 'metre': 'meter', 'میٹر': 'میٹر',
};

/**
 * Parses price and unit from user replies when adding a new item.
 * Supports numbers, currencies (rs, rupay, روپے), word numbers, and common Pakistani retail units.
 */
export function parsePriceAndUnit(text) {
  if (!text || typeof text !== 'string') return { price: null, unit: null };
  const normalizedDigits = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d);
  const lower = normalizedDigits.trim().toLowerCase();

  let price = null;
  let unit = null;

  // 1. Match Unit
  const unitMatch = lower.match(UNIT_REGEX);
  if (unitMatch) {
    const rawUnit = unitMatch[1].trim().toLowerCase();
    unit = UNIT_CANONICAL_MAP[rawUnit] || rawUnit;
  }

  // 2. Match Explicit Price
  const explicitPriceMatch = lower.match(/(?:price|rate|قیمت|روپے|روپیہ|روپئے|rs|rupay|rupees|roopay|pkr)\s*[:=]?\s*(\d+(?:\.\d+)?)/i) ||
                             lower.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupay|rupees|roopay|pkr|روپے|روپیہ)/i) ||
                             lower.match(/(?:per|\/|فی)\s*(?:[a-z\u0600-\u06FF]+)?\s*(\d+(?:\.\d+)?)/i);
  if (explicitPriceMatch) {
    price = parseFloat(explicitPriceMatch[1]);
  } else {
    // If no explicit price indicator, look for numbers that are not part of unit
    const nums = lower.match(/\b\d+(?:\.\d+)?\b/g);
    if (nums && nums.length > 0) {
      price = parseFloat(nums[0]);
    } else {
      // Check word numbers for price
      const words = lower.split(/\s+/);
      for (const w of words) {
        if (NUMBER_WORDS_MAP[w] && NUMBER_WORDS_MAP[w] >= 1) {
          price = NUMBER_WORDS_MAP[w];
          break;
        }
      }
    }
  }

  return { price, unit };
}

const PKG_VARIANT_PATTERN = /(\d+(?:\.\d+)?\s*(?:gm|g|gram|grams|ml|ltr|litre|liter|kg|kilo)\s*(?:waali|wali|wala|walay|waalay|pack|packet|dabba|box|sachet|والی|والا|والے|پیکٹ|ڈبہ|ساشے)?)/i;

export function extractPackagedVariant(str) {
  if (!str || typeof str !== 'string') return { processed: str, pkgVariant: null };
  const isLooseCommodityOnly = /^(?:\d+\s*(?:kg|kilo|gram|gm|پاؤ|کلو|لیٹر)\s+(?:chini|cheeni|chawal|aata|atta|daal|oil|ghee|doodh|sugar|rice|flour|چینی|چاول|آٹا|گھی|تیل|دودھ))$/i.test(str.trim());
  if (isLooseCommodityOnly) return { processed: str, pkgVariant: null };

  const match = str.match(PKG_VARIANT_PATTERN);
  if (match) {
    const rawVariant = match[1];
    const isExplicit = /(?:waali|wali|wala|walay|waalay|pack|packet|dabba|box|sachet|والی|والا|والے|پیکٹ|ڈبہ|ساشے)/i.test(rawVariant) ||
      /(?:waali|wali|wala|walay|waalay|pack|packet|dabba|box|sachet|والی|والا|والے|پیکٹ|ڈبہ|ساشے)/i.test(str);
    if (isExplicit) {
      const cleanSize = rawVariant
        .replace(/\s*(?:waali|wali|wala|walay|waalay|والی|والا|والے|pack|packet|dabba|box|sachet|پیکٹ|ڈبہ|ساشے)\s*$/i, '')
        .trim();
      return {
        processed: str.replace(match[0], ' __PKG_SIZE__ '),
        pkgVariant: cleanSize,
      };
    }
  }
  return { processed: str, pkgVariant: null };
}

/**
 * Fast-path heuristic parser for stock restocks and stock inquiries.
 * Ensures zero-latency handling and serves as a reliable safety net.
 */
export function parseStockHeuristic(text) {
  if (!text || typeof text !== 'string') return null;
  const normalizedDigits = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d);
  const lower = normalizedDigits.trim().toLowerCase();

  // Exclude full stock list / inventory queries (handled by dedicated menu)
  if (/^(stock\s*list|inventory|saman|سارا\s*اسٹاک|اسٹاک\s*لسٹ)$/i.test(lower)) {
    return null;
  }

  // 0. Stock Guidance requests (e.g. "add stock", "add inventory", "how to add stock", "stock add", "inventory add")
  const isGeneralGuide =
    /^(?:how\s+to\s+)?(?:add|update|new|restock)\s+(?:to\s+)?(?:stock|inventory)(?:\s+or\s+(?:stock|inventory))?$/i.test(lower) ||
    /^(?:i\s+(?:want|need)\s+to\s+)?(?:add|update|restock)\s+(?:to\s+)?(?:stock|inventory)$/i.test(lower) ||
    /^(?:add|update)\s+(?:stock|inventory)$/i.test(lower) ||
    /^(?:stock|inventory)\s*(?:update|add|guidance|help)$/i.test(lower) ||
    /^(?:نیا\s*مال|اسٹاک\s*میں\s*اضافہ|اسٹاک\s*شامل|ایڈ\s*اسٹاک|ایڈ\s*انوینٹری|اسٹاک\s*کیسے\s*شامل\s*کریں)$/.test(lower);
  if (isGeneralGuide) {
    return { type: 'stock_guide', rawText: text };
  }

  // 1. Check stock inquiry: "rice kitna hai", "check stock sugar", "chini kitni hai", "how much oil left", "stock rice"
  const isStockCheck = (
    /(kitna\s*(?:hai|bacha|rah\s*gaya)|kitni\s*(?:hai|bachi|rah\s*gayi)|kitne\s*(?:hai|bache|rah\s*gaye)|check\s*stock|stock\s*check|how\s*much.*left|how\s*many.*left|کتنا\s*ہے|کتنی\s*ہے|کتنا\s*بچا|اسٹاک\s*چیک)/i.test(lower) ||
    /^stock\s+(?!list\b|summary\b|report\b|add\b|update\b|in\b|to\b)([a-zA-Z\u0600-\u06FF\s]+)$/i.test(lower) ||
    /^(?!add\b|new\b|update\b|put\b|incoming\b|how\b|want\b)[a-zA-Z\u0600-\u06FF\s]+\s+stock$/i.test(lower)
  ) && !/(?:add|restock|maal\s*a[y|i]a|نیا\s*مال|شامل|اضافہ|ایڈ\s*اسٹاک|to\s*stock|in\s*stock|into\s*stock)/i.test(lower);

  if (isStockCheck) {
    const cleaned = lower
      .replace(/(check\s*stock|stock\s*check|stock\s*of|^stock\b|\bstock$|kitna\s*hai|kitni\s*hai|kitne\s*hai|kitna\s*bacha\s*hai|kitni\s*bachi\s*hai|kitne\s*bache\s*hai|kitna\s*bacha|kitni\s*bachi|kitne\s*bache|rah\s*gaya|rah\s*gayi|rah\s*gaye|ka\s*stock|ki\s*stock|how\s*much|how\s*many|left|کتنا\s*ہے|کتنی\s*ہے|کتنا\s*بچا|کا\s*اسٹاک|اسٹاک)/gi, '')
      .trim();
    if (cleaned && !/^(?:add|new|update|inventory|list|summary|report)$/i.test(cleaned)) {
      return { type: 'check_stock', item: { name: cleaned } };
    }
  }

  // 2. Restock / incoming inventory:
  // Examples:
  // "maal aya 20 chini", "add 50 rice price 300", "add stock 20 rice", "add inventory 20 rice",
  // "add 20 rice to stock", "add 20 rice to inventory", "add rice 20", "20 کلو چاول آئے ہیں",
  // "اسٹاک میں 20 چاول شامل کریں", "20 chini maal aya 150"
  const RESTOCK_PATTERN = /(?:maal|mal)\s*(?:a+y*a+|a+g+a+y*a+|pohnch|received)|(?:a+y*a+|a+y*i+|aaye)\s*(?:hai|hain)|restock|add\s*(?:new\s*)?(?:stock|inventory)|(?:stock|inventory)\s*(?:add|update)|(?:to|in|into)\s*(?:stock|inventory)|(?:stock|inventory)\s*(?:mein|me|main)\s*(?:add|shamil|daal|dal|ڈال)|مال\s*(?:آیا|پہنچ)|آئے\s*ہیں|اسٹاک\s*میں\s*(?:شامل|ڈال)|نیا\s*مال|ایڈ\s*(?:اسٹاک|انوینٹری)/i;
  const isRestock = RESTOCK_PATTERN.test(lower) ||
                    /^add\s+(?:stock\s+(?:of\s+)?)?\d+/i.test(lower) ||
                    /^add\s+[a-zA-Z\u0600-\u06FF\s]+\s+\d+/i.test(lower) ||
                    /^(شامل|اضافہ|نیا\s*مال)\b/.test(lower);

  function parseSingleRestockChunk(textChunk) {
    const { processed, pkgVariant } = extractPackagedVariant(textChunk);
    let workingText = processed;

    let quantity = 1;
    let price = null;
    let unit = pkgVariant ? 'packet' : null;

    const unitMatch = workingText.match(UNIT_REGEX);
    if (unitMatch) {
      unit = unitMatch[1].trim();
    }

    const explicitPriceMatch = workingText.match(/(?:price|rate|rs|rupay|rupees|قیمت|روپے)\s*[:=]?\s*(\d+)/i) ||
                               workingText.match(/(\d+)\s*(?:rs|rupay|rupees|روپے)/i);
    if (explicitPriceMatch) {
      price = parseInt(explicitPriceMatch[1], 10);
    }

    const nums = workingText.match(/\d+/g);
    if (nums && nums.length > 0) {
      if (price !== null) {
        const otherNums = nums.map((n) => parseInt(n, 10)).filter((n) => n !== price);
        if (otherNums.length > 0) {
          quantity = otherNums[0];
        }
      } else if (nums.length >= 2) {
        quantity = parseInt(nums[0], 10);
        price = parseInt(nums[1], 10);
      } else {
        quantity = parseInt(nums[0], 10);
      }
    } else {
      // Look for word-based numbers e.g. "bees", "بیس", "panch", "پانچ"
      const words = workingText.split(/\s+/);
      for (const w of words) {
        if (NUMBER_WORDS_MAP[w]) {
          quantity = NUMBER_WORDS_MAP[w];
          break;
        }
      }
    }

    let stripped = workingText
      .replace(/(?:maal|mal)\s*(?:a+y*a+\s*hai|a+y*a+|a+\s*g+a+y*a+|aagaya|pohnch|received)|(?:a+y*a+|a+y*i+|aaye)\s*(?:hai|hain)/gi, ' ')
      .replace(/(?:add|new|update|incoming)\s*(?:to\s+)?(?:stock|inventory)/gi, ' ')
      .replace(/(?:to|in|into)\s+(?:stock|inventory)/gi, ' ')
      .replace(/(?:stock|inventory)\s*(?:mein|me|main)\s*(?:add|shamil|daal|dal|ڈال)?/gi, ' ')
      .replace(/\b(?:restock|stock|inventory|add|new|naya|item|please|plz|for|of|ki|ka|ke|ko|mein|me|main|bhai|janab|karo|kar\s*do|kar\s*dein)\b/gi, ' ')
      .replace(/(?:مال\s*(?:آیا|پہنچ|آئے\s*ہیں|آیا\s*ہے)?|آئے\s*ہیں|اسٹاک\s*میں\s*(?:شامل|ڈال)?|نیا\s*مال|شامل\s*(?:کرو|کریں|کر\s*دو|کر\s*دیں)?|شامل|اضافہ|ایڈ\s*اسٹاک|ایڈ\s*انوینٹری|ایڈ|اسٹاک|انوینٹری|ڈال\s*(?:دیں|دو)?|کرو|کریں|آیا|آئے)/gi, ' ')
      .replace(/\b(?:aa\s*gaya|aagya|gaya|gaye|aya|aaya)\b/gi, ' ')
      .replace(/(?:روپے|روپیہ|روپئے|rs|rupay|rupees|roopay|pkr|price|rate)\s*[:=]?\s*\d*(?:\s*(?:\/|per|فی)\s*[a-zA-Z\u0600-\u06FF]+)?/gi, ' ')
      .replace(/(?:(?:\/|per|فی)\s*[a-zA-Z\u0600-\u06FF]+)/gi, ' ')
      .replace(/[/\\]/g, ' ')
      .replace(/\d+/g, ' ')
      .replace(UNIT_REGEX, ' ')
      .replace(NUMBER_WORDS_REGEX, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pkgVariant) {
      stripped = stripped.replace('__PKG_SIZE__', pkgVariant).replace(/\s+/g, ' ').trim();
    }

    if (!stripped) return null;
    return { name: stripped, quantity, price, unit };
  }

  if (isRestock) {
    // Check for multi-item restock separated by comma, "aur", "and", "اور"
    const content = lower
      .replace(/^(?:(?:maal|mal)\s*(?:a+y*a+\s*hai|a+y*a+|a+\s*g+a+y*a+|aagaya)|restock|add\s*(?:new\s*)?(?:stock|inventory)|stock\s*update|stock\s*add|inventory\s*add|add|مال\s*آیا\s*ہے|مال\s*آیا|نیا\s*مال|اسٹاک\s*میں\s*شامل\s*کریں|ایڈ\s*اسٹاک)\s+/i, '')
      .trim();

    const parts = content.split(/(?:,\s*|\s+aur\s+|\s+and\s+|\s+اور\s+)/i).filter(Boolean);
    if (parts.length > 1) {
      const items = [];
      for (const part of parts) {
        const itemObj = parseSingleRestockChunk(part);
        if (itemObj) items.push(itemObj);
      }
      if (items.length > 0) {
        return {
          type: 'update_stock',
          item: items[0],
          items,
          action: 'add',
        };
      }
    }

    const single = parseSingleRestockChunk(lower);
    if (single) {
      return {
        type: 'update_stock',
        item: single,
        items: [single],
        action: 'add',
      };
    }
  }

  return null;
}

/**
 * Fast-path heuristic parser for return and exchange requests.
 */
export function parseReturnOrExchangeHeuristic(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.trim().toLowerCase();

  // Extract order number if mentioned (e.g. "VT-123456", "#123456", "order 1042", "order #1042", "VT-9988")
  const orderNumMatch = text.match(/(?:order\s*#?|#)\s*([a-zA-Z0-9-]+)|\b(VT-?[a-zA-Z0-9-]+)\b|\b(\d{3,8})\b/i);
  const orderNumber = orderNumMatch ? (orderNumMatch[1] || orderNumMatch[2] || orderNumMatch[3]) : null;

  // 1. Exchange: "is ki jagah 2 daal de do", "badal ke daal de do", "exchange with daal"
  const isExchange = /(?:is\s*ki\s*jagah|iss\s*ki\s*jagah|badal|exchange|تبادلہ|اس\s*کی\s*جگہ|بدل)/i.test(lower);
  if (isExchange) {
    const newItemPart = lower
      .replace(/.*(?:is\s*ki\s*jagah|iss\s*ki\s*jagah|badal\s*ke|exchange\s*with|تبادلہ|اس\s*کی\s*جگہ|بدل\s*کے)\s*/i, '')
      .replace(/(?:de\s*do|le\s*lo|do|dy\s*do|dy\s*dy|دے\s*دو|لے\s*لو)/gi, '')
      .trim();
    return {
      type: 'exchange_order',
      intent: 'exchange_order',
      orderNumber,
      rawText: text,
      newItemText: newItemPart || null,
      newItemName: newItemPart || null,
    };
  }

  // 2. Return: "ye wapis aa gaya", "wapis kar lo", "order wapis", "return kar do", "returned", "مال واپس"
  const isReturn = /(?:wapis|wapas|\breturn\b|\breturned\b|واپس|واپسی)/i.test(lower);
  if (isReturn) {
    let clean = lower
      .replace(/(?:ye\s*wapis\s*(?:aa\s*gaya|aa\s*gayi|aagya|aagyi|aagai|aya|aaya)?|ye\s*wapas\s*(?:aa\s*gaya|aa\s*gayi|aagya|aagyi|aagai|aya|aaya)?|wapis\s*(?:aa\s*gaya|aa\s*gayi|aagya|aagyi|aagai|aya|aaya|kar\s*lo|kar\s*do)?|wapas\s*(?:aa\s*gaya|aa\s*gayi|aagya|aagyi|aagai|aya|aaya|kar\s*lo|kar\s*do)?|\breturn\s*kar\s*do\b|\breturned\b|\breturn\b|واپس\s*آیا|واپس\s*آئی|واپس\s*کر\s*لو|واپس|واپسی|\baa\s*gaya\b|\baa\s*gayi\b|\baagya\b|\baagyi\b|\baagai\b|\bgaya\b|\bgayi\b|\baye\b|\baaya\b|\baya\b|\bye\b|\byeh\b)/gi, '')
      .replace(/(?:order\s*#?|#)?\s*(?:VT-?[a-zA-Z0-9-]+|\b\d{3,8}\b)/gi, '')
      .trim();

    let targetAmount = null;
    let extractedItemName = clean;
    let quantity = null;

    const moneyMatch = clean.match(/^(\d+)\s*(?:rupay|rs|روپے)?\s*(?:ki|ka|ke|کی|کا|کے)\s+(.+)$/i);
    if (moneyMatch) {
      targetAmount = parseInt(moneyMatch[1], 10);
      extractedItemName = moneyMatch[2].trim();
    } else {
      const numOnlyMatch = clean.match(/^(\d+)\s*(?:rupay|rs|روپے)?$/i);
      if (numOnlyMatch) {
        targetAmount = parseInt(numOnlyMatch[1], 10);
        extractedItemName = null;
      } else {
        const qtyMatch = clean.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
        if (qtyMatch) {
          quantity = parseFloat(qtyMatch[1]);
          extractedItemName = qtyMatch[2].trim();
        }
      }
    }

    return {
      type: 'return_order',
      intent: 'return_order',
      orderNumber,
      rawText: text,
      targetAmount,
      quantity,
      itemName: extractedItemName || null,
      items: extractedItemName ? [{ name: extractedItemName, quantity: quantity || 1, targetAmount }] : null,
    };
  }

  return null;
}

/**
 * Fast-path heuristic parser for money-first sales ("20 ki chini") and fractional units ("1 pao chawal").
 */
export function parseMoneyFirstSaleHeuristic(text) {
  if (!text || typeof text !== 'string') return null;
  const normalizedDigits = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d);
  const lower = normalizedDigits.trim().toLowerCase();

  // Exclude restock, reports, greetings
  if (/\b(?:maal\s*a[y|i]a|restock|report|salam|hello|hi|wapis|wapas|return)\b/i.test(lower)) {
    return null;
  }

  // Lists ("100 ki chini aur 2 doodh") and udhaar sales need the customer and every item, which
  // only the standard sale parser extracts — this one would keep the first item and drop the rest.
  if (splitSaleItems(lower).length > 1 || hasKhataDebtWord(lower)) {
    return null;
  }

  // "20 ki chini", "50 ka chawal", "70 rupay ki daal", "30 ki mirch", "70 ka doodh mila cash"
  const moneyMatch = lower.match(/^(\d+)\s*(?:rupay|rs|روپے)?\s*(?:ki|ka|ke|کی|کا|کے)\s+([a-zA-Z\u0600-\u06FF]+)(?:[\s\w\u0600-\u06FF]*)/i);
  if (moneyMatch) {
    const targetAmount = parseInt(moneyMatch[1], 10);
    let itemName = moneyMatch[2].trim();
    itemName = itemName.replace(/\b(?:mila|mile|diye|becha|cash|kash|udhaar|ملے|دیے|کیش|ادھار)\b/gi, '').trim();
    if (itemName && targetAmount > 0) {
      return {
        type: 'log_sale',
        intent: 'log_sale',
        targetAmount,
        itemName,
        items: [{ name: itemName, quantity: 1, targetAmount }],
        amount: targetAmount,
        paymentMethod: lower.includes('udhaar') ? 'udhaar' : 'cash',
        customerName: null,
      };
    }
  }

  // Fractional unit sales: e.g. "1 pao chawal", "aadha kilo chini", "dedh kilo daal", "dhai kilo aalo", "پاؤ چینی"
  const fracMatch = lower.match(/^(?:(\d+)\s*)?(pao|paon|aadha|adha|half|dedh|derh|dhai|sawa|paune|pone|پاؤ|پاو|آدھا|ادھا|ڈیڑھ|ڈھائی|سوا|پونے)\s*(?:kilo|kg|کلو)?\s+([a-zA-Z\u0600-\u06FF\s]+)$/i);
  if (fracMatch) {
    const mult = fracMatch[1] ? parseInt(fracMatch[1], 10) : 1;
    const fracWord = fracMatch[2];
    const baseVal = NUMBER_WORDS_MAP[fracWord] || 1;
    const quantity = mult === 1 ? baseVal : mult * baseVal;
    const itemName = fracMatch[3].trim();
    if (itemName) {
      return {
        type: 'log_sale',
        items: [{ name: itemName, quantity }],
        amount: null,
        paymentMethod: 'cash',
        customerName: null,
      };
    }
  }

  return null;
}

// Compound Urdu and Roman Urdu number words normalizer
const COMPOUND_NUMBER_WORDS = [
  // Lakhs
  { pattern: /(?<=^|[\s\b])(?:do|2|دو)\s*(?:lakh|lac|لاکھ)(?=[\s\b]|$)/gi, value: 200000 },
  { pattern: /(?<=^|[\s\b])(?:ek|aik|1|ایک)\s*(?:lakh|lac|لاکھ)(?=[\s\b]|$)|(?<=^|[\s\b])(?:lakh|lac|لاکھ)(?=[\s\b]|$)/gi, value: 100000 },
  // Thousands
  { pattern: /(?<=^|[\s\b])(?:pachas|50)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 50000 },
  { pattern: /(?<=^|[\s\b])(?:chalees|40)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 40000 },
  { pattern: /(?<=^|[\s\b])(?:tees|30)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 30000 },
  { pattern: /(?<=^|[\s\b])(?:pachees|25)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 25000 },
  { pattern: /(?<=^|[\s\b])(?:bees|20)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 20000 },
  { pattern: /(?<=^|[\s\b])(?:pandrah|15)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 15000 },
  { pattern: /(?<=^|[\s\b])(?:das|10)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 10000 },
  { pattern: /(?<=^|[\s\b])(?:panch|5|پانچ)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 5000 },
  { pattern: /(?<=^|[\s\b])(?:char|4|چار)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 4000 },
  { pattern: /(?<=^|[\s\b])(?:teen|3|تین)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 3000 },
  { pattern: /(?<=^|[\s\b])(?:do|2|دو)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 2000 },
  { pattern: /(?<=^|[\s\b])(?:ek|aik|1|ایک)\s*(?:hazar|hazaron|ہزار)(?=[\s\b]|$)|(?<=^|[\s\b])(?:hazar|hazaron|ہزار)(?=[\s\b]|$)/gi, value: 1000 },
  // Hundreds
  { pattern: /(?<=^|[\s\b])(?:pachees\s*sau|25\s*sau|پچیس\s*سو)(?=[\s\b]|$)/gi, value: 2500 },
  { pattern: /(?<=^|[\s\b])(?:bees\s*sau|20\s*sau|بیس\s*سو)(?=[\s\b]|$)/gi, value: 2000 },
  { pattern: /(?<=^|[\s\b])(?:pandrah\s*sau|15\s*sau|پندرہ\s*سو)(?=[\s\b]|$)/gi, value: 1500 },
  { pattern: /(?<=^|[\s\b])(?:barah\s*sau|12\s*sau|بارہ\s*سو)(?=[\s\b]|$)/gi, value: 1200 },
  { pattern: /(?<=^|[\s\b])(?:gyarah\s*sau|11\s*sau|گیارہ\s*سو)(?=[\s\b]|$)/gi, value: 1100 },
  { pattern: /(?<=^|[\s\b])(?:nau\s*sau|9\s*sau|نو\s*سو)(?=[\s\b]|$)/gi, value: 900 },
  { pattern: /(?<=^|[\s\b])(?:aath\s*sau|8\s*sau|آٹھ\s*سو)(?=[\s\b]|$)/gi, value: 800 },
  { pattern: /(?<=^|[\s\b])(?:saat\s*sau|7\s*sau|سات\s*سو)(?=[\s\b]|$)/gi, value: 700 },
  { pattern: /(?<=^|[\s\b])(?:che\s*sau|chhe\s*sau|6\s*sau|چھ\s*سو)(?=[\s\b]|$)/gi, value: 600 },
  { pattern: /(?<=^|[\s\b])(?:panch\s*sau|5\s*sau|پانچ\s*سو)(?=[\s\b]|$)/gi, value: 500 },
  { pattern: /(?<=^|[\s\b])(?:char\s*sau|4\s*sau|چار\s*سو)(?=[\s\b]|$)/gi, value: 400 },
  { pattern: /(?<=^|[\s\b])(?:teen\s*sau|3\s*sau|تین\s*سو)(?=[\s\b]|$)/gi, value: 300 },
  { pattern: /(?<=^|[\s\b])(?:dhai\s*sau|ڈھائی\s*سو)(?=[\s\b]|$)/gi, value: 250 },
  { pattern: /(?<=^|[\s\b])(?:do\s*sau|2\s*sau|دو\s*سو)(?=[\s\b]|$)/gi, value: 200 },
  { pattern: /(?<=^|[\s\b])(?:dedh\s*sau|ڈیڑھ\s*سو)(?=[\s\b]|$)/gi, value: 150 },
  { pattern: /(?<=^|[\s\b])(?:ek\s*sau|1\s*sau|ایک\s*سو)(?=[\s\b]|$)|(?<=^|[\s\b])(?:sau|سو)(?=[\s\b]|$)/gi, value: 100 },
];

export function normalizeNumberWords(text) {
  if (!text) return '';
  let str = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d);
  for (const { pattern, value } of COMPOUND_NUMBER_WORDS) {
    str = str.replace(pattern, ` ${value} `);
  }
  return str.replace(/\s+/g, ' ').trim();
}

// Words that mean "a customer's udhaar / khata / credit" in English, Roman Urdu and Urdu script.
// Longer spellings first so the alternation never stops on a shorter prefix.
const KHATA_DEBT_WORDS = 'udhaari|udhari|udhaar|udhar|khaata|khaate|khata|khate|karz|qarz|ادھار|کھاتہ|کھاتے|کھاتا|قرض';
const KHATA_DEBT_WORD_REGEX = new RegExp(`(?:^|[\\s,])(?:${KHATA_DEBT_WORDS})(?=$|[\\s,.!?۔])`, 'i');

/** True when the text mentions a khata/udhaar/credit account. */
export function hasKhataDebtWord(text) {
  return typeof text === 'string' && KHATA_DEBT_WORD_REGEX.test(text);
}

// "udhaar me se", "apne khate se", "ادھار میں سے" — the debt a customer is paying down.
const DEBT_PHRASE = `(?:(?:apne|apna|apni|اپنے|اپنا|اپنی)\\s+)?(?:${KHATA_DEBT_WORDS})\\s*(?:(?:ke|ka|ki|me|mein|main|men|کے|کا|کی|میں)\\s*)?(?:(?:se|سے)\\s+)?`;
const PAID_VERB = '(?:diye(?:\\s*hain|\\s*hen)?|de\\s*diye|dey\\s*diye|de\\s*diya|diya|jama(?:\\s*karwaye|\\s*karaye|\\s*karwa\\s*diye|\\s*kiye|\\s*kar\\s*diye)?|wapis\\s*(?:kiye|diye|kar\\s*diye|kar\\s*diya)|wapas\\s*(?:kiye|diye|kar\\s*diye|kar\\s*diya)|ada\\s*(?:kiye|kar\\s*diye)|bhar\\s*diye|bhare|paid|دیے|دے\\s*دیے|دیا|دے\\s*دیا|جمع\\s*(?:کروائے|کرائے|کیے|کروا\\s*دیے)?|واپس\\s*(?:کیے|کر\\s*دیے)|ادا\\s*(?:کیے|کر\\s*دیے))';
const KHATA_PAYMENT_WITH_DEBT_REGEX = new RegExp(
  `^([a-zA-Z\\s\\u0600-\\u06FF-]+?)\\s+(?:ne|نے)\\s+(?:${DEBT_PHRASE})?(\\d+)\\s*(?:rupay|rupee|rupees|rs|roopay|روپے)?\\s*(?:${DEBT_PHRASE})?${PAID_VERB}(?:\\s+(?:${DEBT_PHRASE}))?\\s*$`,
  'i'
);

/**
 * Fast-path heuristic parser for Khata (debt / ledger) cash settlements.
 * Detects phrases like "Ali ne 500 diye", "Ali se 500 wasool hue", "settle 1000 usman", "علی نے 500 دیے",
 * and the udhaar-worded forms "Soban bhai ne 3 rupay udhaar me se de diye".
 */
export function parseKhataSettleHeuristic(text) {
  if (!text || typeof text !== 'string') return null;

  // Exclude restock, reports, stock checks
  if (/(?:maal\s*a[y|i]a|restock|report|stock\s*check|check\s*stock)/i.test(text)) {
    return null;
  }
  // Returns/exchanges share words with "udhaar wapis kiye" (debt paid back), so only
  // treat them as returns when no khata/udhaar word is present.
  if (!hasKhataDebtWord(text) && /(?:wapis|wapas|return|exchange|badal)/i.test(text)) {
    return null;
  }

  const normalized = normalizeNumberWords(text);
  // Voice transcripts end with a full stop ("Ali ne 500 diye.") which would defeat every `$` anchor below.
  const lower = normalized.toLowerCase().trim().replace(/[.!?،۔]+$/, '').trim();

  // Pattern 0: <Name> ne [udhaar me se] <Amount> [rupay] [udhaar me se] (diye|de diye|jama karwaye ...)
  const p0 = lower.match(KHATA_PAYMENT_WITH_DEBT_REGEX);
  if (p0 && hasKhataDebtWord(lower)) {
    return { type: 'settle_khata', customerName: p0[1].trim(), amount: parseInt(p0[2], 10), rawText: text };
  }

  // Pattern 1: <Name> ne <Amount> [rupay] (diye|de diye|diye hain|jama|jama karwaye|jama karaye|wapis kiye|ada kiye|paid)
  const p1 = lower.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+ne\s+(\d+)\s*(?:rupay|rs|roopay|روپے)?\s*(?:diye(?:\s*hain|\s*hen)?|de\s*diye|jama(?:\s*karwaye|\s*karaye|\s*karwa\s*diye|\s*kiye)?|wapis\s*(?:kiye|diye)|ada\s*kiye|paid|pay\s*kiye|bhare|دیے|دے\s*دیے|جمع\s*(?:کروائے|کرائے|کیے)?|واپس\s*کیے|ادا\s*کیے)$/i);
  if (p1) {
    return { type: 'settle_khata', customerName: p1[1].trim(), amount: parseInt(p1[2], 10), rawText: text };
  }

  // Pattern 1b (Urdu Script): [Name] نے [Amount] روپے دیے / جمع کروائے
  const p1Urdu = lower.match(/^([\u0600-\u06FF\s-]+?)\s+نے\s+(\d+)\s*(?:روپے|rupay)?\s*(?:دیے|دے\s*دیے|جمع\s*(?:کروائے|کرائے|کیے)?|واپس\s*کیے|ادا\s*کیے)$/);
  if (p1Urdu) {
    return { type: 'settle_khata', customerName: p1Urdu[1].trim(), amount: parseInt(p1Urdu[2], 10), rawText: text };
  }

  // Pattern 2: <Name> se <Amount> [rupay] (wasool|wasool hue|mil gaye|mile|aaye)
  const p2 = lower.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+se\s+(\d+)\s*(?:rupay|rs|roopay|روپے)?\s*(?:wasool(?:\s*hue|\s*ho\s*gaye)?|mil\s*(?:gaye|gye)|mile|aaye|aye|وصول(?:\s*ہوئے|\s*ہو\s*گئے)?|مل\s*گئے|ملے|آئے)$/i);
  if (p2) {
    return { type: 'settle_khata', customerName: p2[1].trim(), amount: parseInt(p2[2], 10), rawText: text };
  }

  // Pattern 2b (Urdu Script): [Name] سے [Amount] وصول ہوئے
  const p2Urdu = lower.match(/^([\u0600-\u06FF\s-]+?)\s+سے\s+(\d+)\s*(?:روپے|rupay)?\s*(?:وصول(?:\s*ہوئے|\s*ہو\s*گئے)?|مل\s*گئے|ملے|آئے)$/);
  if (p2Urdu) {
    return { type: 'settle_khata', customerName: p2Urdu[1].trim(), amount: parseInt(p2Urdu[2], 10), rawText: text };
  }

  // Pattern 3: <Amount> [rupay] <Name> (ne|se|نے|سے) (diye|jama|wasool|de diye)
  const p3Amt = lower.match(/^(\d+)\s*(?:rupay|rs|roopay|روپے)?\s*([a-zA-Z\s\u0600-\u06FF-]+?)\s+(?:ne|se|نے|سے)\s*(?:diye(?:\s*hain|\s*hen)?|de\s*diye|jama(?:\s*karwaye|\s*karaye|\s*karwa\s*diye|\s*kiye)?|wasool(?:\s*hue)?|ada\s*kiye|paid|دیے|دے\s*دیے|جمع|وصول)$/i);
  if (p3Amt) {
    return { type: 'settle_khata', customerName: p3Amt[2].trim(), amount: parseInt(p3Amt[1], 10), rawText: text };
  }

  // Pattern: <Name> ka/ke [khate me/mein] <Amount> [rupay] (jama|jama karo|wasool|settle)
  const pCustKhata = lower.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+(?:ka|ke)\s*(?:khate\s*me(?:in)?)?\s*(\d+)\s*(?:rupay|rs|روپے)?\s*(?:jama(?:\s*karo|\s*kar\s*do)?|wasool|settle)$/i);
  if (pCustKhata) {
    return { type: 'settle_khata', customerName: pCustKhata[1].trim(), amount: parseInt(pCustKhata[2], 10), rawText: text };
  }

  // Pattern 3b (Urdu Script): [Name] کا/کے [کھاتے میں] [Amount] جمع کرو
  const p3Urdu = lower.match(/^([\u0600-\u06FF\s-]+?)\s+(?:کا|کے)\s*(?:کھاتے\s*میں)?\s*(\d+)\s*(?:روپے)?\s*(?:جمع(?:\s*کرو|\s*کریں|\s*کر\s*دو)?|وصول)$/);
  if (p3Urdu) {
    return { type: 'settle_khata', customerName: p3Urdu[1].trim(), amount: parseInt(p3Urdu[2], 10), rawText: text };
  }

  // Pattern 4: (settle|jama|wasool|وصول|جمع) [karo] <Amount> <Name>
  const p4 = lower.match(/^(?:settle|jama|wasool|وصول|جمع)\s*(?:karo|kar\s*do|کریں|کرو)?\s*(\d+)\s*(?:rupay|rs|روپے)?\s*(?:for|to|ka|ki|ke|se|کا|کے|سے)?\s*([a-zA-Z\s\u0600-\u06FF-]+)$/i);
  if (p4) {
    return { type: 'settle_khata', customerName: p4[2].trim(), amount: parseInt(p4[1], 10), rawText: text };
  }

  // Pattern 5: (settle|jama|wasool|وصول|جمع) [karo] <Name> <Amount>
  const p5 = lower.match(/^(?:settle|jama|wasool|وصول|جمع)\s*(?:karo|kar\s*do|کریں|کرو)?\s*([a-zA-Z\s\u0600-\u06FF-]+?)\s*(?:ka|ke|ko|se|کا|کے|کو|سے)?\s*(\d+)\s*(?:rupay|rs|روپے)?$/i);
  if (p5) {
    return { type: 'settle_khata', customerName: p5[1].trim(), amount: parseInt(p5[2], 10), rawText: text };
  }

  // Pattern 6: <Amount> [rupay] (diye|jama|wasool) <Name> [ne/se]
  const p6 = lower.match(/^(\d+)\s*(?:rupay|rs|روپے)?\s*(?:diye|de\s*diye|jama(?:\s*kiye)?|wasool(?:\s*hue)?|دیے|جمع|وصول)\s*([a-zA-Z\s\u0600-\u06FF-]+?)(?:\s*(?:ne|se|کا|کے|نے|سے))?$/i);
  if (p6) {
    return { type: 'settle_khata', customerName: p6[2].trim(), amount: parseInt(p6[1], 10), rawText: text };
  }

  // Pattern 7: <Name> <Amount> [rupay] (paid|diye|jama|settle)
  const p7 = lower.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+(\d+)\s*(?:rupay|rs|روپے)?\s*(?:paid|diye|jama|settle|دیے|جمع)$/i);
  if (p7) {
    const rawCust = p7[1].trim();
    const amt = parseInt(p7[2], 10);
    // Safety check: ensure not standard sale like "sugar 500" or item with unit
    if (amt >= 10 && !/^(kg|kilo|litre|darjan|piece|pcs|packet|box|کلو|لیٹر|درجن|پیکٹ)$/i.test(rawCust)) {
      return { type: 'settle_khata', customerName: rawCust, amount: amt, rawText: text };
    }
  }

  return null;
}

// Every way "khata" shows up in typed text and Whisper transcripts ("khatha", "khatta", "account"...).
const KHATA_NOUNS = 'khaatha|khaata|khaate|khatha|khatta|khata|khate|khaa|kahta|khta|account|ledger|کھاتہ|کھاتے|کھاتا';
const KHATA_PARTICLE = '(?:ka|ke|ki|کا|کے|کی)';
const KHATA_NAME = "[a-zA-Z\\u0600-\\u06FF][a-zA-Z\\s\\u0600-\\u06FF.'-]*?";
const WORD_START = '(?<=^|[\\s,،.])';
const WORD_END = '(?=$|[\\s,،.!?۔])';
const KHATA_NOUN_REGEX = new RegExp(`${WORD_START}(?:${KHATA_NOUNS})${WORD_END}`, 'i');
// "make / open" in Roman Urdu, Urdu script and English, matched as the start of a word ("bana do", "banado", "kholo").
const KHATA_CREATE_VERB_REGEX = new RegExp(`${WORD_START}(?:bana|bna|banao|bnao|banado|bnado|banana|bnana|banaen|banayein|banalo|bnalo|khol|kholo|create|open|make|start|بنا|بناؤ|بنائیں|بنادو|کھول|کھولو)`, 'i');
const PHONE_NUMBER_REGEX = /\+?\d[\d\s-]{4,16}\d/;
// Words that can sit next to a customer's name but are never part of it.
const NAME_FILLER = new Set([
  'please', 'plz', 'zara', 'ab', 'ek', 'aik', 'mera', 'meri', 'mere', 'hamara', 'naya', 'nayi', 'new', 'customer',
  'gahak', 'grahak', 'hai', 'he', 'ha', 'hain', 'ye', 'yeh', 'is', 'iss', 'jo', 'and', 'aur', 'a', 'an', 'the',
  'for', 'of', 'ka', 'ke', 'ki', 'uska', 'iska', 'unka', 'inka', 'udhaar', 'udhar', 'bhi', 'ji',
  'نیا', 'نئی', 'میرا', 'ایک', 'گاہک', 'ہے', 'یہ', 'کا', 'کے', 'کی', 'ادھار',
]);

/**
 * Normalizes a Pakistani mobile number ("0300 1234567", "+92 300 1234567", "3001234567")
 * to the local 11-digit form "03001234567". Returns null when it isn't a valid mobile number.
 */
export function normalizePkMobile(input) {
  let digits = String(input ?? '')
    .replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d)
    .replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^3\d{9}$/.test(digits) ? `0${digits}` : null;
}

/** True when the text asks to make/open a khata ("talal ka khatha bana do", "create account for ali"). */
export function looksLikeKhataCreation(text) {
  if (!text || typeof text !== 'string') return false;
  return KHATA_NOUN_REGEX.test(text) && KHATA_CREATE_VERB_REGEX.test(text);
}

/** Drops filler words from both ends of a captured name ("mera naya customer talal" -> "talal"). */
function cleanKhataName(raw) {
  const words = String(raw || '').replace(/[,،.]/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length && NAME_FILLER.has(words[0])) words.shift();
  while (words.length && NAME_FILLER.has(words[words.length - 1])) words.pop();
  const name = words.slice(-4).join(' ');
  if (name.length < 2 || name.length > 40 || /\d/.test(name) || !/[a-zA-Z؀-ۿ]/.test(name)) return null;
  return name;
}

/**
 * Fast-path heuristic for explicitly creating a customer khata (ledger account). Keyword based
 * rather than one fixed sentence, because voice transcripts vary a lot:
 * "Talal ka khatha bana do, uska number hai 0300 123 4567.", "طلال کا کھاتہ بنا دو، اس کا نمبر ہے 03001234567",
 * "mera naya customer hai Talal, uska khata bana do", "create account for usman +92 300 1234567".
 * customerName is null when no name could be found; phone is null when absent or invalid
 * (invalidPhone tells the two apart). The handler decides what to ask for.
 */
export function parseKhataCreateHeuristic(text) {
  if (!looksLikeKhataCreation(text)) return null;
  const lower = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d).toLowerCase().trim().replace(/[.!?،۔]+$/, '').trim();

  const phoneMatch = lower.match(PHONE_NUMBER_REGEX);
  const phone = phoneMatch ? normalizePkMobile(phoneMatch[0]) : null;
  // Remove the number and its label so neither can end up inside the name.
  const body = (phoneMatch ? lower.replace(phoneMatch[0], ' ') : lower)
    .replace(/(?:^|\s)(?:phone|number|nmbr|no|mobile|contact|ph|نمبر|فون|موبائل)(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const word = "[a-zA-Z\\u0600-\\u06FF.'-]+";
  const upTo4Words = `((?:${word}\\s+){0,3}${word})`;
  const noun = `(?:${KHATA_NOUNS})${WORD_END}`;
  const adjectives = '(?:(?:naya|nayi|new|نیا|نئی|udhaar|udhar|ادھار)\\s+(?:ka\\s+|کا\\s+)?)*';

  let name = null;

  // 1. "<name> ka [naya] [udhaar ka] khata ..."
  const p1 = body.match(new RegExp(`${upTo4Words}\\s+${KHATA_PARTICLE}\\s+${adjectives}${noun}`, 'i'));
  if (p1) name = cleanKhataName(p1[1]);

  // 2. "<name>, uska / iska / jis ka khata ..."
  if (!name) {
    const p2 = body.match(new RegExp(`${upTo4Words}[,،]?\\s+(?:uska|iska|unka|inka|us\\s+ka|is\\s+ka|jis\\s*ka|jin\\s*ka|اس\\s+کا|ان\\s+کا|جس\\s+کا|جن\\s+کا)\\s+${adjectives}${noun}`, 'i'));
    if (p2) name = cleanKhataName(p2[1]);
  }

  // 3. "[create|open|...] khata / account for|of <name>" and "khata bana do <name>"
  if (!name) {
    const p3 = body.match(new RegExp(`${noun}\\s+(?:(?:for|of)\\s+|\\S+\\s+(?:do\\s+|dein\\s+|den\\s+|lo\\s+)?)(${word}(?:\\s+${word}){0,3})`, 'i'));
    if (p3) {
      const after = p3[1].split(/\s+(?:ka|ke|ki|jis|jin|uska|iska|اس|جس)(?:\s|$)/i)[0];
      name = cleanKhataName(after);
    }
  }

  return {
    type: 'create_khata',
    customerName: name,
    phone,
    invalidPhone: !!phoneMatch && !phone,
    rawText: text,
  };
}

const KHATA_REPORT_WORDS = 'report|statement|history|hisab|hisaab|detail|details|tafseel|tafsil|رپورٹ|تفصیل|حساب|اسٹیٹمنٹ';
const KHATA_LEDGER_WORDS = `${KHATA_DEBT_WORDS}|ledger`;

/**
 * Fast-path heuristic for "send <customer>'s khata/udhaar report":
 * "soban bhai ke udhaar ya khata ki report bhej do", "ali ka khata report",
 * "send ledger report of usman", "khata statement for rashid".
 */
export function parseKhataReportHeuristic(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim().replace(/[.!?،۔]+$/, '').trim();
  const ender = '(?=$|[\\s,.!?۔])';
  const filler = /^(?:mujhe|mjhe|please|plz|zara|ek|send|bhejo|bhej\s*do)\s+/i;

  let name = null;

  // 1. "<name> ke udhaar [ya khata] ki report ..."
  const p1 = lower.match(new RegExp(`^(${KHATA_NAME})\\s+${KHATA_PARTICLE}\\s+(?:${KHATA_LEDGER_WORDS})(?:\\s+(?:ya|or|aur|and|یا|اور)\\s+(?:${KHATA_LEDGER_WORDS}))?\\s+(?:${KHATA_PARTICLE}\\s+)?(?:${KHATA_REPORT_WORDS})${ender}.*$`, 'i'));
  if (p1) name = p1[1];

  // 2. "[send] khata report [of|for] <name> [bhej do]"
  if (!name) {
    const p2 = lower.match(new RegExp(`^(?:send\\s+|bhej\\s*do\\s+|bhejo\\s+|mujhe\\s+)?(?:${KHATA_LEDGER_WORDS})\\s+(?:${KHATA_REPORT_WORDS})\\s+(?:of\\s+|for\\s+|${KHATA_PARTICLE}\\s+)?(${KHATA_NAME})(?:\\s+(?:bhej\\s*do|bhejo|bhej\\s*dein|send|do|dein))?$`, 'i'));
    if (p2) name = p2[1];
  }

  // 3. "<name> khata report [bhejo]"
  if (!name) {
    const p3 = lower.match(new RegExp(`^(${KHATA_NAME})\\s+(?:${KHATA_LEDGER_WORDS})\\s+(?:${KHATA_REPORT_WORDS})${ender}.*$`, 'i'));
    if (p3) name = p3[1];
  }

  if (!name) return null;
  const cleanName = name.replace(filler, '').replace(/\s+/g, ' ').trim();
  if (cleanName.length < 2 || cleanName.length > 40) return null;

  return { type: 'khata_report', customerName: cleanName, rawText: text };
}

/**
 * Fast-path heuristic for adding goods to an existing customer's khata:
 * "soban bhai ke khate me lipton yellow label daal do",
 * "soban bhai ko lipton yellow label udhaar pe de diya",
 * "add 2 chawal to ali's khata".
 */
export function parseKhataSaleHeuristic(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d).toLowerCase().trim().replace(/[.!?،۔]+$/, '').trim();
  const khataNoun = '(?:khaata|khaate|khata|khate|udhaar|udhar|کھاتہ|کھاتے|ادھار)';
  const inWord = '(?:me|mein|main|men|may|میں)';
  const putVerbStem = '(?:daal|dal|dalo|add|likh|likho|chadha|chadhao|ڈال|ڈالو|لکھ)';
  const nameSrc = "[a-zA-Z\\u0600-\\u06FF][a-zA-Z\\s\\u0600-\\u06FF.'-]*?";

  let customerName = null;
  let itemsText = null;

  // Voice transcripts spell the closing words many ways ("de diya", "de dia", "de di", "daal do",
  // "dal de"), so everything after the udhaar/khata marker is free text. Only a payment word in
  // that tail ("udhaar wapis kar diya") rules it out — that is a settlement, not a sale.
  const paymentTail = /(?:wapis|wapas|jama|wasool|\bada\b|return|واپس|جمع|وصول|ادا)/i;

  // "<name> ke khate me <items> [daal do / likh do ...]"
  const a = lower.match(new RegExp(`^(${nameSrc})\\s+${KHATA_PARTICLE}\\s+${khataNoun}\\s*${inWord}\\s+(.+?)(?:\\s+${putVerbStem}\\S*(?:\\s+\\S+){0,3})?$`, 'i'));
  if (a) { customerName = a[1]; itemsText = a[2]; }

  // "<name> ko <items> udhaar [pe/par/me] [de diya ...]"
  if (!customerName) {
    const b = lower.match(new RegExp(`^(${nameSrc})\\s+(?:ko|کو)\\s+(.+?)\\s+${khataNoun}(?:\\s+(.*))?$`, 'i'));
    if (b && !paymentTail.test(b[3] || '')) { customerName = b[1]; itemsText = b[2]; }
  }

  if (!customerName) {
    const c = lower.match(/^(?:add|put|log)\s+(.+?)\s+(?:to|in|into|on)\s+([a-z؀-ۿ][a-z\s؀-ۿ.-]*?)(?:'s|s')?\s+(?:khata|khaata|ledger|account|udhaar)$/i);
    if (c) { itemsText = c[1]; customerName = c[2]; }
  }

  if (!customerName || !itemsText || !/[a-zA-Z؀-ۿ]/.test(itemsText)) return null;
  // "<name> ke khate me 500 daal do" is about money, not goods — leave it to the other paths.
  if (/^\s*\d+\s*(?:rupay|rs|روپے|rupees?)?\s*$/i.test(itemsText)) return null;

  const items = [];
  const lineAmounts = [];
  for (const chunk of splitSaleItems(itemsText)) {
    const parsed = parseStandardSaleHeuristic(chunk) || parseStandardSaleHeuristic(`1 ${chunk}`);
    if (!parsed?.items?.length) return null;
    items.push(...parsed.items);
    lineAmounts.push(parsed.amount ?? null);
  }
  if (!items.length) return null;
  // Sum of the spoken line totals, only when every line had one (else the order service prices it).
  const amount = lineAmounts.every((a) => a != null) ? lineAmounts.reduce((s, a) => s + a, 0) : null;

  return {
    type: 'log_sale',
    items,
    paymentMethod: 'udhaar',
    customerName: customerName.replace(/\s+/g, ' ').trim(),
    amount,
    isIncomplete: false,
  };
}

/**
 * True for any explicit khata command (create, report, udhaar payment, adding goods to a khata).
 * Lets these override a half-finished conversation flow instead of being read as its answer.
 */
export function isKhataCommand(text) {
  return !!(
    parseKhataCreateHeuristic(text) ||
    parseKhataReportHeuristic(text) ||
    (hasKhataDebtWord(text) && parseKhataSettleHeuristic(text)) ||
    parseKhataSaleHeuristic(text)
  );
}

/**
 * Fast-path heuristic parser for Khata customer inquiry requests.
 */
export function parseKhataInquiryHeuristic(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim().replace(/[.!?،۔]+$/, '').trim();

  // "check khata ali", "khata ali", "udhar ali", "کھاتہ علی", "باقی علی"
  const m1 = lower.match(/^(?:check\s*khata|khata|udhar|udhaar|باقی|کھاتہ)\s+([a-zA-Z\s\u0600-\u06FF-]+)$/i);
  if (m1) {
    return { type: 'check_khata', customerName: m1[1].trim(), rawText: text };
  }

  // "ali ka khata", "ali ka kitna baqi hai", "ali ke kitne baqi hain", "علی کا کھاتہ", "علی کے کتنے باقی ہیں"
  const m2 = lower.match(/^([a-zA-Z\s\u0600-\u06FF-]+)\s+(?:ka\s*khata|ka\s*kitna\s*(?:baqi|hai)|ke\s*kitne\s*(?:baqi|hai|hain)|کے\s*کتنے\s*باقی|کا\s*ادھار|کا\s*کھاتہ)$/i);
  if (m2) {
    return { type: 'check_khata', customerName: m2[1].trim(), rawText: text };
  }

  return null;
}

/**
 * Fast-path heuristic parser for routine Kiryana sales (e.g. "10 kg chawal", "2 doodh cash", "5 lipton cash", "3 panadol 150", "2 chawal udhaar ali").
 * Resolves standard store sales in 0ms without hitting external LLM rate limits.
 */
export function parseStandardSaleHeuristic(text) {
  if (!text || typeof text !== 'string') return null;

  // Strict check: if this text is a Khata settlement or inquiry, never process as sale!
  if (parseKhataSettleHeuristic(text) || parseKhataInquiryHeuristic(text)) {
    return null;
  }

  const normalizedDigits = text.replace(/[۰-۹]/g, (d) => URDU_DIGITS_MAP[d] || d);
  const lower = normalizedDigits.trim().toLowerCase();

  // Exclude greetings, restock, stock inquiries, automations, reports, and returns
  if (
    /^(?:suno|salam|assalam|aoa|hello|hi|hey|bhai|janab|adaab|help|مدد|سلام|وعلیکم|ہیلو|سنو)\b/i.test(lower) ||
    /(?:maal|mal)\s*(?:a+y*a+|a+g+a+y*a+|pohnch|received)|(?:a+y*a+|a+y*i+|aaye)\s*(?:hai|hain)|restock|add\s*(?:new\s*)?(?:stock|inventory)|(?:stock|inventory)\s*(?:add|update)|(?:to|in|into)\s*(?:stock|inventory)|(?:stock|inventory)\s*(?:mein|me|main)|مال\s*(?:آیا|پہنچ)|آئے\s*ہیں|اسٹاک\s*میں|نیا\s*مال|ایڈ\s*(?:اسٹاک|انوینٹری)|\b(?:inventory|restock)\b/i.test(lower) ||
    /^add\s+(?:stock\s+(?:of\s+)?)?\d+/i.test(lower) ||
    /^add\s+[a-zA-Z\u0600-\u06FF\s]+\s+\d+/i.test(lower) ||
    /(?:kitna|kitni|kitne|check\s*stock|stock\s*check|how\s*much|how\s*many|report|summary|hisab|رپورٹ|کھاتہ|wapis|wapas|return|واپس|تبادلہ|exchange|badal)/i.test(lower) ||
    /^(?:stock\s*list|inventory|saman)\b/i.test(lower) ||
    // "udhaar me se" / "khate se" is money coming off a debt, never a sale.
    new RegExp(`(?:${KHATA_DEBT_WORDS})\\s*(?:(?:me|mein|main|men|میں)\\s*)?(?:se|سے)(?=$|\\s)`, 'i').test(lower) ||
    // "<name> ka khata bana do" — opening a khata, never a sale.
    looksLikeKhataCreation(lower) ||
    // A mobile number in the message ("uska number 0300 1234567") is never a quantity.
    /(?:\+?92|0)\s*3\d{2}[\s-]*\d{3}[\s-]*\d{4}/.test(lower)
  ) {
    return null;
  }

  // Customer and payment method apply to the whole message, so pull them out before splitting —
  // otherwise "Ali ko udhaar" ends up inside the first item's name.
  const { text: withoutCustomer, isUdhaar, customerName } = extractUdhaarCustomer(lower);
  const { text: itemsText, paymentMethod } = extractSalePaymentMethod(withoutCustomer);

  const chunks = splitSaleItems(itemsText);
  if (!chunks.length) return null;

  const items = [];
  for (const chunk of chunks) {
    const item = parseSaleItemChunk(chunk);
    if (item === SKIP_CHUNK) continue;
    // One unreadable chunk means the whole list is unreliable: return null so the LLM parses it,
    // instead of silently dropping an item from the sale.
    if (!item) return null;
    items.push(item);
  }
  if (!items.length) return null;

  // A spoken amount is the line total for that item. Only use the sum when every line has one;
  // otherwise let the order service compute the total from inventory prices.
  const lineAmounts = items.map((i) => i.price ?? i.targetAmount ?? null);
  const amount = lineAmounts.every((a) => a != null) ? lineAmounts.reduce((s, a) => s + a, 0) : null;

  return {
    type: 'log_sale',
    items,
    paymentMethod: isUdhaar ? 'udhaar' : paymentMethod,
    customerName: isUdhaar ? customerName : null,
    amount,
    isIncomplete: false,
  };
}

// JS `\b` only knows ASCII letters, so `\bادھار\b` can never match Urdu script. These lookarounds
// treat any Unicode letter, combining mark or digit as part of a word.
const U_START = '(?<![\\p{L}\\p{M}\\p{N}])';
const U_END = '(?![\\p{L}\\p{M}\\p{N}])';
const unicodeWord = (alternation, flags = 'iu') => new RegExp(`${U_START}(?:${alternation})${U_END}`, flags);

// Item separators inside one sale. Whisper writes Urdu commas and full stops, and spells "aur" as "or".
// A dot between digits ("1.5 kg") or after "rs" ("Rs. 300") is not a separator.
const SALE_ITEM_SEPARATOR = /\s*[,،;\n]\s*|\s*(?<!\d|rs)[.۔](?!\d)\s*|\s+(?:aur|and|or|phir|plus|اور|پھر)\s+/iu;
const LEADING_CONNECTOR = /^(?:aur|and|or|phir|plus|اور|پھر)\s+/iu;

const SALE_DEBT_WORDS = 'udhaari|udhari|udhaar|udhar|udaar|adhaar|khaata|khaate|khata|khate|ادھار|کھاتے|کھاتا|کھاتہ';
const SALE_PARTICLE = 'ko|ke|ka|ki|کو|کے|کا|کی';
const SALE_POSTPOSITION = 'mein|me|main|men|may|pe|par|per|میں|پر|پہ';
const SALE_HONORIFIC = 'bhai|bhae|sahab|sahib|saheb|sb|ji|بھائی|صاحب|جی';
const SALE_NAME = `([\\p{L}\\p{M}]+(?:\\s+(?:${SALE_HONORIFIC}))?)`;

// "Ali ko udhaar", "Ali ke khate mein", "soban bhai ke udhaar ke khate me", "علی کے ادھار میں"
const NAME_THEN_DEBT_REGEX = new RegExp(
  `${U_START}${SALE_NAME}\\s+(?:${SALE_PARTICLE})\\s+(?:(?:${SALE_DEBT_WORDS})\\s+(?:${SALE_PARTICLE})\\s+)?(?:${SALE_DEBT_WORDS})(?:\\s+(?:${SALE_POSTPOSITION}))?${U_END}`,
  'giu'
);
// "udhaar ali", "udhar to Ali", "khata osama", "ادھار علی"
const DEBT_THEN_NAME_REGEX = new RegExp(
  `${U_START}(?:${SALE_DEBT_WORDS})(?:\\s+(?:to|for|${SALE_PARTICLE}|${SALE_POSTPOSITION}))?\\s+${SALE_NAME}${U_END}`,
  'giu'
);
const BARE_DEBT_REGEX = new RegExp(`${U_START}(?:${SALE_DEBT_WORDS})(?:\\s+(?:${SALE_POSTPOSITION}))?${U_END}`, 'giu');
// "... udhaar pe de diya", "... likh do". "daal do" is only stripped when it can't be the lentil
// ("2 kilo daal do" keeps its daal).
const SALE_CLOSING_VERB_REGEX = new RegExp(
  `(?:\\s+(?:pe|par|per|پر|پہ))?\\s+(?:de\\s*diya|de\\s*diye|de\\s*dia|de\\s*di|de\\s*do|de\\s*dein|dey\\s*diya|likh\\s*do|likh\\s*dein|(?<!(?:\\d|kilo|kg|kilos|pao|aadha|adha|gram|gm|dedh|dhai|packet|کلو|پاؤ|آدھا)\\s+)(?:daal|dal)\\s*(?:do|dein|den|de)|دے\\s*دیا|دے\\s*دیے|دے\\s*دو|لکھ\\s*دو|ڈال\\s*دو)\\s*$`,
  'iu'
);

const SALE_FILLER_WORDS = [
  'becha', 'bechi', 'beche', 'sold', 'furokht', 'diye', 'diya', 'de', 'do', 'dy', 'le', 'lo', 'ko', 'ka', 'ki', 'ke',
  'rupay', 'rs', 'rupees', 'roopay', 'pkr', 'روپے', 'روپیہ', 'بیچا', 'بیچی', 'دیے', 'دیا',
];
const SALE_FILLER_REGEX = unicodeWord(SALE_FILLER_WORDS.join('|'), 'giu');
// Words that can follow a quantity without being an item name (packaging and money words).
const NOT_AN_ITEM_WORD = new Set([
  ...SALE_FILLER_WORDS,
  'waali', 'wali', 'wala', 'walay', 'waalay', 'pack', 'packet', 'dabba', 'box', 'sachet', 'والی', 'والا', 'والے', 'پیکٹ', 'ڈبہ', 'ساشے',
]);
// Words that can sit right next to "udhaar" but are never a customer's name.
const NOT_A_CUSTOMER_NAME = new Set([
  ...Object.keys(NUMBER_WORDS_MAP),
  ...Object.keys(UNIT_CANONICAL_MAP),
  ...SALE_DEBT_WORDS.split('|'),
  ...SALE_PARTICLE.split('|'),
  ...SALE_POSTPOSITION.split('|'),
  'to', 'for', 'se', 'de', 'di', 'dia', 'diya', 'diye', 'do', 'dein', 'den', 'dena', 'daal', 'dal', 'dalo', 'likh', 'likho',
  'kar', 'karo', 'kardo', 'hai', 'hain', 'aur', 'and', 'or', 'phir', 'plus', 'cash', 'sale', 'becha', 'pay',
  'سے', 'دے', 'دیا', 'دیے', 'دو', 'ڈال', 'لکھ', 'کر', 'ہے', 'اور', 'پھر',
]);

/**
 * Pulls the udhaar marker and the customer's name out of a whole sale message.
 * Returns the remaining text (items only), whether it is an udhaar sale, and the name (or null).
 */
export function extractUdhaarCustomer(text) {
  let rest = String(text || '');
  let customerName = null;

  for (const regex of [NAME_THEN_DEBT_REGEX, DEBT_THEN_NAME_REGEX]) {
    for (const m of rest.matchAll(regex)) {
      const firstWord = m[1].split(/\s+/)[0];
      if (NOT_A_CUSTOMER_NAME.has(firstWord) || /\d/.test(firstWord)) continue;
      customerName = m[1].replace(/\s+/g, ' ').trim();
      rest = `${rest.slice(0, m.index)} ${rest.slice(m.index + m[0].length)}`;
      break;
    }
    if (customerName) break;
  }

  const isUdhaar = !!customerName || unicodeWord(SALE_DEBT_WORDS).test(rest);
  if (isUdhaar) {
    rest = rest.replace(BARE_DEBT_REGEX, ' ').trim().replace(/[.!?،۔]+$/, '').trim();
    rest = rest.replace(SALE_CLOSING_VERB_REGEX, ' ');
  }

  return { text: rest.replace(/\s+/g, ' ').trim(), isUdhaar, customerName };
}

const SALE_PAYMENT_REGEX = unicodeWord('cash|kash|easypaisa|easy\\s*paisa|jazzcash|jazz\\s*cash|sadapay|nayapay|raast|bank|کیش');

/** Pulls a non-udhaar payment method out of a sale message. Defaults to cash. */
function extractSalePaymentMethod(text) {
  const m = text.match(SALE_PAYMENT_REGEX);
  if (!m) return { text, paymentMethod: 'cash' };
  const found = m[0].toLowerCase().replace(/\s+/g, '');
  const paymentMethod = found === 'kash' || found === 'کیش' ? 'cash' : normalizePaymentMethod(found) || found;
  return { text: text.replace(SALE_PAYMENT_REGEX, ' ').replace(/\s+/g, ' ').trim(), paymentMethod };
}

function isQuantityToken(t) {
  return /^\d+(?:\.\d+)?$/.test(t) || NUMBER_WORDS_MAP[t] !== undefined;
}

function isUnitToken(t) {
  return UNIT_CANONICAL_MAP[t] !== undefined || UNIT_REGEX.test(` ${t} `);
}

function isItemNameToken(t) {
  return /\p{L}/u.test(t) && !isQuantityToken(t) && !isUnitToken(t) && !NOT_AN_ITEM_WORD.has(t);
}

/**
 * Splits "2 kilo chawal 1 kilo chini 3 doodh" (no separators, typical of voice notes) into one
 * chunk per item. Only quantity-first chunks are split: a new item starts at a quantity that
 * follows an item name and is itself followed (after any unit) by another item name.
 * "2 chawal 300 3 doodh 450" -> ["2 chawal 300", "3 doodh 450"]; "2 lipton 300 gm waali" stays whole.
 */
export function splitImplicitSaleItems(chunk) {
  const tokens = chunk.split(/\s+/).filter(Boolean);
  if (!tokens.length || !isQuantityToken(tokens[0])) return [chunk];

  const segments = [[]];
  let segmentHasName = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (segmentHasName && isQuantityToken(t)) {
      let j = i + 1;
      // Skip units and money-first particles ("1 kilo chini", "100 ki chini").
      while (j < tokens.length && (isUnitToken(tokens[j]) || /^(?:ki|ka|ke|کی|کا|کے|rupay|rs|روپے)$/iu.test(tokens[j]))) j++;
      if (j < tokens.length && isItemNameToken(tokens[j])) {
        segments.push([]);
        segmentHasName = false;
      }
    }
    segments[segments.length - 1].push(t);
    if (isItemNameToken(t)) segmentHasName = true;
  }
  return segments.map((s) => s.join(' ')).filter(Boolean);
}

/** Splits a sale message into one text chunk per item (explicit separators, then implicit). */
export function splitSaleItems(text) {
  return String(text || '')
    .split(SALE_ITEM_SEPARATOR)
    .map((c) => (c || '').replace(LEADING_CONNECTOR, '').trim())
    .filter(Boolean)
    .flatMap(splitImplicitSaleItems);
}

const SKIP_CHUNK = Symbol('skip');

/**
 * Parses one item chunk ("2 kg chawal", "3 panadol 150", "100 ki chini", "lipton 300gm waali").
 * Returns the item, SKIP_CHUNK for a chunk with nothing in it, or null when it can't be read.
 */
function parseSaleItemChunk(chunk) {
  // Strip sentence punctuation, but keep the decimal point in "1.5 kg".
  let piece = chunk.replace(/(?<!\d)\.|\.(?!\d)|[!?،۔;:]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!piece || !/[\p{L}\d]/u.test(piece.replace(SALE_FILLER_REGEX, ''))) return SKIP_CHUNK;

  // Money-first: "100 ki chini", "70 rupay ka doodh"
  const moneyFirst = piece.match(/^(\d+)\s*(?:rupay|rupees|rs|روپے)?\s*(?:ki|ka|ke|کی|کا|کے)\s+(.+)$/iu);
  if (moneyFirst) {
    const name = moneyFirst[2].replace(SALE_FILLER_REGEX, ' ').replace(/\s+/g, ' ').trim();
    const targetAmount = parseInt(moneyFirst[1], 10);
    if (!name || /\d/.test(name) || !(targetAmount > 0)) return null;
    return { name, quantity: 1, targetAmount };
  }

  // Packaged size variant (e.g. "lipton 300gm waali")
  const { processed, pkgVariant } = extractPackagedVariant(piece);
  piece = processed;

  let unit = pkgVariant ? 'packet' : null;
  const uMatch = piece.match(UNIT_REGEX);
  if (uMatch) {
    unit = uMatch[1].trim();
    piece = piece.replace(UNIT_REGEX, ' ');
  }

  let quantity = pkgVariant ? 1 : null;
  let priceOrAmount = null;
  const nums = piece.match(/\d+(?:\.\d+)?/g);
  if (nums && nums.length > 2) return null; // more numbers than quantity + price: can't tell them apart
  if (nums && nums.length > 0) {
    quantity = parseFloat(nums[0]);
    if (nums.length === 2) priceOrAmount = parseFloat(nums[1]);
    piece = piece.replace(/\d+(?:\.\d+)?/g, ' ');
  } else {
    for (const w of piece.split(/\s+/)) {
      if (NUMBER_WORDS_MAP[w]) {
        quantity = NUMBER_WORDS_MAP[w];
        piece = piece.replace(unicodeWord(w), ' ');
        break;
      }
    }
  }

  let name = piece.replace(SALE_FILLER_REGEX, ' ').replace(/\s+/g, ' ').trim();
  if (pkgVariant) {
    name = name.replace('__PKG_SIZE__', pkgVariant).replace(/\s+/g, ' ').trim();
  }

  if (!name || !(quantity > 0) || name.includes('__PKG_SIZE__') || name.split(' ').length > 5) return null;
  if (/\d/.test(name) && !pkgVariant) return null;

  return {
    name,
    quantity,
    ...(unit ? { unit } : {}),
    ...(priceOrAmount ? { price: priceOrAmount } : {}),
  };
}

/**
 * Returns one of the command-contract shapes. Shared by the
 * typed-text path and (via the agent module) the voice-transcript path.
 * Injects dynamic merchant catalog context when available.
 * Logs one intent.parsed event saying whether the rules or the LLM produced the result.
 */
export async function parseIntent(text, merchant = null) {
  const startedAt = Date.now();
  const trace = { llm: 'not_called' };
  const intent = await resolveIntent(text, merchant, trace);
  logger.info('intent.parsed', {
    parsedBy: trace.llm === 'answered' ? 'llm' : trace.llm === 'not_called' ? 'rules' : `rules_after_llm_${trace.llm}`,
    type: intent?.type,
    itemCount: Array.isArray(intent?.items) ? intent.items.length : undefined,
    paymentMethod: intent?.paymentMethod,
    hasCustomer: intent?.customerName ? true : undefined,
    textChars: typeof text === 'string' ? text.length : 0,
    latencyMs: Date.now() - startedAt,
  });
  return intent;
}

async function resolveIntent(text, merchant, trace) {
  if (!text || typeof text !== 'string') {
    return { type: 'unknown', rawText: '' };
  }

  // Khata commands go first: they use words ("khata", "udhaar", "report", "wapis") that the
  // inquiry, return and report heuristics below would otherwise hijack.
  const khataCreateHeuristic = parseKhataCreateHeuristic(text);
  if (khataCreateHeuristic) {
    return khataCreateHeuristic;
  }

  const khataReportHeuristic = parseKhataReportHeuristic(text);
  if (khataReportHeuristic) {
    return khataReportHeuristic;
  }

  if (hasKhataDebtWord(text)) {
    const debtPayment = parseKhataSettleHeuristic(text);
    if (debtPayment) return debtPayment;
  }

  // Check return/exchange and money-first heuristics first
  const returnOrExchangeHeuristic = parseReturnOrExchangeHeuristic(text);
  if (returnOrExchangeHeuristic) {
    return returnOrExchangeHeuristic;
  }

  // Check fast-path Khata settlement & inquiry heuristics before sale heuristics
  const khataSettleHeuristic = parseKhataSettleHeuristic(text);
  if (khataSettleHeuristic) {
    return khataSettleHeuristic;
  }

  const khataInquiryHeuristic = parseKhataInquiryHeuristic(text);
  if (khataInquiryHeuristic) {
    return khataInquiryHeuristic;
  }

  const khataSaleHeuristic = parseKhataSaleHeuristic(text);
  if (khataSaleHeuristic) {
    return khataSaleHeuristic;
  }

  const moneyFirstHeuristic = parseMoneyFirstSaleHeuristic(text);
  if (moneyFirstHeuristic) {
    return moneyFirstHeuristic;
  }

  // Check fast-path stock heuristic
  const stockHeuristic = parseStockHeuristic(text);
  if (stockHeuristic) {
    return stockHeuristic;
  }

  // Check fast-path standard sale heuristic
  const saleHeuristic = parseStandardSaleHeuristic(text);
  if (saleHeuristic) {
    return saleHeuristic;
  }

  if (!llmConfigured()) {
    logger.warn('intent.llm_unavailable', { reason: 'no LLM provider key set' });
    return { type: 'unknown', rawText: text };
  }

  let prompt = SYSTEM_PROMPT;
  if (merchant?._id) {
    try {
      const catalog = await getMerchantCatalog(merchant._id);
      if (catalog?.names?.length > 0) {
        prompt += `\n\nStore Context:\nBusiness: ${catalog.businessName || 'Retail'} (${catalog.businessType})\nKnown Inventory Catalog: ${catalog.names.slice(0, 50).join(', ')}`;
      }
    } catch {
      // Non-fatal, continue with base prompt
    }
  }

  try {
    trace.llm = 'failed';
    const raw = await chatCompletion(prompt, text, 'intent');
    const parsed = extractJson(raw);
    trace.llm = 'off_contract';

    if (parsed && ['log_sale', 'update_stock', 'check_stock', 'settle_khata', 'check_khata', 'create_khata', 'khata_report', 'create_workflow', 'unsupported_workflow', 'greeting', 'generate_report', 'return_order', 'exchange_order', 'unknown'].includes(parsed.type)) {
      trace.llm = 'answered';
      // Guard: If model misclassified settlement as a sale, override it
      if (parsed.type === 'log_sale' && khataSettleHeuristic?.type === 'settle_khata') {
        return khataSettleHeuristic;
      }
      // Guard: If model misclassified restock speech as a sale, override it
      if (parsed.type === 'log_sale') {
        if (stockHeuristic?.type === 'update_stock' || stockHeuristic?.type === 'stock_guide') {
          return stockHeuristic;
        }
        if (/(?:add\s*stock|add\s*inventory|to\s*stock|to\s*inventory|restock|maal\s*a[y|i]a|مال\s*آیا|نیا\s*مال|اسٹاک\s*میں|ایڈ\s*اسٹاک|\b(?:inventory|restock)\b)/i.test(text)) {
          if (stockHeuristic?.type === 'update_stock') return stockHeuristic;
          return { type: 'stock_guide', rawText: text };
        }
      }

      if (parsed.type === 'log_sale') {
        if (parsed.paymentMethod) {
          parsed.paymentMethod = normalizePaymentMethod(parsed.paymentMethod) || parsed.paymentMethod.toLowerCase();
        } else {
          parsed.paymentMethod = 'cash';
        }

        // A sentence that says udhaar/khata is a khata sale. Never let the model's "cash" default
        // quietly turn it into a cash sale; with no customer name the bot asks whose khata it is.
        if (hasKhataDebtWord(text) && parsed.paymentMethod !== 'udhaar') {
          parsed.paymentMethod = 'udhaar';
        }

        // Migrate single item to items array if LLM hallucinated the old schema
        if (parsed.item && !parsed.items) {
          parsed.items = [parsed.item];
          delete parsed.item;
        }

        if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
          parsed.items = [{ name: text.trim(), quantity: 1 }];
        }

        parsed.items.forEach((item) => {
          if (!item.name) item.name = text.trim();
          if (!item.quantity || isNaN(item.quantity)) item.quantity = 1;
        });

        parsed.isIncomplete = !!parsed.isIncomplete;
      }

      if (parsed.type === 'update_stock') {
        if (!parsed.item || !parsed.item.name) {
          if (stockHeuristic?.item?.name) {
            parsed.item = stockHeuristic.item;
          } else {
            parsed.item = { name: text.trim(), quantity: 1 };
          }
        }
        if (!parsed.item.quantity || isNaN(parsed.item.quantity)) {
          parsed.item.quantity = 1;
        }
        parsed.action = parsed.action || 'add';
      }

      if (parsed.type === 'check_stock') {
        if (!parsed.item || !parsed.item.name) {
          if (stockHeuristic?.item?.name) {
            parsed.item = stockHeuristic.item;
          }
        }
      }

      return parsed;
    }

    logger.warn('intent.llm_off_contract', { raw: String(raw).slice(0, 300) });
  } catch (err) {
    logger.warn('intent.llm_failed', { error: errorSummary(err) });
  }

  // Safety net heuristic fallbacks: never falsely say 'unknown' to standard greetings, reports, or stock
  if (stockHeuristic) {
    return stockHeuristic;
  }

  const lower = text.trim().toLowerCase();
  if (/^(suno|salam|assalam|aoa|hello|hi|hey|bhai|janab|adaab)\b/i.test(lower) || /^(سلام|وعلیکم|ہیلو|سنو)/.test(text.trim())) {
    return { type: 'greeting', rawText: text };
  }

  // Only trigger report when explicitly asking for reports or full inventory/summary
  if (/(report|summary|hisab|کھاتہ|رپورٹ)/i.test(lower) || /^(inventory|stock\s*list|سارا\s*اسٹاک)$/i.test(lower)) {
    const reportType = /sale/i.test(lower) ? 'sales' : /low|short|kam/i.test(lower) ? 'low_stock' : 'inventory';
    return { type: 'generate_report', reportType };
  }

  return { type: 'unknown', rawText: text };
}

/**
 * Extracts { businessName, businessType, location, sells } from the onboarding
 * message, with null for anything not clearly stated. Returns null when the
 * model is unavailable or returns garbage — callers fall back to the raw text
 * rather than blocking onboarding on a flaky NLP call.
 */
export async function extractBusinessDetails(text) {
  if (!llmConfigured()) return null;

  const VALID_TYPES = ['general', 'kiryana', 'medical', 'clothing', 'restaurant', 'electronics', 'services', 'auto', 'salon'];

  try {
    const raw = await chatCompletion(BUSINESS_DETAILS_PROMPT, text, 'business_details');
    const parsed = extractJson(raw);
    if (!parsed) return null;

    const strOrNull = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const rawType = strOrNull(parsed.businessType);
    const details = {
      businessName: strOrNull(parsed.businessName),
      businessType: rawType && VALID_TYPES.includes(rawType.toLowerCase()) ? rawType.toLowerCase() : null,
      location: strOrNull(parsed.location),
      sells: strOrNull(parsed.sells),
    };
    return details.businessName || details.businessType || details.location || details.sells ? details : null;
  } catch {
    return null;
  }
}

/**
 * Parses a free-form stock list ("5 shirts 2000 each, 3 bottles perfume...") into
 * normalized line items for onboarding. Returns a non-empty array, or null
 * when extraction can't run / yields nothing usable — callers then keep the
 * raw text as a single unparsed item so onboarding still completes.
 */
export async function extractInventoryItems(text) {
  if (!llmConfigured()) return null;

  try {
    const raw = await chatCompletion(INVENTORY_PROMPT, text, 'inventory_list');
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;

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

/**
 * Last-resort item resolver for when string matching fails — the merchant
 * said "chawal" but their stock list says "rice", or they spoke Urdu script.
 * Asks the LLM to pick from the actual inventory names; returns the exact
 * matching inventory name, or null when nothing plausible / LLM unavailable.
 */
export async function resolveItemName(saidName, inventoryNames) {
  if (!llmConfigured() || !inventoryNames?.length || !saidName) return null;

  try {
    const raw = await chatCompletion(
      ITEM_RESOLVE_PROMPT,
      `Inventory: ${inventoryNames.join(', ')}\nItem said: ${saidName}`,
      'item_resolve'
    );
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*|\s*```$/gi, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim();
    if (!cleaned || cleaned.toLowerCase() === 'null') return null;
    return inventoryNames.find((n) => n.toLowerCase() === cleaned.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}
