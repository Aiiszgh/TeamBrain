import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Mongoose disconnection and buffering errors
  if (
    err?.name === 'MongooseError' ||
    err?.name === 'MongooseServerSelectionError' ||
    err?.message?.includes('buffering timed out') ||
    err?.message?.includes('before initial connection')
  ) {
    res.status(503).json({
      error: {
        code: 'DATABASE_DISCONNECTED',
        message:
          'MongoDB is disconnected. Please configure a valid MONGODB_URI in your .env file to connect to your Atlas cluster.',
      },
    });
    return;
  }

  // Handle Mongoose duplicate key errors
  if (err?.code === 11000) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY_ERROR',
        message: 'A resource with this key already exists',
        details: err.keyValue,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err?.name === 'ZodError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: err.errors,
      },
    });
    return;
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
}
