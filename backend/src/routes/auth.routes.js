import {
  signup,
  login,
  confirmLinkCode,
  getMe,
  updateMe,
  requestPasswordReset,
  resendPasswordResetCode,
  resetPassword,
} from '../controllers/auth.controller.js';
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/link-code/confirm', confirmLinkCode);
router.post('/forgot-password/request', requestPasswordReset);
router.post('/forgot-password/resend', resendPasswordResetCode);
router.post('/forgot-password/reset', resetPassword);

// Protected routes
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

export default router;