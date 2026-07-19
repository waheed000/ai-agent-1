import { query, body } from 'express-validator';
import { PLATFORMS } from '../../models/utils/schemaUtils.js';

const TREND_CATEGORIES = ['topic', 'hashtag', 'audio', 'format', 'keyword', 'challenge', 'other'];
const TREND_STATUSES = ['rising', 'peak', 'declining', 'expired'];

export const validateTrendQuery = [
  query('platform')
    .optional()
    .trim()
    .toLowerCase()
    .isIn([...PLATFORMS, 'all'])
    .withMessage(`platform must be one of: ${[...PLATFORMS, 'all'].join(', ')}`),

  query('category')
    .optional()
    .trim()
    .isIn(TREND_CATEGORIES)
    .withMessage(`category must be one of: ${TREND_CATEGORIES.join(', ')}`),

  query('status')
    .optional()
    .trim()
    .isIn(TREND_STATUSES)
    .withMessage(`status must be one of: ${TREND_STATUSES.join(', ')}`),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),

  query('minScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('minScore must be between 0 and 100'),
];

export const validateTrendRefresh = [
  body('platform')
    .optional()
    .trim()
    .toLowerCase()
    .isIn([...PLATFORMS, 'all'])
    .withMessage(`platform must be one of: ${[...PLATFORMS, 'all'].join(', ')}`),

  body('category')
    .optional()
    .trim()
    .isIn(TREND_CATEGORIES)
    .withMessage(`category must be one of: ${TREND_CATEGORIES.join(', ')}`),
];
