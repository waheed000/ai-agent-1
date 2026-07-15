/**
 * Express application factory.
 * This module configures the app but does NOT start the server.
 * Keeping app creation separate makes it easy to test without binding a port.
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config/index.js';
import logger from './utils/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: config.cors.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Performance ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Request logging ─────────────────────────────────────────────────────────
const morganFormat = config.isProduction ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
    skip: (req) => req.url === '/api/v1/health', // suppress noisy health pings
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Trust proxy (needed when deployed behind nginx / load balancer) ──────────
app.set('trust proxy', 1);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
