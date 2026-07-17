/**
 * API v1 router — central registration point.
 */

import { Router } from 'express';
import healthRouter        from './health.js';
import authRouter          from './auth.js';
import accountRouter       from './account.js';
import integrationsRouter  from './integrations.js';
import platformsRouter     from './platforms.js';
import jobsRouter          from './jobs.js';
import analyticsRouter     from './analytics.js';
import competitorsRouter   from './competitors.js';
import trendsRouter        from './trends.js';
// Phase 11
import reportsRouter       from './reports.js';
import strategyRouter      from './strategy.js';
// Phase 12
import notificationsRouter from './notifications.js';
// Phase 13
import plannerRouter       from './planner.js';
import calendarRouter      from './calendar.js';
import draftsRouter        from './drafts.js';
// Phase 14
import workspacesRouter    from './workspaces.js';
import apikeysRouter       from './apikeys.js';
import searchRouter        from './search.js';
import settingsRouter      from './settings.js';
import usageRouter         from './usage.js';
import auditRouter         from './audit.js';
import featuresRouter      from './features.js';

const router = Router();

router.use('/health',        healthRouter);
router.use('/auth',          authRouter);
router.use('/account',       accountRouter);
router.use('/integrations',  integrationsRouter);
router.use('/platforms',     platformsRouter);
router.use('/jobs',          jobsRouter);
router.use('/analytics',     analyticsRouter);
router.use('/competitors',   competitorsRouter);
router.use('/trends',        trendsRouter);
router.use('/reports',       reportsRouter);
router.use('/strategy',      strategyRouter);
router.use('/notifications', notificationsRouter);
router.use('/planner',       plannerRouter);
router.use('/calendar',      calendarRouter);
router.use('/drafts',        draftsRouter);
// Phase 14
router.use('/workspaces',    workspacesRouter);
router.use('/apikeys',       apikeysRouter);
router.use('/search',        searchRouter);
router.use('/settings',      settingsRouter);
router.use('/usage',         usageRouter);
router.use('/audit',         auditRouter);
router.use('/features',      featuresRouter);

export default router;
