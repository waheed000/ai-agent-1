/**
 * API key routes — /api/v1/apikeys
 */
import { Router } from 'express';
import ApiKeyController from '../controllers/ApiKeyController.js';
import { authenticate } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  validateCreateApiKey,
  validateApiKeyId,
  validateUpdateApiKey,
} from '../validators/apiKeyValidators.js';

const router = Router();
router.use(authenticate);

router.post('/',             validateCreateApiKey, asyncHandler(ApiKeyController.create));
router.get('/',                                    asyncHandler(ApiKeyController.list));
router.post('/:id/revoke',  validateApiKeyId,      asyncHandler(ApiKeyController.revoke));
router.patch('/:id',        validateUpdateApiKey,  asyncHandler(ApiKeyController.update));
router.delete('/:id',       validateApiKeyId,      asyncHandler(ApiKeyController.delete));

export default router;
