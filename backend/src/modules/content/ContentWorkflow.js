/**
 * ContentWorkflow
 * Manages workflow state transitions for ContentPlan items.
 * Wraps PublishingService with business-rule validation and notification hooks.
 */
import PublishingService, { ContentWorkflowTransitions } from './PublishingService.js';
import NotificationService from '../notifications/NotificationService.js';
import PlannerRepository from './PlannerRepository.js';
import logger from '../../utils/logger.js';

const ContentWorkflow = {
  /**
   * Move a content item to the next status in the workflow.
   */
  async advance(userId, planId) {
    const plan  = await PlannerRepository.findById(planId, userId);
    const valid = ContentWorkflowTransitions[plan.status] || [];
    if (!valid.length) {
      throw Object.assign(new Error(`Content is already in terminal state: ${plan.status}`), {
        isOperational: true, statusCode: 422, code: 'TERMINAL_STATE',
      });
    }
    const nextStatus = valid[0]; // first valid transition = natural progression
    return PublishingService.transitionStatus(userId, planId, nextStatus);
  },

  /**
   * Explicitly set a status (validates transition graph).
   */
  async setStatus(userId, planId, newStatus) {
    return PublishingService.transitionStatus(userId, planId, newStatus);
  },

  /**
   * Approve a piece of content (review → approved).
   */
  async approve(userId, planId) {
    const updated = await this.setStatus(userId, planId, 'approved');
    // Could notify the creator here
    logger.info('ContentWorkflow: content approved', { userId: String(userId), planId: String(planId) });
    return updated;
  },

  /**
   * Reject a piece of content (review → draft) with a reason.
   */
  async reject(userId, planId, reason = '') {
    const updated = await PlannerRepository.update(planId, userId, {
      status: 'draft',
      rejectionReason: reason,
    });
    logger.info('ContentWorkflow: content rejected', { userId: String(userId), planId: String(planId) });
    return updated;
  },

  /**
   * Schedule content for publishing (approved → scheduled).
   */
  async schedule(userId, planId, scheduledAt) {
    const updated = await PlannerRepository.update(planId, userId, {
      status: 'scheduled',
      suggestedTime: new Date(scheduledAt),
    });
    logger.info('ContentWorkflow: content scheduled', {
      userId: String(userId),
      planId: String(planId),
      scheduledAt,
    });
    return updated;
  },

  /**
   * Publish content immediately (approved/scheduled → published).
   */
  async publish(userId, planId) {
    return PublishingService.transitionStatus(userId, planId, 'published');
  },

  /** Expose transition map for validation */
  transitions: ContentWorkflowTransitions,
};

export default ContentWorkflow;
