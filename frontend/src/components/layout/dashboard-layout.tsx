import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetMe } from "@workspace/api-client-react";
import { 
  BarChart, 
  LayoutDashboard, 
  BrainCircuit, 
  CalendarDays, 
  Users, 
  TrendingUp, 
  FileText, 
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandPalette } from "./command-palette";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { data: user } = useGetMe();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart },
    { href: "/ai-insights", label: "AI Insights", icon: BrainCircuit },
    { href: "/content", label: "Content Strategy", icon: CalendarDays },
    { href: "/competitors", label: "Competitors", icon: Users },
    { href: "/trends", label: "Trends", icon: TrendingUp },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <BrainCircuit size={20} />
            </div>
            CreatorOS AI
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location === item.href ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                <item.icon size={18} />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border border-primary/20">
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user?.plan || 'Free'} Plan</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-secondary"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topnav */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu size={20} />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search... (Ctrl+K)"
                className="pl-9 pr-4 py-2 bg-secondary border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-card"></span>
            </button>
            <Avatar className="h-8 w-8 cursor-pointer md:hidden">
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      
      <CommandPalette />
    </div>
  );
}