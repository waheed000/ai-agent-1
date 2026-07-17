/**
 * Feature flag routes — /api/v1/features
 */
import { Router } from 'express';
import FeatureController from '../controllers/FeatureController.js';
import { authenticate } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateFeatureKey, validateToggleFeature } from '../validators/featureValidators.js';

const router = Router();
router.use(authenticate);

router.get('/',          asyncHandler(FeatureController.list));
router.get('/:key',      validateFeatureKey,    asyncHandler(FeatureController.getByKey));
router.patch('/:key',    validateToggleFeature, asyncHandler(FeatureController.toggle));

export default router;
