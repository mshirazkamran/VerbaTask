import { Router } from 'express';
import { signup, login, confirmLinkCode, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/link-code/confirm', confirmLinkCode);

// Protected route
router.get('/me', requireAuth, getMe);

export default router;