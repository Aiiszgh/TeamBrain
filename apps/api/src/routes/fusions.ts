import { Router, Response, NextFunction } from 'express';
import { Fusion, TeamMembership, ProjectMembership, Project } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// POST /fusions/:id/confirm
router.post(
  '/fusions/:id/confirm',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const fusion = await Fusion.findById(id);
      if (!fusion) {
        throw new AppError('FUSION_NOT_FOUND', 'Fusion record not found', 404);
      }

      // Check permissions: project owner/admin or team owner/admin
      const teamMember = await TeamMembership.findOne({
        teamId: fusion.teamId,
        userId: req.user!._id,
      });

      if (!teamMember) {
        throw new AppError('FORBIDDEN', 'Not a member of the team', 403);
      }

      let hasPermission = teamMember.role === 'owner' || teamMember.role === 'admin';

      if (!hasPermission && fusion.projectId) {
        const projectMember = await ProjectMembership.findOne({
          projectId: fusion.projectId,
          userId: req.user!._id,
        });
        if (projectMember && (projectMember.role === 'owner' || projectMember.role === 'admin')) {
          hasPermission = true;
        }
      }

      if (!hasPermission) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions to confirm fusion', 403);
      }

      fusion.status = 'confirmed';
      await fusion.save();

      res.status(200).json(fusion.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

export default router;
