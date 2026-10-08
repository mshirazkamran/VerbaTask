/**
 * Single source of truth for what an automation is allowed to look like.
 * Pure module — no DB, no network — so the WhatsApp path, the dashboard API
 * and the background runner all validate and describe workflows identically.
 *
 * Canonical shapes (everything else is rejected):
 *   trigger 'threshold': condition { item: string|null, itemId?: ObjectId, operator: '<'|'<=', value: number }
 *   trigger 'message':   condition { keywords: string[] }   — exact command match
 *   trigger 'schedule':  condition { frequency: 'daily'|'weekly', time: 'HH:mm', dayOfWeek?: 0-6 }  (Pakistan time)
 *   action:              { type: 'notify', message?: string } | { type: 'send_report', reportType }
 */

export const TRIGGERS = ['threshold', 'message', 'schedule'];
export const ACTION_TYPES = ['notify', 'send_report'];
export const REPORT_TYPES = ['sales', 'inventory', 'low_stock', 'top_selling', 'expiring'];

// Pakistan has no DST, so a fixed offset is exact.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const ACTION_ALIASES = {
  notify: 'notify',
  notify_merchant: 'notify',
  send_message: 'notify',
  alert: 'notify',
  message: 'notify',
  send_report: 'send_report',
  report: 'send_report',
  generate_report: 'send_report',
};

const REPORT_ALIASES = {
  sales: 'sales',
  sale: 'sales',
  daily_sales: 'sales',
  end_of_day: 'sales',
  end_day: 'sales',
  eod: 'sales',
  daily: 'sales',
  inventory: 'inventory',
  stock: 'inventory',
  low_stock: 'low_stock',
  low: 'low_stock',
  short_stock: 'low_stock',
  top_selling: 'top_selling',
  top: 'top_selling',
  best_selling: 'top_selling',
  expiring: 'expiring',
  expiry: 'expiring',
};

const DAY_NAMES = {
  sunday: 0, sun: 0, itwar: 0, itwaar: 0, اتوار: 0,
  monday: 1, mon: 1, pir: 1, peer: 1, پیر: 1,
  tuesday: 2, tue: 2, mangal: 2, منگل: 2,
  wednesday: 3, wed: 3, budh: 3, بدھ: 3,
  thursday: 4, thu: 4, jumerat: 4, jumeraat: 4, جمعرات: 4,
  friday: 5, fri: 5, juma: 5, jumma: 5, جمعہ: 5,
  saturday: 6, sat: 6, hafta: 6, hafte: 6, ہفتہ: 6,
};

// Words the WhatsApp router handles before workflows are ever checked — a
// message automation on one of these would silently never fire.
const RESERVED_KEYWORDS = new Set([
  'order', 'sale', 'log', 'link', 'code',
  'help', 'cmds', 'commands', 'menu', 'madad', 'رہنمائی', 'مینیو', 'کمانڈز',
  'stock list', 'stocklist', 'inventory', 'saman', 'سارا اسٹاک', 'اسٹاک لسٹ',
  'report', 'reports', 'pdf report', 'رپورٹ', 'رپورٹس',
  'profile', 'settings', 'account', 'dukaan', 'دکان', 'سیٹنگز',
  'banks', 'payment methods', 'ادائیگی', 'بینک',
  'workflows', 'automations', 'alerts', 'الرٹس',
  'urdu', 'اردو', 'english', 'language', 'زبان',
]);

const MAX_KEYWORD_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 500;

/** Lowercase, trim, collapse whitespace and strip surrounding quotes/punctuation. */
export function normalizeCommandText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”‘’*]+|["'“”‘’*.!?،۔]+$/g, '')
    .trim();
}

const fail = (code, details = {}) => ({ ok: false, error: { code, ...details } });

// ---------------------------------------------------------------------------
// Field normalizers
// ---------------------------------------------------------------------------

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** Accepts "21:00", "9pm", "9:30 PM", "09:05", 21 → "HH:mm", or null. */
export function parseTime(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23) {
    return `${String(value).padStart(2, '0')}:00`;
  }
  if (typeof value !== 'string') return null;
  const m = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3];
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  }
  if (hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseDayOfWeek(value) {
  if (value == null || value === '') return null;
  const n = toNumber(value);
  if (n != null) return Number.isInteger(n) && n >= 0 && n <= 6 ? n : undefined;
  const key = String(value).trim().toLowerCase();
  return key in DAY_NAMES ? DAY_NAMES[key] : undefined;
}

function normalizeThresholdCondition(cond) {
  const rawItem = typeof cond.item === 'string' ? cond.item.trim() : '';
  const item = !rawItem || /^(any|all|\*|any item|every item|kisi bhi)$/i.test(rawItem) ? null : rawItem;

  const value = toNumber(cond.value ?? cond.quantityThreshold ?? cond.threshold ?? cond.below);
  if (value == null || value < 0) return fail('MISSING_THRESHOLD');

  let operator = cond.operator || '<';
  if (!['<', '<='].includes(operator)) {
    // "> 5" / ">= 5" alerts would fire on every sale for healthy stock — not a
    // stock alert anyone wants, so refuse rather than guess.
    return fail('UNSUPPORTED_OPERATOR');
  }
  if (operator === '<' && value === 0) operator = '<=';

  return { ok: true, value: { item, ...(cond.itemId && item && { itemId: cond.itemId }), operator, value } };
}

function normalizeMessageCondition(cond) {
  const raw = [];
  if (Array.isArray(cond.keywords)) raw.push(...cond.keywords);
  if (typeof cond.keyword === 'string') raw.push(cond.keyword);

  const keywords = [...new Set(raw.map(normalizeCommandText).filter(Boolean))];
  if (!keywords.length) return fail('MISSING_KEYWORD');
  if (keywords.some((k) => k.length > MAX_KEYWORD_LENGTH)) return fail('KEYWORD_TOO_LONG');

  const reserved = keywords.find((k) => RESERVED_KEYWORDS.has(k));
  if (reserved) return fail('RESERVED_KEYWORD', { keyword: reserved });

  return { ok: true, value: { keywords } };
}

function normalizeScheduleCondition(cond) {
  const time = parseTime(cond.time);
  if (!time) return fail('MISSING_TIME');

  const dayOfWeek = parseDayOfWeek(cond.dayOfWeek ?? cond.day);
  if (dayOfWeek === undefined) return fail('INVALID_DAY');

  const frequency = cond.frequency === 'weekly' || dayOfWeek != null ? 'weekly' : 'daily';
  if (frequency === 'weekly' && dayOfWeek == null) return fail('INVALID_DAY');

  return { ok: true, value: { frequency, time, ...(frequency === 'weekly' && { dayOfWeek }) } };
}

function normalizeAction(action, trigger) {
  if (!action || typeof action !== 'object') return fail('UNSUPPORTED_ACTION');
  const type = ACTION_ALIASES[String(action.type || '').toLowerCase()];
  if (!type) return fail('UNSUPPORTED_ACTION', { actionType: action.type });

  if (type === 'send_report') {
    const reportType = REPORT_ALIASES[String(action.reportType || '').toLowerCase()];
    if (!reportType) return fail('UNSUPPORTED_REPORT', { reportType: action.reportType });
    return { ok: true, value: { type, reportType } };
  }

  const message = typeof action.message === 'string' ? action.message.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
  // Threshold alerts have a meaningful default ("Rice has 3 left"); a
  // scheduled or keyword alert with no text would just send an empty ping.
  if (!message && trigger !== 'threshold') return fail('MISSING_MESSAGE');
  return { ok: true, value: { type, ...(message && { message }) } };
}

/**
 * Validates and canonicalizes a workflow from any source (LLM, dashboard,
 * legacy DB rows). Returns { ok: true, value } or { ok: false, error: { code } }.
 */
export function normalizeWorkflow(input = {}) {
  const trigger = String(input.trigger || '').toLowerCase();
  if (!TRIGGERS.includes(trigger)) return fail('UNSUPPORTED_TRIGGER');

  const cond = input.condition && typeof input.condition === 'object' ? input.condition : {};
  const condition =
    trigger === 'threshold' ? normalizeThresholdCondition(cond)
    : trigger === 'message' ? normalizeMessageCondition(cond)
    : normalizeScheduleCondition(cond);
  if (!condition.ok) return condition;

  const action = normalizeAction(input.action, trigger);
  if (!action.ok) return action;

  const rawInstruction = typeof input.rawInstruction === 'string' ? input.rawInstruction.trim().slice(0, MAX_MESSAGE_LENGTH) : undefined;

  return {
    ok: true,
    value: { trigger, condition: condition.value, action: action.value, ...(rawInstruction && { rawInstruction }) },
  };
}

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/** True when an incoming text is exactly one of the workflow's keywords. */
export function matchesMessageTrigger(condition, text) {
  const normalized = normalizeCommandText(text);
  if (!normalized) return false;
  const keywords = Array.isArray(condition?.keywords) ? condition.keywords : [];
  return keywords.some((k) => normalizeCommandText(k) === normalized);
}

/** Whether a stock quantity satisfies a threshold condition. */
export function isBelowThreshold(condition, quantity) {
  const value = toNumber(condition?.value ?? condition?.quantityThreshold);
  if (value == null) return false;
  return condition.operator === '<=' ? quantity <= value : quantity < value;
}

/**
 * Next fire time for a schedule condition, strictly after `from`. Daily/weekly
 * times are Pakistan wall-clock. Legacy interval rows fall back to `from + interval`.
 */
export function computeNextRunAt(condition = {}, from = new Date()) {
  if (!condition.time) {
    const intervalMs = (toNumber(condition.intervalMinutes) || 1440) * 60_000;
    return new Date(from.getTime() + intervalMs);
  }

  const [hour, minute] = condition.time.split(':').map(Number);
  const pkNow = new Date(from.getTime() + PKT_OFFSET_MS); // read with UTC getters = PKT wall clock
  let candidate =
    Date.UTC(pkNow.getUTCFullYear(), pkNow.getUTCMonth(), pkNow.getUTCDate(), hour, minute) - PKT_OFFSET_MS;

  if (condition.frequency === 'weekly') {
    const daysAhead = (condition.dayOfWeek - pkNow.getUTCDay() + 7) % 7;
    candidate += daysAhead * DAY_MS;
    if (candidate <= from.getTime()) candidate += 7 * DAY_MS;
  } else if (candidate <= from.getTime()) {
    candidate += DAY_MS;
  }

  return new Date(candidate);
}

// ---------------------------------------------------------------------------
// Human-readable descriptions (WhatsApp read-back, lists, dashboard)
// ---------------------------------------------------------------------------

const REPORT_LABELS = {
  en: {
    sales: "today's sales report",
    inventory: 'the inventory report',
    low_stock: 'the low stock report',
    top_selling: 'the top selling report',
    expiring: 'the expiring items report',
  },
  ur: { sales: 'آج کی سیلز', inventory: 'انوینٹری', low_stock: 'کم اسٹاک', top_selling: 'سب سے زیادہ بکنے والی اشیاء', expiring: 'ایکسپائری' },
};

const DAY_LABELS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
};

function formatTime12h(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function describeTrigger(wf, language = 'en') {
  const ur = language === 'ur';
  const cond = wf.condition || {};

  if (wf.trigger === 'threshold') {
    const value = cond.value ?? cond.quantityThreshold;
    const item = cond.item || (ur ? 'کسی بھی چیز' : 'any item');
    if (cond.operator === '<=') {
      return ur ? `جب ${item} کا اسٹاک ${value} یا اس سے کم ہو` : `When ${item} stock is ${value} or less`;
    }
    return ur ? `جب ${item} کا اسٹاک ${value} سے کم ہو` : `When ${item} stock drops below ${value}`;
  }

  if (wf.trigger === 'message') {
    const kws = (cond.keywords || (cond.keyword ? [cond.keyword] : [])).map((k) => `"${k}"`);
    const joined = kws.join(ur ? ' یا ' : ' or ');
    return ur ? `جب آپ ${joined} لکھیں` : `When you send ${joined}`;
  }

  if (wf.trigger === 'schedule') {
    if (!cond.time) {
      const mins = cond.intervalMinutes || 1440;
      const label = mins >= 1440 ? `${mins / 1440} day(s)` : `${mins / 60} hour(s)`;
      return ur ? `ہر ${label}` : `Every ${label}`;
    }
    const time = formatTime12h(cond.time);
    if (cond.frequency === 'weekly') {
      const day = DAY_LABELS[ur ? 'ur' : 'en'][cond.dayOfWeek];
      return ur ? `ہر ${day} ${time} بجے` : `Every ${day} at ${time}`;
    }
    return ur ? `روزانہ ${time} بجے` : `Every day at ${time}`;
  }

  return wf.trigger;
}

export function describeAction(wf, language = 'en') {
  const ur = language === 'ur';
  const action = wf.action || {};
  const type = ACTION_ALIASES[action.type] || action.type;

  if (type === 'send_report') {
    const label = REPORT_LABELS[ur ? 'ur' : 'en'][action.reportType] || action.reportType;
    return ur ? `آپ کو ${label} کی رپورٹ بھیجوں گا` : `send you ${label}`;
  }
  if (type === 'notify') {
    if (action.message) return ur ? `آپ کو یہ پیغام بھیجوں گا: "${action.message}"` : `send you: "${action.message}"`;
    return ur ? 'آپ کو الرٹ بھیجوں گا' : 'alert you';
  }
  return type || '';
}

/** One-line sentence, e.g. "When Rice stock drops below 5 → alert you". */
export function describeWorkflow(wf, language = 'en') {
  return `${describeTrigger(wf, language)} → ${describeAction(wf, language)}`;
}

// ---------------------------------------------------------------------------
// Merchant-facing explanations for rejected automations
// ---------------------------------------------------------------------------

export function capabilitiesText(language = 'en') {
  if (language === 'ur') {
    return [
      'میں یہ آٹومیشن بنا سکتا ہوں:',
      '• اسٹاک الرٹ: "جب چینی 5 سے کم ہو مجھے بتاؤ"',
      '• روزانہ/ہفتہ وار: "روز رات 9 بجے سیلز رپورٹ بھیجو"',
      '• آپ کا شارٹ کٹ: "جب میں end لکھوں تو آج کی رپورٹ بھیجو"',
      '',
      'کام: الرٹ بھیجنا، یا رپورٹ بھیجنا (سیلز، انوینٹری، کم اسٹاک، زیادہ بکنے والی، ایکسپائری)۔',
    ].join('\n');
  }
  return [
    'I can create these automations:',
    '• Stock alert: "alert me when sugar is below 5"',
    '• Daily/weekly: "every night at 9 send me the sales report"',
    '• Your own shortcut: "when I say end, send me today\'s report"',
    '',
    'Actions: send you an alert, or send a report (sales, inventory, low stock, top selling, expiring).',
  ].join('\n');
}

export function explainWorkflowError(error = {}, language = 'en') {
  const ur = language === 'ur';
  const msg = {
    UNSUPPORTED_REQUEST: ur ? 'معذرت، یہ کام میں خودکار نہیں کر سکتا۔' : "Sorry, that's not something I can automate.",
    UNSUPPORTED_TRIGGER: ur ? 'معذرت، یہ کام میں خودکار نہیں کر سکتا۔' : "Sorry, that's not something I can automate.",
    UNSUPPORTED_ACTION: ur ? 'معذرت، میں صرف الرٹ یا رپورٹ بھیج سکتا ہوں۔' : 'Sorry, automations can only send you an alert or a report.',
    UNSUPPORTED_REPORT: ur ? 'یہ رپورٹ موجود نہیں ہے۔' : "That report doesn't exist.",
    UNSUPPORTED_OPERATOR: ur ? 'اسٹاک الرٹ صرف "کم ہونے" پر بنتا ہے۔' : 'Stock alerts only work for "below" a number.',
    MISSING_THRESHOLD: ur ? 'کتنے اسٹاک پر الرٹ کروں؟ تعداد بتائیں، جیسے "جب چاول 5 سے کم ہو"۔' : 'At what quantity should I alert you? e.g. "when rice is below 5".',
    MISSING_KEYWORD: ur ? 'کون سا لفظ لکھنے پر یہ چلے؟ جیسے "جب میں end لکھوں"۔' : 'Which word should trigger it? e.g. "when I say end".',
    KEYWORD_TOO_LONG: ur ? 'شارٹ کٹ لفظ چھوٹا رکھیں (40 حروف تک)۔' : 'Keep the shortcut word short (40 characters max).',
    RESERVED_KEYWORD: ur
      ? `"${error.keyword}" پہلے سے ایک کمانڈ ہے، کوئی اور لفظ چنیں۔`
      : `"${error.keyword}" is already a built-in command — pick a different word.`,
    MISSING_TIME: ur ? 'کس وقت؟ جیسے "روز رات 9 بجے"۔' : 'At what time? e.g. "every day at 9pm".',
    INVALID_DAY: ur ? 'ہفتے کا کون سا دن؟' : 'Which day of the week?',
    MISSING_MESSAGE: ur ? 'کیا پیغام بھیجوں؟ جیسے "روز صبح 9 بجے یاد دلاؤ کہ دکان کھولو"۔' : 'What should the message say? e.g. "every day at 9am remind me to open the shop".',
    ITEM_NOT_FOUND: ur
      ? `"${error.item}" آپ کے اسٹاک میں نہیں ملا۔ پہلے یہ چیز شامل کریں یا نام درست کریں۔`
      : `I couldn't find "${error.item}" in your stock. Add it first or check the name.`,
  }[error.code];

  return msg || (ur ? 'معذرت، یہ آٹومیشن نہیں بن سکی۔' : "Sorry, I couldn't set up that automation.");
}
