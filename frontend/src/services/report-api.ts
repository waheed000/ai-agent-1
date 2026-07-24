import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type ReportStatus = 'generating' | 'ready' | 'failed';
export type ReportPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'linkedin';

export type KpiStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved';

export interface ReportPeriod {
  startDate: string;
  endDate: string;
}

export interface GrowthMetrics {
  followersGained?: number;
  followersLost?: number;
  netGrowth?: number;
  growthRate?: number;
  totalReach?: number;
  totalImpressions?: number;
  byPlatform?: Record<string, unknown>;
}

export interface EngagementMetrics {
  avgEngagementRate?: number;
  totalEngagements?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  byPlatform?: Record<string, unknown>;
}

export interface ContentPerformance {
  postsPublished?: number;
  topPerformingFormat?: string;
  topPerformingPlatform?: string;
  topPosts?: string[];
  avgPostsPerWeek?: number;
  consistencyScore?: number;
}

export interface CompetitorComparison {
  summary?: string;
  competitorCount?: number;
  relativeGrowthRate?: string;
  contentGaps?: string[];
  advantages?: string[];
}

export interface TrendSummary {
  summary?: string;
  risingTrends?: string[];
  relevantHashtags?: string[];
  missedOpportunities?: string[];
}

export interface AiInsights {
  narrative?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  opportunities?: string[];
}

export interface ReportKpi {
  metric: string;
  current: unknown;
  target: unknown;
  unit?: string;
  status?: KpiStatus;
}

/** Report document returned by the backend. Mongoose virtual `id` is active. */
export interface Report {
  id: string;
  _id?: string; // may also be present; normalise with getReportId()
  type: ReportType;
  period?: ReportPeriod;
  platforms?: ReportPlatform[];
  title: string;
  executiveSummary?: string;
  growthMetrics?: GrowthMetrics;
  engagementMetrics?: EngagementMetrics;
  contentPerformance?: ContentPerformance;
  competitorComparison?: CompetitorComparison;
  trendSummary?: TrendSummary;
  aiInsights?: AiInsights;
  kpis?: ReportKpi[];
  priorityScore?: number;
  nextWeekGoals?: string[];
  status: ReportStatus;
  generatedAt?: string;
  failReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GenerateReportParams {
  type?: ReportType;
  platform?: ReportPlatform;
  referenceDate?: string; // ISO 8601
}

export interface ListReportsParams {
  type?: ReportType;
  status?: ReportStatus;
  limit?: number;
  skip?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise the report ID — prefers `id` (virtual), falls back to `_id`. */
export function getReportId(report: Report): string {
  return report.id ?? report._id ?? '';
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  );
  if (!entries.length) return '';
  return (
    '?' +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const reportApi = {
  /**
   * POST /api/v1/reports/generate
   * Enqueues async report generation. Returns immediately with status: 'generating'.
   * Poll GET /reports/:id or GET /reports/latest until status = 'ready' | 'failed'.
   */
  generate: (params: GenerateReportParams = {}) =>
    apiClient.post<Report>('/reports/generate', params),

  /**
   * GET /api/v1/reports
   * List all reports for the authenticated user. Supports type / status filters.
   */
  list: (params: ListReportsParams = {}) =>
    apiClient.get<Report[]>(
      `/reports${buildQs(params as Record<string, string | number | undefined>)}`,
    ),

  /**
   * GET /api/v1/reports/latest
   * Returns the most recent report. Optionally filter by type.
   * Returns 404 if no report exists.
   */
  getLatest: (type?: ReportType) =>
    apiClient.get<Report>(
      `/reports/latest${type ? `?type=${type}` : ''}`,
    ),

  /**
   * GET /api/v1/reports/:id
   * Returns a single report by ID.
   */
  getById: (id: string) =>
    apiClient.get<Report>(`/reports/${id}`),

  /**
   * DELETE /api/v1/reports/:id
   * Soft-deletes a report.
   */
  delete: (id: string) =>
    apiClient.delete<null>(`/reports/${id}`),
};
