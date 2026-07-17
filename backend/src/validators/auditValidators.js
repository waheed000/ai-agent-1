import { query } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

export const validateAuditQuery = [
  query('action')
    .optional().isString().isLength({ max: 100 }).withMessage('action must be a string'),
  query('limit')
    .optional().isInt({ min: 1, max: 200 }).withMessage('limit must be 1–200'),
  query('skip')
    .optional().isInt({ min: 0 }).withMessage('skip must be >= 0'),
  handleValidationErrors,
];
