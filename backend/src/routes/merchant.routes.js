import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getProfile,
  updateProfile,
  getPaymentMethods,
  updatePaymentMethods,
} from '../controllers/merchant.controller.js';

const router = Router();

// All merchant settings & profile routes are protected by JWT auth
router.use(requireAuth);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

router.get('/payment-methods', getPaymentMethods);
router.put('/payment-methods', updatePaymentMethods);

export default router;
