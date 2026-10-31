import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Team, TeamMembership, Invitation } from '../models/index.js';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /auth/register
router.post(
  '/auth/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, teamName, inviteCode } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Name is required', 400);
      }
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new AppError('VALIDATION_ERROR', 'A valid email is required', 400);
      }
      if (!password || typeof password !== 'string' || password.length < 10) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Password must be at least 10 characters long',
          400
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        throw new AppError('EMAIL_EXISTS', 'An account with this email already exists', 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = new User({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      });
      await user.save();

      let activeTeam: any = null;

      if (inviteCode && typeof inviteCode === 'string') {
        const codeHash = crypto.createHash('sha256').update(inviteCode.trim()).digest('hex');
        const invitation = await Invitation.findOne({ codeHash });

        if (!invitation) {
          throw new AppError('INVALID_INVITE_CODE', 'Invitation code is invalid', 400);
        }
        if (invitation.expiresAt < new Date()) {
          throw new AppError('INVITE_EXPIRED', 'Invitation code has expired', 400);
        }
        if (invitation.usedCount >= invitation.maxUses) {
          throw new AppError('INVITE_MAX_USES', 'Invitation code has reached its usage limit', 400);
        }

        invitation.usedCount += 1;
        await invitation.save();

        const membership = new TeamMembership({
          teamId: invitation.teamId,
          userId: user._id,
          role: invitation.role,
        });
        await membership.save();

        activeTeam = await Team.findById(invitation.teamId);
      } else {
        // Create initial team where caller is owner
        const initialTeam = new Team({
          name: (teamName && typeof teamName === 'string' && teamName.trim()) || `${name.trim()}'s Team`,
        });
        await initialTeam.save();

        const membership = new TeamMembership({
          teamId: initialTeam._id,
          userId: user._id,
          role: 'owner',
        });
        await membership.save();

        activeTeam = initialTeam;
      }

      const token = jwt.sign({ userId: user._id.toString() }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      } as jwt.SignOptions);

      res.status(201).json({
        token,
        user: user.toJSON(),
        team: activeTeam ? activeTeam.toJSON() : null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/login
router.post(
  '/auth/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError('VALIDATION_ERROR', 'Email and password are required', 400);
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }

      const memberships = await TeamMembership.find({ userId: user._id }).populate('teamId');
      const formattedMemberships = memberships
        .filter((m) => m.teamId)
        .map((m: any) => ({
          team: m.teamId.toJSON(),
          role: m.role,
        }));

      const token = jwt.sign({ userId: user._id.toString() }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      } as jwt.SignOptions);

      res.status(200).json({
        token,
        user: user.toJSON(),
        memberships: formattedMemberships,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /auth/me
router.get(
  '/auth/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const memberships = await TeamMembership.find({ userId: user._id }).populate('teamId');
      const formattedMemberships = memberships
        .filter((m) => m.teamId)
        .map((m: any) => ({
          team: m.teamId.toJSON(),
          role: m.role,
        }));

      res.status(200).json({
        user: user.toJSON(),
        teams: formattedMemberships,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
