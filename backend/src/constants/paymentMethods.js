/**
 * Pakistani Banks, Digital Wallets, and Payment Platforms Catalog
 *
 * Defines all standard payment channels supported in Pakistan with metadata,
 * categories, English/Urdu labels, and spoken/typed alias normalization.
 */

export const PAYMENT_METHODS = [
  // Cash
  {
    id: 'cash',
    name: 'Cash',
    nameUrdu: 'نقد',
    category: 'cash',
    aliases: ['cash', 'naqad', 'nakad', 'نقد', 'کیش', 'روپے'],
    isPopular: true,
  },

  // Digital Wallets & EMIs
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    nameUrdu: 'ایزی پیسہ',
    category: 'wallet',
    aliases: ['easypaisa', 'easy paisa', 'easy-paisa', 'ep', 'ایزی پیسہ', 'ایزیپیسہ'],
    isPopular: true,
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    nameUrdu: 'جاز کیش',
    category: 'wallet',
    aliases: ['jazzcash', 'jazz cash', 'jazz-cash', 'jc', 'جاز کیش', 'جازکیش'],
    isPopular: true,
  },
  {
    id: 'sadapay',
    name: 'SadaPay',
    nameUrdu: 'سادا پے',
    category: 'emi',
    aliases: ['sadapay', 'sada pay', 'sada-pay', 'sada', 'سادا پے', 'ساداپے'],
    isPopular: true,
  },
  {
    id: 'nayapay',
    name: 'NayaPay',
    nameUrdu: 'نیا پے',
    category: 'emi',
    aliases: ['nayapay', 'naya pay', 'naya-pay', 'naya', 'نیا پے', 'نیاپے'],
    isPopular: true,
  },
  {
    id: 'raast',
    name: 'Raast',
    nameUrdu: 'راست',
    category: 'instant',
    aliases: ['raast', 'rast', 'raast id', 'raast p2p', 'راست', 'راست آئی ڈی'],
    isPopular: true,
  },
  {
    id: 'upaisa',
    name: 'UPaisa',
    nameUrdu: 'یو پیسہ',
    category: 'wallet',
    aliases: ['upaisa', 'u paisa', 'u-paisa', 'یو پیسہ', 'یوپیسہ'],
    isPopular: false,
  },
  {
    id: 'zindigi',
    name: 'Zindigi',
    nameUrdu: 'زندگی',
    category: 'emi',
    aliases: ['zindigi', 'zindagi', 'زندگی'],
    isPopular: false,
  },

  // Major Commercial & Islamic Banks
  {
    id: 'meezan',
    name: 'Meezan Bank',
    nameUrdu: 'میزان بینک',
    category: 'bank',
    aliases: ['meezan', 'meezan bank', 'mbl', 'میزان', 'میزان بینک'],
    isPopular: true,
  },
  {
    id: 'hbl',
    name: 'HBL (Habib Bank Limited)',
    nameUrdu: 'ایچ بی ایل',
    category: 'bank',
    aliases: ['hbl', 'habib bank', 'habib bank limited', 'ایچ بی ایل', 'حبیب بینک'],
    isPopular: true,
  },
  {
    id: 'ubl',
    name: 'UBL (United Bank Limited)',
    nameUrdu: 'یو بی ایل',
    category: 'bank',
    aliases: ['ubl', 'united bank', 'united bank limited', 'یو بی ایل', 'یونائیٹڈ بینک'],
    isPopular: true,
  },
  {
    id: 'alfalah',
    name: 'Bank Alfalah',
    nameUrdu: 'بینک الفلاح',
    category: 'bank',
    aliases: ['alfalah', 'bank alfalah', 'alfalah bank', 'الفلاح', 'بینک الفلاح'],
    isPopular: true,
  },
  {
    id: 'mcb',
    name: 'MCB Bank',
    nameUrdu: 'ایم سی بی',
    category: 'bank',
    aliases: ['mcb', 'mcb bank', 'muslim commercial bank', 'ایم سی بی'],
    isPopular: true,
  },
  {
    id: 'faysal',
    name: 'Faysal Bank',
    nameUrdu: 'فیصل بینک',
    category: 'bank',
    aliases: ['faysal', 'faysal bank', 'faisal bank', 'فیصل بینک'],
    isPopular: false,
  },
  {
    id: 'allied',
    name: 'Allied Bank (ABL)',
    nameUrdu: 'الائیڈ بینک',
    category: 'bank',
    aliases: ['allied', 'allied bank', 'abl', 'الائیڈ بینک'],
    isPopular: false,
  },
  {
    id: 'askari',
    name: 'Askari Bank',
    nameUrdu: 'عسکری بینک',
    category: 'bank',
    aliases: ['askari', 'askari bank', 'akbl', 'عسکری بینک'],
    isPopular: false,
  },
  {
    id: 'bankislami',
    name: 'BankIslami',
    nameUrdu: 'بینک اسلامی',
    category: 'bank',
    aliases: ['bankislami', 'bank islami', 'بینک اسلامی'],
    isPopular: false,
  },
  {
    id: 'bank_al_habib',
    name: 'Bank AL Habib',
    nameUrdu: 'بینک الحبیب',
    category: 'bank',
    aliases: ['bank al habib', 'bank alhabib', 'bahl', 'بینک الحبیب'],
    isPopular: false,
  },
  {
    id: 'habibmetro',
    name: 'Habib Metropolitan Bank',
    nameUrdu: 'حبیب میٹرو',
    category: 'bank',
    aliases: ['habibmetro', 'habib metro', 'hmb', 'حبیب میٹرو'],
    isPopular: false,
  },
  {
    id: 'bop',
    name: 'The Bank of Punjab (BOP)',
    nameUrdu: 'بینک آف پنجاب',
    category: 'bank',
    aliases: ['bop', 'bank of punjab', 'بینک آف پنجاب'],
    isPopular: false,
  },
  {
    id: 'soneri',
    name: 'Soneri Bank',
    nameUrdu: 'سونہری بینک',
    category: 'bank',
    aliases: ['soneri', 'soneri bank', 'سونہری بینک'],
    isPopular: false,
  },
  {
    id: 'jsbank',
    name: 'JS Bank',
    nameUrdu: 'جے ایس بینک',
    category: 'bank',
    aliases: ['jsbank', 'js bank', 'جے ایس بینک'],
    isPopular: false,
  },
  {
    id: 'standard_chartered',
    name: 'Standard Chartered',
    nameUrdu: 'اسٹینڈرڈ چارٹرڈ',
    category: 'bank',
    aliases: ['standard chartered', 'scb', 'sc pak', 'اسٹینڈرڈ چارٹرڈ'],
    isPopular: false,
  },
  {
    id: 'albaraka',
    name: 'Al Baraka Bank',
    nameUrdu: 'البرکہ بینک',
    category: 'bank',
    aliases: ['albaraka', 'al baraka', 'البرکہ بینک'],
    isPopular: false,
  },
  {
    id: 'dubai_islamic',
    name: 'Dubai Islamic Bank (DIB)',
    nameUrdu: 'دبئی اسلامک بینک',
    category: 'bank',
    aliases: ['dib', 'dubai islamic', 'dubai islamic bank', 'دبئی اسلامک بینک'],
    isPopular: false,
  },
  {
    id: 'nbp',
    name: 'National Bank of Pakistan (NBP)',
    nameUrdu: 'نیشنل بینک',
    category: 'bank',
    aliases: ['nbp', 'national bank', 'national bank of pakistan', 'نیشنل بینک'],
    isPopular: false,
  },
  {
    id: 'generic_bank',
    name: 'Other Bank Transfer',
    nameUrdu: 'بینک ٹرانسفر',
    category: 'bank',
    aliases: ['bank', 'bank transfer', 'online transfer', 'ibft', 'بینک', 'بینک ٹرانسفر'],
    isPopular: true,
  },
];

const METHOD_BY_ID = new Map(PAYMENT_METHODS.map((m) => [m.id, m]));
const ALIAS_MAP = new Map();

PAYMENT_METHODS.forEach((m) => {
  ALIAS_MAP.set(m.id.toLowerCase(), m.id);
  ALIAS_MAP.set(m.name.toLowerCase(), m.id);
  ALIAS_MAP.set(m.nameUrdu.toLowerCase(), m.id);
  m.aliases.forEach((alias) => ALIAS_MAP.set(alias.toLowerCase().trim(), m.id));
});

export const DEFAULT_ACCEPTED_PAYMENT_METHODS = ['cash', 'easypaisa', 'jazzcash'];

/** Returns full catalog of all supported Pakistani payment methods. */
export function getAllPaymentMethods() {
  return PAYMENT_METHODS;
}

/** Checks whether a payment method ID is recognized. */
export function isValidPaymentMethod(id) {
  if (!id || typeof id !== 'string') return false;
  return METHOD_BY_ID.has(id.toLowerCase().trim());
}

/** Returns metadata details for a given payment method ID. */
export function getPaymentMethodDetails(id) {
  if (!id || typeof id !== 'string') return null;
  return METHOD_BY_ID.get(id.toLowerCase().trim()) || null;
}

/**
 * Normalizes any spoken phrase, typed input, Urdu text, or alias into a canonical payment ID.
 * Returns canonical ID or null if unresolvable.
 */
export function normalizePaymentMethod(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '');

  // Exact alias match
  if (ALIAS_MAP.has(clean)) {
    return ALIAS_MAP.get(clean);
  }

  // Token matching for multi-word input (e.g. "sadapay pe", "hbl online")
  const tokens = clean.split(/\s+/);
  for (const token of tokens) {
    if (ALIAS_MAP.has(token)) {
      return ALIAS_MAP.get(token);
    }
  }

  return null;
}
