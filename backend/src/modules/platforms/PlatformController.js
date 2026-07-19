/**
 * PlatformController
 * HTTP layer for platform sync endpoints.
 * Delegates all business logic to SyncService.
 */

import SyncService from './SyncService.js';
import { success } from '../../utils/response.js';
import asyncHandler from '../../utils/asyncHandler.js';

const PlatformController = {
  /**
   * POST /api/v1/platforms/:platform/sync
   * Trigger a full data sync for the authenticated user's connected platform.
   */
  sync: asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const result = await SyncService.sync(req.user._id, platform);

    return success(res, result, `${platform} sync ${result.status}`);
  }),

  /**
   * GET /api/v1/platforms/:platform/status
   * Return the current sync status for a platform.
   */
  getStatus: asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const status = await SyncService.getStatus(req.user._id, platform);

    return success(res, status, `${platform} status retrieved`);
  }),
};

export default PlatformController;
