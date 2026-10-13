import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  settleBalance,
} from '../controllers/customer.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/settle', settleBalance);

export default router;

