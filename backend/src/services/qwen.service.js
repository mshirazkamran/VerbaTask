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

const SYSTEM_PROMPT = `You convert a Pakistani merchant's WhatsApp message (which may be in
English, Urdu script, or Roman Urdu) for ANY retail trade (general store, grocery/kiryana, medical/pharmacy, clothing/boutique, auto parts, electronics, restaurant/bakery, hardware) into exactly one JSON object — no prose, no markdown fences, JSON only. Pick ONE of these shapes:

1. Logging a sale (customer purchased goods, selling items):
{"type":"log_sale","items":[{"name":"<item name as the merchant referred to it>","quantity":<number>}],"paymentMethod":"cash"|"easypaisa"|"jazzcash"|"sadapay"|"nayapay"|"raast"|"meezan"|"hbl"|"ubl"|"alfalah"|"mcb"|"faysal"|"allied"|"askari"|"bank","amount":<number or null>,"isIncomplete":<boolean>}
- Used when items are SOLD (e.g. "2 panadol cash", "1 lawn suit 3500", "3 spark plug jazzcash", "2 chawal cash", "becha", "sold", "furokht", "bechi", "beche", "دیے", "سیل").
- Can contain one or multiple items.
- Set isIncomplete: true if the message appears cut-off or trailing (e.g. ends with "aur...", "and...", "phir...", trailing numbers, or ellipsis "..."). Otherwise false.
- If the merchant mentions ANY product name without restock words, it is a sale.
- If quantity is not explicitly stated, default quantity to 1.
- Supported payment methods: cash, easypaisa, jazzcash, sadapay, nayapay, raast, meezan, hbl, ubl, alfalah, mcb, faysal, allied, askari, or generic bank. Default to "cash".

2. Updating inventory / Adding incoming stock (restock/delivery):
{"type":"update_stock","item":{"name":"<item name>","quantity":<number>,"price":<number or null>,"unit":"<unit or null>"},"action":"add"|"set"}
- Used when new stock ARRIVES, goods are received, inventory is added, or stock is updated.
- Common keywords: "maal aya", "aaya", "aayi", "restock", "add stock", "stock update", "added", "delivered", "وصول", "مال آیا", "آئے ہیں", "اسٹاک میں شامل کریں", "نیا مال".
- Examples: "maal aya 50 panadol 300" -> {"type":"update_stock","item":{"name":"panadol","quantity":50,"price":300},"action":"add"}
- "add 20 spark plug 450" -> {"type":"update_stock","item":{"name":"spark plug","quantity":20,"price":450},"action":"add"}
- "20 کلو چاول آئے ہیں" -> {"type":"update_stock","item":{"name":"چاول","quantity":20,"unit":"کلو"},"action":"add"}

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

7. Anything else where NO product, report, greeting, stock update, or automation can be identified:
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

/** Which host the LLM calls go to — env-overridable, defaults to the free path. */
function llmProvider() {
  return process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'dashscope');
}

/** True when the selected provider actually has a key to call with. */
function llmConfigured() {
  return llmProvider() === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.DASHSCOPE_API_KEY;
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
 * Includes cascading model fallback on Groq to prevent single-point-of-failure errors.
 */
async function chatCompletion(systemPrompt, userText) {
  if (llmProvider() === 'groq') {
    const modelsToTry = [
      process.env.LLM_MODEL || 'qwen/qwen3.8-27b',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-120b',
    ];

    let lastError = null;
    for (const model of modelsToTry) {
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
        if (content) return content;
      } catch (err) {
        lastError = err;
        console.warn(`[qwen.service] Groq model ${model} failed (${err.message}), trying next model...`);
      }
    }
    throw lastError || new Error('All Groq chat models failed');
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
      timeout: 12_000,
    }
  );

  return data?.output?.choices?.[0]?.message?.content ?? data?.output?.text ?? '';
}

const URDU_DIGITS_MAP = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

const NUMBER_WORDS_MAP = {
  'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
  'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'انیس': 19, 'بیس': 20,
  'پچیس': 25, 'تیس': 30, 'چالیس': 40, 'پچاس': 50, 'سو': 100,
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'panch': 5, 'che': 6, 'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15, 'solah': 16, 'satrah': 17, 'atharah': 18, 'unnees': 19, 'bees': 20,
  'pachees': 25, 'tees': 30, 'chalees': 40, 'pachas': 50, 'sau': 100,
};

const NUMBER_WORDS_REGEX = new RegExp(
  `\\b(?:${Object.keys(NUMBER_WORDS_MAP).filter((w) => /^[a-z]+$/i.test(w)).join('|')})\\b|(?:${Object.keys(NUMBER_WORDS_MAP).filter((w) => !/^[a-z]+$/i.test(w)).join('|')})`,
  'gi'
);

const UNIT_REGEX = /(?:^|\s)(kg|kilo|kilos|g|gram|grams|gm|litre|liter|litres|liters|ml|packet|packets|pkt|box|boxes|bottle|bottles|strip|strips|piece|pieces|pcs|pc|darjan|dozen|bori|sack|suit|meter|meters|کلو|گرام|لیٹر|درجن|پیکٹ|بوری|بوتل|ڈبہ|پتہ|میٹر)(?:\s|$)/i;

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

  // 1. Check stock inquiry: "rice kitna hai", "check stock sugar", "chini kitni hai", "how much oil left", "stock rice"
  const isStockCheck = /(kitna\s*(?:hai|bacha|rah\s*gaya)|kitni\s*(?:hai|bachi|rah\s*gayi)|kitne\s*(?:hai|bache|rah\s*gaye)|check\s*stock|stock\s*check|how\s*much.*left|how\s*many.*left|کتنا\s*ہے|کتنی\s*ہے|کتنا\s*بچا|اسٹاک\s*چیک)/i.test(lower) ||
    /^stock\s+(?!list\b|summary\b|report\b)([a-zA-Z\u0600-\u06FF\s]+)$/i.test(lower) ||
    /^[a-zA-Z\u0600-\u06FF\s]+\s+stock$/i.test(lower);

  if (isStockCheck) {
    const cleaned = lower
      .replace(/(check\s*stock|stock\s*check|stock\s*of|^stock\b|\bstock$|kitna\s*hai|kitni\s*hai|kitne\s*hai|kitna\s*bacha\s*hai|kitni\s*bachi\s*hai|kitne\s*bache\s*hai|kitna\s*bacha|kitni\s*bachi|kitne\s*bache|rah\s*gaya|rah\s*gayi|rah\s*gaye|ka\s*stock|ki\s*stock|how\s*much|how\s*many|left|کتنا\s*ہے|کتنی\s*ہے|کتنا\s*بچا|کا\s*اسٹاک|اسٹاک)/gi, '')
      .trim();
    if (cleaned) {
      return { type: 'check_stock', item: { name: cleaned } };
    }
  }

  // 2. Restock / incoming inventory: "maal aya 20 chini", "add 50 rice", "stock update 20 oil", "20 کلو چاول آئے ہیں"
  const isRestock = /(maal\s*a[y|i]a|a[y|i]a\s*hai|aaye\s*hain|restock|add\s*stock|stock\s*update|stock\s*add|مال\s*آیا|آئے\s*ہیں|اسٹاک\s*میں\s*شامل|نیا\s*مال)/i.test(lower) ||
                    /^add\s+\d+/i.test(lower) ||
                    /^(شامل|اضافہ)\b/.test(lower);

  if (isRestock) {
    let quantity = 1;
    let price = null;
    let unit = null;

    const unitMatch = lower.match(UNIT_REGEX);
    if (unitMatch) {
      unit = unitMatch[1].trim();
    }

    const explicitPriceMatch = lower.match(/(?:price|rate|rs|rupay|rupees|قیمت|روپے)\s*[:=]?\s*(\d+)/i) ||
                               lower.match(/(\d+)\s*(?:rs|rupay|rupees|روپے)/i);
    if (explicitPriceMatch) {
      price = parseInt(explicitPriceMatch[1], 10);
    }

    const nums = lower.match(/\d+/g);
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
      const words = lower.split(/\s+/);
      for (const w of words) {
        if (NUMBER_WORDS_MAP[w]) {
          quantity = NUMBER_WORDS_MAP[w];
          break;
        }
      }
    }

    const stripped = lower
      .replace(/(maal\s*a[y|i]a|a[y|i]a\s*hai|aaye\s*hain|restock|add\s*stock|stock\s*update|stock\s*add|add|new|naya|item|مال\s*آیا|آئے\s*ہیں|اسٹاک\s*میں\s*شامل|نیا\s*مال|شامل\s*کرو|شامل|اضافہ|روپے|روپیہ|روپئے|rs|rupay|rupees|roopay|pkr|price|rate|\d+)/gi, ' ')
      .replace(UNIT_REGEX, ' ')
      .replace(NUMBER_WORDS_REGEX, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (stripped) {
      return {
        type: 'update_stock',
        item: { name: stripped, quantity, price, unit },
        action: 'add',
      };
    }
  }

  return null;
}

/**
 * Returns one of the command-contract shapes. Shared by the
 * typed-text path and (via the agent module) the voice-transcript path.
 * Injects dynamic merchant catalog context when available.
 */
export async function parseIntent(text, merchant = null) {
  if (!text || typeof text !== 'string') {
    return { type: 'unknown', rawText: '' };
  }

  // Check fast-path stock heuristic first
  const stockHeuristic = parseStockHeuristic(text);

  if (!llmConfigured()) {
    if (stockHeuristic) return stockHeuristic;
    console.warn('No LLM provider key set — falling back to unknown intent');
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
    const raw = await chatCompletion(prompt, text);
    const parsed = extractJson(raw);

    if (parsed && ['log_sale', 'update_stock', 'check_stock', 'create_workflow', 'unsupported_workflow', 'greeting', 'generate_report', 'unknown'].includes(parsed.type)) {
      // Guard: If model misclassified restock speech as a sale, override it
      if (parsed.type === 'log_sale' && stockHeuristic?.type === 'update_stock') {
        return stockHeuristic;
      }

      if (parsed.type === 'log_sale') {
        if (parsed.paymentMethod) {
          parsed.paymentMethod = normalizePaymentMethod(parsed.paymentMethod) || parsed.paymentMethod.toLowerCase();
        } else {
          parsed.paymentMethod = 'cash';
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

    console.warn('[qwen.service] Model returned non-contract JSON:', raw);
  } catch (err) {
    console.warn('[qwen.service] chatCompletion failed during parseIntent:', err.message);
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
    const raw = await chatCompletion(BUSINESS_DETAILS_PROMPT, text);
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
    const raw = await chatCompletion(INVENTORY_PROMPT, text);
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
      `Inventory: ${inventoryNames.join(', ')}\nItem said: ${saidName}`
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
