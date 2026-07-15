import { useGetCompetitors, useGetCompetitorComparison, useAddCompetitor, useDeleteCompetitor } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUpRight, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Competitors() {
  const { data: competitors, isLoading: competitorsLoading } = useGetCompetitors();
  const { data: comparison, isLoading: comparisonLoading } = useGetCompetitorComparison();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const chartData = comparison?.labels.map((label, i) => ({
    metric: label,
    You: comparison.you[i],
    [comparison.competitorName]: comparison.competitor[i]
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Intelligence</h1>
          <p className="text-muted-foreground">Track rival creators and decode their strategy.</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} /> Add Competitor
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitor List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Tracked Accounts</h3>
          {competitorsLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : (
            competitors?.map((comp) => (
              <Card key={comp.id} className="bg-card hover:bg-secondary/30 transition-colors cursor-pointer group border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-border">
                      {comp.avatarUrl ? <AvatarImage src={comp.avatarUrl} /> : <AvatarFallback className="bg-primary/10 text-primary">{comp.username.substring(0, 2).toUpperCase()}</AvatarFallback>}
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-base leading-none mb-1">@{comp.username}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize px-1.5 py-0.5 rounded-sm bg-secondary">{comp.platform}</span>
                        <span>{formatNumber(comp.followers)} followers</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-green-500 flex items-center mb-1">
                      <ArrowUpRight size={12} /> {comp.followersGrowth}%
                    </span>
                    <button className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Comparison Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Head-to-Head Comparison</CardTitle>
                  <CardDescription>You vs. {comparison?.competitorName || "Competitor"}</CardDescription>
                </div>
                <div className="text-sm font-medium px-3 py-1 rounded bg-secondary text-muted-foreground">
                  Last 30 Days
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} hide />
                      <YAxis dataKey="metric" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.3 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="You" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} />
                      {comparison?.competitorName && (
                        <Bar dataKey={comparison.competitorName} fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} barSize={12} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="text-accent" /> Strategy Decoded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  AI analysis of <span className="font-bold text-foreground">@{comparison?.competitorName}</span>'s recent breakout performance.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <h4 className="font-medium text-sm mb-2 uppercase tracking-wider text-muted-foreground">What's Working</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><span className="text-primary">•</span> High-contrast thumbnails</li>
                      <li className="flex gap-2"><span className="text-primary">•</span> Negative hooks ("Stop doing...")</li>
                      <li className="flex gap-2"><span className="text-primary">•</span> Replying to comments instantly</li>
                    </ul>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <h4 className="font-medium text-sm mb-2 uppercase tracking-wider text-muted-foreground">Your Opportunity</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><span className="text-accent">•</span> Their production quality is low</li>
                      <li className="flex gap-2"><span className="text-accent">•</span> They ignore LinkedIn completely</li>
                      <li className="flex gap-2"><span className="text-accent">•</span> Their videos lack clear CTAs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}