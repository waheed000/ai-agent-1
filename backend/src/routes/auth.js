/**
 * Authentication routes — all mounted under /api/v1/auth
 */

import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
} from '../validators/authValidators.js';

const router = Router();

// Apply auth-specific rate limiter to all routes in this file
router.use(authLimiter);

// Public routes
router.post('/register',      registerValidator,     AuthController.register);
router.post('/login',         loginValidator,        AuthController.login);
router.post('/refresh-token', refreshTokenValidator, AuthController.refreshToken);

// Protected routes
router.post('/logout',     authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);

export default router;
