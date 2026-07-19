/**
 * AnalyticsController
 * Thin HTTP layer over AnalyticsService.
 * Parses query params, delegates to service, sends response.
 */

import AnalyticsService from './AnalyticsService.js';
import { success, badRequest, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

function parseQuery(req) {
  return {
    platform: req.query.platform || undefined,
    startDate: req.query.startDate || undefined,
    endDate: req.query.endDate || undefined,
    compare: req.query.compare || undefined,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
  };
}

const AnalyticsController = {
  /**
   * GET /api/v1/analytics/overview
   */
  async getOverview(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await AnalyticsService.getOverview(
        String(req.user._id),
        parseQuery(req)
      );
      return success(res, data, 'Analytics overview retrieved');
    } catch (err) {
      logger.error('AnalyticsController.getOverview failed', { error: err.message });
      return serverError(res, 'Failed to retrieve analytics overview');
    }
  },

  /**
   * GET /api/v1/analytics/growth
   */
  async getGrowth(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await AnalyticsService.getGrowth(
        String(req.user._id),
        parseQuery(req)
      );
      return success(res, data, 'Growth analytics retrieved');
    } catch (err) {
      logger.error('AnalyticsController.getGrowth failed', { error: err.message });
      return serverError(res, 'Failed to retrieve growth analytics');
    }
  },

  /**
   * GET /api/v1/analytics/engagement
   */
  async getEngagement(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await AnalyticsService.getEngagement(
        String(req.user._id),
        parseQuery(req)
      );
      return success(res, data, 'Engagement analytics retrieved');
    } catch (err) {
      logger.error('AnalyticsController.getEngagement failed', { error: err.message });
      return serverError(res, 'Failed to retrieve engagement analytics');
    }
  },

  /**
   * GET /api/v1/analytics/content-performance
   */
  async getContentPerformance(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await AnalyticsService.getContentPerformance(
        String(req.user._id),
        parseQuery(req)
      );
      return success(res, data, 'Content performance analytics retrieved');
    } catch (err) {
      logger.error('AnalyticsController.getContentPerformance failed', { error: err.message });
      return serverError(res, 'Failed to retrieve content performance analytics');
    }
  },

  /**
   * GET /api/v1/analytics/best-posting-time
   */
  async getBestPostingTime(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await AnalyticsService.getBestPostingTime(
        String(req.user._id),
        parseQuery(req)
      );
      return success(res, data, 'Best posting time analysis retrieved');
    } catch (err) {
      logger.error('AnalyticsController.getBestPostingTime failed', { error: err.message });
      return serverError(res, 'Failed to retrieve best posting time analysis');
    }
  },

  /**
   * GET /api/v1/analytics/audience
   */
  async getAudience(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await AnalyticsService.getAudience(
        String(req.user._id),
        parseQuery(req)
      );
      return success(res, data, 'Audience analytics retrieved');
    } catch (err) {
      logger.error('AnalyticsController.getAudience failed', { error: err.message });
      return serverError(res, 'Failed to retrieve audience analytics');
    }
  },
};

export default AnalyticsController;
