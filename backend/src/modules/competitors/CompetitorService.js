/**
 * CompetitorService
 * Orchestrates competitor tracking, sync pipeline, and scoring.
 */

import CompetitorRepository from './CompetitorRepository.js';
import CompetitorPostRepository from './CompetitorPostRepository.js';
import CompetitorAnalyticsRepository from './CompetitorAnalyticsRepository.js';
import CacheService from '../../infrastructure/cache/index.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import { calcGrowthRate } from '../../utils/analytics/growthCalc.js';
import { calcConsistencyScore } from '../../utils/analytics/consistencyCalc.js';
import logger from '../../utils/logger.js';

const MAX_COMPETITORS = 20; // per-user limit

const CompetitorService = {
  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async addCompetitor(userId, data) {
    const count = await CompetitorRepository.countByUser(userId);
    if (count >= MAX_COMPETITORS) {
      const err = new Error(`You can track up to ${MAX_COMPETITORS} competitors`);
      err.code = 'LIMIT_EXCEEDED';
      err.isOperational = true;
      throw err;
    }

    const competitor = await CompetitorRepository.create(userId, data);
    logger.info('CompetitorService: competitor added', {
      userId,
      competitorId: competitor._id,
      platform: competitor.platform,
      username: competitor.username,
    });

    return competitor;
  },

  async listCompetitors(userId, filters = {}) {
    return CompetitorRepository.findAllByUser(userId, filters);
  },

  async deleteCompetitor(userId, competitorId) {
    await CompetitorRepository.softDelete(competitorId, userId);
    await CacheService.delPattern('competitors', `${userId}:`);
    logger.info('CompetitorService: competitor removed', { userId, competitorId });
  },

  // ─── Overview ─────────────────────────────────────────────────────────────

  async getOverview(userId, competitorId) {
    const cacheKey = `${userId}:${competitorId}:overview`;
    return CacheService.getOrSet('competitors', cacheKey, async () => {
      const competitor = await CompetitorRepository.findByIdAndUser(competitorId, userId);
      if (!competitor) {
        const err = new Error('Competitor not found');
        err.code = 'NOT_FOUND';
        err.isOperational = true;
        throw err;
      }

      const [topPosts, engagement, hashtags, formatMix, latestSnapshot, history] =
        await Promise.all([
          CompetitorPostRepository.findTopByEngagement(competitorId, 5),
          CompetitorPostRepository.aggregateEngagement(competitorId),
          CompetitorPostRepository.aggregateHashtags(competitorId, 10),
          CompetitorPostRepository.aggregateFormatMix(competitorId),
          CompetitorAnalyticsRepository.findLatest(competitorId),
          CompetitorAnalyticsRepository.findHistory(competitorId, { limit: 30 }),
        ]);

      return {
        competitor,
        engagement,
        topPosts,
        hashtags,
        formatMix,
        latestSnapshot,
        followerHistory: history.map((h) => ({
          date: h.snapshotDate,
          followers: h.followerCount,
          avgEngagementRate: h.avgEngagementRate,
        })),
        scores: latestSnapshot?.scores || null,
      };
    });
  },

  // ─── Sync pipeline ────────────────────────────────────────────────────────

  /**
   * Full sync pipeline for a competitor:
   * 1. Fetch profile metrics
   * 2. Fetch recent posts + engagement
   * 3. Fetch hashtags (derived from posts)
   * 4. Compute posting frequency
   * 5. Compute comparison scores vs the tracking user
   * 6. Store analytics snapshot
   */
  async syncCompetitor(userId, competitorId) {
    const competitor = await CompetitorRepository.findByIdAndUser(competitorId, userId);
    if (!competitor) {
      const err = new Error('Competitor not found');
      err.code = 'NOT_FOUND';
      err.isOperational = true;
      throw err;
    }

    logger.info('CompetitorService: sync started', {
      userId,
      competitorId,
      platform: competitor.platform,
      username: competitor.username,
    });

    const steps = {};

    // Step 1 — profile (stub; replace with real platform API in production)
    steps.profile = await this._fetchProfile(competitor);

    // Step 2 — posts (stub)
    steps.posts = await this._fetchRecentPosts(competitor);

    // Step 3 — store posts
    if (steps.posts.length > 0) {
      const bulkResult = await CompetitorPostRepository.bulkUpsert(
        competitorId, userId, steps.posts
      );
      logger.info('CompetitorService: posts stored', { competitorId, ...bulkResult });
    }

    // Step 4 — aggregate engagement and frequency
    const [engagement, postsLastWeek, postsLastMonth, hashtags, formatMixRaw] = await Promise.all([
      CompetitorPostRepository.aggregateEngagement(competitorId),
      CompetitorPostRepository.countRecentPosts(competitorId, 7),
      CompetitorPostRepository.countRecentPosts(competitorId, 30),
      CompetitorPostRepository.aggregateHashtags(competitorId, 10),
      CompetitorPostRepository.aggregateFormatMix(competitorId),
    ]);

    const postFrequencyPerWeek = Math.round((postsLastMonth / 30) * 7 * 10) / 10;

    // Step 5 — update cached competitor metrics
    await CompetitorRepository.updateMetrics(competitorId, {
      followerCount: steps.profile.followerCount,
      followingCount: steps.profile.followingCount,
      postCount: steps.profile.postCount,
      avgEngagementRate: engagement.avgEngagementRate,
      avgPostFrequency: postFrequencyPerWeek,
    });

    // Step 6 — compute comparison scores and store snapshot
    const scores = this._computeScores(competitor, engagement, postFrequencyPerWeek, steps.profile);

    const formatMix = formatMixRaw.reduce((acc, { format, count }) => {
      acc[format] = count;
      return acc;
    }, {});

    const snapshot = await CompetitorAnalyticsRepository.createSnapshot(competitorId, userId, {
      snapshotDate: new Date(),
      followerCount: steps.profile.followerCount,
      followingCount: steps.profile.followingCount,
      postCount: steps.profile.postCount,
      avgEngagementRate: engagement.avgEngagementRate,
      avgLikes: engagement.avgLikes,
      avgComments: engagement.avgComments,
      avgShares: engagement.avgShares,
      avgViews: engagement.avgViews,
      postsLastWeek,
      postsLastMonth,
      postFrequencyPerWeek,
      topHashtags: hashtags.map((h) => h.hashtag),
      formatMix,
      scores,
    });

    // Invalidate cache
    await CacheService.delPattern('competitors', `${userId}:`);

    eventBus.emit(EVENT_TYPES.COMPETITOR_UPDATED, {
      userId,
      competitorId,
      platform: competitor.platform,
    });

    logger.info('CompetitorService: sync complete', {
      userId,
      competitorId,
      postsStored: steps.posts.length,
    });

    return {
      success: true,
      competitorId,
      postsStored: steps.posts.length,
      snapshot: snapshot._id,
      scores,
    };
  },

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Stub: returns simulated profile data.
   * Replace with a real platform API call in production.
   */
  async _fetchProfile(competitor) {
    return {
      followerCount: competitor.followerCount || Math.round(1000 + Math.random() * 99000),
      followingCount: competitor.followingCount || Math.round(100 + Math.random() * 900),
      postCount: competitor.postCount || Math.round(50 + Math.random() * 450),
      bio: competitor.bio || null,
    };
  },

  /**
   * Stub: returns simulated recent posts.
   * Replace with a real platform API call in production.
   */
  async _fetchRecentPosts(competitor) {
    const formats = ['short_video', 'image', 'carousel', 'reel', 'story'];
    const posts = [];
    const now = Date.now();

    for (let i = 0; i < 12; i++) {
      const engLikes = Math.round(100 + Math.random() * 5000);
      const engViews = Math.round(engLikes * (5 + Math.random() * 20));
      const followers = competitor.followerCount || 10000;
      const engRate = Math.round((engLikes / followers) * 10000) / 100;

      posts.push({
        platformPostId: `${competitor.platform}_${competitor.username}_${i}_${Date.now()}`,
        format: formats[Math.floor(Math.random() * formats.length)],
        publishedAt: new Date(now - i * 2 * 86_400_000),
        engagement: {
          likes: engLikes,
          comments: Math.round(engLikes * 0.05),
          shares: Math.round(engLikes * 0.02),
          saves: Math.round(engLikes * 0.01),
          views: engViews,
        },
        engagementRate: engRate,
        hashtags: ['content', 'creator', competitor.platform].slice(0, 3),
      });
    }

    return posts;
  },

  /**
   * Compute comparison scores relative to the tracking user's own metrics.
   */
  _computeScores(competitor, competitorEngagement, competitorFrequency, profile) {
    // In production these would compare against the user's actual metrics.
    // For now we produce a relative score using benchmark thresholds.
    const GOOD_ENGAGEMENT = 3.0; // 3% is considered good
    const GOOD_FREQUENCY = 5; // 5 posts/week

    const engagementDiff = competitorEngagement.avgEngagementRate - GOOD_ENGAGEMENT;
    const engagementComparison = Math.max(-100, Math.min(100, Math.round(engagementDiff * 10)));
    const frequencyScore = Math.min(100, Math.round((competitorFrequency / GOOD_FREQUENCY) * 100));
    const followerRatio = Math.min(100, Math.round((profile.followerCount / 100_000) * 100));

    const overallThreat = Math.round(
      (Math.abs(engagementComparison) + frequencyScore + followerRatio) / 3
    );

    return {
      engagementComparison,
      growthComparison: 0, // requires historical comparison — set on subsequent syncs
      consistencyComparison: frequencyScore,
      contentFrequency: frequencyScore,
      overallThreat: Math.min(100, overallThreat),
    };
  },
};

export default CompetitorService;
