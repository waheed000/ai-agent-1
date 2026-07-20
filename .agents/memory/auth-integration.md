---
name: Auth Integration — Phase 1
description: How the frontend auth layer connects to the real backend. Covers API client, token flow, context, and backend field mapping.
---

## Architecture

- `frontend/src/lib/api-client.ts` — Core fetch wrapper. In-memory access token, refresh-token-cookie-based session restore, 401→refresh→retry, deduplication queue, `ApiError` class. Calls `setAuthTokenGetter` from `@workspace/api-client-react` on every token change so generated hooks also get auth headers.
- `frontend/src/lib/auth-api.ts` — Auth endpoint functions. Normalizes backend shapes to frontend `User` type.
- `frontend/src/context/auth-context.tsx` — `AuthProvider` + `useAuthContext`. On mount calls `authApi.refreshToken()` to restore session from HttpOnly cookie. `configureOnUnauthenticated` wired here.
- `frontend/src/hooks/use-auth.ts` — Re-exports `useAuthContext as useAuth`.

## Backend Field Mapping

`/me` returns `{ user: {...}, profile: {...} }` (nested). Login/register return `{ user, accessToken }`.
- `user._id` → `id`
- `user.avatar` → `avatarUrl`
- `user.subscriptionPlan` → `plan`

`authApi.getMe()` unwraps and maps both.

## DashboardLayout

Uses `useAuth().user` (from context) for sidebar user display. The generated `useGetMe()` hook was removed because it calls `/api/auth/me` (no `v1` prefix) — path doesn't match real backend at `/api/v1/auth/me`.

**Why:** Generated hooks in `lib/api-client-react` call `/api/...` not `/api/v1/...`. They don't work with the real backend without a base-URL fix or path rewrite. For Phase 1 auth this was worked around by using context `user` instead.

## Proxy and Routing

Vite proxy: `/api` → `http://localhost:8080` (the real backend running via `npm --prefix backend run dev`).
Real backend: port 8080, in-memory MongoDB, Redis unavailable (gracefully degraded — cache and queue disabled, auth routes work fine).

`.replit` required explicit `[[ports]] localPort=18152 externalPort=80` and `frontend: web` added to Project workflow tasks to fix Replit proxy routing.

**Why:** The artifact id `artifacts/creator-os` is mismatched with the current dir `frontend/`. The proxy routing was broken until the explicit ports entry was added.

## Auth Flow

1. Page load → `authApi.refreshToken()` (POST /api/v1/auth/refresh-token, sends HttpOnly cookie)
   - Cookie present → new accessToken → `user` set → redirect away from /login
   - Cookie absent/expired → 401 → caught → `user: null, isLoading: false` → stays on /login
2. Login → `authApi.login(email, password)` → token stored in memory + wired to generated hooks
3. Logout → `authApi.logout()` → token cleared → redirect to /login
4. Any 401 from API → try refresh once → if fails → `configureOnUnauthenticated` fires → redirect to /login
