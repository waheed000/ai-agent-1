/**
 * CreatorProfileRepository
 * All CreatorProfile database queries live here.
 */

import CreatorProfile from '../../models/CreatorProfile.js';
import { DatabaseError } from '../../utils/errors.js';

class CreatorProfileRepository {
  /**
   * Find a profile by user ID. Returns null if not found.
   */
  async findByUserId(userId) {
    try {
      return await CreatorProfile.findOne({ user: userId, isDeleted: false }).lean();
    } catch (err) {
      throw new DatabaseError(`findByUserId failed: ${err.message}`);
    }
  }

  /**
   * Update a profile by user ID. Creates the document if it doesn't exist (upsert).
   * Returns the updated document.
   */
  async updateByUserId(userId, updates) {
    try {
      return await CreatorProfile.findOneAndUpdate(
        { user: userId },
        { $set: updates },
        { new: true, upsert: true, runValidators: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`updateByUserId failed: ${err.message}`);
    }
  }

  /**
   * Soft-delete a profile (called on account deletion).
   */
  async softDeleteByUserId(userId) {
    try {
      return await CreatorProfile.findOneAndUpdate(
        { user: userId },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true }
      );
    } catch (err) {
      throw new DatabaseError(`softDeleteByUserId failed: ${err.message}`);
    }
  }
}

export default new CreatorProfileRepository();
