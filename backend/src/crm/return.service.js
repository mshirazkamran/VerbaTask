import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { emitDashboardUpdate } from '../socket.js';
import { evaluateThresholdWorkflows } from '../workflows/workflow.service.js';
import { invalidateMerchantCatalog } from '../services/catalogCache.service.js';
import { findSimilarInventoryItems } from './item-matching.js';
import { resolveItemName } from '../services/qwen.service.js';

const escapeRegex = (str) => (str ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

/**
 * Resolves an order by MongoDB _id, orderNumber (e.g. VT-123456 or 123456), or WhatsApp message context ID.
 */
export async function findOrderByReference(merchantId, { orderId, orderNumber, contextId, itemName, targetAmount }) {
  if (orderId) {
    const byId = await Order.findOne({ _id: orderId, merchantId });
    if (byId) return byId;
  }

  if (contextId) {
    const byContext = await Order.findOne({
      merchantId,
      $or: [
        { incomingMessageId: contextId },
        { confirmationMessageId: contextId },
      ],
    });
    if (byContext) return byContext;
  }

  if (orderNumber) {
    const cleanNo = String(orderNumber).trim().toUpperCase();
    const withoutHash = cleanNo.replace(/^#/, '');
    
    // Direct match
    let order = await Order.findOne({
      merchantId,
      orderNumber: new RegExp(`^${escapeRegex(withoutHash)}$`, 'i'),
    });
    if (order) return order;

    // Suffix / partial match if just digits e.g. "123456"
    order = await Order.findOne({
      merchantId,
      orderNumber: new RegExp(`${escapeRegex(withoutHash)}`, 'i'),
    });
    if (order) return order;
  }

  // Contextual fallback: match by item name or amount in recent orders (e.g. "20 ki chini wapis", "20 wapis", "chini wapis")
  if (itemName || targetAmount) {
    const query = {
      merchantId,
      status: { $in: ['completed', 'partially_returned'] },
    };

    const andConditions = [];

    if (itemName) {
      const cleanItem = String(itemName).trim();
      andConditions.push({
        'items.name': new RegExp(escapeRegex(cleanItem), 'i'),
      });
    }

    if (targetAmount && targetAmount > 0) {
      andConditions.push({
        $or: [
          { total: targetAmount },
          { 'items.price': targetAmount },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const recentOrder = await Order.findOne(query).sort({ createdAt: -1 });
    if (recentOrder) return recentOrder;
  }

  return null;
}

/**
 * Resolves an inventory item by id or name with exact, fuzzy, and alias support.
 */
async function resolveInventoryDoc(merchantId, lineItem) {
  if (lineItem.inventoryItemId) {
    return InventoryItem.findOne({ _id: lineItem.inventoryItemId, merchantId });
  }

  const spokenName = (lineItem.name || '').trim();
  if (!spokenName) return null;
  const cleanSpoken = spokenName.toLowerCase();

  const exact = await InventoryItem.findOne({
    merchantId,
    $or: [
      { name: new RegExp(`^${escapeRegex(spokenName)}$`, 'i') },
      { aliases: cleanSpoken },
    ],
  });
  if (exact) return exact;

  const ranked = await findSimilarInventoryItems(merchantId, spokenName, { limit: 2, minScore: 0.50 });
  if (ranked.length > 0 && ranked[0].score >= 0.50) {
    return ranked[0].item;
  }

  try {
    const allItems = await InventoryItem.find({ merchantId }).limit(100);
    if (allItems.length > 0) {
      const resolvedName = await resolveItemName(spokenName, allItems.map((i) => i.name));
      if (resolvedName) {
        return allItems.find((i) => i.name.toLowerCase() === resolvedName.toLowerCase()) || null;
      }
    }
  } catch (err) {
    console.warn('resolveInventoryDoc error:', err.message);
  }

  return null;
}

/** A pending or rejected order never left the shop: returning it would add stock that was never deducted. */
function assertOrderWasSold(order) {
  if (order.status === 'pending_approval' || order.status === 'rejected') {
    throw new Error(`ORDER_NOT_SOLD: Order ${order.orderNumber || ''} is ${order.status.replace('_', ' ')}, so it can't be returned or exchanged.`);
  }
}

/**
 * Processes an order return. Restocks items, calculates refund, and updates Khata balance if udhaar.
 */
export async function processOrderReturn(merchantId, { orderId, orderNumber, contextId, items, reason = 'Customer returned items' }) {
  const order = await findOrderByReference(merchantId, { orderId, orderNumber, contextId });
  if (!order) {
    throw new Error('ORDER_NOT_FOUND: Could not find the specified order to return.');
  }

  if (order.status === 'returned') {
    throw new Error('ORDER_ALREADY_RETURNED: This order has already been fully returned.');
  }
  assertOrderWasSold(order);

  const returnedLines = [];
  let totalRefund = 0;

  // If specific items were passed, return those; otherwise return the entire order
  const targetItems = items && Array.isArray(items) && items.length > 0
    ? items
    : order.items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));

  for (const requested of targetItems) {
    const qtyToReturn = Number(requested.quantity) || 0;
    if (qtyToReturn <= 0) continue;

    // Find original line item in the order
    const origLine = order.items.find(
      (oi) =>
        (requested.inventoryItemId && oi.inventoryItemId && oi.inventoryItemId.toString() === requested.inventoryItemId.toString()) ||
        oi.name.toLowerCase() === (requested.name || '').trim().toLowerCase()
    );

    const unitPrice = origLine ? origLine.price : (requested.price || 0);
    const itemRefund = unitPrice * qtyToReturn;
    totalRefund += itemRefund;

    // Restock the inventory item
    const inventoryItem = await resolveInventoryDoc(merchantId, {
      inventoryItemId: requested.inventoryItemId || origLine?.inventoryItemId,
      name: requested.name || origLine?.name,
    });

    if (inventoryItem) {
      inventoryItem.quantity += qtyToReturn;
      await inventoryItem.save();
      evaluateThresholdWorkflows(merchantId, inventoryItem).catch(() => {});
    }

    returnedLines.push({
      inventoryItemId: inventoryItem?._id || origLine?.inventoryItemId,
      name: origLine?.name || requested.name || inventoryItem?.name || 'Item',
      quantity: qtyToReturn,
      price: unitPrice,
    });
  }

  if (!returnedLines.length) {
    throw new Error('NO_VALID_ITEMS: No valid items found to return.');
  }

  // Financial adjustment for Udhaar / Khata
  let customer = null;
  if (order.paymentMethod === 'udhaar' && order.customerId) {
    customer = await Customer.findOne({ _id: order.customerId, merchantId });
    if (customer) {
      const prevBal = customer.balance;
      customer.balance = Math.max(0, customer.balance - totalRefund);
      await customer.save();

      emitDashboardUpdate(merchantId, {
        type: 'customer',
        action: 'return_deduction',
        customerId: customer._id,
        customerName: customer.name,
        refundAmount: totalRefund,
        previousBalance: prevBal,
        newBalance: customer.balance,
      });
    }
  }

  // Update order status and return history
  order.returnHistory = order.returnHistory || [];
  order.returnHistory.push({
    returnedAt: new Date(),
    items: returnedLines,
    refundAmount: totalRefund,
    reason,
  });

  const totalOriginalQty = order.items.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalReturnedQty = order.returnHistory.reduce(
    (s, rh) => s + (rh.items || []).reduce((is, it) => is + (it.quantity || 0), 0),
    0
  );

  order.status = totalReturnedQty >= totalOriginalQty ? 'returned' : 'partially_returned';
  await order.save();

  // Invalidate catalog & notify dashboard
  try { invalidateMerchantCatalog(merchantId); } catch (_) {}
  emitDashboardUpdate(merchantId, {
    type: 'order',
    action: 'return',
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    refundAmount: totalRefund,
  });

  return {
    order,
    returnedItems: returnedLines,
    refundAmount: totalRefund,
    customer,
  };
}

/**
 * Processes an item exchange. Restocks returned item, deducts replacement item, and calculates price difference.
 */
export async function processOrderExchange(merchantId, { orderId, orderNumber, contextId, returnItem, newItem, reason = 'Item exchange' }) {
  const order = await findOrderByReference(merchantId, { orderId, orderNumber, contextId });
  if (!order) {
    throw new Error('ORDER_NOT_FOUND: Could not find the specified order to exchange.');
  }
  assertOrderWasSold(order);

  if (!returnItem || !returnItem.name) {
    throw new Error('INVALID_EXCHANGE: Must specify an item to return.');
  }
  if (!newItem || !newItem.name) {
    throw new Error('INVALID_EXCHANGE: Must specify a replacement item.');
  }

  const returnQty = Number(returnItem.quantity) || 1;
  const newQty = Number(newItem.quantity) || 1;

  // 1. Resolve and restock returned item
  const returnInv = await resolveInventoryDoc(merchantId, returnItem);
  const origLine = order.items.find(
    (oi) =>
      (returnInv && oi.inventoryItemId && oi.inventoryItemId.toString() === returnInv._id.toString()) ||
      oi.name.toLowerCase() === returnItem.name.trim().toLowerCase()
  );

  const returnUnitPrice = origLine?.price ?? (returnInv?.price || 0);
  const returnTotalValue = returnUnitPrice * returnQty;

  if (returnInv) {
    returnInv.quantity += returnQty;
    await returnInv.save();
  }

  // 2. Resolve and deduct replacement item
  const newInv = await resolveInventoryDoc(merchantId, newItem);
  if (!newInv) {
    // Rollback returned restock if replacement item does not exist
    if (returnInv) {
      returnInv.quantity -= returnQty;
      await returnInv.save();
    }
    throw new Error(`ITEM_NOT_FOUND: Replacement item '${newItem.name}' not found in inventory.`);
  }

  if (newInv.quantity < newQty) {
    // Rollback returned restock
    if (returnInv) {
      returnInv.quantity -= returnQty;
      await returnInv.save();
    }
    throw new Error(
      `INSUFFICIENT_STOCK: ${newInv.name} Tried to take ${newQty}, but only ${newInv.quantity} left in stock.`
    );
  }

  newInv.quantity -= newQty;
  await newInv.save();
  evaluateThresholdWorkflows(merchantId, newInv).catch(() => {});

  const newUnitPrice = newInv.price ?? (newItem.price || 0);
  const newTotalValue = newUnitPrice * newQty;

  // 3. Price difference: Positive means customer owes more; Negative means merchant owes refund
  const priceDifference = newTotalValue - returnTotalValue;

  // 4. If paymentMethod is udhaar, adjust customer balance
  let customer = null;
  if (order.paymentMethod === 'udhaar' && order.customerId) {
    customer = await Customer.findOne({ _id: order.customerId, merchantId });
    if (customer) {
      customer.balance = Math.max(0, customer.balance + priceDifference);
      await customer.save();

      emitDashboardUpdate(merchantId, {
        type: 'customer',
        action: 'exchange_adjustment',
        customerId: customer._id,
        customerName: customer.name,
        priceDifference,
        newBalance: customer.balance,
      });
    }
  }

  // 5. Update order details
  order.exchangeHistory = order.exchangeHistory || [];
  order.exchangeHistory.push({
    exchangedAt: new Date(),
    returnItem: {
      inventoryItemId: returnInv?._id,
      name: returnInv?.name || returnItem.name,
      quantity: returnQty,
      price: returnUnitPrice,
    },
    newItem: {
      inventoryItemId: newInv._id,
      name: newInv.name,
      quantity: newQty,
      price: newUnitPrice,
    },
    priceDifference,
    reason,
  });

  // Adjust order items
  const lineIdx = order.items.findIndex(
    (oi) =>
      (returnInv && oi.inventoryItemId && oi.inventoryItemId.toString() === returnInv._id.toString()) ||
      oi.name.toLowerCase() === returnItem.name.trim().toLowerCase()
  );

  if (lineIdx !== -1) {
    if (order.items[lineIdx].quantity <= returnQty) {
      // Replace line item
      order.items[lineIdx] = {
        inventoryItemId: newInv._id,
        name: newInv.name,
        quantity: newQty,
        price: newUnitPrice,
      };
    } else {
      order.items[lineIdx].quantity -= returnQty;
      order.items.push({
        inventoryItemId: newInv._id,
        name: newInv.name,
        quantity: newQty,
        price: newUnitPrice,
      });
    }
  } else {
    order.items.push({
      inventoryItemId: newInv._id,
      name: newInv.name,
      quantity: newQty,
      price: newUnitPrice,
    });
  }

  order.total = Math.max(0, (order.total || 0) + priceDifference);
  order.status = 'exchanged';
  await order.save();

  // Invalidate catalog & notify dashboard
  try { invalidateMerchantCatalog(merchantId); } catch (_) {}
  emitDashboardUpdate(merchantId, {
    type: 'order',
    action: 'exchange',
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    priceDifference,
    total: order.total,
  });

  return {
    order,
    returnItem: { name: returnInv?.name || returnItem.name, quantity: returnQty, price: returnUnitPrice },
    newItem: { name: newInv.name, quantity: newQty, price: newUnitPrice },
    priceDifference,
    customer,
  };
}
