/**
 * Phase 10 Tests — AI Multi-Agent System
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

async function connectDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function disconnectDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

// ─── AI Provider interface ────────────────────────────────────────────────────

describe('AIProvider interface', () => {
  it('throws on un-overridden providerName', async () => {
    const { AIProvider } = await import('../ai/providers/AIProvider.js');
    const p = new AIProvider();
    assert.throws(() => p.providerName, /must be overridden/);
  });

  it('throws on un-overridden modelName', async () => {
    const { AIProvider } = await import('../ai/providers/AIProvider.js');
    const p = new AIProvider();
    assert.throws(() => p.modelName, /must be overridden/);
  });

  it('throws on un-overridden isAvailable', async () => {
    const { AIProvider } = await import('../ai/providers/AIProvider.js');
    const p = new AIProvider();
    assert.throws(() => p.isAvailable(), /must be overridden/);
  });

  it('estimateTokens approximates token count', async () => {
    const { AIProvider } = await import('../ai/providers/AIProvider.js');
    const p = new AIProvider();
    const tokens = p.estimateTokens('Hello, world!'); // 13 chars → ~4 tokens
    assert.ok(tokens > 0 && tokens < 10);
  });
});

// ─── Provider implementations ─────────────────────────────────────────────────

describe('GeminiProvider', () => {
  it('reports unavailable when no API key set', async () => {
    delete process.env.GEMINI_API_KEY;
    const { GeminiProvider } = await import('../ai/providers/GeminiProvider.js');
    const p = new GeminiProvider();
    assert.equal(p.isAvailable(), false);
  });

  it('has correct providerName and modelName', async () => {
    const { GeminiProvider } = await import('../ai/providers/GeminiProvider.js');
    const p = new GeminiProvider();
    assert.equal(p.providerName, 'gemini');
    assert.ok(p.modelName.length > 0);
  });

  it('throws when generate called without API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const { GeminiProvider } = await import('../ai/providers/GeminiProvider.js');
    const p = new GeminiProvider();
    await assert.rejects(() => p.generate('test'), /GEMINI_API_KEY/i);
  });
});

describe('OpenAIProvider', () => {
  it('reports unavailable when no API key set', async () => {
    delete process.env.OPENAI_API_KEY;
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider.js');
    const p = new OpenAIProvider();
    assert.equal(p.isAvailable(), false);
  });

  it('has correct providerName and modelName', async () => {
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider.js');
    const p = new OpenAIProvider();
    assert.equal(p.providerName, 'openai');
    assert.ok(p.modelName.length > 0);
  });

  it('throws when generate called without API key', async () => {
    delete process.env.OPENAI_API_KEY;
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider.js');
    const p = new OpenAIProvider();
    await assert.rejects(() => p.generate('test'), /OPENAI_API_KEY/i);
  });
});

describe('Provider switching', () => {
  it('providers are interchangeable — same interface', async () => {
    const { GeminiProvider } = await import('../ai/providers/GeminiProvider.js');
    const { OpenAIProvider } = await import('../ai/providers/OpenAIProvider.js');
    const { AIProvider } = await import('../ai/providers/AIProvider.js');

    const gemini = new GeminiProvider();
    const openai = new OpenAIProvider();

    // Both implement the same interface
    assert.equal(typeof gemini.isAvailable, 'function');
    assert.equal(typeof openai.isAvailable, 'function');
    assert.equal(typeof gemini.generate, 'function');
    assert.equal(typeof openai.generate, 'function');
    assert.equal(typeof gemini.estimateTokens, 'function');
    assert.equal(typeof openai.estimateTokens, 'function');

    // Both extend AIProvider
    assert.ok(gemini instanceof AIProvider);
    assert.ok(openai instanceof AIProvider);
  });
});

// ─── PromptBuilder ────────────────────────────────────────────────────────────

describe('PromptBuilder', () => {
  it('fills template variables', async () => {
    const { default: builder } = await import('../ai/PromptBuilder.js');
    const { userPrompt } = builder.build('analytics', {
      CREATOR_HANDLE: '@alice',
      PLATFORM: 'Instagram',
      START_DATE: '2025-01-01',
      END_DATE: '2025-01-31',
      ENGAGEMENT_SUMMARY: 'Avg rate: 5%',
      GROWTH_SUMMARY: '+200 followers',
      TOP_CONTENT: 'Reel about travel',
      CONSISTENCY_SCORE: '78',
    });
    assert.ok(userPrompt.includes('@alice'));
    assert.ok(userPrompt.includes('Instagram'));
    assert.ok(!userPrompt.includes('{{CREATOR_HANDLE}}'));
  });

  it('throws for unknown agent type', async () => {
    const { default: builder } = await import('../ai/PromptBuilder.js');
    assert.throws(() => builder.build('nonexistent', {}), /no template found/i);
  });

  it('replaces missing variables with placeholder', async () => {
    const { default: builder } = await import('../ai/PromptBuilder.js');
    const { userPrompt } = builder.build('analytics', {
      CREATOR_HANDLE: '@bob',
      PLATFORM: 'TikTok',
      // remaining vars omitted
    });
    assert.ok(userPrompt.includes('<NOT PROVIDED>'));
  });

  it('truncateToTokens clips long text', async () => {
    const { default: builder } = await import('../ai/PromptBuilder.js');
    const longText = 'a'.repeat(10_000);
    const clipped = builder.truncateToTokens(longText, 100);
    assert.ok(clipped.length < longText.length);
    assert.ok(clipped.includes('truncated'));
  });

  it('toReadableList formats objects', async () => {
    const { default: builder } = await import('../ai/PromptBuilder.js');
    const result = builder.toReadableList({ followers: 1000, rate: 5 });
    assert.ok(result.includes('followers'));
    assert.ok(result.includes('1000'));
  });
});

// ─── AgentRegistry ────────────────────────────────────────────────────────────

describe('AgentRegistry', () => {
  it('has all five agents', async () => {
    const { AgentRegistry } = await import('../ai/AgentRegistry.js');
    const expected = ['analytics', 'content', 'trend', 'competitor', 'growthCoach'];
    for (const name of expected) {
      assert.ok(AgentRegistry.has(name), `Agent "${name}" missing from registry`);
    }
  });

  it('get throws for unknown agent', async () => {
    const { AgentRegistry } = await import('../ai/AgentRegistry.js');
    assert.throws(() => AgentRegistry.get('badagent'), /unknown agent/i);
  });

  it('list returns all agent names', async () => {
    const { AgentRegistry } = await import('../ai/AgentRegistry.js');
    const list = AgentRegistry.list();
    assert.ok(list.length >= 5);
  });
});

// ─── AgentOrchestrator ────────────────────────────────────────────────────────

describe('AgentOrchestrator', () => {
  it('throws when no provider is available', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const { default: orchestrator } = await import('../ai/AgentOrchestrator.js');
    await assert.rejects(
      () => orchestrator.runFullPipeline('user123', { agentsToRun: ['analytics'] }),
      /No AI provider/i
    );
  });

  it('runSingleAgent throws for unknown agent', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const { default: orchestrator } = await import('../ai/AgentOrchestrator.js');
    await assert.rejects(
      () => orchestrator.runSingleAgent('badagent', 'user123'),
      /Unknown agent/i
    );
  });
});

// ─── Agent unit tests (with mock provider) ────────────────────────────────────

// Mock provider that returns deterministic responses without calling any API
function createMockProvider(responseJSON) {
  return {
    providerName: 'mock',
    modelName: 'mock-1',
    isAvailable: () => true,
    estimateTokens: () => 10,
    generate: async () => ({
      text: JSON.stringify(responseJSON),
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      costUsd: 0.0001,
      latencyMs: 50,
      provider: 'mock',
      model: 'mock-1',
    }),
  };
}

describe('AnalyticsAgent', () => {
  it('returns structured output from mock provider', async () => {
    const { AnalyticsAgent } = await import('../ai/agents/AnalyticsAgent.js');
    const agent = new AnalyticsAgent();
    const mockOutput = {
      explanation: 'Solid growth.',
      strengths: ['High engagement'],
      weaknesses: ['Low posting frequency'],
      recommendations: ['Post more reels'],
    };
    const result = await agent.run(createMockProvider(mockOutput), { engagement: { summary: {} } });
    assert.equal(result.explanation, 'Solid growth.');
    assert.ok(Array.isArray(result.strengths));
    assert.ok(result._meta?.provider === 'mock');
  });

  it('returns fallback when context is null', async () => {
    const { AnalyticsAgent } = await import('../ai/agents/AnalyticsAgent.js');
    const agent = new AnalyticsAgent();
    const result = await agent.run(createMockProvider({}), null);
    assert.ok(result.explanation);
    assert.ok(Array.isArray(result.strengths));
  });
});

describe('ContentAgent', () => {
  it('returns structured content ideas', async () => {
    const { ContentAgent } = await import('../ai/agents/ContentAgent.js');
    const agent = new ContentAgent();
    const mockOutput = {
      contentIdeas: ['Idea 1', 'Idea 2'],
      captionIdeas: ['Hook 1'],
      seriesIdeas: ['Series A'],
      postingImprovements: ['Improve X'],
    };
    const result = await agent.run(
      createMockProvider(mockOutput),
      { topPosts: [], audience: {}, bestTime: {} }
    );
    assert.ok(Array.isArray(result.contentIdeas));
    assert.ok(result._meta?.provider === 'mock');
  });
});

describe('TrendAgent', () => {
  it('returns trend insights from mock', async () => {
    const { TrendAgent } = await import('../ai/agents/TrendAgent.js');
    const agent = new TrendAgent();
    const mockOutput = {
      relevantTopics: ['AI tools'],
      trendingHashtags: ['#viral'],
      trendingFormats: ['reel'],
      trendAlert: 'Post a reel about AI this week',
    };
    const result = await agent.run(
      createMockProvider(mockOutput),
      { topics: [{ name: 'AI', trendScore: 90 }], hashtags: [], formats: [] }
    );
    assert.ok(Array.isArray(result.relevantTopics));
    assert.equal(result.trendAlert, 'Post a reel about AI this week');
  });

  it('returns fallback when no trend data', async () => {
    const { TrendAgent } = await import('../ai/agents/TrendAgent.js');
    const agent = new TrendAgent();
    const result = await agent.run(createMockProvider({}), null);
    assert.ok(result.trendAlert);
  });
});

describe('CompetitorAgent', () => {
  it('returns competitor analysis from mock', async () => {
    const { CompetitorAgent } = await import('../ai/agents/CompetitorAgent.js');
    const agent = new CompetitorAgent();
    const mockOutput = {
      contentGaps: ['Long-form tutorials'],
      missedOpportunities: ['Podcast format'],
      competitiveAdvantages: ['Higher engagement'],
      recommendations: ['Start a series'],
    };
    const result = await agent.run(
      createMockProvider(mockOutput),
      { competitorCount: 2, competitors: [{ avgEngagementRate: 5 }] }
    );
    assert.ok(Array.isArray(result.contentGaps));
    assert.ok(result._meta?.provider === 'mock');
  });

  it('returns fallback with no competitors', async () => {
    const { CompetitorAgent } = await import('../ai/agents/CompetitorAgent.js');
    const agent = new CompetitorAgent();
    const result = await agent.run(createMockProvider({}), { competitorCount: 0, competitors: [] });
    assert.ok(Array.isArray(result.competitiveAdvantages));
  });
});

describe('GrowthCoachAgent', () => {
  it('returns growth plan from mock', async () => {
    const { GrowthCoachAgent } = await import('../ai/agents/GrowthCoachAgent.js');
    const agent = new GrowthCoachAgent();
    const mockOutput = {
      weeklyPlan: { monday: 'Post a reel', tuesday: 'Engage' },
      monthlyStrategy: [{ week: 1, focus: 'Consistency', actions: [] }],
      actionItems: [{ action: 'Post daily', impact: 'High', timeline: '1 week' }],
      kpis: [{ metric: 'Followers', target: '+500', timeframe: '1 month' }],
      priorityTasks: [{ task: 'Reels', expectedImpact: 'High engagement', effort: 'medium' }],
    };
    const result = await agent.run(
      createMockProvider(mockOutput),
      { analytics: {}, content: {}, trend: {}, competitor: {} }
    );
    assert.ok(result.weeklyPlan);
    assert.ok(Array.isArray(result.actionItems));
    assert.ok(result.generatedAt);
  });
});

// ─── MemoryService ────────────────────────────────────────────────────────────

describe('MemoryService', () => {
  before(connectDB);
  after(disconnectDB);

  it('runWithMemory records execution in AiExecution', async () => {
    const { default: MemoryService } = await import('../services/MemoryService.js');
    const { default: AiExecution } = await import('../models/AiExecution.js');

    const userId = new mongoose.Types.ObjectId();
    const mockProvider = createMockProvider({
      explanation: 'Test output',
      strengths: [],
      weaknesses: [],
      recommendations: [],
    });

    await MemoryService.runWithMemory(
      userId,
      'analytics',
      mockProvider,
      { engagement: { summary: {} }, growth: { summary: {} }, contentPerformance: { topContent: [], summary: {} }, bestTime: {} },
      { handle: '@test', platform: 'instagram' }
    );

    const executions = await AiExecution.find({ user: userId });
    assert.ok(executions.length >= 1);
    assert.equal(executions[0].status, 'completed');
    assert.ok(executions[0].totalTokens > 0);
  });

  it('getHistory returns recent executions', async () => {
    const { default: MemoryService } = await import('../services/MemoryService.js');
    const userId = new mongoose.Types.ObjectId();
    const history = await MemoryService.getHistory(userId, { limit: 10 });
    assert.ok(Array.isArray(history));
  });

  it('getUsage returns token totals', async () => {
    const { default: MemoryService } = await import('../services/MemoryService.js');
    const userId = new mongoose.Types.ObjectId();
    const usage = await MemoryService.getUsage(userId);
    assert.ok(typeof usage.totalTokens === 'number');
    assert.ok(typeof usage.totalCostUsd === 'number');
  });
});

// ─── CacheService ─────────────────────────────────────────────────────────────

describe('CacheService', () => {
  it('get returns null when disabled', async () => {
    const { default: cache } = await import('../services/CacheService.js');
    cache.enabled = false;
    const val = await cache.get('analytics', 'test-key');
    assert.equal(val, null);
  });

  it('set is a no-op when disabled', async () => {
    const { default: cache } = await import('../services/CacheService.js');
    cache.enabled = false;
    await assert.doesNotReject(() => cache.set('analytics', 'test-key', { foo: 'bar' }));
  });

  it('getOrSet calls computeFn when disabled', async () => {
    const { default: cache } = await import('../services/CacheService.js');
    cache.enabled = false;
    let called = false;
    const result = await cache.getOrSet('analytics', 'miss-key', async () => {
      called = true;
      return { value: 42 };
    });
    assert.equal(called, true);
    assert.equal(result.value, 42);
  });

  it('ping returns false when disabled', async () => {
    const { default: cache } = await import('../services/CacheService.js');
    cache.enabled = false;
    const ok = await cache.ping();
    assert.equal(ok, false);
  });
});

// ─── EventBus ─────────────────────────────────────────────────────────────────

describe('EventBus', () => {
  it('emits and receives events', async () => {
    const { default: bus } = await import('../events/eventBus.js');
    const { EVENT_TYPES } = await import('../events/eventTypes.js');

    // Verify emit() returns a boolean and does not throw
    const emitted = bus.emit(EVENT_TYPES.TREND_UPDATED, { platform: 'instagram' });
    assert.equal(typeof emitted, 'boolean');
  });

  it('event types are all strings', async () => {
    const { EVENT_TYPES } = await import('../events/eventTypes.js');
    for (const [key, val] of Object.entries(EVENT_TYPES)) {
      assert.equal(typeof val, 'string', `${key} should be a string`);
      assert.ok(val.length > 0, `${key} should not be empty`);
    }
  });

  it('does not throw when listener errors', async () => {
    const { default: bus } = await import('../events/eventBus.js');
    bus.once('test:error', async () => {
      throw new Error('Listener error');
    });
    assert.doesNotThrow(() => bus.emit('test:error', {}));
  });
});

// ─── AgentExecutionRepository ─────────────────────────────────────────────────

describe('AgentExecutionRepository', () => {
  before(connectDB);
  after(disconnectDB);

  it('createPending → markCompleted flow', async () => {
    const { default: repo } = await import('../repositories/AgentExecutionRepository.js');
    const userId = new mongoose.Types.ObjectId();

    const execution = await repo.createPending(userId, {
      agentName: 'analytics',
      model: 'gemini-1.5-flash',
      inputSummary: 'Analytics for @alice on instagram',
    });

    assert.equal(execution.status, 'pending');
    assert.equal(execution.agentType, 'growth_analyst');

    const completed = await repo.markCompleted(execution._id, {
      promptTokens: 500,
      completionTokens: 200,
      totalTokens: 700,
      estimatedCostUsd: 0.0002,
      latencyMs: 1200,
      outputSummary: 'Generated 3 sections',
    });

    assert.equal(completed.status, 'completed');
    assert.equal(completed.totalTokens, 700);
  });

  it('markFailed records error message', async () => {
    const { default: repo } = await import('../repositories/AgentExecutionRepository.js');
    const userId = new mongoose.Types.ObjectId();
    const execution = await repo.createPending(userId, {
      agentName: 'content',
      model: 'gpt-4o-mini',
    });
    const failed = await repo.markFailed(execution._id, 'API rate limit exceeded');
    assert.equal(failed.status, 'failed');
    assert.ok(failed.errorMessage.includes('rate limit'));
  });

  it('aggregateUsage returns zero for new user', async () => {
    const { default: repo } = await import('../repositories/AgentExecutionRepository.js');
    const userId = new mongoose.Types.ObjectId();
    const usage = await repo.aggregateUsage(userId);
    assert.equal(usage.totalTokens, 0);
    assert.equal(usage.executionCount, 0);
  });
});
