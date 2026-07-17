/**
 * OpenAIProvider — OpenAI GPT implementation of AIProvider.
 *
 * Reads OPENAI_API_KEY from environment.
 * Pricing (gpt-4o-mini, 2025): $0.15 / 1M input tokens, $0.60 / 1M output tokens.
 */

import { AIProvider } from './AIProvider.js';
import logger from '../../utils/logger.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const INPUT_COST_PER_TOKEN = 0.15 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.60 / 1_000_000;

export class OpenAIProvider extends AIProvider {
  constructor(model = 'gpt-4o-mini') {
    super();
    this._model = model;
    this._apiKey = process.env.OPENAI_API_KEY || null;
  }

  get providerName() {
    return 'openai';
  }

  get modelName() {
    return this._model;
  }

  isAvailable() {
    return Boolean(this._apiKey);
  }

  /**
   * @param {string} prompt
   * @param {{ maxTokens?: number, temperature?: number, systemPrompt?: string }} options
   * @returns {Promise<import('./AIProvider.js').AIProviderResponse>}
   */
  async generate(prompt, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAIProvider: OPENAI_API_KEY is not configured');
    }

    const {
      maxTokens = 2048,
      temperature = 0.7,
      systemPrompt = 'You are a helpful social media growth assistant.',
    } = options;

    const startMs = Date.now();

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    const body = {
      model: this._model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    let data;
    try {
      const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error ${res.status}: ${err}`);
      }

      data = await res.json();
    } catch (err) {
      logger.error('OpenAIProvider.generate: request failed', { error: err.message });
      throw err;
    }

    const latencyMs = Date.now() - startMs;
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || this.estimateTokens(prompt);
    const completionTokens = usage.completion_tokens || this.estimateTokens(text);
    const totalTokens = promptTokens + completionTokens;
    const costUsd =
      promptTokens * INPUT_COST_PER_TOKEN + completionTokens * OUTPUT_COST_PER_TOKEN;

    return {
      text,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
      latencyMs,
      provider: this.providerName,
      model: this._model,
    };
  }
}
