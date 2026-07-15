/**
 * Logger utility — console-based now, drop-in replaceable with Winston/Pino.
 *
 * To swap to Winston: export the same { info, warn, error, debug } interface
 * from a new file and update this import path in a single place.
 */

import config from '../config/index.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[config.logging.level] ?? LEVELS.info;

const timestamp = () => new Date().toISOString();

const format = (level, message, meta) => {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
};

const logger = {
  error(message, meta = {}) {
    if (currentLevel >= LEVELS.error) {
      console.error(format('error', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (currentLevel >= LEVELS.warn) {
      console.warn(format('warn', message, meta));
    }
  },

  info(message, meta = {}) {
    if (currentLevel >= LEVELS.info) {
      console.info(format('info', message, meta));
    }
  },

  debug(message, meta = {}) {
    if (currentLevel >= LEVELS.debug) {
      console.debug(format('debug', message, meta));
    }
  },
};

export default logger;
