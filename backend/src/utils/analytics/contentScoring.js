/**
 * Content scoring utilities.
 * Produces a single score (0–100) for each post based on multiple signals.
 */

/**
 * Weights used in the overall content score.
 * Must sum to 1.0.
 */
const WEIGHTS = {
  engagementRate: 0.35,
  shareRatio: 0.20,
  commentRatio: 0.20,
  saveRatio: 0.15,
  reachScore: 0.10,
};

/**
 * Normalise a raw value into [0, 1] using min-max scaling.
 * Returns 0 if max === min.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * Score a single post relative to the entire post set.
 * Returns a value between 0 and 100.
 *
 * @param {object} post  - { engagement, engagementRate, ... }
 * @param {object} stats - precomputed stats from calcPostSetStats()
 * @returns {number}
 */
export function scorePost(post, stats) {
  const e = post.engagement || {};
  const followers = post.followerCount || stats.avgFollowers || 1;

  const engagementRate = post.engagementRate || 0;
  const shareRatio = followers > 0 ? (e.shares || 0) / followers : 0;
  const commentRatio = followers > 0 ? (e.comments || 0) / followers : 0;
  const saveRatio = followers > 0 ? (e.saves || 0) / followers : 0;
  const reachScore = followers > 0 ? Math.min(1, (e.reach || 0) / (followers * 5)) : 0;

  const normalised = {
    engagementRate: normalize(engagementRate, stats.min.engagementRate, stats.max.engagementRate),
    shareRatio: normalize(shareRatio, stats.min.shareRatio, stats.max.shareRatio),
    commentRatio: normalize(commentRatio, stats.min.commentRatio, stats.max.commentRatio),
    saveRatio: normalize(saveRatio, stats.min.saveRatio, stats.max.saveRatio),
    reachScore: normalize(reachScore, stats.min.reachScore, stats.max.reachScore),
  };

  const raw = Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (normalised[key] || 0) * weight,
    0
  );

  return Math.round(raw * 100);
}

/**
 * Compute per-signal min/max stats across a post set.
 * Pass the result to scorePost() for each post.
 *
 * @param {Array<object>} posts
 * @param {number} avgFollowers  fallback when post-level follower count is absent
 * @returns {object}
 */
export function calcPostSetStats(posts = [], avgFollowers = 1) {
  if (posts.length === 0) {
    const zero = { engagementRate: 0, shareRatio: 0, commentRatio: 0, saveRatio: 0, reachScore: 0 };
    return { min: zero, max: zero, avgFollowers };
  }

  const signals = posts.map((post) => {
    const e = post.engagement || {};
    const followers = post.followerCount || avgFollowers || 1;
    return {
      engagementRate: post.engagementRate || 0,
      shareRatio: (e.shares || 0) / followers,
      commentRatio: (e.comments || 0) / followers,
      saveRatio: (e.saves || 0) / followers,
      reachScore: Math.min(1, (e.reach || 0) / (followers * 5)),
    };
  });

  const keys = ['engagementRate', 'shareRatio', 'commentRatio', 'saveRatio', 'reachScore'];
  const min = {};
  const max = {};

  for (const key of keys) {
    const values = signals.map((s) => s[key]);
    min[key] = Math.min(...values);
    max[key] = Math.max(...values);
  }

  return { min, max, avgFollowers };
}

/**
 * Score and rank all posts in a set.
 * Returns posts sorted descending by score.
 *
 * @param {Array<object>} posts
 * @param {number} avgFollowers
 * @returns {Array<{post: object, score: number}>}
 */
export function rankPosts(posts = [], avgFollowers = 1) {
  if (posts.length === 0) return [];

  const stats = calcPostSetStats(posts, avgFollowers);
  return posts
    .map((post) => ({ post, score: scorePost(post, stats) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Identify the top and bottom performing posts in a set.
 *
 * @param {Array<object>} posts
 * @param {number} avgFollowers
 * @param {number} n  how many top/bottom to return
 * @returns {{ top: Array, bottom: Array }}
 */
export function identifyTopAndBottomContent(posts = [], avgFollowers = 1, n = 5) {
  if (posts.length === 0) return { top: [], bottom: [] };

  const ranked = rankPosts(posts, avgFollowers);
  return {
    top: ranked.slice(0, n),
    bottom: ranked.slice(-n).reverse(),
  };
}
