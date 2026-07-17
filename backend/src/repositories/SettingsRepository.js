/**
 * SettingsRepository
 * Data access for the Settings model.
 * One document per user per type — upserted on write.
 */
import Settings from '../models/Settings.js';
import { DatabaseError } from '../utils/errors.js';

class SettingsRepository {
  async findByUserAndType(userId, type) {
    try {
      return await Settings.findOne({ user: userId, type }).lean();
    } catch (err) {
      throw new DatabaseError(`SettingsRepository.findByUserAndType failed: ${err.message}`);
    }
  }

  async findAllByUser(userId) {
    try {
      return await Settings.find({ user: userId }).sort({ type: 1 }).lean();
    } catch (err) {
      throw new DatabaseError(`SettingsRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async upsert(userId, type, data) {
    try {
      return await Settings.findOneAndUpdate(
        { user: userId, type },
        { $set: { user: userId, type, ...data } },
        { new: true, upsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`SettingsRepository.upsert failed: ${err.message}`);
    }
  }
}

export default new SettingsRepository();
