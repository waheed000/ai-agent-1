/**
 * notificationWorker
 * Processes notification dispatch jobs from the NOTIFICATION queue.
 */
import QueueService from '../../infrastructure/queue/index.js';
import NotificationService from '../../modules/notifications/NotificationService.js';
import { QUEUE_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

export function registerNotificationWorker() {
  QueueService.createWorker(QUEUE_NAMES.NOTIFICATION, async (job) => {
    const { data } = job;

    logger.info('notificationWorker: processing notification', {
      jobId: job.id,
      userId: data.userId,
      type: data.type,
    });

    try {
      const notification = await NotificationService.create(data.userId, {
        type:      data.type      || 'system',
        title:     data.title,
        body:      data.data?.message || data.body,
        actionUrl: data.actionUrl,
        refModel:  data.refModel,
        refId:     data.refId,
        expiresAt: data.expiresAt,
      });

      logger.info('notificationWorker: notification sent', {
        jobId: job.id,
        notificationId: notification ? String(notification._id) : null,
      });

      return { success: true, notificationId: notification ? String(notification._id) : null };
    } catch (err) {
      logger.error('notificationWorker: failed', { jobId: job.id, error: err.message });
      throw err;
    }
  });
}
