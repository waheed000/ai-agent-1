/**
 * Posting consistency calculations.
 * Measures how regularly a creator publishes content.
 */

const MS_PER_DAY = 86_400_000;

/**
 * Calculate posting frequency (posts per day) over a period.
 *
 * @param {Array<{publishedAt: Date}>} posts
 * @param {number} periodDays  length of the period in days
 * @returns {number}
 */
export function calcPostingFrequency(posts = [], periodDays = 30) {
  if (periodDays <= 0) return 0;
  return Math.round((posts.length / periodDays) * 100) / 100;
}

/**
 * Calculate content velocity — total posts published per week.
 *
 * @param {Array<{publishedAt: Date}>} posts  within a period
 * @param {number} periodDays
 * @returns {number}
 */
export function calcContentVelocity(posts = [], periodDays = 30) {
  if (periodDays <= 0) return 0;
  const weeks = periodDays / 7;
  return Math.round((posts.length / weeks) * 10) / 10;
}

/**
 * Calculate posting consistency score (0–100).
 *
 * Algorithm:
 * 1. Split the period into equal weekly buckets.
 * 2. Count posts per bucket.
 * 3. Score = 100 × (1 − coefficient_of_variation), floored at 0.
 *
 * A perfectly consistent creator (same posts every week) scores 100.
 * A creator who posted all posts in one week scores close to 0.
 *
 * @param {Array<{publishedAt: Date}>} posts
 * @param {Date}  startDate
 * @param {Date}  endDate
 * @returns {number}  0–100
 */
export function calcConsistencyScore(posts = [], startDate, endDate) {
  if (!startDate || !endDate || posts.length === 0) return 0;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const periodMs = end - start;
  if (periodMs <= 0) return 0;

  const BUCKET_MS = 7 * MS_PER_DAY; // one week
  const numBuckets = Math.max(1, Math.ceil(periodMs / BUCKET_MS));
  const buckets = new Array(numBuckets).fill(0);

  for (const post of posts) {
    const ts = new Date(post.publishedAt).getTime();
    if (ts < start || ts > end) continue;
    const bucketIdx = Math.min(Math.floor((ts - start) / BUCKET_MS), numBuckets - 1);
    buckets[bucketIdx] += 1;
  }

  const nonEmpty = buckets.filter((b) => b > 0);
  if (nonEmpty.length === 0) return 0;

  const mean = buckets.reduce((s, b) => s + b, 0) / numBuckets;
  if (mean === 0) return 0;

  const variance = buckets.reduce((s, b) => s + Math.pow(b - mean, 2), 0) / numBuckets;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation (0 = perfectly consistent)

  // Normalize to 0–100, where CV=0 → 100 and CV≥1 → 0
  const score = Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
  return score;
}

/**
 * Compute the gap (in days) between consecutive posts.
 *
 * @param {Array<{publishedAt: Date}>} posts  sorted ASC by publishedAt
 * @returns {{ avgGapDays: number, maxGapDays: number, minGapDays: number }}
 */
export function calcPostingGaps(posts = []) {
  if (posts.length < 2) return { avgGapDays: 0, maxGapDays: 0, minGapDays: 0 };

  const sorted = [...posts].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  const gaps = [];

  for (let i = 1; i < sorted.length; i++) {
    const gapMs = new Date(sorted[i].publishedAt) - new Date(sorted[i - 1].publishedAt);
    gaps.push(gapMs / MS_PER_DAY);
  }

  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  return {
    avgGapDays: Math.round(avg * 10) / 10,
    maxGapDays: Math.round(Math.max(...gaps) * 10) / 10,
    minGapDays: Math.round(Math.min(...gaps) * 10) / 10,
  };
}
