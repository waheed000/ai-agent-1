import { Router } from 'express';
import { getDatabaseStatus } from '../database/index.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/v1/health
 * Returns server health, database connectivity, and runtime info.
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = getDatabaseStatus();

    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      data: {
        status: 'ok',
        database: db,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  })
);

export default router;
