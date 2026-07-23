import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfToday } from 'date-fns';
import {
  contentApi,
  getPlanItemId,
  type ContentPlanItem,
  type ContentStatus,
  type ContentPlatform,
  type PlannerListParams,
} from '@/services/content-api';
import { ApiError } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  Trash2,
  Wand2,
  LayoutList,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileText,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: ContentPlatform[] = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'];
const STATUSES: ContentStatus[] = ['draft', 'review', 'approved', 'scheduled', 'published', 'archived'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

function statusColor(status: ContentStatus): string {
  switch (status) {
    case 'published': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'approved':  return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'review':    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'archived':  return 'bg-secondary text-muted-foreground border-border';
    default:          return 'bg-accent/10 text-accent border-accent/20'; // draft
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'high':   return 'text-destructive';
    case 'medium': return 'text-yellow-500';
    default:       return 'text-green-500';
  }
}

function fmtNum(n: number | undefined): string {
  if (!n) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
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

function EmptyPlan({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <FileText className="h-12 w-12 mb-4 opacity-20" />
      <h3 className="text-lg font-semibold text-foreground mb-1">No content planned yet</h3>
      <p className="text-sm mb-6 max-w-xs">Generate an AI-powered content plan to fill your calendar with ideas tailored to your niche.</p>
      <Button onClick={onGenerate} className="gap-2">
        <Wand2 size={16} /> Generate Content Plan
      </Button>
    </div>
  );
}

// ─── Status Dropdown ─────────────────────────────────────────────────────────

function StatusDropdown({
  item,
  onUpdate,
}: {
  item: ContentPlanItem;
  onUpdate: (id: string, status: ContentStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity ${statusColor(item.status)}`}
        >
          {item.status} <ChevronDown size={10} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[130px]">
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onUpdate(getPlanItemId(item), s)}
            className="capitalize"
          >
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Content Plan Tab ────────────────────────────────────────────────────────

function PlanTab({ onSwitchToGenerate }: { onSwitchToGenerate: () => void }) {
  const queryClient = useQueryClient();

  const [platform, setPlatform] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: PlannerListParams = useMemo(
    () => ({ platform: platform || undefined, status: status || undefined, limit: 50 }),
    [platform, status],
  );

  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['planner', filters],
    queryFn: () => contentApi.list(filters),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: ContentStatus } }) =>
      contentApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.delete(id),
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const handleStatusChange = (id: string, newStatus: ContentStatus) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={platform || 'all'} onValueChange={(v) => setPlatform(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {items ? `${items.length} item${items.length !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Error */}
      {isError && <ErrorCard message={errMsg(error)} onRetry={() => refetch()} />}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items?.length === 0 && (
        <EmptyPlan onGenerate={onSwitchToGenerate} />
      )}

      {/* Items list */}
      {!isLoading && !isError && items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const id = getPlanItemId(item);
            return (
              <div
                key={id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/10 transition-colors"
              >
                {/* Date */}
                {item.suggestedTime && (
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r border-border pr-3 hidden sm:flex">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {format(new Date(item.suggestedTime), 'MMM')}
                    </span>
                    <span className="text-xl font-bold font-mono leading-none">
                      {format(new Date(item.suggestedTime), 'dd')}
                    </span>
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm leading-snug truncate">{item.title}</h4>
                    <span className={`text-[10px] font-medium capitalize shrink-0 ${priorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="capitalize text-[10px]">{item.platform}</Badge>
                    <span className="capitalize">{item.contentType?.replace(/_/g, ' ')}</span>
                    {item.estimatedReach && (
                      <span>~{fmtNum(item.estimatedReach)} reach</span>
                    )}
                    {item.goal && (
                      <span className="capitalize">{item.goal.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusDropdown item={item} onUpdate={handleStatusChange} />
                  <button
                    onClick={() => setDeleteId(id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Delete item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete content item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this content plan item. This action cannot be undone.</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({ onSwitchToGenerate }: { onSwitchToGenerate: () => void }) {
  const today = startOfToday();
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(today, 13), 'yyyy-MM-dd'));
  const [platform, setPlatform] = useState<string>('');

  const { data: cal, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calendar', startDate, endDate, platform],
    queryFn: () => contentApi.getCalendar({ startDate, endDate, platform: platform || undefined }),
  });

  const activeDays = cal?.days.filter((d) => d.hasContent) ?? [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-40 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-40 text-sm"
          />
        </div>
        <Select value={platform || 'all'} onValueChange={(v) => setPlatform(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {cal && (
          <span className="text-xs text-muted-foreground ml-auto self-center">
            {cal.totalItems} item{cal.totalItems !== 1 ? 's' : ''} across {activeDays.length} day{activeDays.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isError && <ErrorCard message={errMsg(error)} onRetry={() => refetch()} />}

      {isLoading && <Skeleton className="h-[400px] w-full" />}

      {!isLoading && !isError && cal?.totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No content scheduled</h3>
          <p className="text-sm mb-6 max-w-xs">Generate a content plan to populate your calendar.</p>
          <Button onClick={onSwitchToGenerate} className="gap-2">
            <Wand2 size={16} /> Generate Content Plan
          </Button>
        </div>
      )}

      {!isLoading && !isError && cal && cal.totalItems > 0 && (
        <div className="space-y-2">
          {activeDays.map((day) => (
            <Card key={day.date} className="overflow-hidden">
              <div className="flex">
                {/* Date column */}
                <div className="flex flex-col items-center justify-center w-16 shrink-0 bg-secondary/40 border-r border-border px-2 py-3">
                  <span className="text-[10px] uppercase text-muted-foreground font-medium">
                    {format(new Date(day.date + 'T12:00:00'), 'EEE')}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {format(new Date(day.date + 'T12:00:00'), 'MMM')}
                  </span>
                  <span className="text-2xl font-bold font-mono leading-none">
                    {format(new Date(day.date + 'T12:00:00'), 'd')}
                  </span>
                  <span className="mt-1 text-[9px] font-medium text-primary">{day.count}</span>
                </div>

                {/* Items */}
                <div className="flex-1 p-3 space-y-2">
                  {day.items.map((item) => (
                    <div
                      key={getPlanItemId(item)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 bg-secondary/20 border border-border/50"
                    >
                      {item.suggestedTime && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                          <Clock size={10} />
                          {format(new Date(item.suggestedTime), 'h:mm a')}
                        </span>
                      )}
                      <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                      <Badge variant="secondary" className="capitalize text-[10px] shrink-0">{item.platform}</Badge>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide shrink-0 ${statusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Generate Tab ─────────────────────────────────────────────────────────────

function GenerateTab({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);
  const [selectedPlatforms, setSelectedPlatforms] = useState<ContentPlatform[]>(['instagram']);
  const [campaignName, setCampaignName] = useState('');
  const [result, setResult] = useState<{ generated?: number; queued?: boolean } | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      contentApi.generate({
        days,
        platforms: selectedPlatforms,
        campaignName: campaignName.trim() || undefined,
      }),
    onSuccess: (data) => {
      if ('queued' in data && data.queued) {
        setResult({ queued: true });
      } else if ('generated' in data) {
        setResult({ generated: data.generated });
      }
      queryClient.invalidateQueries({ queryKey: ['planner'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const togglePlatform = (p: ContentPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 size={20} className="text-primary" /> AI Content Plan Generator
          </CardTitle>
          <CardDescription>
            Generate a personalized content calendar using your analytics, trending topics, and growth strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Days */}
          <div className="space-y-2">
            <Label>Plan duration</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Math.min(90, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days (max 90)</span>
            </div>
            {days > 7 && (
              <p className="text-xs text-muted-foreground">
                Plans longer than 7 days will be generated in the background.
              </p>
            )}
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    selectedPlatforms.includes(p)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-xs text-destructive">Select at least one platform</p>
            )}
          </div>

          {/* Campaign name */}
          <div className="space-y-2">
            <Label>Campaign name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. Q3 Launch, Summer Series…"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Error */}
          {generateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertDescription>{errMsg(generateMutation.error)}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {result && (
            <Alert className="border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400">
              <CheckCircle2 size={16} />
              <AlertDescription>
                {result.queued
                  ? 'Your content plan is being generated in the background. Check the Plan tab shortly.'
                  : `${result.generated} content items generated successfully!`}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || selectedPlatforms.length === 0}
              className="gap-2"
            >
              {generateMutation.isPending
                ? <><RefreshCw size={16} className="animate-spin" /> Generating…</>
                : <><Zap size={16} /> Generate Plan</>}
            </Button>
            {result && !result.queued && (
              <Button variant="outline" onClick={onSuccess} className="gap-2">
                <LayoutList size={16} /> View Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentStrategy() {
  const [activeTab, setActiveTab] = useState('plan');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Planner</h1>
          <p className="text-muted-foreground">Plan, schedule, and manage your content pipeline.</p>
        </div>
        <Button onClick={() => setActiveTab('generate')} className="gap-2">
          <Wand2 size={16} /> Generate Plan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 space-x-6">
          <TabsTrigger
            value="plan"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:shadow-none flex gap-2"
          >
            <LayoutList size={16} /> Plan
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:shadow-none flex gap-2"
          >
            <CalendarIcon size={16} /> Calendar
          </TabsTrigger>
          <TabsTrigger
            value="generate"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:shadow-none flex gap-2"
          >
            <Wand2 size={16} /> Generate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="pt-6">
          <PlanTab onSwitchToGenerate={() => setActiveTab('generate')} />
        </TabsContent>

        <TabsContent value="calendar" className="pt-6">
          <CalendarTab onSwitchToGenerate={() => setActiveTab('generate')} />
        </TabsContent>

        <TabsContent value="generate" className="pt-6">
          <GenerateTab onSuccess={() => setActiveTab('plan')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
