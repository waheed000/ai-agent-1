/**
 * UsageService
 * Records and queries per-user usage across all feature categories.
 */
import UsageRepository from './UsageRepository.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import logger from '../../utils/logger.js';

const UsageService = {
  /**
   * Record a usage event. Non-fatal.
   */
  async record(userId, category, action, { workspaceId = null, count = 1, metadata = {} } = {}) {
    try {
      const record = await UsageRepository.record(userId, workspaceId, { category, action, count, metadata });
      eventBus.emit(EVENT_TYPES.USAGE_RECORDED, {
        userId: String(userId),
        category,
        action,
        count,
      });
      return record;
    } catch (err) {
      // Non-fatal — usage failures must never block business operations
      logger.error('UsageService.record failed', { userId: String(userId), category, error: err.message });
      return null;
    }
  },

  async getHistory(userId, opts) {
    return UsageRepository.findByUser(userId, opts);
  },

  async getSummary(userId, opts) {
    return UsageRepository.summarizeByUser(userId, opts);
  },

  async getCount(userId, category) {
    return UsageRepository.countByCategory(userId, category);
  },
};

export default UsageService;
