import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
const R2_MEDIA_URL = process.env.NEXT_PUBLIC_R2_MEDIA_URL

const parseRemotePatternFromUrl = (urlValue) => {
  if (!urlValue) {
    return null
  }

  try {
    const parsed = new URL(urlValue)
    const protocol = parsed.protocol.replace(':', '')

    if (protocol !== 'http' && protocol !== 'https') {
      return null
    }

    return {
      protocol,
      hostname: parsed.hostname,
      pathname: '/**',
    }
  } catch {
    return null
  }
}

const IMAGE_REMOTE_PATTERNS = [
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'plus.unsplash.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'barahonda.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'media.ilbuoncaffe.pl',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'il-buon-caffe-media-dev.r2.cloudflarestorage.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'il-buon-caffe-media.r2.cloudflarestorage.com',
    pathname: '/**',
  },
]

const envMediaPattern = parseRemotePatternFromUrl(R2_MEDIA_URL)

if (
  envMediaPattern &&
  !IMAGE_REMOTE_PATTERNS.some(
    pattern =>
      pattern.protocol === envMediaPattern.protocol &&
      pattern.hostname === envMediaPattern.hostname
  )
) {
  IMAGE_REMOTE_PATTERNS.push(envMediaPattern)
}

// Security headers applied to all routes.
// Admin routes receive additional hardened headers (CSP nonce, COOP/COEP/CORP)
// via the Edge middleware in src/middleware.ts — these values are intentionally overridden there.
//
// NOTE on CSP: next.config.mjs headers are static (no per-request nonce), so
// script-src must use 'unsafe-inline' (required by Next.js hydration scripts).
// Admin routes override this with a strict nonce-based CSP via middleware.
const IS_DEV = process.env.NODE_ENV === 'development'

const SECURITY_HEADERS = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Disallow embedding in iframes
  { key: 'X-Frame-Options', value: 'DENY' },
  // Limit referrer information sent to cross-origin destinations
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict access to powerful browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Prevent cross-origin information leaks for regular pages
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // Enforce HTTPS — only in production (HSTS on http://localhost breaks local dev)
  ...(!IS_DEV ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
  // XSS mitigation for storefront pages (admin routes override with nonce-based CSP)
  // 'unsafe-inline' is required — Next.js injects inline hydration scripts
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://static.cloudflareinsights.com",
      "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
      "font-src 'self' data:",
      "connect-src 'self' https: https://www.google-analytics.com https://*.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://tagassistant.google.com https://cloudflareinsights.com",
      "worker-src 'self' blob:",
      "frame-src https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  async headers() {
    return [
      {
        // Apply to every route
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async rewrites() {
    // IMPORTANT: Do NOT use a catch-all /api/:path* rewrite.
    // In Next.js 16 / Turbopack, afterFiles rewrites can fire before app/api/*
    // route handlers are resolved — a wildcard would forward /api/admin/* directly
    // to the CF Worker, bypassing the Next.js admin proxy (src/app/api/admin/).
    //
    // Instead, explicitly enumerate only the public CF Worker route prefixes.
    // /api/admin/* is intentionally absent — those are handled by route handlers:
    //   src/app/api/admin/allegro/[...slug]/route.ts  (Allegro proxy)
    //   src/app/api/admin/[...slug]/route.ts           (General admin proxy)
    const CF_ROUTES = [
      '/api/auth',
      '/api/products',
      '/api/categories',
      '/api/orders',
      '/api/user',
      '/api/legal',
      '/api/payments',
      '/api/webhooks',
      '/api/uploads',
      '/api/catalogs',
    ]

    return {
      afterFiles: [
        // Forward public CF Worker routes
        ...CF_ROUTES.map(prefix => ({
          source: `${prefix}/:path*`,
          destination: `${API_ORIGIN}${prefix}/:path*`,
        })),
        // Health check (no sub-path)
        { source: '/health', destination: `${API_ORIGIN}/health` },
      ],
    }
  },
  turbopack: {
    // Point Turbopack at the monorepo root so it can resolve all packages.
    // Used only by `next dev` — cf:build forces webpack via open-next.config.ts.
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    remotePatterns: IMAGE_REMOTE_PATTERNS,
  },
};

export default nextConfig;
