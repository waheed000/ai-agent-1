/**
 * AuthController
 * Receives HTTP requests, delegates to AuthService, and returns responses.
 * No business logic lives here.
 */

import AuthService from '../services/AuthService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { success, created } from '../utils/response.js';
import config from '../config/index.js';

// ─── Cookie helper ────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches JWT expiry
};

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, cookieOptions);
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: cookieOptions.sameSite });
};

/** Extract request meta (IP, user agent) for token storage. */
const getMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'] || null,
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

const AuthController = {
  /**
   * POST /api/v1/auth/register
   */
  register: asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const result = await AuthService.register({ name, email, password }, getMeta(req));

    setRefreshCookie(res, result.refreshToken);

    created(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Account created successfully');
  }),

  /**
   * POST /api/v1/auth/login
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password, getMeta(req));

    setRefreshCookie(res, result.refreshToken);

    success(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Login successful');
  }),

  /**
   * POST /api/v1/auth/logout
   * Revoke the current device's refresh token.
   */
  logout: asyncHandler(async (req, res) => {
    // Accept token from cookie OR body (supports non-browser clients)
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    await AuthService.logout(rawRefreshToken);

    clearRefreshCookie(res);
    success(res, null, 'Logged out successfully');
  }),

  /**
   * POST /api/v1/auth/logout-all
   * Revoke all refresh tokens for the authenticated user.
   */
  logoutAll: asyncHandler(async (req, res) => {
    await AuthService.logoutAll(req.user._id);

    clearRefreshCookie(res);
    success(res, null, 'Logged out from all devices');
  }),

  /**
   * POST /api/v1/auth/refresh-token
   * Issue a new access + refresh token pair (rotation).
   */
  refreshToken: asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const result = await AuthService.refreshTokens(rawRefreshToken, getMeta(req));

    setRefreshCookie(res, result.refreshToken);

    success(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Tokens refreshed successfully');
  }),
};

export default AuthController;
