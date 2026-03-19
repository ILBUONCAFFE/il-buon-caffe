/**
 * In-memory rate limiting for Server Actions.
 * 
 * IMPORTANT: This provides defense-in-depth for local development and
 * single-instance deployments. On Cloudflare Pages / serverless,
 * each invocation may be a fresh isolate, so this Map may be empty.
 * 
 * The PRIMARY brute-force defense in production is the DB-level
 * `failedLoginAttempts` + `lockedUntil` columns on the users table,
 * which persist across all invocations.
 * 
 * For distributed rate limiting at scale, upgrade to Cloudflare KV or D1.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes (only in long-lived processes)
if (typeof globalThis !== 'undefined' && typeof setInterval !== 'undefined') {
  try {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        const expiry = entry.blockedUntil || (entry.firstAttempt + 15 * 60 * 1000);
        if (now > expiry + 60_000) {
          store.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  } catch {
    // setInterval may not be available in some serverless runtimes
  }
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining: number;
}

/**
 * Check rate limit for a given key (typically IP or IP:action).
 * @param key - Unique identifier (e.g., "login:192.168.1.1")
 * @param maxAttempts - Max attempts in window (default: 5)
 * @param windowMs - Window duration in ms (default: 15 min)
 * @param blockMs - Block duration when exceeded (default: 60 min)
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  blockMs = 60 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  // Blocked?
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  // Window expired? Reset.
  if (!entry || now - entry.firstAttempt > windowMs) {
    entry = { attempts: 1, firstAttempt: now };
    store.set(key, entry);
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  // Increment
  entry.attempts += 1;

  // Exceeded?
  if (entry.attempts > maxAttempts) {
    entry.blockedUntil = now + blockMs;
    store.set(key, entry);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
      remaining: 0,
    };
  }

  store.set(key, entry);
  return { allowed: true, remaining: maxAttempts - entry.attempts };
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
