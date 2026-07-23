import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Competitor {
  id?: string;
  _id?: string;
  username: string;
  platform: string;
  notes?: string;
  niche?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  avgEngagementRate?: number;
  avgPostFrequency?: number;
  lastSyncedAt?: string;
  status?: 'active' | 'paused' | 'not_found';
  createdAt?: string;
}

export function getCompetitorId(c: Competitor): string {
  return (c.id ?? c._id) as string;
}

export interface CompetitorPostEngagement {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
}

export interface CompetitorPost {
  id?: string;
  _id?: string;
  platformPostId: string;
  format: string;
  publishedAt: string;
  engagement: CompetitorPostEngagement;
  engagementRate: number;
  hashtags: string[];
}

export interface CompetitorHashtag {
  tag?: string;
  _id?: string;
  count: number;
}

export interface CompetitorFormatMix {
  format?: string;
  _id?: string;
  count: number;
}

export interface CompetitorEngagementAggregate {
  avgEngagementRate: number;
  totalPosts: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  totalViews?: number;
}

export interface CompetitorScores {
  engagementComparison: number;
  growthComparison: number;
  consistencyComparison: number;
  contentFrequency: number;
  overallThreat: number;
}

export interface CompetitorOverview {
  competitor: Competitor;
  engagement: CompetitorEngagementAggregate;
  topPosts: CompetitorPost[];
  hashtags: CompetitorHashtag[];
  formatMix: CompetitorFormatMix[];
  followerHistory: Array<{ date: string; followers: number; avgEngagementRate: number }>;
  scores: CompetitorScores | null;
  latestSnapshot?: {
    followerCount?: number;
    avgEngagementRate?: number;
    snapshotDate?: string;
  } | null;
}

export interface AddCompetitorParams {
  username: string;
  platform: string;
  notes?: string;
  niche?: string;
}

export interface SyncResult {
  success: boolean;
  competitorId: string;
  postsStored: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const competitorApi = {
  list: (params: { platform?: string; status?: string } = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
      .join('&');
    return apiClient.get<Competitor[]>(`/competitors${qs ? '?' + qs : ''}`);
  },

  add: (data: AddCompetitorParams) =>
    apiClient.post<Competitor>('/competitors', data),

  delete: (id: string) =>
    apiClient.delete<null>(`/competitors/${id}`),

  getOverview: (id: string) =>
    apiClient.get<CompetitorOverview>(`/competitors/${id}/overview`),

  sync: (id: string) =>
    apiClient.post<SyncResult>(`/competitors/${id}/sync`),
};
