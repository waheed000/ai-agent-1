/**
 * PromptBuilder
 * Fills {{VARIABLE}} placeholders in prompt templates.
 * Every agent prompt must go through here — never hardcode prompts in agents.
 *
 * Usage:
 *   const { userPrompt, systemPrompt } = PromptBuilder.build('analytics', {
 *     CREATOR_HANDLE: '@alice',
 *     PLATFORM: 'Instagram',
 *     ...
 *   });
 */

import { PROMPT_TEMPLATES } from './PromptTemplates.js';
import logger from '../utils/logger.js';

class PromptBuilder {
  /**
   * Build a filled prompt for the given agent type.
   *
   * @param {string} agentType  key in PROMPT_TEMPLATES
   * @param {object} variables  map of VARIABLE_NAME → value
   * @returns {{ userPrompt: string, systemPrompt: string }}
   */
  build(agentType, variables = {}) {
    const template = PROMPT_TEMPLATES[agentType];
    if (!template) {
      throw new Error(`PromptBuilder: no template found for agent type "${agentType}"`);
    }

    const userPrompt = this._fill(template.user, variables);
    const systemPrompt = template.system;

    logger.debug('PromptBuilder: prompt built', {
      agentType,
      variableKeys: Object.keys(variables),
      promptLength: userPrompt.length,
    });

    return { userPrompt, systemPrompt };
  }

  /**
   * Replace {{KEY}} placeholders in a template string.
   * Missing variables are replaced with '<NOT PROVIDED>'.
   *
   * @param {string} template
   * @param {object} variables
   * @returns {string}
   */
  _fill(template, variables) {
    return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
      if (!(key in variables)) {
        logger.warn(`PromptBuilder: missing variable "{{${key}}}" in template`);
        return '<NOT PROVIDED>';
      }
      const value = variables[key];
      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    });
  }

  /**
   * Serialise an object to a human-readable bullet list for use inside prompts.
   * Useful for embedding structured data without overwhelming the LLM with JSON.
   *
   * @param {object|Array} data
   * @param {number} [depth=0]  current nesting depth
   * @returns {string}
   */
  toReadableList(data, depth = 0) {
    const indent = '  '.repeat(depth);

    if (Array.isArray(data)) {
      return data
        .slice(0, 20) // cap to avoid context bloat
        .map((item) =>
          typeof item === 'object'
            ? `${indent}- ${this.toReadableList(item, depth + 1)}`
            : `${indent}- ${item}`
        )
        .join('\n');
    }

    if (typeof data === 'object' && data !== null) {
      return Object.entries(data)
        .slice(0, 20)
        .map(([k, v]) => {
          const label = k.replace(/([A-Z])/g, ' $1').toLowerCase();
          const val = typeof v === 'object' ? '\n' + this.toReadableList(v, depth + 1) : String(v);
          return `${indent}${label}: ${val}`;
        })
        .join('\n');
    }

    return String(data);
  }

  /**
   * Truncate a string to fit within a token budget (≈4 chars/token).
   *
   * @param {string} text
   * @param {number} maxTokens
   * @returns {string}
   */
  truncateToTokens(text, maxTokens = 1000) {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n[... truncated for context window ...]';
  }
}

export default new PromptBuilder();
