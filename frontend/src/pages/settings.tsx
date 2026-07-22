import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  AlertCircle, CheckCircle2, XCircle, RefreshCw, Loader2, Unplug
} from 'lucide-react';
import { SiInstagram, SiYoutube, SiTiktok } from 'react-icons/si';
import { Linkedin, Twitter } from 'lucide-react';
import { useAuthContext } from '@/context/auth-context';
import { authApi } from '@/lib/auth-api';
import { integrationsApi, SUPPORTED_PLATFORMS, type PlatformId, type ConnectedAccount } from '@/services/integrations-api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: SiInstagram,
  youtube: SiYoutube,
  tiktok: SiTiktok,
  linkedin: Linkedin,
  x: Twitter,
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuthContext();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [niche, setNiche] = useState(user?.niche ?? '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name, bio, niche }),
    onSuccess: (updated) => {
      updateUser(updated);
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw('');
      setNewPw('');
      toast({ title: 'Password changed', description: 'Your password has been updated.' });
    },
    onError: (err) => {
      toast({ title: 'Password change failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name, bio, and niche.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-secondary/50 border-border"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.email ?? ''}
                readOnly
                disabled
                className="bg-secondary/50 border-border opacity-60"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="bg-secondary/50 border-border"
              placeholder="A short bio about you"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="niche">Content Niche</Label>
            <Input
              id="niche"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="bg-secondary/50 border-border"
              placeholder="e.g. Tech, Fitness, Cooking…"
            />
          </div>
          <Button
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
            className="mt-2"
          >
            {profileMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Save Changes
          </Button>
          {profileMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(profileMutation.error)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Choose a strong password you don't use elsewhere.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPw">Current Password</Label>
            <Input
              id="currentPw"
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className="bg-secondary/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPw">New Password</Label>
            <Input
              id="newPw"
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="bg-secondary/50 border-border"
            />
          </div>
          <Button
            onClick={() => passwordMutation.mutate()}
            disabled={passwordMutation.isPending || !currentPw || !newPw}
            variant="outline"
          >
            {passwordMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Change Password
          </Button>
          {passwordMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(passwordMutation.error)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Connected Platforms Tab ──────────────────────────────────────────────────

function ConnectedAccountRow({ account }: { account: ConnectedAccount }) {
  const queryClient = useQueryClient();
  const Icon = PLATFORM_ICONS[account.platform] ?? null;

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnect(account.platform as PlatformId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({ title: `${account.platform} disconnected`, description: 'The account has been unlinked.' });
    },
    onError: (err) => {
      toast({ title: 'Disconnect failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => integrationsApi.triggerSync(account.platform as PlatformId),
    onSuccess: () => {
      toast({ title: 'Sync started', description: `Syncing ${account.platform} data…` });
    },
    onError: (err) => {
      toast({ title: 'Sync failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-secondary/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center border border-border">
          {Icon ? <Icon size={18} /> : <span className="text-xs capitalize">{account.platform[0]}</span>}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize">{account.platform}</span>
            {account.status === 'active' ? (
              <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/5 text-xs flex items-center gap-1">
                <CheckCircle2 size={9} /> Active
              </Badge>
            ) : account.status === 'error' ? (
              <Badge variant="outline" className="text-destructive border-destructive/30 text-xs flex items-center gap-1">
                <AlertCircle size={9} /> Error
              </Badge>
            ) : account.status === 'expired' ? (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">Expired</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">{account.status}</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
            {account.username && <span>@{account.username}</span>}
            {account.followerCount != null && <span>· {fmt(account.followerCount)} followers</span>}
            <span>· Synced {timeAgo(account.lastSyncedAt)}</span>
          </div>
          {account.syncError && (
            <p className="text-xs text-destructive mt-1">{account.syncError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          <span className="ml-1.5 hidden sm:inline">Sync</span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Unplug size={14} />
              <span className="ml-1.5 hidden sm:inline">Disconnect</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {account.platform}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your {account.platform} account from CreatorOS AI. Analytics data
                already collected will be retained, but new data won't sync until you reconnect.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnectMutation.mutate()}
                className="bg-destructive hover:bg-destructive/90"
              >
                {disconnectMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function PlatformRow({ platformId }: { platformId: PlatformId }) {
  const meta = SUPPORTED_PLATFORMS.find(p => p.id === platformId)!;
  const Icon = PLATFORM_ICONS[platformId];
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border border-dashed opacity-60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          {Icon ? <Icon size={18} /> : null}
        </div>
        <div>
          <div className="font-medium">{meta.label}</div>
          <div className="text-xs text-muted-foreground">Not connected</div>
        </div>
      </div>
      {/* OAuth connection is not yet implemented in the backend for any provider */}
      <Badge variant="secondary" className="text-xs text-muted-foreground">
        Coming Soon
      </Badge>
    </div>
  );
}

function ConnectedPlatformsTab() {
  const integrationsQ = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  });

  const connectedPlatformIds = new Set(
    (integrationsQ.data?.integrations ?? []).map(a => a.platform)
  );

  const unconnectedPlatforms = SUPPORTED_PLATFORMS
    .filter(p => !connectedPlatformIds.has(p.id))
    .map(p => p.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Integrations</CardTitle>
        <CardDescription>
          Connect your accounts to enable AI analytics and syncing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {integrationsQ.isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
        ) : integrationsQ.isError ? (
          <Alert variant="destructive">
            <AlertCircle size={14} />
            <AlertDescription>{errMsg(integrationsQ.error)}</AlertDescription>
          </Alert>
        ) : (
          <>
            {integrationsQ.data?.integrations?.map(account => (
              <ConnectedAccountRow key={account.id} account={account} />
            ))}
            {unconnectedPlatforms.map(id => (
              <PlatformRow key={id} platformId={id} />
            ))}
            {!integrationsQ.data?.integrations?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No accounts connected yet. Connect a platform above to start syncing data.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, connections, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start p-0 mb-6">
          {['profile', 'platforms', 'notifications'].map(t => (
            <TabsTrigger
              key={t}
              value={t}
              className="data-[state=active]:bg-card border border-transparent data-[state=active]:border-border rounded-md px-4 py-2 capitalize"
            >
              {t === 'platforms' ? 'Connected Platforms' : t.charAt(0).toUpperCase() + t.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="platforms">
          <ConnectedPlatformsTab />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-border">
              {[
                { label: 'Weekly Performance Reports', desc: 'A summary of your growth and top content every Monday.', defaultOn: true },
                { label: 'Viral Trend Alerts', desc: 'Instant notifications when a relevant trend spikes.', defaultOn: true },
                { label: 'Competitor Activity', desc: 'When tracked accounts post breakout content.', defaultOn: false },
                { label: 'Sync Errors', desc: 'Notify when a connected account fails to sync.', defaultOn: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between pt-4 first:pt-0">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-base font-medium">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.defaultOn} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
