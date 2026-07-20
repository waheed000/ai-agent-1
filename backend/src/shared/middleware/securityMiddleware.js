/**
 * Security hardening middleware — Phase 15B
 *
 * Provides four independent guards that run in the middleware chain:
 *
 * 1. noSqlInjection     — strips MongoDB operator keys ($where, $gt, ...) from
 *                         req.body, req.query, and req.params.
 * 2. prototypePollution — rejects requests that try to pollute Object.prototype
 *                         via __proto__, constructor, or prototype keys.
 * 3. hpp                — HTTP Parameter Pollution: collapses repeated query-string
 *                         keys to their last value; a whitelist lets specific keys
 *                         remain as arrays.
 * 4. massAssignment     — strips a configurable set of privileged fields from
 *                         req.body so callers can never elevate their own role, etc.
 */

import logger from '../../utils/logger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively remove keys that start with '$' (MongoDB operators).
 * If ALL keys in an object were operators (e.g. { "$gt": "" }), returns null
 * so downstream validators treat the field as absent rather than receiving {}.
 * An originally-empty object {} is preserved as-is (not converted to null).
 */
function stripMongoOperators(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object')           return obj;
  if (Array.isArray(obj))                return obj.map(stripMongoOperators);

  const clean = {};
  let hadOperatorKeys = false;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) { hadOperatorKeys = true; continue; }
    clean[k] = stripMongoOperators(v);
  }
  // Only return null when we removed operator keys AND nothing else remained.
  if (hadOperatorKeys && Object.keys(clean).length === 0) return null;
  return clean;
}

/** Return true if an object tree contains a dangerous prototype key. */
function hasPollutionKey(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(hasPollutionKey);
  for (const k of Object.keys(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return true;
    if (hasPollutionKey(obj[k])) return true;
  }
  return false;
}

// ─── 1. NoSQL Injection Prevention ───────────────────────────────────────────

/**
 * Strip MongoDB operator keys from body, query, and params.
 * A value like { "$gt": "" } is sanitised to null (operator-only object).
 * req.query and req.params always remain objects (fall back to {}) so that
 * controller destructuring never crashes.
 */
export const noSqlInjection = (req, _res, next) => {
  if (req.body)   req.body   = stripMongoOperators(req.body)   ?? {};
  if (req.query)  req.query  = stripMongoOperators(req.query)  ?? {};
  if (req.params) req.params = stripMongoOperators(req.params) ?? {};
  next();
};

// ─── 2. Prototype Pollution Prevention ───────────────────────────────────────

/**
 * Reject any request whose body or query contains __proto__, constructor,
 * or prototype — the three vectors for prototype-pollution attacks.
 */
export const prototypePollution = (req, res, next) => {
  if (hasPollutionKey(req.body) || hasPollutionKey(req.query)) {
    logger.warn('Prototype pollution attempt blocked', {
      ip:  req.ip,
      url: req.originalUrl,
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid request payload',
      code:    'INVALID_PAYLOAD',
    });
  }
  next();
};

// ─── 3. HTTP Parameter Pollution (HPP) Prevention ────────────────────────────

/**
 * When the same query-string key appears multiple times Express puts them
 * in an array. Collapse arrays to the last value, EXCEPT for whitelisted keys.
 *
 * @param {string[]} [whitelist]  Keys allowed to remain as arrays.
 */
export const hpp = (whitelist = ['tags', 'platforms', 'ids', 'fields']) =>
  (req, _res, next) => {
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value) && !whitelist.includes(key)) {
          req.query[key] = value[value.length - 1];
        }
      }
    }
    next();
  };

// ─── 4. Mass Assignment Prevention ───────────────────────────────────────────

/**
 * Strip privileged fields from req.body that end-users must never set directly.
 * Service layers still accept them internally — this guard targets the HTTP layer.
 *
 * @param {string[]} [extra]  Additional fields to strip beyond the defaults.
 */
const DEFAULT_PROTECTED_FIELDS = [
  'role', 'isDeleted', 'isVerified',
  'subscriptionPlan', 'subscriptionExpiresAt',
  'status', 'lastLogin', 'lastLoginIp',
  'passwordResetToken', 'passwordResetExpiresAt',
  'verificationToken', 'createdAt', 'updatedAt',
  '__v', '_id',
];

export const massAssignment = (extra = []) => {
  const blocked = new Set([...DEFAULT_PROTECTED_FIELDS, ...extra]);
  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      for (const field of blocked) {
        delete req.body[field];
      }
    }
    next();
  };
};
