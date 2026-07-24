import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiInsightsApi,
  type Strategy,
  type StrategyPlanType,
} from '@/services/ai-insights-api';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BrainCircuit,
  Sparkles,
  Zap,
  Target,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronRight,
  TrendingUp,
  Shield,
  ListChecks,
  FlaskConical,
  LayoutDashboard,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

function planTypeLabel(pt: StrategyPlanType): string {
  return { '7day': '7-Day', '30day': '30-Day', '90day': '90-Day' }[pt];
}

function relativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days  = Math.floor(ms / 86_400_000);
  if (mins < 2)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-500 border-red-500/20 bg-red-500/5',
  medium: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
  low:    'text-green-500 border-green-500/20 bg-green-500/5',
};

const LIKELIHOOD_COLORS: Record<string, string> = {
  high:   'text-red-400',
  medium: 'text-amber-400',
  low:    'text-green-400',
};

// ─── Strategy status badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Strategy['status'] }) {
  if (status === 'ready')      return <Badge className="bg-green-500/15 text-green-500 border-green-500/25 hover:bg-green-500/15">Ready</Badge>;
  if (status === 'generating') return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/25 hover:bg-amber-500/15 flex items-center gap-1"><Loader2 size={10} className="animate-spin" />Generating</Badge>;
  return <Badge variant="destructive" className="opacity-80">Failed</Badge>;
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function StrategySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ strategy }: { strategy: Strategy }) {
  return (
    <div className="space-y-4">
      {/* Success probability */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Success Probability</span>
          <span className="text-2xl font-bold font-mono text-primary">
            {strategy.successProbability}%
          </span>
        </div>
        <Progress value={strategy.successProbability} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          Based on your analytics, competitor data, and current trends.
        </p>
      </div>

      {/* Overview narrative */}
      {strategy.overview && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Strategy Overview
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{strategy.overview}</p>
        </div>
      )}

      {/* Primary goal */}
      {strategy.primaryGoal && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">
            Primary Goal
          </h4>
          <p className="text-sm font-medium">{strategy.primaryGoal}</p>
        </div>
      )}

      {/* Target metrics */}
      {strategy.targetMetrics && Object.keys(strategy.targetMetrics).length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Target Metrics
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(strategy.targetMetrics).map(([key, val]) => (
              <div key={key} className="text-center p-2 rounded-lg border border-border bg-card">
                <div className="text-base font-bold font-mono">{String(val)}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly milestones */}
      {strategy.weeklyMilestones?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" /> Weekly Milestones
          </h4>
          <ul className="space-y-2">
            {strategy.weeklyMilestones.map((m, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-snug">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Day plan tab ─────────────────────────────────────────────────────────────

function DayPlanTab({ strategy }: { strategy: Strategy }) {
  if (!strategy.dayPlan?.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Calendar size={32} className="opacity-20" />
        <p className="text-sm">Day plan will appear once strategy generation completes.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {strategy.dayPlan.map((day) => (
        <div
          key={day.day}
          className="p-4 rounded-xl border border-border bg-card flex flex-col gap-2 hover:border-primary/30 transition-colors"
        >
          {/* Day header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Day {day.day}</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock size={10} /> {day.estimatedTime}
            </div>
          </div>

          {/* Focus */}
          <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
            {day.focus}
          </div>

          {/* Platform */}
          <Badge variant="outline" className="capitalize w-fit text-xs h-5">
            {day.platform}
          </Badge>

          {/* Actions */}
          <ul className="space-y-1 flex-1">
            {day.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ChevronRight size={11} className="mt-0.5 shrink-0 text-primary/50" />
                <span className="leading-snug">{action}</span>
              </li>
            ))}
          </ul>

          {/* Content suggestion */}
          {day.contentSuggestion && (
            <div className="border-t border-border/50 pt-2 mt-1">
              <p className="text-[11px] text-muted-foreground leading-snug">
                <span className="font-semibold text-accent">Idea:</span>{' '}
                {day.contentSuggestion}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Action checklist tab ─────────────────────────────────────────────────────

function ChecklistTab({ strategy }: { strategy: Strategy }) {
  if (!strategy.actionChecklist?.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <ListChecks size={32} className="opacity-20" />
        <p className="text-sm">No checklist items yet.</p>
      </div>
    );
  }

  const sorted = [...strategy.actionChecklist].sort((a, b) => {
    const prio: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2);
  });

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
            item.completed
              ? 'border-border bg-secondary/20 opacity-60'
              : 'border-border bg-card hover:border-primary/20'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {item.completed ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : (
              <Circle size={16} className="text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-snug ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
              {item.action}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[item.priority] ?? ''}`}>
                {item.priority}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">{item.category}</span>
              <span className="text-[10px] text-muted-foreground">Due day {item.dueDay}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Experiments tab ──────────────────────────────────────────────────────────

function ExperimentsTab({ strategy }: { strategy: Strategy }) {
  if (!strategy.growthExperiments?.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <FlaskConical size={32} className="opacity-20" />
        <p className="text-sm">No experiments defined yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {strategy.growthExperiments.map((exp, i) => (
        <Card key={i} className="bg-card border-border hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{exp.name}</CardTitle>
              <Badge variant="outline" className="shrink-0 text-xs">{exp.duration}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hypothesis</span>
              <p className="mt-1 text-muted-foreground">{exp.hypothesis}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</span>
              <p className="mt-1 text-muted-foreground">{exp.method}</p>
            </div>
            <div className="flex flex-wrap gap-4 pt-1 border-t border-border/50">
              <div>
                <span className="text-xs text-muted-foreground">Success Metric</span>
                <p className="text-sm font-medium">{exp.successMetric}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Expected Lift</span>
                <p className="text-sm font-bold text-green-500 flex items-center gap-0.5">
                  <ArrowUpRight size={13} /> {exp.expectedLift}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Risk analysis tab ────────────────────────────────────────────────────────

function RisksTab({ strategy }: { strategy: Strategy }) {
  if (!strategy.riskAnalysis?.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Shield size={32} className="opacity-20" />
        <p className="text-sm">No risks identified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {strategy.riskAnalysis.map((risk, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{risk.risk}</p>
            <div className="flex gap-1.5 shrink-0 text-[10px] font-medium">
              <span className={`px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[risk.impact] ?? ''}`}>
                {risk.impact} impact
              </span>
              <span className={`${LIKELIHOOD_COLORS[risk.likelihood] ?? 'text-muted-foreground'} px-1.5 py-0.5 rounded border border-border`}>
                {risk.likelihood} likelihood
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/70">Mitigation:</span> {risk.mitigation}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Strategy detail ──────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'dayplan' | 'checklist' | 'experiments' | 'risks';

const DETAIL_TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',     icon: <LayoutDashboard size={13} /> },
  { id: 'dayplan',      label: 'Day Plan',      icon: <Calendar size={13} /> },
  { id: 'checklist',    label: 'Action Plan',   icon: <ListChecks size={13} /> },
  { id: 'experiments',  label: 'Experiments',   icon: <FlaskConical size={13} /> },
  { id: 'risks',        label: 'Risks',         icon: <Shield size={13} /> },
];

function StrategyDetail({ strategy }: { strategy: Strategy }) {
  const [tab, setTab] = useState<DetailTab>('overview');

  return (
    <div className="space-y-4">
      {/* Strategy header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={strategy.status} />
            <Badge variant="outline" className="capitalize text-xs">
              {planTypeLabel(strategy.planType)} Plan
            </Badge>
            {strategy.platforms?.length > 0 && (
              <Badge variant="outline" className="capitalize text-xs">
                {strategy.platforms[0]}{strategy.platforms.length > 1 ? ` +${strategy.platforms.length - 1}` : ''}
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold">{strategy.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generated {relativeDate(strategy.createdAt)}
            {strategy.generatedAt ? ` · completed ${relativeDate(strategy.generatedAt)}` : ''}
          </p>
        </div>
      </div>

      {/* Generating state */}
      {strategy.status === 'generating' && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <Loader2 size={14} className="animate-spin text-amber-500" />
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            Generating your strategy… This usually takes 10–30 seconds. This page will update automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Failed state */}
      {strategy.status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle size={14} />
          <AlertDescription>
            Strategy generation failed.{strategy.failReason ? ` ${strategy.failReason}` : ''} Please try generating a new strategy.
          </AlertDescription>
        </Alert>
      )}

      {/* Detail tabs (only when ready) */}
      {strategy.status === 'ready' && (
        <>
          <div className="flex bg-secondary p-1 rounded-md overflow-x-auto">
            {DETAIL_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div>
            {tab === 'overview'    && <OverviewTab strategy={strategy} />}
            {tab === 'dayplan'     && <DayPlanTab strategy={strategy} />}
            {tab === 'checklist'   && <ChecklistTab strategy={strategy} />}
            {tab === 'experiments' && <ExperimentsTab strategy={strategy} />}
            {tab === 'risks'       && <RisksTab strategy={strategy} />}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Strategy list item ───────────────────────────────────────────────────────

function StrategyListItem({
  strategy,
  selected,
  onClick,
}: {
  strategy: Strategy;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card hover:border-primary/20 hover:bg-secondary/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {planTypeLabel(strategy.planType)}
        </span>
        <StatusBadge status={strategy.status} />
      </div>
      <p className="text-sm font-medium truncate">{strategy.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{relativeDate(strategy.createdAt)}</p>
    </button>
  );
}

// ─── Generate panel ───────────────────────────────────────────────────────────

const PLAN_TYPES: { value: StrategyPlanType; label: string; desc: string }[] = [
  { value: '7day',  label: '7-Day',  desc: 'Quick sprint plan' },
  { value: '30day', label: '30-Day', desc: 'Monthly growth plan' },
  { value: '90day', label: '90-Day', desc: 'Quarter roadmap' },
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

function GeneratePanel({
  onGenerate,
  isGenerating,
}: {
  onGenerate: (params: { planType: StrategyPlanType; platform?: string }) => void;
  isGenerating: boolean;
}) {
  const [planType, setPlanType] = useState<StrategyPlanType>('7day');
  const [platform, setPlatform] = useState('');

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles size={15} className="text-primary" /> Generate New Strategy
        </CardTitle>
        <CardDescription className="text-xs">
          AI analyzes your analytics, trends, and competitors to build a personalized growth roadmap.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan type */}
        <div className="grid grid-cols-3 gap-2">
          {PLAN_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => setPlanType(pt.value)}
              className={`p-2.5 rounded-lg border text-center transition-colors ${
                planType === pt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/30'
              }`}
            >
              <div className="text-sm font-bold">{pt.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{pt.desc}</div>
            </button>
          ))}
        </div>

        {/* Platform */}
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Focus platform (optional)" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="w-full"
          onClick={() => onGenerate({ planType, platform: platform || undefined })}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 size={14} className="mr-2 animate-spin" /> Generating…</>
          ) : (
            <><Zap size={14} className="mr-2" /> Generate Strategy</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiInsights() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── List all strategies ────────────────────────────────────────────────────

  const listQ = useQuery({
    queryKey: ['strategy', 'list'],
    queryFn: () => aiInsightsApi.list({ limit: 20 }),
    staleTime: 30_000,
  });

  const strategies = listQ.data ?? [];

  // Auto-select the most recent strategy
  useEffect(() => {
    if (strategies.length > 0 && !selectedId) {
      setSelectedId(strategies[0].id);
    }
  }, [strategies, selectedId]);

  // ── Poll when selected strategy is generating ──────────────────────────────

  const selectedStrategy = strategies.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedStrategy?.status !== 'generating') return;
    const timer = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['strategy', 'list'] });
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedStrategy?.status, qc]);

  // ── Generate mutation ──────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: aiInsightsApi.generate,
    onSuccess: (newStrategy) => {
      setGenerateError(null);
      qc.invalidateQueries({ queryKey: ['strategy', 'list'] });
      setSelectedId(newStrategy.id);
    },
    onError: (err) => {
      setGenerateError(errorMessage(err));
    },
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-3">
          <BrainCircuit size={13} /> AI Strategy Engine
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
        <p className="text-muted-foreground mt-1">
          Personalized growth strategies built from your real analytics, trends, and competitor data.
        </p>
      </div>

      {/* Generate error */}
      {generateError && (
        <Alert variant="destructive">
          <AlertCircle size={14} />
          <AlertDescription>{generateError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* ── Left: Generate + History ── */}
        <div className="space-y-4">
          <GeneratePanel
            onGenerate={generateMutation.mutate}
            isGenerating={generateMutation.isPending}
          />

          {/* Strategy history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target size={13} className="text-muted-foreground" /> Strategy History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {listQ.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : listQ.isError ? (
                <div className="text-xs text-muted-foreground py-2 flex items-center gap-1">
                  <AlertCircle size={12} /> {errorMessage(listQ.error)}
                </div>
              ) : strategies.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No strategies yet. Generate your first one.
                </p>
              ) : (
                strategies.map((s) => (
                  <StrategyListItem
                    key={s.id}
                    strategy={s}
                    selected={selectedId === s.id}
                    onClick={() => setSelectedId(s.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Strategy detail ── */}
        <div>
          {listQ.isLoading ? (
            <StrategySkeleton />
          ) : !selectedStrategy ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground border border-dashed border-border rounded-xl">
              <BrainCircuit size={48} className="opacity-15" />
              <div className="text-center">
                <p className="text-base font-medium">No strategy selected</p>
                <p className="text-sm mt-1 max-w-sm">
                  Generate a personalized growth strategy to get started. The AI will analyze your
                  real data and build an actionable plan.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 bg-secondary/50 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={11} /> Uses your real analytics, trends &amp; competitor data
              </div>
            </div>
          ) : (
            <StrategyDetail strategy={selectedStrategy} />
          )}
        </div>
      </div>
    </div>
  );
}
