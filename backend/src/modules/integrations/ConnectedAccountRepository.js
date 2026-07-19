/**
 * ConnectedAccountRepository
 * All ConnectedAccount database operations in one place.
 * OAuth access/refresh tokens are encrypted at rest using EncryptionService.
 */

import ConnectedAccount from '../../models/ConnectedAccount.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { DatabaseError, NotFoundError } from '../../utils/errors.js';

/** Encrypt token fields before persisting. */
function encryptTokens(data) {
  const out = { ...data };
  if (out.accessToken !== undefined) out.accessToken = out.accessToken ? encrypt(out.accessToken) : null;
  if (out.refreshToken !== undefined) out.refreshToken = out.refreshToken ? encrypt(out.refreshToken) : null;
  return out;
}

/** Decrypt token fields after reading (only when explicitly selected). */
function decryptTokens(doc) {
  if (!doc) return doc;
  const out = { ...doc };
  if (out.accessToken) {
    try { out.accessToken = decrypt(out.accessToken); } catch { out.accessToken = null; }
  }
  if (out.refreshToken) {
    try { out.refreshToken = decrypt(out.refreshToken); } catch { out.refreshToken = null; }
  }
  return out;
}

class ConnectedAccountRepository {
  /**
   * Find all connected accounts for a user (tokens excluded by default).
   */
  async findAllByUser(userId) {
    try {
      return await ConnectedAccount.notDeleted().find({ user: userId }).lean();
    } catch (err) {
      throw new DatabaseError(`findAllByUser failed: ${err.message}`);
    }
  }

  /**
   * Find a specific platform account for a user.
   */
  async findByUserAndPlatform(userId, platform) {
    try {
      return await ConnectedAccount.notDeleted().findOne({ user: userId, platform }).lean();
    } catch (err) {
      throw new DatabaseError(`findByUserAndPlatform failed: ${err.message}`);
    }
  }

  /**
   * Find a specific platform account WITH decrypted tokens (for internal use only).
   */
  async findByUserAndPlatformWithTokens(userId, platform) {
    try {
      const doc = await ConnectedAccount.notDeleted()
        .findOne({ user: userId, platform })
        .select('+accessToken +refreshToken +tokenExpiresAt')
        .lean();
      return decryptTokens(doc);
    } catch (err) {
      throw new DatabaseError(`findByUserAndPlatformWithTokens failed: ${err.message}`);
    }
  }

  /**
   * Create or update a connected account (upsert by user + platform).
   * Encrypts token fields before persisting.
   */
  async upsert(userId, platform, data) {
    try {
      const safeData = encryptTokens(data);
      const doc = await ConnectedAccount.findOneAndUpdate(
        { user: userId, platform },
        {
          $set: {
            ...safeData,
            user: userId,
            platform,
            isDeleted: false,
            deletedAt: null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      return doc;
    } catch (err) {
      throw new DatabaseError(`upsert failed: ${err.message}`);
    }
  }

  /**
   * Update fields on an existing connected account.
   * Encrypts any token fields included in the update.
   */
  async updateByUserAndPlatform(userId, platform, updates) {
    try {
      const safeUpdates = encryptTokens(updates);
      const doc = await ConnectedAccount.findOneAndUpdate(
        { user: userId, platform, isDeleted: false },
        { $set: safeUpdates },
        { new: true }
      ).lean();
      return doc;
    } catch (err) {
      throw new DatabaseError(`updateByUserAndPlatform failed: ${err.message}`);
    }
  }

  /**
   * Soft-delete a connected account (disconnect a platform).
   */
  async softDeleteByUserAndPlatform(userId, platform) {
    try {
      const doc = await ConnectedAccount.findOne({ user: userId, platform, isDeleted: false });
      if (!doc) throw new NotFoundError('Connected account');
      await doc.softDelete();
      return doc.toObject();
    } catch (err) {
      if (err.code === 'NOT_FOUND') throw err;
      throw new DatabaseError(`softDeleteByUserAndPlatform failed: ${err.message}`);
    }
  }

  /**
   * Hard-delete all connected accounts for a user (called on account deletion).
   */
  async deleteAllByUser(userId) {
    try {
      return await ConnectedAccount.deleteMany({ user: userId });
    } catch (err) {
      throw new DatabaseError(`deleteAllByUser failed: ${err.message}`);
    }
  }
}

export default new ConnectedAccountRepository();
