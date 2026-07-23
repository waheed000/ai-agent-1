import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  competitorApi,
  getCompetitorId,
  type Competitor,
  type AddCompetitorParams,
} from '@/services/competitor-api';
import { ApiError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Users,
  TrendingUp,
  Activity,
  Zap,
  ChevronRight,
  BarChart2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

function fmtNum(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toFixed(2) + '%';
}

function avatarInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function platformColor(platform: string): string {
  switch (platform) {
    case 'instagram': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    case 'youtube':   return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'tiktok':    return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'twitter':   return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    case 'linkedin':  return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default:          return 'bg-secondary text-muted-foreground border-border';
  }
}

function threatLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'High', color: 'text-destructive' };
  if (score >= 40) return { label: 'Medium', color: 'text-yellow-500' };
  return { label: 'Low', color: 'text-green-500' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        <AlertDescription>{message}</AlertDescription>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1">
        <RefreshCw size={14} /> Retry
      </Button>
    </Alert>
  );
}

// ─── Add Competitor Dialog ────────────────────────────────────────────────────

function AddCompetitorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddCompetitorParams>({ username: '', platform: 'instagram', notes: '', niche: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: AddCompetitorParams) => competitorApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      setForm({ username: '', platform: 'instagram', notes: '', niche: '' });
      setFieldErrors({});
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        const flat: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(err.fieldErrors)) {
          flat[k] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setFieldErrors(flat);
      }
    },
  });

  const handleSubmit = () => {
    setFieldErrors({});
    const clean: AddCompetitorParams = {
      username: form.username.trim(),
      platform: form.platform,
      ...(form.notes?.trim() && { notes: form.notes.trim() }),
      ...(form.niche?.trim() && { niche: form.niche.trim() }),
    };
    mutation.mutate(clean);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track a Competitor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Username <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. mkbhd"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            {fieldErrors.username && (
              <p className="text-xs text-destructive">{fieldErrors.username}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Platform <span className="text-destructive">*</span></Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.platform && (
              <p className="text-xs text-destructive">{fieldErrors.platform}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Niche <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. Tech reviews, Fitness, Gaming…"
              value={form.niche ?? ''}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Why are you tracking this competitor?"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>

          {mutation.isError && !Object.keys(fieldErrors).length && (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(mutation.error)}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !form.username.trim()}
          >
            {mutation.isPending ? 'Adding…' : 'Track Competitor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({
  competitor,
  onClose,
}: {
  competitor: Competitor | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => competitorApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      onClose();
    },
  });

  return (
    <Dialog open={!!competitor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove competitor?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Stop tracking{' '}
          <span className="font-semibold text-foreground">@{competitor?.username}</span>
          {' '}on {competitor?.platform}? All associated data will be removed.
        </p>
        {mutation.isError && (
          <Alert variant="destructive">
            <AlertCircle size={14} />
            <AlertDescription>{errMsg(mutation.error)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => competitor && mutation.mutate(getCompetitorId(competitor))}
          >
            {mutation.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Competitor Overview Panel ────────────────────────────────────────────────

function OverviewPanel({ competitor }: { competitor: Competitor }) {
  const id = getCompetitorId(competitor);
  const queryClient = useQueryClient();

  const { data: overview, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['competitor-overview', id],
    queryFn: () => competitorApi.getOverview(id),
  });

  const syncMutation = useMutation({
    mutationFn: () => competitorApi.sync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-overview', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <ErrorCard message={errMsg(error)} onRetry={() => refetch()} />;
  }

  if (!overview) return null;

  const { engagement, topPosts, hashtags, formatMix, followerHistory, scores } = overview;

  // Chart data: follower history
  const historyChartData = followerHistory.slice(-14).map((h) => ({
    date: format(new Date(h.date), 'MMM d'),
    Followers: h.followers,
    'Eng. Rate': parseFloat(h.avgEngagementRate?.toFixed(2) ?? '0'),
  }));

  // Format mix chart
  const formatChartData = formatMix.map((f) => ({
    format: (f.format ?? f._id ?? 'unknown').replace(/_/g, ' '),
    count: f.count,
  }));

  const threatInfo = scores ? threatLabel(scores.overallThreat) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {avatarInitials(competitor.username)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-lg leading-none">@{competitor.username}</h3>
            <Badge variant="outline" className={`mt-1 text-[10px] capitalize ${platformColor(competitor.platform)}`}>
              {competitor.platform}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-1"
        >
          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
          {syncMutation.isPending ? 'Syncing…' : 'Sync'}
        </Button>
      </div>

      {syncMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle size={14} />
          <AlertDescription>{errMsg(syncMutation.error)}</AlertDescription>
        </Alert>
      )}
      {syncMutation.isSuccess && (
        <Alert className="border-green-500/30 bg-green-500/5">
          <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
            Sync complete — {(syncMutation.data as { postsStored?: number })?.postsStored ?? 0} posts updated.
          </AlertDescription>
        </Alert>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider mb-1">Followers</p>
          <p className="text-xl font-bold font-mono">{fmtNum(competitor.followerCount)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider mb-1">Eng. Rate</p>
          <p className="text-xl font-bold font-mono">{fmtPct(competitor.avgEngagementRate ?? engagement?.avgEngagementRate)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider mb-1">Posts Tracked</p>
          <p className="text-xl font-bold font-mono">{engagement?.totalPosts ?? competitor.postCount ?? '—'}</p>
        </Card>
        {scores && (
          <Card className="p-3 col-span-2 sm:col-span-3">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider mb-2">Threat Level</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold font-mono ${threatInfo?.color}`}>{scores.overallThreat}</span>
                <span className={`text-sm font-medium ${threatInfo?.color}`}>{threatInfo?.label}</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                <span>Engagement: <span className="font-medium text-foreground">{scores.engagementComparison > 0 ? '+' : ''}{scores.engagementComparison}</span></span>
                <span>Frequency: <span className="font-medium text-foreground">{scores.contentFrequency}/100</span></span>
                <span>Consistency: <span className="font-medium text-foreground">{scores.consistencyComparison}/100</span></span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Follower history chart */}
      {historyChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={14} /> Follower History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtNum(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="Followers" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format mix */}
      {formatChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 size={14} /> Content Format Mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
                  <XAxis dataKey="format" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top hashtags */}
      {hashtags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Hashtags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hashtags.slice(0, 10).map((h, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  #{h.tag ?? h._id} <span className="ml-1 text-muted-foreground">{h.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} /> Top Posts by Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPosts.slice(0, 5).map((post, i) => (
              <div
                key={post.id ?? post._id ?? post.platformPostId ?? i}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 border border-border/50"
              >
                <span className="text-xs text-muted-foreground font-mono w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">{post.format?.replace(/_/g, ' ')}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                    <span>👍 {fmtNum(post.engagement?.likes)}</span>
                    <span>💬 {fmtNum(post.engagement?.comments)}</span>
                    <span>👁 {fmtNum(post.engagement?.views)}</span>
                    <span className="font-medium text-foreground">{fmtPct(post.engagementRate)} eng.</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {competitor.lastSyncedAt && (
        <p className="text-[10px] text-muted-foreground text-center">
          Last synced {format(new Date(competitor.lastSyncedAt), 'MMM d, yyyy h:mm a')}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Competitors() {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Competitor | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: competitors, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['competitors'],
    queryFn: () => competitorApi.list(),
  });

  const selectedCompetitor = competitors?.find((c) => getCompetitorId(c) === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Intelligence</h1>
          <p className="text-muted-foreground">Track rival creators and decode their strategy.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus size={16} /> Add Competitor
        </Button>
      </div>

      {isError && <ErrorCard message={errMsg(error)} onRetry={() => refetch()} />}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Competitor list (left) ─── */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tracked Accounts
            </h3>
            {competitors && (
              <span className="text-xs text-muted-foreground">{competitors.length} / 20</span>
            )}
          </div>

          {/* Loading */}
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}

          {/* Empty state */}
          {!isLoading && !isError && competitors?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <Users className="h-10 w-10 mb-3 opacity-20" />
              <h3 className="text-base font-semibold text-foreground mb-1">No competitors tracked yet</h3>
              <p className="text-xs mb-4 max-w-[200px]">
                Add a competitor to start monitoring their performance.
              </p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus size={14} /> Add Competitor
              </Button>
            </div>
          )}

          {/* List */}
          {!isLoading && !isError && competitors && competitors.length > 0 && competitors.map((comp) => {
            const id = getCompetitorId(comp);
            const isSelected = id === selectedId;
            return (
              <Card
                key={id}
                onClick={() => setSelectedId(isSelected ? null : id)}
                className={`cursor-pointer group border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-secondary/20'
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-11 w-11 border border-border shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {avatarInitials(comp.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm leading-none mb-1 truncate">@{comp.username}</h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] capitalize ${platformColor(comp.platform)}`}>
                          {comp.platform}
                        </Badge>
                        {comp.followerCount != null && (
                          <span className="text-[10px] text-muted-foreground">{fmtNum(comp.followerCount)} followers</span>
                        )}
                      </div>
                      {comp.avgEngagementRate != null && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Eng. rate: {fmtPct(comp.avgEngagementRate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && <ChevronRight size={14} className="text-primary" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(comp); }}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all p-1"
                      aria-label="Remove competitor"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ─── Overview panel (right) ─── */}
        <div className="lg:col-span-2">
          {!selectedCompetitor && !isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground border border-dashed border-border rounded-xl h-full">
              <Zap className="h-10 w-10 mb-3 opacity-20" />
              <h3 className="text-base font-semibold text-foreground mb-1">Select a competitor</h3>
              <p className="text-sm max-w-xs">
                Click on a tracked account to see their performance overview, top posts, and threat analysis.
              </p>
            </div>
          )}

          {selectedCompetitor && (
            <OverviewPanel key={getCompetitorId(selectedCompetitor)} competitor={selectedCompetitor} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddCompetitorDialog open={addOpen} onOpenChange={setAddOpen} />
      <DeleteDialog
        competitor={deleteTarget}
        onClose={() => {
          if (deleteTarget && getCompetitorId(deleteTarget) === selectedId) {
            setSelectedId(null);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
