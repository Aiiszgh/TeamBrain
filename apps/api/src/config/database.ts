import mongoose from 'mongoose';
import { config } from './env.js';

// Disable command buffering so queries fail immediately with clear feedback when disconnected
mongoose.set('bufferCommands', false);

let retryTimer: NodeJS.Timeout | null = null;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('MongoDB connected successfully');
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  } catch (error: any) {
    console.warn(
      `MongoDB connection notice: Unable to connect to ${config.mongodbUri}. Retrying in 5 seconds...`
    );
    if (!retryTimer) {
      retryTimer = setInterval(() => {
        if (mongoose.connection.readyState !== 1) {
          connectDatabase().catch(() => {});
        } else if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 5000);
    }
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
