import { Router } from "express";

const router = Router();

router.get("/content/ideas", (_req, res) => {
  res.json([
    {
      id: "idea-1",
      title: "I Analyzed 1,000 Viral Posts — Here's What They All Have in Common",
      hook: "Every viral post follows one of 7 formulas. Here's the breakdown no one talks about...",
      format: "Carousel",
      expectedEngagement: "viral",
      difficulty: "medium",
      platform: "LinkedIn",
    },
    {
      id: "idea-2",
      title: "The 15-Minute Content System That Replaced My 4-Hour Workflow",
      hook: "I used to spend 4 hours creating one piece of content. Now it takes 15 minutes.",
      format: "Reel",
      expectedEngagement: "high",
      difficulty: "easy",
      platform: "TikTok",
    },
    {
      id: "idea-3",
      title: "Why Your 'Perfect' Post is Getting Zero Views",
      hook: "The post you spent 3 hours on is getting fewer views than the one you made in 10 minutes. Here's why.",
      format: "Short video",
      expectedEngagement: "high",
      difficulty: "easy",
      platform: "Instagram",
    },
    {
      id: "idea-4",
      title: "A Full Week of Content From One Core Idea (Template Included)",
      hook: "One idea. Seven platforms. Zero extra creativity required.",
      format: "Tutorial carousel",
      expectedEngagement: "high",
      difficulty: "medium",
      platform: "LinkedIn",
    },
    {
      id: "idea-5",
      title: "The AI Prompt That Generates My Content Calendar Every Month",
      hook: "I spent 3 weeks perfecting this prompt. You can steal it right now.",
      format: "Screenshot thread",
      expectedEngagement: "viral",
      difficulty: "easy",
      platform: "Twitter/X",
    },
    {
      id: "idea-6",
      title: "Stop Using These 10 Overused Hashtags (Use These Instead)",
      hook: "These hashtags are killing your reach. I switched to these 10 and my impressions tripled.",
      format: "Carousel",
      expectedEngagement: "medium",
      difficulty: "easy",
      platform: "Instagram",
    },
    {
      id: "idea-7",
      title: "My Brutally Honest Breakdown of My Last 90 Days of Content",
      hook: "What worked, what flopped, and what I'm never doing again.",
      format: "Long-form video",
      expectedEngagement: "high",
      difficulty: "hard",
      platform: "YouTube",
    },
    {
      id: "idea-8",
      title: "The Creator Economy is Changing — Are You Ready?",
      hook: "3 shifts happening right now that will separate thriving creators from struggling ones.",
      format: "Article",
      expectedEngagement: "medium",
      difficulty: "medium",
      platform: "LinkedIn",
    },
  ]);
});

const calendarItems = [
  {
    id: "cal-1",
    title: "AI Tools Carousel",
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split("T")[0],
    status: "published",
    platform: "LinkedIn",
    format: "Carousel",
  },
  {
    id: "cal-2",
    title: "Creator Mistakes Reel",
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split("T")[0],
    status: "published",
    platform: "TikTok",
    format: "Reel",
  },
  {
    id: "cal-3",
    title: "Content Strategy Article",
    date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split("T")[0],
    status: "draft",
    platform: "LinkedIn",
    format: "Article",
  },
  {
    id: "cal-4",
    title: "Growth Hack Tutorial",
    date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split("T")[0],
    status: "idea",
    platform: "Instagram",
    format: "Reel",
  },
  {
    id: "cal-5",
    title: "Setup Tour Video",
    date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split("T")[0],
    status: "idea",
    platform: "YouTube",
    format: "Long-form video",
  },
  {
    id: "cal-6",
    title: "Viral Post Analysis Thread",
    date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0],
    status: "idea",
    platform: "Twitter/X",
    format: "Thread",
  },
];

router.get("/content/calendar", (_req, res) => {
  res.json(calendarItems);
});

router.post("/content/calendar", (req, res) => {
  const { title, date, status, platform, format } = req.body;
  const newItem = {
    id: `cal-${Date.now()}`,
    title,
    date,
    status: status || "idea",
    platform,
    format,
  };
  calendarItems.push(newItem);
  res.status(201).json(newItem);
});

router.post("/content/analyze", (req, res) => {
  const text = (req.body.text as string) || "";
  const len = text.length;
  const hookScore = Math.min(100, Math.floor(40 + Math.min(len / 5, 40) + Math.random() * 10));
  const ctaScore = text.toLowerCase().includes("click") || text.toLowerCase().includes("follow") || text.toLowerCase().includes("share")
    ? Math.floor(75 + Math.random() * 20)
    : Math.floor(30 + Math.random() * 30);
  const engagementPotential = Math.floor((hookScore + ctaScore) / 2 + (Math.random() - 0.3) * 10);

  res.json({
    hookScore,
    ctaScore,
    engagementPotential: Math.min(100, engagementPotential),
    feedback: hookScore > 70
      ? "Strong hook with good emotional pull. Your opening line creates curiosity and sets clear expectations."
      : "Your hook could be stronger. Consider starting with a bold claim, a surprising statistic, or a counter-intuitive statement.",
    suggestions: [
      "Add a specific number or statistic to your opening line to increase credibility",
      "Include a direct question mid-content to prompt engagement",
      hookScore < 70 ? "Rewrite the first sentence to be more surprising or provocative" : "Your hook is solid — focus on strengthening the CTA",
      "End with a clear single call-to-action rather than multiple asks",
    ],
  });
});

export default router;
