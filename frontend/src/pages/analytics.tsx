import { useGetAnalyticsMetrics, useGetAnalyticsChart, useGetPlatformBreakdown, useGetContentPerformance } from "@workspace/api-client-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Filter, Linkedin } from "lucide-react";
import { SiInstagram, SiYoutube, SiTiktok } from "react-icons/si";

export default function Analytics() {
  const [platform, setPlatform] = useState<string>("all");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [chartType, setChartType] = useState<string>("line");

  const { data: metrics, isLoading: metricsLoading } = useGetAnalyticsMetrics({ platform: platform as any, period });
  const { data: chartData, isLoading: chartLoading } = useGetAnalyticsChart({ platform, period });
  const { data: pieData, isLoading: pieLoading } = useGetPlatformBreakdown();
  const { data: contentData, isLoading: contentLoading } = useGetContentPerformance({ platform });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const platforms = [
    { id: "all", label: "All Platforms", icon: null },
    { id: "instagram", label: "Instagram", icon: SiInstagram, color: "#E1306C" },
    { id: "youtube", label: "YouTube", icon: SiYoutube, color: "#FF0000" },
    { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "#000000" },
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  ];

  // Transform chartData to Recharts format
  const transformedChartData = chartData?.labels.map((label, i) => {
    const dataPoint: any = { name: label };
    chartData.series.forEach(series => {
      dataPoint[series.name] = series.data[i];
    });
    return dataPoint;
  }) || [];

  const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Deep Dive</h1>
          <p className="text-muted-foreground">Comprehensive performance data across all your channels.</p>
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-wrap bg-secondary p-1 rounded-md inline-flex w-fit">
            {platforms.map(p => (
              <button 
                key={p.id} 
                onClick={() => setPlatform(p.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${platform === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {p.icon && <p.icon className="w-4 h-4" />}
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex bg-secondary p-1 rounded-md inline-flex w-fit">
            {(["7d", "30d", "90d"] as const).map(p => (
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Followers", value: metrics?.followers, change: metrics?.followersChange },
          { label: "Reach", value: metrics?.reach, change: metrics?.reachChange },
          { label: "Engagement", value: metrics?.engagement ? `${metrics.engagement}%` : null, change: metrics?.engagementChange },
          { label: "Impressions", value: metrics?.impressions, change: metrics?.impressionsChange },
          { label: "Watch Time (hrs)", value: metrics?.watchTime, change: metrics?.watchTimeChange }
        ].map((metric, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-4 md:p-6">
              <span className="text-sm font-medium text-muted-foreground block mb-2">{metric.label}</span>
              {metricsLoading ? (
                <Skeleton className="h-8 w-full mb-2" />
              ) : (
                <div className="text-2xl lg:text-3xl font-bold font-mono tracking-tight mb-2">
                  {metric.value != null ? (typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value) : '-'}
                </div>
              )}
              {metricsLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : metric.change != null ? (
                <div className={`flex items-center text-xs font-medium ${metric.change >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {metric.change >= 0 ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
                  {Math.abs(metric.change)}%
                </div>
              ) : (
                <div className="text-xs text-transparent select-none">-</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart area */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Metrics comparison over time</CardDescription>
            </div>
            <Tabs value={chartType} onValueChange={setChartType} className="w-[160px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="line">Line</TabsTrigger>
                <TabsTrigger value="bar">Bar</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={transformedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      {chartData?.series.map((s, i) => (
                        <Line key={s.name} type="monotone" dataKey={s.name} stroke={`hsl(var(--chart-${i+1}))`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart data={transformedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      {chartData?.series.map((s, i) => (
                        <Bar key={s.name} dataKey={s.name} fill={`hsl(var(--chart-${i+1}))`} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Audience Breakdown</CardTitle>
            <CardDescription>Followers by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {pieLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <div className="h-[350px] w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="percentage"
                      stroke="none"
                    >
                      {pieData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full mt-4 space-y-2 px-4">
                  {pieData?.map((entry, i) => (
                    <div key={entry.platform} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }}></div>
                        <span className="capitalize">{entry.platform}</span>
                      </div>
                      <div className="flex gap-4 font-mono">
                        <span className="text-muted-foreground">{formatNumber(entry.followers)}</span>
                        <span className="w-10 text-right">{entry.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
          <CardDescription>Detailed metrics for your recent posts</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-y border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Post Title</th>
                <th className="px-6 py-4 font-medium">Platform</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium text-right">Likes</th>
                <th className="px-6 py-4 font-medium text-right">Comments</th>
                <th className="px-6 py-4 font-medium text-right">Shares</th>
                <th className="px-6 py-4 font-medium text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {contentLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                contentData?.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium max-w-[300px] truncate" title={row.title}>{row.title}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary capitalize">
                        {row.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize text-muted-foreground">{row.type}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(row.likes)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(row.comments)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatNumber(row.shares)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-medium ${row.score > 80 ? 'text-green-500' : row.score > 50 ? 'text-accent' : 'text-destructive'}`}>
                        {row.score}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}