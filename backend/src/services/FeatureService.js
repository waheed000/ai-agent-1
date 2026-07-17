/**
 * FeatureService
 * Manages global feature flags and per-workspace overrides.
 */
import FeatureRepository from '../repositories/FeatureRepository.js';
import WorkspaceRepository from '../repositories/WorkspaceRepository.js';
import CacheService from './CacheService.js';
import { FEATURE_KEYS } from '../models/FeatureFlag.js';
import logger from '../utils/logger.js';

const CACHE_NS = 'features';
const CACHE_TTL = 60 * 10; // 10 min

const DEFAULT_FLAGS = Object.fromEntries(FEATURE_KEYS.map(k => [k, true]));

const FeatureService = {
  async getAll() {
    return CacheService.getOrSet(
      CACHE_NS,
      'global',
      () => FeatureRepository.findAll(),
      CACHE_TTL
    );
  },

  async getByKey(key) {
    return FeatureRepository.findByKey(key);
  },

  /**
   * Check if a feature is enabled.
   * Checks workspace override first, then global flag, then defaults to true.
   */
  async isEnabled(key, workspaceId = null) {
    // Workspace-level override
    if (workspaceId) {
      try {
        const workspace = await WorkspaceRepository.findById(workspaceId);
        if (workspace.featureFlags && key in workspace.featureFlags) {
          return Boolean(workspace.featureFlags[key]);
        }
      } catch {
        // Workspace not found — fall through to global
      }
    }

    // Global flag
    try {
      const flag = await FeatureRepository.findByKey(key);
      return flag.enabled;
    } catch {
      // Flag not seeded yet — default true
      return DEFAULT_FLAGS[key] ?? true;
    }
  },

  async setEnabled(key, enabled) {
    const flag = await FeatureRepository.setEnabled(key, enabled);
    await CacheService.del(CACHE_NS, 'global');
    logger.info('FeatureService: flag toggled', { key, enabled });
    return flag;
  },

  async upsert(key, data) {
    const flag = await FeatureRepository.upsert(key, data);
    await CacheService.del(CACHE_NS, 'global');
    return flag;
  },

  /**
   * Set a per-workspace feature flag override.
   */
  async setWorkspaceFlag(workspaceId, key, enabled) {
    const workspace = await WorkspaceRepository.update(workspaceId, {
      [`featureFlags.${key}`]: Boolean(enabled),
    });
    logger.info('FeatureService: workspace flag set', { workspaceId: String(workspaceId), key, enabled });
    return workspace;
  },
};

export default FeatureService;
