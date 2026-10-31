import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  Team,
  TeamMembership,
  User,
  Invitation,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, requireTeamMember, AuthenticatedRequest } from '../middleware/auth.js';
import { removeUserFromTeamRooms } from '../socket/socketHandler.js';
import { TeamRole } from '@teambrain/shared';

const router = Router();

// GET /teams - List caller memberships
router.get(
  '/teams',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const memberships = await TeamMembership.find({ userId: req.user!._id }).populate('teamId');
      const teams = memberships
        .filter((m) => m.teamId)
        .map((m: any) => ({
          ...m.teamId.toJSON(),
          role: m.role,
        }));
      res.status(200).json(teams);
    } catch (error) {
      next(error);
    }
  }
);

// POST /teams - Create new team, caller is owner
router.post(
  '/teams',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Team name is required', 400);
      }

      const team = new Team({ name: name.trim() });
      await team.save();

      const membership = new TeamMembership({
        teamId: team._id,
        userId: req.user!._id,
        role: 'owner',
      });
      await membership.save();

      res.status(201).json({
        ...team.toJSON(),
        role: 'owner',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /teams/join - Join team using invite code
router.post(
  '/teams/join',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        throw new AppError('VALIDATION_ERROR', 'Invitation code is required', 400);
      }

      const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
      const invitation = await Invitation.findOne({ codeHash });

      if (!invitation) {
        throw new AppError('INVALID_INVITE_CODE', 'Invitation code is invalid', 400);
      }
      if (invitation.expiresAt < new Date()) {
        throw new AppError('INVITE_EXPIRED', 'Invitation code has expired', 400);
      }
      if (invitation.usedCount >= invitation.maxUses) {
        throw new AppError('INVITE_MAX_USES', 'Invitation code has reached maximum uses', 400);
      }

      const existingMember = await TeamMembership.findOne({
        teamId: invitation.teamId,
        userId: req.user!._id,
      });

      if (existingMember) {
        res.status(200).json({
          message: 'Already a member of this team',
          membership: existingMember.toJSON(),
        });
        return;
      }

      invitation.usedCount += 1;
      await invitation.save();

      const membership = new TeamMembership({
        teamId: invitation.teamId,
        userId: req.user!._id,
        role: invitation.role,
      });
      await membership.save();

      const team = await Team.findById(invitation.teamId);

      res.status(200).json({
        team: team?.toJSON(),
        role: membership.role,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /teams/:teamId/members - List team members (Team member)
router.get(
  '/teams/:teamId/members',
  requireAuth,
  requireTeamMember(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const memberships = await TeamMembership.find({ teamId: req.params.teamId }).populate('userId');
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

// POST /teams/:teamId/members - Add existing user by email (Owner/Admin)
router.post(
  '/teams/:teamId/members',
  requireAuth,
  requireTeamMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, role = 'member' } = req.body;
      if (!email || typeof email !== 'string') {
        throw new AppError('VALIDATION_ERROR', 'Email is required', 400);
      }

      if (!['admin', 'member'].includes(role)) {
        throw new AppError('VALIDATION_ERROR', 'Role must be admin or member', 400);
      }

      const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
      if (!userToAdd) {
        throw new AppError('USER_NOT_FOUND', 'User with this email not found', 404);
      }

      const existing = await TeamMembership.findOne({
        teamId: req.params.teamId,
        userId: userToAdd._id,
      });
      if (existing) {
        throw new AppError('ALREADY_MEMBER', 'User is already a member of this team', 409);
      }

      const membership = new TeamMembership({
        teamId: req.params.teamId,
        userId: userToAdd._id,
        role: role as TeamRole,
      });
      await membership.save();

      res.status(201).json({
        userId: userToAdd._id.toString(),
        name: userToAdd.name,
        email: userToAdd.email,
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /teams/:teamId/members/:userId - Remove member (Owner/Admin)
router.delete(
  '/teams/:teamId/members/:userId',
  requireAuth,
  requireTeamMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = req.params.teamId as string;
      const userId = req.params.userId as string;

      const targetMembership = await TeamMembership.findOne({ teamId, userId });
      if (!targetMembership) {
        throw new AppError('MEMBER_NOT_FOUND', 'Membership not found', 404);
      }

      // Check if target is last owner
      if (targetMembership.role === 'owner') {
        const ownerCount = await TeamMembership.countDocuments({ teamId, role: 'owner' });
        if (ownerCount <= 1) {
          throw new AppError('LAST_OWNER', 'The last owner of a team cannot be removed', 400);
        }
      }

      await TeamMembership.deleteOne({ _id: targetMembership._id });
      removeUserFromTeamRooms(userId, teamId);

      res.status(200).json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /teams/:teamId/members/:userId - Change member role (Owner only)
router.patch(
  '/teams/:teamId/members/:userId',
  requireAuth,
  requireTeamMember(['owner']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = req.params.teamId as string;
      const userId = req.params.userId as string;
      const { role } = req.body;

      if (!['owner', 'admin', 'member'].includes(role)) {
        throw new AppError('VALIDATION_ERROR', 'Invalid role specified', 400);
      }

      const targetMembership = await TeamMembership.findOne({ teamId, userId });
      if (!targetMembership) {
        throw new AppError('MEMBER_NOT_FOUND', 'Membership not found', 404);
      }

      // If demoting an owner, ensure another owner exists
      if (targetMembership.role === 'owner' && role !== 'owner') {
        const ownerCount = await TeamMembership.countDocuments({ teamId, role: 'owner' });
        if (ownerCount <= 1) {
          throw new AppError('LAST_OWNER', 'Cannot demote the last owner of the team', 400);
        }
      }

      targetMembership.role = role as TeamRole;
      await targetMembership.save();

      res.status(200).json(targetMembership.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// POST /teams/:teamId/invitations - Create invitation code (Owner/Admin)
router.post(
  '/teams/:teamId/invitations',
  requireAuth,
  requireTeamMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = req.params.teamId as string;
      const { role = 'member', maxUses = 1, expiresInDays = 7 } = req.body;

      if (!['admin', 'member'].includes(role)) {
        throw new AppError('VALIDATION_ERROR', 'Invitation role must be admin or member', 400);
      }

      const rawCode = crypto.randomBytes(16).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 7));

      const invitation = new Invitation({
        teamId: new Types.ObjectId(teamId),
        codeHash,
        role,
        maxUses: Math.max(1, Number(maxUses) || 1),
        usedCount: 0,
        expiresAt,
        createdBy: req.user!._id,
      });
      await invitation.save();

      // Return the raw code once!
      res.status(201).json({
        id: invitation._id.toString(),
        teamId,
        code: rawCode,
        role: invitation.role,
        maxUses: invitation.maxUses,
        expiresAt: invitation.expiresAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
