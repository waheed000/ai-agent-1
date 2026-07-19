/**
 * TrendController
 * HTTP layer over TrendService.
 */

import TrendService from './TrendService.js';
import { success, badRequest, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const TrendController = {
  /**
   * GET /api/v1/trends
   * All active trends with optional filters.
   */
  async getTrends(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { platform, category, status, limit, minScore } = req.query;
      const trends = await TrendService.getTrends({
        platform,
        category,
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        minScore: minScore ? parseFloat(minScore) : undefined,
      });
      return success(res, trends, 'Trends retrieved', { count: trends.length });
    } catch (err) {
      logger.error('TrendController.getTrends failed', { error: err.message });
      return serverError(res, 'Failed to retrieve trends');
    }
  },

  /**
   * GET /api/v1/trends/topics
   */
  async getTopics(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { platform, limit, minScore } = req.query;
      const topics = await TrendService.getTopics({
        platform,
        limit: limit ? parseInt(limit, 10) : undefined,
        minScore: minScore ? parseFloat(minScore) : undefined,
      });
      return success(res, topics, 'Trending topics retrieved', { count: topics.length });
    } catch (err) {
      logger.error('TrendController.getTopics failed', { error: err.message });
      return serverError(res, 'Failed to retrieve trending topics');
    }
  },

  /**
   * GET /api/v1/trends/hashtags
   */
  async getHashtags(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { platform, limit, minScore } = req.query;
      const hashtags = await TrendService.getHashtags({
        platform,
        limit: limit ? parseInt(limit, 10) : undefined,
        minScore: minScore ? parseFloat(minScore) : undefined,
      });
      return success(res, hashtags, 'Trending hashtags retrieved', { count: hashtags.length });
    } catch (err) {
      logger.error('TrendController.getHashtags failed', { error: err.message });
      return serverError(res, 'Failed to retrieve trending hashtags');
    }
  },

  /**
   * GET /api/v1/trends/creators
   * Format, keyword, and challenge trends relevant to creators.
   */
  async getCreatorTrends(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { platform, limit } = req.query;
      const trends = await TrendService.getCreatorTrends({
        platform,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return success(res, trends, 'Creator trends retrieved', { count: trends.length });
    } catch (err) {
      logger.error('TrendController.getCreatorTrends failed', { error: err.message });
      return serverError(res, 'Failed to retrieve creator trends');
    }
  },

  /**
   * POST /api/v1/trends/refresh
   * Trigger a trend collection + analysis cycle.
   */
  async refreshTrends(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { platform, category } = req.body;
      const result = await TrendService.refreshTrends({ platform, category });
      return success(res, result, 'Trend refresh complete');
    } catch (err) {
      logger.error('TrendController.refreshTrends failed', { error: err.message });
      return serverError(res, 'Trend refresh failed');
    }
  },
};

export default TrendController;
