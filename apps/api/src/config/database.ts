import mongoose from 'mongoose';
import { config } from './env.js';

// Disable command buffering so queries fail immediately with clear feedback when disconnected
mongoose.set('bufferCommands', false);

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error: any) {
    isConnected = false;
    console.warn(
      `MongoDB connection notice: Unable to connect to ${config.mongodbUri}. Please configure MONGODB_URI in .env with your MongoDB Atlas connection string.`
    );
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
