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
  orderLogged(language = 'ur', { items = [], paymentMethod, orderNo, customerName }) {
    const isUrdu = language === 'ur';
    const payFormatted = paymentMethod === 'udhaar' || paymentMethod === 'khata'
      ? (isUrdu ? 'ادھار / کھاتہ پر' : 'via Udhaar (Credit)')
      : (isUrdu ? `${formatPaymentMethod(paymentMethod, language)} پر` : `via ${formatPaymentMethod(paymentMethod, language)}`);
    
    // Format items list
    const itemsSpoken = items.map(i => `${i.quantity} ${i.name}`).join('، ');
    const itemsText = items.map(i => `${i.quantity} x ${i.name}`).join(', ');

    let customerSpokenUrdu = '';
    let customerTextUrdu = '';
    let customerSpokenEng = '';
    let customerTextEng = '';

    if (customerName && (paymentMethod === 'udhaar' || paymentMethod === 'khata')) {
      customerSpokenUrdu = `، ${customerName} کے کھاتے میں`;
      customerTextUrdu = ` (کھاتہ: ${customerName})`;
      customerSpokenEng = `, added to ${customerName}'s ledger`;
      customerTextEng = ` (Ledger: ${customerName})`;
    }

    if (isUrdu) {
      const orderPart = orderNo ? `۔ آرڈر نمبر ${orderNo}۔` : '۔';
      return {
        spoken: `جی بالکل محترم! آپ کی سیل درج کر لی گئی ہے: ${itemsSpoken}، ${payFormatted}${customerSpokenUrdu}${orderPart} بہت شکریہ!`,
        text: `✅ سیل درج ہو گئی: ${itemsText} (${formatPaymentMethod(paymentMethod, language)})${customerTextUrdu}${orderNo ? ` — آرڈر #${orderNo}` : ''}.`,
      };
    }

    const orderPart = orderNo ? ` — Order #${orderNo}` : '';
    return {
      spoken: `Certainly! Your sale has been logged: ${itemsSpoken}, ${payFormatted}${customerSpokenEng}${orderNo ? `. Order number ${orderNo}.` : '.'} Thank you!`,
      text: `✅ Logged: ${itemsText} (${formatPaymentMethod(paymentMethod, language)})${customerTextEng}${orderPart}.`,
    };
  },

  insufficientStock(language = 'ur', { detail, itemName } = {}) {
    if (language === 'ur') {
      return {
        spoken: `معذرت کے ساتھ جناب، اس فروخت کے لیے اسٹاک میں مطلوبہ تعداد موجود نہیں ہے۔ برائے مہربانی چیک فرما لیں۔`,
        text: `اس فروخت کے لیے اسٹاک کافی نہیں ہے${detail ? ` — ${detail}` : ''}۔`,
      };
    }
    return {
      spoken: `Apologies, there is not enough stock available for that sale. Please check your inventory.`,
      text: `Not enough stock for that sale${detail ? ` — ${detail}` : ''}.`,
    };
  },

  itemNotFound(language = 'ur', { saidName } = {}) {
    if (language === 'ur') {
      return {
        spoken: `معذرت خواہ ہوں جناب، آپ کا کہا گیا سامان ${saidName ? `"${saidName}"` : ''} اسٹاک میں نہیں ملا۔ برائے مہربانی ڈیش بورڈ سے شامل فرما لیں۔`,
        text: `میں آپ کے اسٹاک میں "${saidName}" تلاش نہیں کر سکا — براہ کرم ڈیش بورڈ سے شامل کریں۔`,
      };
    }
    return {
      spoken: `Apologies, I couldn't find "${saidName}" in your stock list. Please add it from the dashboard.`,
      text: `I couldn't find "${saidName}" in your stock — add it from the dashboard first, or check the spelling.`,
    };
  },

  itemDisambiguation(language = 'ur', { saidName, candidates = [] }) {
    const candidateStr = candidates.join(' یا ');
    if (language === 'ur') {
      return {
        spoken: `معاف کیجیے گا، آپ کا کہا گیا آئٹم اسٹاک میں واضح نہیں ملا۔ کیا آپ کا مطلب ${candidateStr || 'دی گئی اشیاء'} میں سے ہے؟ برائے مہربانی بٹن سے منتخب فرما لیں۔`,
        text: `میں آپ کے اسٹاک میں "${saidName}" تلاش نہیں کر سکا — کیا آپ کا مطلب تھا:`,
      };
    }
    return {
      spoken: `Pardon me, I couldn't find "${saidName}" in stock. Did you mean ${candidates.join(' or ')}? Please tap a button below.`,
      text: `I couldn't find "${saidName}" in your stock — did you mean:`,
    };
  },

  workflowCreated(language = 'ur', { description } = {}) {
    if (language === 'ur') {
      return {
        spoken: `جی محترم، آپ کی آٹومیشن کامیابی سے محفوظ کر لی گئی ہے۔ بہت شکریہ!`,
        text: `✅ آٹومیشن محفوظ ہو گئی:\n⚡ ${description}\n\nتمام آٹومیشن دیکھنے کے لیے *"workflows"* لکھیں۔`,
      };
    }
    return {
      spoken: `Certainly! Your automation rule has been saved successfully. Thank you!`,
      text: `✅ Automation saved:\n⚡ ${description}\n\nType *"workflows"* to see all your automations.`,
    };
  },

  unrecognizedIntent(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `معاف کیجیے گا جناب، میں آپ کی بات پوری طرح سمجھ نہیں سکی۔ برائے مہربانی سامان کا نام اور تعداد دوبارہ بتا دیں، جیسے دو چاول کیش۔ شکریہ!`,
        text: `معاف کیجیے گا، بات سمجھ نہیں آئی۔ براہ کرم چیز اور تعداد بتائیں (مثلاً: "دو چاول کیش")، یا "order" کہیں۔`,
      };
    }
    return {
      spoken: `Pardon me, I didn't quite catch that. Please tell me the item name and quantity, like "2 rice, cash". Thank you!`,
      text: `I didn't quite catch that — try saying "2 rice, cash" or 'order' to log a sale.`,
    };
  },

  voiceProcessingError(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `معذرت خواہ ہوں جناب، آواز صاف نہ ہونے کی وجہ سے وائس نوٹ پروسیس نہیں ہو سکا۔ برائے مہربانی دوبارہ بول کر یا لکھ کر بتا دیں۔ شکریہ!`,
        text: `وائس نوٹ سمجھنے میں دشواری ہوئی — دوبارہ بول کر یا لکھ کر بھیجیں۔`,
      };
    }
    return {
      spoken: `Apologies, I couldn't process that voice note clearly. Please try speaking again or typing it. Thank you!`,
      text: `Couldn't process that voice note — try typing it instead.`,
    };
  },

  genericError(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `معذرت خواہ ہوں جناب، سسٹم میں عارضی خرابی پیش آگئی ہے۔ برائے مہربانی چند لمحوں بعد دوبارہ کوشش فرمائیں۔`,
        text: `معذرت، کچھ غلط ہو گیا ہے۔ براہ کرم کچھ دیر بعد کوشش کریں۔`,
      };
    }
    return {
      spoken: `Apologies, something went wrong on our end. Please try again in a moment. Thank you!`,
      text: `Sorry, something went wrong on my end. Please try again in a moment, or use the dashboard.`,
    };
  },

  onboardingAskDetails(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `محترم، بول دکان میں خوش آمدید! اپنے کاروبار کا نام، مقام، اور آپ کیا بیچتے ہیں، ایک میسج یا وائس نوٹ میں بتا دیں۔`,
        text: `Business ka naam, location, aur aap kya bechte hain, ek message mein bata dein.`,
      };
    }
    return {
      spoken: `Welcome to BolDukan! Please tell me your business name, location, and what you sell — all in one message is fine.`,
      text: `Tell me your business name, location, and what you sell — all in one message is fine.`,
    };
  },

  onboardingAskInventory(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `بہت خوب جناب! اب اپنے موجودہ اسٹاک کی تفصیل بتا دیں — جیسے چیز کا نام، مقدار، اور قیمت۔ یا بعد میں شامل کرنے کے لیے "skip" کہہ دیں۔`,
        text: `Got it. Now list your starting stock (item, quantity, price) — or reply "skip" to add it later from the dashboard.`,
      };
    }
    return {
      spoken: `Wonderful! Now please list your starting stock with item, quantity, and price — or say skip to add it later.`,
      text: `Got it. Now list your starting stock (item, quantity, price) — or reply "skip" to add it later from the dashboard.`,
    };
  },

  onboardingComplete(language = 'ur', addedCount = 0) {
    if (language === 'ur') {
      const stockMsg = addedCount > 0 ? `میں نے آپ کے اسٹاک میں ${addedCount} اشیاء شامل کر دی ہیں۔` : '';
      return {
        spoken: `بہت مبارک ہو جناب، آپ کا اکاؤنٹ تیار ہے! ${stockMsg} جب بھی سیل درج کرنی ہو، بس وائس نوٹ بھیج دیں۔ بہت شکریہ!`,
        text: addedCount > 0
          ? `You're all set! I added ${addedCount} item${addedCount === 1 ? '' : 's'} to your stock. Message me anytime to log a sale or create an automation.`
          : "You're all set! Message me anytime to log a sale or create an automation.",
      };
    }
    return {
      spoken: `Congratulations! You're all set. ${addedCount > 0 ? `I added ${addedCount} items to your stock.` : ''} Message or speak to me anytime to log a sale. Thank you!`,
      text: addedCount > 0
        ? `You're all set! I added ${addedCount} item${addedCount === 1 ? '' : 's'} to your stock. Message me anytime to log a sale or create an automation.`
        : "You're all set! Message me anytime to log a sale or create an automation.",
    };
  },

  approvalReply(language = 'ur', isApprove = true) {
    if (language === 'ur') {
      return {
        spoken: isApprove ? 'جی محترم، آرڈر منظور کر لیا گیا ہے اور مکمل ہو گیا ہے۔ بہت شکریہ!' : 'جی محترم، آرڈر مسترد کر دیا گیا ہے اور اسٹاک بحال کر دیا گیا ہے۔',
        text: isApprove ? '✅ Order approved and marked as completed.' : '❌ Order rejected. Stock has been restored.',
      };
    }
    return {
      spoken: isApprove ? 'Certainly! Order approved and marked as completed. Thank you!' : 'Order has been rejected and stock restored.',
      text: isApprove ? '✅ Order approved and marked as completed.' : '❌ Order rejected. Stock has been restored.',
    };
  },

  stockUpdated(language = 'ur', { itemName, addedQuantity, totalQuantity, price, unit } = {}) {
    const unitText = unit ? ` ${unit}` : '';
    if (language === 'ur') {
      const priceText = price != null ? ` (قیمت: Rs. ${price})` : '\n💡 اگر قیمت مقرر کرنی ہو تو لکھیں: "set price [چیز] [رقم]"';
      return {
        spoken: `جی محترم، نیا مال شامل ہو گیا ہے۔ ${itemName} کے ${addedQuantity}${unitText} شامل کر دیے گئے ہیں۔ اب کل اسٹاک ${totalQuantity} ہے۔${price != null ? `، قیمت ${price} روپے` : ''} شکریہ!`,
        text: `✅ اسٹاک اپڈیٹ: +${addedQuantity}${unitText} ${itemName} شامل کر دیے گئے۔ اب کل اسٹاک: ${totalQuantity}${priceText}۔`,
      };
    }
    const priceText = price != null ? ` (Price: Rs. ${price})` : '\n💡 To set selling price, type: "set price [item] [price]"';
    return {
      spoken: `Certainly! Stock updated. Added ${addedQuantity}${unitText} ${itemName}. Total stock is now ${totalQuantity}.${price != null ? ` at ${price} rupees` : ''} Thank you!`,
      text: `✅ Stock updated: +${addedQuantity}${unitText} ${itemName}. Total in stock: ${totalQuantity}${priceText}.`,
    };
  },

  stockChecked(language = 'ur', { itemName, quantity, price, unit } = {}) {
    const unitText = unit ? ` ${unit}` : '';
    if (language === 'ur') {
      return {
        spoken: `جی محترم، ${itemName} کا موجودہ اسٹاک ${quantity}${unitText} ہے${price ? `، قیمت ${price} روپے` : ''}۔`,
        text: `📦 اسٹاک معلومات: *${itemName}*\n• دستیاب مقدار: ${quantity}${unitText}\n• قیمت فی یونٹ: ${price != null ? `Rs. ${price}` : 'مقرر نہیں'}`,
      };
    }
    return {
      spoken: `Certainly! Current stock for ${itemName} is ${quantity}${unitText}${price ? ` at ${price} rupees` : ''}.`,
      text: `📦 Stock Check: *${itemName}*\n• In Stock: ${quantity}${unitText}\n• Price: ${price != null ? `Rs. ${price}` : 'Not set'}`,
    };
  },

  khataSettled(language = 'ur', { customerName, amount, previousBalance, remainingBalance }) {
    const isUrdu = language === 'ur';
    if (isUrdu) {
      return {
        spoken: `جی محترم، ${customerName} صاحب کے کھاتے میں ${amount} روپے جمع کر لیے گئے ہیں۔ اب ان کا بقایا ${remainingBalance} روپے ہے۔ جزاک اللہ!`,
        text: `✅ *کھاتہ وصولی درج ہو گئی!*\nگاہک: *${customerName.toUpperCase()}*\nوصول شدہ رقم: *Rs. ${Number(amount).toLocaleString()}*\nپہلا بقایا: Rs. ${Number(previousBalance).toLocaleString()}\nنیا بقایا: *Rs. ${Number(remainingBalance).toLocaleString()}*`,
      };
    }
    return {
      spoken: `Certainly! Recorded payment of Rs. ${amount} for ${customerName}. Remaining balance is Rs. ${remainingBalance}. Thank you!`,
      text: `✅ *Ledger payment recorded!*\nCustomer: *${customerName.toUpperCase()}*\nAmount Received: *Rs. ${Number(amount).toLocaleString()}*\nPrevious Balance: Rs. ${Number(previousBalance).toLocaleString()}\nRemaining Balance: *Rs. ${Number(remainingBalance).toLocaleString()}*`,
    };
  },

  voiceSwitched(language = 'ur', gender = 'female') {
    const isUrdu = language === 'ur';
    const isFemale = gender === 'female';
    if (isUrdu) {
      return {
        spoken: isFemale
          ? `جی بالکل محترم! اب سے آپ کو میری خاتون کی آواز میں وائس میسجز موصول ہوں گے۔ آپ کا بہت شکریہ!`
          : `جی بالکل محترم! اب سے آپ کو میری مردانہ آواز میں وائس میسجز موصول ہوں گے۔ آپ کا بہت شکریہ!`,
        text: isFemale
          ? `👩 *آواز تبدیل ہو گئی:* خاتون کی آواز (Female Voice) فعال کر دی گئی ہے۔`
          : `👨 *آواز تبدیل ہو گئی:* مردانہ آواز (Male Voice) فعال کر دی گئی ہے۔`,
      };
    }
    return {
      spoken: isFemale
        ? `Certainly! Voice replies have been switched to the female voice. Thank you!`
        : `Certainly! Voice replies have been switched to the male voice. Thank you!`,
      text: isFemale
        ? `👩 *Voice Switched:* Female voice is now active.`
        : `👨 *Voice Switched:* Male voice is now active.`,
    };
  },

  helpCommands(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: `یہ وربا ٹاسک کی مکمل رہنمائی ہے۔ آپ بول کر یا لکھ کر سیل درج کر سکتے ہیں، نیا مال شامل کر سکتے ہیں، رپورٹس منگوا سکتے ہیں، اور دکان کی سیٹنگز بدل سکتے ہیں۔`,
        text: `📋 *وربا ٹاسک مکمل رہنمائی / Commands Guide*\n\nآپ یہ تمام کام واٹس ایپ پر بول کر یا لکھ کر سکتے ہیں:\n\n🛒 *1. سیل درج کرنا (Sales)*\n• وائس نوٹ: بولیں "دو کلو چینی کیش" یا "5 چاول ایزی پیسہ"\n• لکھیں: "2 rice cash" یا "10 milk jazzcash"\n• گائیڈڈ بٹن: لکھیں *"order"*\n\n📦 *2. انوینٹری اور نیا مال (Stock & Inventory)*\n• نیا مال قیمت کے ساتھ: "add 50 rice price 300" یا "maal aya 20 chini 150"\n• قیمت مقرر کریں: *"set price rice 300"* یا *"chini ki price 160"*\n• اسٹاک چیک کریں: "stock rice" یا "chini kitni hai"\n• کل سامان کی لسٹ: لکھیں *"stock list"* یا *"inventory"*\n\n📄 *3. پی ڈی ایف رپورٹس (PDF Reports)*\n• لکھیں *"report"* (سیلز، انوینٹری، کم اسٹاک یا ایکسپائری رپورٹس)\n\n⚙️ *4. دکان اور سیٹنگز (Store & Settings)*\n• دکان کی معلومات: لکھیں *"profile"* یا *"settings"*\n• دکان کا نام بدلیں: *"set name [نیا نام]"*\n• شہر / مقام بدلیں: *"set location [شہر]"*\n• زبان تبدیل کریں: *"urdu"* یا *"english"*\n• وائس جوابات: *"voice on"* یا *"voice off"*\n\n💳 *5. بینک اور ادائیگی (Payment & Banks)*\n• طریقے دیکھیں: لکھیں *"banks"* یا *"payment methods"*\n• آن / آف کریں: *"enable easypaisa"* یا *"disable jazzcash"*\n\n⚡ *6. آٹومیشن الرٹس (Workflows)*\n• بول کر الرٹ بنائیں: "jab doodh 5 se kam ho alert karo"\n• لسٹ دیکھیں: لکھیں *"workflows"*`,
      };
    }
    return {
      spoken: `Here is your BolDukan commands guide. You can log sales, add stock, check inventory, download PDF reports, and manage store settings by speaking or typing.`,
      text: `📋 *BolDukan Commands Guide*\n\nYou can manage your entire store by speaking or typing:\n\n🛒 *1. Log Sales*\n• Voice Note: Send audio like "2 kg sugar cash" or "5 rice easypaisa"\n• Text: Type "2 rice cash" or "10 milk jazzcash"\n• Guided Flow: Type *"order"* to pick from stock list\n\n📦 *2. Stock & Inventory*\n• Add Stock with Price: "add 50 rice price 300" or "maal aya 20 chini 150"\n• Set / Update Price: *"set price rice 300"* or *"price sugar 160"*\n• Check Stock: "stock rice" or "how much sugar left"\n• View All Stock: Type *"stock list"* or *"inventory"*\n\n📄 *3. Download PDF Reports*\n• Type *"report"* for sales, inventory, low stock, or expiring reports\n\n⚙️ *4. Store & Profile Settings*\n• View Store Info: Type *"profile"* or *"settings"*\n• Change Shop Name: *"set name [New Name]"*\n• Change Location: *"set location [City]"*\n• Switch Language: Type *"urdu"* or *"english"*\n• Voice Replies: Type *"voice on"* or *"voice off"*\n\n💳 *5. Payment & Banks*\n• View Accepted Methods: Type *"banks"* or *"payment methods"*\n• Enable / Disable: *"enable easypaisa"* or *"disable jazzcash"*\n\n⚡ *6. Automations & Alerts*\n• Create Alert: "alert me when cooking oil is below 5"\n• View Active Rules: Type *"workflows"*`,
    };
  },

  orderReturned(language = 'ur', { orderNo, returnedItems = [], refundAmount = 0, customerName, newBalance } = {}) {
    const itemsList = returnedItems.map((i) => `• ${i.name} x ${i.quantity}`).join('\n');
    const khataNote = customerName && newBalance != null
      ? (language === 'ur'
          ? `\n👤 گاہک *${customerName}* کے کھاتے سے رقم کاٹ لی گئی۔ نیا بقایا: *Rs. ${newBalance.toLocaleString()}*`
          : `\n👤 Customer *${customerName}* ledger updated. New balance: *Rs. ${newBalance.toLocaleString()}*`)
      : '';

    if (language === 'ur') {
      return {
        spoken: `جی محترم، آرڈر ${orderNo || ''} کی واپسی درج ہو گئی ہے۔ سامان اسٹاک میں شامل کر دیا گیا ہے۔ کل رقم ${refundAmount} روپے ہے۔ شکریہ!`,
        text: `↩️ *آرڈر واپسی درج ہو گئی!*\nآرڈر نمبر: *#${orderNo || 'VT-ORDER'}*\n\n📦 *واپس شدہ سامان:*\n${itemsList}\n\n💵 کل رقم: *Rs. ${refundAmount.toLocaleString()}*${khataNote}`,
      };
    }
    return {
      spoken: `Certainly! Return recorded for order ${orderNo || ''}. Items have been restocked. Total amount is Rs. ${refundAmount}. Thank you!`,
      text: `↩️ *Order Return Processed!*\nOrder #: *#${orderNo || 'VT-ORDER'}*\n\n📦 *Returned Items:*\n${itemsList}\n\n💵 Refund / Adjusted: *Rs. ${refundAmount.toLocaleString()}*${khataNote}`,
    };
  },

  orderExchanged(language = 'ur', { orderNo, returnItem, newItem, priceDifference = 0, customerName, newBalance } = {}) {
    const diffAbs = Math.abs(priceDifference);
    const diffNoteUr = priceDifference > 0
      ? `(گاہک سے *Rs. ${diffAbs.toLocaleString()}* مزید وصول کریں)`
      : priceDifference < 0
      ? `(گاہک کو *Rs. ${diffAbs.toLocaleString()}* واپس کریں)`
      : `(برابر تبادلہ - کوئی بقایا نہیں)`;

    const diffNoteEn = priceDifference > 0
      ? `(Collect *Rs. ${diffAbs.toLocaleString()}* extra from customer)`
      : priceDifference < 0
      ? `(Refund *Rs. ${diffAbs.toLocaleString()}* to customer)`
      : `(Even exchange - zero difference)`;

    const khataNote = customerName && newBalance != null
      ? (language === 'ur'
          ? `\n👤 گاہک *${customerName}* کھاتہ اپڈیٹ: نیا بقایا *Rs. ${newBalance.toLocaleString()}*`
          : `\n👤 Customer *${customerName}* ledger updated: New balance *Rs. ${newBalance.toLocaleString()}*`)
      : '';

    if (language === 'ur') {
      return {
        spoken: `جی محترم، آرڈر ${orderNo || ''} کا تبادلہ درج ہو گیا ہے۔ ${returnItem?.name || ''} واپس ہو گیا اور ${newItem?.name || ''} دے دیا گیا ہے۔ بہت شکریہ!`,
        text: `🔄 *سامان کا تبادلہ (Exchange) مکمل!*\nآرڈر نمبر: *#${orderNo || 'VT-ORDER'}*\n\n↩️ واپس لیا: *${returnItem?.quantity}x ${returnItem?.name}*\n👉 نیا دیا: *${newItem?.quantity}x ${newItem?.name}*\n\n💰 فرق رقم: *Rs. ${diffAbs.toLocaleString()}* ${diffNoteUr}${khataNote}`,
      };
    }
    return {
      spoken: `Certainly! Exchange recorded for order ${orderNo || ''}. Exchanged ${returnItem?.name || ''} for ${newItem?.name || ''}. Thank you!`,
      text: `🔄 *Item Exchange Completed!*\nOrder #: *#${orderNo || 'VT-ORDER'}*\n\n↩️ Returned: *${returnItem?.quantity}x ${returnItem?.name}*\n👉 Given: *${newItem?.quantity}x ${newItem?.name}*\n\n💰 Price Difference: *Rs. ${diffAbs.toLocaleString()}* ${diffNoteEn}${khataNote}`,
    };
  },

  askReturnOrderNumber(language = 'ur') {
    if (language === 'ur') {
      return {
        spoken: 'جی محترم، آرڈر یا سامان کی واپسی کے لیے برائے مہربانی آرڈر نمبر بتا دیں یا جس میسج پر سیل ہوئی تھی اس پر ریپلائی فرما دیں۔ بہت شکریہ!',
        text: '❓ *آرڈر کی تفصیل بتائیں:*\nکون سا آرڈر یا سامان واپس آیا ہے؟\n\n👉 برائے مہربانی *آرڈر نمبر* لکھیں (مثلاً: *order VT-123456 wapis* یا *exchange*)\n👉 یا جس میسج پر سیل درج ہوئی تھی اس پر واٹس ایپ *ریپلائی (quote reply)* کریں۔',
      };
    }
    return {
      spoken: 'Certainly! To process a return or exchange, please state the order number or quote-reply directly to the sale message. Thank you!',
      text: '❓ *Order Details Needed:*\nWhich order or item is being returned?\n\n👉 Please specify the *Order Number* (e.g. *order VT-123456 return* or *exchange*)\n👉 Or quote-reply directly to the previous sale message in WhatsApp.',
    };
  },

  customerDisambiguationPrompt(language = 'ur', { candidateName, currentBalance } = {}) {
    const formattedBal = `Rs. ${(currentBalance || 0).toLocaleString()}`;
    if (language === 'ur') {
      return {
        spoken: `محترم، کیا یہ پرانے گاہک ${candidateName} کا کھاتہ ہے جن کا بقایا ${currentBalance} روپے ہے؟ برائے مہربانی تصدیق فرما دیں۔`,
        text: `👥 *گاہک کی تصدیق:*\nآپ کے کھاتے میں پہلے سے *${candidateName?.toUpperCase()}* موجود ہیں (موجودہ بقایا: *${formattedBal}*)۔\nکیا یہ وہی گاہک ہیں یا کوئی نیا گاہک ہے؟`,
      };
    }
    return {
      spoken: `Pardon me, is this existing customer ${candidateName} who currently has a balance of Rs. ${currentBalance}? Please confirm. Thank you!`,
      text: `👥 *Customer Confirmation:*\nExisting customer *${candidateName?.toUpperCase()}* found in ledger (Current balance: *${formattedBal}*).\nIs this the same customer or a new one?`,
    };
  },
};
