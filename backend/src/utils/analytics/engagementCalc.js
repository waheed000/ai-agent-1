/**
 * Engagement calculation utilities.
 * All calculations are deterministic and based solely on stored data.
 */

/**
 * Calculate engagement rate for a post.
 * Rate = (likes + comments + shares + saves) / followers * 100
 * Falls back to reach-based calculation if followers are 0.
 *
 * @param {object} engagement  - { likes, comments, shares, saves, views, reach }
 * @param {number} followers   - account follower count at time of post
 * @returns {number}  percentage, rounded to 2 decimal places
 */
export function calcPostEngagementRate(engagement = {}, followers = 0) {
  const { likes = 0, comments = 0, shares = 0, saves = 0, reach = 0 } = engagement;
  const interactions = likes + comments + shares + saves;
  if (interactions === 0) return 0;

  const denominator = followers > 0 ? followers : reach;
  if (denominator === 0) return 0;

  return Math.round((interactions / denominator) * 10000) / 100;
}

/**
 * Calculate average engagement rate across multiple posts.
 *
 * @param {Array<{engagementRate: number}>} posts
 * @returns {number}
 */
export function calcAverageEngagementRate(posts = []) {
  if (posts.length === 0) return 0;
  const valid = posts.filter((p) => typeof p.engagementRate === 'number');
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, p) => acc + p.engagementRate, 0);
  return Math.round((sum / valid.length) * 100) / 100;
}

/**
 * Calculate total interactions for a set of engagement metrics.
 *
 * @param {object} engagement - { likes, comments, shares, saves, views, clicks }
 * @returns {number}
 */
export function calcTotalInteractions(engagement = {}) {
  const { likes = 0, comments = 0, shares = 0, saves = 0, clicks = 0 } = engagement;
  return likes + comments + shares + saves + clicks;
}

/**
 * Calculate average engagement per post for a period.
 *
 * @param {Array<object>} posts - posts with engagement sub-document
 * @returns {object}  { avgLikes, avgComments, avgShares, avgSaves, avgViews }
 */
export function calcAverageEngagementPerPost(posts = []) {
  if (posts.length === 0) {
    return { avgLikes: 0, avgComments: 0, avgShares: 0, avgSaves: 0, avgViews: 0 };
  }

  const totals = posts.reduce(
    (acc, p) => {
      const e = p.engagement || {};
      acc.likes += e.likes || 0;
      acc.comments += e.comments || 0;
      acc.shares += e.shares || 0;
      acc.saves += e.saves || 0;
      acc.views += e.views || 0;
      return acc;
    },
    { likes: 0, comments: 0, shares: 0, saves: 0, views: 0 }
  );

  const n = posts.length;
  return {
    avgLikes: Math.round(totals.likes / n),
    avgComments: Math.round(totals.comments / n),
    avgShares: Math.round(totals.shares / n),
    avgSaves: Math.round(totals.saves / n),
    avgViews: Math.round(totals.views / n),
  };
}

/**
 * Compute per-platform engagement summary.
 *
 * @param {Array<object>} posts - posts with platform and engagement
 * @returns {object}  platform → { totalInteractions, avgEngagementRate, postCount }
 */
export function calcEngagementByPlatform(posts = []) {
  const byPlatform = {};

  for (const post of posts) {
    const { platform, engagement = {}, engagementRate = 0 } = post;
    if (!platform) continue;

    if (!byPlatform[platform]) {
      byPlatform[platform] = { totalInteractions: 0, totalEngagementRate: 0, postCount: 0 };
    }

    byPlatform[platform].totalInteractions += calcTotalInteractions(engagement);
    byPlatform[platform].totalEngagementRate += engagementRate;
    byPlatform[platform].postCount += 1;
  }

  const result = {};
  for (const [platform, data] of Object.entries(byPlatform)) {
    result[platform] = {
      totalInteractions: data.totalInteractions,
      avgEngagementRate:
        data.postCount > 0
          ? Math.round((data.totalEngagementRate / data.postCount) * 100) / 100
          : 0,
      postCount: data.postCount,
    };
  }

  return result;
}
