import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getDashboardOverview, triggerExpiryNotifications } from '../dashboard/dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/overview', getDashboardOverview);
router.post('/notify-expiries', triggerExpiryNotifications);

export default router;
