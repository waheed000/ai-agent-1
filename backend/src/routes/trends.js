import { Router } from 'express';
import TrendController from '../controllers/TrendController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateTrendQuery, validateTrendRefresh } from '../validators/trendValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// Read endpoints are public — useful for embedding trend widgets without auth
router.get('/', validateTrendQuery, asyncHandler(TrendController.getTrends));
router.get('/topics', validateTrendQuery, asyncHandler(TrendController.getTopics));
router.get('/hashtags', validateTrendQuery, asyncHandler(TrendController.getHashtags));
router.get('/creators', validateTrendQuery, asyncHandler(TrendController.getCreatorTrends));

// Refresh requires authentication
router.post('/refresh', authenticate, validateTrendRefresh, asyncHandler(TrendController.refreshTrends));

export default router;
