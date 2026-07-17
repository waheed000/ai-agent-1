import { query } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';
import { USAGE_CATEGORIES } from '../models/UsageRecord.js';

export const validateUsageQuery = [
  query('category')
    .optional().isIn(USAGE_CATEGORIES)
    .withMessage(`category must be one of: ${USAGE_CATEGORIES.join(', ')}`),
  query('from')
    .optional().isISO8601().withMessage('from must be a valid ISO 8601 date'),
  query('to')
    .optional().isISO8601().withMessage('to must be a valid ISO 8601 date'),
  query('limit')
    .optional().isInt({ min: 1, max: 500 }).withMessage('limit must be 1–500'),
  query('skip')
    .optional().isInt({ min: 0 }).withMessage('skip must be >= 0'),
  handleValidationErrors,
];
