/**
 * FollowersHistoryRepository
 * Daily follower count snapshots per platform — one document per user+platform+day.
 */

import FollowersHistory from '../models/FollowersHistory.js';
import { DatabaseError } from '../utils/errors.js';

class FollowersHistoryRepository {
  /**
   * Upsert today's follower snapshot.
   * Automatically computes delta against the previous day's record.
   */
  async upsert(userId, connectedAccountId, platform, date, followers, following = 0) {
    try {
      const snapshotDate = new Date(date);
      snapshotDate.setUTCHours(0, 0, 0, 0);

      // Find previous snapshot to compute delta
      const previous = await FollowersHistory.findOne({
        user: userId,
        platform,
        date: { $lt: snapshotDate },
      })
        .sort({ date: -1 })
        .lean();

      const delta = previous ? followers - previous.followers : 0;
      const deltaPercentage =
        previous && previous.followers > 0
          ? Math.round((delta / previous.followers) * 10000) / 100
          : 0;

      return await FollowersHistory.findOneAndUpdate(
        { user: userId, platform, date: snapshotDate },
        {
          $set: {
            connectedAccount: connectedAccountId,
            followers,
            following,
            delta,
            deltaPercentage,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`FollowersHistory.upsert failed: ${err.message}`);
    }
  }

  /**
   * Get the last N daily snapshots for charting.
   */
  async findRecent(userId, platform, limit = 30) {
    try {
      return await FollowersHistory.find({ user: userId, platform })
        .sort({ date: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`FollowersHistory.findRecent failed: ${err.message}`);
    }
  }
}

export default new FollowersHistoryRepository();
