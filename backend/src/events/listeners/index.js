/**
 * Register all event listeners.
 * Call initListeners() once at server startup after QueueService.init().
 */

import { registerPlatformSyncedListener }    from './PlatformSynced.js';
import { registerAnalyticsCompletedListener } from './AnalyticsCompleted.js';
import { registerTrendUpdatedListener }       from './TrendUpdated.js';
import { registerCompetitorUpdatedListener }  from './CompetitorUpdated.js';
import { registerAIReportGeneratedListener }  from './AIReportGenerated.js';
import { registerGrowthPlanGeneratedListener } from './GrowthPlanGenerated.js';
// Phase 11–13
import { registerReportGeneratedListener }    from './ReportGenerated.js';
import { registerStrategyGeneratedListener }  from './StrategyGenerated.js';
import { registerNotificationCreatedListener } from './NotificationCreated.js';
import { registerPlannerGeneratedListener }   from './PlannerGenerated.js';
// Phase 14
import { registerWorkspaceCreatedListener }  from './WorkspaceCreated.js';
import { registerWorkspaceDeletedListener }  from './WorkspaceDeleted.js';
import { registerApiKeyCreatedListener }     from './ApiKeyCreated.js';
import { registerApiKeyRevokedListener }     from './ApiKeyRevoked.js';
import { registerMemberInvitedListener }     from './MemberInvited.js';
import { registerSettingsUpdatedListener }   from './SettingsUpdated.js';
import { registerUsageRecordedListener }     from './UsageRecorded.js';
import logger from '../../utils/logger.js';

export function initListeners() {
  // Phase 6–10
  registerPlatformSyncedListener();
  registerAnalyticsCompletedListener();
  registerTrendUpdatedListener();
  registerCompetitorUpdatedListener();
  registerAIReportGeneratedListener();
  registerGrowthPlanGeneratedListener();
  // Phase 11–13
  registerReportGeneratedListener();
  registerStrategyGeneratedListener();
  registerNotificationCreatedListener();
  registerPlannerGeneratedListener();
  // Phase 14
  registerWorkspaceCreatedListener();
  registerWorkspaceDeletedListener();
  registerApiKeyCreatedListener();
  registerApiKeyRevokedListener();
  registerMemberInvitedListener();
  registerSettingsUpdatedListener();
  registerUsageRecordedListener();

  logger.info('EventBus: all listeners registered');
}
