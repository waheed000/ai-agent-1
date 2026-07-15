import { Router } from "express";

const router = Router();

router.get("/dashboard/overview", (_req, res) => {
  res.json({
    followers: 124500,
    followersGrowth: 12.4,
    reach: 2100000,
    reachGrowth: 8.2,
    engagement: 4.7,
    engagementGrowth: 0.3,
    impressions: 5800000,
    impressionsGrowth: 15.1,
  });
});

router.get("/dashboard/growth-chart", (req, res) => {
  const period = (req.query.period as string) || "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const labels: string[] = [];
  const followers: number[] = [];
  const engagement: number[] = [];
  const reach: number[] = [];

  let baseFollowers = 112000;
  let baseEngagement = 3.8;
  let baseReach = 1800000;

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    baseFollowers += Math.floor(Math.random() * 500 + 100);
    baseEngagement = Math.min(7, baseEngagement + (Math.random() - 0.45) * 0.1);
    baseReach += Math.floor(Math.random() * 20000 + 5000);
    followers.push(baseFollowers);
    engagement.push(parseFloat(baseEngagement.toFixed(2)));
    reach.push(baseReach);
  }

  res.json({ labels, followers, engagement, reach });
});

router.get("/dashboard/ai-summary", (_req, res) => {
  res.json({
    headline: "Your engagement increased 24% this week because educational posts performed better.",
    detail: "Your audience responded strongly to long-form tutorials and how-to content. Videos posted on Tuesday and Thursday outperformed the weekly average by 2.3x. Carousel formats also showed a notable uptick in saves.",
    highlights: [
      "Educational posts had 3.1x higher engagement than promotional content",
      "Your best posting windows are 9–11am and 6–8pm in your audience's timezone",
      "Follower growth accelerated after your collaboration post on Wednesday",
    ],
  });
});

router.get("/dashboard/top-content", (_req, res) => {
  res.json([
    {
      id: "post-1",
      title: "10 AI Tools That Changed My Workflow in 2025",
      platform: "LinkedIn",
      type: "carousel",
      likes: 4821,
      comments: 342,
      shares: 1203,
      engagementScore: 9.2,
      thumbnailUrl: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=300&fit=crop",
      publishedAt: "2025-07-10T09:00:00Z",
    },
    {
      id: "post-2",
      title: "Why 99% of Creators Quit Before They See Results",
      platform: "TikTok",
      type: "video",
      likes: 28400,
      comments: 1890,
      shares: 6700,
      engagementScore: 8.7,
      thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=300&fit=crop",
      publishedAt: "2025-07-08T18:30:00Z",
    },
    {
      id: "post-3",
      title: "My Full Content Creation Setup for 2025",
      platform: "YouTube",
      type: "video",
      likes: 12300,
      comments: 890,
      shares: 445,
      engagementScore: 8.1,
      thumbnailUrl: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&h=300&fit=crop",
      publishedAt: "2025-07-06T14:00:00Z",
    },
    {
      id: "post-4",
      title: "5 Instagram Growth Hacks Nobody Talks About",
      platform: "Instagram",
      type: "carousel",
      likes: 7640,
      comments: 512,
      shares: 2100,
      engagementScore: 7.8,
      thumbnailUrl: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=300&fit=crop",
      publishedAt: "2025-07-04T11:00:00Z",
    },
  ]);
});

router.get("/dashboard/growth-score", (_req, res) => {
  res.json({
    score: 82,
    consistency: 78,
    engagement: 91,
    contentQuality: 85,
    trend: "up",
  });
});

export default router;
