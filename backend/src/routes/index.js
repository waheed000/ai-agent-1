/**
 * API v1 router — central registration point.
 */

import { Router } from 'express';
import healthRouter        from '../modules/health/health.routes.js';
import authRouter          from '../modules/auth/auth.routes.js';
import accountRouter       from '../modules/account/account.routes.js';
import integrationsRouter  from '../modules/integrations/integrations.routes.js';
import platformsRouter     from '../modules/platforms/platforms.routes.js';
import jobsRouter          from '../modules/jobs/jobs.routes.js';
import analyticsRouter     from '../modules/analytics/analytics.routes.js';
import competitorsRouter   from '../modules/competitors/competitors.routes.js';
import trendsRouter        from '../modules/trends/trends.routes.js';
import reportsRouter       from '../modules/reports/reports.routes.js';
import strategyRouter      from '../modules/strategy/strategy.routes.js';
import notificationsRouter from '../modules/notifications/notifications.routes.js';
import plannerRouter       from '../modules/content/planner.routes.js';
import calendarRouter      from '../modules/content/calendar.routes.js';
import draftsRouter        from '../modules/content/drafts.routes.js';
import workspacesRouter    from '../modules/workspaces/workspaces.routes.js';
import apikeysRouter       from '../modules/apikeys/apikeys.routes.js';
import searchRouter        from '../modules/search/search.routes.js';
import settingsRouter      from '../modules/settings/settings.routes.js';
import usageRouter         from '../modules/usage/usage.routes.js';
import auditRouter         from '../modules/audit/audit.routes.js';
import featuresRouter      from '../modules/features/features.routes.js';

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
router.use('/workspaces',    workspacesRouter);
router.use('/apikeys',       apikeysRouter);
router.use('/search',        searchRouter);
router.use('/settings',      settingsRouter);
router.use('/usage',         usageRouter);
router.use('/audit',         auditRouter);
router.use('/features',      featuresRouter);

export default router;
