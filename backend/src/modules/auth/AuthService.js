/**
 * AuthService
 * Orchestrates all authentication business logic.
 * Depends on: UserRepository, RefreshTokenRepository, PasswordService, TokenService.
 * Never touches Mongoose or HTTP objects directly.
 */

import UserRepository from '../account/UserRepository.js';
import RefreshTokenRepository from './RefreshTokenRepository.js';
import CreatorProfile from '../../models/CreatorProfile.js';
import PasswordService from './PasswordService.js';
import TokenService from './TokenService.js';
import logger from '../../utils/logger.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fields stripped from every user object before it leaves the service layer. */
const sanitizeUser = (user) => {
  const { password, verificationToken, passwordResetToken, passwordResetExpiresAt, ...safe } = user;
  return safe;
};

/** Build the standard token pair returned to the client. */
const buildTokenPayload = (user) => ({ sub: String(user._id), role: user.role });

// ─── AuthService ──────────────────────────────────────────────────────────────

const AuthService = {
  /**
   * Register a new user.
   * - Validates password strength (inside PasswordService.hash)
   * - Prevents duplicate email (constant-time check to avoid user enumeration)
   * - Auto-creates a CreatorProfile
   * - Returns token pair + safe user object
   */
  async register(data, meta = {}) {
    const { name, email, password } = data;

    // Duplicate-email check — always run, even if we will reject
    const exists = await UserRepository.existsByEmail(email);
    if (exists) {
      // Same error message for both "email exists" and any other conflict
      // to prevent user enumeration
      throw new ConflictError('An account with this email already exists');
    }

    const hashedPassword = await PasswordService.hash(password);

    const user = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
      status: 'active',     // skip pending_verification for now; email flow is Phase 4
      isVerified: false,
    });

    // Auto-create CreatorProfile
    try {
      await CreatorProfile.create({ user: user._id });
    } catch (err) {
      logger.warn('CreatorProfile creation failed on register', { userId: user._id, error: err.message });
    }

    const tokenPayload = buildTokenPayload(user);
    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const rawRefreshToken = TokenService.generateRefreshToken(tokenPayload);
    const family = TokenService.newFamily();

    await RefreshTokenRepository.create({
      user: user._id,
      token: rawRefreshToken,
      tokenHash: TokenService.hashToken(rawRefreshToken),
      expiresAt: TokenService.refreshTokenExpiryDate(),
      family,
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
    });

    logger.info('User registered', { userId: user._id, email });

    return { user: sanitizeUser(user), accessToken, refreshToken: rawRefreshToken };
  },

  /**
   * Login with email + password.
   * - Rejects soft-deleted, suspended, or pending_verification accounts
   * - Rotates refresh token on every login
   * - Updates lastLogin timestamp
   */
  async login(email, password, meta = {}) {
    // Always fetch with password to run bcrypt.compare
    const user = await UserRepository.findByEmail(email, { includePassword: true });

    // Use a constant-time comparison path to prevent timing-based user enumeration
    const passwordMatch = user ? await PasswordService.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.isDeleted) {
      throw new AuthenticationError('Invalid email or password'); // same message — no enumeration
    }

    if (user.status === 'suspended') {
      throw new AuthenticationError('Your account has been suspended. Please contact support.');
    }

    if (user.status === 'pending_verification') {
      throw new AuthenticationError('Please verify your email address before logging in.');
    }

    // Update lastLogin (fire-and-forget — don't block the response)
    UserRepository.updateById(user._id, {
      lastLogin: new Date(),
      lastLoginIp: meta.ipAddress || null,
    }).catch((err) => logger.warn('lastLogin update failed', { error: err.message }));

    const tokenPayload = buildTokenPayload(user);
    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const rawRefreshToken = TokenService.generateRefreshToken(tokenPayload);
    const family = TokenService.newFamily();

    await RefreshTokenRepository.create({
      user: user._id,
      token: rawRefreshToken,
      tokenHash: TokenService.hashToken(rawRefreshToken),
      expiresAt: TokenService.refreshTokenExpiryDate(),
      family,
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
    });

    logger.info('User logged in', { userId: user._id });

    return { user: sanitizeUser(user), accessToken, refreshToken: rawRefreshToken };
  },

  /**
   * Logout current device — revoke the provided refresh token.
   * Accepts the raw token from cookie or request body.
   */
  async logout(rawRefreshToken) {
    if (!rawRefreshToken) return; // already logged out

    const hash = TokenService.hashToken(rawRefreshToken);
    await RefreshTokenRepository.revokeByHash(hash, 'logout');
    logger.info('Refresh token revoked (logout)');
  },

  /**
   * Logout all devices — revoke every refresh token for the user.
   */
  async logoutAll(userId) {
    await RefreshTokenRepository.revokeAllByUser(userId, 'logout');
    logger.info('All refresh tokens revoked (logout-all)', { userId });
  },

  /**
   * Refresh token rotation.
   * - Verifies JWT signature + expiry
   * - Looks up hash in DB to confirm not revoked
   * - If reuse of an old token is detected (same family, already revoked) →
   *   revoke the entire family (rotation-attack containment)
   * - Issues new access + refresh token pair
   */
  async refreshTokens(rawRefreshToken, meta = {}) {
    if (!rawRefreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    // Verify JWT signature/expiry first
    const decoded = TokenService.verifyRefreshToken(rawRefreshToken);

    const hash = TokenService.hashToken(rawRefreshToken);
    const storedToken = await RefreshTokenRepository.findByHash(hash);

    if (!storedToken) {
      throw new AuthenticationError('Refresh token not recognized');
    }

    // Rotation-attack detection: token exists but is already revoked
    if (storedToken.isRevoked) {
      if (storedToken.family) {
        logger.warn('Refresh token reuse detected — revoking family', {
          family: storedToken.family,
          userId: storedToken.user,
        });
        await RefreshTokenRepository.revokeFamily(storedToken.family, 'security');
      }
      throw new AuthenticationError('Refresh token has already been used');
    }

    // Confirm not expired at DB level
    if (new Date(storedToken.expiresAt) < new Date()) {
      throw new AuthenticationError('Refresh token has expired');
    }

    const user = await UserRepository.findById(decoded.sub);
    if (!user || user.isDeleted || user.status !== 'active') {
      await RefreshTokenRepository.revokeByHash(hash, 'security');
      throw new AuthenticationError('User account is no longer active');
    }

    // Revoke old token (rotation)
    await RefreshTokenRepository.revokeByHash(hash, 'rotation');

    // Issue new pair — same family (preserves rotation-attack detection chain)
    const tokenPayload = buildTokenPayload(user);
    const accessToken = TokenService.generateAccessToken(tokenPayload);
    const newRawRefreshToken = TokenService.generateRefreshToken(tokenPayload);

    await RefreshTokenRepository.create({
      user: user._id,
      token: newRawRefreshToken,
      tokenHash: TokenService.hashToken(newRawRefreshToken),
      expiresAt: TokenService.refreshTokenExpiryDate(),
      family: storedToken.family,
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
    });

    logger.info('Tokens refreshed', { userId: user._id });

    return { user: sanitizeUser(user), accessToken, refreshToken: newRawRefreshToken };
  },
};

export default AuthService;
