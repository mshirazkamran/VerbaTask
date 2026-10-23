import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Merchant from '../models/Merchant.js';
import { evaluateThresholdWorkflows } from '../workflows/workflow.service.js';
import { createApproval, HIGH_VALUE_THRESHOLD } from '../approvals/approval.service.js';
import { findSimilarInventoryItems } from './item-matching.js';
import { resolveItemName } from '../services/qwen.service.js';
import { normalizePaymentMethod } from '../constants/paymentMethods.js';
import { emitDashboardUpdate } from '../socket.js';

import { recordMerchantAlias } from '../services/catalogCache.service.js';

// Item names arrive from free-form WhatsApp text (Qwen NLP) — escape regex
// metacharacters so "Milk (1L)" matches literally instead of failing silently.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds an EXISTING khata for a customer name as the merchant spoke it. Never creates one:
 * a khata is opened explicitly (with a phone number) and sales may only be added to it.
 * Honorifics are tolerated ("soban bhai" finds "soban" and vice versa).
 */
export const findKhataCustomer = async (merchantId, rawName) => {
  const spoken = String(rawName || '').trim().toLowerCase();
  if (!spoken) return null;

  const normalizedBase = spoken
    .replace(/\b(bhai|sahab|sahib|sb|khan|ji|janab)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Exact match on the spoken name
  let customer = await Customer.findOne({ merchantId, name: spoken });

  // 2. Honorific-stripped name ("soban bhai" -> "soban")
  if (!customer && normalizedBase && normalizedBase !== spoken) {
    customer = await Customer.findOne({ merchantId, name: normalizedBase });
  }

  // 3. Stored name carries an honorific the merchant dropped ("soban" -> "soban bhai")
  if (!customer && normalizedBase) {
    customer = await Customer.findOne({
      merchantId,
      name: new RegExp(`^${escapeRegex(normalizedBase)}(\\s+(bhai|sahab|sahib|sb|khan|ji|janab))*$`, 'i'),
    });
  }

  return customer;
};

/**
 * Resolve a single order line item to an inventory document.
 * Supports lookup by inventoryItemId (dashboard) or by name (WhatsApp NLP),
 * with exact, learned-alias, fuzzy, and self-learning LLM resolution.
 */
const resolveInventoryItem = async (merchantId, lineItem) => {
  if (lineItem.inventoryItemId) {
    return InventoryItem.findOne({ _id: lineItem.inventoryItemId, merchantId });
  }

  const spokenName = (lineItem.name || '').trim();
  if (!spokenName) return null;
  const cleanSpoken = spokenName.toLowerCase();

  // 1. Exact name or learned alias match (O(1) indexed)
  const exact = await InventoryItem.findOne({
    merchantId,
    $or: [
      { name: new RegExp(`^${escapeRegex(spokenName)}$`, 'i') },
      { aliases: cleanSpoken },
    ],
  });
  if (exact) return exact;

  // 2. High-confidence fuzzy & bilingual dictionary match (handles "rice" <-> "چاول", "riece" -> "Rice", "lipton" -> "Lipton Yellow Label")
  const ranked = await findSimilarInventoryItems(merchantId, spokenName, { limit: 3, minScore: 0.50 });
  if (ranked.length > 0) {
    const top = ranked[0];
    const topNameLower = top.item.name.toLowerCase();

    // High confidence: score >= 0.80, or full substring containment
    if (top.score >= 0.80 || topNameLower.includes(cleanSpoken) || cleanSpoken.includes(topNameLower)) {
      return top.item;
    }

    // Only one candidate and score >= 0.65
    if (ranked.length === 1 && top.score >= 0.65) {
      return top.item;
    }

    // Top candidate clearly beats the second candidate
    if (ranked.length >= 2 && top.score >= 0.65 && top.score - ranked[1].score >= 0.08) {
      return top.item;
    }
  }

  // 3. Fallback to LLM semantic matching with automated self-learning alias persistence
  try {
    const allItems = await InventoryItem.find({ merchantId }).limit(100);
    if (allItems.length > 0) {
      const resolvedName = await resolveItemName(spokenName, allItems.map((i) => i.name));
      if (resolvedName) {
        const matched = allItems.find((i) => i.name.toLowerCase() === resolvedName.toLowerCase());
        if (matched) {
          recordMerchantAlias(merchantId, matched.name, spokenName).catch(console.error);
          return matched;
        }
      }
    }
  } catch (err) {
    console.warn('resolveInventoryItem LLM fallback error:', err.message);
  }

  // 4. Accept best available candidate if score >= 0.50 (prevents false negatives during presentations)
  if (ranked.length > 0 && ranked[0].score >= 0.50) {
    return ranked[0].item;
  }

  return null;
};

/**
 * The single source of truth for order creation and stock deduction.
 * Accepts either the WhatsApp command shape ({ item, amount }) or the
 * dashboard shape ({ items, total }).
 * @param {Object} command
 * @param {String|ObjectId} command.merchantId
 * @param {String} command.paymentMethod
 * @param {String} command.source
 * @param {Object} [command.item] - WhatsApp path: { name, quantity }
 * @param {Number} [command.amount] - WhatsApp path: total amount
 * @param {Array} [command.items] - Dashboard path: [{ inventoryItemId, name, quantity, price }]
 * @param {Number} [command.total] - Dashboard path: total amount
 */
export const createOrder = async (command) => {
  const { paymentMethod, source, merchantId } = command;

  // Normalize incoming line items to a single array shape
  const requestedItems = command.items
    ? command.items
    : command.item
      ? [{ ...command.item }]
      : [];

  if (!requestedItems.length) {
    throw new Error('INVALID_ORDER: No items provided.');
  }

  const effectivePaymentMethod = normalizePaymentMethod(paymentMethod) || (paymentMethod ? String(paymentMethod).toLowerCase().trim() : 'cash');

  // Udhaar sales are only added to a khata that already exists. Checked before any stock
  // is touched, so a missing khata can never leave stock deducted without an order.
  let khataCustomer = null;
  if (effectivePaymentMethod === 'udhaar') {
    const spokenName = (command.customerName || '').trim();
    if (!spokenName) {
      throw new Error('KHATA_NAME_REQUIRED: An udhaar sale needs the customer\'s name.');
    }
    khataCustomer = await findKhataCustomer(merchantId, spokenName);
    if (!khataCustomer) {
      throw new Error(`KHATA_NOT_FOUND: No khata found for '${spokenName}'. Create the khata first.`);
    }
  }

  const orderItems = [];
  const updatedInventoryDocs = [];

  // 1. Phase 1: Pre-resolve all line items and aggregate total demand per inventory item
  const resolvedLines = [];
  const demandByItem = new Map();

  for (const lineItem of requestedItems) {
    const inventoryItem = await resolveInventoryItem(merchantId, lineItem);

    if (!inventoryItem) {
      throw new Error(
        `ITEM_NOT_FOUND: Cannot find '${lineItem.name || lineItem.inventoryItemId}' in inventory.`
      );
    }

    let quantity = Number(lineItem.quantity);
    let itemPrice = inventoryItem.price ?? lineItem.price ?? 0;

    // Handle money-first purchases (e.g. "20 ki chini", "50 ka chawal")
    if (lineItem.targetAmount && (!quantity || quantity === 1)) {
      const targetAmt = Number(lineItem.targetAmount);
      if (itemPrice > 0) {
        quantity = Math.round((targetAmt / itemPrice) * 1000) / 1000;
      } else {
        quantity = 1;
        itemPrice = targetAmt;
      }
    } else if (!quantity || isNaN(quantity) || quantity <= 0) {
      quantity = 1;
    }

    const idStr = inventoryItem._id.toString();
    if (!demandByItem.has(idStr)) {
      demandByItem.set(idStr, { doc: inventoryItem, totalQuantity: 0 });
    }
    demandByItem.get(idStr).totalQuantity += quantity;

    resolvedLines.push({
      inventoryItem,
      quantity,
      price: itemPrice,
    });
  }

  // Phase 1b: Pre-validate stock sufficiency for every item BEFORE any DB mutation
  for (const [, { doc, totalQuantity }] of demandByItem) {
    if (doc.quantity < totalQuantity) {
      throw new Error(
        `INSUFFICIENT_STOCK: ${doc.name} Tried to deduct ${totalQuantity}, but only ${doc.quantity} left.`
      );
    }
  }

  for (const line of resolvedLines) {
    orderItems.push({
      inventoryItemId: line.inventoryItem._id,
      name: line.inventoryItem.name,
      quantity: line.quantity,
      price: line.price,
    });
  }

  // 2. Compute order total
  const computedTotal = orderItems.reduce(
    (sum, i) => sum + i.quantity * i.price,
    0
  );
  const total = command.total ?? command.amount ?? Math.round(computedTotal);

  // 3. Determine order status — approval is OFF by default; only trigger if merchant explicitly opted in
  let status = 'completed';
  try {
    const merchantDoc = await Merchant.findById(merchantId).lean();
    if (merchantDoc?.requireApprovalForHighValue === true) {
      const threshold = merchantDoc?.highValueThreshold || HIGH_VALUE_THRESHOLD;
      if (total >= threshold) {
        status = 'pending_approval';
      }
    }
  } catch (err) {
    console.warn('Failed to check merchant approval setting:', err.message);
  }

  // An order waiting for approval is NOT a sale yet: stock and the khata are only touched once
  // it is approved (see applyApprovedOrder). Stock was validated above so the merchant hears now.
  const isPending = status === 'pending_approval';

  if (!isPending) {
    // 4. Execute stock deductions (atomic rollback on unexpected DB failure)
    const originalQuantities = new Map();
    try {
      for (const [, { doc, totalQuantity }] of demandByItem) {
        originalQuantities.set(doc._id.toString(), doc.quantity);
        doc.quantity = Math.max(0, Math.round((doc.quantity - totalQuantity) * 1000) / 1000);
        await doc.save();
        updatedInventoryDocs.push(doc);
      }
    } catch (saveErr) {
      for (const doc of updatedInventoryDocs) {
        const origQty = originalQuantities.get(doc._id.toString());
        if (origQty != null) {
          doc.quantity = origQty;
          await doc.save().catch(() => {});
        }
      }
      throw saveErr;
    }

    // Evaluate threshold workflows after stock deduction (non-blocking)
    try {
      for (const item of updatedInventoryDocs) {
        await evaluateThresholdWorkflows(merchantId, item);
      }
    } catch (err) {
      console.error('Threshold workflow evaluation failed:', err.message);
    }
  }

  let customerId = null;
  let finalCustomerName = null;

  if (khataCustomer) {
    customerId = khataCustomer._id;
    finalCustomerName = khataCustomer.name; // Keep canonical customer name
  }

  if (khataCustomer && !isPending) {
    khataCustomer.balance = (Number(khataCustomer.balance) || 0) + total;
    await khataCustomer.save();

    emitDashboardUpdate(merchantId, {
      type: 'customer',
      action: 'update',
      customerId: khataCustomer._id,
      customerName: khataCustomer.name,
      balance: khataCustomer.balance,
    });
  }

  const orderNumber = `VT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const staffName = command.staffName || null;
  const staffPhone = command.staffPhone || null;
  const incomingMessageId = command.incomingMessageId || null;

  // 5. Construct and save the order
  const order = await Order.create({
    merchantId,
    orderNumber,
    items: orderItems,
    total,
    paymentMethod: effectivePaymentMethod,
    customerId,
    customerName: finalCustomerName,
    source,
    status,
    staffName,
    staffPhone,
    incomingMessageId,
    stockApplied: !isPending,
  });

  // 6. If pending approval, create the approval record and notify the merchant
  if (status === 'pending_approval') {
    try {
      const items = orderItems.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      const who = [staffName ? `by ${staffName}` : null, finalCustomerName ? `khata: ${finalCustomerName}` : null].filter(Boolean).join(', ');
      const summary = who ? `${items} (${who})` : items;
      await createApproval({ merchantId, orderId: order._id, summary, amount: total });
    } catch (err) {
      console.error('Failed to create approval:', err.message);
    }
  }

  // 7. Emit WebSocket event to refresh dashboard
  emitDashboardUpdate(merchantId, { type: 'order', orderId: order._id, total, status, staffName, staffPhone });

  return order;
};
