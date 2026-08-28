import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';
import { createOrder as processOrderCommand } from '../crm/order.service.js';

// Escape regex metacharacters in item names — same reason as order.service.js.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- INVENTORY CRUD ---

export const getInventory = async (req, res) => {
    try {
        const items = await InventoryItem.find({ merchantId: req.merchantId });
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const createInventoryItem = async (req, res) => {
    try {
        const { name, quantity, price, unit } = req.body;

        // 1. Check if this merchant already has an item with this exact name (case-insensitive)
        let item = await InventoryItem.findOne({
            merchantId: req.merchantId,
            name: new RegExp(`^${escapeRegex(name)}$`, 'i') // "Daal channa" will match "daal channa"
        });

        if (item) {
            // 2. Item exists: Add the new stock to the existing stock
            item.quantity += (quantity || 0);
            
            // Optionally update price and unit if new ones were provided
            if (price) item.price = price;
            if (unit) item.unit = unit;
            
            await item.save();
            return res.status(200).json({ success: true, data: item });
        }

        // 3. Item does not exist: Create a brand new entry
        item = await InventoryItem.create({
            merchantId: req.merchantId,
            name,
            quantity: quantity || 0,
            price,
            unit
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const updateInventoryItem = async (req, res) => {
    try {
        const item = await InventoryItem.findOneAndUpdate(
            { _id: req.params.id, merchantId: req.merchantId },
            req.body,
            { new: true }
        );
        if (!item) return res.status(404).json({ success: false, error: { message: 'Item not found' } });
        res.status(200).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const deleteInventoryItem = async (req, res) => {
    try {
        const item = await InventoryItem.findOneAndDelete({ _id: req.params.id, merchantId: req.merchantId });
        if (!item) return res.status(404).json({ success: false, error: { message: 'Item not found' } });
        res.status(200).json({ success: true, data: { deleted: true } });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// --- ORDERS ---

export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ merchantId: req.merchantId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, merchantId: req.merchantId });
        if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const createOrder = async (req, res) => {
    try {
        // Enforce the command contract shape from HTTP body
        const command = {
            ...req.body,
            merchantId: req.merchantId 
        };
        
        const order = await processOrderCommand(command);
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        // Distinguish between bad user input (400) and server errors (500)
        const status = error.message.includes('ITEM_NOT_FOUND') || error.message.includes('INSUFFICIENT_STOCK') ? 400 : 500;
        res.status(status).json({ success: false, error: { message: error.message } });
    }
};