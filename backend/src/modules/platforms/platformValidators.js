/**
 * Platform validators — express-validator rules for platform sync endpoints.
 */

import { param } from 'express-validator';
import { handleValidationErrors } from '../auth/authValidators.js';
import PlatformFactory from './providers/PlatformFactory.js';

/**
 * Validate that :platform is a supported platform in PlatformFactory.
 */
export const platformParamValidator = [
  param('platform')
    .toLowerCase()
    .custom((value) => {
      if (!PlatformFactory.getSupportedPlatforms().includes(value)) {
        throw new Error(
          `Platform must be one of: ${PlatformFactory.getSupportedPlatforms().join(', ')}`
        );
      }
      return true;
    }),
  handleValidationErrors,
];
