import { param, query, body } from 'express-validator';

const PLAN_TYPES = ['7day', '30day', '90day'];
const PLATFORMS  = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'];

export const validateGenerateStrategy = [
  body('planType')
    .optional()
    .isIn(PLAN_TYPES)
    .withMessage(`planType must be one of: ${PLAN_TYPES.join(', ')}`),
  body('platform')
    .optional()
    .isIn(PLATFORMS)
    .withMessage(`platform must be one of: ${PLATFORMS.join(', ')}`),
];

export const validateListStrategy = [
  query('planType').optional().isIn(PLAN_TYPES).withMessage('Invalid planType'),
  query('status').optional().isIn(['generating', 'ready', 'failed']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50'),
];
