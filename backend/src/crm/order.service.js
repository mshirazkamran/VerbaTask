import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';

/**
 * The single source of truth for order creation and stock deduction.
 * @param {Object} command - Matches the JSON command contract exactly.
 */
export const createOrder = async (command) => {
    const { item, paymentMethod, amount, source, merchantId } = command;

    // 1. Find the exact inventory item to deduct from
    const inventoryItem = await InventoryItem.findOne({ 
        merchantId, 
        name: new RegExp(`^${item.name}$`, 'i') // Case-insensitive match
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

    // 4. Construct and save the order (bypassing approvals for now)
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
        status: 'completed' // Approvals logic is paused until Day 5
    });

    return order;
};