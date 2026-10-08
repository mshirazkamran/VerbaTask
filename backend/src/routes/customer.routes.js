import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getCustomers, settleBalance } from '../controllers/customer.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getCustomers);
router.post('/:id/settle', settleBalance);

export default router;
