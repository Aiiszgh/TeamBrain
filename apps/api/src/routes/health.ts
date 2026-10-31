import { Router, Request, Response } from 'express';
import { isDatabaseConnected } from '../config/database.js';

const router = Router();

// Liveness check: independent of database connectivity
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Readiness check: returns 503 until MongoDB is connected
router.get('/health', (_req: Request, res: Response) => {
  if (!isDatabaseConnected()) {
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is disconnected or initializing',
      },
    });
    return;
  }

  res.status(200).json({ status: 'ready', database: 'connected' });
});

export default router;
