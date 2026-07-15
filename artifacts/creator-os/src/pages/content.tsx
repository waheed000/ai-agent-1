import { useGetContentIdeas, useGetContentCalendar, useAnalyzeContent, useCreateCalendarItem } from "@workspace/api-client-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Calendar as CalendarIcon, Beaker, Plus, Flame, AlignLeft, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function ContentStrategy() {
  const [activeTab, setActiveTab] = useState("ideas");
  const [analyzerText, setAnalyzerText] = useState("");
  
  const { data: ideas, isLoading: ideasLoading } = useGetContentIdeas();
  const { data: calendar, isLoading: calendarLoading } = useGetContentCalendar();
  const analyzeMutation = useAnalyzeContent();

  const handleAnalyze = () => {
    if (!analyzerText.trim()) return;
    analyzeMutation.mutate({ data: { text: analyzerText } });
  };

  const getEngagementColor = (eng: string) => {
    switch(eng) {
      case 'viral': return 'bg-accent/20 text-accent border-accent/30';
      case 'high': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default: return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'hard': return 'text-destructive';
      case 'medium': return 'text-accent';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Strategy</h1>
          <p className="text-muted-foreground">Plan, ideate, and optimize your content pipeline.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 space-x-8">
          <TabsTrigger value="ideas" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:shadow-none flex gap-2">
            <Lightbulb size={16} /> Content Ideas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:shadow-none flex gap-2">
            <CalendarIcon size={16} /> Calendar
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:shadow-none flex gap-2">
            <Beaker size={16} /> AI Analyzer
          </TabsTrigger>
        </TabsList>

        {/* Ideas Tab */}
        <TabsContent value="ideas" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideasLoading ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
            ) : (
              ideas?.map((idea) => (
                <Card key={idea.id} className="bg-card hover:border-primary/50 transition-colors group flex flex-col">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-mono tracking-wider ${getEngagementColor(idea.expectedEngagement)}`}>
                          {idea.expectedEngagement} impact
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-secondary uppercase font-mono tracking-wider text-muted-foreground">
                          {idea.platform}
                        </span>
                      </div>
                      <span className={`text-xs font-medium capitalize ${getDifficultyColor(idea.difficulty)}`}>
                        {idea.difficulty}
                      </span>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">{idea.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                    <div className="bg-secondary/50 p-3 rounded-md text-sm border border-border/50 mb-4 flex-1">
                      <span className="font-semibold text-xs uppercase text-muted-foreground block mb-1">Suggested Hook</span>
                      <p className="italic">"{idea.hook}"</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2 mt-auto">
                      <Plus size={16} /> Add to Calendar
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Content Calendar</CardTitle>
                <CardDescription>Schedule for this month</CardDescription>
              </div>
              <Button className="gap-2">
                <Plus size={16} /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {calendarLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <div className="space-y-4">
                  {/* Simplified List View instead of full calendar grid for the mockup */}
                  <div className="flex flex-col gap-3">
                    {calendar?.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
                        <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-border pr-4">
                          <span className="text-xs text-muted-foreground uppercase">{format(new Date(item.date), 'MMM')}</span>
                          <span className="text-2xl font-bold font-mono">{format(new Date(item.date), 'dd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-base mb-1 truncate">{item.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize px-2 py-0.5 rounded bg-secondary">{item.platform}</span>
                            <span>•</span>
                            <span>{item.format}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border uppercase tracking-wide
                            ${item.status === 'published' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                              item.status === 'draft' ? 'bg-accent/10 text-accent border-accent/20' : 
                              'bg-secondary text-muted-foreground border-border'}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyzer Tab */}
        <TabsContent value="analyzer" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test your hook</CardTitle>
                <CardDescription>Paste your draft post or script here. The AI will score its potential and suggest edits.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="Paste your content here..." 
                  className="min-h-[300px] mb-4 bg-secondary/30 resize-none font-mono text-sm"
                  value={analyzerText}
                  onChange={(e) => setAnalyzerText(e.target.value)}
                />
                <Button 
                  onClick={handleAnalyze} 
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                  disabled={!analyzerText.trim() || analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending ? "Analyzing..." : <><Beaker size={16} /> Analyze Content</>}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {analyzeMutation.isSuccess && analyzeMutation.data ? (
                <>
                  <Card className="border-accent/30 bg-accent/5">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Flame className="text-accent" /> Analysis Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 mb-8">
                        <div className="relative flex items-center justify-center w-24 h-24">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                            <circle 
                              cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--accent))" strokeWidth="8"
                              strokeDasharray={`${analyzeMutation.data.engagementPotential * 2.83} 283`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold font-mono text-accent">{analyzeMutation.data.engagementPotential}</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-medium">
                              <span>Hook Score</span>
                              <span className="font-mono">{analyzeMutation.data.hookScore}/100</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${analyzeMutation.data.hookScore}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1 font-medium">
                              <span>CTA Score</span>
                              <span className="font-mono">{analyzeMutation.data.ctaScore}/100</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-[hsl(var(--chart-3))]" style={{ width: `${analyzeMutation.data.ctaScore}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-card p-4 rounded-md border border-border">
                          <h4 className="text-sm font-semibold mb-2">AI Feedback</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {analyzeMutation.data.feedback}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Suggestions to improve:</h4>
                          <ul className="space-y-2">
                            {analyzeMutation.data.suggestions.map((sugg, i) => (
                              <li key={i} className="flex gap-3 text-sm items-start">
                                <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                                <span>{sugg}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 text-center border-dashed">
                  <AlignLeft className="h-12 w-12 mb-4 opacity-20" />
                  <p>Paste your content and click Analyze to see AI scoring and feedback.</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}