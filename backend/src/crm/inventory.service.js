import InventoryItem from '../models/InventoryItem.js';
import { findSimilarInventoryItems, cleanAndStandardizeItemName, isSameItemName } from './item-matching.js';
import { emitDashboardUpdate } from '../socket.js';
import { spokenPhrases } from '../services/localization.service.js';
import { invalidateMerchantCatalog } from '../services/catalogCache.service.js';
import { evaluateThresholdWorkflows } from '../workflows/workflow.service.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds the inventory item a restock line refers to: exact name, the standardized name
 * ("chawal" -> "Rice"), a learned alias, then a fuzzy match that must name the SAME product
 * ("steam chawal" never lands on "Rice"). Returns null for a genuinely new item.
 */
async function findRestockTarget(merchantId, rawName) {
  const standardized = cleanAndStandardizeItemName(rawName);
  for (const name of new Set([rawName, standardized])) {
    const exact = await InventoryItem.findOne({ merchantId, name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (exact) return exact;
  }
  const ranked = await findSimilarInventoryItems(merchantId, rawName, { limit: 5, minScore: 0.65 });
  const same = ranked.find((r) => r.score === 1 || isSameItemName(rawName, r.item.name));
  return same ? same.item : null;
}

/** Restock line -> { rawName, name, quantity, price, unit } with numbers and units cleaned up. */
function normalizeRestockLine(line) {
  const rawName = line?.name?.trim() || 'Item';
  const quantity = Number(line?.quantity) > 0 ? Number(line.quantity) : 1;
  const price = line?.price != null && Number(line.price) > 0 ? Number(line.price) : null;
  const unit = typeof line?.unit === 'string' && line.unit.trim() ? line.unit.trim() : null;
  return { rawName, name: cleanAndStandardizeItemName(rawName), quantity, price, unit };
}

/**
 * Restocks existing inventory items and creates new ones. A new item needs a price and a unit:
 * when one is missing, nothing is guessed — the item goes into `pendingItems` and the merchant is
 * asked for it (one item at a time; the controller keeps the rest of the queue).
 * Emits real-time WebSocket events to synchronize the web dashboard.
 */
export async function restockItemViaCrm(merchant, command) {
  const language = command.language || merchant.language || 'ur';
  const isUrdu = language === 'ur';
  const lines = (Array.isArray(command.items) && command.items.length > 0 ? command.items : [command.item || {}])
    .map(normalizeRestockLine);

  const results = [];
  const pendingItems = [];

  for (const line of lines) {
    let item = await findRestockTarget(merchant._id, line.rawName);

    if (item) {
      item.quantity = Math.round(((item.quantity || 0) + line.quantity) * 1000) / 1000;
      if (line.price != null) item.price = line.price;
      if (line.unit) item.unit = line.unit;
      await item.save();
      emitDashboardUpdate(merchant._id, { type: 'inventory', action: 'update', itemId: item._id, itemName: item.name, quantity: item.quantity });
    } else if (line.price == null || !line.unit) {
      pendingItems.push({
        name: line.name,
        rawName: line.rawName,
        quantity: line.quantity,
        price: line.price,
        unit: line.unit,
        missing: { price: line.price == null, unit: !line.unit },
      });
      continue;
    } else {
      item = await InventoryItem.create({ merchantId: merchant._id, name: line.name, quantity: line.quantity, price: line.price, unit: line.unit });
      emitDashboardUpdate(merchant._id, { type: 'inventory', action: 'create', itemId: item._id, itemName: item.name, quantity: item.quantity, price: item.price, unit: item.unit });
    }

    // Restock re-arms any low-stock alert that already fired for this item.
    evaluateThresholdWorkflows(merchant._id, item).catch((err) =>
      console.error('Threshold workflow evaluation failed:', err.message)
    );
    results.push({ name: item.name, added: line.quantity, total: item.quantity, price: item.price, unit: item.unit });
  }

  if (results.length) invalidateMerchantCatalog(merchant._id);

  // One line, nothing pending: the classic single-item confirmation.
  if (results.length === 1 && !pendingItems.length) {
    const r = results[0];
    return spokenPhrases.stockUpdated(language, { itemName: r.name, addedQuantity: r.added, totalQuantity: r.total, price: r.price, unit: r.unit });
  }

  let text = '';
  let spoken = '';
  if (results.length) {
    text = isUrdu ? '📦 *مال اسٹاک میں شامل کر دیا گیا:*' : '📦 *Stock added successfully:*';
    spoken = isUrdu ? 'نیا مال اسٹاک میں شامل کر دیا گیا ہے۔' : 'New stock has been added to inventory.';
    for (const r of results) {
      const unitStr = r.unit ? ` ${r.unit}` : '';
      const priceStr = r.price ? ` (Rs. ${r.price})` : '';
      text += `\n• +${r.added}${unitStr} *${r.name}* (${isUrdu ? 'کل' : 'total'}: ${r.total})${priceStr}`;
    }
  }

  if (!pendingItems.length) return { spoken, text };

  const [first, ...queue] = pendingItems;
  const prompt = spokenPhrases.newItemDetailsRequired(language, {
    itemName: first.name,
    missingPrice: first.missing.price,
    missingUnit: first.missing.unit,
    unit: first.unit,
  });
  return {
    requiresDetails: true,
    item: first,
    missing: first.missing,
    queue,
    spoken: [spoken, prompt.spoken].filter(Boolean).join(' '),
    text: [text, prompt.text].filter(Boolean).join('\n\n'),
  };
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
