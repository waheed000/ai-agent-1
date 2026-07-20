import { setAuthTokenGetter } from '@workspace/api-client-react';

// ─── In-memory token store ────────────────────────────────────────────────────
// Access tokens live in memory only. The HttpOnly refreshToken cookie
// (managed by the backend) handles session persistence across page reloads.

let _accessToken: string | null = null;
let _onUnauthenticated: (() => void) | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

export function configureOnUnauthenticated(cb: () => void): void {
  _onUnauthenticated = cb;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
  // Wire the same token into the generated React Query hooks
  setAuthTokenGetter(token ? () => token : null);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Token refresh with deduplication ────────────────────────────────────────

async function tryRefreshToken(): Promise<string | null> {
  if (_isRefreshing) {
    return new Promise((resolve) => { _refreshQueue.push(resolve); });
  }

  _isRefreshing = true;

  try {
    const res = await fetch('/api/v1/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      setAccessToken(null);
      _refreshQueue.forEach((r) => r(null));
      _refreshQueue = [];
      _onUnauthenticated?.();
      return null;
    }

    const json = await res.json();
    const newToken: string | null = json?.data?.accessToken ?? null;
    setAccessToken(newToken);
    _refreshQueue.forEach((r) => r(newToken));
    _refreshQueue = [];
    return newToken;
  } catch {
    setAccessToken(null);
    _refreshQueue.forEach((r) => r(null));
    _refreshQueue = [];
    _onUnauthenticated?.();
    return null;
  } finally {
    _isRefreshing = false;
  }
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;
  /** Field-level validation errors: { fieldName: errorMessage[] } */
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    data?: unknown,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.fieldErrors = fieldErrors ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  try {
    const response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 401 → attempt token refresh then retry once
    if (response.status === 401 && retry) {
      const newToken = await tryRefreshToken();
      if (newToken) return request<T>(method, path, body, false);
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({})) as Record<string, unknown>;
      const message =
        (errorJson?.message as string) ||
        (errorJson?.error as string) ||
        response.statusText;

      // Normalize field errors: supports both array format [{field, message}]
      // and object format { fieldName: 'message' }
      let fieldErrors: Record<string, string[]> = {};
      const raw = errorJson?.errors;
      if (Array.isArray(raw)) {
        for (const e of raw as Array<{ field?: string; path?: string; message?: string; msg?: string }>) {
          const field = e.field ?? e.path ?? 'general';
          const msg = e.message ?? e.msg ?? 'Invalid value';
          fieldErrors[field] = [...(fieldErrors[field] ?? []), msg];
        }
      } else if (raw && typeof raw === 'object') {
        fieldErrors = raw as Record<string, string[]>;
      }

      throw new ApiError(response.status, message, errorJson, fieldErrors);
    }

    if (response.status === 204) return null as T;

    const json = await response.json() as Record<string, unknown>;
    // Backend wraps all responses: { success, data, message }
    return (json.data !== undefined ? json.data : json) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. Please check your connection.');
    }
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const apiClient = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)  => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  put:    <T>(path: string, body?: unknown)  => request<T>('PUT',    path, body),
  delete: <T>(path: string, body?: unknown)  => request<T>('DELETE', path, body),
};
