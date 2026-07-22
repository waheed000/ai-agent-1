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
  /**
   * Whether the backend OAuth flow is actually implemented for this provider.
   * Currently ALL providers have Class: null in OAuthProviderFactory — none are
   * implemented. Set to true only when the backend ships a real provider class.
   */
  oauthImplemented: false;
}

export const SUPPORTED_PLATFORMS: PlatformMeta[] = [
  { id: 'youtube',   label: 'YouTube',     color: '#FF0000', oauthImplemented: false },
  { id: 'instagram', label: 'Instagram',   color: '#E1306C', oauthImplemented: false },
  { id: 'linkedin',  label: 'LinkedIn',    color: '#0A66C2', oauthImplemented: false },
  { id: 'tiktok',    label: 'TikTok',      color: '#010101', oauthImplemented: false },
  { id: 'x',         label: 'X (Twitter)', color: '#14171A', oauthImplemented: false },
];
