import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trendApi, type TrendItem, type TrendPlatform, getTrendId } from '@/services/trend-api';
import { contentApi } from '@/services/content-api';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  Hash,
  MessageSquare,
  Video,
  Layers,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart2,
  PlusCircle,
  Loader2,
  Clock,
  Trophy,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtScore(n: number): string {
  return Math.round(n).toString();
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

// ─── Category styling ─────────────────────────────────────────────────────────

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'hashtag':   return <Hash size={12} />;
    case 'topic':     return <MessageSquare size={12} />;
    case 'format':    return <Video size={12} />;
    case 'keyword':   return <Layers size={12} />;
    case 'challenge': return <Trophy size={12} />;
    case 'audio':     return <Sparkles size={12} />;
    default:          return <TrendingUp size={12} />;
  }
}

const CATEGORY_STYLES: Record<string, string> = {
  hashtag:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  topic:     'bg-green-500/10 text-green-400 border-green-500/20',
  format:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  keyword:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  challenge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  audio:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function categoryStyle(cat: string): string {
  return CATEGORY_STYLES[cat] ?? 'bg-primary/10 text-primary border-primary/20';
}

const STATUS_STYLES: Record<string, string> = {
  rising:   'bg-green-500/10 text-green-500 border-green-500/20',
  peak:     'bg-amber-500/10 text-amber-500 border-amber-500/20',
  declining:'bg-red-500/10 text-red-500 border-red-500/20',
  expired:  'bg-muted text-muted-foreground border-border',
};

function statusStyle(s: string): string {
  return STATUS_STYLES[s] ?? 'bg-muted text-muted-foreground';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendSkeleton() {
  return (
    <div className="rounded-xl border border-border p-5 space-y-4 bg-card">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

// ─── Draft creation dialog ────────────────────────────────────────────────────

function CreateDraftDialog({
  trend,
  open,
  onClose,
}: {
  trend: TrendItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const createDraft = useMutation({
    mutationFn: (t: TrendItem) =>
      contentApi.createDraft({
        title: `${t.category === 'hashtag' ? '#' : ''}${t.name}`,
        platform: t.platform !== 'all' ? (t.platform as string) : undefined,
        caption: t.aiContentIdea ?? undefined,
        hashtags: t.relatedTags?.length
          ? t.relatedTags
          : t.category === 'hashtag'
            ? [t.name]
            : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] });
      onClose();
    },
  });

  if (!trend) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Draft from Trend</DialogTitle>
          <DialogDescription>
            A new draft will be created in the Content Planner pre-filled with
            this trend's data.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${categoryStyle(trend.category)}`}>
              {getCategoryIcon(trend.category)} {trend.category}
            </span>
            {trend.platform !== 'all' && (
              <Badge variant="outline" className="capitalize text-xs">{trend.platform}</Badge>
            )}
          </div>
          <p className="font-semibold">
            {trend.category === 'hashtag' ? '#' : ''}{trend.name}
          </p>
          {trend.aiContentIdea && (
            <p className="text-muted-foreground text-xs">{trend.aiContentIdea}</p>
          )}
        </div>

        {createDraft.isError && (
          <Alert variant="destructive">
            <AlertCircle size={14} />
            <AlertDescription>{errorMessage(createDraft.error)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createDraft.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => trend && createDraft.mutate(trend)}
            disabled={createDraft.isPending}
          >
            {createDraft.isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" /> Creating…</>
            ) : (
              <><PlusCircle size={14} className="mr-2" /> Create Draft</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Trend detail dialog ──────────────────────────────────────────────────────

function TrendDetailDialog({
  trend,
  open,
  onClose,
  onCreateDraft,
}: {
  trend: TrendItem | null;
  open: boolean;
  onClose: () => void;
  onCreateDraft: (t: TrendItem) => void;
}) {
  if (!trend) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${categoryStyle(trend.category)}`}>
              {getCategoryIcon(trend.category)} {trend.category}
            </span>
            <span className={`px-2 py-0.5 rounded border text-xs font-medium capitalize ${statusStyle(trend.status)}`}>
              {trend.status}
            </span>
          </div>
          <DialogTitle className="text-xl">
            {trend.category === 'hashtag' ? '#' : ''}{trend.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Score + Growth */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className="text-2xl font-bold font-mono">{fmtScore(trend.trendScore)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Trend Score</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className={`text-2xl font-bold font-mono flex items-center justify-center gap-0.5 ${trend.growthRate >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {trend.growthRate >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(trend.growthRate).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Growth</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className="text-2xl font-bold font-mono">{fmtVolume(trend.volume)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Volume</div>
            </div>
          </div>

          {/* Platform */}
          {trend.platform !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Platform</span>
              <Badge variant="outline" className="capitalize">{trend.platform}</Badge>
            </div>
          )}

          {/* Score bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
              <span>Trend Maturity</span>
              <span className="font-mono">{fmtScore(trend.trendScore)} / 100</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  trend.trendScore > 75 ? 'bg-destructive' :
                  trend.trendScore > 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, trend.trendScore)}%` }}
              />
            </div>
          </div>

          {/* Description */}
          {trend.description && (
            <p className="text-muted-foreground">{trend.description}</p>
          )}

          {/* AI Content Idea */}
          {trend.aiContentIdea && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1.5">
                <Sparkles size={12} /> AI Content Idea
              </div>
              <p className="text-foreground/90 leading-snug">{trend.aiContentIdea}</p>
            </div>
          )}

          {/* Related Tags */}
          {trend.relatedTags?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Related Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {trend.relatedTags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground border border-border">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={11} /> Detected {new Date(trend.detectedAt).toLocaleDateString()}
            </span>
            {trend.peakDate && (
              <span className="flex items-center gap-1">
                <Trophy size={11} /> Peak {new Date(trend.peakDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onClose(); onCreateDraft(trend); }}>
            <PlusCircle size={14} className="mr-2" /> Create Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Trend Card ───────────────────────────────────────────────────────────────

function TrendCard({
  trend,
  onClick,
  onCreateDraft,
}: {
  trend: TrendItem;
  onClick: () => void;
  onCreateDraft: (e: React.MouseEvent) => void;
}) {
  return (
    <Card
      className="bg-card hover:border-primary/40 transition-colors group overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        {/* Category + Status */}
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium uppercase tracking-wider ${categoryStyle(trend.category)}`}>
            {getCategoryIcon(trend.category)} {trend.category}
          </span>
          <span className={`px-2 py-0.5 rounded border text-xs font-medium capitalize ${statusStyle(trend.status)}`}>
            {trend.status}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors leading-tight break-words">
          {trend.category === 'hashtag' ? '#' : ''}{trend.name}
        </h3>

        {/* Score bar */}
        <div>
          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
            <span>Trend Score</span>
            <span className="font-mono">{fmtScore(trend.trendScore)}/100</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                trend.trendScore > 75 ? 'bg-destructive' :
                trend.trendScore > 50 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, trend.trendScore)}%` }}
            />
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={`flex items-center gap-0.5 font-medium ${trend.growthRate >= 0 ? 'text-green-500' : 'text-destructive'}`}>
            {trend.growthRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend.growthRate).toFixed(1)}%
          </span>
          {trend.volume > 0 && (
            <span className="flex items-center gap-1">
              <BarChart2 size={11} /> {fmtVolume(trend.volume)}
            </span>
          )}
          {trend.platform && trend.platform !== 'all' && (
            <span className="capitalize">{trend.platform}</span>
          )}
        </div>

        {/* Related tags */}
        {trend.relatedTags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trend.relatedTags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-muted-foreground">
                #{tag}
              </span>
            ))}
            {trend.relatedTags.length > 3 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-muted-foreground">
                +{trend.relatedTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* AI idea */}
        {trend.aiContentIdea && (
          <div className="bg-secondary/40 p-2.5 rounded-lg border border-border/50 text-xs">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1">
              AI Idea
            </span>
            <p className="text-foreground/80 line-clamp-2 leading-snug">{trend.aiContentIdea}</p>
          </div>
        )}

        {/* CTA */}
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-1 text-xs h-8"
          onClick={(e) => { e.stopPropagation(); onCreateDraft(e); }}
        >
          <PlusCircle size={12} className="mr-1.5" /> Create Draft
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'all' | 'topics' | 'hashtags' | 'creators';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',      label: 'All Trends' },
  { id: 'topics',   label: 'Topics' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'creators', label: 'Creator Trends' },
];

const PLATFORMS = [
  { value: '', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'twitter',   label: 'Twitter / X' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'linkedin',  label: 'LinkedIn' },
];

const STATUSES = [
  { value: '',         label: 'All Statuses' },
  { value: 'rising',   label: 'Rising' },
  { value: 'peak',     label: 'At Peak' },
  { value: 'declining',label: 'Declining' },
];

export default function Trends() {
  const qc = useQueryClient();

  const [tab, setTab]         = useState<Tab>('all');
  const [platform, setPlatform] = useState('');
  const [status, setStatus]   = useState('rising');

  const [selectedTrend, setSelectedTrend]   = useState<TrendItem | null>(null);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [draftOpen, setDraftOpen]           = useState(false);
  const [refreshInfo, setRefreshInfo]       = useState<{ collected: number; enriched: number } | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const queryFn = useCallback(() => {
    switch (tab) {
      case 'topics':   return trendApi.topics({ platform: platform || undefined, limit: 50 });
      case 'hashtags': return trendApi.hashtags({ platform: platform || undefined, limit: 50 });
      case 'creators': return trendApi.creators({ platform: platform || undefined, limit: 50 });
      default:
        return trendApi.list({
          platform: platform || undefined,
          status: status || undefined,
          limit: 50,
        });
    }
  }, [tab, platform, status]);

  const trendsQ = useQuery({
    queryKey: ['trends', tab, platform, status],
    queryFn,
    staleTime: 60_000,
  });

  // ── Refresh mutation ───────────────────────────────────────────────────────

  const refreshMutation = useMutation({
    mutationFn: () => trendApi.refresh({ platform: platform || undefined }),
    onSuccess: (result) => {
      setRefreshInfo({ collected: result.collected, enriched: result.enriched });
      qc.invalidateQueries({ queryKey: ['trends'] });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openDetail = (t: TrendItem) => {
    setSelectedTrend(t);
    setDetailOpen(true);
  };

  const openDraftFrom = (t: TrendItem) => {
    setSelectedTrend(t);
    setDraftOpen(true);
  };

  const trends = trendsQ.data ?? [];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trend Intelligence</h1>
          <p className="text-muted-foreground">
            Discover rising trends before they peak. Powered by real-time data.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {refreshInfo && (
            <span className="text-xs text-muted-foreground">
              {refreshInfo.collected} collected · {refreshInfo.enriched} enriched
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? (
              <><Loader2 size={14} className="mr-2 animate-spin" /> Refreshing…</>
            ) : (
              <><RefreshCw size={14} className="mr-2" /> Refresh Trends</>
            )}
          </Button>
        </div>
      </div>

      {/* Refresh error */}
      {refreshMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle size={14} />
          <AlertDescription>{errorMessage(refreshMutation.error)}</AlertDescription>
        </Alert>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Tabs */}
        <div className="flex bg-secondary p-1 rounded-md overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-sm transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Platform */}
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status (only for All tab) */}
          {tab === 'all' && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {trendsQ.isError ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <AlertCircle size={32} className="opacity-40" />
          <p className="text-sm">{errorMessage(trendsQ.error)}</p>
          <Button variant="outline" size="sm" onClick={() => trendsQ.refetch()}>
            <RefreshCw size={13} className="mr-2" /> Retry
          </Button>
        </div>
      ) : trendsQ.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <TrendSkeleton key={i} />)}
        </div>
      ) : trends.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <TrendingUp size={40} className="opacity-20" />
          <p className="text-base font-medium">No trends found</p>
          <p className="text-sm text-center max-w-sm">
            {platform
              ? `No ${status || ''} trends found for ${platform}.`
              : 'No trends in the database yet.'}{' '}
            Refresh to pull the latest data.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? (
              <><Loader2 size={13} className="mr-2 animate-spin" /> Refreshing…</>
            ) : (
              <><RefreshCw size={13} className="mr-2" /> Refresh Trends</>
            )}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{trends.length} trend{trends.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trends.map((trend) => (
              <TrendCard
                key={getTrendId(trend)}
                trend={trend}
                onClick={() => openDetail(trend)}
                onCreateDraft={(e) => { e.stopPropagation(); openDraftFrom(trend); }}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Dialogs ── */}
      <TrendDetailDialog
        trend={selectedTrend}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onCreateDraft={openDraftFrom}
      />

      <CreateDraftDialog
        trend={selectedTrend}
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
      />
    </div>
  );
}
