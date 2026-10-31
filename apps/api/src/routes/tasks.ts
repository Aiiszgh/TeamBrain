import { Router, Response, NextFunction } from 'express';
import { Task, ProjectMembership, TeamMembership, Project } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// PATCH /tasks/:id
router.patch(
  '/tasks/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, description, status, dueAt, assignedToId } = req.body;

      const task = await Task.findById(id);
      if (!task) {
        throw new AppError('TASK_NOT_FOUND', 'Task not found', 404);
      }

      const project = await Project.findById(task.projectId);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Parent project not found', 404);
      }

      // Check user belongs to project or is team owner/admin
      const teamMember = await TeamMembership.findOne({
        teamId: project.teamId,
        userId: req.user!._id,
      });
      if (!teamMember) {
        throw new AppError('FORBIDDEN', 'Not a member of the team', 403);
      }

      if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
        const projectMember = await ProjectMembership.findOne({
          projectId: project._id,
          userId: req.user!._id,
        });
        if (!projectMember) {
          throw new AppError('FORBIDDEN', 'Not a member of this project', 403);
        }
      }

      if (title && typeof title === 'string') task.title = title.trim();
      if (description !== undefined) task.description = description?.trim();
      if (status && ['todo', 'in_progress', 'done'].includes(status)) task.status = status;
      if (dueAt !== undefined) task.dueAt = dueAt ? new Date(dueAt) : undefined;
      if (assignedToId !== undefined) task.assignedToId = assignedToId;

      await task.save();
      res.status(200).json(task.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /tasks/:id
router.delete(
  '/tasks/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const task = await Task.findById(id);
      if (!task) {
        throw new AppError('TASK_NOT_FOUND', 'Task not found', 404);
      }

      const project = await Project.findById(task.projectId);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Parent project not found', 404);
      }

      const teamMember = await TeamMembership.findOne({
        teamId: project.teamId,
        userId: req.user!._id,
      });

      const isTeamAdmin = teamMember && (teamMember.role === 'owner' || teamMember.role === 'admin');
      const isCreator = task.createdById.toString() === req.user!._id.toString();

      if (!isTeamAdmin && !isCreator) {
        throw new AppError('FORBIDDEN', 'Only the task creator or a team admin can delete this task', 403);
      }

      await Task.deleteOne({ _id: task._id });
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
