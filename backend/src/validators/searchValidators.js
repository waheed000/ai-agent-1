import { query } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

export const validateSearch = [
  query('q')
    .isString().trim().notEmpty().withMessage('q (search query) is required')
    .isLength({ min: 1, max: 200 }).withMessage('q must be between 1 and 200 characters'),
  query('limit')
    .optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50'),
  handleValidationErrors,
];
