import { query } from 'express-validator';
import { PLATFORMS } from '../../models/utils/schemaUtils.js';

const optionalPlatform = query('platform')
  .optional()
  .trim()
  .toLowerCase()
  .isIn(PLATFORMS)
  .withMessage(`platform must be one of: ${PLATFORMS.join(', ')}`);

const optionalStartDate = query('startDate')
  .optional()
  .isISO8601()
  .withMessage('startDate must be a valid ISO 8601 date (e.g. 2025-01-01)');

const optionalEndDate = query('endDate')
  .optional()
  .isISO8601()
  .withMessage('endDate must be a valid ISO 8601 date');

const optionalCompare = query('compare')
  .optional()
  .isIn(['previous_period', 'previous_year'])
  .withMessage('compare must be "previous_period" or "previous_year"');

const optionalLimit = query('limit')
  .optional()
  .isInt({ min: 1, max: 100 })
  .withMessage('limit must be an integer between 1 and 100');

export const validateAnalyticsQuery = [
  optionalPlatform,
  optionalStartDate,
  optionalEndDate,
  optionalCompare,
  optionalLimit,
];
