/**
 * Utilities for converting user-supplied search terms into safe MongoDB
 * `$regex` clauses without exposing the database to ReDoS or unintended
 * metacharacter injection.
 *
 * Example:
 *   const term = String(req.query.q ?? '');
 *   query.name = { $regex: escapeRegex(term), $options: 'i' };
 */

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes all RegExp metacharacters in a string so that the result can be
 * safely used inside a regex (or Mongo `$regex` clause) as a literal match.
 *
 * @param {unknown} input
 * @returns {string}
 */
function escapeRegex(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(REGEX_META, '\\$&');
}

/**
 * Convenience helper: returns an object suitable for spreading into a Mongo
 * filter, e.g. `{ name: safeRegexFilter(term) }` → `{ name: { $regex: ..., $options: 'i' } }`.
 * Returns `null` when the input is empty so callers can decide whether to
 * include the clause.
 *
 * @param {unknown} input
 * @param {{ maxLength?: number, options?: string }} [opts]
 * @returns {{ $regex: string, $options: string } | null}
 */
function safeRegexFilter(input, opts = {}) {
  const { maxLength = 100, options = 'i' } = opts;
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim().slice(0, maxLength);
  if (!trimmed) return null;
  return { $regex: escapeRegex(trimmed), $options: options };
}

module.exports = { escapeRegex, safeRegexFilter };
