import type { Context } from 'hono'

// ── Error helpers ────────────────────────────────────────────────────────────

/** Extract a safe error message — never logs the full Error object (avoids leaking stack traces). */
export const errMsg = (e: unknown): string => e instanceof Error ? e.message : String(e)

/**
 * Log the error and return a generic 500 JSON response.
 * Use as the last statement in a catch block: `return serverError(c, 'PATCH /foo/:id', err)`
 */
export function serverError(c: Context<any>, label: string, err: unknown) {
  console.error(`${label}:`, errMsg(err))
  return c.json({ error: 'Błąd serwera' }, 500)
}

// ── Body-size guard ──────────────────────────────────────────────────────────

/**
 * Check the Content-Length request header against a maximum byte size.
 * Returns a 413 response if exceeded, otherwise null.
 *
 * Usage:
 *   const sizeErr = checkContentLength(c, MAX_BODY)
 *   if (sizeErr) return sizeErr
 */
export function checkContentLength(c: Context<any>, max: number) {
  const len = parseInt(c.req.header('Content-Length') || '0', 10)
  if (len > max) return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)
  return null
}

// ── Pagination ───────────────────────────────────────────────────────────────

/**
 * Parse `page` and `limit` query parameters with sane defaults and bounds.
 *
 * @param maxLimit    Maximum allowed page size (default 100)
 * @param defaultLimit  Default page size when not provided (default 50)
 */
export function parsePagination(
  c: Context<any>,
  opts: { maxLimit?: number; defaultLimit?: number } = {},
): { page: number; limit: number } {
  const { maxLimit = 100, defaultLimit = 50 } = opts
  const pageRaw  = parseInt(c.req.query('page')  || '1', 10)
  const limitRaw = parseInt(c.req.query('limit') || String(defaultLimit), 10)
  const page  = Math.max(1, isNaN(pageRaw)  ? 1          : pageRaw)
  const limit = Math.min(maxLimit, Math.max(1, isNaN(limitRaw) ? defaultLimit : limitRaw))
  return { page, limit }
}

// ── IP extraction ────────────────────────────────────────────────────────────

/**
 * Extract the real client IP, trying Cloudflare → X-Real-IP → X-Forwarded-For.
 * Falls back to 'unknown' when running locally without a proxy.
 */
export function getClientIp(c: Context<any>): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Real-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}
