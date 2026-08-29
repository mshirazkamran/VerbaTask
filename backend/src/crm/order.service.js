import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';
import { evaluateThresholdWorkflows } from '../workflows/workflow.service.js';
import { createApproval, HIGH_VALUE_THRESHOLD } from '../approvals/approval.service.js';

// Item names arrive from free-form WhatsApp text (Qwen NLP) — escape regex
// metacharacters so "Milk (1L)" matches literally instead of failing silently.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The single source of truth for order creation and stock deduction.
 * @param {Object} command - Matches the JSON command contract exactly.
 */
export const createOrder = async (command) => {
    const { item, paymentMethod, amount, source, merchantId } = command;

    // 1. Find the exact inventory item to deduct from
    const inventoryItem = await InventoryItem.findOne({
        merchantId,
        name: new RegExp(`^${escapeRegex(item.name)}$`, 'i') // Case-insensitive match
    });

    if (!inventoryItem) {
        throw new Error(`ITEM_NOT_FOUND: Cannot find '${item.name}' in inventory.`);
    }

    // 2. Enforce stock limits
    if (inventoryItem.quantity < item.quantity) {
        throw new Error(`INSUFFICIENT_STOCK: Tried to deduct ${item.quantity}, but only ${inventoryItem.quantity} left.`);
    }

    // 3. Deduct stock and save
    inventoryItem.quantity -= item.quantity;
    await inventoryItem.save();

    // 4. Evaluate threshold workflows after stock deduction (non-blocking —
    //    a failed notification must never prevent the order from being saved).
    try {
        await evaluateThresholdWorkflows(merchantId, inventoryItem);
    } catch (err) {
        console.error('Threshold workflow evaluation failed:', err.message);
    }

    // 5. Determine order status — high-value orders require approval before completion
    const status = amount >= HIGH_VALUE_THRESHOLD ? 'pending_approval' : 'completed';

    // 6. Construct and save the order
    const order = await Order.create({
        merchantId,
        items: [{
            inventoryItemId: inventoryItem._id,
            name: inventoryItem.name,
            quantity: item.quantity,
            price: inventoryItem.price // Use established price per unit
        }],
        total: amount,
        paymentMethod,
        source,
        status,
    });

    // 7. If pending approval, create the approval record and notify the merchant
    if (status === 'pending_approval') {
        try {
            const summary = `${item.quantity}x ${inventoryItem.name}`;
            await createApproval({ merchantId, orderId: order._id, summary, amount });
        } catch (err) {
            console.error('Failed to create approval:', err.message);
        }
    }

    return order;
};