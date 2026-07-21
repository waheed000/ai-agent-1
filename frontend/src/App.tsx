import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider, useAuthContext } from '@/context/auth-context';
import { BrainCircuit } from 'lucide-react';

// Layouts & Pages
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import LandingPage from '@/pages/landing';
import Login from '@/pages/login';
import Register from '@/pages/register';
import DashboardHome from '@/pages/dashboard';
import Analytics from '@/pages/analytics';
import AiInsights from '@/pages/ai-insights';
import ContentStrategy from '@/pages/content';
import Competitors from '@/pages/competitors';
import Trends from '@/pages/trends';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// ─── Loading screen ───────────────────────────────────────────────────────────

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="flex items-center gap-2 text-primary font-bold text-xl">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
          <BrainCircuit size={20} />
        </div>
        CreatorOS AI
      </div>
      <div className="flex flex-col items-center gap-3 w-48">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-2 w-3/4 rounded-full" />
      </div>
      <p className="text-xs text-muted-foreground">Restoring your session…</p>
    </div>
  );
}

// ─── Route guards ─────────────────────────────────────────────────────────────

/** Redirects to /login while the app loads, then shows children if authed. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return <AuthLoadingScreen />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

/** Redirects already-authenticated users away from /login and /register. */
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return null;
  if (isAuthenticated) return null;
  return <>{children}</>;
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────

function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardHome} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/ai-insights" component={AiInsights} />
          <Route path="/content" component={ContentStrategy} />
          <Route path="/competitors" component={Competitors} />
          <Route path="/trends" component={Trends} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// ─── Top-level routes ─────────────────────────────────────────────────────────
// NOTE: no <Router> wrapper — Wouter uses window.location by default.
// The explicit base="" wrapper was causing path="/" not to match in Switch.

function AppRoutes() {
  return (
    <Switch>
      {/* Public marketing page — always renders, no auth gate */}
      <Route path="/" component={LandingPage} />

      {/* Auth pages — redirect to dashboard if already signed in */}
      <Route path="/login">
        <PublicOnlyRoute><Login /></PublicOnlyRoute>
      </Route>
      <Route path="/register">
        <PublicOnlyRoute><Register /></PublicOnlyRoute>
      </Route>

      {/* All other paths require auth */}
      <Route path="/:rest*">
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="creatoros-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
