/**
 * UsageController
 * Exposes usage history and summary endpoints.
 */
import UsageService from './UsageService.js';
import { success, badRequest, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const UsageController = {
  /** GET /api/v1/usage */
  async getHistory(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { category, from, to, limit, skip } = req.query;
      const records = await UsageService.getHistory(String(req.user._id), {
        category,
        from,
        to,
        limit: limit ? parseInt(limit, 10) : 100,
        skip:  skip  ? parseInt(skip, 10)  : 0,
      });
      return success(res, records, 'Usage history retrieved', { count: records.length });
    } catch (err) {
      logger.error('UsageController.getHistory failed', { error: err.message });
      return serverError(res, 'Failed to retrieve usage history');
    }
  },

  /** GET /api/v1/usage/summary */
  async getSummary(req, res) {
    try {
      const { from, to } = req.query;
      const summary = await UsageService.getSummary(String(req.user._id), { from, to });
      return success(res, summary, 'Usage summary retrieved');
    } catch (err) {
      logger.error('UsageController.getSummary failed', { error: err.message });
      return serverError(res, 'Failed to retrieve usage summary');
    }
  },
};

export default UsageController;
