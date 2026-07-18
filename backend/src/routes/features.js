/**
 * Feature flag routes — /api/v1/features
 */
import { Router } from 'express';
import FeatureController from '../controllers/FeatureController.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateFeatureKey, validateToggleFeature } from '../validators/featureValidators.js';

const router = Router();
router.use(authenticate);

router.get('/',       asyncHandler(FeatureController.list));
router.get('/:key',   validateFeatureKey,                                         asyncHandler(FeatureController.getByKey));
// Toggling global feature flags is restricted to admins and superadmins
router.patch('/:key', authorize('admin', 'superadmin'), validateToggleFeature,    asyncHandler(FeatureController.toggle));

export default router;
