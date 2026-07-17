/**
 * CompetitorPostRepository
 * Data access for CompetitorPost snapshots.
 * Posts are NEVER overwritten — upsert by platformPostId + competitor.
 */

import CompetitorPost from '../models/CompetitorPost.js';
import { DatabaseError } from '../utils/errors.js';

class CompetitorPostRepository {
  /**
   * Upsert a single competitor post.
   * Uses platformPostId + competitor as the unique key.
   */
  async upsert(competitorId, userId, postData) {
    try {
      const { platformPostId, format, caption, hashtags, postUrl, thumbnailUrl,
              publishedAt, engagement, engagementRate } = postData;

      return await CompetitorPost.findOneAndUpdate(
        { platformPostId, competitor: competitorId },
        {
          $setOnInsert: {
            competitor: competitorId,
            trackedBy: userId,
            platformPostId,
            publishedAt,
          },
          $set: {
            format: format || 'other',
            caption: caption || null,
            hashtags: hashtags || [],
            postUrl: postUrl || null,
            thumbnailUrl: thumbnailUrl || null,
            engagement: engagement || {},
            engagementRate: engagementRate || 0,
          },
        },
        { upsert: true, new: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.upsert failed: ${err.message}`);
    }
  }

  /**
   * Bulk upsert a batch of competitor posts.
   */
  async bulkUpsert(competitorId, userId, posts = []) {
    try {
      const ops = posts.map((post) => ({
        updateOne: {
          filter: { platformPostId: post.platformPostId, competitor: competitorId },
          update: {
            $setOnInsert: {
              competitor: competitorId,
              trackedBy: userId,
              platformPostId: post.platformPostId,
              publishedAt: post.publishedAt,
            },
            $set: {
              format: post.format || 'other',
              caption: post.caption || null,
              hashtags: post.hashtags || [],
              postUrl: post.postUrl || null,
              thumbnailUrl: post.thumbnailUrl || null,
              engagement: post.engagement || {},
              engagementRate: post.engagementRate || 0,
            },
          },
          upsert: true,
        },
      }));

      if (ops.length === 0) return { upsertedCount: 0, modifiedCount: 0 };
      const result = await CompetitorPost.bulkWrite(ops, { ordered: false });
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount };
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.bulkUpsert failed: ${err.message}`);
    }
  }

  /**
   * Get recent posts for a competitor, sorted newest first.
   */
  async findRecent(competitorId, limit = 20) {
    try {
      return await CompetitorPost.find({ competitor: competitorId })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.findRecent failed: ${err.message}`);
    }
  }

  /**
   * Get top posts by engagement rate.
   */
  async findTopByEngagement(competitorId, limit = 10) {
    try {
      return await CompetitorPost.find({ competitor: competitorId })
        .sort({ engagementRate: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.findTopByEngagement failed: ${err.message}`);
    }
  }

  /**
   * Aggregate hashtag frequency for a competitor's posts.
   */
  async aggregateHashtags(competitorId, limit = 20) {
    try {
      return await CompetitorPost.aggregate([
        { $match: { competitor: competitorId } },
        { $unwind: '$hashtags' },
        { $group: { _id: '$hashtags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { hashtag: '$_id', count: 1, _id: 0 } },
      ]);
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.aggregateHashtags failed: ${err.message}`);
    }
  }

  /**
   * Aggregate content format distribution.
   */
  async aggregateFormatMix(competitorId) {
    try {
      return await CompetitorPost.aggregate([
        { $match: { competitor: competitorId } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
        { $project: { format: '$_id', count: 1, _id: 0 } },
      ]);
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.aggregateFormatMix failed: ${err.message}`);
    }
  }

  /**
   * Aggregate average engagement metrics for a competitor.
   */
  async aggregateEngagement(competitorId) {
    try {
      const [result] = await CompetitorPost.aggregate([
        { $match: { competitor: competitorId } },
        {
          $group: {
            _id: null,
            postCount: { $sum: 1 },
            avgEngagementRate: { $avg: '$engagementRate' },
            avgLikes: { $avg: '$engagement.likes' },
            avgComments: { $avg: '$engagement.comments' },
            avgShares: { $avg: '$engagement.shares' },
            avgViews: { $avg: '$engagement.views' },
          },
        },
      ]);
      return result || { postCount: 0, avgEngagementRate: 0, avgLikes: 0, avgComments: 0, avgShares: 0, avgViews: 0 };
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.aggregateEngagement failed: ${err.message}`);
    }
  }

  /**
   * Count posts published in the last N days.
   */
  async countRecentPosts(competitorId, days = 7) {
    try {
      const since = new Date(Date.now() - days * 86_400_000);
      return await CompetitorPost.countDocuments({
        competitor: competitorId,
        publishedAt: { $gte: since },
      });
    } catch (err) {
      throw new DatabaseError(`CompetitorPostRepository.countRecentPosts failed: ${err.message}`);
    }
  }
}

export default new CompetitorPostRepository();
