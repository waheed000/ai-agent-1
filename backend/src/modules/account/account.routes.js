/**
 * Account routes — session management.
 * All routes require authentication.
 *
 * Mounted at /api/v1/account
 */

import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import SessionController from '../auth/SessionController.js';
import { sessionIdValidator } from '../auth/sessionValidators.js';

const router = Router();

// All account routes require a valid access token
router.use(authenticate);

/**
 * GET /api/v1/account/sessions
 * List all active sessions for the current user.
 */
router.get('/sessions', SessionController.listSessions);

/**
 * DELETE /api/v1/account/sessions
 * Revoke every session except the current one ("logout other devices").
 */
router.delete('/sessions', SessionController.revokeOtherSessions);

/**
 * DELETE /api/v1/account/sessions/:id
 * Revoke a specific session by ID.
 */
router.delete('/sessions/:id', sessionIdValidator, SessionController.revokeSession);

export default router;
