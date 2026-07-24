import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendCategory =
  | 'topic'
  | 'hashtag'
  | 'audio'
  | 'format'
  | 'keyword'
  | 'challenge';

export type TrendStatus = 'rising' | 'peak' | 'declining' | 'expired';

export type TrendPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'linkedin';

/** Trend object returned by the backend. Uses `.lean()` so id is `_id`. */
export interface TrendItem {
  _id: string;
  platform: string;
  category: TrendCategory;
  name: string;
  trendScore: number;
  growthRate: number;
  volume: number;
  status: TrendStatus;
  relatedTags: string[];
  description: string | null;
  peakDate: string | null;
  expiresAt: string | null;
  aiContentIdea: string | null;
  detectedAt: string;
}

export interface TrendFilters {
  platform?: string;
  category?: string;
  status?: string;
  limit?: number;
  minScore?: number;
}

export interface RefreshResult {
  success: boolean;
  collected: number;
  enriched: number;
  platform: string;
}

/** Trends use lean() so id lives at _id. */
export function getTrendId(item: TrendItem): string {
  return item._id;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

export const trendApi = {
  /** GET /trends — all active trends with optional filters. */
  list: (filters: TrendFilters = {}) =>
    apiClient.get<TrendItem[]>(
      `/trends${buildQs(filters as Record<string, string | number | undefined>)}`,
    ),

  /** GET /trends/topics — trending topics only. */
  topics: (filters: Omit<TrendFilters, 'category'> = {}) =>
    apiClient.get<TrendItem[]>(
      `/trends/topics${buildQs(filters as Record<string, string | number | undefined>)}`,
    ),

  /** GET /trends/hashtags — trending hashtags only. */
  hashtags: (filters: Omit<TrendFilters, 'category'> = {}) =>
    apiClient.get<TrendItem[]>(
      `/trends/hashtags${buildQs(filters as Record<string, string | number | undefined>)}`,
    ),

  /** GET /trends/creators — format/keyword/challenge trends for creators. */
  creators: (filters: Omit<TrendFilters, 'category' | 'status'> = {}) =>
    apiClient.get<TrendItem[]>(
      `/trends/creators${buildQs(filters as Record<string, string | number | undefined>)}`,
    ),

  /**
   * POST /trends/refresh — trigger full trend collection + analysis cycle.
   * Requires authentication.
   */
  refresh: (params: { platform?: string; category?: string } = {}) =>
    apiClient.post<RefreshResult>('/trends/refresh', params),
};
