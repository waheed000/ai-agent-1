/**
 * Server entry point.
 * Connects to the database, initialises background job infrastructure,
 * starts the HTTP server, and wires up graceful shutdown.
 */

import app from './app.js';
import config from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import QueueService from './services/QueueService.js';
import { initScheduler } from './queues/scheduler.js';
import logger from './utils/logger.js';

let server;

async function start() {
  // 1. Database
  await connectDatabase();

  // 2. Background job system (Redis + BullMQ workers + cron)
  //    Failures are non-fatal — the HTTP server still starts.
  await QueueService.init();
  await initScheduler();

  // 3. HTTP server
  server = app.listen(config.server.port, () => {
    logger.info(`Server started`, {
      port: config.server.port,
      env: config.env,
      pid: process.pid,
      queuesEnabled: QueueService.enabled,
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
    await QueueService.shutdown();
    await disconnectDatabase();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 15 s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 15_000);
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
