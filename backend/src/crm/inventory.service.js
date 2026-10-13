import InventoryItem from '../models/InventoryItem.js';
import { findSimilarInventoryItems, cleanAndStandardizeItemName } from './item-matching.js';
import { emitDashboardUpdate } from '../socket.js';
import { spokenPhrases } from '../services/localization.service.js';
import { invalidateMerchantCatalog } from '../services/catalogCache.service.js';
import { evaluateThresholdWorkflows } from '../workflows/workflow.service.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Restocks an existing inventory item or creates a new one if not found.
 * Emits real-time WebSocket events to synchronize the web dashboard.
 */
export async function restockItemViaCrm(merchant, command) {
  const language = command.language || merchant.language || 'ur';
  const incomingItems = Array.isArray(command.items) && command.items.length > 0
    ? command.items
    : [command.item || {}];

  // Single item path preserves exact phrasing for unit assertions
  if (incomingItems.length === 1) {
    const rawName = incomingItems[0]?.name?.trim() || 'Item';
    const quantity = Math.max(1, parseInt(incomingItems[0]?.quantity, 10) || 1);
    const price = incomingItems[0]?.price != null ? Number(incomingItems[0].price) : null;
    const unit = incomingItems[0]?.unit || null;

    let item = await InventoryItem.findOne({
      merchantId: merchant._id,
      name: new RegExp(`^${escapeRegex(rawName)}$`, 'i'),
    });

    if (!item) {
      const ranked = await findSimilarInventoryItems(merchant._id, rawName, { limit: 1, minScore: 0.65 });
      if (ranked.length > 0) {
        item = ranked[0].item;
      }
    }

    if (item) {
      item.quantity = (item.quantity || 0) + quantity;
      if (price != null) item.price = price;
      if (unit) item.unit = unit;
      await item.save();

      invalidateMerchantCatalog(merchant._id);
      emitDashboardUpdate(merchant._id, {
        type: 'inventory',
        action: 'update',
        itemId: item._id,
        itemName: item.name,
        quantity: item.quantity,
      });

      return spokenPhrases.stockUpdated(language, {
        itemName: item.name,
        addedQuantity: quantity,
        totalQuantity: item.quantity,
        price: item.price,
        unit: item.unit,
      });
    }

    const standardizedName = cleanAndStandardizeItemName(rawName);
    item = await InventoryItem.create({
      merchantId: merchant._id,
      name: standardizedName,
      quantity,
      ...(price != null && { price }),
      ...(unit && { unit }),
    });

    // Restock re-arms any low-stock alert that already fired for this item.
    evaluateThresholdWorkflows(merchant._id, item).catch((err) =>
      console.error('Threshold workflow evaluation failed:', err.message)
    );

    invalidateMerchantCatalog(merchant._id);
    emitDashboardUpdate(merchant._id, {
      type: 'inventory',
      action: 'create',
      itemId: item._id,
      itemName: item.name,
      quantity: item.quantity,
    });

    return spokenPhrases.stockUpdated(language, {
      itemName: item.name,
      addedQuantity: quantity,
      totalQuantity: item.quantity,
      price: item.price,
      unit: item.unit,
    });
  }

  // Multi-item restock processing
  const results = [];
  const missingPrices = [];

  for (const itm of incomingItems) {
    const rawName = itm?.name?.trim() || 'Item';
    const quantity = Math.max(1, parseInt(itm?.quantity, 10) || 1);
    const price = itm?.price != null ? Number(itm.price) : null;
    const unit = itm?.unit || null;

    let item = await InventoryItem.findOne({
      merchantId: merchant._id,
      name: new RegExp(`^${escapeRegex(rawName)}$`, 'i'),
    });

    if (!item) {
      const ranked = await findSimilarInventoryItems(merchant._id, rawName, { limit: 1, minScore: 0.65 });
      if (ranked.length > 0) item = ranked[0].item;
    }

    if (item) {
      item.quantity = (item.quantity || 0) + quantity;
      if (price != null) {
        item.price = price;
      } else if (!item.price) {
        missingPrices.push(item.name);
      }
      if (unit) item.unit = unit;
      await item.save();

      results.push({ name: item.name, added: quantity, total: item.quantity, price: item.price, unit: item.unit });
    } else {
      const standardizedName = cleanAndStandardizeItemName(rawName);
      item = await InventoryItem.create({
        merchantId: merchant._id,
        name: standardizedName,
        quantity,
        ...(price != null && { price }),
        ...(unit && { unit }),
      });

      if (price == null) {
        missingPrices.push(standardizedName);
      }
      results.push({ name: standardizedName, added: quantity, total: quantity, price, unit });
    }

    emitDashboardUpdate(merchant._id, {
      type: 'inventory',
      action: 'update',
      itemId: item._id,
      itemName: item.name,
      quantity: item.quantity,
    });
  }

  invalidateMerchantCatalog(merchant._id);

  const isUrdu = language === 'ur';
  let text = isUrdu ? '📦 *مال اسٹاک میں شامل کر دیا گیا:*' : '📦 *Stock added successfully:*';
  let spoken = isUrdu ? 'نیا مال اسٹاک میں شامل کر دیا گیا ہے۔' : 'New stock has been added to inventory.';

  for (const r of results) {
    const unitStr = r.unit ? ` ${r.unit}` : '';
    const priceStr = r.price ? ` (Rs. ${r.price})` : '';
    text += `\n• +${r.added}${unitStr} *${r.name}* (کل: ${r.total})${priceStr}`;
  }

  if (missingPrices.length > 0) {
    if (isUrdu) {
      text += `\n\n⚠️ *درج ذیل اشیاء کی قیمت درج نہیں ہے:*\n${missingPrices.map((m) => `• ${m}`).join('\n')}\nبرائے مہربانی ان کی قیمت بتائیں (مثلاً: "${missingPrices[0]} 150")۔`;
      spoken += ` لیکن ${missingPrices.join(' اور ')} کی قیمت درج نہیں ہے، برائے مہربانی قیمت بتائیں۔`;
    } else {
      text += `\n\n⚠️ *Missing prices for:*\n${missingPrices.map((m) => `• ${m}`).join('\n')}\nPlease reply with their prices (e.g. "${missingPrices[0]} 150").`;
      spoken += ` Please provide the price for ${missingPrices.join(' and ')}.`;
    }
  }

  return { spoken, text, missingPriceItems: missingPrices };
}

/**
 * Checks the available stock and price for a specific product.
 */
export async function checkStockViaCrm(merchant, command) {
  const language = command.language || merchant.language || 'ur';
  const rawName = command.item?.name?.trim() || '';

  if (!rawName) {
    return {
      spoken: language === 'ur' ? 'برائے مہربانی چیز کا نام بتائیں جس کا اسٹاک چیک کرنا ہے۔' : 'Please specify the item name you want to check.',
      text: language === 'ur' ? 'برائے مہربانی چیز کا نام بتائیں، جیسے: "stock rice" یا "چینی کا اسٹاک"۔' : 'Please specify the item name, for example: "stock rice" or "how much sugar left".',
    };
  }

  // 1. Direct case-insensitive match
  let item = await InventoryItem.findOne({
    merchantId: merchant._id,
    name: new RegExp(`^${escapeRegex(rawName)}$`, 'i'),
  });

  // 2. Fuzzy / cross-lingual match
  if (!item) {
    const ranked = await findSimilarInventoryItems(merchant._id, rawName, { limit: 1, minScore: 0.6 });
    if (ranked.length > 0) {
      item = ranked[0].item;
    }
  }

  if (!item) {
    return spokenPhrases.itemNotFound(language, { saidName: rawName });
  }

  return spokenPhrases.stockChecked(language, {
    itemName: item.name,
    quantity: item.quantity,
    price: item.price,
    unit: item.unit,
  });
}

/**
 * Formats a clean, readable stock list for WhatsApp.
 */
export async function getStockListSummary(merchant) {
  const language = merchant.language || 'ur';
  const items = await InventoryItem.find({ merchantId: merchant._id }).sort({ quantity: 1, name: 1 }).limit(25);

  if (!items || items.length === 0) {
    return {
      spoken: language === 'ur' ? 'آپ کی انوینٹری خالی ہے۔ نیا سامان شامل کرنے کے لیے بولیں یا لکھیں، جیسے ایڈ بیس چاول۔' : 'Your inventory is currently empty. You can add items by saying "add 20 rice".',
      text: language === 'ur'
        ? '📦 *آپ کی انوینٹری خالی ہے!*\n\nنیا مال شامل کرنے کے لیے لکھیں یا بولیں:\n• "maal aya 20 chini"\n• "add 50 rice price 300"'
        : '📦 *Your inventory is currently empty!*\n\nTo restock or add items, say or type:\n• "add 50 rice price 300"\n• "maal aya 20 chini"',
    };
  }

  const lines = items.map((i) => {
    const lowWarning = i.quantity <= 5 ? (language === 'ur' ? ' ⚠️ (کم)' : ' ⚠️ (Low)') : '';
    const priceStr = i.price != null ? ` — Rs. ${i.price}` : '';
    const unitStr = i.unit ? ` ${i.unit}` : '';
    return `• *${i.name}*: ${i.quantity}${unitStr}${priceStr}${lowWarning}`;
  });

  if (language === 'ur') {
    return {
      spoken: `آپ کے اسٹاک میں کل ${items.length} اشیاء ہیں۔ تفصیلی لسٹ آپ کو بھیج دی گئی ہے۔`,
      text: `📦 *موجودہ اسٹاک کی فہرست (${items.length} اشیاء):*\n\n${lines.join('\n')}\n\n💡 *مکمل پی ڈی ایف رپورٹ کے لیے "report" لکھیں۔*`,
    };
  }

  return {
    spoken: `You have ${items.length} items in your stock list. Here is the summary.`,
    text: `📦 *Current Stock List (${items.length} items):*\n\n${lines.join('\n')}\n\n💡 *Type "report" for a complete downloadable PDF.*`,
  };
}

/**
 * Updates or sets the selling price of an inventory item.
 */
export async function updateItemPriceViaCrm(merchant, rawItemName, newPrice) {
  const language = merchant.language || 'ur';
  const price = Math.max(0, Number(newPrice) || 0);

  // 1. Direct case-insensitive match first
  let item = await InventoryItem.findOne({
    merchantId: merchant._id,
    name: new RegExp(`^${escapeRegex(rawItemName.trim())}$`, 'i'),
  });

  // 2. Fuzzy / cross-lingual match
  if (!item) {
    const ranked = await findSimilarInventoryItems(merchant._id, rawItemName, { limit: 1, minScore: 0.6 });
    if (ranked.length > 0) {
      item = ranked[0].item;
    }
  }

  if (!item) {
    const standardizedName = cleanAndStandardizeItemName(rawItemName);
    item = await InventoryItem.create({
      merchantId: merchant._id,
      name: standardizedName,
      quantity: 0,
      price,
    });

    invalidateMerchantCatalog(merchant._id);
    emitDashboardUpdate(merchant._id, {
      type: 'inventory',
      action: 'create',
      itemId: item._id,
      itemName: item.name,
      price: item.price,
    });
  } else {
    item.price = price;
    await item.save();

    invalidateMerchantCatalog(merchant._id);
    emitDashboardUpdate(merchant._id, {
      type: 'inventory',
      action: 'update',
      itemId: item._id,
      itemName: item.name,
      price: item.price,
    });
  }

  if (language === 'ur') {
    return {
      spoken: `${item.name} کی قیمت ${price} روپے مقرر کر دی گئی ہے۔`,
      text: `✅ قیمت اپڈیٹ: *${item.name}* کی قیمت *Rs. ${price}* مقرر کر دی گئی ہے۔`,
    };
  }

  return {
    spoken: `Price for ${item.name} updated to ${price} rupees.`,
    text: `✅ Price updated: *${item.name}* price set to *Rs. ${price}*.`,
  };
}
