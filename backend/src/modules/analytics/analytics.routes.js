import { Router } from 'express';
import AnalyticsController from './AnalyticsController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validateAnalyticsQuery } from './analyticsValidators.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();

// All analytics endpoints require authentication
router.use(authenticate);

router.get('/overview',          validateAnalyticsQuery, asyncHandler(AnalyticsController.getOverview));
router.get('/growth',            validateAnalyticsQuery, asyncHandler(AnalyticsController.getGrowth));
router.get('/engagement',        validateAnalyticsQuery, asyncHandler(AnalyticsController.getEngagement));
router.get('/content-performance', validateAnalyticsQuery, asyncHandler(AnalyticsController.getContentPerformance));
router.get('/best-posting-time', validateAnalyticsQuery, asyncHandler(AnalyticsController.getBestPostingTime));
router.get('/audience',          validateAnalyticsQuery, asyncHandler(AnalyticsController.getAudience));

export default router;
