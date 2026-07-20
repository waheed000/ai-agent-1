import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';

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

function ProtectedRoutes() {
  return (
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
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected routes wrapped in layout */}
      <Route path="/:rest*">
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="creatoros-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;