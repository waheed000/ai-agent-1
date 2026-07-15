/**
 * RefreshTokenRepository
 * All RefreshToken database operations are isolated here.
 */

import RefreshToken from '../models/RefreshToken.js';
import { DatabaseError } from '../utils/errors.js';

class RefreshTokenRepository {
  /**
   * Persist a new refresh token document.
   */
  async create(data) {
    try {
      // Never persist the raw token — only the hash
      const { token: _raw, ...safeData } = data;
      const doc = new RefreshToken(safeData);
      await doc.save();
      return doc.toObject();
    } catch (err) {
      throw new DatabaseError(`create refresh token failed: ${err.message}`);
    }
  }

  /**
   * Find an active (non-revoked, non-expired) token by its hash.
   */
  async findActiveByHash(tokenHash) {
    try {
      return await RefreshToken.findOne({
        tokenHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      }).lean();
    } catch (err) {
      throw new DatabaseError(`findActiveByHash failed: ${err.message}`);
    }
  }

  /**
   * Find any token by hash (regardless of revocation/expiry).
   * Used for rotation-attack detection.
   */
  async findByHash(tokenHash) {
    try {
      return await RefreshToken.findOne({ tokenHash }).lean();
    } catch (err) {
      throw new DatabaseError(`findByHash failed: ${err.message}`);
    }
  }

  /**
   * Find all active tokens belonging to the same token family.
   * Used to revoke an entire family on rotation-attack detection.
   */
  async findActiveByFamily(family) {
    try {
      return await RefreshToken.find({
        family,
        isRevoked: false,
      }).lean();
    } catch (err) {
      throw new DatabaseError(`findActiveByFamily failed: ${err.message}`);
    }
  }

  /**
   * Revoke a single token by its hash.
   */
  async revokeByHash(tokenHash, reason = 'logout') {
    try {
      return await RefreshToken.findOneAndUpdate(
        { tokenHash },
        { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: reason } },
        { new: true }
      );
    } catch (err) {
      throw new DatabaseError(`revokeByHash failed: ${err.message}`);
    }
  }

  /**
   * Revoke all active tokens for a user (logout-all / security event).
   */
  async revokeAllByUser(userId, reason = 'logout') {
    try {
      return await RefreshToken.updateMany(
        { user: userId, isRevoked: false },
        { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: reason } }
      );
    } catch (err) {
      throw new DatabaseError(`revokeAllByUser failed: ${err.message}`);
    }
  }

  /**
   * Revoke all tokens in a family (rotation-attack containment).
   */
  async revokeFamily(family, reason = 'security') {
    try {
      return await RefreshToken.updateMany(
        { family, isRevoked: false },
        { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: reason } }
      );
    } catch (err) {
      throw new DatabaseError(`revokeFamily failed: ${err.message}`);
    }
  }

  /**
   * Update lastUsedAt on a token (stamp each use).
   */
  async touchLastUsed(tokenHash) {
    try {
      await RefreshToken.updateOne({ tokenHash }, { $set: { lastUsedAt: new Date() } });
    } catch (err) {
      throw new DatabaseError(`touchLastUsed failed: ${err.message}`);
    }
  }
}

export default new RefreshTokenRepository();
