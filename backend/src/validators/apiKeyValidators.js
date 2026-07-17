import { param, body } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

export const validateCreateApiKey = [
  body('description')
    .optional().isString().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('scopes')
    .optional().isArray().withMessage('scopes must be an array'),
  body('expiresAt')
    .optional().isISO8601().withMessage('expiresAt must be a valid ISO 8601 date'),
  body('workspaceId')
    .optional().isMongoId().withMessage('workspaceId must be a valid ObjectId'),
  handleValidationErrors,
];

export const validateApiKeyId = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
  handleValidationErrors,
];

export const validateUpdateApiKey = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
  body('description')
    .optional().isString().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('expiresAt')
    .optional().isISO8601().withMessage('expiresAt must be a valid ISO 8601 date'),
  body('scopes')
    .optional().isArray().withMessage('scopes must be an array'),
  handleValidationErrors,
];
