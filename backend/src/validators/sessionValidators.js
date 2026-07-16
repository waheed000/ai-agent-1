/**
 * Session validators — express-validator rules for session management endpoints.
 */

import { param } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

/**
 * Validate that :id is a valid MongoDB ObjectId.
 */
export const sessionIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Session ID must be a valid ID'),
  handleValidationErrors,
];
