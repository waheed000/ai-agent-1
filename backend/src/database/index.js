/**
 * Database initialization layer.
 * Callers never know whether they are connected to Atlas or an in-memory server —
 * the abstraction is fully contained here.
 *
 * Strategy:
 *   MONGODB_URI is set  → connect to Atlas (or any external MongoDB)
 *   MONGODB_URI is unset → spin up mongodb-memory-server automatically
 */

import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

let memoryServer = null; // holds the MongoMemoryServer instance when used

const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
};

/** Resolve the connection URI — starts in-memory server if needed. */
async function resolveUri() {
  if (config.db.uri) {
    logger.info('Database: using external MongoDB URI');
    return config.db.uri;
  }

  logger.info('Database: MONGODB_URI not set — starting in-memory MongoDB');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  logger.info('Database: in-memory MongoDB started', { uri });
  return uri;
}

/** Connect to MongoDB. Should be called once at application startup. */
export async function connectDatabase() {
  try {
    const uri = await resolveUri();
    await mongoose.connect(uri, MONGOOSE_OPTIONS);
    logger.info('Database: connection established', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Database: connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database: disconnected');
    });
  } catch (err) {
    logger.error('Database: failed to connect', { error: err.message });
    throw new DatabaseError(`Could not connect to MongoDB: ${err.message}`);
  }
}

/** Gracefully close the connection (and stop the memory server if used). */
export async function disconnectDatabase() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    logger.info('Database: in-memory MongoDB stopped');
  }
  logger.info('Database: connection closed');
}

/** Return the current Mongoose connection state as a readable string. */
export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    status: states[mongoose.connection.readyState] ?? 'unknown',
    isMemory: memoryServer !== null,
  };
}
