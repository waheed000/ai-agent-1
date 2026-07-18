/**
 * NotificationDispatcher
 * Routes a notification to the appropriate delivery channel(s) based on user preferences.
 *
 * Channels:
 *   inApp     — always available; the notification is already persisted to DB
 *   email     — stub; integrate a transactional provider (SendGrid, Resend, AWS SES) here
 *   websocket — stub; integrate a WebSocket server (Socket.IO, ws) here
 *   push      — stub; integrate a push provider (Firebase FCM, OneSignal) here
 */

import logger from '../utils/logger.js';

/** In-App channel — notification is already in DB; frontend polls GET /api/v1/notifications. */
const InAppChannel = {
  name: 'inApp',
  async send(notification) {
    logger.debug('Dispatcher[InApp]: notification available in-app', {
      id:   String(notification._id),
      type: notification.type,
    });
    return { channel: 'inApp', status: 'delivered' };
  },
};

/** Email channel — integrate a transactional email provider to activate. */
const EmailChannel = {
  name: 'email',
  async send(notification) {
    logger.debug('Dispatcher[Email]: stub — no email provider configured', {
      id:   String(notification._id),
      type: notification.type,
    });
    return { channel: 'email', status: 'stub' };
  },
};

/** WebSocket channel — integrate a WebSocket server to activate. */
const WebSocketChannel = {
  name: 'websocket',
  async send(notification) {
    logger.debug('Dispatcher[WebSocket]: stub — no WebSocket server configured', {
      id:   String(notification._id),
      type: notification.type,
    });
    return { channel: 'websocket', status: 'stub' };
  },
};

/** Push channel — integrate a push notification provider to activate. */
const PushChannel = {
  name: 'push',
  async send(notification) {
    logger.debug('Dispatcher[Push]: stub — no push provider configured', {
      id:   String(notification._id),
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
   * @param {object} notification  Mongoose document or plain object
   * @param {object} channelPrefs  e.g. { inApp: true, email: false, websocket: false, push: false }
   */
  async dispatch(notification, channelPrefs = { inApp: true }) {
    const tasks = [];

    for (const [channelName, channel] of Object.entries(CHANNELS)) {
      if (channelPrefs[channelName]) {
        tasks.push(
          channel.send(notification).catch((err) => {
            logger.error(`Dispatcher[${channelName}]: dispatch error`, { error: err.message });
            return { channel: channelName, status: 'error', error: err.message };
          }),
        );
      }
    }

    const results = await Promise.all(tasks);
    logger.debug('Dispatcher: dispatch complete', { id: String(notification._id), results });
    return results;
  },

  channels: CHANNELS,
};

export default NotificationDispatcher;
