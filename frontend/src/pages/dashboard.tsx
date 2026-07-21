import { useQuery } from '@tanstack/react-query';
import { analyticsApi, periodToDateRange, type Period } from '@/services/analytics-api';
import { integrationsApi } from '@/services/integrations-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight, ArrowDownRight, Activity, Users, Eye, MousePointerClick,
  Heart, MessageCircle, Share2, RefreshCw, AlertCircle, CheckCircle2,
  XCircle, Loader2, BarChart2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { ApiError } from '@/lib/api-client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, growth, icon: Icon, loading, error,
}: {
  label: string;
  value: string | null | undefined;
  growth: number | null | undefined;
  icon: React.ElementType;
  loading: boolean;
  error?: unknown;
}) {
  const positive = (growth ?? 0) >= 0;
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
            <Icon size={16} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : error ? (
          <span className="text-sm text-destructive">Error</span>
        ) : (
          <div className="text-3xl font-bold font-mono tracking-tight mb-2">{value ?? '—'}</div>
        )}
        {!loading && !error && growth !== null && growth !== undefined ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-500' : 'text-destructive'}`}>
            {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {fmtPct(growth)} vs prev period
          </div>
        ) : !loading && !error ? (
          <div className="text-xs text-muted-foreground">No comparison data</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        <AlertDescription>{message}</AlertDescription>
      </div>
      <Button variant="ghost" size="sm" onClick={onRetry} className="ml-4">
        <RefreshCw size={14} className="mr-1" /> Retry
      </Button>
    </Alert>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const [period, setPeriod] = useState<Period>('30d');

  const dateRange = useMemo(() => periodToDateRange(period), [period]);

  const overviewQ = useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: () => analyticsApi.getOverview({ ...dateRange, compare: 'previous_period' }),
  });

  const growthQ = useQuery({
    queryKey: ['analytics', 'growth', dateRange],
    queryFn: () => analyticsApi.getGrowth({ ...dateRange }),
  });

  const integrationsQ = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  });

  const contentQ = useQuery({
    queryKey: ['analytics', 'content-performance', dateRange],
    queryFn: () => analyticsApi.getContentPerformance({ ...dateRange, limit: 4 }),
  });

  // Transform growth history into chart-friendly format
  const chartData = useMemo(() => {
    const history = growthQ.data?.history ?? [];
    if (!history.length) return [];
    // Group by date — sum followers across platforms per day
    const byDate = new Map<string, number>();
    for (const entry of history) {
      const d = entry.date.slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + (entry.totalFollowers ?? 0));
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, followers]) => ({ name: formatDate(date), followers }));
  }, [growthQ.data]);

  const overview = overviewQ.data;
  const isOverviewLoading = overviewQ.isLoading;
  const comparison = overview?.comparison;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Your social presence at a glance.</p>
        </div>
        <div className="flex bg-secondary p-1 rounded-md">
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Overview error */}
      {overviewQ.isError && (
        <QueryError message={errorMessage(overviewQ.error)} onRetry={() => overviewQ.refetch()} />
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Follower Growth"
          value={fmt(overview?.followers?.net)}
          growth={overview?.followers?.growthRate ?? null}
          icon={Users}
          loading={isOverviewLoading}
          error={overviewQ.error}
        />
        <MetricCard
          label="Total Reach"
          value={fmt(overview?.reach?.total)}
          growth={comparison?.reachChange ?? null}
          icon={Eye}
          loading={isOverviewLoading}
          error={overviewQ.error}
        />
        <MetricCard
          label="Avg Engagement"
          value={overview?.engagement?.avgEngagementRate != null ? `${overview.engagement.avgEngagementRate}%` : null}
          growth={comparison?.engagementRateChange ?? null}
          icon={MousePointerClick}
          loading={isOverviewLoading}
          error={overviewQ.error}
        />
        <MetricCard
          label="Impressions"
          value={fmt(overview?.reach?.impressions)}
          growth={null}
          icon={Activity}
          loading={isOverviewLoading}
          error={overviewQ.error}
        />
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Follower Growth</CardTitle>
              <CardDescription>Total followers across all connected platforms</CardDescription>
            </div>
            {growthQ.isError && (
              <Button variant="ghost" size="sm" onClick={() => growthQ.refetch()}>
                <RefreshCw size={14} className="mr-1" /> Retry
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {growthQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : growthQ.isError ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Failed to load growth data.
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <BarChart2 size={32} className="opacity-30" />
              <p className="text-sm">No growth data for this period.</p>
              <p className="text-xs">Connect a social account to start tracking.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => fmt(v)} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(v: number) => [fmt(v), 'Followers']}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#followersGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Engagement Summary */}
      {!isOverviewLoading && !overviewQ.isError && overview?.engagement && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Posts', value: fmt(overview.engagement.totalPosts), icon: Activity },
            { label: 'Total Likes', value: fmt(overview.engagement.totalLikes), icon: Heart },
            { label: 'Total Comments', value: fmt(overview.engagement.totalComments), icon: MessageCircle },
            { label: 'Total Shares', value: fmt(overview.engagement.totalShares), icon: Share2 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="bg-secondary/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon size={18} className="text-muted-foreground shrink-0" />
                <div>
                  <div className="text-lg font-bold font-mono">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connected Platforms */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected Platforms</CardTitle>
              <CardDescription>Status of your linked social accounts</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Manage</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {integrationsQ.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : integrationsQ.isError ? (
            <QueryError message={errorMessage(integrationsQ.error)} onRetry={() => integrationsQ.refetch()} />
          ) : !integrationsQ.data?.integrations?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <XCircle size={32} className="opacity-30" />
              <p className="text-sm">No accounts connected yet.</p>
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link href="/settings">Connect a platform</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {integrationsQ.data.integrations.map(account => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium capitalize">{account.platform}</div>
                    {account.username && <div className="text-xs text-muted-foreground">@{account.username}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {account.followerCount ? (
                      <span className="text-xs text-muted-foreground font-mono">{fmt(account.followerCount)} followers</span>
                    ) : null}
                    {account.status === 'active' ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/5 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Active
                      </Badge>
                    ) : account.status === 'error' ? (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 flex items-center gap-1">
                        <AlertCircle size={10} /> Error
                      </Badge>
                    ) : account.status === 'syncing' ? (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Syncing
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
                        {account.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performing Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Posts driving the most engagement this period</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contentQ.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : contentQ.isError ? (
            <QueryError message={errorMessage(contentQ.error)} onRetry={() => contentQ.refetch()} />
          ) : !contentQ.data?.topContent?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <BarChart2 size={32} className="opacity-30" />
              <p className="text-sm">No content data for this period.</p>
              <p className="text-xs">Content analytics appear after your accounts start syncing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {contentQ.data.topContent.slice(0, 4).map(post => (
                <div key={String(post.id)} className="flex gap-3 p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <div className="w-16 h-20 bg-card rounded-md overflow-hidden relative shrink-0 border border-border flex items-center justify-center text-muted-foreground/30">
                    <Eye size={20} />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-[10px] px-1 rounded text-white font-medium capitalize">
                      {post.platform}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-1">{post.title}</h4>
                      <span className="text-xs text-muted-foreground capitalize">{post.format ?? 'post'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                      <span className="flex items-center gap-1">
                        <Heart size={11} /> {fmt(post.engagement?.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={11} /> {fmt(post.engagement?.comments)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
