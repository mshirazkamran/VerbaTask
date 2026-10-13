import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getProfile,
  updateProfile,
  getPaymentMethods,
  updatePaymentMethods,
  requestPhoneChange,
  verifyPhoneChange,
  resendPhoneChangeCode,
  getStaffMembers,
  addStaffMember,
  removeStaffMember,
  regenerateShopCode,
} from '../controllers/merchant.controller.js';

const router = Router();

// All merchant settings & profile routes are protected by JWT auth
router.use(requireAuth);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

router.get('/payment-methods', getPaymentMethods);
router.put('/payment-methods', updatePaymentMethods);

// Team & staff routes
router.get('/staff', getStaffMembers);
router.post('/staff', addStaffMember);
router.delete('/staff/:staffId', removeStaffMember);
router.post('/shop-code/regenerate', regenerateShopCode);

// Phone change verification routes
router.post('/phone/request-change', requestPhoneChange);
router.post('/phone/verify-change', verifyPhoneChange);
router.post('/phone/resend-code', resendPhoneChangeCode);

export default router;
