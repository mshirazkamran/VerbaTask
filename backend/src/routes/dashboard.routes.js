import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getDashboardOverview } from '../dashboard/dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/overview', getDashboardOverview);

export default router;
