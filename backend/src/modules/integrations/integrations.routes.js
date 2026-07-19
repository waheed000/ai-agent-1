/**
 * Integrations routes — connected social account management.
 * All routes require authentication.
 *
 * Mounted at /api/v1/integrations
 */

import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import IntegrationController from './IntegrationController.js';
import { platformParamValidator } from './integrationValidators.js';

const router = Router();

// All integration routes require a valid access token
router.use(authenticate);

/**
 * GET /api/v1/integrations
 * List all connected accounts for the current user.
 */
router.get('/', IntegrationController.listIntegrations);

/**
 * DELETE /api/v1/integrations/:platform
 * Disconnect a specific platform account.
 */
router.delete('/:platform', platformParamValidator, IntegrationController.disconnectPlatform);

export default router;
