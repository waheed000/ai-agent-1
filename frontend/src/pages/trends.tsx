import { useGetTrends } from "@workspace/api-client-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight, Hash, MessageSquare, Video, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Trends() {
  const [category, setCategory] = useState<"all" | "topics" | "hashtags" | "keywords" | "formats">("all");
  const { data: trends, isLoading } = useGetTrends({ category: category as any });

  const categories = [
    { id: "all", label: "All Trends" },
    { id: "topics", label: "Topics" },
    { id: "hashtags", label: "Hashtags" },
    { id: "keywords", label: "Keywords" },
    { id: "formats", label: "Formats" },
  ];

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'hashtags': return <Hash size={14} className="text-blue-400" />;
      case 'topics': return <MessageSquare size={14} className="text-green-400" />;
      case 'formats': return <Video size={14} className="text-purple-400" />;
      case 'keywords': return <Layers size={14} className="text-orange-400" />;
      default: return <TrendingUp size={14} className="text-primary" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'hashtags': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'topics': return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'formats': return 'bg-purple-400/10 text-purple-400 border-purple-400/20';
      case 'keywords': return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trend Discovery</h1>
          <p className="text-muted-foreground">Catch rising trends in your niche before they peak.</p>
        </div>
      </div>

      <div className="flex bg-secondary p-1 rounded-md inline-flex w-fit overflow-x-auto max-w-full">
        {categories.map(c => (
          <button 
            key={c.id} 
            onClick={() => setCategory(c.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors whitespace-nowrap ${category === c.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
        ) : (
          trends?.map((trend) => (
            <Card key={trend.id} className="bg-card hover:border-primary/40 transition-colors group overflow-hidden">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium uppercase tracking-wider ${getCategoryColor(trend.category)}`}>
                    {getCategoryIcon(trend.category)}
                    {trend.category}
                  </div>
                  <div className="flex items-center text-sm font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                    <ArrowUpRight size={14} className="mr-0.5" /> {trend.growthRate}%
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold tracking-tight mb-4 group-hover:text-primary transition-colors leading-tight">
                  {trend.category === 'hashtags' ? '#' : ''}{trend.name}
                </h3>
                
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
                    <span>Trend Maturity</span>
                    <span className="font-mono">{trend.popularity}/100</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${trend.popularity > 80 ? 'bg-destructive' : trend.popularity > 50 ? 'bg-accent' : 'bg-primary'}`} 
                      style={{ width: `${trend.popularity}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-secondary/40 p-3 rounded-lg border border-border/50 text-sm">
                  <span className="font-semibold block mb-1 text-xs text-muted-foreground uppercase">AI Idea</span>
                  <p className="text-foreground/90">{trend.suggestedContent}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}