import Approval from '../models/Approval.js';
import Order from '../models/Order.js';
import Merchant from '../models/Merchant.js';
import InventoryItem from '../models/InventoryItem.js';
import Customer from '../models/Customer.js';
import { evaluateThresholdWorkflows } from '../workflows/workflow.service.js';
import { sendInteractiveButtons, sendTextMessage } from '../services/whatsapp.service.js';
import { emitDashboardUpdate } from '../socket.js';

/** High-value threshold — orders at or above this amount require approval. */
export const HIGH_VALUE_THRESHOLD = 10_000;

/**
 * Create a pending approval for a high-value order and send the merchant
 * interactive WhatsApp buttons to approve or reject it.
 *
 * Called from order.service.js when an order meets the high-value threshold.
 * The WhatsApp send is best-effort — if it fails, the approval record still
 * exists and can be actioned from the dashboard.
 */
export const createApproval = async ({ merchantId, orderId, summary, amount }) => {
    const approval = await Approval.create({
        merchantId,
        type: 'order',
        refId: orderId,
        summary,
    });

    // Best-effort WhatsApp notification — the approval record is the source of
    // truth; if the button message fails, the dashboard can still surface it.
    try {
        const merchant = await Merchant.findById(merchantId);
        if (merchant?.whatsappNumber && !merchant.whatsappNumber.startsWith('unlinked_')) {
            await sendInteractiveButtons(
                merchant.whatsappNumber,
                `📋 Approval required for order #${orderId}\n${summary}\nAmount: Rs. ${amount.toLocaleString()}`,
                [
                    { id: `approve_${orderId}`, title: 'Approve' },
                    { id: `reject_${orderId}`, title: 'Reject' },
                ]
            );
        }
    } catch (err) {
        console.error('Failed to send approval buttons via WhatsApp:', err.message);
    }

    return approval;
};

/**
 * Approving a deferred order makes it a real sale: deduct each line's stock (atomically, only if
 * enough is still there) and add the total to the customer's khata. Orders created before the
 * deferral (stockApplied undefined/true) were applied at creation and are left alone.
 */
async function applyApprovedOrder(order) {
    if (order.stockApplied !== false) return;

    const applied = [];
    for (const line of order.items || []) {
        const updated = await InventoryItem.findOneAndUpdate(
            { _id: line.inventoryItemId, merchantId: order.merchantId, quantity: { $gte: line.quantity } },
            { $inc: { quantity: -line.quantity } },
            { new: true }
        );
        if (!updated) {
            for (const a of applied) {
                await InventoryItem.updateOne({ _id: a.doc._id }, { $inc: { quantity: a.quantity } });
            }
            const current = await InventoryItem.findById(line.inventoryItemId).lean();
            throw new Error(`INSUFFICIENT_STOCK: ${line.name} Tried to deduct ${line.quantity}, but only ${current?.quantity ?? 0} left.`);
        }
        applied.push({ doc: updated, quantity: line.quantity });
    }

    if (order.paymentMethod === 'udhaar' && order.customerId) {
        const customer = await Customer.findOneAndUpdate(
            { _id: order.customerId, merchantId: order.merchantId },
            { $inc: { balance: order.total || 0 } },
            { new: true }
        );
        if (customer) {
            emitDashboardUpdate(order.merchantId, { type: 'customer', action: 'update', customerId: customer._id, customerName: customer.name, balance: customer.balance });
        }
    }

    order.stockApplied = true;
    for (const { doc } of applied) {
        await evaluateThresholdWorkflows(order.merchantId, doc).catch(() => {});
    }
}

/**
 * Rejecting a deferred order needs no undo — nothing was applied. An older order that deducted
 * stock and charged the khata at creation gets both reversed.
 */
async function reverseRejectedOrder(order) {
    if (order.stockApplied === false) return;

    if (order.items?.length) {
        await InventoryItem.bulkWrite(
            order.items.map((i) => ({
                updateOne: {
                    filter: { _id: i.inventoryItemId },
                    update: { $inc: { quantity: i.quantity } },
                },
            }))
        );

        // Returned stock may lift items back above their alert limit.
        const restored = await InventoryItem.find({ _id: { $in: order.items.map((i) => i.inventoryItemId) } });
        for (const item of restored) {
            await evaluateThresholdWorkflows(order.merchantId, item).catch(() => {});
        }
    }

    if (order.paymentMethod === 'udhaar' && order.customerId) {
        const customer = await Customer.findOneAndUpdate(
            { _id: order.customerId, merchantId: order.merchantId },
            { $inc: { balance: -(order.total || 0) } },
            { new: true }
        );
        if (customer) {
            emitDashboardUpdate(order.merchantId, { type: 'customer', action: 'update', customerId: customer._id, customerName: customer.name, balance: customer.balance });
        }
    }

    order.stockApplied = false;
}

/** Tells the salesperson who logged the order what the owner decided. Best-effort. */
async function notifyStaffOfDecision(order, decision) {
    if (!order.staffPhone) return;
    const text = decision === 'approved'
        ? `✅ Order #${order.orderNumber} (Rs. ${Number(order.total || 0).toLocaleString()}) was approved by the owner and has been logged.`
        : `❌ Order #${order.orderNumber} (Rs. ${Number(order.total || 0).toLocaleString()}) was rejected by the owner. Nothing was logged.`;
    await sendTextMessage(order.staffPhone, text).catch((err) =>
        console.error('Failed to notify staff of approval decision:', err.message)
    );
}

/**
 * Respond to a pending approval.
 *
 * @param {String|ObjectId} id         - Approval document _id
 * @param {'approved'|'rejected'} decision
 * @param {String|ObjectId} [merchantId] - If provided, ownership is validated
 *                                         (dashboard path). Omit for webhook path.
 */
export const respond = async (id, decision, merchantId) => {
    if (!['approved', 'rejected'].includes(decision)) {
        throw new Error('INVALID_DECISION: Must be "approved" or "rejected"');
    }

    const query = { _id: id, status: 'pending' };
    if (merchantId) query.merchantId = merchantId;

    // Claimed atomically, so a double tap (WhatsApp + dashboard) can't apply an order twice.
    const approval = await Approval.findOneAndUpdate(
        query,
        { status: decision, respondedAt: new Date() },
        { new: true }
    );

    if (!approval) throw new Error('APPROVAL_NOT_FOUND');

    if (approval.type === 'order') {
        const order = await Order.findById(approval.refId);
        if (order) {
            try {
                if (decision === 'approved') await applyApprovedOrder(order);
                else await reverseRejectedOrder(order);
            } catch (err) {
                // e.g. the stock was sold in the meantime: keep the approval open so the owner
                // can restock and approve again, or reject.
                await Approval.updateOne({ _id: approval._id }, { $set: { status: 'pending' }, $unset: { respondedAt: 1 } });
                throw err;
            }
            order.status = decision;
            await order.save();
            await notifyStaffOfDecision(order, decision);
        }
    }

    emitDashboardUpdate(approval.merchantId, { type: 'order', action: decision });

    return approval;
};

/**
 * List all pending approvals for a merchant (dashboard view).
 */
export const getPendingApprovals = async (merchantId) => {
    return Approval.find({ merchantId, status: 'pending' }).sort({ createdAt: -1 });
};

/**
 * Find a pending approval by its referenced order ID.
 * Used by the WhatsApp webhook path when a merchant taps a reply button.
 */
export const findPendingByOrderId = async (orderId) => {
    return Approval.findOne({ type: 'order', refId: orderId, status: 'pending' });
};
