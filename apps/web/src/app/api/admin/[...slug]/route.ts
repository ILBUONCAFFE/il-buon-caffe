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

async function proxyAdminRequest(
  req: NextRequest,
  slugs: string[],
  method: string,
): Promise<NextResponse> {
  // Read env vars at request time
  let API_ORIGIN = process.env.INTERNAL_API_URL
  let INTERNAL_SECRET = process.env.INTERNAL_API_SECRET
  let apiWorker: { fetch: typeof fetch } | undefined = undefined

  try {
    const cfCtx = await getCloudflareContext({ async: true })
    const env = cfCtx?.env as Record<string, any> | undefined
    API_ORIGIN = API_ORIGIN || env?.INTERNAL_API_URL || 'https://il-buon-caffe-api.ilbuoncaffe19.workers.dev'
    INTERNAL_SECRET = INTERNAL_SECRET || env?.INTERNAL_API_SECRET
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

  // 3. Build upstream URL — CF Worker mounts admin routes at /admin/*
  const path = slugs.join('/')
  const search = req.nextUrl.search
  const upstreamUrl = `${API_ORIGIN}/admin/${path}${search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Admin-Internal-Secret': INTERNAL_SECRET_STR,
    'X-Admin-User-Id': String(session.userId),
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text().catch(() => undefined)
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

  // Keep strict JSON guard for normal admin endpoints. Shipment labels are
  // binary PDF responses and must pass through as-is.
  if (upstreamRes.ok && !isJson && !isLabelEndpoint) {
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
