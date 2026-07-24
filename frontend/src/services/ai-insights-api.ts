import { apiClient } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StrategyPlanType = '7day' | '30day' | '90day';
export type StrategyStatus = 'generating' | 'ready' | 'failed';

export interface DayPlan {
  day: number;
  date: string;
  focus: string;
  actions: string[];
  contentSuggestion: string;
  platform: string;
  estimatedTime: string;
}

export interface GrowthExperiment {
  name: string;
  hypothesis: string;
  method: string;
  duration: string;
  successMetric: string;
  expectedLift: string;
}

export interface ChecklistItem {
  action: string;
  category: 'content' | 'engagement' | 'growth' | 'analytics' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  dueDay: number;
  completed: boolean;
}

export interface RiskItem {
  risk: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface TargetMetrics {
  followers?: string;
  engagementRate?: string;
  postsPerWeek?: number;
  competitorsTracked?: number;
  [key: string]: unknown;
}

/** A generated growth strategy. Backend returns Mongoose document → id (not _id). */
export interface Strategy {
  id: string;
  planType: StrategyPlanType;
  platforms: string[];
  title: string;
  overview?: string;
  dayPlan: DayPlan[];
  weeklyMilestones: string[];
  growthExperiments: GrowthExperiment[];
  actionChecklist: ChecklistItem[];
  riskAnalysis: RiskItem[];
  successProbability: number;
  primaryGoal?: string;
  targetMetrics?: TargetMetrics;
  status: StrategyStatus;
  generatedAt?: string;
  failReason?: string;
  createdAt: string;
}

export interface GenerateStrategyParams {
  planType?: StrategyPlanType;
  platform?: string;
}

export interface ListStrategiesParams {
  planType?: StrategyPlanType;
  status?: StrategyStatus;
  limit?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  );
  if (!entries.length) return '';
  return (
    '?' +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const aiInsightsApi = {
  /**
   * POST /strategy/generate — start async strategy generation.
   * Returns immediately with status: 'generating'. Poll GET /latest for completion.
   */
  generate: (params: GenerateStrategyParams = {}) =>
    apiClient.post<Strategy>('/strategy/generate', params),

  /** GET /strategy — list all strategies for the current user. */
  list: (params: ListStrategiesParams = {}) =>
    apiClient.get<Strategy[]>(
      `/strategy${buildQs(params as Record<string, string | number | undefined>)}`,
    ),

  /**
   * GET /strategy/latest — fetch the most recently generated strategy.
   * Returns 404 if no strategy exists yet.
   */
  getLatest: (planType?: StrategyPlanType) =>
    apiClient.get<Strategy>(
      `/strategy/latest${planType ? `?planType=${planType}` : ''}`,
    ),
};
