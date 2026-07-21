import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  user: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  owner: string;
  members: WorkspaceMember[];
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const workspaceApi = {
  list: () =>
    apiClient.get<Workspace[]>('/workspaces'),

  getById: (id: string) =>
    apiClient.get<Workspace>(`/workspaces/${id}`),

  create: (data: CreateWorkspaceInput) =>
    apiClient.post<Workspace>('/workspaces', data),

  update: (id: string, data: UpdateWorkspaceInput) =>
    apiClient.patch<Workspace>(`/workspaces/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<null>(`/workspaces/${id}`),

  getMembers: (id: string) =>
    apiClient.get<WorkspaceMember[]>(`/workspaces/${id}/members`),

  invite: (workspaceId: string, userId: string, role: WorkspaceRole) =>
    apiClient.post<Workspace>(`/workspaces/${workspaceId}/invite`, { userId, role }),

  updateMember: (workspaceId: string, userId: string, role: WorkspaceRole) =>
    apiClient.patch<Workspace>(`/workspaces/${workspaceId}/members/${userId}`, { role }),

  removeMember: (workspaceId: string, userId: string) =>
    apiClient.delete<null>(`/workspaces/${workspaceId}/members/${userId}`),
};
