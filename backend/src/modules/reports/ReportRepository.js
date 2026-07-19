/**
 * ReportRepository
 * Data access for the Report model.
 * Reports are immutable — never overwrite, always create new.
 */
import Report from '../../models/Report.js';
import { DatabaseError, NotFoundError } from '../../utils/errors.js';

class ReportRepository {
  async create(userId, data) {
    try {
      return await Report.create({ user: userId, ...data });
    } catch (err) {
      throw new DatabaseError(`ReportRepository.create failed: ${err.message}`);
    }
  }

  async findById(reportId, userId) {
    try {
      const doc = await Report.findOne({ _id: reportId, user: userId, isDeleted: false }).lean();
      if (!doc) throw new NotFoundError('Report');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`ReportRepository.findById failed: ${err.message}`);
    }
  }

  async findAllByUser(userId, { type, status, limit = 20, skip = 0 } = {}) {
    try {
      const filter = { user: userId, isDeleted: false };
      if (type) filter.type = type;
      if (status) filter.status = status;
      return await Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`ReportRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async findLatest(userId, type = null) {
    try {
      const filter = { user: userId, status: 'ready', isDeleted: false };
      if (type) filter.type = type;
      return await Report.findOne(filter).sort({ generatedAt: -1 }).lean();
    } catch (err) {
      throw new DatabaseError(`ReportRepository.findLatest failed: ${err.message}`);
    }
  }

  async updateStatus(reportId, status, extra = {}) {
    try {
      return await Report.findByIdAndUpdate(
        reportId,
        { status, ...extra },
        { new: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`ReportRepository.updateStatus failed: ${err.message}`);
    }
  }

  async softDelete(reportId, userId) {
    try {
      const doc = await Report.findOne({ _id: reportId, user: userId, isDeleted: false });
      if (!doc) throw new NotFoundError('Report');
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      await doc.save();
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`ReportRepository.softDelete failed: ${err.message}`);
    }
  }

  async countByUser(userId) {
    try {
      return await Report.countDocuments({ user: userId, isDeleted: false });
    } catch (err) {
      throw new DatabaseError(`ReportRepository.countByUser failed: ${err.message}`);
    }
  }
}

export default new ReportRepository();
