import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listApprovals, respondToApproval } from '../controllers/approval.controller.js';

const router = Router();

// All approval routes require authentication
router.use(requireAuth);

router.get('/', listApprovals);
router.patch('/:id/respond', respondToApproval);

export default router;
