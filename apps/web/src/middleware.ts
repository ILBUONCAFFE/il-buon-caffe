import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ⚠️  WAŻNE DLA AGENTÓW AI / IMPORTANT FOR AI AGENTS ⚠️
// ─────────────────────────────────────────────────────────────────────────────
// Next.js 16 przemianował konwencję `middleware.ts` → `proxy.ts`.
// Ten plik (src/proxy.ts) to Edge runtime proxy — wymagany przez OpenNext/
// Cloudflare Workers. Działa TYLKO w Edge runtime (nie Node.js).
//
// ❌ NIE TWÓRZ src/middleware.ts — używaj tylko tego pliku (src/proxy.ts).
// ❌ DO NOT CREATE src/middleware.ts — this file (src/proxy.ts) IS the proxy.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Next.js Edge Middleware — auth guard + hardened security headers for /admin/* routes.
 *
 * Security layers applied here:
 * 1. IP Whitelist — block unknown IPs before any auth check (ADMIN_ALLOWED_IPS env var)
 * 2. Edge-level JWT verification — fast rejection before hitting Node.js runtime
 * 3. Hardened HTTP security headers on every admin response
 * 4. CSP with per-request nonce — prevents inline script injection (XSS)
 * 5. Cache-Control: no-store — admin responses never cached by browser/CDN
 * 6. Cross-Origin isolation headers (COOP, COEP, CORP)
 * 7. X-Request-ID for tracing suspicious requests in audit logs
 *
 * Defense in depth continues in:
 * - admin layout.tsx: Server Component session check + DB tokenVersion verify
 * - admin-auth.ts: DB lockout, CSRF origin check, audit logging
 */

// ─── IP Address Utilities ─────────────────────────────────────────────────────

/**
 * Parse an IPv4 CIDR string into [networkInt, maskInt].
 */
function parseCIDR(cidr: string): [number, number] | null {
  const [ip, prefix] = cidr.split('/');
  if (!ip) return null;
  const bits = prefix ? parseInt(prefix, 10) : 32;
  const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return [ipInt & mask, mask];
}

/**
 * Check if a raw IP string is within the allow-list.
 * Supports exact IPs and CIDR ranges (IPv4 only).
 */
function isIPAllowed(clientIP: string, allowList: string[]): boolean {
  if (!clientIP || allowList.length === 0) return true; // no list = allow all

  // Strip IPv6-mapped IPv4 prefix (::ffff:192.168.1.1)
  const rawIP = clientIP.replace(/^::ffff:/, '').trim();

  const ipParts = rawIP.split('.');
  if (ipParts.length !== 4) return false; // IPv6 not in list → deny
  const ipInt = ipParts.reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;

  for (const entry of allowList) {
    if (entry.includes('/')) {
      const parsed = parseCIDR(entry);
      if (parsed && (ipInt & parsed[1]) === parsed[0]) return true;
    } else {
      if (entry.trim() === rawIP) return true;
    }
  }
  return false;
}

// ─── Security Headers ─────────────────────────────────────────────────────────

/**
 * Build and attach hardened security headers.
 * @param response - NextResponse to mutate
 * @param nonce    - Per-request CSP nonce (base64 string)
 */
function addSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const h = response.headers;

  // ── Anti-clickjacking ──
  h.set('X-Frame-Options', 'DENY');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()',
  );
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Embedder-Policy', 'require-corp');
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  h.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  h.set('Pragma', 'no-cache');
  h.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",           // Required by Tailwind
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "worker-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  );

  return response;
}

// ─── Proxy / Edge Middleware ──────────────────────────────────────────────────
// NOTE: OpenNext/Cloudflare requires Edge Middleware (middleware.ts convention).
// Next.js 16 deprecated `middleware` in favour of `proxy`, but the new `proxy`
// runs on Node.js runtime which OpenNext does NOT support. Until OpenNext adds
// support for proxy.ts, we keep the `middleware` export name — Next.js 16 still
// accepts it (deprecation warning only, no build error).

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // ── Generate per-request nonce for CSP ──
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  // ── Generate request trace ID ──
  const requestId = crypto.randomUUID();

  // ─── IP Whitelist ────────────────────────────────────────────────────────
  const allowedIPs = (process.env.ADMIN_ALLOWED_IPS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedIPs.length > 0) {
    const clientIP =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      '';

    if (!isIPAllowed(clientIP, allowedIPs)) {
      console.warn(`[middleware] IP blocked: ${clientIP} — request ${requestId}`);
      // Return a generic 404 to avoid revealing that an admin panel exists
      return new NextResponse(null, { status: 404 });
    }
  }

  // ─── Login page — no auth required, just headers ─────────────────────────
  if (pathname === '/admin/login') {
    const res = NextResponse.next();
    res.headers.set('x-nonce', nonce);
    res.headers.set('x-request-id', requestId);
    return addSecurityHeaders(res, nonce);
  }

  // ─── Protected admin routes ───────────────────────────────────────────────
  const token = request.cookies.get('admin_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error('[middleware] ADMIN_JWT_SECRET not configured');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        issuer: 'ilbuoncaffe:admin',
        algorithms: ['HS256'],
      },
    );

    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // ── Pass nonce and request ID downstream so layout/pages can use them ──
    const res = NextResponse.next();
    res.headers.set('x-nonce', nonce);
    res.headers.set('x-request-id', requestId);
    return addSecurityHeaders(res, nonce);

  } catch {
    // Token expired or tampered — clear cookie + redirect
    const res = NextResponse.redirect(new URL('/admin/login', request.url));
    res.cookies.delete({ name: 'admin_session', path: '/' });
    return res;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
