/**
 * AuditService
 * Records audit events. Non-fatal — a logging failure never crashes the caller.
 */
import AuditRepository from './AuditRepository.js';
import logger from '../../utils/logger.js';

const AuditService = {
  /**
   * Log an audit event.
   * @param {object} opts
   * @param {string|ObjectId} opts.userId
   * @param {string|ObjectId} [opts.workspaceId]
   * @param {string} opts.action  — one of AUDIT_ACTIONS
   * @param {string} [opts.resource]
   * @param {*} [opts.resourceId]
   * @param {object} [opts.metadata]
   * @param {string} [opts.ip]
   * @param {string} [opts.userAgent]
   */
  async log({ userId, workspaceId = null, action, resource = null, resourceId = null, metadata = {}, ip = null, userAgent = null } = {}) {
    try {
      return await AuditRepository.create({
        user:       userId   ? String(userId)      : null,
        workspace:  workspaceId ? String(workspaceId) : null,
        action,
        resource,
        resourceId,
        metadata,
        ip,
        userAgent,
      });
    } catch (err) {
      // Non-fatal — audit failures must never break business operations
      logger.error('AuditService.log failed', { action, error: err.message });
      return null;
    }
  },

  async getLogs(userId, opts) {
    return AuditRepository.findByUser(userId, opts);
  },

  async getWorkspaceLogs(workspaceId, opts) {
    return AuditRepository.findByWorkspace(workspaceId, opts);
  },
};

export default AuditService;
