/**
 * NotificationService
 * Creates notifications, respects user preferences, and delegates
 * channel dispatch to NotificationDispatcher.
 */
import NotificationRepository from './NotificationRepository.js';
import NotificationDispatcher from './NotificationDispatcher.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import logger from '../../utils/logger.js';

// Map from notification type to title templates
const TYPE_META = {
  growth_drop:          { title: 'Growth Drop Alert',       defaultBody: 'Your follower growth has dropped this week.' },
  growth_milestone:     { title: 'Milestone Reached!',      defaultBody: 'You have reached a new follower milestone.' },
  trend_alert:          { title: 'Trend Alert',             defaultBody: 'A new trend relevant to your niche is rising.' },
  competitor_alert:     { title: 'Competitor Update',       defaultBody: 'A competitor has made a notable move.' },
  competitor_update:    { title: 'Competitor Update',       defaultBody: 'A competitor has been synced.' },
  weekly_plan_ready:    { title: 'Weekly Plan Ready',       defaultBody: 'Your weekly growth plan has been generated.' },
  weekly_report_ready:  { title: 'Weekly Report Ready',     defaultBody: 'Your weekly growth report is ready to view.' },
  monthly_report_ready: { title: 'Monthly Report Ready',    defaultBody: 'Your monthly growth report is ready to view.' },
  ai_insight:           { title: 'New AI Insight',          defaultBody: 'Your AI growth advisor has new recommendations.' },
  ai_recommendation:    { title: 'AI Recommendation',       defaultBody: 'Your AI advisor has a new recommendation for you.' },
  publishing_reminder:  { title: 'Publishing Reminder',     defaultBody: 'You have content scheduled to publish soon.' },
  sync_error:           { title: 'Sync Error',              defaultBody: 'A platform sync encountered an error.' },
  failed_sync:          { title: 'Sync Failed',             defaultBody: 'A platform sync has failed. Please reconnect.' },
  expired_token:        { title: 'Token Expired',           defaultBody: 'A connected platform token has expired. Please reconnect.' },
  report_ready:         { title: 'Report Ready',            defaultBody: 'Your growth report is ready.' },
  system:               { title: 'System Notification',     defaultBody: 'A system message from CreatorOS.' },
  subscription:         { title: 'Subscription Update',     defaultBody: 'Your subscription status has changed.' },
};

const NotificationService = {
  /**
   * Create and dispatch a notification.
   * All services should call this method, not NotificationRepository.create directly.
   */
  async create(userId, { type, body, title, actionUrl, refModel, refId, expiresAt } = {}) {
    const meta  = TYPE_META[type] || TYPE_META.system;
    const prefs = await NotificationRepository.getPreferences(userId);

    // Global kill-switch
    if (prefs && !prefs.enabled) {
      logger.debug('NotificationService: notifications disabled for user', { userId });
      return null;
    }

    const notification = await NotificationRepository.create(userId, {
      type,
      title:     title || meta.title,
      body:      body  || meta.defaultBody,
      actionUrl: actionUrl || null,
      refModel:  refModel  || null,
      refId:     refId     || null,
      expiresAt: expiresAt || null,
    });

    // Determine which channels to dispatch to (from preferences, default in-app only)
    const typePrefs = prefs?.types?.[type] || { inApp: true };
    await NotificationDispatcher.dispatch(notification, typePrefs);

    eventBus.emit(EVENT_TYPES.NOTIFICATION_CREATED, {
      userId: String(userId),
      notificationId: String(notification._id),
      type,
    });

    logger.info('NotificationService: notification created', {
      userId: String(userId),
      type,
      notificationId: String(notification._id),
    });

    return notification;
  },

  async getAll(userId, opts) {
    const [notifications, unreadCount] = await Promise.all([
      NotificationRepository.findAllByUser(userId, opts),
      NotificationRepository.countUnread(userId),
    ]);
    return { notifications, unreadCount };
  },

  async markRead(userId, notificationId) {
    return NotificationRepository.markRead(notificationId, userId);
  },

  async markAllRead(userId) {
    const count = await NotificationRepository.markAllRead(userId);
    return { updated: count };
  },

  async delete(userId, notificationId) {
    return NotificationRepository.deleteById(notificationId, userId);
  },

  async getPreferences(userId) {
    const prefs = await NotificationRepository.getPreferences(userId);
    return prefs || { enabled: true, types: {} };
  },

  async updatePreferences(userId, data) {
    return NotificationRepository.upsertPreferences(userId, data);
  },
};

export default NotificationService;
