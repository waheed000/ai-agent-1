/**
 * Usage routes — /api/v1/usage
 */
import { Router } from 'express';
import UsageController from '../controllers/UsageController.js';
import { authenticate } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateUsageQuery } from '../validators/usageValidators.js';

const router = Router();
router.use(authenticate);

// Order matters: /summary before / so it is not caught as query param
router.get('/summary', asyncHandler(UsageController.getSummary));
router.get('/',        validateUsageQuery, asyncHandler(UsageController.getHistory));

export default router;
