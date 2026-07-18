/**
 * Centralized application configuration.
 *
 * All environment variables are read here and nowhere else.
 * Call sites use `config.<section>.<key>` — no `process.env` outside this file.
 *
 * Validation rules:
 *   - Production: required variables must be present and non-default.
 *   - Development: insecure defaults are allowed but emit a stderr warning.
 *   - Any environment: format constraints (e.g. ENCRYPTION_KEY length) are always enforced.
 */

import 'dotenv/config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const int = (value, fallback) => parseInt(value || String(fallback), 10);
const bool = (value, fallback) => (value !== undefined ? value === 'true' : fallback);

// ─── Environment detection ────────────────────────────────────────────────────

const NODE_ENV   = process.env.NODE_ENV || 'development';
const isProduction  = NODE_ENV === 'production';
const isDevelopment = !isProduction;

// ─── Validation ───────────────────────────────────────────────────────────────

const DEV_FALLBACKS = {
  JWT_SECRET:         'dev_jwt_secret_change_in_production',
  JWT_REFRESH_SECRET: 'dev_refresh_secret_change_in_production',
  ENCRYPTION_KEY:     'a'.repeat(64),
};

function validateEnvironment() {
  const errors   = [];
  const warnings = [];

  // Production-required variables
  if (isProduction) {
    const required = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
    ];
    for (const key of required) {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`);
      }
    }
  }

  // Insecure defaults — block in prod, warn in dev
  for (const [key, fallback] of Object.entries(DEV_FALLBACKS)) {
    const val = process.env[key];
    if (!val || val === fallback) {
      if (isProduction) {
        errors.push(`${key} must not use the development default value in production`);
      } else {
        warnings.push(
          `${key} is using an insecure development default — override it before deploying to production`,
        );
      }
    }
  }

  // ENCRYPTION_KEY format: 64-character hex string (32 bytes)
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey && encKey !== DEV_FALLBACKS.ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(encKey)) {
    errors.push(
      'ENCRYPTION_KEY must be a 64-character hex string. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  // PORT sanity check
  const port = int(process.env.PORT, 3000);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`PORT must be a number between 1 and 65535 (got: ${process.env.PORT})`);
  }

  if (errors.length > 0) {
    throw new Error(
      `[Config] Startup aborted — configuration errors:\n${errors.map(e => `  • ${e}`).join('\n')}`,
    );
  }

  if (warnings.length > 0 && process.env.SUPPRESS_CONFIG_WARNINGS !== 'true') {
    for (const w of warnings) {
      process.stderr.write(`[Config WARNING] ${w}\n`);
    }
  }
}

validateEnvironment();

// ─── Configuration object ─────────────────────────────────────────────────────

const config = {
  env:           NODE_ENV,
  isProduction,
  isDevelopment,

  server: {
    port:              int(process.env.PORT, 3000),
    bodyLimit:         process.env.BODY_LIMIT        || '10mb',
    trustProxy:        int(process.env.TRUST_PROXY,    1),
    shutdownTimeoutMs: int(process.env.SHUTDOWN_TIMEOUT_MS, 15_000),
  },

  db: {
    /** Null → use in-memory MongoDB (development only). */
    uri: process.env.MONGODB_URI || null,
    mongoose: {
      serverSelectionTimeoutMS: int(process.env.DB_SERVER_SELECTION_TIMEOUT_MS, 10_000),
      socketTimeoutMS:          int(process.env.DB_SOCKET_TIMEOUT_MS, 45_000),
    },
  },

  auth: {
    jwtSecret:           process.env.JWT_SECRET            || DEV_FALLBACKS.JWT_SECRET,
    jwtRefreshSecret:    process.env.JWT_REFRESH_SECRET     || DEV_FALLBACKS.JWT_REFRESH_SECRET,
    jwtExpiresIn:        process.env.JWT_EXPIRES_IN         || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptRounds:        int(process.env.BCRYPT_ROUNDS, 10),
  },

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  /** AES-256-GCM key. Must be a 64-character hex string (32 bytes). */
  encryption: {
    key: process.env.ENCRYPTION_KEY || DEV_FALLBACKS.ENCRYPTION_KEY,
  },

  redis: {
    host:               process.env.REDIS_HOST     || '127.0.0.1',
    port:               int(process.env.REDIS_PORT,  6379),
    password:           process.env.REDIS_PASSWORD  || undefined,
    db:                 int(process.env.REDIS_DB,    0),
    maxRetriesPerRequest: null, // required by BullMQ
  },

  /** Rate limiting windows and max request counts. */
  rateLimit: {
    general: {
      windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1_000),
      max:      int(process.env.RATE_LIMIT_MAX, 100),
    },
    auth: {
      windowMs: int(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1_000),
      max:      int(process.env.AUTH_RATE_LIMIT_MAX, 10),
    },
    ai: {
      windowMs: int(process.env.AI_RATE_LIMIT_WINDOW_MS, 60 * 1_000),
      max:      int(process.env.AI_RATE_LIMIT_MAX, 20),
    },
  },

  /** Cache TTLs in seconds, one per namespace. */
  cache: {
    ttl: {
      analytics:   int(process.env.CACHE_TTL_ANALYTICS,   3600),
      trends:      int(process.env.CACHE_TTL_TRENDS,       1800),
      competitors: int(process.env.CACHE_TTL_COMPETITORS,  1800),
      ai:          int(process.env.CACHE_TTL_AI,          86_400),
      general:     int(process.env.CACHE_TTL_GENERAL,      300),
    },
  },

  /** BullMQ queue / worker defaults. */
  queue: {
    concurrency:     int(process.env.QUEUE_CONCURRENCY, 2),
    defaultAttempts: int(process.env.QUEUE_DEFAULT_ATTEMPTS, 3),
    retryBaseMs:     int(process.env.QUEUE_RETRY_BASE_MS, 1_000),
    retryMaxMs:      int(process.env.QUEUE_RETRY_MAX_MS, 30_000),
    removeOnComplete: {
      count: int(process.env.QUEUE_RETAIN_COMPLETED,     100),
      age:   int(process.env.QUEUE_RETAIN_COMPLETED_AGE, 86_400),
    },
    removeOnFail: {
      count: int(process.env.QUEUE_RETAIN_FAILED,     200),
      age:   int(process.env.QUEUE_RETAIN_FAILED_AGE, 7 * 86_400),
    },
  },

  /** AI provider credentials and model defaults. */
  ai: {
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'gemini',
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model:  process.env.GEMINI_MODEL   || 'gemini-1.5-flash',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model:  process.env.OPENAI_MODEL   || 'gpt-4o-mini',
    },
  },

  /** OAuth provider credentials — all optional at startup. */
  oauth: {
    youtube: {
      clientId:     process.env.YOUTUBE_CLIENT_ID     || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri:  process.env.YOUTUBE_REDIRECT_URI  || '',
    },
    instagram: {
      clientId:     process.env.INSTAGRAM_CLIENT_ID     || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri:  process.env.INSTAGRAM_REDIRECT_URI  || '',
    },
    linkedin: {
      clientId:     process.env.LINKEDIN_CLIENT_ID     || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri:  process.env.LINKEDIN_REDIRECT_URI  || '',
    },
    tiktok: {
      clientId:     process.env.TIKTOK_CLIENT_ID     || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri:  process.env.TIKTOK_REDIRECT_URI  || '',
    },
    x: {
      clientId:     process.env.X_CLIENT_ID     || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri:  process.env.X_REDIRECT_URI  || '',
    },
  },
};

export default config;
