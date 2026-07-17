/**
 * ApiKeyService
 * Business logic for API key management.
 * Raw keys are generated once and never stored.
 */
import crypto from 'node:crypto';
import ApiKeyRepository from '../repositories/ApiKeyRepository.js';
import AuditService from './AuditService.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';
import logger from '../utils/logger.js';

const KEY_PREFIX = 'cos_';
const KEY_BYTES = 32; // 256-bit random key

function generateRawKey() {
  return KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('hex');
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

const ApiKeyService = {
  /**
   * Create a new API key.
   * Returns { apiKey (doc), rawKey } — rawKey is shown ONCE to the user.
   */
  async create(userId, { description = '', scopes = [], expiresAt = null, workspaceId = null } = {}) {
    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const prefix = rawKey.slice(0, 8);

    const apiKey = await ApiKeyRepository.create(userId, {
      description,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      workspace: workspaceId || null,
      prefix,
      keyHash,
    });

    await AuditService.log({
      userId,
      action: 'apikey.created',
      resource: 'ApiKey',
      resourceId: apiKey._id,
      metadata: { description, scopes },
    });

    eventBus.emit(EVENT_TYPES.API_KEY_CREATED, {
      userId: String(userId),
      apiKeyId: String(apiKey._id),
    });

    logger.info('ApiKeyService: key created', { userId: String(userId), apiKeyId: String(apiKey._id) });

    return { apiKey, rawKey };
  },

  async getAll(userId) {
    return ApiKeyRepository.findAllByUser(userId);
  },

  async update(userId, apiKeyId, data) {
    const allowed = {};
    if (data.description !== undefined) allowed.description = data.description;
    if (data.expiresAt !== undefined) allowed.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.scopes !== undefined) allowed.scopes = data.scopes;
    return ApiKeyRepository.update(apiKeyId, userId, allowed);
  },

  async revoke(userId, apiKeyId) {
    const apiKey = await ApiKeyRepository.revoke(apiKeyId, userId);

    await AuditService.log({
      userId,
      action: 'apikey.revoked',
      resource: 'ApiKey',
      resourceId: apiKeyId,
    });

    eventBus.emit(EVENT_TYPES.API_KEY_REVOKED, {
      userId: String(userId),
      apiKeyId: String(apiKeyId),
    });

    logger.info('ApiKeyService: key revoked', { userId: String(userId), apiKeyId: String(apiKeyId) });
    return apiKey;
  },

  async delete(userId, apiKeyId) {
    const deleted = await ApiKeyRepository.softDelete(apiKeyId, userId);

    await AuditService.log({
      userId,
      action: 'apikey.deleted',
      resource: 'ApiKey',
      resourceId: apiKeyId,
    });

    return deleted;
  },

  /**
   * Validate a raw key from an incoming request.
   * Returns the ApiKey document if valid; null otherwise.
   */
  async validate(rawKey) {
    if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;
    const keyHash = hashKey(rawKey);
    const apiKey = await ApiKeyRepository.findByHash(keyHash);
    if (!apiKey) return null;
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null;
    await ApiKeyRepository.touchLastUsed(apiKey._id);
    return apiKey;
  },
};

export default ApiKeyService;
