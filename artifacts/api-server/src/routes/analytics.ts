import { Router } from "express";

const router = Router();

router.get("/analytics/metrics", (req, res) => {
  const platform = (req.query.platform as string) || "all";

  const platformMultipliers: Record<string, number> = {
    instagram: 0.3,
    youtube: 0.25,
    linkedin: 0.2,
    tiktok: 0.25,
    all: 1,
  };
  const m = platformMultipliers[platform] ?? 1;

  res.json({
    followers: Math.round(124500 * m),
    followersChange: 12.4,
    reach: Math.round(2100000 * m),
    reachChange: 8.2,
    engagement: parseFloat((4.7 * (platform === "tiktok" ? 1.4 : 1)).toFixed(1)),
    engagementChange: 0.3,
    impressions: Math.round(5800000 * m),
    impressionsChange: 15.1,
    watchTime: platform === "youtube" || platform === "all" ? 48200 : null,
    watchTimeChange: platform === "youtube" || platform === "all" ? 6.8 : null,
  });
});

router.get("/analytics/chart", (req, res) => {
  const days = 30;
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }

  const genSeries = (base: number, noise: number) =>
    Array.from({ length: days }, (_, i) =>
      parseFloat((base + i * (noise * 0.3) + (Math.random() - 0.4) * noise).toFixed(2))
    );

  res.json({
    labels,
    series: [
      { name: "Followers", data: genSeries(112000, 800) },
      { name: "Reach", data: genSeries(1800000, 30000) },
      { name: "Impressions", data: genSeries(4900000, 70000) },
    ],
  });
});

router.get("/analytics/content-performance", (_req, res) => {
  const types = ["video", "carousel", "image", "reel", "article"];
  const platforms = ["Instagram", "YouTube", "LinkedIn", "TikTok"];
  const posts = Array.from({ length: 12 }, (_, i) => ({
    id: `perf-${i + 1}`,
    title: [
      "How I Grew 10K Followers in 30 Days",
      "The Ultimate Content Strategy Framework",
      "Behind the Scenes: My Creative Process",
      "5 Tools Every Creator Needs in 2025",
      "Why Consistency Beats Virality",
      "My Biggest Content Mistakes (and Lessons)",
      "The Algorithm Doesn't Hate You",
      "From 0 to 100K: My Full Journey",
      "Content Batching: Work Smarter Not Harder",
      "Monetizing Your Audience Without Selling Out",
      "The Power of Niche Content",
      "How to Write Hooks That Stop the Scroll",
    ][i],
    type: types[i % types.length],
    platform: platforms[i % platforms.length],
    likes: Math.floor(Math.random() * 15000 + 500),
    comments: Math.floor(Math.random() * 1000 + 50),
    shares: Math.floor(Math.random() * 3000 + 100),
    score: parseFloat((Math.random() * 4 + 5).toFixed(1)),
    publishedAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  res.json(posts);
});

router.get("/analytics/platform-breakdown", (_req, res) => {
  res.json([
    { platform: "Instagram", percentage: 38, followers: 47310 },
    { platform: "TikTok", percentage: 28, followers: 34860 },
    { platform: "YouTube", percentage: 20, followers: 24900 },
    { platform: "LinkedIn", percentage: 14, followers: 17430 },
  ]);
});

export default router;
