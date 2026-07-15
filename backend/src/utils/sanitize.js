/**
 * Input sanitization utilities.
 * Strips HTML tags and control characters from string values.
 * Applied in validators before any business logic runs.
 */

/** Remove HTML tags and decode common entities. */
export const stripHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '')          // strip tags
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .trim();
};

/** Sanitize all string fields of a plain object (shallow). */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = typeof value === 'string' ? stripHtml(value) : value;
  }
  return out;
};
