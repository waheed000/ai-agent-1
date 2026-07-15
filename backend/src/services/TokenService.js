/**
 * TokenService
 * Generates, verifies, and hashes JWT access tokens and refresh tokens.
 * The two token types use separate secrets and separate expiry values.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import { AuthenticationError } from '../utils/errors.js';

const TokenService = {
  // ─── Access Token ─────────────────────────────────────────────────────────

  generateAccessToken(payload) {
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
      issuer: 'creator-os',
    });
  },

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtSecret, { issuer: 'creator-os' });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Access token has expired');
      }
      throw new AuthenticationError('Invalid access token');
    }
  },

  // ─── Refresh Token ────────────────────────────────────────────────────────

  generateRefreshToken(payload) {
    return jwt.sign(
      { ...payload, jti: crypto.randomUUID() }, // jti guarantees uniqueness even within same second
      config.auth.jwtRefreshSecret,
      { expiresIn: config.auth.jwtRefreshExpiresIn, issuer: 'creator-os' }
    );
  },

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtRefreshSecret, { issuer: 'creator-os' });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Refresh token has expired');
      }
      throw new AuthenticationError('Invalid refresh token');
    }
  },

  // ─── Shared helpers ───────────────────────────────────────────────────────

  /**
   * Decode a token WITHOUT verifying the signature.
   * Use only for inspecting payload of an already-verified token,
   * or for reading expiry from an expired token during error handling.
   */
  decode(token) {
    return jwt.decode(token);
  },

  /**
   * SHA-256 hash of a token string — stored in the database instead of the raw token.
   * Deterministic: same input always produces the same hash.
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Derive expiry Date from the refresh token config string (e.g. "7d", "30d").
   */
  refreshTokenExpiryDate() {
    const raw = config.auth.jwtRefreshExpiresIn; // e.g. "7d"
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d

    const value = parseInt(match[1], 10);
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return new Date(Date.now() + value * multipliers[match[2]]);
  },

  /**
   * Generate a unique token family ID (used for rotation-attack detection).
   */
  newFamily() {
    return crypto.randomUUID();
  },
};

export default TokenService;
