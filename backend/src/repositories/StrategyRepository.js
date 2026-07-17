/**
 * StrategyRepository
 * Data access for the Strategy model.
 * Strategies are immutable once created.
 */
import Strategy from '../models/Strategy.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class StrategyRepository {
  async create(userId, data) {
    try {
      return await Strategy.create({ user: userId, ...data });
    } catch (err) {
      throw new DatabaseError(`StrategyRepository.create failed: ${err.message}`);
    }
  }

  async findById(strategyId, userId) {
    try {
      const doc = await Strategy.findOne({ _id: strategyId, user: userId, isDeleted: false }).lean();
      if (!doc) throw new NotFoundError('Strategy');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`StrategyRepository.findById failed: ${err.message}`);
    }
  }

  async findAllByUser(userId, { planType, status, limit = 20, skip = 0 } = {}) {
    try {
      const filter = { user: userId, isDeleted: false };
      if (planType) filter.planType = planType;
      if (status) filter.status = status;
      return await Strategy.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`StrategyRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async findLatest(userId, planType = null) {
    try {
      const filter = { user: userId, status: 'ready', isDeleted: false };
      if (planType) filter.planType = planType;
      return await Strategy.findOne(filter).sort({ generatedAt: -1 }).lean();
    } catch (err) {
      throw new DatabaseError(`StrategyRepository.findLatest failed: ${err.message}`);
    }
  }

  async updateStatus(strategyId, status, extra = {}) {
    try {
      return await Strategy.findByIdAndUpdate(
        strategyId,
        { status, ...extra },
        { new: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`StrategyRepository.updateStatus failed: ${err.message}`);
    }
  }
}

export default new StrategyRepository();
