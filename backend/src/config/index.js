import 'dotenv/config';

const REQUIRED_IN_PRODUCTION = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

function validateEnv() {
  if (process.env.NODE_ENV === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

validateEnv();

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },

  db: {
    uri: process.env.MONGODB_URI || null, // null → use in-memory server
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // AES-256-GCM key for encrypting stored OAuth tokens.
  // Must be a 64-character hex string (32 bytes).
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'a'.repeat(64), // dev fallback — MUST be overridden in production
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null, // required by BullMQ
  },

  // OAuth provider credentials — set via environment variables.
  // No provider is integrated yet; placeholders are here for Phase 5+.
  oauth: {
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: process.env.YOUTUBE_REDIRECT_URI || '',
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
    },
    tiktok: {
      clientId: process.env.TIKTOK_CLIENT_ID || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
    },
    x: {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || '',
    },
  },
};

export default config;
