import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getAnalytics } from '../dashboard/analytics.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', getAnalytics);

export default router;
