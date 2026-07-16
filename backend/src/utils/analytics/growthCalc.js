/**
 * Growth calculation utilities.
 * Computes follower, reach, and impression growth from historical snapshots.
 */

/**
 * Calculate percentage growth between two values.
 * Returns null if baseline is 0 (growth is undefined).
 *
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}  percentage, rounded to 2 decimal places
 */
export function calcGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/**
 * Calculate net follower change over a period.
 *
 * @param {Array<{followers: number, date: Date}>} snapshots  sorted ASC by date
 * @returns {{ net: number, growthRate: number|null, startFollowers: number, endFollowers: number }}
 */
export function calcFollowerGrowth(snapshots = []) {
  if (snapshots.length < 2) {
    const end = snapshots[0]?.followers || 0;
    return { net: 0, growthRate: null, startFollowers: end, endFollowers: end };
  }

  const sorted = [...snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
  const startFollowers = sorted[0].followers;
  const endFollowers = sorted[sorted.length - 1].followers;
  const net = endFollowers - startFollowers;
  const growthRate = calcGrowthRate(endFollowers, startFollowers);

  return { net, growthRate, startFollowers, endFollowers };
}

/**
 * Compute the moving average of follower counts.
 * Useful for smoothing noisy time-series data.
 *
 * @param {Array<{followers: number, date: Date}>} snapshots  sorted ASC
 * @param {number} windowSize  number of days in the moving average window
 * @returns {Array<{date: Date, followers: number, movingAvg: number}>}
 */
export function calcMovingAverage(snapshots = [], windowSize = 7) {
  const sorted = [...snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));

  return sorted.map((snap, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = sorted.slice(start, i + 1);
    const movingAvg = Math.round(
      window.reduce((sum, s) => sum + s.followers, 0) / window.length
    );
    return { date: snap.date, followers: snap.followers, movingAvg };
  });
}

/**
 * Calculate daily deltas from follower snapshots.
 *
 * @param {Array<{followers: number, date: Date}>} snapshots  sorted ASC
 * @returns {Array<{date: Date, delta: number, deltaPercentage: number}>}
 */
export function calcDailyDeltas(snapshots = []) {
  const sorted = [...snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));

  return sorted.map((snap, i) => {
    if (i === 0) return { date: snap.date, delta: 0, deltaPercentage: 0 };
    const prev = sorted[i - 1];
    const delta = snap.followers - prev.followers;
    const deltaPercentage =
      prev.followers > 0 ? Math.round((delta / prev.followers) * 10000) / 100 : 0;
    return { date: snap.date, delta, deltaPercentage };
  });
}

/**
 * Aggregate reach and impressions growth across posts in a date range.
 *
 * @param {Array<object>} posts  posts with engagement.reach and engagement.impressions
 * @param {Array<object>} prevPosts  posts from the comparison period
 * @returns {{ reachGrowth: number|null, impressionsGrowth: number|null, totalReach: number, totalImpressions: number }}
 */
export function calcReachAndImpressionsGrowth(posts = [], prevPosts = []) {
  const sum = (arr, field) =>
    arr.reduce((acc, p) => acc + ((p.engagement || {})[field] || 0), 0);

  const totalReach = sum(posts, 'reach');
  const totalImpressions = sum(posts, 'impressions');
  const prevReach = sum(prevPosts, 'reach');
  const prevImpressions = sum(prevPosts, 'impressions');

  return {
    reachGrowth: calcGrowthRate(totalReach, prevReach),
    impressionsGrowth: calcGrowthRate(totalImpressions, prevImpressions),
    totalReach,
    totalImpressions,
  };
}
