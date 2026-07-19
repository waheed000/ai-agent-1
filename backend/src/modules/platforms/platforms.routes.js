/**
 * Platform routes — sync and status endpoints.
 * All routes require authentication.
 *
 * Mounted at /api/v1/platforms
 */

import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import PlatformController from './PlatformController.js';
import { platformParamValidator } from './platformValidators.js';

const router = Router();

router.use(authenticate);

/**
 * POST /api/v1/platforms/:platform/sync
 * Trigger a full data sync for the specified platform.
 */
router.post('/:platform/sync', platformParamValidator, PlatformController.sync);

/**
 * GET /api/v1/platforms/:platform/status
 * Get the current sync status for the specified platform.
 */
router.get('/:platform/status', platformParamValidator, PlatformController.getStatus);

export default router;
