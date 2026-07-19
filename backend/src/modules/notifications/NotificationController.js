import NotificationService from './NotificationService.js';
import { success, badRequest, notFound, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const NotificationController = {
  /**
   * GET /api/v1/notifications
   */
  async list(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { isRead, type, limit, skip } = req.query;
      const isReadBool = isRead === undefined ? undefined : isRead === 'true';
      const result = await NotificationService.getAll(String(req.user._id), {
        isRead: isReadBool, type,
        limit: limit ? parseInt(limit, 10) : 30,
        skip:  skip  ? parseInt(skip, 10)  : 0,
      });
      return success(res, result.notifications, 'Notifications retrieved', {
        count: result.notifications.length,
        unreadCount: result.unreadCount,
      });
    } catch (err) {
      logger.error('NotificationController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve notifications');
    }
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  async markRead(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const notification = await NotificationService.markRead(String(req.user._id), req.params.id);
      return success(res, notification, 'Notification marked as read');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('NotificationController.markRead failed', { error: err.message });
      return serverError(res, 'Failed to mark notification as read');
    }
  },

  /**
   * PATCH /api/v1/notifications/read-all
   */
  async markAllRead(req, res) {
    try {
      const result = await NotificationService.markAllRead(String(req.user._id));
      return success(res, result, 'All notifications marked as read');
    } catch (err) {
      logger.error('NotificationController.markAllRead failed', { error: err.message });
      return serverError(res, 'Failed to mark all notifications as read');
    }
  },

  /**
   * DELETE /api/v1/notifications/:id
   */
  async deleteNotification(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await NotificationService.delete(String(req.user._id), req.params.id);
      return success(res, null, 'Notification deleted');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('NotificationController.delete failed', { error: err.message });
      return serverError(res, 'Failed to delete notification');
    }
  },

  /**
   * PATCH /api/v1/notifications/preferences
   */
  async updatePreferences(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const prefs = await NotificationService.updatePreferences(String(req.user._id), req.body);
      return success(res, prefs, 'Preferences updated');
    } catch (err) {
      logger.error('NotificationController.updatePreferences failed', { error: err.message });
      return serverError(res, 'Failed to update preferences');
    }
  },
};

export default NotificationController;
