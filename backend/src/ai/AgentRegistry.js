/**
 * AgentRegistry
 * Maps agent names to agent class instances.
 * Import this instead of importing agents directly.
 *
 * Agents NEVER know which provider is used — the registry + orchestrator handle that.
 */

import { AnalyticsAgent } from './agents/AnalyticsAgent.js';
import { ContentAgent } from './agents/ContentAgent.js';
import { TrendAgent } from './agents/TrendAgent.js';
import { CompetitorAgent } from './agents/CompetitorAgent.js';
import { GrowthCoachAgent } from './agents/GrowthCoachAgent.js';

const AGENTS = {
  analytics: new AnalyticsAgent(),
  content: new ContentAgent(),
  trend: new TrendAgent(),
  competitor: new CompetitorAgent(),
  growthCoach: new GrowthCoachAgent(),
};

export const AgentRegistry = {
  /**
   * Get an agent by name.
   * @param {string} name
   * @returns {object}
   */
  get(name) {
    const agent = AGENTS[name];
    if (!agent) throw new Error(`AgentRegistry: unknown agent "${name}"`);
    return agent;
  },

  /**
   * List all registered agent names.
   * @returns {string[]}
   */
  list() {
    return Object.keys(AGENTS);
  },

  /**
   * Check whether a given agent name exists.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return Object.prototype.hasOwnProperty.call(AGENTS, name);
  },
};
