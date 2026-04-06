import type { Context, Next } from 'hono'
import { verifyAccessToken, TokenPayload } from '../lib/jwt'
import { getAccessTokenFromCookie } from '../lib/cookies'
import { createDb } from '@repo/db/client'
import { users } from '@repo/db/schema'
import { eq } from 'drizzle-orm'

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: TokenPayload
    db: ReturnType<typeof createDb>
  }
}

/**
 * Auth middleware - requires valid access token
 * Token can be in Authorization header (Bearer) or httpOnly cookie
 * 
 * @param allowedRoles - Optional array of roles that can access the route
 */
export function requireAuth(allowedRoles?: ('customer' | 'admin')[]) {
  return async (c: Context, next: Next) => {
    // Get token from header or cookie
    const authHeader = c.req.header('Authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null
    const tokenFromCookie = getAccessTokenFromCookie(c)
    
    const token = tokenFromHeader || tokenFromCookie
    
    if (!token) {
      return c.json({ error: 'Wymagana autoryzacja' }, 401)
    }
    
    try {
      const jwtSecret = (c.env as { JWT_ACCESS_SECRET: string }).JWT_ACCESS_SECRET
      const payload = await verifyAccessToken(token, jwtSecret)
      
      // Check role if required
      if (allowedRoles && !allowedRoles.includes(payload.role as 'customer' | 'admin')) {
        return c.json({ error: 'Brak uprawnień do tego zasobu' }, 403)
      }
      
      // Set user in context
      c.set('user', payload)
      
      await next()
    } catch (error) {
      console.error('Auth middleware error:', error instanceof Error ? error.message : String(error))
      return c.json({ error: 'Nieprawidłowy lub wygasły token' }, 401)
    }
  }
}

/**
 * Admin-only middleware - shorthand for requireAuth(['admin'])
 */
export function requireAdmin() {
  return requireAuth(['admin'])
}

/**
 * Admin-or-internal-proxy middleware.
 *
 * Accepts requests coming from the Next.js admin proxy (web app) that carry
 * the `X-Admin-Internal-Secret` header, OR regular admin JWT tokens.
 *
 * This bridges the two separate auth systems:
 *   - Web admin: `admin_session` cookie with ADMIN_JWT_SECRET (Next.js)
 *   - API worker: `access_token` cookie with JWT_ACCESS_SECRET (CF Worker)
 *
 * The Next.js proxy at /api/admin/allegro/[...slug]/route.ts:
 *   1. Verifies the admin_session cookie server-side
 *   2. Forwards the request here with `X-Admin-Internal-Secret: INTERNAL_API_SECRET`
 *
 * Security: INTERNAL_API_SECRET must be a strong random value (≥32 chars),
 * configured as a Cloudflare Worker secret (wrangler secret put INTERNAL_API_SECRET).
 */
export function requireAdminOrProxy() {
  return async (c: Context, next: Next) => {
    const internalSecret = (c.env as { INTERNAL_API_SECRET?: string }).INTERNAL_API_SECRET
    const requestSecret = c.req.header('X-Admin-Internal-Secret')

    // Fail closed: if a proxy secret was presented but INTERNAL_API_SECRET is not configured, reject
    if (requestSecret && !internalSecret) {
      console.error('[auth] requireAdminOrProxy: X-Admin-Internal-Secret header present but INTERNAL_API_SECRET is not configured in Worker env. Add it to .dev.vars (local) or via wrangler secret put (prod).')
      return c.json({ error: 'Serwer nieprawidłowo skonfigurowany' }, 503)
    }
    if (internalSecret && requestSecret && requestSecret === internalSecret) {
      // Verify the forwarded admin user ID against the database — never trust it blindly
      const proxyUserIdRaw = c.req.header('X-Admin-User-Id')
      const proxyUserId = proxyUserIdRaw ? parseInt(proxyUserIdRaw, 10) : NaN
      if (!proxyUserIdRaw || isNaN(proxyUserId) || proxyUserId <= 0) {
        console.warn(`[auth] Proxy request rejected: Invalid X-Admin-User-Id = "${proxyUserIdRaw}"`)
        return c.json({ error: 'Nieautoryzowany dostęp' }, 401)
      }

      try {
        const db = c.get('db')
        const userRow = await db.query.users.findFirst({
          columns: { id: true, role: true, anonymized: true },
          where: eq(users.id, proxyUserId),
        })

        if (!userRow || userRow.role !== 'admin' || userRow.anonymized) {
          console.warn(`[auth] Proxy request rejected for User ID: ${proxyUserId}. DB row:`, userRow)
          return c.json({ error: 'Nieautoryzowany dostęp' }, 403)
        }
      } catch (err) {
        // Keep this explicit to avoid bubbling to global 500 and masking auth/DB issues.
        console.error('[auth] Proxy admin verification failed:', err instanceof Error ? err.message : String(err))
        return c.json({ error: 'Usługa autoryzacji administratora jest chwilowo niedostępna' }, 503)
      }

      c.set('user', {
        sub: String(proxyUserId),
        email: 'internal@proxy',
        role: 'admin' as const,
        sessionId: 'internal-proxy',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60,
      } as import('../lib/jwt').TokenPayload)
      return next()
    } else if (requestSecret) {
      console.warn('[auth] Mismatch: invalid internal proxy secret')
    }

    // Fall back to standard JWT admin auth
    return requireAuth(['admin'])(c, next)
  }
}

/**
 * Optional auth - sets user if token is valid, but doesn't require it
 */
export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null
    const tokenFromCookie = getAccessTokenFromCookie(c)
    
    const token = tokenFromHeader || tokenFromCookie
    
    if (token) {
      try {
        const jwtSecret = (c.env as { JWT_ACCESS_SECRET: string }).JWT_ACCESS_SECRET
        const payload = await verifyAccessToken(token, jwtSecret)
        c.set('user', payload)
      } catch {
        // Token invalid, but that's okay - continue without user
      }
    }
    
    await next()
  }
}
