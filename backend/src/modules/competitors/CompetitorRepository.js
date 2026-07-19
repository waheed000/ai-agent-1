/**
 * CompetitorRepository
 * Data access for the Competitor model.
 */

import Competitor from '../../models/Competitor.js';
import { DatabaseError, NotFoundError, ConflictError } from '../../utils/errors.js';

class CompetitorRepository {
  /**
   * Add a new competitor for a user.
   * Throws ConflictError if the same username+platform is already tracked.
   */
  async create(userId, { username, platform, notes, niche }) {
    try {
      // Explicit uniqueness check so the ConflictError is always raised with a
      // business-meaningful message, regardless of index creation timing.
      const exists = await Competitor.findOne({
        trackedBy: userId,
        platform,
        username,
        isDeleted: false,
      }).lean();
      if (exists) {
        throw new ConflictError(
          `You are already tracking @${username} on ${platform}`
        );
      }

      return await Competitor.create({
        trackedBy: userId,
        username,
        platform,
        notes: notes || null,
        niche: niche || null,
      });
    } catch (err) {
      if (err.name === 'ConflictError' || err.code === 'CONFLICT') throw err;
      if (err.code === 11000) {
        throw new ConflictError(
          `You are already tracking @${username} on ${platform}`
        );
      }
      throw new DatabaseError(`CompetitorRepository.create failed: ${err.message}`);
    }
  }

  /**
   * List all non-deleted competitors for a user.
   */
  async findAllByUser(userId, { platform, status, limit = 50, skip = 0 } = {}) {
    try {
      const filter = {
        trackedBy: userId,
        isDeleted: false,
        ...(platform && { platform }),
        ...(status && { status }),
      };
      return await Competitor.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`CompetitorRepository.findAllByUser failed: ${err.message}`);
    }
  }

  /**
   * Find a single competitor by id, ensuring it belongs to the user.
   */
  async findByIdAndUser(competitorId, userId) {
    try {
      const doc = await Competitor.findOne({
        _id: competitorId,
        trackedBy: userId,
        isDeleted: false,
      }).lean();
      return doc || null;
    } catch (err) {
      throw new DatabaseError(`CompetitorRepository.findByIdAndUser failed: ${err.message}`);
    }
  }

  /**
   * Update cached metrics after a sync.
   */
  async updateMetrics(competitorId, metrics) {
    try {
      const { followerCount, followingCount, postCount, avgEngagementRate, avgPostFrequency } = metrics;
      return await Competitor.findByIdAndUpdate(
        competitorId,
        {
          $set: {
            ...(followerCount !== undefined && { followerCount }),
            ...(followingCount !== undefined && { followingCount }),
            ...(postCount !== undefined && { postCount }),
            ...(avgEngagementRate !== undefined && { avgEngagementRate }),
            ...(avgPostFrequency !== undefined && { avgPostFrequency }),
            lastSyncedAt: new Date(),
            status: 'active',
          },
        },
        { new: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`CompetitorRepository.updateMetrics failed: ${err.message}`);
    }
  }

  /**
   * Soft-delete a competitor.
   */
  async softDelete(competitorId, userId) {
    try {
      const doc = await Competitor.findOne({ _id: competitorId, trackedBy: userId });
      if (!doc) throw new NotFoundError('Competitor not found');
      return await doc.softDelete();
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`CompetitorRepository.softDelete failed: ${err.message}`);
    }
  }

  /**
   * Count active competitors for a user.
   */
  async countByUser(userId) {
    try {
      return await Competitor.countDocuments({ trackedBy: userId, isDeleted: false });
    } catch (err) {
      throw new DatabaseError(`CompetitorRepository.countByUser failed: ${err.message}`);
    }
  }
}

export default new CompetitorRepository();
