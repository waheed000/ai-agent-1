/**
 * SessionService
 * Business logic for session management.
 * Sessions are RefreshToken documents enriched with device/browser/OS metadata.
 */

import SessionRepository from './SessionRepository.js';
import TokenService from './TokenService.js';
import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/** Shape a RefreshToken document into a public-facing session object. */
function toSessionView(doc, currentTokenHash) {
  return {
    id: String(doc._id),
    deviceName: doc.deviceName || 'Unknown Device',
    browser: doc.browser || 'Unknown Browser',
    os: doc.os || 'Unknown OS',
    ipAddress: doc.ipAddress || null,
    loginTime: doc.createdAt,
    lastActivity: doc.lastUsedAt || doc.createdAt,
    expiresAt: doc.expiresAt,
    isCurrent: doc.tokenHash
      ? doc.tokenHash === currentTokenHash
      : false,
  };
}

const SessionService = {
  /**
   * Return all active sessions for a user.
   * Marks the current session based on the provided raw refresh token.
   *
   * @param {string} userId
   * @param {string|null} rawRefreshToken  Raw token from cookie (may be absent)
   */
  async listSessions(userId, rawRefreshToken = null) {
    const sessions = await SessionRepository.findActiveByUser(userId);

    const currentHash = rawRefreshToken
      ? TokenService.hashToken(rawRefreshToken)
      : null;

    // Re-fetch with tokenHash for "isCurrent" comparison
    const full = await Promise.all(
      sessions.map(async (s) => {
        // findActiveByUser strips tokenHash; fetch it individually for comparison
        const withHash = await SessionRepository.findActiveById(s._id);
        return toSessionView(withHash ?? s, currentHash);
      })
    );

    return full;
  },

  /**
   * Revoke a single session by ID.
   * Verifies the session belongs to the user before revoking.
   *
   * @param {string} sessionId
   * @param {string} userId
   */
  async revokeSession(sessionId, userId) {
    const session = await SessionRepository.findActiveById(sessionId);
    if (!session) throw new NotFoundError('Session');

    if (String(session.user) !== String(userId)) {
      // Return NotFoundError — don't reveal another user's session exists
      throw new NotFoundError('Session');
    }

    await SessionRepository.revokeById(sessionId, userId, 'logout');
    logger.info('Session revoked', { sessionId, userId });
  },

  /**
   * Revoke all sessions EXCEPT the current one.
   * Keeps the caller logged in on the current device.
   *
   * @param {string} userId
   * @param {string|null} rawRefreshToken  Current session's raw refresh token (from cookie)
   */
  async revokeOtherSessions(userId, rawRefreshToken = null) {
    const currentHash = rawRefreshToken
      ? TokenService.hashToken(rawRefreshToken)
      : null;

    const result = await SessionRepository.revokeAllExcept(userId, currentHash, 'logout');
    logger.info('Other sessions revoked', { userId, revokedCount: result.modifiedCount });
    return result.modifiedCount;
  },
};

export default SessionService;
