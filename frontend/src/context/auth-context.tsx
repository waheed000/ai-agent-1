// @refresh reset
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'wouter';
import { authApi, type User } from '@/lib/auth-api';
import { configureOnUnauthenticated } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while the initial session-restore is in progress (page refresh). */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  // When any authenticated API call fails to refresh → go to login.
  // This only fires for in-session 401s (e.g. token expired mid-session),
  // not during the initial session restore (which uses plain fetch).
  const handleUnauthenticated = useCallback(() => {
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    configureOnUnauthenticated(handleUnauthenticated);
  }, [handleUnauthenticated]);

  // Restore session on every page load via the HttpOnly refresh-token cookie.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const result = await authApi.refreshToken();
        if (!cancelled) setUser(result?.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      setUser(result.user);
      navigate('/dashboard');
    },
    [navigate],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authApi.register(name, email, password);
      setUser(result.user);
      navigate('/dashboard');
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook — kept in same file but marked @refresh reset to avoid HMR issues ──

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
