/**
 * NotificationRepository
 * Data access for the Notification model.
 */
import Notification from '../models/Notification.js';
import NotificationPreferences from '../models/NotificationPreferences.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class NotificationRepository {
  // ── Notifications ─────────────────────────────────────────────────────────

  async create(userId, data) {
    try {
      return await Notification.create({ user: userId, ...data });
    } catch (err) {
      throw new DatabaseError(`NotificationRepository.create failed: ${err.message}`);
    }
  }

  async findAllByUser(userId, { isRead, type, limit = 30, skip = 0 } = {}) {
    try {
      const filter = { user: userId };
      if (typeof isRead === 'boolean') filter.isRead = isRead;
      if (type) filter.type = type;
      return await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (err) {
      throw new DatabaseError(`NotificationRepository.findAllByUser failed: ${err.message}`);
    }
  }

  async findById(notificationId, userId) {
    try {
      const doc = await Notification.findOne({ _id: notificationId, user: userId }).lean();
      if (!doc) throw new NotFoundError('Notification');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`NotificationRepository.findById failed: ${err.message}`);
    }
  }

  async markRead(notificationId, userId) {
    try {
      const doc = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      ).lean();
      if (!doc) throw new NotFoundError('Notification');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`NotificationRepository.markRead failed: ${err.message}`);
    }
  }

  async markAllRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      return result.modifiedCount;
    } catch (err) {
      throw new DatabaseError(`NotificationRepository.markAllRead failed: ${err.message}`);
    }
  }

  async deleteById(notificationId, userId) {
    try {
      const doc = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
      if (!doc) throw new NotFoundError('Notification');
      return doc;
    } catch (err) {
      if (err.isOperational) throw err;
      throw new DatabaseError(`NotificationRepository.deleteById failed: ${err.message}`);
    }
  }

  async countUnread(userId) {
    try {
      return await Notification.countDocuments({ user: userId, isRead: false });
    } catch (err) {
      throw new DatabaseError(`NotificationRepository.countUnread failed: ${err.message}`);
    }
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  async getPreferences(userId) {
    try {
      const doc = await NotificationPreferences.findOne({ user: userId }).lean();
      return doc || null;
    } catch (err) {
      throw new DatabaseError(`NotificationRepository.getPreferences failed: ${err.message}`);
    }
  }

  async upsertPreferences(userId, data) {
    try {
      return await NotificationPreferences.findOneAndUpdate(
        { user: userId },
        { $set: data },
        { new: true, upsert: true }
      ).lean();
    } catch (err) {
      throw new DatabaseError(`NotificationRepository.upsertPreferences failed: ${err.message}`);
    }
  }
}

export default new NotificationRepository();
