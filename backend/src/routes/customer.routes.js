import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  settleBalance,
  getCustomerStatement,
  downloadCustomerStatement,
  sendCustomerStatementToWhatsapp,
} from '../controllers/customer.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/settle', settleBalance);
router.get('/:id/statement', getCustomerStatement);
router.get('/:id/statement/pdf', downloadCustomerStatement);
router.post('/:id/statement/whatsapp', sendCustomerStatementToWhatsapp);

export default router;

