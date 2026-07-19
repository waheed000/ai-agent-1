/**
 * UsageRepository
 * Data access for the UsageRecord model.
 */
import UsageRecord from '../../models/UsageRecord.js';
import { DatabaseError } from '../../utils/errors.js';

class UsageRepository {
  async record(userId, workspaceId, data) {
    try {
      return await UsageRecord.create({
        user: userId,
        workspace: workspaceId || null,
        ...data,
        recordedAt: new Date(),
      });
    } catch (err) {
      throw new DatabaseError(`UsageRepository.record failed: ${err.message}`);
    }
  }

  async findByUser(userId, { category, from, to, limit = 100, skip = 0 } = {}) {
    try {
      const filter = { user: userId };
      if (category) filter.category = category;
      if (from || to) {
        filter.recordedAt = {};
        if (from) filter.recordedAt.$gte = new Date(from);
        if (to)   filter.recordedAt.$lte = new Date(to);
      }
      return await UsageRecord.find(filter)
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`UsageRepository.findByUser failed: ${err.message}`);
    }
  }

  async summarizeByUser(userId, { from, to } = {}) {
    try {
      // Aggregation pipelines do NOT auto-cast — must explicitly convert to ObjectId
      const userOId = new UsageRecord.base.Types.ObjectId(String(userId));
      const match = { user: userOId };
      if (from || to) {
        match.recordedAt = {};
        if (from) match.recordedAt.$gte = new Date(from);
        if (to)   match.recordedAt.$lte = new Date(to);
      }
      return await UsageRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            totalCount: { $sum: '$count' },
            lastUsed:   { $max: '$recordedAt' },
          },
        },
        { $sort: { totalCount: -1 } },
      ]);
    } catch (err) {
      throw new DatabaseError(`UsageRepository.summarizeByUser failed: ${err.message}`);
    }
  }

  async countByCategory(userId, category) {
    try {
      // Aggregation pipelines do NOT auto-cast — must explicitly convert to ObjectId
      const userOId = new UsageRecord.base.Types.ObjectId(String(userId));
      const result = await UsageRecord.aggregate([
        { $match: { user: userOId, category } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ]);
      return result[0]?.total ?? 0;
    } catch (err) {
      throw new DatabaseError(`UsageRepository.countByCategory failed: ${err.message}`);
    }
  }
}

export default new UsageRepository();
