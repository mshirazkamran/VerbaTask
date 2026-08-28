import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
    getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem,
    getOrders, getOrderById, createOrder
} from '../controllers/crm.controller.js';

const router = Router();

// All CRM routes require authentication (for the dashboard)
router.use(requireAuth);

router.get('/inventory', getInventory);
router.post('/inventory', createInventoryItem);
router.patch('/inventory/:id', updateInventoryItem);
router.delete('/inventory/:id', deleteInventoryItem);

router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders', createOrder);

export default router;