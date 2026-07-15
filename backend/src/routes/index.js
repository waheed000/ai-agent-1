/**
 * API v1 router — central registration point.
 * Add new feature routers here as they are built in future phases.
 */

import { Router } from 'express';
import healthRouter from './health.js';

const router = Router();

router.use('/health', healthRouter);

// Future routes will be mounted here:
// router.use('/auth',        authRouter);
// router.use('/users',       userRouter);
// router.use('/analytics',   analyticsRouter);
// router.use('/insights',    insightsRouter);
// router.use('/content',     contentRouter);
// router.use('/competitors', competitorRouter);
// router.use('/trends',      trendsRouter);
// router.use('/reports',     reportsRouter);

export default router;
