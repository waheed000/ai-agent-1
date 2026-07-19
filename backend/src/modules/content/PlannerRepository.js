/**
 * PlannerRepository
 * Data access for ContentPlan items.
 */
import ContentPlan from '../../models/ContentPlan.js';
import { DatabaseError, NotFoundError } from '../../utils/errors.js';

class PlannerRepository {
  async create(userId, data) {
    try {
      return await ContentPlan.create({ user: userId, ...data });
    } catch (err) {
      throw new DatabaseError(`PlannerRepository.create failed: ${err.message}`);
    }
  }

  async bulkCreate(userId, items) {
    try {
      const docs = items.map((item) => ({ user: userId, ...item }));
      return await ContentPlan.insertMany(docs, { ordered: false });
    } catch (err) {
      throw new DatabaseError(`PlannerRepository.bulkCreate failed: ${err.message}`);
    }
  }

  async findById(planId, userId) {
    try {
      const doc = await ContentPlan.findOne({ _id: planId, user: userId, isDeleted: false }).lean();
      if (!doc) throw new NotFoundError('ContentPlan');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`PlannerRepository.findById failed: ${err.message}`);
    }
  }

  async findAllByUser(userId, { platform, status, startDate, endDate, campaignId, seriesId, limit = 50, skip = 0 } = {}) {
    try {
      const filter = { user: userId, isDeleted: false };
      if (platform) filter.platform = platform;
      if (status) filter.status = status;
      if (campaignId) filter.campaignId = campaignId;
      if (seriesId) filter.seriesId = seriesId;
      if (startDate || endDate) {
        filter.suggestedTime = {};
        if (startDate) filter.suggestedTime.$gte = new Date(startDate);
        if (endDate) filter.suggestedTime.$lte = new Date(endDate);
      }
      return await ContentPlan.find(filter)
        .sort({ suggestedTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`PlannerRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async update(planId, userId, data) {
    try {
      const doc = await ContentPlan.findOneAndUpdate(
        { _id: planId, user: userId, isDeleted: false },
        { $set: data },
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError('ContentPlan');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`PlannerRepository.update failed: ${err.message}`);
    }
  }

  async softDelete(planId, userId) {
    try {
      const doc = await ContentPlan.findOne({ _id: planId, user: userId, isDeleted: false });
      if (!doc) throw new NotFoundError('ContentPlan');
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      await doc.save();
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`PlannerRepository.softDelete failed: ${err.message}`);
    }
  }

  /** Get calendar view: all items in a date range grouped by date */
  async findCalendar(userId, startDate, endDate) {
    try {
      return await ContentPlan.find({
        user: userId,
        isDeleted: false,
        suggestedTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
      })
        .sort({ suggestedTime: 1 })
        .lean();
    } catch (err) {
      throw new DatabaseError(`PlannerRepository.findCalendar failed: ${err.message}`);
    }
  }

  async countByUser(userId) {
    try {
      return await ContentPlan.countDocuments({ user: userId, isDeleted: false });
    } catch (err) {
      throw new DatabaseError(`PlannerRepository.countByUser failed: ${err.message}`);
    }
  }
}

export default new PlannerRepository();
