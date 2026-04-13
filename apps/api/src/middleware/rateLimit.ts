import type { Context, Next } from 'hono'
import { getClientIp } from '../lib/request'

interface RateLimiterBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>
}

function makeRateLimiter(binding: string, keyFn?: (c: Context) => string) {
  return async (c: Context, next: Next) => {
    const limiter = (c.env as Record<string, unknown>)[binding] as RateLimiterBinding | undefined
    if (!limiter) return next()   // local dev without wrangler — skip
    const key = keyFn ? keyFn(c) : getClientIp(c)
    const { success } = await limiter.limit({ key })
    if (!success) return c.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, 429)
    return next()
  }
}

export const apiRateLimiter           = makeRateLimiter('RL_API')
export const adminRateLimiter         = makeRateLimiter('RL_ADMIN',          (c) => getClientIp(c))
export const loginRateLimiter         = makeRateLimiter('RL_LOGIN',          (c) => `login:${getClientIp(c)}`)
export const registerRateLimiter      = makeRateLimiter('RL_REGISTER',       (c) => `register:${getClientIp(c)}`)
export const passwordResetRateLimiter = makeRateLimiter('RL_PASSWORD_RESET', (c) => `reset:ip:${getClientIp(c)}`)
export const healthRateLimiter        = makeRateLimiter('RL_HEALTH',         (c) => getClientIp(c))

/**
 * Programmatically apply rate limiting for an arbitrary key.
 * Use when the key is only available after parsing the request body (e.g. email).
 * Uses the RL_PASSWORD_RESET binding with a caller-supplied key prefix.
 * Returns null if not limited; returns a ready-to-return Response if over limit.
 */
export async function checkRateLimitByKey(
  c: Context,
  key: string,
): Promise<Response | null> {
  const limiter = (c.env as Record<string, unknown>)['RL_PASSWORD_RESET'] as RateLimiterBinding | undefined
  if (!limiter) return null   // local dev fallback — allow
  const { success } = await limiter.limit({ key })
  if (!success) {
    c.header('Retry-After', '3600')
    return c.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, 429) as Response
  }
  return null
}
