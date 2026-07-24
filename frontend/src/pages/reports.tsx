import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportApi,
  getReportId,
  type Report,
  type ReportType,
  type ReportStatus,
  type ReportPlatform,
} from '@/services/report-api';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Calendar,
  BarChart2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Link } from 'wouter';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtShort(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function typeLabel(t: ReportType): string {
  return { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', custom: 'Custom' }[t] ?? t;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === 'ready')
    return (
      <Badge variant="default" className="gap-1 text-xs">
        <CheckCircle2 size={11} /> Ready
      </Badge>
    );
  if (status === 'generating')
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Loader2 size={11} className="animate-spin" /> Generating
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <XCircle size={11} /> Failed
    </Badge>
  );
}

// ─── Report List Item ─────────────────────────────────────────────────────────

function ReportListItem({
  report,
  selected,
  onClick,
}: {
  report: Report;
  selected: boolean;
  onClick: () => void;
}) {
  const period = report.period
    ? `${fmtShort(report.period.startDate)} – ${fmtShort(report.period.endDate)}`
    : '—';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors flex items-start gap-3 ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-secondary/30'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 border ${
          selected
            ? 'bg-primary/15 text-primary border-primary/30'
            : 'bg-secondary text-muted-foreground border-border'
        }`}
      >
        <FileText size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-semibold truncate">{report.title}</span>
          <StatusBadge status={report.status} />
        </div>
        <p className="text-xs text-muted-foreground">{typeLabel(report.type)} · {period}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(report.createdAt)}</p>
      </div>
      <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}

// ─── Report Detail Panel ──────────────────────────────────────────────────────

function ReportDetail({
  reportId,
  onDelete,
}: {
  reportId: string;
  onDelete: (id: string) => void;
}) {
  const { data: report, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportApi.getById(reportId),
    // Poll while generating
    refetchInterval: (query) => {
      const d = query.state.data as Report | undefined;
      return d?.status === 'generating' ? 4_000 : false;
    },
    staleTime: 30_000,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-2/3 rounded" />
        <Skeleton className="h-4 w-1/3 rounded" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-muted-foreground">
        <AlertCircle size={32} className="opacity-40" />
        <p className="text-sm">{errorMessage(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw size={14} className="mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const period = report.period
    ? `${fmtDate(report.period.startDate)} – ${fmtDate(report.period.endDate)}`
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg font-bold leading-tight">{report.title}</h2>
              <StatusBadge status={report.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {typeLabel(report.type)}
              </span>
              {period && <span>{period}</span>}
              {report.platforms?.length ? (
                <span className="capitalize">{report.platforms.join(', ')}</span>
              ) : null}
              {report.generatedAt && (
                <span>Generated {fmtDate(report.generatedAt)}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete report"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Generating state */}
      {report.status === 'generating' && (
        <div className="m-6 flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">Generating your report…</p>
            <p className="text-xs mt-0.5">This usually takes 30–60 seconds. The page will update automatically.</p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {report.status === 'failed' && (
        <div className="m-6 flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Report generation failed</p>
            {report.failReason && (
              <p className="text-xs text-muted-foreground mt-0.5">{report.failReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Content tabs — only when ready */}
      {report.status === 'ready' && (
        <div className="p-6 flex-1">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4 h-9 flex-wrap">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="growth" className="text-xs">Growth</TabsTrigger>
              <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
              <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI Insights</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {report.executiveSummary && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText size={14} /> Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {report.executiveSummary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* KPIs */}
              {report.kpis?.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target size={14} /> KPIs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {report.kpis.map((kpi, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm font-medium">{kpi.metric}</p>
                            {kpi.unit && (
                              <p className="text-xs text-muted-foreground">{kpi.unit}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-semibold">
                              {String(kpi.current ?? '—')}
                            </p>
                            {kpi.target != null && (
                              <p className="text-xs text-muted-foreground">
                                Target: {String(kpi.target)}
                              </p>
                            )}
                            {kpi.status && (
                              <Badge
                                variant={kpi.status === 'achieved' || kpi.status === 'on_track' ? 'default' : 'secondary'}
                                className="text-[10px] mt-0.5 capitalize"
                              >
                                {kpi.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Priority Score */}
              {report.priorityScore != null && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Priority Score</span>
                      <span className="text-2xl font-bold font-mono">{report.priorityScore}/100</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next week goals */}
              {report.nextWeekGoals?.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 size={14} /> Next Period Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {report.nextWeekGoals.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">›</span> {g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            {/* Growth */}
            <TabsContent value="growth" className="space-y-4 mt-0">
              {report.growthMetrics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Followers Gained', value: fmt(report.growthMetrics.followersGained) },
                      { label: 'Followers Lost', value: fmt(report.growthMetrics.followersLost) },
                      { label: 'Net Growth', value: fmt(report.growthMetrics.netGrowth) },
                      { label: 'Growth Rate', value: report.growthMetrics.growthRate != null ? `${report.growthMetrics.growthRate.toFixed(1)}%` : '—' },
                      { label: 'Total Reach', value: fmt(report.growthMetrics.totalReach) },
                      { label: 'Total Impressions', value: fmt(report.growthMetrics.totalImpressions) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-secondary/40 border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-xl font-bold font-mono">{value}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptySection label="No growth metrics available for this report." />
              )}
            </TabsContent>

            {/* Engagement */}
            <TabsContent value="engagement" className="space-y-4 mt-0">
              {report.engagementMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Avg Engagement Rate', value: report.engagementMetrics.avgEngagementRate != null ? `${report.engagementMetrics.avgEngagementRate.toFixed(2)}%` : '—' },
                    { label: 'Total Engagements', value: fmt(report.engagementMetrics.totalEngagements) },
                    { label: 'Total Likes', value: fmt(report.engagementMetrics.totalLikes) },
                    { label: 'Total Comments', value: fmt(report.engagementMetrics.totalComments) },
                    { label: 'Total Shares', value: fmt(report.engagementMetrics.totalShares) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-secondary/40 border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="text-xl font-bold font-mono">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySection label="No engagement metrics available for this report." />
              )}
            </TabsContent>

            {/* Content Performance */}
            <TabsContent value="content" className="space-y-4 mt-0">
              {report.contentPerformance ? (
                <Card>
                  <CardContent className="pt-4">
                    <div className="divide-y divide-border">
                      {[
                        { label: 'Posts Published', value: fmt(report.contentPerformance.postsPublished) },
                        { label: 'Avg Posts / Week', value: fmt(report.contentPerformance.avgPostsPerWeek) },
                        { label: 'Consistency Score', value: report.contentPerformance.consistencyScore != null ? `${report.contentPerformance.consistencyScore}/100` : '—' },
                        { label: 'Top Performing Format', value: report.contentPerformance.topPerformingFormat ?? '—' },
                        { label: 'Top Performing Platform', value: report.contentPerformance.topPerformingPlatform ?? '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-muted-foreground">{label}</span>
                          <span className="text-sm font-semibold font-mono capitalize">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <EmptySection label="No content performance data available." />
              )}

              {/* Competitor comparison */}
              {report.competitorComparison && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users size={14} /> Competitor Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.competitorComparison.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {report.competitorComparison.summary}
                      </p>
                    )}
                    {report.competitorComparison.advantages?.length ? (
                      <div>
                        <p className="text-xs font-medium text-green-500 mb-1">Advantages</p>
                        <ul className="space-y-1">
                          {report.competitorComparison.advantages.map((a, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-green-500 mt-0.5">+</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {report.competitorComparison.contentGaps?.length ? (
                      <div>
                        <p className="text-xs font-medium text-amber-500 mb-1">Content Gaps</p>
                        <ul className="space-y-1">
                          {report.competitorComparison.contentGaps.map((g, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">·</span> {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {/* Trend summary */}
              {report.trendSummary && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp size={14} /> Trend Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {report.trendSummary.summary && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {report.trendSummary.summary}
                      </p>
                    )}
                    {report.trendSummary.risingTrends?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {report.trendSummary.risingTrends.map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {report.trendSummary.missedOpportunities?.length ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Missed Opportunities</p>
                        <ul className="space-y-1">
                          {report.trendSummary.missedOpportunities.map((m, i) => (
                            <li key={i} className="text-xs text-muted-foreground">· {m}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AI Insights */}
            <TabsContent value="ai" className="space-y-4 mt-0">
              {report.aiInsights ? (
                <>
                  {report.aiInsights.narrative && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles size={14} className="text-primary" /> AI Narrative
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {report.aiInsights.narrative}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.aiInsights.strengths?.length ? (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-green-500">Strengths</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {report.aiInsights.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-green-500 font-bold mt-0.5">+</span> {s}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : null}

                    {report.aiInsights.weaknesses?.length ? (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-destructive">Weaknesses</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {report.aiInsights.weaknesses.map((w, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-destructive font-bold mt-0.5">–</span> {w}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : null}

                    {report.aiInsights.recommendations?.length ? (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-primary">Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {report.aiInsights.recommendations.map((r, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">›</span> {r}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : null}

                    {report.aiInsights.opportunities?.length ? (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-amber-500">Opportunities</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {report.aiInsights.opportunities.map((o, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">◆</span> {o}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                </>
              ) : (
                <EmptySection label="No AI insights available for this report." />
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete report?</DialogTitle>
            <DialogDescription>
              This will permanently remove &ldquo;{report.title}&rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(getReportId(report));
                setConfirmDelete(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
      <BarChart2 size={28} className="opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── Generate Dialog ──────────────────────────────────────────────────────────

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const PLATFORMS: { value: ReportPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
];

function GenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGenerate: (type: ReportType, platform?: ReportPlatform, referenceDate?: string) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState<ReportType>('weekly');
  const [platform, setPlatform] = useState<ReportPlatform | 'all'>('all');
  const [referenceDate, setReferenceDate] = useState('');

  function handleSubmit() {
    onGenerate(
      type,
      platform === 'all' ? undefined : platform,
      referenceDate || undefined,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            AI will analyse your analytics, competitors, and trends to produce a comprehensive report. Generation takes 30–60 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Report type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Report type</label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Platform <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as ReportPlatform | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Reference date <span className="text-muted-foreground font-normal">(optional — defaults to today)</span>
            </label>
            <input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Queuing…</>
            ) : (
              <><Sparkles size={14} /> Generate</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type FilterStatus = ReportStatus | 'all';
type FilterType = ReportType | 'all';

function FilterBar({
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
}: {
  typeFilter: FilterType;
  statusFilter: FilterStatus;
  onTypeChange: (v: FilterType) => void;
  onStatusChange: (v: FilterStatus) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as FilterType)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {REPORT_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as FilterStatus)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="generating">Generating</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reports() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Build query params from filters
  const listParams = {
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    limit: 50,
  };

  const reportsQ = useQuery({
    queryKey: ['reports', listParams],
    queryFn: () => reportApi.list(listParams),
    staleTime: 30_000,
    // If any report is generating, keep polling
    refetchInterval: (query) => {
      const data = query.state.data as Report[] | undefined;
      return data?.some((r) => r.status === 'generating') ? 5_000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: (params: Parameters<typeof reportApi.generate>[0]) =>
      reportApi.generate(params),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setGenerateOpen(false);
      setSelectedId(getReportId(newReport));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.removeQueries({ queryKey: ['report', deletedId] });
      if (selectedId === deletedId) setSelectedId(null);
    },
  });

  // Auto-select first report when list loads and nothing is selected
  useEffect(() => {
    if (!selectedId && reportsQ.data?.length) {
      setSelectedId(getReportId(reportsQ.data[0]));
    }
  }, [reportsQ.data, selectedId]);

  const reports = reportsQ.data ?? [];
  const hasGenerating = reports.some((r) => r.status === 'generating');

  return (
    <div className="flex flex-col h-full space-y-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI-generated growth reports covering analytics, content, competitors, and trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasGenerating && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              Generating…
            </div>
          )}
          <Button
            onClick={() => setGenerateOpen(true)}
            disabled={generateMutation.isPending}
            className="gap-1.5"
          >
            <Plus size={15} /> Generate Report
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4">
        <FilterBar
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onTypeChange={(v) => {
            setTypeFilter(v);
            setSelectedId(null);
          }}
          onStatusChange={(v) => {
            setStatusFilter(v);
            setSelectedId(null);
          }}
        />
      </div>

      {/* Main content */}
      {reportsQ.isError ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <AlertCircle size={36} className="opacity-40" />
            <p className="text-sm font-medium">{errorMessage(reportsQ.error)}</p>
            <Button variant="outline" size="sm" onClick={() => reportsQ.refetch()}>
              <RefreshCw size={14} className="mr-1.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : reportsQ.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 flex-1">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-full min-h-64 rounded-lg" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <FileText size={28} className="opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">
                {typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No reports match your filters'
                  : 'No reports yet'}
              </p>
              <p className="text-sm max-w-sm">
                {typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try clearing the filters to see all reports.'
                  : 'Generate your first AI report to get a comprehensive summary of your growth, content performance, and strategy recommendations.'}
              </p>
            </div>
            {typeFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={() => setGenerateOpen(true)} className="gap-1.5 mt-2">
                <Sparkles size={14} /> Generate first report
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0 flex-1">
          {/* List column */}
          <div className="space-y-2 overflow-y-auto pr-1">
            {reports.map((report) => {
              const rid = getReportId(report);
              return (
                <ReportListItem
                  key={rid}
                  report={report}
                  selected={selectedId === rid}
                  onClick={() => setSelectedId(rid)}
                />
              );
            })}
          </div>

          {/* Detail column */}
          <Card className="overflow-hidden flex flex-col min-h-0">
            {selectedId ? (
              <ReportDetail
                reportId={selectedId}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ) : (
              <CardContent className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
                <Eye size={28} className="opacity-30" />
                <p className="text-sm">Select a report to view details</p>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Generate dialog */}
      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerate={(type, platform, referenceDate) =>
          generateMutation.mutate({ type, platform, referenceDate })
        }
        isPending={generateMutation.isPending}
      />
    </div>
  );
}
