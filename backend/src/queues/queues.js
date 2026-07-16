/**
 * Queue definitions.
 * Exports named queue getters — all backed by QueueService.
 * Import these instead of calling QueueService.getQueue() directly.
 */

import QueueService from '../services/QueueService.js';

export const QUEUE_NAMES = {
  SOCIAL_SYNC: 'socialSync',
  ANALYTICS: 'analytics',
  TREND: 'trend',
  REPORT: 'report',
  NOTIFICATION: 'notification',
};

export const JOB_NAMES = {
  // socialSync queue
  SYNC_PLATFORM: 'sync:platform',
  FETCH_POSTS: 'sync:fetchPosts',

  // analytics queue
  RECALCULATE_ANALYTICS: 'analytics:recalculate',
  RECALCULATE_USER_ANALYTICS: 'analytics:recalculateUser',

  // trend queue
  REFRESH_TRENDS: 'trend:refresh',

  // report queue
  GENERATE_WEEKLY_REPORT: 'report:weeklyReport',

  // notification queue
  PROCESS_NOTIFICATION: 'notification:process',
};

/**
 * @returns {import('bullmq').Queue|null}
 */
export const getSocialSyncQueue = () => QueueService.getQueue(QUEUE_NAMES.SOCIAL_SYNC);
export const getAnalyticsQueue = () => QueueService.getQueue(QUEUE_NAMES.ANALYTICS);
export const getTrendQueue = () => QueueService.getQueue(QUEUE_NAMES.TREND);
export const getReportQueue = () => QueueService.getQueue(QUEUE_NAMES.REPORT);
export const getNotificationQueue = () => QueueService.getQueue(QUEUE_NAMES.NOTIFICATION);
