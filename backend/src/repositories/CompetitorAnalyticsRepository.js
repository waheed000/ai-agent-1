/**
 * CompetitorAnalyticsRepository
 * Historical daily snapshots for competitor metrics.
 * Snapshots are NEVER overwritten — each sync produces a new document.
 */

import CompetitorAnalytics from '../models/CompetitorAnalytics.js';
import { DatabaseError } from '../utils/errors.js';

class CompetitorAnalyticsRepository {
  /**
   * Create a new analytics snapshot.
   * If a snapshot already exists for this competitor+date, upsert the fields
   * (same-day re-syncs update the snapshot rather than creating a duplicate).
   */
  async createSnapshot(competitorId, userId, data) {
    try {
      const snapshotDate = _dayStart(data.snapshotDate || new Date());

      return await CompetitorAnalytics.findOneAndUpdate(
        { competitor: competitorId, snapshotDate },
        {
          $set: {
            trackedBy: userId,
            ...data,
            snapshotDate,
          },
        },
        { upsert: true, new: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`CompetitorAnalyticsRepository.createSnapshot failed: ${err.message}`);
    }
  }

  /**
   * Get the most recent snapshot for a competitor.
   */
  async findLatest(competitorId) {
    try {
      return await CompetitorAnalytics.findOne({ competitor: competitorId })
        .sort({ snapshotDate: -1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`CompetitorAnalyticsRepository.findLatest failed: ${err.message}`);
    }
  }

  /**
   * Get snapshots over a date range for trend analysis.
   */
  async findHistory(competitorId, { startDate, endDate, limit = 90 } = {}) {
    try {
      const filter = {
        competitor: competitorId,
        ...(startDate || endDate
          ? {
              snapshotDate: {
                ...(startDate && { $gte: new Date(startDate) }),
                ...(endDate && { $lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      return await CompetitorAnalytics.find(filter)
        .sort({ snapshotDate: 1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`CompetitorAnalyticsRepository.findHistory failed: ${err.message}`);
    }
  }

  /**
   * Get the most recent snapshot for every competitor tracked by a user.
   */
  async findLatestForUser(userId) {
    try {
      return await CompetitorAnalytics.aggregate([
        { $match: { trackedBy: userId } },
        { $sort: { snapshotDate: -1 } },
        { $group: { _id: '$competitor', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
      ]);
    } catch (err) {
      throw new DatabaseError(
        `CompetitorAnalyticsRepository.findLatestForUser failed: ${err.message}`
      );
    }
  }
}

function _dayStart(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default new CompetitorAnalyticsRepository();
