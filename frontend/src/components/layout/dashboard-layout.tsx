import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/context/workspace-context';
import { workspaceApi } from '@/services/workspace-api';
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
  Moon,
  Sun,
  Building2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommandPalette } from './command-palette';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();

  const workspacesQ = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceApi.list(),
    staleTime: 60_000,
  });

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analytics', icon: BarChart },
    { href: '/ai-insights', label: 'AI Insights', icon: BrainCircuit },
    { href: '/content', label: 'Content Strategy', icon: CalendarDays },
    { href: '/competitors', label: 'Competitors', icon: Users },
    { href: '/trends', label: 'Trends', icon: TrendingUp },
    { href: '/reports', label: 'Reports', icon: FileText },
  ];

  const bottomNavItems = [
    { href: '/workspaces', label: 'Workspaces', icon: Building2 },
    { href: '/team', label: 'Team', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <BrainCircuit size={20} />
            </div>
            CreatorOS AI
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="px-3 py-3 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors text-left">
                <Building2 size={15} className="text-muted-foreground shrink-0" />
                <span className="flex-1 truncate font-medium">
                  {activeWorkspace ? activeWorkspace.name : 'No workspace'}
                </span>
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspacesQ.data?.map(ws => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && (
                    <Check size={14} className="text-primary shrink-0 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
              {!workspacesQ.data?.length && (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  No workspaces yet
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/workspaces">
                  <Building2 size={14} className="mr-2" /> Manage Workspaces
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                  location === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </div>
            </Link>
          ))}

          <div className="pt-3 pb-1">
            <div className="px-3 py-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Workspace
            </div>
          </div>

          {bottomNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                  location === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 border border-primary/20">
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
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
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topnav */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search… (Ctrl+K)"
                className="pl-9 pr-4 py-2 bg-secondary border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeWorkspace && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs">
                <Building2 size={10} />
                {activeWorkspace.name}
              </Badge>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
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
