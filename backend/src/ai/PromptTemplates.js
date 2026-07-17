/**
 * PromptTemplates — all raw prompt templates in one place.
 *
 * Rules:
 * - Templates use {{VARIABLE}} placeholders.
 * - PromptBuilder fills in the placeholders — templates never format themselves.
 * - Each template has a system-prompt companion that shapes the AI persona.
 */

export const PROMPT_TEMPLATES = {

  // ─── Analytics Agent ──────────────────────────────────────────────────────

  analytics: {
    system: `You are an expert social media analytics interpreter. 
You receive pre-calculated metrics and translate them into clear, actionable language for creators.
You NEVER calculate metrics yourself. You interpret what the numbers mean.
Be concise, direct, and specific. Avoid generic advice.`,

    user: `Here are the analytics for {{CREATOR_HANDLE}} on {{PLATFORM}} for the period {{START_DATE}} to {{END_DATE}}:

ENGAGEMENT SUMMARY:
{{ENGAGEMENT_SUMMARY}}

FOLLOWER GROWTH:
{{GROWTH_SUMMARY}}

TOP CONTENT:
{{TOP_CONTENT}}

POSTING CONSISTENCY SCORE: {{CONSISTENCY_SCORE}}/100

Based on these metrics only, provide:
1. PERFORMANCE EXPLANATION (2-3 sentences explaining what the numbers mean)
2. STRENGTHS (3 bullet points — what is working well)
3. WEAKNESSES (3 bullet points — what needs improvement)
4. RECOMMENDATIONS (3 specific, actionable recommendations)

Format your response as JSON: { "explanation": "...", "strengths": [...], "weaknesses": [...], "recommendations": [...] }`,
  },

  // ─── Content Agent ────────────────────────────────────────────────────────

  content: {
    system: `You are a creative social media content strategist.
You generate original, platform-appropriate content ideas based on real performance data.
Your ideas are specific, trend-aware, and tied to the creator's audience demographics.
Never generate generic ideas. Always ground suggestions in the provided data.`,

    user: `Creator: {{CREATOR_HANDLE}} | Platform: {{PLATFORM}} | Niche: {{NICHE}}

RECENT TOP POSTS:
{{TOP_POSTS}}

AUDIENCE DEMOGRAPHICS:
{{AUDIENCE_DEMO}}

CURRENT ANALYTICS:
Avg engagement rate: {{AVG_ENGAGEMENT_RATE}}%
Best posting hours: {{BEST_HOURS}}
Best posting days: {{BEST_DAYS}}

Generate the following (all based on the data above):
1. CONTENT IDEAS (5 specific video/post concepts with brief descriptions)
2. CAPTION IDEAS (3 caption hooks optimised for engagement)
3. SERIES IDEAS (2 recurring series concepts that fit the creator's style)
4. POSTING IMPROVEMENTS (3 specific changes to improve performance)

Format as JSON: { "contentIdeas": [...], "captionIdeas": [...], "seriesIdeas": [...], "postingImprovements": [...] }`,
  },

  // ─── Trend Agent ──────────────────────────────────────────────────────────

  trend: {
    system: `You are a social media trend analyst.
You match trending data to a creator's niche and explain HOW they can capitalise on each trend.
You are specific and timely. You do not repeat the trend data — you interpret its relevance.`,

    user: `Creator niche: {{NICHE}} | Platform: {{PLATFORM}}

TRENDING NOW:
{{TREND_DATA}}

For this creator's niche specifically, provide:
1. RELEVANT TRENDING TOPICS (top 5 with a 1-sentence "how to use" for each)
2. TRENDING HASHTAGS (top 10 relevant to this niche)
3. TRENDING FORMATS (top 3 content formats gaining traction)
4. TREND ALERT (1 high-velocity trend the creator should act on THIS WEEK)

Format as JSON: { "relevantTopics": [...], "trendingHashtags": [...], "trendingFormats": [...], "trendAlert": "..." }`,
  },

  // ─── Competitor Agent ─────────────────────────────────────────────────────

  competitor: {
    system: `You are a competitive intelligence analyst for social media creators.
You analyse competitor performance to surface gaps and opportunities for the creator.
Be specific — name actual content topics, formats, and strategies.
Do not repeat the raw data. Interpret it.`,

    user: `Creator: {{CREATOR_HANDLE}} | Niche: {{NICHE}}

YOUR METRICS:
Avg engagement rate: {{MY_ENGAGEMENT}}%
Followers: {{MY_FOLLOWERS}}
Posts/week: {{MY_FREQUENCY}}

COMPETITOR ANALYSIS:
{{COMPETITOR_DATA}}

Provide:
1. CONTENT GAPS (topics competitors cover that this creator doesn't — top 5)
2. MISSED OPPORTUNITIES (formats/trends competitors capitalise on that this creator misses — top 3)
3. COMPETITIVE ADVANTAGES (areas where this creator leads — top 3)
4. STRATEGIC RECOMMENDATIONS (3 specific actions to close the gap)

Format as JSON: { "contentGaps": [...], "missedOpportunities": [...], "competitiveAdvantages": [...], "recommendations": [...] }`,
  },

  // ─── Growth Coach Agent ───────────────────────────────────────────────────

  growthCoach: {
    system: `You are an elite social media growth coach combining analytics, content, trends, and competitive intelligence.
You synthesise multiple data sources into a clear, prioritised growth plan.
Be decisive. Give specific actions with expected impact.
Every plan item must be actionable within the stated timeframe.`,

    user: `Creator: {{CREATOR_HANDLE}} | Platform: {{PLATFORM}} | Niche: {{NICHE}}

ANALYTICS INSIGHTS:
{{ANALYTICS_INSIGHTS}}

CONTENT INSIGHTS:
{{CONTENT_INSIGHTS}}

TREND INSIGHTS:
{{TREND_INSIGHTS}}

COMPETITOR INSIGHTS:
{{COMPETITOR_INSIGHTS}}

CURRENT PERFORMANCE:
{{PERFORMANCE_SUMMARY}}

Generate a complete growth strategy:
1. WEEKLY GROWTH PLAN (7 specific daily actions)
2. MONTHLY STRATEGY (4 week-by-week focus areas)
3. ACTION ITEMS (top 5 immediate actions, each with expected impact)
4. KPIs (5 metrics to track progress)
5. PRIORITY TASKS (top 3 highest-impact tasks ranked by ROI)

Format as JSON: { 
  "weeklyPlan": { "monday": "...", "tuesday": "...", ... },
  "monthlyStrategy": [{ "week": 1, "focus": "...", "actions": [...] }, ...],
  "actionItems": [{ "action": "...", "impact": "...", "timeline": "..." }, ...],
  "kpis": [{ "metric": "...", "target": "...", "timeframe": "..." }, ...],
  "priorityTasks": [{ "task": "...", "expectedImpact": "...", "effort": "low|medium|high" }, ...]
}`,
  },
};
