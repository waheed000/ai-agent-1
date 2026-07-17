/**
 * DraftRepository
 * Data access for Draft documents.
 */
import Draft from '../models/Draft.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class DraftRepository {
  async create(userId, data) {
    try {
      return await Draft.create({ user: userId, ...data });
    } catch (err) {
      throw new DatabaseError(`DraftRepository.create failed: ${err.message}`);
    }
  }

  async findById(draftId, userId) {
    try {
      const doc = await Draft.findOne({ _id: draftId, user: userId, isDeleted: false }).lean();
      if (!doc) throw new NotFoundError('Draft');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`DraftRepository.findById failed: ${err.message}`);
    }
  }

  async findAllByUser(userId, { status, platform, contentPlan, limit = 30, skip = 0 } = {}) {
    try {
      const filter = { user: userId, isDeleted: false };
      if (status) filter.status = status;
      if (platform) filter.platform = platform;
      if (contentPlan) filter.contentPlan = contentPlan;
      return await Draft.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`DraftRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async update(draftId, userId, data) {
    try {
      const doc = await Draft.findOneAndUpdate(
        { _id: draftId, user: userId, isDeleted: false },
        { $set: data },
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError('Draft');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`DraftRepository.update failed: ${err.message}`);
    }
  }

  async softDelete(draftId, userId) {
    try {
      const doc = await Draft.findOne({ _id: draftId, user: userId, isDeleted: false });
      if (!doc) throw new NotFoundError('Draft');
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      await doc.save();
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`DraftRepository.softDelete failed: ${err.message}`);
    }
  }

  /** Create a new version of an existing draft */
  async createVersion(draftId, userId, data) {
    try {
      const original = await this.findById(draftId, userId);
      return await Draft.create({
        user: userId,
        contentPlan: original.contentPlan,
        platform: original.platform,
        contentType: original.contentType,
        previousVersion: draftId,
        versionNumber: (original.versionNumber || 1) + 1,
        status: 'draft',
        ...data,
      });
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`DraftRepository.createVersion failed: ${err.message}`);
    }
  }
}

export default new DraftRepository();
