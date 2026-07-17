/**
 * FeatureRepository
 * Data access for the FeatureFlag model.
 */
import FeatureFlag from '../models/FeatureFlag.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class FeatureRepository {
  async findAll() {
    try {
      return await FeatureFlag.find().sort({ key: 1 }).lean();
    } catch (err) {
      throw new DatabaseError(`FeatureRepository.findAll failed: ${err.message}`);
    }
  }

  async findByKey(key) {
    try {
      const doc = await FeatureFlag.findOne({ key }).lean();
      if (!doc) throw new NotFoundError(`FeatureFlag(${key})`);
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`FeatureRepository.findByKey failed: ${err.message}`);
    }
  }

  async upsert(key, data) {
    try {
      return await FeatureFlag.findOneAndUpdate(
        { key },
        { $set: data },
        { new: true, upsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`FeatureRepository.upsert failed: ${err.message}`);
    }
  }

  async setEnabled(key, enabled) {
    try {
      const doc = await FeatureFlag.findOneAndUpdate(
        { key },
        { enabled },
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError(`FeatureFlag(${key})`);
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`FeatureRepository.setEnabled failed: ${err.message}`);
    }
  }
}

export default new FeatureRepository();
