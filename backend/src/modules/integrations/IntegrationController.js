/**
 * IntegrationController
 * Handles HTTP layer for connected account (integration) management.
 * Delegates all business logic to ConnectedAccountService.
 */

import ConnectedAccountService from './ConnectedAccountService.js';
import { success } from '../../utils/response.js';
import asyncHandler from '../../utils/asyncHandler.js';

const IntegrationController = {
  /**
   * GET /api/v1/integrations
   * List all connected accounts for the authenticated user.
   */
  listIntegrations: asyncHandler(async (req, res) => {
    const accounts = await ConnectedAccountService.listConnectedAccounts(req.user._id);
    return success(res, { integrations: accounts, count: accounts.length }, 'Connected accounts retrieved');
  }),

  /**
   * DELETE /api/v1/integrations/:platform
   * Disconnect a platform account.
   */
  disconnectPlatform: asyncHandler(async (req, res) => {
    await ConnectedAccountService.disconnectPlatform(req.user._id, req.params.platform);
    return success(res, null, `${req.params.platform} account disconnected`);
  }),
};

export default IntegrationController;
