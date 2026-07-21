import { apiClient } from '@/lib/api-client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export type Period = '7d' | '30d' | '90d';

/** Convert period shorthand to ISO date strings */
export function periodToDateRange(period: Period): { startDate: string; endDate: string } {
  const end = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const start = new Date(end.getTime() - days * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface AnalyticsQueryParams {
  [key: string]: string | number | undefined;
  platform?: string;
  startDate?: string;
  endDate?: string;
  compare?: 'previous_period' | 'previous_year';
  limit?: number;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  period: { start: string; end: string };
  followers: { net: number; growthRate: number };
  engagement: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalViews: number;
    avgEngagementRate: number;
  };
  reach: { total: number; impressions: number };
  comparison?: {
    period: { start: string; end: string };
    engagementRateChange?: number | null;
    reachChange?: number | null;
  };
}

export interface GrowthHistoryEntry {
  date: string;
  platform: string;
  totalFollowers: number;
}

export interface AnalyticsGrowth {
  period: { start: string; end: string };
  history?: GrowthHistoryEntry[];
  net?: number;
  growthRate?: number;
  byPlatform?: Array<{ platform: string; net: number; growthRate: number }>;
  comparison?: { period: { start: string; end: string }; net?: number; growthRate?: number };
}

export interface EngagementByPlatform {
  platform: string;
  count?: number;
  avgEngagementRate?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
}

export interface AnalyticsEngagement {
  period: { start: string; end: string };
  summary: {
    avgEngagementRate: number;
    totalPosts: number;
    avgLikesPerPost?: number;
    avgCommentsPerPost?: number;
    avgSharesPerPost?: number;
  };
  byPlatform: EngagementByPlatform[];
  comparison?: { period: { start: string; end: string }; avgEngagementRateChange?: number | null };
}

export interface ContentItem {
  id: string;
  title: string;
  platform: string;
  format?: string;
  publishedAt: string;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    saves?: number;
  };
  engagementRate?: number;
  score: number;
}

export interface AnalyticsContentPerformance {
  period: { start: string; end: string };
  summary: {
    totalPosts: number;
    postingFrequency?: number;
    consistencyScore?: number;
  };
  topContent: ContentItem[];
  bottomContent: ContentItem[];
}

export interface AnalyticsBestPostingTime {
  period: { start: string; end: string };
  totalPostsAnalysed: number;
  bestHours: Array<{ hour: number; avgEngagementRate: number }>;
  bestDays: Array<{ day: string | number; avgEngagementRate: number }>;
  topSlots: Array<{ day?: string | number; hour?: number; score?: number }>;
  heatmap?: unknown[];
}

export interface DemographicEntry {
  label: string;
  value: number;
}

export interface AnalyticsAudience {
  period: { start: string; end: string };
  totals: { totalFollowers: number; totalFollowing: number };
  growth: { net: number; growthRate: number };
  demographics: {
    ageGroups: DemographicEntry[];
    genders: DemographicEntry[];
    countries: DemographicEntry[];
  };
  byPlatform: Array<{
    platform: string;
    totalFollowers?: number;
    audienceGrowthRate?: number;
  }>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getOverview: (params: AnalyticsQueryParams = {}) =>
    apiClient.get<AnalyticsOverview>(`/analytics/overview${buildQs(params)}`),

  getGrowth: (params: AnalyticsQueryParams = {}) =>
    apiClient.get<AnalyticsGrowth>(`/analytics/growth${buildQs(params)}`),

  getEngagement: (params: AnalyticsQueryParams = {}) =>
    apiClient.get<AnalyticsEngagement>(`/analytics/engagement${buildQs(params)}`),

  getContentPerformance: (params: AnalyticsQueryParams = {}) =>
    apiClient.get<AnalyticsContentPerformance>(`/analytics/content-performance${buildQs(params)}`),

  getBestPostingTime: (params: AnalyticsQueryParams = {}) =>
    apiClient.get<AnalyticsBestPostingTime>(`/analytics/best-posting-time${buildQs(params)}`),

  getAudience: (params: AnalyticsQueryParams = {}) =>
    apiClient.get<AnalyticsAudience>(`/analytics/audience${buildQs(params)}`),
};
