/**
 * Convert a string to a URL-safe slug.
 * Strips diacritics, lowercases, replaces non-alphanumeric runs with '-'.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
