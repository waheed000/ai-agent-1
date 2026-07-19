import { param, query, body } from 'express-validator';

const REPORT_TYPES = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
const PLATFORMS    = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'];

export const validateGenerateReport = [
  body('type')
    .optional()
    .isIn(REPORT_TYPES)
    .withMessage(`type must be one of: ${REPORT_TYPES.join(', ')}`),
  body('platform')
    .optional()
    .isIn(PLATFORMS)
    .withMessage(`platform must be one of: ${PLATFORMS.join(', ')}`),
  body('referenceDate')
    .optional()
    .isISO8601()
    .withMessage('referenceDate must be a valid ISO 8601 date'),
];

export const validateReportId = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
];

export const validateListReports = [
  query('type').optional().isIn(REPORT_TYPES).withMessage('Invalid report type'),
  query('status').optional().isIn(['generating', 'ready', 'failed']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip must be >= 0'),
];
