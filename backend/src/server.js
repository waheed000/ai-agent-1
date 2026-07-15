/**
 * Server entry point.
 * Connects to the database, starts the HTTP server, and wires up graceful shutdown.
 */

import app from './app.js';
import config from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import logger from './utils/logger.js';

let server;

async function start() {
  await connectDatabase();

  server = app.listen(config.server.port, () => {
    logger.info(`Server started`, {
      port: config.server.port,
      env: config.env,
      pid: process.pid,
    });
  });

  server.on('error', (err) => {
    logger.error('Server error', { error: err.message });
    process.exit(1);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  server?.close(async () => {
    logger.info('HTTP server closed');
    await disconnectDatabase();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 10 s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start();
