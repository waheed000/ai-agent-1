/**
 * GeminiProvider — Google Gemini implementation of AIProvider.
 *
 * Reads GEMINI_API_KEY from environment.
 * Falls back gracefully when the key is absent or the API is unreachable.
 *
 * Pricing (gemini-1.5-flash, as of 2025): $0.075 / 1M input tokens, $0.30 / 1M output tokens
 */

import { AIProvider } from './AIProvider.js';
import logger from '../../utils/logger.js';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

const INPUT_COST_PER_TOKEN = 0.075 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.30 / 1_000_000;

export class GeminiProvider extends AIProvider {
  constructor(model = 'gemini-1.5-flash') {
    super();
    this._model = model;
    this._apiKey = process.env.GEMINI_API_KEY || null;
  }

  get providerName() {
    return 'gemini';
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
      throw new Error('GeminiProvider: GEMINI_API_KEY is not configured');
    }

    const { maxTokens = 2048, temperature = 0.7, systemPrompt } = options;
    const startMs = Date.now();

    // Build the contents array; prepend system instruction as a user turn if provided
    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    };

    const url = `${GEMINI_API_URL}/${this._model}:generateContent?key=${this._apiKey}`;

    let data;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${err}`);
      }

      data = await res.json();
    } catch (err) {
      logger.error('GeminiProvider.generate: request failed', { error: err.message });
      throw err;
    }

    const latencyMs = Date.now() - startMs;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';

    const meta = data.usageMetadata || {};
    const promptTokens = meta.promptTokenCount || this.estimateTokens(prompt);
    const completionTokens = meta.candidatesTokenCount || this.estimateTokens(text);
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
