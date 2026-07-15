import { Router } from "express";

const router = Router();

router.get("/insights/growth-analysis", (_req, res) => {
  res.json({
    problems: [
      "Engagement rate dropped 18% on Thursdays — your posting time conflicts with peak competitor activity",
      "Short-form video content is underperforming relative to your audience size",
      "You haven't posted on LinkedIn in 9 days — momentum is stalling",
      "Hashtag reach has declined 23% — overused tags are reducing discoverability",
    ],
    recommendations: [
      "Shift Thursday posts to 7–9am before competitor content floods the feed",
      "Experiment with 15–30 second reels focused on a single actionable tip",
      "Resume LinkedIn posting at least 3x per week — your audience there has the highest CPM potential",
      "Rotate to niche hashtags under 500K uses for 40% of your tag strategy",
      "Add a question in every caption — posts with questions receive 2.1x more comments",
    ],
    urgency: "medium",
  });
});

router.get("/insights/content-agent", (_req, res) => {
  res.json({
    weaknesses: [
      "Your hooks are too generic — starting with 'Have you ever...' reduces first-swipe retention",
      "CTAs are buried at the end of captions where engagement has already dropped off",
      "You're not leveraging trending audio on TikTok — your sound choices are 3–5 days behind the curve",
      "Carousel slides 4–6 have high drop-off — content is too text-heavy mid-way through",
    ],
    suggestions: [
      "Start posts with a counter-intuitive statement: 'Most creators are wrong about X'",
      "Move your primary CTA to the second line of every caption for 40% more click-through",
      "Check TikTok trending sounds daily and draft content around the top 5 sounds in your niche",
      "Keep carousel slides to 1 idea per slide — use the visual to do the work, not the text",
      "Use power words in titles: 'secret', 'mistake', 'actually', 'finally' — they boost open rates",
    ],
    topFormats: ["Tutorial carousel", "Day-in-the-life vlog", "Tool review reel", "Myth-busting thread"],
  });
});

router.get("/insights/growth-coach", (_req, res) => {
  res.json({
    week: "Jul 14 – Jul 20, 2025",
    days: [
      {
        day: "Monday",
        task: "Publish a carousel: '7 Lessons from 7 Years of Building in Public'",
        format: "Carousel (7 slides)",
        rationale: "Monday morning audiences on LinkedIn are highly engaged — perfect for career-reflection content that drives saves and shares.",
      },
      {
        day: "Tuesday",
        task: "Record a 60-second TikTok using trending audio about your biggest creator mistake",
        format: "Short-form video",
        rationale: "Vulnerability-driven content with trending audio gets 4x more algorithmic push on Tuesday evenings.",
      },
      {
        day: "Wednesday",
        task: "Write and publish a long-form LinkedIn article on your content process",
        format: "Article",
        rationale: "Mid-week is peak LinkedIn reading time. Long-form establishes authority and attracts higher-quality followers.",
      },
      {
        day: "Thursday",
        task: "Post an Instagram reel: quick tutorial showing a tool or hack",
        format: "Reel (30s)",
        rationale: "Tutorial reels on Instagram consistently outperform other formats in your niche — high save rates boost ranking.",
      },
      {
        day: "Friday",
        task: "Go live or post a behind-the-scenes story showing your workspace/setup",
        format: "Stories / Live",
        rationale: "Friday authenticity content builds parasocial connection — followers who engage with BTS content have 3x higher retention.",
      },
      {
        day: "Saturday",
        task: "Engage: reply to every comment from this week's posts, DM new followers",
        format: "Engagement sprint",
        rationale: "Dedicated engagement time signals active account status to algorithms and deepens community loyalty.",
      },
    ],
  });
});

export default router;
