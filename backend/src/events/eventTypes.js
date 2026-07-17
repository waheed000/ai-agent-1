/**
 * Central registry of all event type constants.
 * Import this wherever events are emitted or listened to.
 * Using constants prevents typo-driven bugs.
 */

export const EVENT_TYPES = {
  // Platform sync lifecycle
  PLATFORM_SYNCED: 'platform.synced',
  PLATFORM_SYNC_FAILED: 'platform.sync.failed',

  // Analytics
  ANALYTICS_COMPLETED: 'analytics.completed',
  ANALYTICS_FAILED: 'analytics.failed',

  // Competitor intelligence
  COMPETITOR_UPDATED: 'competitor.updated',
  COMPETITOR_SYNC_FAILED: 'competitor.sync.failed',

  // Trends
  TREND_UPDATED: 'trend.updated',
  TREND_EXPIRED: 'trend.expired',

  // AI
  AI_REPORT_GENERATED: 'ai.report.generated',
  AI_EXECUTION_FAILED: 'ai.execution.failed',
  GROWTH_PLAN_GENERATED: 'ai.growth_plan.generated',

  // Jobs
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
};
