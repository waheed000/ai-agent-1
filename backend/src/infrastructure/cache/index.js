/**
 * CacheService — Phase 15B
 * Redis-backed cache with graceful degradation, statistics, and named-domain helpers.
 *
 * Namespaced key format: creatorOS:<namespace>:<key>
 *
 * Changes in 15B:
 *  - Hit/miss/set/delete/error counters (fed into MetricsService)
 *  - getStats() for monitoring & health endpoints
 *  - clearDomain(namespace) helper — invalidate all keys for one data domain
 *  - wrap() helper — cache-aside with TTL override & forced-refresh support
 *  - TTL defaults extended with domain-specific namespaces (analytics, reports, etc.)
 */

import Redis from 'ioredis';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import MetricsService from '../metrics/index.js';

class CacheService {
  constructor() {
    /** @type {Redis|null} */
    this.client  = null;
    this.enabled = false;

    // Internal stats (also reflected in MetricsService)
    this._stats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async init() {
    try {
      this.client = new Redis({
        host:                 config.redis.host,
        port:                 config.redis.port,
        password:             config.redis.password,
        db:                   config.redis.db,
        maxRetriesPerRequest: 1,
        enableReadyCheck:     false,
        lazyConnect:          true,
      });

      await this.client.connect();
      await this.client.ping();
      this.enabled = true;
      logger.info('CacheService: Redis connected');
    } catch (err) {
      logger.warn('CacheService: Redis unavailable — caching disabled', { error: err.message });
      this.client  = null;
      this.enabled = false;
    }
  }

  async disconnect() {
    if (this.client) {
      try { this.client.disconnect(); } catch { /* ignore */ }
      this.client  = null;
      this.enabled = false;
    }
  }

  // ─── Core operations ──────────────────────────────────────────────────────

  /**
   * Get a cached value.
   * @param {string} namespace
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(namespace, key) {
    if (!this.enabled) return null;
    try {
      const raw = await this.client.get(this._key(namespace, key));
      if (raw !== null) {
        this._stats.hits++;
        MetricsService.recordCacheHit();
        return JSON.parse(raw);
      }
      this._stats.misses++;
      MetricsService.recordCacheMiss();
      return null;
    } catch (err) {
      this._stats.errors++;
      MetricsService.recordCacheError();
      logger.warn('CacheService.get error', { namespace, key, error: err.message });
      return null;
    }
  }

  /**
   * Store a value in the cache.
   * @param {string} namespace
   * @param {string} key
   * @param {any}    value
   * @param {number} [ttl]  Seconds; falls back to config.cache.ttl[namespace] or general.
   */
  async set(namespace, key, value, ttl) {
    if (!this.enabled) return;
    try {
      const seconds = ttl ?? config.cache.ttl[namespace] ?? config.cache.ttl.general ?? 300;
      await this.client.setex(this._key(namespace, key), seconds, JSON.stringify(value));
      this._stats.sets++;
      MetricsService.recordCacheSet();
    } catch (err) {
      this._stats.errors++;
      MetricsService.recordCacheError();
      logger.warn('CacheService.set error', { namespace, key, error: err.message });
    }
  }

  /**
   * Delete a cached value.
   */
  async del(namespace, key) {
    if (!this.enabled) return;
    try {
      await this.client.del(this._key(namespace, key));
      this._stats.deletes++;
      MetricsService.recordCacheDelete();
    } catch (err) {
      this._stats.errors++;
      MetricsService.recordCacheError();
      logger.warn('CacheService.del error', { namespace, key, error: err.message });
    }
  }

  /**
   * Delete all keys matching a namespace prefix.
   * Use after writes that invalidate an entire namespace for a user.
   */
  async delPattern(namespace, pattern) {
    if (!this.enabled) return 0;
    try {
      const keys = await this.client.keys(this._key(namespace, `${pattern}*`));
      if (keys.length > 0) {
        await this.client.del(...keys);
        this._stats.deletes += keys.length;
        MetricsService.recordCacheDelete();
      }
      return keys.length;
    } catch (err) {
      this._stats.errors++;
      MetricsService.recordCacheError();
      logger.warn('CacheService.delPattern error', { namespace, pattern, error: err.message });
      return 0;
    }
  }

  /**
   * Invalidate every cached key in a named domain (namespace).
   * Use when a bulk write or import invalidates an entire data category.
   *
   * @param {string} namespace  e.g. 'analytics', 'reports', 'competitors'
   * @returns {Promise<number>}  number of keys deleted
   */
  async clearDomain(namespace) {
    if (!this.enabled) return 0;
    try {
      const pattern = `creatorOS:${namespace}:*`;
      const keys    = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this._stats.deletes += keys.length;
        MetricsService.recordCacheDelete();
        logger.debug('CacheService.clearDomain', { namespace, deleted: keys.length });
      }
      return keys.length;
    } catch (err) {
      this._stats.errors++;
      MetricsService.recordCacheError();
      logger.warn('CacheService.clearDomain error', { namespace, error: err.message });
      return 0;
    }
  }

  /**
   * Get a value or compute it if missing (cache-aside pattern).
   * @param {string}   namespace
   * @param {string}   key
   * @param {Function} computeFn  async () => value
   * @param {number}   [ttl]
   */
  async getOrSet(namespace, key, computeFn, ttl) {
    const cached = await this.get(namespace, key);
    if (cached !== null) return cached;
    const value = await computeFn();
    await this.set(namespace, key, value, ttl);
    return value;
  }

  /**
   * Cache-aside with forced-refresh support and error isolation.
   * If computeFn throws and a stale cached value exists, returns it with a warning.
   * If forceRefresh=true, skips the cache read and always re-computes.
   *
   * @param {string}   namespace
   * @param {string}   key
   * @param {Function} computeFn   async () => value
   * @param {{ ttl?: number, forceRefresh?: boolean }} [opts]
   */
  async wrap(namespace, key, computeFn, opts = {}) {
    const { ttl, forceRefresh = false } = opts;

    if (!forceRefresh) {
      const cached = await this.get(namespace, key);
      if (cached !== null) return cached;
    }

    try {
      const value = await computeFn();
      await this.set(namespace, key, value, ttl);
      return value;
    } catch (err) {
      // On compute error, return stale data if it exists
      if (!forceRefresh) {
        const stale = await this.get(namespace, key);
        if (stale !== null) {
          logger.warn('CacheService.wrap: returning stale data after compute error', {
            namespace, key, error: err.message,
          });
          return stale;
        }
      }
      throw err;
    }
  }

  // ─── Domain-specific helpers ──────────────────────────────────────────────
  // Convenience wrappers for the five domains mentioned in the Phase 15B spec.

  /** Cache analytics data for a user (or user+platform). */
  async getAnalytics(userId, subKey, computeFn, ttl) {
    return this.wrap('analytics', `${userId}:${subKey}`, computeFn, { ttl });
  }

  /** Invalidate all analytics cached entries for a user. */
  async invalidateAnalytics(userId) {
    return this.delPattern('analytics', `${userId}:`);
  }

  /** Cache report data for a user. */
  async getReport(userId, reportType, computeFn, ttl) {
    return this.wrap('reports', `${userId}:${reportType}`, computeFn, { ttl });
  }

  /** Invalidate all cached reports for a user. */
  async invalidateReports(userId) {
    return this.delPattern('reports', `${userId}:`);
  }

  /** Cache planner data (content ideas, calendar). */
  async getPlanner(userId, subKey, computeFn, ttl) {
    return this.wrap('planner', `${userId}:${subKey}`, computeFn, { ttl });
  }

  /** Invalidate all planner cache for a user. */
  async invalidatePlanner(userId) {
    return this.delPattern('planner', `${userId}:`);
  }

  /** Cache competitor data. */
  async getCompetitor(userId, competitorId, subKey, computeFn, ttl) {
    return this.wrap('competitors', `${userId}:${competitorId}:${subKey}`, computeFn, { ttl });
  }

  /** Invalidate all competitor cache for a user. */
  async invalidateCompetitors(userId) {
    return this.delPattern('competitors', `${userId}:`);
  }

  /** Cache search results (short TTL by default). */
  async getSearch(userId, query, computeFn, ttl = 60) {
    const safeKey = Buffer.from(query).toString('base64').slice(0, 64);
    return this.wrap('search', `${userId}:${safeKey}`, computeFn, { ttl });
  }

  // ─── Statistics & health ──────────────────────────────────────────────────

  /**
   * Return cache statistics since startup.
   * @returns {{ hits, misses, sets, deletes, errors, hitRate }}
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      ...this._stats,
      hitRate: total ? Math.round(this._stats.hits / total * 10000) / 100 : null,
      enabled: this.enabled,
    };
  }

  async ping() {
    if (!this.enabled) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _key(namespace, key) {
    return `creatorOS:${namespace}:${key}`;
  }
}

export default new CacheService();
