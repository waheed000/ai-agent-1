/**
 * PlatformManager
 *
 * Orchestrates the full data sync pipeline for any platform.
 * Uses PlatformFactory to resolve the correct service instance.
 * Each sync step is isolated — a partial failure is recorded but
 * does not abort the remaining steps.
 *
 * Sync pipeline:
 *   1. Validate connection (refresh token if expired)
 *   2. Fetch + persist profile
 *   3. Fetch + persist posts
 *   4. Fetch + persist analytics (per post)
 *   5. Fetch + persist audience demographics
 *   6. Fetch + persist follower history snapshot
 *   7. Stamp lastSyncedAt on ConnectedAccount
 */

import PlatformFactory from './PlatformFactory.js';
import ConnectedAccountRepository from '../../repositories/ConnectedAccountRepository.js';
import PostRepository from '../../repositories/PostRepository.js';
import PostAnalyticsRepository from '../../repositories/PostAnalyticsRepository.js';
import AudienceAnalyticsRepository from '../../repositories/AudienceAnalyticsRepository.js';
import FollowersHistoryRepository from '../../repositories/FollowersHistoryRepository.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * @typedef {object} SyncResult
 * @property {string}   platform
 * @property {string}   status          'success' | 'partial' | 'failed'
 * @property {number}   durationMs
 * @property {Date}     lastSyncedAt
 * @property {object}   records         Counts per collection
 * @property {string[]} errors          Step-level error messages (partial failures)
 */

class PlatformManager {
  /**
   * Run a full sync for the given user + platform.
   *
   * @param {string} userId
   * @param {string} platform
   * @returns {Promise<SyncResult>}
   */
  async sync(userId, platform) {
    const startTime = Date.now();
    const errors = [];
    const records = { posts: 0, analytics: 0, audience: 0, followers: 0 };

    logger.info('Sync started', { userId, platform });

    // Resolve the platform service
    const service = PlatformFactory.getService(platform);

    // Fetch connected account
    const account = await ConnectedAccountRepository.findByUserAndPlatform(userId, platform);
    if (!account) {
      throw new NotFoundError(`${platform} account`);
    }
    const accountId = account._id;

    // ── Step 1: Validate / refresh ──────────────────────────────────────────
    let valid = false;
    try {
      valid = await service.validateConnection(userId);
      if (!valid) {
        // Attempt token refresh then re-validate
        await service.refreshAccessToken(userId);
        valid = await service.validateConnection(userId);
      }
    } catch (err) {
      await this._markError(userId, platform, err.message);
      throw new AppError(
        `Cannot connect to ${platform}: ${err.message}`,
        err.statusCode || 502,
        err.code || 'PLATFORM_ERROR'
      );
    }

    if (!valid) {
      await this._markError(userId, platform, 'Token validation failed after refresh');
      throw new AppError(`${platform} credentials are invalid`, 401, 'AUTH_ERROR');
    }

    // ── Step 2: Profile ─────────────────────────────────────────────────────
    try {
      const profile = await service.fetchProfile(userId);
      await ConnectedAccountRepository.updateByUserAndPlatform(userId, platform, {
        platformUserId: profile.platformUserId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
        postCount: profile.postCount,
        status: 'active',
        syncError: null,
      });
    } catch (err) {
      errors.push(`profile: ${err.message}`);
      logger.warn('Sync: profile step failed', { userId, platform, error: err.message });
    }

    // ── Step 3: Posts ───────────────────────────────────────────────────────
    let posts = [];
    try {
      posts = await service.fetchPosts(userId, { maxResults: 50 });
      const result = await PostRepository.bulkUpsert(userId, accountId, platform, posts);
      records.posts = result.upsertedCount + result.modifiedCount;
    } catch (err) {
      errors.push(`posts: ${err.message}`);
      logger.warn('Sync: posts step failed', { userId, platform, error: err.message });
    }

    // ── Step 4: Analytics ───────────────────────────────────────────────────
    if (posts.length > 0) {
      try {
        const platformPostIds = posts.map((p) => p.platformPostId).filter(Boolean);
        const analytics = await service.fetchAnalytics(userId, platformPostIds);

        // Map platformPostId → DB Post._id for the analytics upsert
        const analyticsWithIds = await Promise.all(
          analytics.map(async (a) => {
            const post = await PostRepository.findByPlatformPostId(a.platformPostId, platform);
            if (!post) return null;
            return { postId: post._id, ...a };
          })
        );

        const validAnalytics = analyticsWithIds.filter(Boolean);
        const result = await PostAnalyticsRepository.bulkUpsert(userId, validAnalytics);
        records.analytics = result.upsertedCount + result.modifiedCount;
      } catch (err) {
        errors.push(`analytics: ${err.message}`);
        logger.warn('Sync: analytics step failed', { userId, platform, error: err.message });
      }
    }

    // ── Step 5: Audience ────────────────────────────────────────────────────
    try {
      const audience = await service.fetchAudience(userId);
      await AudienceAnalyticsRepository.upsert(
        userId, accountId, platform, audience.snapshotDate, audience
      );
      records.audience = 1;
    } catch (err) {
      errors.push(`audience: ${err.message}`);
      logger.warn('Sync: audience step failed', { userId, platform, error: err.message });
    }

    // ── Step 6: Followers ───────────────────────────────────────────────────
    try {
      const followerData = await service.fetchFollowers(userId);
      await FollowersHistoryRepository.upsert(
        userId, accountId, platform,
        followerData.date,
        followerData.followers,
        followerData.following
      );
      records.followers = 1;
    } catch (err) {
      errors.push(`followers: ${err.message}`);
      logger.warn('Sync: followers step failed', { userId, platform, error: err.message });
    }

    // ── Step 7: Stamp lastSyncedAt ──────────────────────────────────────────
    const lastSyncedAt = new Date();
    await ConnectedAccountRepository.updateByUserAndPlatform(userId, platform, {
      lastSyncedAt,
      syncError: errors.length > 0 ? errors.join('; ') : null,
    });

    const durationMs = Date.now() - startTime;
    const status = errors.length === 0 ? 'success' : errors.length < 4 ? 'partial' : 'failed';

    logger.info('Sync completed', { userId, platform, status, durationMs, records, errors });

    return { platform, status, durationMs, lastSyncedAt, records, errors };
  }

  /**
   * Get current sync status for a platform (reads from ConnectedAccount).
   */
  async getStatus(userId, platform) {
    const account = await ConnectedAccountRepository.findByUserAndPlatform(userId, platform);
    if (!account) throw new NotFoundError(`${platform} account`);

    return {
      platform,
      connected: true,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt || null,
      syncError: account.syncError || null,
      followerCount: account.followerCount,
      followingCount: account.followingCount,
      postCount: account.postCount,
      username: account.username || null,
    };
  }

  /** Mark the connected account with a sync error. */
  async _markError(userId, platform, message) {
    try {
      await ConnectedAccountRepository.updateByUserAndPlatform(userId, platform, {
        status: 'error',
        syncError: message,
      });
    } catch {
      // Best-effort
    }
  }
}

export default new PlatformManager();
