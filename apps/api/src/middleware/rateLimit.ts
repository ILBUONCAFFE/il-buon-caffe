import type { Context, Next } from 'hono'
import { getClientIp } from '../lib/request'

interface RateLimitConfig {
  limit: number           // Max requests
  windowMs: number        // Time window in ms
  blockDurationMs: number // Block duration after exceeding limit
  keyGenerator?: (c: Context) => string // Custom key generator
}

interface RateLimitRecord {
  attempts: number
  firstAttempt: number
  blockedUntil?: number
}

/**
 * Rate limiting middleware using Cloudflare KV
 * Falls back to in-memory storage if KV is not available
 */
const memoryStore = new Map<string, RateLimitRecord>()

export function rateLimit(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c)
    const keyGenerator = config.keyGenerator || ((ctx: Context) => `${ctx.req.path}:${ip}`)
    const key = `ratelimit:${keyGenerator(c)}`
    const now = Date.now()
    
    // Try to use Cloudflare KV if available
    const kv = (c.env as { AUTH_RATE_LIMIT?: KVNamespace }).AUTH_RATE_LIMIT
    
    let record: RateLimitRecord | null = null
    
    if (kv) {
      // Use Cloudflare KV
      try {
        record = await kv.get<RateLimitRecord>(key, 'json')
      } catch (e) {
        console.error('KV read error:', e)
      }
    } else {
      // Fallback to in-memory
      record = memoryStore.get(key) || null
    }
    
    // Check if blocked
    if (record?.blockedUntil && record.blockedUntil > now) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000)
      c.header('Retry-After', retryAfter.toString())
      c.header('X-RateLimit-Remaining', '0')
      return c.json(
        { error: 'Zbyt wiele żądań. Spróbuj ponownie później.' },
        429
      )
    }
    
    // Reset window if expired — write to KV only when starting a new window
    const isNewWindow = !record || now - record.firstAttempt > config.windowMs
    if (isNewWindow) {
      record = { attempts: 1, firstAttempt: now }
      if (kv) {
        try {
          await kv.put(key, JSON.stringify(record), {
            expirationTtl: Math.ceil(config.windowMs / 1000) + 60
          })
        } catch (e) {
          console.warn('KV PUT (new window) failed — falling back to in-memory:', e)
          memoryStore.set(key, record)
        }
      } else {
        memoryStore.set(key, record)
      }
    } else {
      // Increment attempts — skip KV write for intermediate counts to avoid write quota exhaustion
      record.attempts += 1
      if (!kv) memoryStore.set(key, record)
    }

    // Check if limit exceeded
    if (record.attempts > config.limit) {
      record.blockedUntil = now + config.blockDurationMs

      // Write block record to KV — important to persist across Worker invocations
      if (kv) {
        try {
          await kv.put(key, JSON.stringify(record), {
            expirationTtl: Math.ceil(config.blockDurationMs / 1000) + 60
          })
        } catch (e) {
          console.warn('KV PUT (block record) failed — falling back to in-memory:', e)
          memoryStore.set(key, record)
        }
      } else {
        memoryStore.set(key, record)
      }

      const retryAfter = Math.ceil(config.blockDurationMs / 1000)
      c.header('Retry-After', retryAfter.toString())
      c.header('X-RateLimit-Remaining', '0')
      return c.json(
        { error: 'Zbyt wiele żądań. Spróbuj ponownie później.' },
        429
      )
    }
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.limit.toString())
    c.header('X-RateLimit-Remaining', Math.max(0, config.limit - record.attempts).toString())
    c.header('X-RateLimit-Reset', Math.ceil((record.firstAttempt + config.windowMs) / 1000).toString())
    
    await next()
  }
}

// ============================================
// Preset Rate Limiters
// ============================================

/**
 * Strict limiter for login attempts
 * 5 attempts per 15 minutes, then blocked for 1 hour
 */
export const loginRateLimiter = rateLimit({
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
  keyGenerator: (c) => `login:${getClientIp(c)}`
})

/**
 * Rate limiter for registration
 * 3 registrations per hour per IP
 */
export const registerRateLimiter = rateLimit({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
  keyGenerator: (c) => `register:${getClientIp(c)}`
})

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour per email
 */
export const passwordResetRateLimiter = rateLimit({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
  keyGenerator: (c) => `reset:${getClientIp(c)}`
})

/**
 * General API rate limiter
 * 100 requests per minute
 */
export const apiRateLimiter = rateLimit({
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000 // 5 minutes block
})

/**
 * Admin API rate limiter — stricter than the public API.
 * 30 requests per minute per IP, blocked for 15 minutes on breach.
 * Admin endpoints are high-value targets; legitimate admin usage is low-volume.
 */
export const adminRateLimiter = rateLimit({
  limit: 30,
  windowMs: 60 * 1000,        // 1 minute
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  keyGenerator: (c) => `admin:${getClientIp(c)}`,
})

/**
 * Health endpoint rate limiter — lenient, for uptime monitors.
 * 20 requests per minute per IP, short 1-minute block.
 */
export const healthRateLimiter = rateLimit({
  limit: 20,
  windowMs: 60 * 1000,   // 1 minute
  blockDurationMs: 60 * 1000, // 1 minute block
  keyGenerator: (c) => `health:${getClientIp(c)}`,
})

/**
 * Programmatically apply rate limiting for an arbitrary key.
 * Use when the key is only available after parsing the request body (e.g. email).
 * Returns null if not limited; returns a ready-to-return Response if the caller is over limit.
 */
export async function checkRateLimitByKey(
  c: Context,
  key: string,
  config: { limit: number; windowMs: number; blockDurationMs: number }
): Promise<Response | null> {
  const fullKey = `ratelimit:${key}`
  const now = Date.now()
  const kv = (c.env as { AUTH_RATE_LIMIT?: KVNamespace }).AUTH_RATE_LIMIT

  let record: RateLimitRecord | null = null
  if (kv) {
    try { record = await kv.get<RateLimitRecord>(fullKey, 'json') } catch { /* KV unavailable */ }
  } else {
    record = memoryStore.get(fullKey) || null
  }

  if (record?.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000)
    c.header('Retry-After', retryAfter.toString())
    c.header('X-RateLimit-Remaining', '0')
    return c.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, 429)
  }

  if (!record || now - record.firstAttempt > config.windowMs) {
    record = { attempts: 1, firstAttempt: now }
  } else {
    record.attempts += 1
  }

  if (record.attempts > config.limit) {
    record.blockedUntil = now + config.blockDurationMs
    if (kv) {
      await kv.put(fullKey, JSON.stringify(record), { expirationTtl: Math.ceil(config.blockDurationMs / 1000) + 60 })
    } else {
      memoryStore.set(fullKey, record)
    }
    const retryAfter = Math.ceil(config.blockDurationMs / 1000)
    c.header('Retry-After', retryAfter.toString())
    c.header('X-RateLimit-Remaining', '0')
    return c.json({ error: 'Zbyt wiele żądań. Spróbuj ponownie później.' }, 429)
  }

  if (kv) {
    await kv.put(fullKey, JSON.stringify(record), { expirationTtl: Math.ceil(config.windowMs / 1000) + 60 })
  } else {
    memoryStore.set(fullKey, record)
  }
  return null
}
