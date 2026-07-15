/**
 * Rate-limiting middleware presets.
 * Import the appropriate limiter for each route group.
 */

import rateLimit from 'express-rate-limit';

const makeOptions = (windowMs, max, message) => ({
  windowMs,
  max,
  standardHeaders: true,  // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    message,
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1', // skip localhost in dev
});

/** General API rate limiter — 100 req / 15 min per IP. */
export const generalLimiter = rateLimit(
  makeOptions(15 * 60 * 1000, 100, 'Too many requests. Please try again in 15 minutes.')
);

/** Auth endpoints — stricter: 10 req / 15 min per IP. */
export const authLimiter = rateLimit(
  makeOptions(15 * 60 * 1000, 10, 'Too many authentication attempts. Please try again in 15 minutes.')
);

/** AI endpoints — 20 req / 1 min per IP (expensive operations). */
export const aiLimiter = rateLimit(
  makeOptions(60 * 1000, 20, 'AI request limit reached. Please wait before making more requests.')
);
