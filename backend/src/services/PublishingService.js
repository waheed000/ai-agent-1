/**
 * PublishingService
 * Manages the publishing lifecycle for content plan items.
 * Actual platform API calls are stubbed — swap in real SDK calls when ready.
 */
import PlannerRepository from '../repositories/PlannerRepository.js';
import DraftRepository from '../repositories/DraftRepository.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const PublishingService = {
  /**
   * Transition a ContentPlan item to a new workflow status.
   * Enforces the valid transition graph.
   */
  async transitionStatus(userId, planId, newStatus) {
    const plan = await PlannerRepository.findById(planId, userId);
    const valid = ContentWorkflowTransitions[plan.status];

    if (!valid?.includes(newStatus)) {
      throw Object.assign(new Error(`Cannot transition from "${plan.status}" to "${newStatus}"`), {
        isOperational: true, statusCode: 422, code: 'INVALID_TRANSITION',
      });
    }

    const extra = {};
    if (newStatus === 'published') {
      extra.publishedAt = new Date();
      extra.platformPostId = `stub_${Date.now()}`;
    }
    if (newStatus === 'approved') {
      extra.approvedAt = new Date();
    }

    const updated = await PlannerRepository.update(planId, userId, { status: newStatus, ...extra });

    if (newStatus === 'published') {
      eventBus.emit(EVENT_TYPES.CONTENT_PUBLISHED, {
        userId: String(userId),
        planId: String(planId),
        platform: plan.platform,
      });
    }
    if (newStatus === 'approved') {
      eventBus.emit(EVENT_TYPES.CONTENT_APPROVED, {
        userId: String(userId),
        planId: String(planId),
      });
    }

    logger.info('PublishingService: status transition', {
      userId: String(userId),
      planId: String(planId),
      from: plan.status,
      to: newStatus,
    });

    return updated;
  },

  /**
   * Publish a draft (stub — simulates posting to platform).
   */
  async publishDraft(userId, draftId) {
    const draft = await DraftRepository.findById(draftId, userId);
    if (!draft) throw new NotFoundError('Draft');
    if (!['approved', 'scheduled'].includes(draft.status)) {
      throw Object.assign(new Error(`Draft must be approved or scheduled before publishing`), {
        isOperational: true, statusCode: 422, code: 'INVALID_STATUS',
      });
    }

    const updated = await DraftRepository.update(draftId, userId, {
      status: 'published',
      publishedAt: new Date(),
      platformPostId: `stub_draft_${Date.now()}`,
    });

    eventBus.emit(EVENT_TYPES.CONTENT_PUBLISHED, {
      userId: String(userId),
      draftId: String(draftId),
      platform: draft.platform,
    });

    logger.info('PublishingService: draft published (stub)', {
      userId: String(userId),
      draftId: String(draftId),
    });

    return updated;
  },
};

/** Valid status transitions for content workflow */
export const ContentWorkflowTransitions = {
  draft:     ['review', 'archived'],
  review:    ['approved', 'draft', 'archived'],
  approved:  ['scheduled', 'published', 'draft', 'archived'],
  scheduled: ['published', 'approved', 'archived'],
  published: ['archived'],
  archived:  [],
};

export default PublishingService;
