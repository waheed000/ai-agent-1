/**
 * AudienceAnalyticsRepository
 * Demographic snapshots per platform per day — one document per user+platform+day.
 */

import AudienceAnalytics from '../models/AudienceAnalytics.js';
import { DatabaseError } from '../utils/errors.js';

class AudienceAnalyticsRepository {
  /**
   * Upsert today's audience snapshot for a platform.
   */
  async upsert(userId, connectedAccountId, platform, snapshotDate, data) {
    try {
      const date = new Date(snapshotDate);
      date.setUTCHours(0, 0, 0, 0);

      return await AudienceAnalytics.findOneAndUpdate(
        { user: userId, platform, snapshotDate: date },
        {
          $set: {
            connectedAccount: connectedAccountId,
            snapshotDate: date,
            ...data,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`AudienceAnalytics.upsert failed: ${err.message}`);
    }
  }

  /**
   * Find the most recent audience snapshot for a user's platform.
   */
  async findLatest(userId, platform) {
    try {
      return await AudienceAnalytics.findOne({ user: userId, platform })
        .sort({ snapshotDate: -1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`AudienceAnalytics.findLatest failed: ${err.message}`);
    }
  }
}

export default new AudienceAnalyticsRepository();
