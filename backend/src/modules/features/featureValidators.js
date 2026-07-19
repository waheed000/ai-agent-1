import { param, body } from 'express-validator';
import { handleValidationErrors } from '../auth/authValidators.js';
import { FEATURE_KEYS } from '../../models/FeatureFlag.js';

export const validateFeatureKey = [
  param('key')
    .isIn(FEATURE_KEYS)
    .withMessage(`key must be one of: ${FEATURE_KEYS.join(', ')}`),
  handleValidationErrors,
];

export const validateToggleFeature = [
  param('key')
    .isIn(FEATURE_KEYS)
    .withMessage(`key must be one of: ${FEATURE_KEYS.join(', ')}`),
  body('enabled')
    .isBoolean().withMessage('enabled must be a boolean'),
  handleValidationErrors,
];
