/**
 * TrendRepository
 * Data access for TrendData snapshots.
 * Every collection run creates new documents — historical data is never overwritten.
 */

import TrendData from '../models/TrendData.js';
import { DatabaseError } from '../utils/errors.js';

class TrendRepository {
  /**
   * Store a new trend snapshot.
   * Same name+platform+category detected on the same UTC day → upsert (refresh metrics).
   */
  async upsert({ user = null, platform = 'all', category, name, trendScore, growthRate,
                  volume, relatedTags, status, description, peakDate, expiresAt, aiContentIdea } = {}) {
    try {
      const today = _dayStart(new Date());

      return await TrendData.findOneAndUpdate(
        { user, platform, category, name, detectedAt: { $gte: today } },
        {
          $setOnInsert: { user, platform, category, name, detectedAt: today },
          $set: {
            trendScore: trendScore ?? 0,
            growthRate: growthRate ?? 0,
            volume: volume ?? 0,
            status: status || 'rising',
            relatedTags: relatedTags || [],
            description: description || null,
            peakDate: peakDate || null,
            expiresAt: expiresAt || null,
            aiContentIdea: aiContentIdea || null,
          },
        },
        { upsert: true, new: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`TrendRepository.upsert failed: ${err.message}`);
    }
  }

  /**
   * Bulk upsert trend snapshots.
   */
  async bulkUpsert(trends = []) {
    try {
      if (trends.length === 0) return { upsertedCount: 0 };
      const today = _dayStart(new Date());

      const ops = trends.map((t) => ({
        updateOne: {
          filter: {
            user: t.user || null,
            platform: t.platform || 'all',
            category: t.category,
            name: t.name,
            detectedAt: { $gte: today },
          },
          update: {
            $setOnInsert: {
              user: t.user || null,
              platform: t.platform || 'all',
              category: t.category,
              name: t.name,
              detectedAt: today,
            },
            $set: {
              trendScore: t.trendScore ?? 0,
              growthRate: t.growthRate ?? 0,
              volume: t.volume ?? 0,
              status: t.status || 'rising',
              relatedTags: t.relatedTags || [],
              description: t.description || null,
              aiContentIdea: t.aiContentIdea || null,
            },
          },
          upsert: true,
        },
      }));

      const result = await TrendData.bulkWrite(ops, { ordered: false });
      return { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount };
    } catch (err) {
      throw new DatabaseError(`TrendRepository.bulkUpsert failed: ${err.message}`);
    }
  }

  /**
   * Query active trends with optional filters.
   */
  async findTrends({ platform, category, status = 'rising', minScore = 0, limit = 50, user = null } = {}) {
    try {
      const filter = {
        trendScore: { $gte: minScore },
        user,
        ...(platform && { platform }),
        ...(category && { category }),
        ...(status && { status }),
      };

      return await TrendData.find(filter)
        .sort({ trendScore: -1, detectedAt: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`TrendRepository.findTrends failed: ${err.message}`);
    }
  }

  /**
   * Get trending hashtags (category = hashtag).
   */
  async findHashtags({ platform, limit = 30, minScore = 0 } = {}) {
    return this.findTrends({ platform, category: 'hashtag', limit, minScore });
  }

  /**
   * Get trending topics (category = topic).
   */
  async findTopics({ platform, limit = 20, minScore = 0 } = {}) {
    return this.findTrends({ platform, category: 'topic', limit, minScore });
  }

  /**
   * Get trending creator-style patterns (category = format | keyword | challenge).
   */
  async findCreatorTrends({ platform, limit = 20 } = {}) {
    try {
      return await TrendData.find({
        user: null,
        category: { $in: ['format', 'keyword', 'challenge'] },
        status: { $in: ['rising', 'peak'] },
        ...(platform && { platform }),
      })
        .sort({ trendScore: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`TrendRepository.findCreatorTrends failed: ${err.message}`);
    }
  }

  /**
   * Mark expired trends (where expiresAt has passed).
   * Returns the count of updated documents.
   */
  async markExpired() {
    try {
      const result = await TrendData.updateMany(
        { expiresAt: { $lte: new Date() }, status: { $ne: 'expired' } },
        { $set: { status: 'expired' } }
      );
      return result.modifiedCount;
    } catch (err) {
      throw new DatabaseError(`TrendRepository.markExpired failed: ${err.message}`);
    }
  }

  /**
   * Get trend velocity — trends with the highest growthRate.
   */
  async findHighVelocity({ platform, limit = 10 } = {}) {
    try {
      return await TrendData.find({
        user: null,
        status: { $in: ['rising', 'peak'] },
        growthRate: { $gt: 0 },
        ...(platform && { platform }),
      })
        .sort({ growthRate: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`TrendRepository.findHighVelocity failed: ${err.message}`);
    }
  }
}

function _dayStart(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default new TrendRepository();
