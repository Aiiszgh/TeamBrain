import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import teamsRoutes from './routes/teams.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import conversationsRoutes from './routes/conversations.js';
import memoriesRoutes from './routes/memories.js';
import fusionsRoutes from './routes/fusions.js';
import aiRoutes from './routes/ai.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());
  app.use('/api', apiRateLimiter);

  // Mount API endpoints
  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', teamsRoutes);
  app.use('/api', projectsRoutes);
  app.use('/api', tasksRoutes);
  app.use('/api', conversationsRoutes);
  app.use('/api', memoriesRoutes);
  app.use('/api', fusionsRoutes);
  app.use('/api', aiRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
