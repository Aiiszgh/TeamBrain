import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { TeamMembership, ProjectMembership, Project } from '../models/index.js';

let ioInstance: SocketIOServer | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: config.webOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authenticate connection via JWT
  ioInstance.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket authentication token'));
    }
  });

  ioInstance.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    if (!userId) return;

    // Join personal user room for direct notifications
    socket.join(`user:${userId}`);

    // team:join(teamId, ack)
    socket.on(
      'team:join',
      async (teamId: string, ack?: (res: { success: boolean; error?: string }) => void) => {
        try {
          const membership = await TeamMembership.findOne({ teamId, userId });
          if (!membership) {
            ack?.({ success: false, error: 'Not a member of this team' });
            return;
          }
          socket.join(`team:${teamId}`);
          ack?.({ success: true });
        } catch (err: any) {
          ack?.({ success: false, error: err.message });
        }
      }
    );

    // project:join(projectId, ack)
    socket.on(
      'project:join',
      async (projectId: string, ack?: (res: { success: boolean; error?: string }) => void) => {
        try {
          const project = await Project.findById(projectId);
          if (!project) {
            ack?.({ success: false, error: 'Project not found' });
            return;
          }

          // Check if team owner/admin or direct project member
          const teamMember = await TeamMembership.findOne({
            teamId: project.teamId,
            userId,
          });

          if (!teamMember) {
            ack?.({ success: false, error: 'Not a member of parent team' });
            return;
          }

          if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
            const projectMember = await ProjectMembership.findOne({
              projectId,
              userId,
            });
            if (!projectMember) {
              ack?.({ success: false, error: 'Not a member of this project' });
              return;
            }
          }

          socket.join(`project:${projectId}`);
          ack?.({ success: true });
        } catch (err: any) {
          ack?.({ success: false, error: err.message });
        }
      }
    );

    // project:leave(projectId)
    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return ioInstance;
}

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}

export function removeUserFromTeamRooms(userId: string, teamId: string) {
  if (!ioInstance) return;
  ioInstance.in(`user:${userId}`).socketsLeave(`team:${teamId}`);
}

export function removeUserFromProjectRooms(userId: string, projectId: string) {
  if (!ioInstance) return;
  ioInstance.in(`user:${userId}`).socketsLeave(`project:${projectId}`);
}
