/**
 * Authentication & Authorization middleware.
 *
 * Exports:
 *   authenticate        — requires a valid access token
 *   optionalAuthenticate — populates req.user if a token is present, never rejects
 *   authorize(...roles) — role-based access control (must follow authenticate)
 *   isOwner             — ensures req.user.id === req.params.userId (or admin/superadmin bypass)
 */

import TokenService from '../services/TokenService.js';
import UserRepository from '../repositories/UserRepository.js';
import CreatorProfileRepository from '../repositories/CreatorProfileRepository.js';
import {
  AuthenticationError,
  AuthorizationError,
} from '../utils/errors.js';
import logger from '../utils/logger.js';

// ─── Token extraction ─────────────────────────────────────────────────────────

/**
 * Extract a Bearer token from the Authorization header,
 * falling back to the `accessToken` HttpOnly cookie.
 */
const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

// ─── Core resolution ──────────────────────────────────────────────────────────

/**
 * Resolve and attach req.user from a token.
 * Returns the user object on success, throws AuthenticationError on failure.
 */
const resolveUser = async (req) => {
  const token = extractToken(req);
  if (!token) throw new AuthenticationError('Access token is required');

  const decoded = TokenService.verifyAccessToken(token); // throws on invalid/expired

  const user = await UserRepository.findById(decoded.sub);
  if (!user || user.isDeleted) {
    throw new AuthenticationError('User account not found');
  }

  if (user.status !== 'active') {
    throw new AuthenticationError('User account is not active');
  }

  return user;
};

// ─── Middleware exports ───────────────────────────────────────────────────────

/**
 * Require a valid access token.
 * Attaches req.user on success; forwards AuthenticationError to error handler on failure.
 */
export const authenticate = async (req, res, next) => {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optionally authenticate.
 * If a token is present and valid, populates req.user.
 * If absent or invalid, continues without req.user — never rejects.
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      req.user = await resolveUser(req);
    }
  } catch {
    // silently ignore — req.user remains undefined
    logger.debug('optionalAuthenticate: no valid token provided');
  }
  next();
};

/**
 * Role-based authorization guard.
 * Must be placed after authenticate().
 *
 * Usage: router.delete('/admin-only', authenticate, authorize('admin', 'superadmin'), handler)
 */
export const authorize = (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(new AuthenticationError('Not authenticated'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(`Access restricted to: ${allowedRoles.join(', ')}`)
      );
    }
    next();
  };

/**
 * Current-user enrichment middleware.
 * Must follow authenticate(). Fetches the CreatorProfile and attaches it
 * to req.profile so controllers never need to query it directly.
 *
 * Usage: router.get('/me', authenticate, currentUser, handler)
 */
export const currentUser = async (req, _res, next) => {
  try {
    if (!req.user) return next(new AuthenticationError('Not authenticated'));
    req.profile = await CreatorProfileRepository.findByUserId(req.user._id) ?? null;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Owner guard — the authenticated user must own the resource.
 * Checks req.params.userId against req.user._id.
 * Admins and superadmins bypass this check automatically.
 *
 * Usage: router.patch('/:userId/profile', authenticate, isOwner, handler)
 */
export const isOwner = (req, _res, next) => {
  if (!req.user) return next(new AuthenticationError('Not authenticated'));

  const { role } = req.user;
  if (role === 'admin' || role === 'superadmin') return next();

  const resourceOwnerId = req.params.userId;
  if (!resourceOwnerId) {
    return next(new AuthorizationError('Owner check requires a :userId route parameter'));
  }

  if (String(req.user._id) !== String(resourceOwnerId)) {
    return next(new AuthorizationError('You are not authorized to access this resource'));
  }

  next();
};
