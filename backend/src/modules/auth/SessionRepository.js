/**
 * SessionRepository
 * Sessions are backed by RefreshToken documents.
 * This repository provides session-oriented queries on top of that collection.
 */

import RefreshToken from '../../models/RefreshToken.js';
import { DatabaseError } from '../../utils/errors.js';

class SessionRepository {
  /**
   * List all active sessions for a user.
   */
  async findActiveByUser(userId) {
    try {
      return await RefreshToken.find({
        user: userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
        .select('-tokenHash -family -revokedAt -revokedReason')
        .sort({ lastUsedAt: -1, createdAt: -1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`findActiveByUser failed: ${err.message}`);
    }
  }

  /**
   * Find a single active session by its document ID.
   */
  async findActiveById(sessionId) {
    try {
      return await RefreshToken.findOne({
        _id: sessionId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      }).lean();
    } catch (err) {
      throw new DatabaseError(`findActiveById failed: ${err.message}`);
    }
  }

  /**
   * Revoke a single session by document ID.
   * Only revokes if it belongs to the given user (prevents cross-user revocation).
   */
  async revokeById(sessionId, userId, reason = 'logout') {
    try {
      return await RefreshToken.findOneAndUpdate(
        { _id: sessionId, user: userId, isRevoked: false },
        { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: reason } },
        { new: true }
      );
    } catch (err) {
      throw new DatabaseError(`revokeById failed: ${err.message}`);
    }
  }

  /**
   * Revoke all sessions for a user EXCEPT the one identified by excludeTokenHash.
   * Used by "logout all other devices".
   */
  async revokeAllExcept(userId, excludeTokenHash, reason = 'logout') {
    try {
      return await RefreshToken.updateMany(
        {
          user: userId,
          isRevoked: false,
          tokenHash: { $ne: excludeTokenHash },
        },
        { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: reason } }
      );
    } catch (err) {
      throw new DatabaseError(`revokeAllExcept failed: ${err.message}`);
    }
  }

  /**
   * Count active sessions for a user.
   */
  async countActive(userId) {
    try {
      return await RefreshToken.countDocuments({
        user: userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });
    } catch (err) {
      throw new DatabaseError(`countActive failed: ${err.message}`);
    }
  }
}

export default new SessionRepository();
