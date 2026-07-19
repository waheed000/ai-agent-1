/**
 * Rate-limiting middleware presets.
 *
 * Window sizes and request caps are driven by config so they can be tuned
 * per-environment without code changes.
 */

import rateLimit from 'express-rate-limit';
import config from '../../config/index.js';

const makeOptions = (windowMs, max, message) => ({
  windowMs,
  max,
  standardHeaders: true,  // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders:   false,
  message: {
    success: false,
    message,
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1',
});

/** General API rate limiter (default: 100 req / 15 min per IP). */
export const generalLimiter = rateLimit(
  makeOptions(
    config.rateLimit.general.windowMs,
    config.rateLimit.general.max,
    'Too many requests. Please try again later.',
  ),
);

/** Auth endpoints (default: 10 req / 15 min per IP). */
export const authLimiter = rateLimit(
  makeOptions(
    config.rateLimit.auth.windowMs,
    config.rateLimit.auth.max,
    'Too many authentication attempts. Please try again later.',
  ),
);

/** AI endpoints — expensive operations (default: 20 req / 1 min per IP). */
export const aiLimiter = rateLimit(
  makeOptions(
    config.rateLimit.ai.windowMs,
    config.rateLimit.ai.max,
    'AI request limit reached. Please wait before making more requests.',
  ),
);
