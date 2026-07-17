import { param, body } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';
import { SETTINGS_TYPES } from '../models/Settings.js';

export const validateSettingsType = [
  param('type')
    .isIn(SETTINGS_TYPES)
    .withMessage(`type must be one of: ${SETTINGS_TYPES.join(', ')}`),
  handleValidationErrors,
];

export const validateUpdateSettings = [
  param('type')
    .isIn(SETTINGS_TYPES)
    .withMessage(`type must be one of: ${SETTINGS_TYPES.join(', ')}`),
  body('timezone')
    .optional().isString().isLength({ max: 100 }).withMessage('timezone must be a valid string'),
  body('language')
    .optional().isString().isLength({ max: 10 }).withMessage('language must be a valid string'),
  body('theme')
    .optional().isIn(['light', 'dark', 'system']).withMessage('theme must be light, dark, or system'),
  body('data')
    .optional().isObject().withMessage('data must be an object'),
  handleValidationErrors,
];
