/**
 * Retry utility — exponential backoff with jitter.
 *
 * Designed for external API calls that may transiently fail due to
 * network issues or rate limiting (HTTP 429).
 */

/**
 * @typedef {object} RetryOptions
 * @property {number}   [maxAttempts=3]     Maximum total attempts (1 = no retry)
 * @property {number}   [baseDelayMs=500]   Initial delay; doubles each attempt
 * @property {number}   [maxDelayMs=10000]  Cap on per-attempt delay
 * @property {Function} [shouldRetry]       (err) → boolean; defaults to always retry
 */

/**
 * Execute an async function with automatic retry on failure.
 *
 * @param {Function}     fn       Async function to execute
 * @param {RetryOptions} options
 * @returns {Promise<*>}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    shouldRetry = () => true,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts) break;
      if (!shouldRetry(err, attempt)) break;

      // Exponential backoff with ±20% jitter to avoid thundering herd
      const base = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = base * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.max(0, Math.round(base + jitter));

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * shouldRetry predicate: retry on network errors and HTTP 429 (rate limit).
 * Pass as the shouldRetry option to withRetry().
 */
export function retryOnNetworkOrRateLimit(err) {
  if (!err) return false;
  // Platform-tagged rate limit or network failure
  if (err.code === 'RATE_LIMIT' || err.code === 'NETWORK_ERROR') return true;
  // Generic transient codes
  if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(err.code)) return true;
  return false;
}
