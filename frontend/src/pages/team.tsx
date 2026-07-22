import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi, type Workspace, type WorkspaceMember, type WorkspaceRole } from '@/services/workspace-api';
import { useWorkspace } from '@/context/workspace-context';
import { useAuthContext } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  UserPlus, Users, Shield, Pencil, UserMinus, Loader2, AlertCircle, RefreshCw, Building2
} from 'lucide-react';
import { Link } from 'wouter';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_BADGE_CLASS: Record<WorkspaceRole, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  viewer: 'bg-secondary text-muted-foreground',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

// ─── No Workspace Selected ────────────────────────────────────────────────────

function NoWorkspaceSelected() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
        <Building2 size={40} className="opacity-25" />
        <div className="text-center">
          <p className="font-medium">No workspace selected</p>
          <p className="text-sm">Select an active workspace to manage its team members.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/workspaces">Go to Workspaces</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Invite Member Dialog ─────────────────────────────────────────────────────

function InviteMemberDialog({
  workspaceId, open, onClose,
}: { workspaceId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('viewer');

  const inviteMutation = useMutation({
    mutationFn: () => workspaceApi.invite(workspaceId, userId.trim(), role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({ title: 'Member invited', description: 'They now have access to this workspace.' });
      setUserId('');
      setRole('viewer');
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Invite failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Enter the user ID of the member you'd like to add and choose their role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="member-id">User ID</Label>
            <Input
              id="member-id"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Enter member's user ID"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The user must already have a CreatorOS account. Ask them for their account ID
              found in their profile settings.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={v => setRole(v as WorkspaceRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                <SelectItem value="editor">Editor — can edit content</SelectItem>
                <SelectItem value="admin">Admin — full management access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {inviteMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(inviteMutation.error)}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!userId.trim() || inviteMutation.isPending}
          >
            {inviteMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Role Dialog ───────────────────────────────────────────────────────

function ChangeRoleDialog({
  workspaceId, member, open, onClose,
}: { workspaceId: string; member: WorkspaceMember; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<WorkspaceRole>(member.role === 'owner' ? 'admin' : member.role);

  const updateMutation = useMutation({
    mutationFn: () => workspaceApi.updateMember(workspaceId, member.user, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({ title: 'Role updated' });
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Failed to update role', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>Update this member's access level in the workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>New Role</Label>
            <Select value={role} onValueChange={v => setRole(v as WorkspaceRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {updateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(updateMutation.error)}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={role === member.role || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member, workspaceId, canManage, currentUserId, ownerId,
}: {
  member: WorkspaceMember;
  workspaceId: string;
  canManage: boolean;
  currentUserId: string;
  ownerId: string;
}) {
  const queryClient = useQueryClient();
  const [showChangeRole, setShowChangeRole] = useState(false);
  const isOwner = member.user === ownerId;
  const isSelf = member.user === currentUserId;

  const removeMutation = useMutation({
    mutationFn: () => workspaceApi.removeMember(workspaceId, member.user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({ title: 'Member removed' });
    },
    onError: (err) => {
      toast({ title: 'Failed to remove member', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
            {member.user.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground truncate max-w-[160px]" title={member.user}>
                {member.user}
              </span>
              {isSelf && <Badge variant="secondary" className="text-xs">You</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Joined {formatDate(member.joinedAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${ROLE_BADGE_CLASS[member.role]}`}>
            {isOwner && <Shield size={10} className="mr-1" />}
            {ROLE_LABELS[member.role]}
          </Badge>

          {canManage && !isOwner && !isSelf && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowChangeRole(true)}>
                <Pencil size={13} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <UserMinus size={13} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This person will immediately lose access to the workspace. You can re-invite them later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => removeMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {removeMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {showChangeRole && (
        <ChangeRoleDialog
          workspaceId={workspaceId}
          member={member}
          open={showChangeRole}
          onClose={() => setShowChangeRole(false)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuthContext();
  const [showInvite, setShowInvite] = useState(false);

  const membersQ = useQuery({
    queryKey: ['workspace-members', activeWorkspace?.id],
    queryFn: () => workspaceApi.getMembers(activeWorkspace!.id),
    enabled: !!activeWorkspace,
  });

  if (!activeWorkspace) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage members in your active workspace.</p>
        </div>
        <NoWorkspaceSelected />
      </div>
    );
  }

  const members = membersQ.data ?? [];
  const currentUserId = user?.id ?? '';
  const currentMember = members.find(m => m.user === currentUserId);
  const canManage =
    activeWorkspace.owner === currentUserId ||
    currentMember?.role === 'admin';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Members of <span className="font-medium text-foreground">{activeWorkspace.name}</span>
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus size={16} className="mr-2" /> Invite Member
          </Button>
        )}
      </div>

      {/* Role legend */}
      <Card className="bg-secondary/30 border-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Shield size={12} className="text-primary" /> <strong>Owner</strong> — full control, can delete workspace</div>
            <div><strong>Admin</strong> — manage members & settings</div>
            <div><strong>Editor</strong> — create & edit content</div>
            <div><strong>Viewer</strong> — read-only access</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} /> Members
                {!membersQ.isLoading && (
                  <span className="text-sm font-normal text-muted-foreground">({members.length})</span>
                )}
              </CardTitle>
              <CardDescription>People with access to this workspace</CardDescription>
            </div>
            {membersQ.isError && (
              <Button variant="ghost" size="sm" onClick={() => membersQ.refetch()}>
                <RefreshCw size={14} className="mr-1" /> Retry
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {membersQ.isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : membersQ.isError ? (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(membersQ.error)}</AlertDescription>
            </Alert>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users size={32} className="opacity-25 mb-2" />
              <p className="text-sm">No members found.</p>
            </div>
          ) : (
            members.map(member => (
              <MemberRow
                key={member.user}
                member={member}
                workspaceId={activeWorkspace.id}
                canManage={canManage}
                currentUserId={currentUserId}
                ownerId={activeWorkspace.owner}
              />
            ))
          )}
        </CardContent>
      </Card>

      {showInvite && (
        <InviteMemberDialog
          workspaceId={activeWorkspace.id}
          open={showInvite}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
