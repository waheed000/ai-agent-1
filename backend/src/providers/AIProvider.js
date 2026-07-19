/**
 * AIProvider — abstract base class for all LLM providers.
 *
 * Design:
 * - Agents depend on this interface only; they never import a concrete provider.
 * - Subclasses must implement: generate(), isAvailable(), get providerName, get modelName.
 * - The contract returns a standard { text, promptTokens, completionTokens, totalTokens, costUsd, latencyMs }.
 */

export class AIProvider {
  /**
   * Human-readable provider name. Must be overridden.
   * @returns {string}
   */
  get providerName() {
    throw new Error('AIProvider.providerName must be overridden');
  }

  /**
   * Active model identifier. Must be overridden.
   * @returns {string}
   */
  get modelName() {
    throw new Error('AIProvider.modelName must be overridden');
  }

  /**
   * Whether this provider is configured and available.
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('AIProvider.isAvailable must be overridden');
  }

  /**
   * Send a prompt and return a structured response.
   *
   * @param {string} prompt
   * @param {object} [options]
   * @param {number} [options.maxTokens]
   * @param {number} [options.temperature]
   * @param {string} [options.systemPrompt]
   * @returns {Promise<AIProviderResponse>}
   */
  async generate(prompt, options = {}) {
    throw new Error('AIProvider.generate must be overridden');
  }

  /**
   * Estimate token count for a string (rough approximation).
   * 1 token ≈ 4 characters for English text.
   *
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
  }
}

/**
 * @typedef {object} AIProviderResponse
 * @property {string}  text              - generated text
 * @property {number}  promptTokens
 * @property {number}  completionTokens
 * @property {number}  totalTokens
 * @property {number}  costUsd
 * @property {number}  latencyMs
 * @property {string}  provider
 * @property {string}  model
 */
