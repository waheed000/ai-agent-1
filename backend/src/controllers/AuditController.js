/**
 * AuditController
 * Exposes audit log read endpoints.
 */
import AuditService from '../services/AuditService.js';
import { success, badRequest, serverError } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const AuditController = {
  /** GET /api/v1/audit */
  async getLogs(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { action, limit, skip } = req.query;
      const logs = await AuditService.getLogs(String(req.user._id), {
        action,
        limit: limit ? parseInt(limit, 10) : 50,
        skip:  skip  ? parseInt(skip, 10)  : 0,
      });
      return success(res, logs, 'Audit logs retrieved', { count: logs.length });
    } catch (err) {
      logger.error('AuditController.getLogs failed', { error: err.message });
      return serverError(res, 'Failed to retrieve audit logs');
    }
  },
};

export default AuditController;
