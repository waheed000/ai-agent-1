/**
 * Express application factory.
 * Configures the app without binding a port — keeps testing straightforward.
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config/index.js';
import logger from './utils/logger.js';
import { generalLimiter } from './shared/middleware/rateLimiter.js';
import notFound from './shared/middleware/notFound.js';
import errorHandler from './shared/middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin:         config.cors.clientUrl,
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Performance ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Request logging ─────────────────────────────────────────────────────────
app.use(
  morgan(config.isProduction ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip:   (req) => req.url === '/api/v1/health',
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));
app.use(cookieParser());

// ─── Proxy trust ──────────────────────────────────────────────────────────────
app.set('trust proxy', config.server.trustProxy);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
