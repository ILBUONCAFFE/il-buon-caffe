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
    // CORP must be 'cross-origin' for a CORS-enabled API — 'same-origin' would block
    // browser fetch() calls from ilbuoncaffe.pl to api.ilbuoncaffe.pl even with CORS headers.
    c.header('Cross-Origin-Opener-Policy', 'same-origin')
    c.header('Cross-Origin-Resource-Policy', 'cross-origin')
    
    // Content Security Policy — API returns JSON only, so 'none' for everything is correct.
    // The web app (middleware.ts) uses a richer CSP with per-request nonces for scripts/styles.
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
    // Note: 'none' is intentionally excluded — it's sent by direct navigation (bookmarks, address bar)
    // which never legitimately triggers a mutating request in our flows.
    if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
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
    // PDF.js can send byte-range requests cross-origin (`Range` header).
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Internal-Secret', 'Range'],
    // Expose range/size headers so the browser PDF client can read them.
    exposeHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Accept-Ranges',
      'Content-Length',
      'Content-Range',
      'Content-Type',
      'Content-Disposition',
      'ETag',
    ],
    maxAge: 600 // 10 minutes
  }
}
