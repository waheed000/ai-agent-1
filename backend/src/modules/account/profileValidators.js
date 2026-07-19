/**
 * Profile & account management validators.
 */

import { body } from 'express-validator';
import { handleValidationErrors } from '../auth/authValidators.js';
import { badRequest } from '../../utils/response.js';

// ─── Allowed field sets ───────────────────────────────────────────────────────

const PROFILE_UPDATE_ALLOWED = new Set([
  'name', 'avatar', 'timezone',           // User fields
  'bio', 'niche', 'contentLanguage',       // CreatorProfile fields
  'contentGoals', 'experienceLevel',
  'location',                              // nested object — validated below
]);

const CHANGE_PASSWORD_ALLOWED = new Set(['currentPassword', 'newPassword']);

/**
 * Middleware that rejects any key in req.body not in the allowed set.
 * Prevents clients from sneaking in privileged fields (email, role, etc.).
 */
const rejectUnknown = (allowedSet) => (req, res, next) => {
  const unknown = Object.keys(req.body).filter((k) => !allowedSet.has(k));
  if (unknown.length > 0) {
    return badRequest(res, 'Request contains unknown or non-updatable fields', [
      { field: unknown.join(', '), message: 'Field(s) not allowed in this request' },
    ]);
  }
  next();
};

// ─── Timezone validation ──────────────────────────────────────────────────────

const isValidTimezone = (tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// ─── Language validation (ISO 639-1) ─────────────────────────────────────────

const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/; // e.g. "en" or "en-US"

// ─── Validators ───────────────────────────────────────────────────────────────

/** PATCH /auth/profile */
export const updateProfileValidator = [
  rejectUnknown(PROFILE_UPDATE_ALLOWED),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('avatar')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Avatar must be a valid HTTP/HTTPS URL'),

  body('timezone')
    .optional()
    .trim()
    .custom((value) => {
      if (!isValidTimezone(value)) throw new Error('Invalid IANA timezone');
      return true;
    }),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),

  body('niche')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Niche cannot exceed 100 characters'),

  body('contentLanguage')
    .optional()
    .trim()
    .matches(LANG_RE).withMessage('Language must be a valid ISO 639-1 code (e.g. "en" or "en-US")'),

  body('contentGoals')
    .optional()
    .isArray({ max: 20 }).withMessage('Goals must be an array with at most 20 items')
    .custom((arr) => arr.every((g) => typeof g === 'string' && g.length <= 200))
    .withMessage('Each goal must be a string under 200 characters'),

  body('experienceLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
    .withMessage('Experience level must be one of: beginner, intermediate, advanced, professional'),

  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),

  body('location.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Country must be between 2 and 100 characters'),

  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

  handleValidationErrors,
];

/** PATCH /auth/change-password */
export const changePasswordValidator = [
  rejectUnknown(CHANGE_PASSWORD_ALLOWED),

  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),

  handleValidationErrors,
];
