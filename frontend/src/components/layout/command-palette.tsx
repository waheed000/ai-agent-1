import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import { Search, LayoutDashboard, BarChart, BrainCircuit, CalendarDays, TrendingUp, Settings, FileText, Users } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigateTo = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl border bg-card sm:max-w-[500px]">
        <Command className="w-full flex flex-col h-[400px]">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder="Type a command or search..." 
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Command.Item onSelect={() => navigateTo('/dashboard')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Command.Item>
              <Command.Item onSelect={() => navigateTo('/analytics')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <BarChart className="mr-2 h-4 w-4" />
                Analytics
              </Command.Item>
              <Command.Item onSelect={() => navigateTo('/ai-insights')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <BrainCircuit className="mr-2 h-4 w-4 text-accent" />
                AI Insights
              </Command.Item>
              <Command.Item onSelect={() => navigateTo('/content')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <CalendarDays className="mr-2 h-4 w-4" />
                Content Strategy
              </Command.Item>
              <Command.Item onSelect={() => navigateTo('/competitors')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <Users className="mr-2 h-4 w-4" />
                Competitors
              </Command.Item>
              <Command.Item onSelect={() => navigateTo('/trends')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <TrendingUp className="mr-2 h-4 w-4" />
                Trends
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
              <Command.Item onSelect={() => navigateTo('/reports')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Command.Item>
              <Command.Item onSelect={() => navigateTo('/settings')} className="flex items-center px-2 py-2 rounded-sm text-sm cursor-pointer hover:bg-secondary aria-selected:bg-secondary">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}