import Approval from '../models/Approval.js';
import Order from '../models/Order.js';
import Merchant from '../models/Merchant.js';
import InventoryItem from '../models/InventoryItem.js';
import { sendInteractiveButtons } from '../services/whatsapp.service.js';
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

    const approval = await Approval.findOneAndUpdate(
        query,
        { status: decision, respondedAt: new Date() },
        { new: true }
    );

    if (!approval) throw new Error('APPROVAL_NOT_FOUND');

    // Propagate the decision to the referenced order
    if (approval.type === 'order') {
        await Order.findByIdAndUpdate(approval.refId, { status: decision });

        // Revert stock when rejected — stock was deducted at order creation time.
        if (decision === 'rejected') {
            const order = await Order.findById(approval.refId).lean();
            if (order?.items?.length) {
                await InventoryItem.bulkWrite(
                    order.items.map((i) => ({
                        updateOne: {
                            filter: { _id: i.inventoryItemId },
                            update: { $inc: { quantity: i.quantity } },
                        },
                    }))
                );
            }
        }
    }

    emitDashboardUpdate(approval.merchantId);

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
