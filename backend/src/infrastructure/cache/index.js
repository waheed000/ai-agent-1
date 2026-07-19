/**
 * CacheService
 * Redis-backed cache with graceful degradation.
 *
 * When Redis is unavailable the service operates in pass-through mode:
 * all gets return null and sets are no-ops — callers never check availability.
 *
 * Namespaced key format: creatorOS:<namespace>:<key>
 * TTLs are driven by config.cache.ttl and can be overridden per call.
 */

import Redis from 'ioredis';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

class CacheService {
  constructor() {
    /** @type {Redis|null} */
    this.client  = null;
    this.enabled = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async init() {
    try {
      this.client = new Redis({
        host:               config.redis.host,
        port:               config.redis.port,
        password:           config.redis.password,
        db:                 config.redis.db,
        maxRetriesPerRequest: 1,
        enableReadyCheck:   false,
        lazyConnect:        true,
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
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
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
      const seconds = ttl ?? config.cache.ttl[namespace] ?? config.cache.ttl.general;
      await this.client.setex(this._key(namespace, key), seconds, JSON.stringify(value));
    } catch (err) {
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
    } catch (err) {
      logger.warn('CacheService.del error', { namespace, key, error: err.message });
    }
  }

  /**
   * Delete all keys matching a namespace prefix.
   * Use after writes that invalidate an entire namespace for a user.
   */
  async delPattern(namespace, pattern) {
    if (!this.enabled) return;
    try {
      const keys = await this.client.keys(this._key(namespace, `${pattern}*`));
      if (keys.length > 0) await this.client.del(...keys);
    } catch (err) {
      logger.warn('CacheService.delPattern error', { namespace, pattern, error: err.message });
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

  // ─── Health ───────────────────────────────────────────────────────────────

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
