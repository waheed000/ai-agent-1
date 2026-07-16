/**
 * Notification Worker
 * Processes outbound notification events (email, push, in-app).
 *
 * Job payload: { userId, type, data }
 * type: 'sync_complete' | 'weekly_report' | 'milestone' | 'alert'
 */

import QueueService from '../../services/QueueService.js';
import JobExecution from '../../models/JobExecution.js';
import Notification from '../../models/Notification.js';
import { QUEUE_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

const VALID_TYPES = new Set(['sync_complete', 'weekly_report', 'milestone', 'alert', 'info']);

async function processNotificationJob(job) {
  const { userId, type, data = {} } = job.data;
  const startedAt = new Date();

  logger.info('notificationWorker: processing', { jobId: job.id, userId, type });

  if (!VALID_TYPES.has(type)) {
    logger.warn('notificationWorker: unknown notification type — skipping', { type });
    return { skipped: true, reason: 'unknown_type' };
  }

  const execution = await JobExecution.create({
    jobId: job.id,
    queue: QUEUE_NAMES.NOTIFICATION,
    jobName: job.name,
    user: userId || null,
    status: 'running',
    attemptNumber: job.attemptsMade + 1,
    startedAt,
  });

  try {
    // Persist the notification record so the UI can surface it
    const notification = await Notification.create({
      user: userId,
      type,
      message: data.message || _defaultMessage(type, data),
      data,
      read: false,
    });

    const durationMs = Date.now() - startedAt.getTime();

    logger.info('notificationWorker: notification created', {
      jobId: job.id,
      notificationId: notification._id,
      type,
      durationMs,
    });

    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        records: new Map([['notifications', 1]]),
      },
    });

    return { success: true, notificationId: notification._id, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    logger.error('notificationWorker: failed', { jobId: job.id, error: err.message });
    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        durationMs,
        errorMessage: err.message,
        errorCode: err.code || 'UNKNOWN',
      },
    });
    throw err;
  }
}

function _defaultMessage(type, data) {
  const messages = {
    sync_complete: `Sync complete for ${data.platform || 'your account'}.`,
    weekly_report: 'Your weekly growth report is ready.',
    milestone: `Milestone reached: ${data.milestone || ''}.`,
    alert: data.alert || 'Action required on your account.',
    info: data.info || 'New update available.',
  };
  return messages[type] || 'You have a new notification.';
}

export function registerNotificationWorker() {
  return QueueService.createWorker(QUEUE_NAMES.NOTIFICATION, processNotificationJob, {
    concurrency: 5,
  });
}
