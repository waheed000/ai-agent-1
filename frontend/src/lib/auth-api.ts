import { apiClient, setAccessToken } from './api-client';

// ─── Normalized User type (frontend-facing) ───────────────────────────────────
// Field names are normalized from the backend's snake-case / abbreviated names.

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  plan?: string;
  bio?: string;
  niche?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ─── Backend raw shapes ───────────────────────────────────────────────────────

interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  subscriptionPlan?: string;
}

interface BackendProfile {
  bio?: string | null;
  niche?: string | null;
}

interface BackendAuthResponse {
  user: BackendUser;
  accessToken: string;
}

interface BackendMeResponse {
  user: BackendUser;
  profile: BackendProfile;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function mapUser(raw: BackendUser, profile?: BackendProfile): User {
  return {
    id: raw._id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    avatarUrl: raw.avatar ?? undefined,
    plan: raw.subscriptionPlan,
    bio: profile?.bio ?? undefined,
    niche: profile?.niche ?? undefined,
  };
}

function mapAuthResponse(raw: BackendAuthResponse): AuthResponse {
  return {
    user: mapUser(raw.user),
    accessToken: raw.accessToken,
  };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * POST /api/v1/auth/register
   * Creates a new account. Returns normalized user + access token.
   * The refresh token is set as an HttpOnly cookie by the backend.
   */
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const raw = await apiClient.post<BackendAuthResponse>('/auth/register', {
      name,
      email,
      password,
    });
    const result = mapAuthResponse(raw);
    setAccessToken(result.accessToken);
    return result;
  },

  /**
   * POST /api/v1/auth/login
   * Authenticates and returns normalized user + access token.
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const raw = await apiClient.post<BackendAuthResponse>('/auth/login', {
      email,
      password,
    });
    const result = mapAuthResponse(raw);
    setAccessToken(result.accessToken);
    return result;
  },

  /**
   * POST /api/v1/auth/logout
   * Revokes the refresh token. Always clears local access token.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  /**
   * POST /api/v1/auth/refresh-token
   * Exchanges the HttpOnly refresh token cookie for a new access token.
   * Called on every app mount to restore a persisted session.
   *
   * IMPORTANT: uses plain fetch (not apiClient) to avoid the
   * 401→tryRefreshToken→_onUnauthenticated→redirect loop that would
   * incorrectly send users to /login on a fresh page load with no session.
   */
  refreshToken: async (): Promise<AuthResponse | null> => {
    try {
      const res = await fetch('/api/v1/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const json = await res.json() as { data?: BackendAuthResponse };
      const raw = json.data ?? (json as unknown as BackendAuthResponse);
      const result = mapAuthResponse(raw);
      setAccessToken(result.accessToken);
      return result;
    } catch {
      setAccessToken(null);
      return null;
    }
  },

  /**
   * GET /api/v1/auth/me
   * Returns the authenticated user's normalized profile.
   * Backend returns { user, profile } — we merge into a single User object.
   */
  getMe: async (): Promise<User> => {
    const raw = await apiClient.get<BackendMeResponse>('/auth/me');
    return mapUser(raw.user, raw.profile);
  },

  /**
   * PATCH /api/v1/auth/profile
   * Updates profile fields. Returns the refreshed user.
   */
  updateProfile: async (
    data: Partial<Pick<User, 'name' | 'bio' | 'niche'>> & { timezone?: string },
  ): Promise<User> => {
    const raw = await apiClient.patch<BackendMeResponse>('/auth/profile', data);
    return mapUser(raw.user, raw.profile);
  },

  /**
   * PATCH /api/v1/auth/change-password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
  },
};
