/**
 * Shared utilities for AI agents.
 */

/**
 * Safely parse a JSON block from LLM output.
 * LLMs sometimes wrap JSON in markdown code fences — strip those first.
 *
 * @param {string} text
 * @returns {object}  parsed object, or empty object on failure
 */
export function parseAgentJSON(text = '') {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```\s*$/im, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block from free text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* ignore */ }
    }
    return {};
  }
}
