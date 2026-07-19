import { param, query, body } from 'express-validator';

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'];
const STATUSES  = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'];
const PRIORITIES = ['high', 'medium', 'low'];
const GOALS = ['brand_awareness', 'engagement', 'lead_generation', 'conversion', 'retention', 'education', 'entertainment'];

export const validateGeneratePlanner = [
  body('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('days must be between 1 and 90'),
  body('platforms')
    .optional()
    .isArray()
    .withMessage('platforms must be an array'),
  body('platforms.*')
    .optional()
    .isIn(PLATFORMS)
    .withMessage(`Each platform must be one of: ${PLATFORMS.join(', ')}`),
  body('campaignName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 }),
];

export const validatePlannerItem = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
];

export const validateUpdatePlannerItem = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
  body('status').optional().isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('goal').optional().isIn(GOALS).withMessage('Invalid goal'),
  body('suggestedTime').optional().isISO8601().withMessage('suggestedTime must be a valid ISO date'),
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('hashtags').optional().isArray(),
  body('keywords').optional().isArray(),
];

export const validateCalendar = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date'),
  query('platform').optional().isIn(PLATFORMS).withMessage('Invalid platform'),
];

export const validateCreateDraft = [
  body('title').notEmpty().withMessage('title is required').isString().trim().isLength({ max: 300 }),
  body('platform').optional().isIn(PLATFORMS).withMessage('Invalid platform'),
  body('caption').optional().isString().isLength({ max: 5000 }),
  body('body').optional().isString().isLength({ max: 20000 }),
  body('hashtags').optional().isArray(),
  body('contentPlan').optional().isMongoId().withMessage('contentPlan must be a valid ObjectId'),
];

export const validateUpdateDraft = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('title').optional().isString().trim().isLength({ max: 300 }),
  body('caption').optional().isString().isLength({ max: 5000 }),
  body('body').optional().isString().isLength({ max: 20000 }),
  body('hashtags').optional().isArray(),
  body('reviewNotes').optional().isString().isLength({ max: 1000 }),
];

export const validateDraftId = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
];
