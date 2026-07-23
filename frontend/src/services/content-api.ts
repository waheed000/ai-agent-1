import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'linkedin';

export type ContentStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

export type ContentPriority = 'high' | 'medium' | 'low';

/** A content plan item returned by the backend. The backend normalises `_id`
 *  to `id` on Mongoose documents, but lean() queries return `_id`.
 *  Use `getPlanItemId()` to access the id reliably. */
export interface ContentPlanItem {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  platform: ContentPlatform;
  contentType: string;
  suggestedTime?: string;
  status: ContentStatus;
  priority: ContentPriority;
  goal?: string;
  hashtags?: string[];
  keywords?: string[];
  aiCaption?: string;
  estimatedReach?: number;
  estimatedEngagement?: number;
  campaignName?: string;
}

/** Returns the item's id regardless of whether the backend returned id or _id. */
export function getPlanItemId(item: ContentPlanItem): string {
  return (item.id ?? item._id) as string;
}

export interface CalendarDay {
  date: string;
  items: ContentPlanItem[];
  count: number;
  hasContent: boolean;
}

export interface CalendarResponse {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalItems: number;
  days: CalendarDay[];
}

export interface PlannerListParams {
  platform?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

export interface GenerateParams {
  days?: number;
  platforms?: string[];
  campaignName?: string;
}

export type GenerateResult =
  | { generated: number; days: number; platforms: string[]; campaignName: string | null; items: ContentPlanItem[] }
  | { queued: true; days: number; platforms: string[] };

export interface UpdateContentItemParams {
  title?: string;
  description?: string;
  status?: ContentStatus;
  priority?: ContentPriority;
  goal?: string;
  suggestedTime?: string;
  hashtags?: string[];
  keywords?: string[];
  aiCaption?: string;
}

export interface Draft {
  id?: string;
  _id?: string;
  title: string;
  platform?: string;
  contentType?: string;
  caption?: string;
  body?: string;
  hashtags?: string[];
  status: ContentStatus;
  reviewNotes?: string;
  scheduledAt?: string;
  contentPlan?: string;
}

export function getDraftId(draft: Draft): string {
  return (draft.id ?? draft._id) as string;
}

export interface CreateDraftParams {
  title: string;
  platform?: string;
  caption?: string;
  body?: string;
  hashtags?: string[];
  contentPlan?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const contentApi = {
  list: (params: PlannerListParams = {}) =>
    apiClient.get<ContentPlanItem[]>(`/planner${buildQs(params as Record<string, string | number | undefined>)}`),

  generate: (params: GenerateParams) =>
    apiClient.post<GenerateResult>('/planner/generate', params),

  update: (id: string, data: UpdateContentItemParams) =>
    apiClient.patch<ContentPlanItem>(`/planner/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<null>(`/planner/${id}`),

  getCalendar: (params: { startDate?: string; endDate?: string; platform?: string } = {}) =>
    apiClient.get<CalendarResponse>(`/calendar${buildQs(params as Record<string, string | number | undefined>)}`),

  createDraft: (data: CreateDraftParams) =>
    apiClient.post<Draft>('/drafts', data),

  updateDraft: (id: string, data: Partial<CreateDraftParams & { status?: ContentStatus; reviewNotes?: string }>) =>
    apiClient.patch<Draft>(`/drafts/${id}`, data),

  deleteDraft: (id: string) =>
    apiClient.delete<null>(`/drafts/${id}`),
};
