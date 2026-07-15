import { Router } from "express";

const router = Router();

const reports = [
  {
    id: "rep-1",
    type: "weekly",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    period: "Jul 7 – Jul 13, 2025",
    downloadUrl: "#",
  },
  {
    id: "rep-2",
    type: "monthly",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    period: "June 2025",
    downloadUrl: "#",
  },
  {
    id: "rep-3",
    type: "weekly",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    period: "Jun 30 – Jul 6, 2025",
    downloadUrl: "#",
  },
];

const reportDetails: Record<string, object> = {
  "rep-1": {
    id: "rep-1",
    type: "weekly",
    period: "Jul 7 – Jul 13, 2025",
    createdAt: reports[0].createdAt,
    growthSummary: "This was your strongest week in the past 60 days. Follower growth accelerated to +3,240 new followers — 42% above your 30-day average. Engagement rate climbed to 5.1%, driven primarily by two carousel posts on LinkedIn and a reel on TikTok that received 28K views. Your reach expanded significantly on Thursday and Friday after the collaborative post gained traction in your network.",
    bestContent: [
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
    ],
    problems: [
      "Sunday posts consistently underperform — audience is less active, yet you're publishing your most effort-intensive content",
      "Instagram reel frequency dropped to 1x this week — momentum from previous week's spike was not sustained",
    ],
    recommendations: [
      "Move your highest-effort content from Sunday to Tuesday or Thursday based on your peak engagement data",
      "Post at least 3 reels per week on Instagram — consistency matters more than individual reel quality",
      "Double down on carousel formats that performed this week — your audience clearly responds to multi-slide educational content",
    ],
    downloadUrl: "#",
  },
};

router.get("/reports", (_req, res) => {
  res.json(reports);
});

router.post("/reports/generate", (req, res) => {
  const { type } = req.body;
  const now = new Date();
  const report = {
    id: `rep-${Date.now()}`,
    type: type || "weekly",
    createdAt: now.toISOString(),
    status: "generating",
    period: type === "monthly"
      ? now.toLocaleString("en-US", { month: "long", year: "numeric" })
      : `${new Date(now.getTime() - 7 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    downloadUrl: null,
  };
  reports.unshift(report);

  // Simulate report completion
  setTimeout(() => {
    report.status = "ready";
    report.downloadUrl = "#";
  }, 3000);

  res.status(201).json(report);
});

router.get("/reports/:id", (req, res) => {
  const detail = reportDetails[req.params.id];
  const report = reports.find((r) => r.id === req.params.id);
  if (!detail && !report) return res.status(404).json({ error: "Not found" });

  if (detail) return res.json(detail);

  // Generic detail for dynamically generated reports
  res.json({
    ...(report || {}),
    growthSummary: "Report is being generated. Check back shortly for the full analysis.",
    bestContent: [],
    problems: [],
    recommendations: [],
    downloadUrl: null,
  });
});

export default router;
