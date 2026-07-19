/**
 * Settings routes — /api/v1/settings
 */
import { Router } from 'express';
import SettingsController from './SettingsController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { validateSettingsType, validateUpdateSettings } from './settingsValidators.js';

const router = Router();
router.use(authenticate);

router.get('/',        asyncHandler(SettingsController.getAll));
router.get('/:type',   validateSettingsType,    asyncHandler(SettingsController.getByType));
router.patch('/:type', validateUpdateSettings,  asyncHandler(SettingsController.update));

export default router;
