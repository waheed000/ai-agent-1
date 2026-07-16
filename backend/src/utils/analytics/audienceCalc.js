/**
 * Audience analysis utilities.
 * Aggregates demographic and behavioral data across platforms.
 */

/**
 * Merge demographic distributions from multiple platforms.
 * Each distribution item: { label, value, percentage }
 *
 * @param {Array<Array<{label: string, value: number, percentage: number}>>} distributions
 * @returns {Array<{label: string, value: number, percentage: number}>}  sorted desc by value
 */
export function mergeDistributions(distributions = []) {
  const map = new Map();

  for (const dist of distributions) {
    for (const item of dist) {
      if (!item.label) continue;
      const existing = map.get(item.label) || { label: item.label, value: 0, percentage: 0, _count: 0 };
      existing.value += item.value || 0;
      existing._count += 1;
      map.set(item.label, existing);
    }
  }

  const merged = Array.from(map.values());
  const total = merged.reduce((s, m) => s + m.value, 0);

  return merged
    .map(({ label, value, _count }) => ({
      label,
      value,
      percentage: total > 0 ? Math.round((value / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculate audience growth rate across multiple snapshots.
 *
 * @param {Array<{totalFollowers: number, snapshotDate: Date}>} snapshots  sorted ASC
 * @returns {{ growthRate: number|null, net: number }}
 */
export function calcAudienceGrowthRate(snapshots = []) {
  if (snapshots.length < 2) return { growthRate: null, net: 0 };

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshotDate) - new Date(b.snapshotDate)
  );

  const start = sorted[0].totalFollowers;
  const end = sorted[sorted.length - 1].totalFollowers;
  const net = end - start;
  const growthRate =
    start > 0 ? Math.round(((end - start) / start) * 10000) / 100 : null;

  return { growthRate, net };
}

/**
 * Find the top N demographic items from a distribution.
 *
 * @param {Array<{label: string, value: number, percentage: number}>} distribution
 * @param {number} n
 * @returns {Array}
 */
export function topN(distribution = [], n = 5) {
  return [...distribution].sort((a, b) => b.value - a.value).slice(0, n);
}

/**
 * Calculate follower-to-following ratio.
 *
 * @param {number} followers
 * @param {number} following
 * @returns {number|null}
 */
export function calcFollowerRatio(followers = 0, following = 0) {
  if (following === 0) return null;
  return Math.round((followers / following) * 100) / 100;
}

/**
 * Aggregate total audience across multiple connected platforms.
 *
 * @param {Array<{platform: string, totalFollowers: number, totalFollowing: number}>} snapshots
 * @returns {{ totalFollowers: number, totalFollowing: number, byPlatform: object }}
 */
export function calcTotalAudience(snapshots = []) {
  let totalFollowers = 0;
  let totalFollowing = 0;
  const byPlatform = {};

  for (const snap of snapshots) {
    totalFollowers += snap.totalFollowers || 0;
    totalFollowing += snap.totalFollowing || 0;
    byPlatform[snap.platform] = {
      followers: snap.totalFollowers || 0,
      following: snap.totalFollowing || 0,
    };
  }

  return { totalFollowers, totalFollowing, byPlatform };
}
