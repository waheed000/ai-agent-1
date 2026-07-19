/**
 * Authentication routes — all mounted under /api/v1/auth
 */

import { Router } from 'express';
import AuthController from './AuthController.js';
import ProfileController from '../account/AccountController.js';
import { authenticate, currentUser } from '../../shared/middleware/authenticate.js';
import { authLimiter } from '../../shared/middleware/rateLimiter.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
} from './authValidators.js';
import {
  updateProfileValidator,
  changePasswordValidator,
} from '../account/profileValidators.js';

const router = Router();

// Apply auth-specific rate limiter to all routes in this file
router.use(authLimiter);

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post('/register',      registerValidator,     AuthController.register);
router.post('/login',         loginValidator,        AuthController.login);
router.post('/refresh-token', refreshTokenValidator, AuthController.refreshToken);

// ─── Auth (protected) ────────────────────────────────────────────────────────
router.post('/logout',     authenticate,              AuthController.logout);
router.post('/logout-all', authenticate,              AuthController.logoutAll);

// ─── Profile & account management ────────────────────────────────────────────
router.get('/me',              authenticate, currentUser,                        ProfileController.getMe);
router.patch('/profile',       authenticate, updateProfileValidator,             ProfileController.updateProfile);
router.patch('/change-password', authenticate, changePasswordValidator,          ProfileController.changePassword);
router.delete('/account',      authenticate,                                     ProfileController.deleteAccount);

export default router;
