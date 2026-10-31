import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './errorHandler.js';
import {
  User,
  IUserDocument,
  TeamMembership,
  ITeamMembershipDocument,
  ProjectMembership,
  IProjectMembershipDocument,
  Project,
} from '../models/index.js';
import { TeamRole, ProjectRole } from '@teambrain/shared';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  teamMembership?: ITeamMembershipDocument;
  projectMembership?: IProjectMembershipDocument;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Authentication token required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Invalid bearer token', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User no longer exists', 401);
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('INVALID_TOKEN', 'Token is invalid or expired', 401));
      return;
    }
    next(error);
  }
}

export function requireTeamMember(allowedRoles?: TeamRole[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
      }

      const teamId =
        req.params.teamId ||
        req.body?.teamId ||
        (req.query.teamId as string | undefined);

      if (!teamId) {
        throw new AppError('MISSING_TEAM_ID', 'Team ID is required', 400);
      }

      const membership = await TeamMembership.findOne({
        teamId,
        userId: req.user._id,
      });

      if (!membership) {
        throw new AppError(
          'FORBIDDEN',
          'You are not a member of this team',
          403
        );
      }

      if (allowedRoles && !allowedRoles.includes(membership.role)) {
        throw new AppError(
          'FORBIDDEN',
          `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`,
          403
        );
      }

      req.teamMembership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireProjectMember(allowedRoles?: ProjectRole[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
      }

      const projectId =
        req.params.projectId ||
        req.params.id ||
        req.body?.projectId ||
        (req.query.projectId as string | undefined);

      if (!projectId) {
        throw new AppError('MISSING_PROJECT_ID', 'Project ID is required', 400);
      }

      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
      }

      // Check team membership first
      const teamMembership = await TeamMembership.findOne({
        teamId: project.teamId,
        userId: req.user._id,
      });

      if (!teamMembership) {
        throw new AppError('FORBIDDEN', 'You are not a member of this team', 403);
      }

      // Team owner and team admin automatically have access to all projects
      if (teamMembership.role === 'owner' || teamMembership.role === 'admin') {
        next();
        return;
      }

      // Check direct project membership
      const projectMembership = await ProjectMembership.findOne({
        projectId,
        userId: req.user._id,
      });

      if (!projectMembership) {
        throw new AppError(
          'FORBIDDEN',
          'You are not a member of this project',
          403
        );
      }

      if (allowedRoles && !allowedRoles.includes(projectMembership.role)) {
        throw new AppError(
          'FORBIDDEN',
          `Insufficient project permissions. Required: ${allowedRoles.join(' or ')}`,
          403
        );
      }

      req.projectMembership = projectMembership;
      next();
    } catch (error) {
      next(error);
    }
  };
}
