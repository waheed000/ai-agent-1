import { body, param } from 'express-validator';
import { PLATFORMS } from '../models/utils/schemaUtils.js';

export const validateAddCompetitor = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('username must be 1–100 characters'),

  body('platform')
    .trim()
    .toLowerCase()
    .isIn(PLATFORMS)
    .withMessage(`platform must be one of: ${PLATFORMS.join(', ')}`),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('notes must be ≤ 1000 characters'),

  body('niche')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('niche must be ≤ 100 characters'),
];

export const validateCompetitorId = [
  param('id').isMongoId().withMessage('id must be a valid MongoDB ObjectId'),
];
