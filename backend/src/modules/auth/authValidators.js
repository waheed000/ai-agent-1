/**
 * Authentication request validators.
 * Built with express-validator. Each export is an array of middleware
 * that can be spread directly into a route definition.
 */

import { body, validationResult } from 'express-validator';
import { badRequest } from '../../utils/response.js';

// ─── Validation result handler ────────────────────────────────────────────────

/**
 * Terminal middleware that collects express-validator errors and
 * returns a standardized 400 response if any exist.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return badRequest(res, 'Validation failed', details);
  }
  next();
};

// ─── Reusable field rules ─────────────────────────────────────────────────────

const emailField = body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Please provide a valid email address')
  .normalizeEmail();

const passwordField = body('password')
  .notEmpty().withMessage('Password is required')
  .isString().withMessage('Password must be a string');

const nameField = body('name')
  .trim()
  .notEmpty().withMessage('Name is required')
  .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
  .escape();

const refreshTokenField = body('refreshToken')
  .optional()
  .isString().withMessage('Refresh token must be a string');

// ─── Route validators ─────────────────────────────────────────────────────────

/** POST /auth/register */
export const registerValidator = [
  nameField,
  emailField,
  passwordField,
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors,
];

/** POST /auth/login */
export const loginValidator = [
  emailField,
  passwordField,
  handleValidationErrors,
];

/** POST /auth/refresh-token */
export const refreshTokenValidator = [
  refreshTokenField,
  handleValidationErrors,
];
