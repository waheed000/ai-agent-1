/**
 * SearchController
 * Handles global search across all resource types.
 */
import SearchService from '../services/SearchService.js';
import UsageService from '../services/UsageService.js';
import { success, badRequest, serverError } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const SearchController = {
  /** GET /api/v1/search?q=...&limit=... */
  async search(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { q, limit, skip } = req.query;
      const results = await SearchService.search(
        String(req.user._id),
        q,
        limit ? Math.min(parseInt(limit, 10), 50) : 10,
        skip  ? Math.max(parseInt(skip,  10), 0)  : 0
      );

      await UsageService.record(String(req.user._id), 'analytics', 'search');

      return success(res, results, 'Search complete');
    } catch (err) {
      logger.error('SearchController.search failed', { error: err.message });
      return serverError(res, 'Search failed');
    }
  },
};

export default SearchController;
