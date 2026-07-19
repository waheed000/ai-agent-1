/**
 * PostAnalyticsRepository
 * Daily analytics snapshots per post — one document per post per day.
 */

import PostAnalytics from '../../models/PostAnalytics.js';
import { DatabaseError } from '../../utils/errors.js';

class PostAnalyticsRepository {
  /**
   * Upsert a daily analytics snapshot for a post.
   * Unique constraint: post + snapshotDate.
   */
  async upsert(postId, userId, snapshotDate, analyticsData) {
    try {
      const date = new Date(snapshotDate);
      date.setUTCHours(0, 0, 0, 0); // normalize to start of day

      return await PostAnalytics.findOneAndUpdate(
        { post: postId, snapshotDate: date },
        { $set: { user: userId, snapshotDate: date, ...analyticsData } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`PostAnalytics.upsert failed: ${err.message}`);
    }
  }

  /**
   * Bulk upsert analytics for multiple posts.
   */
  async bulkUpsert(userId, analyticsArray) {
    try {
      const ops = analyticsArray.map(({ postId, snapshotDate, ...data }) => {
        const date = new Date(snapshotDate);
        date.setUTCHours(0, 0, 0, 0);
        return {
          updateOne: {
            filter: { post: postId, snapshotDate: date },
            update: { $set: { user: userId, snapshotDate: date, post: postId, ...data } },
            upsert: true,
          },
        };
      });

      if (ops.length === 0) return { upsertedCount: 0, modifiedCount: 0 };
      const result = await PostAnalytics.bulkWrite(ops, { ordered: false });
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount };
    } catch (err) {
      throw new DatabaseError(`PostAnalytics.bulkUpsert failed: ${err.message}`);
    }
  }

  /**
   * Find the latest analytics snapshot for a post.
   */
  async findLatestByPost(postId) {
    try {
      return await PostAnalytics.findOne({ post: postId }).sort({ snapshotDate: -1 }).lean();
    } catch (err) {
      throw new DatabaseError(`PostAnalytics.findLatestByPost failed: ${err.message}`);
    }
  }
}

export default new PostAnalyticsRepository();
