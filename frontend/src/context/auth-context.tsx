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

interface AuthContextValue {
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

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Register a module-level callback so apiClient can trigger a logout
  // redirect when any request gets a 401 that can't be refreshed.
  const handleUnauthenticated = useCallback(() => {
    setUser(null);
    setLocation('/login');
  }, [setLocation]);

  useEffect(() => {
    configureOnUnauthenticated(handleUnauthenticated);
  }, [handleUnauthenticated]);

  // On mount: attempt to restore the session using the HttpOnly refresh token
  // cookie. If it succeeds, the user is silently re-authenticated without
  // having to log in again after a page reload.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const result = await authApi.refreshToken();
        if (!cancelled) {
          setUser(result?.user ?? null);
        }
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
      setLocation('/dashboard');
    },
    [setLocation],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authApi.register(name, email, password);
      setUser(result.user);
      setLocation('/dashboard');
    },
    [setLocation],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setLocation('/login');
  }, [setLocation]);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
