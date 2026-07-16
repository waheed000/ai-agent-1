/**
 * SessionController
 * Handles HTTP layer for session management.
 * Delegates all business logic to SessionService.
 */

import SessionService from '../services/SessionService.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

const SessionController = {
  /**
   * GET /api/v1/account/sessions
   * List all active sessions for the authenticated user.
   */
  listSessions: asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refreshToken || null;
    const sessions = await SessionService.listSessions(req.user._id, rawRefreshToken);
    return success(res, { sessions, count: sessions.length }, 'Sessions retrieved');
  }),

  /**
   * DELETE /api/v1/account/sessions/:id
   * Revoke a specific session by ID.
   */
  revokeSession: asyncHandler(async (req, res) => {
    await SessionService.revokeSession(req.params.id, req.user._id);
    return success(res, null, 'Session revoked');
  }),

  /**
   * DELETE /api/v1/account/sessions
   * Revoke all sessions except the current one.
   */
  revokeOtherSessions: asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refreshToken || null;
    const revokedCount = await SessionService.revokeOtherSessions(req.user._id, rawRefreshToken);
    return success(res, { revokedCount }, 'All other sessions revoked');
  }),
};

export default SessionController;
