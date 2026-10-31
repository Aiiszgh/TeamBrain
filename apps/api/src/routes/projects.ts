import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  Project,
  ProjectMembership,
  TeamMembership,
  User,
  Task,
  Fusion,
  Memory,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  requireAuth,
  requireTeamMember,
  requireProjectMember,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { synthesizeMemories } from '../services/openai.js';
import { removeUserFromProjectRooms } from '../socket/socketHandler.js';
import { ProjectRole } from '@teambrain/shared';

const router = Router();

// GET /projects?teamId=...
router.get(
  '/projects',
  requireAuth,
  requireTeamMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = (req.query.teamId as string) || req.body?.teamId;
      const user = req.user!;
      const teamMember = req.teamMembership!;

      let projects;
      if (teamMember.role === 'owner' || teamMember.role === 'admin') {
        // Team owners/admins see all projects in team
        projects = await Project.find({ teamId, status: { $ne: 'archived' } });
      } else {
        // Regular members only see projects they belong to
        const memberships = await ProjectMembership.find({ userId: user._id });
        const projectIds = memberships.map((m) => m.projectId);
        projects = await Project.find({
          _id: { $in: projectIds },
          teamId,
          status: { $ne: 'archived' },
        });
      }

      res.status(200).json(projects.map((p) => p.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// POST /projects (Team owner/admin)
router.post(
  '/projects',
  requireAuth,
  requireTeamMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teamId, name, description } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Project name is required', 400);
      }

      const project = new Project({
        teamId: new Types.ObjectId(teamId),
        name: name.trim(),
        description: description?.trim(),
        ownerId: req.user!._id,
        status: 'active',
      });
      await project.save();

      // Creator becomes project owner
      const membership = new ProjectMembership({
        projectId: project._id,
        userId: req.user!._id,
        role: 'owner',
      });
      await membership.save();

      res.status(201).json(project.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /projects/:id (Project owner/admin)
router.patch(
  '/projects/:id',
  requireAuth,
  requireProjectMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, status } = req.body;

      const project = await Project.findById(id);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
      }

      if (name && typeof name === 'string') project.name = name.trim();
      if (description !== undefined) project.description = description?.trim();
      if (status && ['active', 'archived'].includes(status)) project.status = status;

      await project.save();
      res.status(200).json(project.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /projects/:id (Archive project)
router.delete(
  '/projects/:id',
  requireAuth,
  requireProjectMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const project = await Project.findById(id);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
      }

      project.status = 'archived';
      await project.save();

      res.status(200).json({ success: true, message: 'Project archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /projects/:id/members
router.get(
  '/projects/:id/members',
  requireAuth,
  requireProjectMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const memberships = await ProjectMembership.find({ projectId: req.params.id }).populate('userId');
      const members = memberships
        .filter((m) => m.userId)
        .map((m: any) => ({
          userId: m.userId._id.toString(),
          name: m.userId.name,
          email: m.userId.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        }));

      res.status(200).json(members);
    } catch (error) {
      next(error);
    }
  }
);

// POST /projects/:id/members (Assign existing team member)
router.post(
  '/projects/:id/members',
  requireAuth,
  requireProjectMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { email, role = 'member' } = req.body;

      if (!email || typeof email !== 'string') {
        throw new AppError('VALIDATION_ERROR', 'Email is required', 400);
      }
      if (!['admin', 'member'].includes(role)) {
        throw new AppError('VALIDATION_ERROR', 'Role must be admin or member', 400);
      }

      const project = await Project.findById(id);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new AppError('USER_NOT_FOUND', 'User not found', 404);
      }

      // Ensure user is in parent team
      const isTeamMember = await TeamMembership.findOne({
        teamId: project.teamId,
        userId: user._id,
      });
      if (!isTeamMember) {
        throw new AppError('FORBIDDEN', 'User must first be a member of the parent team', 400);
      }

      const existing = await ProjectMembership.findOne({
        projectId: id,
        userId: user._id,
      });
      if (existing) {
        throw new AppError('ALREADY_MEMBER', 'User is already a project member', 409);
      }

      const membership = new ProjectMembership({
        projectId: new Types.ObjectId(id),
        userId: user._id,
        role: role as ProjectRole,
      });
      await membership.save();

      res.status(201).json({
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /projects/:id/members/:userId
router.patch(
  '/projects/:id/members/:userId',
  requireAuth,
  requireProjectMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const userId = req.params.userId as string;
      const { role } = req.body;

      if (!['owner', 'admin', 'member'].includes(role)) {
        throw new AppError('VALIDATION_ERROR', 'Invalid role', 400);
      }

      const membership = await ProjectMembership.findOne({ projectId: id, userId });
      if (!membership) {
        throw new AppError('MEMBER_NOT_FOUND', 'Project member not found', 404);
      }

      membership.role = role as ProjectRole;
      await membership.save();

      res.status(200).json(membership.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /projects/:id/members/:userId
router.delete(
  '/projects/:id/members/:userId',
  requireAuth,
  requireProjectMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const userId = req.params.userId as string;
      await ProjectMembership.deleteOne({ projectId: id, userId });
      removeUserFromProjectRooms(userId, id);
      res.status(200).json({ success: true, message: 'Member removed from project' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /projects/:id/tasks
router.get(
  '/projects/:id/tasks',
  requireAuth,
  requireProjectMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tasks = await Task.find({ projectId: req.params.id }).sort({ createdAt: -1 });
      res.status(200).json(tasks.map((t) => t.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// POST /projects/:id/tasks
router.post(
  '/projects/:id/tasks',
  requireAuth,
  requireProjectMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { title, description, dueAt, assignedToId } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Task title is required', 400);
      }

      const task = new Task({
        projectId: new Types.ObjectId(id),
        title: title.trim(),
        description: description?.trim(),
        dueAt: dueAt ? new Date(dueAt) : undefined,
        assignedToId: assignedToId ? new Types.ObjectId(assignedToId) : undefined,
        createdById: req.user!._id,
        status: 'todo',
      });
      await task.save();

      res.status(201).json(task.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// GET /projects/:id/fusions
router.get(
  '/projects/:id/fusions',
  requireAuth,
  requireProjectMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fusions = await Fusion.find({ projectId: req.params.id }).sort({ createdAt: -1 });
      res.status(200).json(fusions.map((f) => f.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// POST /projects/:id/fuse
router.post(
  '/projects/:id/fuse',
  requireAuth,
  requireProjectMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { topic } = req.body;

      const project = await Project.findById(id);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
      }

      // Gather approved team and project memories
      const memories = await Memory.find({
        status: 'shared',
        $or: [
          { teamId: project.teamId, scope: 'team' },
          { projectId: project._id, scope: 'project' },
        ],
      }).limit(50);

      if (memories.length === 0) {
        throw new AppError('NO_MEMORIES', 'No shared memories found to synthesize', 400);
      }

      const memoryInputs = memories.map((m) => ({
        id: m._id.toString(),
        content: m.content,
        kind: m.kind,
      }));

      const synthesisResult = await synthesizeMemories(memoryInputs, topic);

      const sourceObjectIds = synthesisResult.citedSourceIds
        .filter((cid) => Types.ObjectId.isValid(cid))
        .map((cid) => new Types.ObjectId(cid));

      const conflictGroupsFormatted = synthesisResult.conflictGroups.map((cg) => ({
        topic: cg.topic,
        description: cg.description,
        memoryIds: cg.memoryIds
          .filter((mid) => Types.ObjectId.isValid(mid))
          .map((mid) => new Types.ObjectId(mid)),
      }));

      const fusion = new Fusion({
        projectId: project._id,
        teamId: project.teamId,
        topic: topic?.trim(),
        synthesis: synthesisResult.synthesis,
        status: 'draft',
        sourceMemoryIds: sourceObjectIds,
        conflictGroups: conflictGroupsFormatted,
        createdById: req.user!._id,
      });
      await fusion.save();

      res.status(201).json(fusion.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

export default router;
