/**
 * Best posting time analysis.
 * Determines optimal hours and days based on historical post engagement.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Analyse posts by hour of day and rank hours by average engagement rate.
 *
 * @param {Array<{publishedAt: Date, engagementRate: number}>} posts
 * @returns {Array<{hour: number, avgEngagementRate: number, postCount: number}>}  sorted desc
 */
export function calcBestHours(posts = []) {
  const hourBuckets = {};

  for (const post of posts) {
    if (!post.publishedAt) continue;
    const hour = new Date(post.publishedAt).getUTCHours();
    if (!hourBuckets[hour]) hourBuckets[hour] = { totalRate: 0, count: 0 };
    hourBuckets[hour].totalRate += post.engagementRate || 0;
    hourBuckets[hour].count += 1;
  }

  return Object.entries(hourBuckets)
    .map(([hour, { totalRate, count }]) => ({
      hour: parseInt(hour, 10),
      avgEngagementRate: count > 0 ? Math.round((totalRate / count) * 100) / 100 : 0,
      postCount: count,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
}

/**
 * Analyse posts by day of week and rank days by average engagement rate.
 *
 * @param {Array<{publishedAt: Date, engagementRate: number}>} posts
 * @returns {Array<{day: number, dayName: string, avgEngagementRate: number, postCount: number}>}  sorted desc
 */
export function calcBestDays(posts = []) {
  const dayBuckets = {};

  for (const post of posts) {
    if (!post.publishedAt) continue;
    const day = new Date(post.publishedAt).getUTCDay();
    if (!dayBuckets[day]) dayBuckets[day] = { totalRate: 0, count: 0 };
    dayBuckets[day].totalRate += post.engagementRate || 0;
    dayBuckets[day].count += 1;
  }

  return Object.entries(dayBuckets)
    .map(([day, { totalRate, count }]) => ({
      day: parseInt(day, 10),
      dayName: DAYS[parseInt(day, 10)],
      avgEngagementRate: count > 0 ? Math.round((totalRate / count) * 100) / 100 : 0,
      postCount: count,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
}

/**
 * Build a 24×7 heatmap: average engagement rate per (hour, day) cell.
 *
 * @param {Array<{publishedAt: Date, engagementRate: number}>} posts
 * @returns {Array<{hour: number, day: number, dayName: string, avgEngagementRate: number, postCount: number}>}
 */
export function calcEngagementHeatmap(posts = []) {
  const grid = {};

  for (const post of posts) {
    if (!post.publishedAt) continue;
    const date = new Date(post.publishedAt);
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    const key = `${hour}-${day}`;

    if (!grid[key]) grid[key] = { hour, day, totalRate: 0, count: 0 };
    grid[key].totalRate += post.engagementRate || 0;
    grid[key].count += 1;
  }

  return Object.values(grid).map(({ hour, day, totalRate, count }) => ({
    hour,
    day,
    dayName: DAYS[day],
    avgEngagementRate: count > 0 ? Math.round((totalRate / count) * 100) / 100 : 0,
    postCount: count,
  }));
}

/**
 * Extract the top N best posting slots (hour+day combinations).
 *
 * @param {Array<object>} heatmap  output of calcEngagementHeatmap
 * @param {number} n
 * @returns {Array}
 */
export function topPostingSlots(heatmap = [], n = 5) {
  return [...heatmap]
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, n);
}
