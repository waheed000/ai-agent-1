import { useGetDashboardOverview, useGetGrowthChart, useGetAiSummary, useGetGrowthScore, useGetTopContent } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Activity, Users, Eye, MousePointerClick, BrainCircuit, Heart, MessageCircle, Share2, Award, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function DashboardHome() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  
  const { data: overview, isLoading: overviewLoading } = useGetDashboardOverview();
  const { data: chartData, isLoading: chartLoading } = useGetGrowthChart({ period });
  const { data: aiSummary, isLoading: aiLoading } = useGetAiSummary();
  const { data: growthScore, isLoading: scoreLoading } = useGetGrowthScore();
  const { data: topContent, isLoading: contentLoading } = useGetTopContent();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const chartTransformedData = chartData?.labels.map((label, i) => ({
    name: label,
    followers: chartData.followers[i],
    engagement: chartData.engagement[i],
    reach: chartData.reach[i]
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Your social presence at a glance.</p>
        </div>
        <div className="flex bg-secondary p-1 rounded-md">
          {(["7d", "30d", "90d"] as const).map(p => (
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Followers", value: overview?.followers, growth: overview?.followersGrowth, icon: Users },
          { label: "Total Reach", value: overview?.reach, growth: overview?.reachGrowth, icon: Eye },
          { label: "Avg Engagement", value: overview?.engagement ? `${overview.engagement}%` : null, growth: overview?.engagementGrowth, icon: MousePointerClick },
          { label: "Impressions", value: overview?.impressions, growth: overview?.impressionsGrowth, icon: Activity }
        ].map((metric, i) => (
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                  <metric.icon size={16} />
                </div>
              </div>
              {overviewLoading ? (
                <Skeleton className="h-8 w-24 mb-2" />
              ) : (
                <div className="text-3xl font-bold font-mono tracking-tight mb-2">
                  {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
                </div>
              )}
              {overviewLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <div className={`flex items-center text-sm font-medium ${metric.growth && metric.growth >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {metric.growth && metric.growth >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                  {metric.growth}% from last period
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
            <CardDescription>Followers, Reach, and Engagement over {period}</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTransformedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorFollowers)" />
                    <Area type="monotone" dataKey="reach" stroke="hsl(var(--chart-3))" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* AI Summary Card */}
          <Card className="border-accent/30 bg-accent/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <BrainCircuit className="text-accent h-5 w-5 relative z-10" />
                  <div className="absolute inset-0 bg-accent/40 blur-sm rounded-full animate-pulse"></div>
                </div>
                <CardTitle className="text-accent text-sm font-mono uppercase tracking-wider">AI Growth Analyst</CardTitle>
              </div>
              {aiLoading ? (
                <Skeleton className="h-6 w-3/4" />
              ) : (
                <CardTitle className="text-lg leading-tight">{aiSummary?.headline}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">{aiSummary?.detail}</p>
                  <ul className="space-y-2">
                    {aiSummary?.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></div>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <Button variant="link" className="px-0 text-accent h-auto mt-4 font-medium" asChild>
                    <Link href="/ai-insights">View Full Analysis <ArrowRight size={14} className="ml-1" /></Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Growth Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Creator Growth Score</CardTitle>
            </CardHeader>
            <CardContent>
              {scoreLoading ? (
                <div className="flex flex-col items-center py-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="w-full space-y-2 mt-4">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center w-32 h-32 mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                        strokeDasharray={`${(growthScore?.score || 0) * 2.83} 283`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold font-mono tracking-tighter">{growthScore?.score}</span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    {[
                      { label: "Consistency", value: growthScore?.consistency },
                      { label: "Engagement", value: growthScore?.engagement },
                      { label: "Content Quality", value: growthScore?.contentQuality }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                          <span>{item.label}</span>
                          <span className="font-mono">{item.value}/100</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${item.value}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Posts driving the most growth in this period</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topContent?.slice(0, 4).map((post) => (
                <div key={post.id} className="flex gap-4 p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors group cursor-pointer">
                  <div className="w-20 h-24 bg-card rounded-md overflow-hidden relative shrink-0 border border-border">
                    {/* Placeholder for thumbnail */}
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                      <Eye size={24} />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-[10px] px-1 rounded text-white font-medium">
                      {post.platform}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">{post.title}</h4>
                      <span className="text-xs text-muted-foreground">{post.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-2">
                      <span className="flex items-center gap-1"><Heart size={12} /> {formatNumber(post.likes)}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatNumber(post.comments)}</span>
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