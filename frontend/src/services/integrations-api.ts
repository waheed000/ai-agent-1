import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlatformId = 'youtube' | 'instagram' | 'linkedin' | 'tiktok' | 'x';

export type AccountStatus = 'active' | 'error' | 'expired' | 'pending' | 'disconnected' | 'syncing';

export interface ConnectedAccount {
  id: string;
  platform: PlatformId;
  platformUserId: string;
  username: string | null;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  scopes: string[];
  followerCount: number;
  followingCount: number;
  postCount: number;
  status: AccountStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  connectedAt: string;
}

export interface IntegrationsListResponse {
  integrations: ConnectedAccount[];
  count: number;
}

export interface PlatformSyncStatus {
  lastSync: string | null;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const integrationsApi = {
  list: () =>
    apiClient.get<IntegrationsListResponse>('/integrations'),

  disconnect: (platform: PlatformId) =>
    apiClient.delete<null>(`/integrations/${platform}`),

  triggerSync: (platform: PlatformId) =>
    apiClient.post<null>(`/platforms/${platform}/sync`),

  getStatus: (platform: PlatformId) =>
    apiClient.get<PlatformSyncStatus>(`/platforms/${platform}/status`),
};

// ─── Platform metadata ────────────────────────────────────────────────────────

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  color: string;
  /** OAuth initiation URL — connects to the backend OAuth flow */
  connectUrl: string;
}

export const SUPPORTED_PLATFORMS: PlatformMeta[] = [
  { id: 'youtube',   label: 'YouTube',   color: '#FF0000', connectUrl: '/api/v1/auth/youtube' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', connectUrl: '/api/v1/auth/instagram' },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', connectUrl: '/api/v1/auth/linkedin' },
  { id: 'tiktok',    label: 'TikTok',    color: '#010101', connectUrl: '/api/v1/auth/tiktok' },
  { id: 'x',         label: 'X (Twitter)', color: '#14171A', connectUrl: '/api/v1/auth/x' },
];
