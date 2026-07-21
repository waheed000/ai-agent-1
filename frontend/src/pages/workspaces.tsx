import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi, type Workspace, type CreateWorkspaceInput } from '@/services/workspace-api';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Building2, CheckCircle2, MoreVertical, Pencil, Trash2,
  Loader2, AlertCircle, Users, RefreshCw
} from 'lucide-react';
import { Link } from 'wouter';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong.';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Create Workspace Dialog ──────────────────────────────────────────────────

function CreateWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setActiveWorkspace } = useWorkspace();
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkspaceInput) => workspaceApi.create(data),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspace(workspace);
      toast({ title: 'Workspace created', description: `"${workspace.name}" is ready.` });
      setName('');
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Failed to create workspace', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            A workspace groups your analytics, content, and team members together.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Brand, Agency Client A"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) createMutation.mutate({ name: name.trim() });
              }}
            />
          </div>
          {createMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle size={14} />
              <AlertDescription>{errMsg(createMutation.error)}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({ name: name.trim() })}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Workspace Dialog ────────────────────────────────────────────────────

function EditWorkspaceDialog({
  workspace, open, onClose,
}: { workspace: Workspace; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);

  const updateMutation = useMutation({
    mutationFn: () => workspaceApi.update(workspace._id, { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({ title: 'Workspace updated' });
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-ws-name">Workspace Name</Label>
            <Input
              id="edit-ws-name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
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
            disabled={!name.trim() || name.trim() === workspace.name || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [showEdit, setShowEdit] = useState(false);

  const isActive = activeWorkspace?._id === workspace._id;
  const isOwner = workspace.owner === user?.id;

  const deleteMutation = useMutation({
    mutationFn: () => workspaceApi.delete(workspace._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      if (isActive) setActiveWorkspace(null);
      toast({ title: 'Workspace deleted' });
    },
    onError: (err) => {
      toast({ title: 'Delete failed', description: errMsg(err), variant: 'destructive' });
    },
  });

  return (
    <>
      <Card className={`transition-all ${isActive ? 'border-primary ring-1 ring-primary/30' : 'hover:border-border/80'}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{workspace.name}</h3>
                  {isActive && (
                    <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs flex items-center gap-1">
                      <CheckCircle2 size={9} /> Active
                    </Badge>
                  )}
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">/{workspace.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isActive && (
                <Button variant="outline" size="sm" onClick={() => setActiveWorkspace(workspace)}>
                  Switch
                </Button>
              )}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical size={15} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEdit(true)}>
                      <Pencil size={14} className="mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/team`}>
                        <Users size={14} className="mr-2" /> Manage Team
                      </Link>
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={e => e.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{workspace.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the workspace and all associated data.
                            Team members will lose access. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users size={11} /> {workspace.members?.length ?? 0} member{workspace.members?.length !== 1 ? 's' : ''}
            </span>
            <span>Created {formatDate(workspace.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {showEdit && (
        <EditWorkspaceDialog workspace={workspace} open={showEdit} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacesPage() {
  const [showCreate, setShowCreate] = useState(false);

  const workspacesQ = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceApi.list(),
  });

  const workspaces = workspacesQ.data ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">Manage your workspaces and switch between them.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} className="mr-2" /> New Workspace
        </Button>
      </div>

      {workspacesQ.isError && (
        <Alert variant="destructive">
          <AlertCircle size={14} />
          <AlertDescription className="flex items-center justify-between">
            {errMsg(workspacesQ.error)}
            <Button variant="ghost" size="sm" onClick={() => workspacesQ.refetch()}>
              <RefreshCw size={12} className="mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {workspacesQ.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : workspaces.length === 0 && !workspacesQ.isError ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Building2 size={40} className="opacity-25" />
            <div className="text-center">
              <p className="font-medium">No workspaces yet</p>
              <p className="text-sm">Create your first workspace to organise your analytics and team.</p>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-2" /> Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workspaces.map(ws => (
            <WorkspaceCard key={ws._id} workspace={ws} />
          ))}
        </div>
      )}

      <CreateWorkspaceDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

