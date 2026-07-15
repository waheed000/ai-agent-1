import { Router } from "express";

const router = Router();

const allTrends = [
  { id: "t-1", name: "AI Workflow Automation", category: "topics", popularity: 94, growthRate: 28.4, suggestedContent: "Create a tutorial showing how you automate your weekly content prep with AI tools", platform: "LinkedIn" },
  { id: "t-2", name: "#AICreator", category: "hashtags", popularity: 87, growthRate: 41.2, suggestedContent: "Share your AI-assisted content creation process with this trending tag", platform: "Instagram" },
  { id: "t-3", name: "creator economy 2025", category: "keywords", popularity: 82, growthRate: 19.7, suggestedContent: "Write a prediction post about where creator monetization is heading", platform: "LinkedIn" },
  { id: "t-4", name: "Faceless Content", category: "formats", popularity: 91, growthRate: 35.6, suggestedContent: "Test a faceless tutorial video — high growth format with low production overhead", platform: "TikTok" },
  { id: "t-5", name: "Build in Public", category: "topics", popularity: 78, growthRate: 15.3, suggestedContent: "Share a transparent revenue or growth update — authenticity drives massive engagement", platform: "Twitter/X" },
  { id: "t-6", name: "#ContentStrategy", category: "hashtags", popularity: 74, growthRate: 8.9, suggestedContent: "Post a behind-the-scenes breakdown of your monthly content planning process", platform: "LinkedIn" },
  { id: "t-7", name: "passive income creator", category: "keywords", popularity: 88, growthRate: 22.1, suggestedContent: "Create a carousel explaining your passive income streams as a creator", platform: "Instagram" },
  { id: "t-8", name: "Talking Head + B-Roll", category: "formats", popularity: 86, growthRate: 18.4, suggestedContent: "Upgrade a standard talking-head video with B-roll cutaways to match this trending style", platform: "YouTube" },
  { id: "t-9", name: "Personal Branding Tips", category: "topics", popularity: 71, growthRate: 11.2, suggestedContent: "Share the 3 decisions that defined your personal brand identity", platform: "LinkedIn" },
  { id: "t-10", name: "#DigitalNomad", category: "hashtags", popularity: 69, growthRate: 6.7, suggestedContent: "Show your remote work setup or a day-in-the-life in a new location", platform: "Instagram" },
  { id: "t-11", name: "newsletter monetization", category: "keywords", popularity: 76, growthRate: 31.8, suggestedContent: "Break down your newsletter revenue model — high interest from creators looking to diversify", platform: "Twitter/X" },
  { id: "t-12", name: "Lo-fi Aesthetic Reel", category: "formats", popularity: 83, growthRate: 24.5, suggestedContent: "Experiment with warm-toned, candid footage to match the lo-fi aesthetic dominating feeds", platform: "TikTok" },
];

router.get("/trends", (req, res) => {
  const category = req.query.category as string;
  if (category && category !== "all") {
    return res.json(allTrends.filter((t) => t.category === category));
  }
  res.json(allTrends);
});

export default router;
