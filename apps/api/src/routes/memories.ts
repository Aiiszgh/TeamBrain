import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  Memory,
  MemoryEvent,
  TeamMembership,
  ProjectMembership,
  Project,
  Fusion,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  approveMemory,
  rejectMemory,
  createCorrection,
  logMemoryEvent,
} from '../services/memoryService.js';
import { searchMemoriesVector } from '../services/vectorSearch.js';
import {
  generateEmbedding,
  synthesizeMemories,
  isOpenAIConfigured,
} from '../services/openai.js';
import { getSocketServer } from '../socket/socketHandler.js';
import { MemoryScope } from '@teambrain/shared';

const router = Router();

// GET /memories
router.get(
  '/memories',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = (req.query.scope as MemoryScope) || 'personal';
      const teamId = req.query.teamId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const user = req.user!;

      if (scope === 'personal') {
        const memories = await Memory.find({
          ownerId: user._id,
          $or: [
            { scope: 'personal' },
            { status: { $in: ['pending', 'rejected', 'archived', 'superseded'] } },
          ],
        }).sort({
          createdAt: -1,
        });
        res.status(200).json(memories.map((m) => m.toJSON()));
        return;
      }

      if (!teamId) {
        throw new AppError('MISSING_TEAM_ID', 'teamId is required for team or project scope', 400);
      }

      const teamMember = await TeamMembership.findOne({ teamId, userId: user._id });
      if (!teamMember) {
        throw new AppError('FORBIDDEN', 'Not a member of this team', 403);
      }

      const isTeamAdmin = teamMember.role === 'owner' || teamMember.role === 'admin';

      if (scope === 'team') {
        let query: any = { teamId, scope: 'team' };
        if (!isTeamAdmin) {
          // Regular members see all shared memories plus their own pending/rejected submissions
          query = {
            teamId,
            scope: 'team',
            $or: [{ status: 'shared' }, { ownerId: user._id }],
          };
        }
        const memories = await Memory.find(query).sort({ createdAt: -1 });
        res.status(200).json(memories.map((m) => m.toJSON()));
        return;
      }

      if (scope === 'project') {
        if (!projectId) {
          throw new AppError('MISSING_PROJECT_ID', 'projectId is required for project scope', 400);
        }

        let isProjectAdmin = isTeamAdmin;
        if (!isProjectAdmin) {
          const projectMember = await ProjectMembership.findOne({
            projectId,
            userId: user._id,
          });
          if (!projectMember) {
            throw new AppError('FORBIDDEN', 'Not a member of this project', 403);
          }
          isProjectAdmin = projectMember.role === 'owner' || projectMember.role === 'admin';
        }

        let query: any = { teamId, projectId, scope: 'project' };
        if (!isProjectAdmin) {
          query = {
            teamId,
            projectId,
            scope: 'project',
            $or: [{ status: 'shared' }, { ownerId: user._id }],
          };
        }

        const memories = await Memory.find(query).sort({ createdAt: -1 });
        res.status(200).json(memories.map((m) => m.toJSON()));
        return;
      }

      throw new AppError('INVALID_SCOPE', 'Invalid memory scope requested', 400);
    } catch (error) {
      next(error);
    }
  }
);

// GET /memories/:id (Retrieve specific memory or fusion for citation inspection)
router.get(
  '/memories/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        throw new AppError('INVALID_ID', 'Invalid memory ID format', 400);
      }

      const memory = await Memory.findById(id).populate('ownerId', 'name email');
      if (memory) {
        const json: any = memory.toJSON();
        if (memory.ownerId && typeof memory.ownerId === 'object') {
          json.ownerName = (memory.ownerId as any).name;
          json.ownerEmail = (memory.ownerId as any).email;
        }
        res.status(200).json(json);
        return;
      }

      // Check if ID refers to a fusion record
      const fusion = await Fusion.findById(id).populate('createdById', 'name email');
      if (fusion) {
        const json: any = fusion.toJSON();
        res.status(200).json({
          id: json.id,
          content: json.synthesis,
          kind: 'fusion',
          scope: json.projectId ? 'project' : 'team',
          status: json.status,
          ownerName: (fusion.createdById as any)?.name || 'AI Knowledge Fusion',
          ownerEmail: (fusion.createdById as any)?.email,
          createdAt: json.createdAt,
          importance: 5,
          confidence: 1,
        });
        return;
      }

      throw new AppError('MEMORY_NOT_FOUND', 'Memory record not found', 404);
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories
router.post(
  '/memories',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        teamId,
        content,
        kind = 'general',
        scope = 'personal',
        projectId,
        stage,
        importance = 3,
        confidence = 1,
        expiresInDays,
      } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Memory content is required', 400);
      }
      if (!teamId) {
        throw new AppError('VALIDATION_ERROR', 'Team ID is required', 400);
      }

      const teamMember = await TeamMembership.findOne({ teamId, userId: req.user!._id });
      if (!teamMember) {
        throw new AppError('FORBIDDEN', 'Not a member of this team', 403);
      }

      if (scope === 'project') {
        if (!projectId) {
          throw new AppError('VALIDATION_ERROR', 'Project ID is required for project memories', 400);
        }
        const project = await Project.findById(projectId);
        if (!project || project.teamId.toString() !== teamId) {
          throw new AppError('PROJECT_NOT_FOUND', 'Project not found in this team', 404);
        }
      }

      let expiresAt: Date | undefined;
      if (expiresInDays && Number(expiresInDays) > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));
      }

      // Shared scopes enter review queue (status: 'pending'); personal scope stays private (status: 'personal')
      const status = scope === 'personal' ? 'personal' : 'pending';

      let embedding: number[] = [];
      // Personal memories get embedded right away so owner can search them
      if (status === 'personal' && isOpenAIConfigured()) {
        try {
          embedding = await generateEmbedding(content.trim());
        } catch (e) {
          console.warn('Embedding warning on personal memory creation:', e);
        }
      }

      const memory = new Memory({
        ownerId: req.user!._id,
        teamId: new Types.ObjectId(teamId),
        projectId: projectId ? new Types.ObjectId(projectId) : undefined,
        content: content.trim(),
        kind,
        scope,
        status,
        importance: Number(importance) || 3,
        confidence: Number(confidence) || 1,
        stage,
        expiresAt,
        embedding,
      });
      await memory.save();

      await logMemoryEvent(memory._id, 'created', req.user!._id);
      if (status === 'pending') {
        await logMemoryEvent(memory._id, 'submitted', req.user!._id);

        // Notify Socket.IO room about pending memory
        try {
          const io = getSocketServer();
          if (io) {
            const room =
              scope === 'project' && projectId ? `project:${projectId}` : `team:${teamId}`;
            io.to(room).emit('memory:pending', {
              memoryId: memory._id.toString(),
              scope,
              teamId,
              projectId,
            });
          }
        } catch (sErr) {
          console.warn('Socket notification error:', sErr);
        }
      }

      res.status(201).json(memory.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/:id/share (Submit private or rejected memory to review)
router.post(
  '/memories/:id/share',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { targetScope = 'team', projectId } = req.body;

      const memory = await Memory.findById(id);
      if (!memory) {
        throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
      }

      if (memory.ownerId.toString() !== req.user!._id.toString()) {
        throw new AppError('FORBIDDEN', 'Only the memory owner can submit it for sharing', 403);
      }

      if (!['team', 'project'].includes(targetScope)) {
        throw new AppError('VALIDATION_ERROR', 'Target scope must be team or project', 400);
      }

      if (targetScope === 'project' && !projectId && !memory.projectId) {
        throw new AppError('VALIDATION_ERROR', 'Project ID is required to share to a project', 400);
      }

      memory.scope = targetScope;
      if (projectId) memory.projectId = new Types.ObjectId(projectId);
      memory.status = 'pending';
      memory.rejectionReason = undefined;
      await memory.save();

      await logMemoryEvent(memory._id, 'submitted', req.user!._id, { targetScope });

      try {
        const io = getSocketServer();
        if (io) {
          const room =
            memory.scope === 'project' && memory.projectId
              ? `project:${memory.projectId.toString()}`
              : `team:${memory.teamId.toString()}`;
          io.to(room).emit('memory:pending', {
            memoryId: memory._id.toString(),
            scope: memory.scope,
            teamId: memory.teamId.toString(),
            projectId: memory.projectId?.toString(),
          });
        }
      } catch (sErr) {
        console.warn('Socket notification error:', sErr);
      }

      res.status(200).json(memory.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /memories/:id (Edit private memory or archive owned/shared memory)
router.patch(
  '/memories/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { content, importance, confidence, stage, status } = req.body;

      const memory = await Memory.findById(id);
      if (!memory) {
        throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
      }

      const teamMember = await TeamMembership.findOne({
        teamId: memory.teamId,
        userId: req.user!._id,
      });
      const isTeamAdmin = teamMember && (teamMember.role === 'owner' || teamMember.role === 'admin');
      const isOwner = memory.ownerId.toString() === req.user!._id.toString();

      if (!isOwner && !isTeamAdmin) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions to update this memory', 403);
      }

      // Archiving
      if (status === 'archived') {
        memory.status = 'archived';
        await memory.save();
        await logMemoryEvent(memory._id, 'archived', req.user!._id);
        res.status(200).json(memory.toJSON());
        return;
      }

      // Editing content (allowed on personal/pending or by owner)
      if (content && typeof content === 'string') {
        memory.content = content.trim();
        if (isOpenAIConfigured()) {
          try {
            memory.embedding = await generateEmbedding(memory.content);
          } catch (e) {
            console.warn('Embedding re-generation warning:', e);
          }
        }
      }
      if (importance !== undefined) memory.importance = Number(importance);
      if (confidence !== undefined) memory.confidence = Number(confidence);
      if (stage !== undefined) memory.stage = stage;

      await memory.save();
      res.status(200).json(memory.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/:id/correct (Create linked correction)
router.post(
  '/memories/:id/correct',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { content, importance } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Correction content is required', 400);
      }

      const correction = await createCorrection(id, req.user!._id.toString(), content.trim(), importance);
      res.status(201).json(correction.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/:id/approve (Admin/Owner)
router.post(
  '/memories/:id/approve',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const memory = await Memory.findById(id);
      if (!memory) {
        throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
      }

      const teamMember = await TeamMembership.findOne({
        teamId: memory.teamId,
        userId: req.user!._id,
      });
      if (!teamMember) {
        throw new AppError('FORBIDDEN', 'Not a member of the team', 403);
      }

      let isAuthorized = teamMember.role === 'owner' || teamMember.role === 'admin';

      if (!isAuthorized && memory.scope === 'project' && memory.projectId) {
        const projectMember = await ProjectMembership.findOne({
          projectId: memory.projectId,
          userId: req.user!._id,
        });
        if (projectMember && (projectMember.role === 'owner' || projectMember.role === 'admin')) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new AppError('FORBIDDEN', 'Only team or project administrators can approve memories', 403);
      }

      const approved = await approveMemory(id, req.user!._id.toString());
      res.status(200).json(approved.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/:id/reject (Admin/Owner)
router.post(
  '/memories/:id/reject',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;

      const memory = await Memory.findById(id);
      if (!memory) {
        throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
      }

      const teamMember = await TeamMembership.findOne({
        teamId: memory.teamId,
        userId: req.user!._id,
      });
      if (!teamMember) {
        throw new AppError('FORBIDDEN', 'Not a member of the team', 403);
      }

      let isAuthorized = teamMember.role === 'owner' || teamMember.role === 'admin';
      if (!isAuthorized && memory.scope === 'project' && memory.projectId) {
        const projectMember = await ProjectMembership.findOne({
          projectId: memory.projectId,
          userId: req.user!._id,
        });
        if (projectMember && (projectMember.role === 'owner' || projectMember.role === 'admin')) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new AppError('FORBIDDEN', 'Only administrators can reject memories', 403);
      }

      const rejected = await rejectMemory(id, req.user!._id.toString(), reason);
      res.status(200).json(rejected.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /memories/:id
router.delete(
  '/memories/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const memory = await Memory.findById(id);
      if (!memory) {
        throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
      }

      const teamMember = await TeamMembership.findOne({
        teamId: memory.teamId,
        userId: req.user!._id,
      });
      const isTeamAdmin = teamMember && (teamMember.role === 'owner' || teamMember.role === 'admin');
      const isOwner = memory.ownerId.toString() === req.user!._id.toString();

      if (!isOwner && !isTeamAdmin) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions to delete memory', 403);
      }

      await logMemoryEvent(memory._id, 'deleted', req.user!._id);
      await Memory.deleteOne({ _id: memory._id });

      res.status(200).json({ success: true, message: 'Memory deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /memories/:id/events (Audit trail)
router.get(
  '/memories/:id/events',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const memory = await Memory.findById(id);
      if (!memory) {
        throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
      }

      const events = await MemoryEvent.find({ memoryId: id })
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 });

      res.status(200).json(events.map((e) => e.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/search (Atlas Vector Search)
router.post(
  '/memories/search',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teamId, scope = 'team', projectId, query, limit = 10 } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Search query string is required', 400);
      }
      if (!teamId) {
        throw new AppError('VALIDATION_ERROR', 'Team ID is required', 400);
      }

      const queryVector = await generateEmbedding(query.trim());

      const results = await searchMemoriesVector({
        teamId,
        scope,
        userId: req.user!._id.toString(),
        projectId,
        queryVector,
        limit: Math.min(Number(limit) || 10, 50),
      });

      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/fuse
router.post(
  '/memories/fuse',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teamId, scope = 'team', projectId, topic } = req.body;
      if (!teamId) {
        throw new AppError('VALIDATION_ERROR', 'Team ID is required', 400);
      }

      const filter: any = { teamId, status: 'shared', scope };
      if (scope === 'project' && projectId) {
        filter.projectId = projectId;
      }

      const memories = await Memory.find(filter).limit(50);
      if (memories.length === 0) {
        throw new AppError('NO_MEMORIES', 'No shared memories found for fusion in this scope', 400);
      }

      const memoryInputs = memories.map((m) => ({
        id: m._id.toString(),
        content: m.content,
        kind: m.kind,
      }));

      const result = await synthesizeMemories(memoryInputs, topic);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /memories/resolve (Team owner/admin publishes definitive resolution superseding conflicting sources)
router.post(
  '/memories/resolve',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teamId, memoryIds, content, kind = 'decision' } = req.body;

      if (!teamId || !Array.isArray(memoryIds) || memoryIds.length === 0 || !content) {
        throw new AppError('VALIDATION_ERROR', 'teamId, memoryIds, and content are required', 400);
      }

      const teamMember = await TeamMembership.findOne({ teamId, userId: req.user!._id });
      if (!teamMember || (teamMember.role !== 'owner' && teamMember.role !== 'admin')) {
        throw new AppError('FORBIDDEN', 'Only team owners or admins can publish resolution memories', 403);
      }

      let embedding: number[] = [];
      if (isOpenAIConfigured()) {
        try {
          embedding = await generateEmbedding(content.trim());
        } catch (e) {
          console.warn('Embedding generation warning on resolve:', e);
        }
      }

      const resolutionMemory = new Memory({
        ownerId: req.user!._id,
        teamId: new Types.ObjectId(teamId),
        content: content.trim(),
        kind,
        scope: 'team',
        status: 'shared',
        importance: 5,
        confidence: 1,
        relatedMemoryIds: memoryIds.map((mid: string) => new Types.ObjectId(mid)),
        embedding,
      });
      await resolutionMemory.save();
      await logMemoryEvent(resolutionMemory._id, 'approved', req.user!._id, {
        resolutionFor: memoryIds,
      });

      // Mark conflicting source memories as superseded
      for (const mid of memoryIds) {
        const sourceMem = await Memory.findById(mid);
        if (sourceMem) {
          sourceMem.status = 'superseded';
          sourceMem.supersededBy = resolutionMemory._id as Types.ObjectId;
          await sourceMem.save();
          await logMemoryEvent(sourceMem._id, 'superseded', req.user!._id, {
            supersededBy: resolutionMemory._id.toString(),
          });
        }
      }

      try {
        const io = getSocketServer();
        if (io) {
          io.to(`team:${teamId}`).emit('memory:shared', resolutionMemory.toJSON());
        }
      } catch (err) {
        console.warn('Socket emit warning on resolve:', err);
      }

      res.status(201).json(resolutionMemory.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

export default router;
