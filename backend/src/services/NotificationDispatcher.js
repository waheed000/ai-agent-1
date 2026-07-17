/**
 * NotificationDispatcher
 * Routes a notification to the appropriate channel(s) based on user preferences.
 *
 * Interface-only — no real provider is integrated.
 * Swap in a real provider by implementing the channel methods below.
 */
import logger from '../utils/logger.js';

/** In-App channel (always available — stored in DB, polled by frontend) */
const InAppChannel = {
  name: 'inApp',
  async send(notification) {
    // Already persisted to DB by NotificationRepository.create.
    // The frontend reads from GET /api/v1/notifications.
    logger.debug('Dispatcher[InApp]: notification available in-app', {
      id: String(notification._id),
      type: notification.type,
    });
    return { channel: 'inApp', status: 'delivered' };
  },
};

/** Email channel — interface stub */
const EmailChannel = {
  name: 'email',
  async send(notification) {
    // TODO: integrate transactional email provider (e.g. SendGrid, Resend, AWS SES).
    // Payload: notification.user, notification.title, notification.body, notification.actionUrl
    logger.debug('Dispatcher[Email]: stub — notification would be emailed', {
      id: String(notification._id),
      type: notification.type,
    });
    return { channel: 'email', status: 'stub' };
  },
};

/** WebSocket channel — interface stub */
const WebSocketChannel = {
  name: 'websocket',
  async send(notification) {
    // TODO: integrate WebSocket server (e.g. Socket.IO, ws).
    // Emit to room `user:<userId>` with event 'notification'.
    logger.debug('Dispatcher[WebSocket]: stub — notification would be pushed via WS', {
      id: String(notification._id),
      type: notification.type,
    });
    return { channel: 'websocket', status: 'stub' };
  },
};

/** Push channel — interface stub */
const PushChannel = {
  name: 'push',
  async send(notification) {
    // TODO: integrate push notification provider (e.g. Firebase FCM, OneSignal).
    logger.debug('Dispatcher[Push]: stub — notification would be pushed', {
      id: String(notification._id),
      type: notification.type,
    });
    return { channel: 'push', status: 'stub' };
  },
};

const CHANNELS = {
  inApp:     InAppChannel,
  email:     EmailChannel,
  websocket: WebSocketChannel,
  push:      PushChannel,
};

const NotificationDispatcher = {
  /**
   * Dispatch a notification to all enabled channels in parallel.
   * @param {object} notification  - Mongoose document / plain object
   * @param {object} channelPrefs  - { inApp: bool, email: bool, websocket: bool, push: bool }
   */
  async dispatch(notification, channelPrefs = { inApp: true }) {
    const tasks = [];

    for (const [channelName, channel] of Object.entries(CHANNELS)) {
      if (channelPrefs[channelName]) {
        tasks.push(
          channel.send(notification).catch((err) => {
            logger.error(`Dispatcher[${channelName}]: dispatch error`, { error: err.message });
            return { channel: channelName, status: 'error', error: err.message };
          })
        );
      }
    }

    const results = await Promise.all(tasks);
    logger.debug('Dispatcher: dispatch complete', {
      id: String(notification._id),
      results,
    });
    return results;
  },

  /** Expose channel registry for testing */
  channels: CHANNELS,
};

export default NotificationDispatcher;
