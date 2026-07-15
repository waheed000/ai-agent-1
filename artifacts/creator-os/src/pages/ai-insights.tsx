import { useGetGrowthAnalysis, useGetContentAgentInsights, useGetGrowthCoachPlan } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Activity, Target, Zap, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AiInsights() {
  const { data: growthAnalysis, isLoading: analysisLoading } = useGetGrowthAnalysis();
  const { data: contentInsights, isLoading: contentLoading } = useGetContentAgentInsights();
  const { data: coachPlan, isLoading: coachLoading } = useGetGrowthCoachPlan();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent w-fit mb-2">
          <Sparkles size={14} />
          Agents Active
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AI Insights Board</h1>
        <p className="text-muted-foreground">Your team of specialized AI agents analyzing your data 24/7.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Analysis Agent (Indigo) */}
        <Card className="border-primary/30 bg-card overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-colors duration-500"></div>
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Activity className="text-primary h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Growth Analyst Agent</CardTitle>
                  <p className="text-xs text-primary/80 font-mono tracking-wider uppercase mt-0.5">Status: Online</p>
                </div>
              </div>
              {growthAnalysis?.urgency && (
                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md ${
                  growthAnalysis.urgency === 'high' ? 'bg-destructive/20 text-destructive' :
                  growthAnalysis.urgency === 'medium' ? 'bg-accent/20 text-accent' :
                  'bg-green-500/20 text-green-500'
                }`}>
                  {growthAnalysis.urgency} Priority
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <AlertTriangle size={16} className="text-destructive" /> Critical Issues
              </h4>
              {analysisLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /></div>
              ) : (
                <ul className="space-y-3">
                  {growthAnalysis?.problems.map((problem, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-md bg-destructive/5 border border-destructive/10 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0"></div>
                      <span className="leading-snug">{problem}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <CheckCircle2 size={16} className="text-primary" /> Recommendations
              </h4>
              {analysisLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /></div>
              ) : (
                <ul className="space-y-3">
                  {growthAnalysis?.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-md bg-primary/5 border border-primary/10 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                      <span className="leading-snug">{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Agent (Violet) */}
        <Card className="border-[hsl(var(--chart-3))]/30 bg-card overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--chart-3))]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[hsl(var(--chart-3))]/10 transition-colors duration-500"></div>
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--chart-3))]/20 flex items-center justify-center border border-[hsl(var(--chart-3))]/30 shadow-[0_0_15px_hsl(var(--chart-3),0.2)]">
                <Target className="text-[hsl(var(--chart-3))] h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Content Strategist Agent</CardTitle>
                <p className="text-xs text-[hsl(var(--chart-3))]/80 font-mono tracking-wider uppercase mt-0.5">Status: Online</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid gap-6">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Format Performance
              </h4>
              {contentLoading ? (
                <div className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-24" /></div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contentInsights?.topFormats.map((format, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3))]/20">
                      {format}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Current Weaknesses
              </h4>
              {contentLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /></div>
              ) : (
                <ul className="space-y-2">
                  {contentInsights?.weaknesses.map((weakness, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[hsl(var(--chart-3))]"></div>
                      {weakness}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Content Suggestions
              </h4>
              {contentLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /></div>
              ) : (
                <div className="space-y-3">
                  {contentInsights?.suggestions.map((sugg, i) => (
                    <div key={i} className="p-3 rounded-md bg-[hsl(var(--chart-3))]/5 border border-[hsl(var(--chart-3))]/10 text-sm">
                      {sugg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Growth Coach (Amber/Gold) */}
        <Card className="border-accent/30 bg-card overflow-hidden relative group lg:col-span-2">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] -mt-40 group-hover:bg-accent/10 transition-colors duration-500"></div>
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Zap className="text-accent h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Growth Coach Agent</CardTitle>
                  <p className="text-xs text-accent/80 font-mono tracking-wider uppercase mt-0.5">Action Plan: {coachPlan?.week || "Loading"}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-accent/30 text-accent hover:bg-accent/10 gap-2">
                Export to Calendar <ChevronRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {coachLoading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {coachPlan?.days.map((day, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border bg-secondary/30 flex flex-col h-full hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold">{day.day}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        {day.format}
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-3 text-foreground leading-snug">{day.task}</p>
                    <div className="mt-auto pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-accent">Why:</span> {day.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}