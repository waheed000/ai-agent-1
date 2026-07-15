/**
 * UserRepository
 * All User database queries live here. Services never touch Mongoose directly.
 */

import User from '../models/User.js';
import { DatabaseError } from '../utils/errors.js';

class UserRepository {
  /**
   * Find a user by email. Optionally select the password field.
   */
  async findByEmail(email, { includePassword = false } = {}) {
    try {
      const query = User.findOne({ email: email.toLowerCase().trim(), isDeleted: false });
      if (includePassword) query.select('+password');
      return await query.lean();
    } catch (err) {
      throw new DatabaseError(`findByEmail failed: ${err.message}`);
    }
  }

  /**
   * Find a user by ID. Optionally select the password field.
   */
  async findById(id, { includePassword = false } = {}) {
    try {
      const query = User.findOne({ _id: id, isDeleted: false });
      if (includePassword) query.select('+password');
      return await query.lean();
    } catch (err) {
      throw new DatabaseError(`findById failed: ${err.message}`);
    }
  }

  /**
   * Create a new user. Returns the saved document (lean).
   */
  async create(data) {
    try {
      const user = new User(data);
      await user.save();
      return user.toObject();
    } catch (err) {
      throw new DatabaseError(`create user failed: ${err.message}`);
    }
  }

  /**
   * Update a user by ID. Returns the updated document (lean).
   */
  async updateById(id, updates) {
    try {
      return await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true, lean: true }
      );
    } catch (err) {
      throw new DatabaseError(`updateById failed: ${err.message}`);
    }
  }

  /**
   * Check whether an email is already registered (active or not).
   */
  async existsByEmail(email) {
    try {
      const count = await User.countDocuments({ email: email.toLowerCase().trim() });
      return count > 0;
    } catch (err) {
      throw new DatabaseError(`existsByEmail failed: ${err.message}`);
    }
  }
}

export default new UserRepository();
