/**
 * Next.js API Route — Allegro Admin Proxy
 *
 * Purpose:
 *   Bridges the gap between the web admin's `admin_session` cookie auth
 *   and the Cloudflare Worker API's separate JWT auth system.
 *
 * Flow:
 *   Browser → /api/admin/allegro/[...slug]  (same-origin, cookie forwarded)
 *      ↓
 *   This handler verifies the admin session via `getAdminSession()`
 *      ↓
 *   Forwards the request to the CF Worker with `X-Admin-Internal-Secret` header
 *      ↓
 *   CF Worker accepts the pre-shared secret as an alternative to JWT auth
 *
 * Security:
 *   - Never forwards to the CF Worker without a valid admin session
 *   - `INTERNAL_API_SECRET` must be a strong random value (≥32 chars)
 *   - The CF Worker validates the secret before processing any allegro routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/jwt'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// ── Shared proxy logic ────────────────────────────────────────────────────────

async function proxyAllegroRequest(
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
    console.error('[allegro proxy] INTERNAL_API_URL is not configured')
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'INTERNAL_API_URL not configured' } },
      { status: 503 },
    )
  }

  const INTERNAL_SECRET_STR = INTERNAL_SECRET ?? ''

  // Verify the admin session server-side
  let session = null
  let sessionError: unknown = null
  try {
    session = await getAdminSession()
  } catch (e) {
    sessionError = e
  }
  console.log('[allegro proxy] session result:', session ? `userId=${session.userId}` : 'null', sessionError ? `error=${String(sessionError)}` : '')
  console.log('[allegro proxy] env check — ADMIN_JWT_SECRET set:', !!process.env.ADMIN_JWT_SECRET, '| DATABASE_URL set:', !!process.env.DATABASE_URL)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Admin session required' } },
      { status: 401 },
    )
  }

  if (!INTERNAL_SECRET_STR) {
    console.error('[allegro proxy] INTERNAL_API_SECRET is not configured')
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'Internal secret not configured' } },
      { status: 503 },
    )
  }

  const path = slugs.join('/')
  const search = req.nextUrl.search
  const upstreamUrl = `${API_ORIGIN}/api/admin/allegro/${path}${search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Admin-Internal-Secret': INTERNAL_SECRET_STR,
    'X-Admin-User-Id': String(session.userId),
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text().catch(() => undefined)
  }

  let upstreamRes: Response
  try {
    const fetcher = apiWorker && typeof apiWorker.fetch === 'function' ? apiWorker.fetch.bind(apiWorker) : fetch

    upstreamRes = await fetcher(upstreamUrl, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
    })
  } catch (err) {
    console.error('[allegro proxy] Upstream fetch error:', err)
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Could not reach API' } },
      { status: 502 },
    )
  }

  const contentType = upstreamRes.headers.get('Content-Type') ?? 'application/json'
  const responseBody = await upstreamRes.text()

  // Guard: if upstream returned non-JSON (e.g. Cloudflare HTML error page), surface a proper error
  if (!contentType.includes('application/json')) {
    console.error(
      `[allegro proxy] Upstream returned non-JSON content-type "${contentType}" with status ${upstreamRes.status} for ${upstreamUrl}`,
    )
    return NextResponse.json(
      { error: { code: 'UPSTREAM_INVALID_RESPONSE', message: `Błąd API (HTTP ${upstreamRes.status})` } },
      { status: 502 },
    )
  }

  return new NextResponse(responseBody, {
    status: upstreamRes.status,
    headers: { 'Content-Type': contentType },
  })
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAllegroRequest(req, slug, 'GET')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAllegroRequest(req, slug, 'POST')
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAllegroRequest(req, slug, 'PUT')
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyAllegroRequest(req, slug, 'DELETE')
}
