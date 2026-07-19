/**
 * ConnectedAccountService
 * Business logic for managing connected social media accounts.
 * Token encryption/decryption is handled by ConnectedAccountRepository.
 */

import ConnectedAccountRepository from './ConnectedAccountRepository.js';
import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/** Fields exposed in the public API response (tokens are never returned). */
function toPublicView(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    platform: doc.platform,
    platformUserId: doc.platformUserId,
    username: doc.username || null,
    displayName: doc.displayName || null,
    profileUrl: doc.profileUrl || null,
    avatarUrl: doc.avatarUrl || null,
    scopes: doc.scopes || [],
    followerCount: doc.followerCount,
    followingCount: doc.followingCount,
    postCount: doc.postCount,
    status: doc.status,
    lastSyncedAt: doc.lastSyncedAt || null,
    syncError: doc.syncError || null,
    connectedAt: doc.createdAt,
  };
}

const ConnectedAccountService = {
  /**
   * List all connected accounts for a user.
   */
  async listConnectedAccounts(userId) {
    const accounts = await ConnectedAccountRepository.findAllByUser(userId);
    return accounts.map(toPublicView);
  },

  /**
   * Disconnect (soft-delete) a connected platform account.
   * Called when a user revokes access to a platform.
   */
  async disconnectPlatform(userId, platform) {
    const existing = await ConnectedAccountRepository.findByUserAndPlatform(userId, platform);
    if (!existing) throw new NotFoundError(`${platform} account`);

    await ConnectedAccountRepository.softDeleteByUserAndPlatform(userId, platform);
    logger.info('Platform disconnected', { userId, platform });
  },

  /**
   * Retrieve a single connected account by platform (public view, no tokens).
   */
  async getByPlatform(userId, platform) {
    const doc = await ConnectedAccountRepository.findByUserAndPlatform(userId, platform);
    if (!doc) throw new NotFoundError(`${platform} account`);
    return toPublicView(doc);
  },
};

export default ConnectedAccountService;
