/**
 * Register all event listeners.
 * Call initListeners() once at server startup after QueueService.init().
 */

import { registerPlatformSyncedListener } from './PlatformSynced.js';
import { registerAnalyticsCompletedListener } from './AnalyticsCompleted.js';
import { registerTrendUpdatedListener } from './TrendUpdated.js';
import { registerCompetitorUpdatedListener } from './CompetitorUpdated.js';
import { registerAIReportGeneratedListener } from './AIReportGenerated.js';
import { registerGrowthPlanGeneratedListener } from './GrowthPlanGenerated.js';
import logger from '../../utils/logger.js';

export function initListeners() {
  registerPlatformSyncedListener();
  registerAnalyticsCompletedListener();
  registerTrendUpdatedListener();
  registerCompetitorUpdatedListener();
  registerAIReportGeneratedListener();
  registerGrowthPlanGeneratedListener();
  logger.info('EventBus: all listeners registered');
}
