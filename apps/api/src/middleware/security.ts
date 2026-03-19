import type { Context, Next } from 'hono'

/**
 * Security headers middleware
 * Sets recommended security headers for all responses
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next()
    
    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY')
    
    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff')
    
    // Referrer policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Disable unnecessary browser features
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    
    // HSTS - enforce HTTPS (2 years with preload)
    c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    
    // XSS protection (legacy fallback)
    c.header('X-XSS-Protection', '1; mode=block')
    
    // Cross-Origin isolation
    c.header('Cross-Origin-Opener-Policy', 'same-origin')
    c.header('Cross-Origin-Resource-Policy', 'same-origin')
    
    // Content Security Policy (API responds JSON, so strict CSP)
    c.header('Content-Security-Policy', [
      "default-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ].join('; '))
  }
}

/**
 * Sec-Fetch CSRF protection middleware.
 * 
 * Blocks cross-origin mutation requests (POST/PUT/DELETE/PATCH) that
 * don't originate from same-origin navigation or same-origin script (fetch/XHR).
 * 
 * This is a defence-in-depth layer on top of SameSite=Strict cookies.
 * Older browsers that don't send Sec-Fetch-* headers are allowed through
 * (they're still protected by SameSite cookies).
 * 
 * @see https://web.dev/articles/fetch-metadata
 */
export function secFetchGuard() {
  return async (c: Context, next: Next) => {
    const method = c.req.method

    // Only guard state-changing methods
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next()
    }

    const secFetchSite = c.req.header('Sec-Fetch-Site')

    // If header is absent the browser is old — fall through (SameSite cookies still protect)
    if (!secFetchSite) {
      return next()
    }

    // Allow same-origin and same-site requests
    if (secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none') {
      return next()
    }

    // Block cross-site requests
    console.warn(`[CSRF] Blocked ${method} ${c.req.path} — Sec-Fetch-Site: ${secFetchSite}`)
    return c.json({ error: 'Żądanie zablokowane — niedozwolone źródło' }, 403)
  }
}

/**
 * CORS configuration for API
 */
export function corsConfig() {
  return {
    origin: (origin: string) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://ilbuoncaffe.pl',
        'https://www.ilbuoncaffe.pl'
      ]
      if (allowedOrigins.includes(origin)) {
        return origin
      }
      return null
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 600 // 10 minutes
  }
}
