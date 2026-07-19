/**
 * AnalyticsRepository
 * MongoDB aggregation queries for analytics calculations.
 * All methods return plain objects (lean).
 */

import Post from '../../models/Post.js';
import PostAnalytics from '../../models/PostAnalytics.js';
import FollowersHistory from '../../models/FollowersHistory.js';
import AudienceAnalytics from '../../models/AudienceAnalytics.js';
import { DatabaseError } from '../../utils/errors.js';

class AnalyticsRepository {
  // ─── Posts ─────────────────────────────────────────────────────────────────

  /**
   * Get posts for a user within a date range, optionally filtered by platform.
   */
  async findPosts(userId, { platform, startDate, endDate, limit = 500 } = {}) {
    try {
      const filter = {
        user: userId,
        status: 'published',
        isDeleted: false,
        ...(platform && { platform }),
        ...(startDate || endDate
          ? {
              publishedAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await Post.find(filter)
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.findPosts failed: ${err.message}`);
    }
  }

  /**
   * Aggregate total engagement across all posts for a user in a period.
   */
  async aggregateEngagement(userId, { platform, startDate, endDate } = {}) {
    try {
      const match = {
        user: userId,
        status: 'published',
        isDeleted: false,
        ...(platform && { platform }),
        ...(startDate || endDate
          ? {
              publishedAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      const [result] = await Post.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: '$engagement.likes' },
            totalComments: { $sum: '$engagement.comments' },
            totalShares: { $sum: '$engagement.shares' },
            totalSaves: { $sum: '$engagement.saves' },
            totalViews: { $sum: '$engagement.views' },
            totalReach: { $sum: '$engagement.reach' },
            totalImpressions: { $sum: '$engagement.impressions' },
            avgEngagementRate: { $avg: '$engagementRate' },
          },
        },
      ]);

      return (
        result || {
          totalPosts: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalSaves: 0,
          totalViews: 0,
          totalReach: 0,
          totalImpressions: 0,
          avgEngagementRate: 0,
        }
      );
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.aggregateEngagement failed: ${err.message}`);
    }
  }

  /**
   * Engagement aggregated per platform for a user.
   */
  async engagementByPlatform(userId, { startDate, endDate } = {}) {
    try {
      const match = {
        user: userId,
        status: 'published',
        isDeleted: false,
        ...(startDate || endDate
          ? {
              publishedAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await Post.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$platform',
            postCount: { $sum: 1 },
            totalLikes: { $sum: '$engagement.likes' },
            totalComments: { $sum: '$engagement.comments' },
            totalShares: { $sum: '$engagement.shares' },
            totalViews: { $sum: '$engagement.views' },
            totalReach: { $sum: '$engagement.reach' },
            totalImpressions: { $sum: '$engagement.impressions' },
            avgEngagementRate: { $avg: '$engagementRate' },
          },
        },
        { $project: { platform: '$_id', _id: 0, postCount: 1, totalLikes: 1, totalComments: 1, totalShares: 1, totalViews: 1, totalReach: 1, totalImpressions: 1, avgEngagementRate: 1 } },
        { $sort: { postCount: -1 } },
      ]);
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.engagementByPlatform failed: ${err.message}`);
    }
  }

  /**
   * Get top N posts by engagement rate.
   */
  async findTopPosts(userId, { platform, startDate, endDate, limit = 10 } = {}) {
    try {
      const filter = {
        user: userId,
        status: 'published',
        isDeleted: false,
        ...(platform && { platform }),
        ...(startDate || endDate
          ? {
              publishedAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await Post.find(filter)
        .sort({ engagementRate: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.findTopPosts failed: ${err.message}`);
    }
  }

  /**
   * Get worst N posts by engagement rate (published posts only).
   */
  async findBottomPosts(userId, { platform, startDate, endDate, limit = 10 } = {}) {
    try {
      const filter = {
        user: userId,
        status: 'published',
        isDeleted: false,
        engagementRate: { $gt: 0 }, // exclude posts with no data
        ...(platform && { platform }),
        ...(startDate || endDate
          ? {
              publishedAt: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await Post.find(filter)
        .sort({ engagementRate: 1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.findBottomPosts failed: ${err.message}`);
    }
  }

  // ─── Followers History ─────────────────────────────────────────────────────

  /**
   * Get follower snapshots for a user in a date range.
   */
  async findFollowerHistory(userId, { platform, startDate, endDate, limit = 90 } = {}) {
    try {
      const filter = {
        user: userId,
        ...(platform && { platform }),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await FollowersHistory.find(filter)
        .sort({ date: 1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.findFollowerHistory failed: ${err.message}`);
    }
  }

  /**
   * Aggregate follower history across platforms (sum per day).
   */
  async aggregateFollowerHistory(userId, { startDate, endDate } = {}) {
    try {
      const match = {
        user: userId,
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await FollowersHistory.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$date',
            totalFollowers: { $sum: '$followers' },
            totalDelta: { $sum: '$delta' },
          },
        },
        { $project: { date: '$_id', _id: 0, totalFollowers: 1, totalDelta: 1 } },
        { $sort: { date: 1 } },
      ]);
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.aggregateFollowerHistory failed: ${err.message}`);
    }
  }

  // ─── Audience Analytics ────────────────────────────────────────────────────

  /**
   * Get the most recent audience analytics snapshot per platform.
   */
  async findLatestAudienceSnapshots(userId, { platform } = {}) {
    try {
      const match = {
        user: userId,
        ...(platform && { platform }),
      };

      return await AudienceAnalytics.aggregate([
        { $match: match },
        { $sort: { snapshotDate: -1 } },
        { $group: { _id: '$platform', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
      ]);
    } catch (err) {
      throw new DatabaseError(
        `AnalyticsRepository.findLatestAudienceSnapshots failed: ${err.message}`
      );
    }
  }

  /**
   * Get audience snapshots for trending analysis over a period.
   */
  async findAudienceHistory(userId, { platform, startDate, endDate, limit = 60 } = {}) {
    try {
      const filter = {
        user: userId,
        ...(platform && { platform }),
        ...(startDate || endDate
          ? {
              snapshotDate: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await AudienceAnalytics.find(filter)
        .sort({ snapshotDate: 1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`AnalyticsRepository.findAudienceHistory failed: ${err.message}`);
    }
  }

  // ─── Post Analytics (snapshots) ───────────────────────────────────────────

  /**
   * Aggregate daily post analytics for chart data.
   */
  async aggregateDailyPostAnalytics(userId, { platform, startDate, endDate } = {}) {
    try {
      const postFilter = {
        user: userId,
        status: 'published',
        isDeleted: false,
        ...(platform && { platform }),
      };

      const posts = await Post.find(postFilter).select('_id').lean();
      const postIds = posts.map((p) => p._id);

      if (postIds.length === 0) return [];

      const match = {
        post: { $in: postIds },
        user: userId,
        ...(startDate || endDate
          ? {
              snapshotDate: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await PostAnalytics.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$snapshotDate',
            totalLikes: { $sum: '$engagement.likes' },
            totalComments: { $sum: '$engagement.comments' },
            totalShares: { $sum: '$engagement.shares' },
            totalViews: { $sum: '$engagement.views' },
            totalReach: { $sum: '$engagement.reach' },
            avgEngagementRate: { $avg: '$engagementRate' },
            postCount: { $sum: 1 },
          },
        },
        {
          $project: {
            date: '$_id',
            _id: 0,
            totalLikes: 1,
            totalComments: 1,
            totalShares: 1,
            totalViews: 1,
            totalReach: 1,
            avgEngagementRate: 1,
            postCount: 1,
          },
        },
        { $sort: { date: 1 } },
      ]);
    } catch (err) {
      throw new DatabaseError(
        `AnalyticsRepository.aggregateDailyPostAnalytics failed: ${err.message}`
      );
    }
  }
}

export default new AnalyticsRepository();
