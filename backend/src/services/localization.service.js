/**
 * Localization service — provides natural spoken phrasing and formatted
 * text messages in both Urdu and English for WhatsApp conversations.
 *
 * Spoken phrases are written in natural conversational Urdu script or English,
 * optimized for pronunciation by neural TTS models (e.g. ur-PK-UzmaNeural).
 */

import { getPaymentMethodDetails, normalizePaymentMethod } from '../constants/paymentMethods.js';

const PAYMENT_METHODS_UR = {
  cash: 'نقد',
  easypaisa: 'ایزی پیسہ',
  jazzcash: 'جاز کیش',
  sadapay: 'سادا پے',
  nayapay: 'نیا پے',
  raast: 'راست',
  bank: 'بینک',
  meezan: 'میزان بینک',
  hbl: 'ایچ بی ایل',
  ubl: 'یو بی ایل',
  alfalah: 'بینک الفلاح',
  mcb: 'ایم سی بی',
  faysal: 'فیصل بینک',
  allied: 'الائیڈ بینک',
  askari: 'عسکری بینک',
};

export function formatPaymentMethod(pm, language = 'ur') {
  if (!pm) return '';
  const canonical = normalizePaymentMethod(pm) || pm.toLowerCase();
  const details = getPaymentMethodDetails(canonical);

  if (language === 'ur') {
    return details?.nameUrdu || PAYMENT_METHODS_UR[canonical] || pm;
  }
  return details?.name || pm;
}

export const spokenPhrases = {
  orderLogged(language = 'ur', { quantity, itemName, paymentMethod, orderNo }) {
    const isUrdu = language === 'ur';
    const payFormatted = formatPaymentMethod(paymentMethod, language);

    if (isUrdu) {
      const orderPart = orderNo ? `۔ آرڈر نمبر ${orderNo}۔` : '۔';
      return {
        spoken: `آپ کی سیل درج کر لی گئی ہے: ${quantity} ${itemName}، ${payFormatted} پر${orderPart}`,
        text: `✅ سیل درج ہو گئی: ${quantity} x ${itemName} (${paymentMethod})${orderNo ? ` — آرڈر #${orderNo}` : ''}.`,
      };
    }

    const orderPart = orderNo ? ` — Order #${orderNo}` : '';
    return {
      spoken: `Your sale has been logged: ${quantity} ${itemName}, paid with ${paymentMethod}${orderNo ? `. Order number ${orderNo}.` : '.'}`,
      text: `✅ Logged: ${quantity} x ${itemName} (${paymentMethod})${orderPart}.`,
    };
  },

  insufficientStock(language = 'ur', { detail, itemName } = {}) {
    if (language === 'ur') {
      return {
        spoken: `معذرت، اس فروخت کے لیے اسٹاک میں مطلوبہ تعداد موجود نہیں ہے۔`,
        text: `اس فروخت کے لیے اسٹاک کافی نہیں ہے${detail ? ` — ${detail}` : ''}۔`,
      };
    }
    return {
      spoken: `Sorry, there is not enough stock for that sale.`,
      text: `Not enough stock for that sale${detail ? ` — ${detail}` : ''}.`,
    };
  },

  itemNotFound(language = 'ur', { saidName } = {}) {
    if (language === 'ur') {
      return {
        spoken: `معذرت، آپ کا کہا گیا آئٹم ${saidName ? `"${saidName}"` : ''} اسٹاک میں نہیں ملا۔`,
        text: `میں آپ کے اسٹاک میں "${saidName}" تلاش نہیں کر سکا — براہ کرم ڈیش بورڈ سے شامل کریں۔`,
      };
    }
    return {
      spoken: `Sorry, I couldn't find "${saidName}" in your stock.`,
      text: `I couldn't find "${saidName}" in your stock — add it from the dashboard first, or check the spelling.`,
    };
  },

  itemDisambiguation(language = 'ur', { saidName, candidates = [] }) {
    const candidateStr = candidates.join(' یا ');
    if (language === 'ur') {
      return {
        spoken: `آپ کا کہا گیا آئٹم اسٹاک میں نہیں ملا۔ کیا آپ کا مطلب ${candidateStr || 'دی گئی اشیاء'} میں سے ہے؟ نیچے دیے گئے بٹنوں سے منتخب کریں۔`,
        text: `میں آپ کے اسٹاک میں "${saidName}" تلاش نہیں کر سکا — کیا آپ کا مطلب تھا:`,
      };
    }
    return {
      spoken: `I couldn't find "${saidName}" in your stock. Did you mean ${candidates.join(' or ')}? Tap a button below.`,
      text: `I couldn't find "${saidName}" in your stock — did you mean:`,
    };
  },

  workflowCreated(language = 'ur', { rawInstruction } = {}) {
    if (language === 'ur') {
      return {
        spoken: `آپ کی آٹومیشن تیار ہو گئی ہے۔ میں اس کا خیال رکھوں گا۔`,
        text: `✅ آٹومیشن بن گئی: "${rawInstruction}". میں اس کا خیال رکھوں گا۔`,
      };
    }
    return {
      spoken: `Automation created. I'll take it from here.`,
      text: `✅ Automation created: "${rawInstruction}". I'll take it from here.`,
    };
  },

  unrecognizedIntent(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `معاف کیجیے گا، مجھے پوری طرح سمجھ نہیں آیا۔ برائے مہربانی چیز کا نام اور تعداد بتائیں، جیسے دو چاول کیش۔`,
        text: `معاف کیجیے گا، بات سمجھ نہیں آئی۔ براہ کرم چیز اور تعداد بتائیں (مثلاً: "دو چاول کیش")، یا "order" کہیں۔`,
      };
    }
    return {
      spoken: `I didn't quite catch that. Please tell me the item and quantity, like "2 rice bags, cash".`,
      text: `I didn't quite catch that — try saying "2 rice, cash" or 'order' to log a sale.`,
    };
  },

  voiceProcessingError(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `معذرت، آپ کا وائس نوٹ پروسیس نہیں ہو سکا۔ براہ کرم دوبارہ بول کر بھیجیں۔`,
        text: `وائس نوٹ سمجھنے میں دشواری ہوئی — دوبارہ بول کر یا لکھ کر بھیجیں۔`,
      };
    }
    return {
      spoken: `Sorry, I couldn't process that voice note. Please try speaking again or typing it.`,
      text: `Couldn't process that voice note — try typing it instead.`,
    };
  },

  genericError(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `معذرت، سسٹم میں خرابی پیش آگئی ہے۔ براہ کرم تھوڑی دیر بعد کوشش کریں۔`,
        text: `معذرت، کچھ غلط ہو گیا ہے۔ براہ کرم کچھ دیر بعد کوشش کریں۔`,
      };
    }
    return {
      spoken: `Sorry, something went wrong on my end. Please try again in a moment.`,
      text: `Sorry, something went wrong on my end. Please try again in a moment, or use the dashboard.`,
    };
  },

  onboardingAskDetails(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `اپنے کاروبار کا نام، مقام، اور آپ کیا بیچتے ہیں، ایک میسج یا وائس نوٹ میں بتا دیں۔`,
        text: `Business ka naam, location, aur aap kya bechte hain, ek message mein bata dein.`,
      };
    }
    return {
      spoken: `Tell me your business name, location, and what you sell — all in one message is fine.`,
      text: `Tell me your business name, location, and what you sell — all in one message is fine.`,
    };
  },

  onboardingAskInventory(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `بہترین! اب اپنے موجودہ اسٹاک کی تفصیل بتا دیں — جیسے چیز کا نام، مقدار، اور قیمت۔ یا بعد میں شامل کرنے کے لیے "skip" کہہ دیں۔`,
        text: `Got it. Now list your starting stock (item, quantity, price) — or reply "skip" to add it later from the dashboard.`,
      };
    }
    return {
      spoken: `Got it. Now list your starting stock with item, quantity, and price — or say skip to add it later.`,
      text: `Got it. Now list your starting stock (item, quantity, price) — or reply "skip" to add it later from the dashboard.`,
    };
  },

  onboardingComplete(language = 'ur', addedCount = 0) {
    if (language === 'ur') {
      const stockMsg = addedCount > 0 ? `میں نے آپ کے اسٹاک میں ${addedCount} آئٹمز شامل کر دیے ہیں۔` : '';
      return {
        spoken: `مبارک ہو، آپ کا اکاؤنٹ تیار ہے! ${stockMsg} جب بھی سیل درج کرنی ہو، بس وائس نوٹ بھیج دیں۔`,
        text: addedCount > 0
          ? `You're all set! I added ${addedCount} item${addedCount === 1 ? '' : 's'} to your stock. Message me anytime to log a sale or create an automation.`
          : "You're all set! Message me anytime to log a sale or create an automation.",
      };
    }
    return {
      spoken: `You're all set! ${addedCount > 0 ? `I added ${addedCount} items to your stock.` : ''} Message or speak to me anytime to log a sale.`,
      text: addedCount > 0
        ? `You're all set! I added ${addedCount} item${addedCount === 1 ? '' : 's'} to your stock. Message me anytime to log a sale or create an automation.`
        : "You're all set! Message me anytime to log a sale or create an automation.",
    };
  },

  approvalReply(language = 'ur', isApprove = true) {
    if (language === 'ur') {
      return {
        spoken: isApprove ? 'آرڈر منظور کر لیا گیا ہے اور مکمل ہو گیا ہے۔' : 'آرڈر مسترد کر دیا گیا ہے اور اسٹاک بحال کر دیا گیا ہے۔',
        text: isApprove ? '✅ Order approved and marked as completed.' : '❌ Order rejected. Stock has been restored.',
      };
    }
    return {
      spoken: isApprove ? 'Order approved and marked as completed.' : 'Order rejected. Stock has been restored.',
      text: isApprove ? '✅ Order approved and marked as completed.' : '❌ Order rejected. Stock has been restored.',
    };
  },
};
