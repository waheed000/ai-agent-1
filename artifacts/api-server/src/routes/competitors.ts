import { Router } from "express";

const router = Router();

const competitors = [
  {
    id: "comp-1",
    username: "@garyvee",
    platform: "Instagram",
    followers: 9200000,
    followersGrowth: 2.1,
    postingFrequency: 4.2,
    avatarUrl: null,
    addedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "comp-2",
    username: "@mkbhd",
    platform: "YouTube",
    followers: 18500000,
    followersGrowth: 1.4,
    postingFrequency: 1.5,
    avatarUrl: null,
    addedAt: "2025-06-15T00:00:00Z",
  },
  {
    id: "comp-3",
    username: "@naval",
    platform: "Twitter/X",
    followers: 2100000,
    followersGrowth: 0.8,
    postingFrequency: 3.0,
    avatarUrl: null,
    addedAt: "2025-07-01T00:00:00Z",
  },
];

router.get("/competitors", (_req, res) => {
  res.json(competitors);
});

router.post("/competitors", (req, res) => {
  const { username, platform } = req.body;
  const newComp = {
    id: `comp-${Date.now()}`,
    username,
    platform,
    followers: Math.floor(Math.random() * 500000 + 10000),
    followersGrowth: parseFloat((Math.random() * 5 + 0.5).toFixed(1)),
    postingFrequency: parseFloat((Math.random() * 5 + 1).toFixed(1)),
    avatarUrl: null,
    addedAt: new Date().toISOString(),
  };
  competitors.push(newComp);
  res.status(201).json(newComp);
});

router.get("/competitors/comparison", (req, res) => {
  const labels = ["Followers", "Engagement", "Reach", "Consistency", "Content Quality", "Growth Rate"];
  res.json({
    labels,
    you: [82, 91, 78, 78, 85, 88],
    competitor: [95, 76, 89, 65, 92, 72],
    competitorName: "@garyvee",
  });
});

router.get("/competitors/:id", (req, res) => {
  const competitor = competitors.find((c) => c.id === req.params.id);
  if (!competitor) return res.status(404).json({ error: "Not found" });

  res.json({
    ...competitor,
    bestPosts: [
      {
        id: "bp-1",
        title: "How I built a $50M brand from zero",
        platform: competitor.platform,
        type: "video",
        likes: 45200,
        comments: 3100,
        shares: 8900,
        engagementScore: 9.4,
        thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
        publishedAt: "2025-07-05T12:00:00Z",
      },
      {
        id: "bp-2",
        title: "The mindset shift that changed everything",
        platform: competitor.platform,
        type: "carousel",
        likes: 38700,
        comments: 2200,
        shares: 6100,
        engagementScore: 8.8,
        thumbnailUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop",
        publishedAt: "2025-07-01T10:00:00Z",
      },
    ],
    contentStrategy: [
      "Posts 4–5 times per day across all platforms",
      "Heavy focus on motivational short-form video",
      "Responds to comments within the first hour of posting",
      "Repurposes long-form content into micro-clips aggressively",
      "Uses storytelling over data — emotional resonance is the hook",
    ],
  });
});

router.delete("/competitors/:id", (req, res) => {
  const idx = competitors.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) competitors.splice(idx, 1);
  res.status(204).send();
});

export default router;
