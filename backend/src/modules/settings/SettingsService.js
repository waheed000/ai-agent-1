/**
 * SettingsService
 * Manages user and workspace settings.
 */
import SettingsRepository from './SettingsRepository.js';
import AuditService from '../audit/AuditService.js';
import CacheService from '../../infrastructure/cache/index.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import { SETTINGS_TYPES } from '../../models/Settings.js';
import logger from '../../utils/logger.js';

const CACHE_NS = 'settings';
const CACHE_TTL = 60 * 10;

const SettingsService = {
  async getAll(userId) {
    return CacheService.getOrSet(
      CACHE_NS,
      `user:${userId}:all`,
      () => SettingsRepository.findAllByUser(userId),
      CACHE_TTL
    );
  },

  async getByType(userId, type) {
    return CacheService.getOrSet(
      CACHE_NS,
      `user:${userId}:${type}`,
      () => SettingsRepository.findByUserAndType(userId, type),
      CACHE_TTL
    );
  },

  async update(userId, type, data, { workspaceId = null, ip = null, userAgent = null } = {}) {
    const settings = await SettingsRepository.upsert(userId, type, { ...data, workspace: workspaceId });

    await CacheService.del(CACHE_NS, `user:${userId}:${type}`);
    await CacheService.del(CACHE_NS, `user:${userId}:all`);

    await AuditService.log({
      userId,
      workspaceId,
      action: 'settings.updated',
      resource: 'Settings',
      resourceId: settings._id,
      metadata: { type, fields: Object.keys(data) },
      ip,
      userAgent,
    });

    eventBus.emit(EVENT_TYPES.SETTINGS_UPDATED, {
      userId: String(userId),
      type,
    });

    logger.info('SettingsService: updated', { userId: String(userId), type });
    return settings;
  },
};

export default SettingsService;
