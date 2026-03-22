/**
 * Trim a string input and clamp to max length.
 * Returns '' for non-string input so callers can check truthiness.
 */
export function sanitize(raw: unknown, max = 255): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, max)
}
