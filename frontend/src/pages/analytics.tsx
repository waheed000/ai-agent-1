import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  analyticsApi, periodToDateRange, type Period,
  type AnalyticsOverview, type AnalyticsGrowth,
  type AnalyticsEngagement, type AnalyticsContentPerformance,
  type AnalyticsAudience,
} from '@/services/analytics-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, BarChart2, Filter } from 'lucide-react';
import { SiInstagram, SiYoutube, SiTiktok } from 'react-icons/si';
import { Linkedin } from 'lucide-react';
import { ApiError } from '@/lib/api-client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(decimals) + '%';
}

function fmtChange(n: number | null | undefined): { text: string; positive: boolean } {
  if (n === null || n === undefined) return { text: '—', positive: true };
  return { text: (n >= 0 ? '+' : '') + n.toFixed(1) + '%', positive: n >= 0 };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        <AlertDescription>{message}</AlertDescription>
      </div>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        <RefreshCw size={14} className="mr-1" /> Retry
      </Button>
    </Alert>
  );
}

function EmptyState({ message = 'No data for this period.', hint }: { message?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <BarChart2 size={32} className="opacity-25" />
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="text-xs">{hint}</p>}
    </div>
  );
}

function MetricCard({
  label, value, change, loading,
}: { label: string; value: string; change?: number | null; loading: boolean }) {
  const { text, positive } = fmtChange(change);
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
      {loading ? (
        <Skeleton className="h-7 w-20 mb-1" />
      ) : (
        <div className="text-2xl font-bold font-mono">{value}</div>
      )}
      {!loading && change !== undefined && change !== null ? (
        <div className={`flex items-center gap-1 text-xs mt-1 ${positive ? 'text-green-500' : 'text-destructive'}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {text} vs prev period
        </div>
      ) : null}
    </div>
  );
}

// ─── Platforms ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'all', label: 'All Platforms', icon: null },
  { id: 'instagram', label: 'Instagram', icon: SiInstagram },
  { id: 'youtube', label: 'YouTube', icon: SiYoutube },
  { id: 'tiktok', label: 'TikTok', icon: SiTiktok },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [platform, setPlatform] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const dateRange = useMemo(() => periodToDateRange(period), [period]);
  const qParams = useMemo(() => ({
    ...dateRange,
    platform: platform === 'all' ? undefined : platform,
    compare: 'previous_period' as const,
  }), [dateRange, platform]);

  // ── Queries ─────────────────────────────────────────────────────────────

  const overviewQ = useQuery({
    queryKey: ['analytics', 'overview', qParams],
    queryFn: () => analyticsApi.getOverview(qParams),
    enabled: activeTab === 'overview' || activeTab === 'growth',
  });

  const growthQ = useQuery({
    queryKey: ['analytics', 'growth', qParams],
    queryFn: () => analyticsApi.getGrowth(qParams),
    enabled: activeTab === 'growth',
  });

  const engagementQ = useQuery({
    queryKey: ['analytics', 'engagement', qParams],
    queryFn: () => analyticsApi.getEngagement(qParams),
    enabled: activeTab === 'engagement',
  });

  const contentQ = useQuery({
    queryKey: ['analytics', 'content', qParams],
    queryFn: () => analyticsApi.getContentPerformance({ ...qParams, limit: 20 }),
    enabled: activeTab === 'content',
  });

  const audienceQ = useQuery({
    queryKey: ['analytics', 'audience', qParams],
    queryFn: () => analyticsApi.getAudience(qParams),
    enabled: activeTab === 'audience',
  });

  // ── Chart transforms ─────────────────────────────────────────────────────

  const growthChartData = useMemo(() => {
    const history = growthQ.data?.history ?? [];
    if (!history.length) return [];
    const byDate = new Map<string, number>();
    for (const e of history) {
      const d = e.date.slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + (e.totalFollowers ?? 0));
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, followers]) => ({ name: formatDate(date), followers }));
  }, [growthQ.data]);

  const engagementPieData = useMemo(() => {
    return (engagementQ.data?.byPlatform ?? []).map(p => ({
      name: p.platform,
      value: p.avgEngagementRate ?? 0,
    })).filter(d => d.value > 0);
  }, [engagementQ.data]);

  const overview = overviewQ.data;
  const engagement = engagementQ.data;
  const content = contentQ.data;
  const audience = audienceQ.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Deep Dive</h1>
          <p className="text-muted-foreground">Comprehensive performance data across all your channels.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap bg-secondary p-1 rounded-md w-fit">
            {PLATFORMS.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${platform === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex bg-secondary p-1 rounded-md w-fit">
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-colors ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent justify-start p-0 mb-2">
          {['overview', 'growth', 'engagement', 'content', 'audience'].map(t => (
            <TabsTrigger
              key={t}
              value={t}
              className="data-[state=active]:bg-card border border-transparent data-[state=active]:border-border rounded-md px-4 py-2 capitalize"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {overviewQ.isError && (
            <ErrorCard message={errMsg(overviewQ.error)} onRetry={() => overviewQ.refetch()} />
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Follower Growth"
              value={fmt(overview?.followers?.net)}
              change={overview?.followers?.growthRate}
              loading={overviewQ.isLoading}
            />
            <MetricCard
              label="Total Reach"
              value={fmt(overview?.reach?.total)}
              change={overview?.comparison?.reachChange}
              loading={overviewQ.isLoading}
            />
            <MetricCard
              label="Avg Engagement Rate"
              value={overview?.engagement?.avgEngagementRate != null ? fmtPct(overview.engagement.avgEngagementRate) : '—'}
              change={overview?.comparison?.engagementRateChange}
              loading={overviewQ.isLoading}
            />
            <MetricCard
              label="Impressions"
              value={fmt(overview?.reach?.impressions)}
              loading={overviewQ.isLoading}
            />
          </div>

          {!overviewQ.isLoading && !overviewQ.isError && !overview && (
            <EmptyState hint="Connect a social account to see analytics." />
          )}

          {overview?.engagement && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard label="Total Posts" value={fmt(overview.engagement.totalPosts)} loading={false} />
              <MetricCard label="Total Likes" value={fmt(overview.engagement.totalLikes)} loading={false} />
              <MetricCard label="Total Comments" value={fmt(overview.engagement.totalComments)} loading={false} />
              <MetricCard label="Total Shares" value={fmt(overview.engagement.totalShares)} loading={false} />
              <MetricCard label="Total Saves" value={fmt(overview.engagement.totalSaves)} loading={false} />
              <MetricCard label="Total Views" value={fmt(overview.engagement.totalViews)} loading={false} />
            </div>
          )}
        </TabsContent>

        {/* ── Growth ── */}
        <TabsContent value="growth" className="space-y-4 mt-4">
          {growthQ.isError && (
            <ErrorCard message={errMsg(growthQ.error)} onRetry={() => growthQ.refetch()} />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Follower Growth Over Time</CardTitle>
              <CardDescription>Total followers tracked across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {growthQ.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : growthQ.isError ? null : growthChartData.length === 0 ? (
                <EmptyState hint="No follower history data yet." />
              ) : (
                <ResponsiveContainer width="100%" height={288}>
                  <LineChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => fmt(v)} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(v: number) => [fmt(v), 'Followers']}
                    />
                    <Line type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {growthQ.data?.byPlatform && growthQ.data.byPlatform.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Growth by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {growthQ.data.byPlatform.map(p => (
                    <div key={p.platform} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="capitalize font-medium text-sm">{p.platform}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground font-mono">{p.net >= 0 ? '+' : ''}{fmt(p.net)}</span>
                        <span className={p.growthRate >= 0 ? 'text-green-500' : 'text-destructive'}>
                          {fmtChange(p.growthRate).text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Engagement ── */}
        <TabsContent value="engagement" className="space-y-4 mt-4">
          {engagementQ.isError && (
            <ErrorCard message={errMsg(engagementQ.error)} onRetry={() => engagementQ.refetch()} />
          )}

          {engagementQ.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : engagement?.summary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard label="Avg Engagement Rate" value={fmtPct(engagement.summary.avgEngagementRate)} loading={false} />
                <MetricCard label="Total Posts" value={fmt(engagement.summary.totalPosts)} loading={false} />
                <MetricCard label="Avg Likes/Post" value={fmt(engagement.summary.avgLikesPerPost)} loading={false} />
                <MetricCard label="Avg Comments/Post" value={fmt(engagement.summary.avgCommentsPerPost)} loading={false} />
                <MetricCard label="Avg Shares/Post" value={fmt(engagement.summary.avgSharesPerPost)} loading={false} />
              </div>

              {engagementPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Rate by Platform</CardTitle>
                    <CardDescription>Average engagement rate distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={engagementPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${fmtPct(value)}`}>
                          {engagementPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 min-w-[160px]">
                      {engagementPieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="capitalize">{d.name}</span>
                          <span className="ml-auto font-mono text-muted-foreground">{fmtPct(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {engagement.byPlatform.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Engagement by Platform</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {engagement.byPlatform.map(p => (
                        <div key={p.platform} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="capitalize font-medium text-sm">{p.platform}</span>
                          <div className="flex items-center gap-4 text-sm">
                            {p.totalLikes != null && <span className="text-muted-foreground">{fmt(p.totalLikes)} likes</span>}
                            {p.avgEngagementRate != null && (
                              <span className="font-mono">{fmtPct(p.avgEngagementRate)} eng.</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : !engagementQ.isError ? (
            <EmptyState hint="No engagement data for this period." />
          ) : null}
        </TabsContent>

        {/* ── Content ── */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {contentQ.isError && (
            <ErrorCard message={errMsg(contentQ.error)} onRetry={() => contentQ.refetch()} />
          )}

          {content?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard label="Total Posts" value={fmt(content.summary.totalPosts)} loading={false} />
              <MetricCard label="Posts/Day" value={content.summary.postingFrequency != null ? content.summary.postingFrequency.toFixed(1) : '—'} loading={false} />
              <MetricCard label="Consistency Score" value={content.summary.consistencyScore != null ? fmtPct(content.summary.consistencyScore) : '—'} loading={false} />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Posts ranked by engagement score</CardDescription>
            </CardHeader>
            <CardContent>
              {contentQ.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : contentQ.isError ? null : !content?.topContent?.length ? (
                <EmptyState hint="No content data yet for this period." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Post Title</th>
                        <th className="px-4 py-3 font-medium">Platform</th>
                        <th className="px-4 py-3 font-medium">Format</th>
                        <th className="px-4 py-3 font-medium text-right">Likes</th>
                        <th className="px-4 py-3 font-medium text-right">Comments</th>
                        <th className="px-4 py-3 font-medium text-right">Shares</th>
                        <th className="px-4 py-3 font-medium text-right">Eng. Rate</th>
                        <th className="px-4 py-3 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.topContent.map(row => (
                        <tr key={String(row.id)} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium max-w-[260px] truncate" title={row.title}>{row.title}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary capitalize">{row.platform}</span>
                          </td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">{row.format ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(row.engagement?.likes)}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(row.engagement?.comments)}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(row.engagement?.shares)}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmtPct(row.engagementRate)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono font-medium ${row.score > 80 ? 'text-green-500' : row.score > 50 ? 'text-yellow-500' : 'text-destructive'}`}>
                              {row.score.toFixed(0)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Audience ── */}
        <TabsContent value="audience" className="space-y-4 mt-4">
          {audienceQ.isError && (
            <ErrorCard message={errMsg(audienceQ.error)} onRetry={() => audienceQ.refetch()} />
          )}

          {audienceQ.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : audience ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard label="Total Followers" value={fmt(audience.totals?.totalFollowers)} loading={false} />
                <MetricCard label="Total Following" value={fmt(audience.totals?.totalFollowing)} loading={false} />
                <MetricCard label="Net Growth" value={fmt(audience.growth?.net)} change={audience.growth?.growthRate} loading={false} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Age Groups */}
                {audience.demographics?.ageGroups?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Age Groups</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {audience.demographics.ageGroups.map(a => (
                        <div key={a.label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{a.label}</span>
                          <span className="font-mono">{fmtPct(a.value)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Genders */}
                {audience.demographics?.genders?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Gender</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={audience.demographics.genders.map(g => ({ name: g.label, value: g.value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {audience.demographics.genders.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Countries */}
                {audience.demographics?.countries?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Top Countries</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {audience.demographics.countries.slice(0, 6).map(c => (
                        <div key={c.label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{c.label}</span>
                          <span className="font-mono">{fmtPct(c.value)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* No demographics */}
              {!audience.demographics?.ageGroups?.length && !audience.demographics?.genders?.length && !audience.demographics?.countries?.length && (
                <EmptyState message="No demographic data yet." hint="Demographics appear after your accounts sync audience data." />
              )}

              {/* By Platform */}
              {audience.byPlatform?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Audience by Platform</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {audience.byPlatform.map(p => (
                        <div key={p.platform} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span className="capitalize font-medium text-sm">{p.platform}</span>
                          <div className="flex items-center gap-4 text-sm">
                            {p.totalFollowers != null && <span className="font-mono text-muted-foreground">{fmt(p.totalFollowers)} followers</span>}
                            {p.audienceGrowthRate != null && (
                              <span className={p.audienceGrowthRate >= 0 ? 'text-green-500' : 'text-destructive'}>
                                {fmtChange(p.audienceGrowthRate).text}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : !audienceQ.isError ? (
            <EmptyState hint="No audience data for this period." />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
