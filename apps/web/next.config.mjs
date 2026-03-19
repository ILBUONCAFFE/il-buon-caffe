import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

// Security headers applied to all routes.
// Admin routes receive additional hardened headers (CSP nonce, HSTS, COOP/COEP/CORP)
// via the Edge middleware in src/proxy.ts — these values are intentionally overridden there.
const SECURITY_HEADERS = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Disallow embedding in iframes from other origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Limit referrer information sent to cross-origin destinations
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict access to powerful browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Prevent cross-origin information leaks for regular pages
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
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
    remotePatterns: [
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
    ],
  },
};

export default nextConfig;
