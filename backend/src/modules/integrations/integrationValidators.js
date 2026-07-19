/**
 * Integration validators — express-validator rules for connected account endpoints.
 */

import { param } from 'express-validator';
import { handleValidationErrors } from '../auth/authValidators.js';
import { PLATFORMS } from '../../models/utils/schemaUtils.js';

/**
 * Validate that :platform is a supported platform.
 */
export const platformParamValidator = [
  param('platform')
    .toLowerCase()
    .isIn(PLATFORMS)
    .withMessage(`Platform must be one of: ${PLATFORMS.join(', ')}`),
  handleValidationErrors,
];
