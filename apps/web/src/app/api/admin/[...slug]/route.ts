/**
 * Next.js API Route — General Admin API Proxy
 *
 * Handles ALL admin API calls except Allegro, which has its own proxy at
 * /api/admin/allegro/[...slug]/route.ts (Next.js matches more-specific paths first).
 *
 * Flow:
 *   Browser → /api/admin/[...slug]   (same-origin — admin_session cookie sent)
 *      ↓
 *   Verifies admin session server-side via getAdminSession()
 *      ↓
 *   Forwards to CF Worker: ${API_ORIGIN}/admin/${slug}
 *   with X-Admin-Internal-Secret header (accepted by requireAdminOrProxy())
 *
 * This keeps the two auth systems isolated:
 *   Web/Next.js → ADMIN_JWT_SECRET  (admin_session httpOnly cookie)
 *   CF Worker   → JWT_ACCESS_SECRET (Bearer token) OR X-Admin-Internal-Secret
 *
 * The client-side adminApiClient sends credentials:'include' so the cookie
 * reaches this proxy route, but never touches the CF Worker directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/jwt'
import { revalidateTag } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// ── Shared proxy logic ────────────────────────────────────────────────────────

function addOriginWithVariants(value: string | null | undefined, origins: Set<string>): void {
  if (!value) return

  try {
    const parsed = value.includes('://') ? new URL(value) : new URL(`https://${value}`)
    origins.add(parsed.origin)

    if (parsed.hostname.startsWith('www.')) {
      const bare = parsed.hostname.slice(4)
      origins.add(`${parsed.protocol}//${bare}${parsed.port ? `:${parsed.port}` : ''}`)
    } else if (parsed.hostname.includes('.')) {
      origins.add(`${parsed.protocol}//www.${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`)
    }
  } catch {
    // Ignore malformed deployment config.
  }
}

function isAllowedMutationOrigin(req: NextRequest, method: string, siteUrl?: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

  const allowedOrigins = new Set<string>()
  addOriginWithVariants(siteUrl, allowedOrigins)
  addOriginWithVariants(req.nextUrl.origin, allowedOrigins)

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  let effectiveOrigin = origin
  if (!effectiveOrigin && referer) {
    try {
      effectiveOrigin = new URL(referer).origin
    } catch {
      effectiveOrigin = null
    }
  }

  return !!effectiveOrigin && allowedOrigins.has(effectiveOrigin)
}

async function proxyAdminRequest(
  req: NextRequest,
  slugs: string[],
  method: string,
): Promise<NextResponse> {
  // Read env vars at request time
  let API_ORIGIN = process.env.INTERNAL_API_URL
  let INTERNAL_SECRET = process.env.INTERNAL_API_SECRET
  let SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  let apiWorker: { fetch: typeof fetch } | undefined = undefined

  try {
    const cfCtx = await getCloudflareContext({ async: true })
    const env = cfCtx?.env as Record<string, any> | undefined
    API_ORIGIN = API_ORIGIN || env?.INTERNAL_API_URL || 'https://il-buon-caffe-api.ilbuoncaffe19.workers.dev'
    INTERNAL_SECRET = INTERNAL_SECRET || env?.INTERNAL_API_SECRET
    SITE_URL = SITE_URL || env?.NEXT_PUBLIC_SITE_URL
    apiWorker = env?.API_WORKER
  } catch (e) {
    // Local dev or setup issue — API_ORIGIN fallback only; no secret fallback
    API_ORIGIN = API_ORIGIN || 'https://il-buon-caffe-api.ilbuoncaffe19.workers.dev'
  }

  if (!API_ORIGIN) {
    console.error('[admin proxy] INTERNAL_API_URL is not configured')
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'INTERNAL_API_URL not configured' } },
      { status: 503 },
    )
  }

  const INTERNAL_SECRET_STR = INTERNAL_SECRET ?? ''

  // 1. Verify admin session server-side
  const session = await getAdminSession().catch(() => null)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Admin session required' } },
      { status: 401 },
    )
  }

  // 2. Guard against misconfiguration
  if (!INTERNAL_SECRET_STR) {
    console.error('[admin proxy] INTERNAL_API_SECRET is not configured')
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'Internal secret not configured' } },
      { status: 503 },
    )
  }

  if (!isAllowedMutationOrigin(req, method, SITE_URL)) {
    return NextResponse.json(
      { error: { code: 'CSRF_BLOCKED', message: 'Request origin not allowed' } },
      { status: 403 },
    )
  }

  // 3. Build upstream URL — CF Worker mounts admin routes at /admin/*
  const path = slugs.join('/')
  const search = req.nextUrl.search
  const upstreamUrl = `${API_ORIGIN}/admin/${path}${search}`

  const headers: Record<string, string> = {
    'X-Admin-Internal-Secret': INTERNAL_SECRET_STR,
    'X-Admin-User-Id': String(session.userId),
  }

  const incomingContentType = req.headers.get('content-type')
  if (incomingContentType) {
    headers['Content-Type'] = incomingContentType
  }

  let body: ArrayBuffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const rawBody = await req.arrayBuffer().catch(() => undefined)
    if (rawBody && rawBody.byteLength > 0) {
      body = rawBody
    }
  }

  // 4. Forward to CF Worker
  let upstreamRes: Response
  try {
    const fetcher = apiWorker && typeof apiWorker.fetch === 'function' ? apiWorker.fetch.bind(apiWorker) : fetch

    upstreamRes = await fetcher(upstreamUrl, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
    })
  } catch (err) {
    console.error('[admin proxy] Upstream fetch error:', err)
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Could not reach API' } },
      { status: 502 },
    )
  }

  // 5. Pass response back transparently
  const contentType = upstreamRes.headers.get('Content-Type') ?? 'application/json'
  const isJson = contentType.includes('application/json')
  const isLabelEndpoint = slugs.length === 3 && slugs[0] === 'orders' && slugs[2] === 'label'
  const isShippingBinaryEndpoint = slugs.length === 2 && slugs[0] === 'shipping' && slugs[1] === 'protocol'

  // Keep strict JSON guard for normal admin endpoints. Shipment labels are
  // binary PDF responses and must pass through as-is.
  if (upstreamRes.ok && !isJson && !isLabelEndpoint && !isShippingBinaryEndpoint) {
    console.error(
      `[admin proxy] Upstream returned non-JSON content-type "${contentType}" with status ${upstreamRes.status} for ${upstreamUrl}`,
    )
    return NextResponse.json(
      { error: { code: 'UPSTREAM_INVALID_RESPONSE', message: 'API returned an unexpected non-JSON response' } },
      { status: 502 },
    )
  }

  // 6. Invalidate product/category caches on successful mutations
  if (upstreamRes.ok && method !== 'GET' && method !== 'HEAD') {
    const route = slugs[0]
    if (route === 'products') {
      revalidateTag('products', { expire: 0 })
    }
    if (route === 'uploads') {
      revalidateTag('products', { expire: 0 })
    }
    if (route === 'content' && slugs[1] === 'product' && slugs[2]) {
      revalidateTag(`product-content:${slugs[2]}`, { expire: 0 })
    }
    if (route === 'categories') {
      revalidateTag('categories', { expire: 0 })
      revalidateTag('products', { expire: 0 }) // category changes affect product listings
    }
  }

  if (isJson || !upstreamRes.ok) {
    const responseBody = await upstreamRes.text()
    return new NextResponse(responseBody, {
      status: upstreamRes.status,
      headers: { 'Content-Type': contentType },
    })
  }

  const responseHeaders = new Headers({ 'Content-Type': contentType })
  const disposition = upstreamRes.headers.get('Content-Disposition')
  if (disposition) responseHeaders.set('Content-Disposition', disposition)

  const contentLength = upstreamRes.headers.get('Content-Length')
  if (contentLength) responseHeaders.set('Content-Length', contentLength)

  const responseBody = await upstreamRes.arrayBuffer()
  if (!contentLength) responseHeaders.set('Content-Length', String(responseBody.byteLength))

  return new NextResponse(responseBody, {
    status: upstreamRes.status,
    headers: responseHeaders,
  })
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAdminRequest(req, slug, 'GET')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAdminRequest(req, slug, 'POST')
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAdminRequest(req, slug, 'PUT')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAdminRequest(req, slug, 'PATCH')
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAdminRequest(req, slug, 'DELETE')
}
