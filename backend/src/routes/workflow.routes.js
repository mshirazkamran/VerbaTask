import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflow.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listWorkflows);
router.post('/', createWorkflow);
router.patch('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);

export default router;
