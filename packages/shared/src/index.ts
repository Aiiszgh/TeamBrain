export type TeamRole = 'owner' | 'admin' | 'member';
export type ProjectRole = 'owner' | 'admin' | 'member';

export interface IUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITeam {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ITeamMember {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
}

export interface IInvitation {
  id: string;
  teamId: string;
  role: 'admin' | 'member';
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  code?: string;
  createdAt?: string;
}

export type ProjectStatus = 'active' | 'archived';

export interface IProject {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectMember {
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface ITask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueAt?: string;
  createdById: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IConversation {
  id: string;
  userId: string;
  teamId: string;
  projectId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  memoryEnabled?: boolean;
  createdAt: string;
}

export type MemoryScope = 'personal' | 'team' | 'project';
export type MemoryStatus =
  | 'personal'
  | 'pending'
  | 'shared'
  | 'rejected'
  | 'archived'
  | 'superseded';
export type MemoryKind = 'fact' | 'decision' | 'preference' | 'note' | 'rule' | 'general';

export interface IMemory {
  id: string;
  ownerId: string;
  teamId: string;
  projectId?: string;
  content: string;
  kind: MemoryKind;
  scope: MemoryScope;
  status: MemoryStatus;
  importance?: number;
  confidence?: number;
  stage?: string;
  sourceMessageId?: string;
  supersededBy?: string;
  supersedes?: string;
  duplicateOf?: string;
  relatedMemoryIds?: string[];
  rejectionReason?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  similarity?: number;
}

export type MemoryEventType =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'corrected'
  | 'superseded'
  | 'archived'
  | 'deleted'
  | 'expired';

export interface IMemoryEvent {
  id: string;
  memoryId: string;
  actorId?: string;
  eventType: MemoryEventType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type FusionStatus = 'draft' | 'confirmed';

export interface IConflictGroup {
  topic?: string;
  memoryIds: string[];
  description: string;
}

export interface IFusion {
  id: string;
  projectId?: string;
  teamId: string;
  topic?: string;
  synthesis: string;
  status: FusionStatus;
  sourceMemoryIds: string[];
  conflictGroups?: IConflictGroup[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface IApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface IAuthResponse {
  token: string;
  user: IUser;
  team?: ITeam;
  memberships?: Array<{
    team: ITeam;
    role: TeamRole;
  }>;
}

export interface ISocketAck {
  success: boolean;
  error?: string;
}
