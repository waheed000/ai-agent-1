import { Router } from 'express';
import JobController from '../controllers/JobController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateJobTrigger } from '../validators/jobValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// Public queue health (no auth — useful for uptime monitors)
router.get('/health', asyncHandler(JobController.getHealth));

// Per-queue stats (no auth — operational endpoint)
router.get('/queues', asyncHandler(JobController.getQueues));

// Authenticated endpoints
router.get('/history', authenticate, asyncHandler(JobController.getHistory));

router.post(
  '/platforms/:platform/sync',
  authenticate,
  validateJobTrigger,
  asyncHandler(JobController.triggerSync)
);

export default router;
