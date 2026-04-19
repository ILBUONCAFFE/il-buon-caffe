import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const API_ORIGIN_FALLBACK = 'https://il-buon-caffe-api.ilbuoncaffe19.workers.dev'

function buildUpstreamPath(slugs: string[]): string {
  return slugs.map((segment) => encodeURIComponent(segment)).join('/')
}

async function proxyCatalogRequest(
  req: NextRequest,
  slugs: string[],
  method: 'GET' | 'HEAD',
): Promise<NextResponse> {
  let apiOrigin = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || API_ORIGIN_FALLBACK
  let apiWorker: { fetch: typeof fetch } | undefined

  try {
    const cfCtx = await getCloudflareContext({ async: true })
    const env = cfCtx?.env as Record<string, any> | undefined
    apiOrigin = env?.INTERNAL_API_URL || apiOrigin
    apiWorker = env?.API_WORKER
  } catch {
    // Local dev fallback
  }

  const normalizedOrigin = apiOrigin.replace(/\/+$/, '')
  const path = buildUpstreamPath(slugs)
  const upstreamUrl = `${normalizedOrigin}/api/catalogs/${path}${req.nextUrl.search}`

  const forwardedHeaders = new Headers()
  for (const name of ['accept', 'range', 'if-none-match', 'if-modified-since']) {
    const value = req.headers.get(name)
    if (value) forwardedHeaders.set(name, value)
  }

  let upstreamRes: Response
  try {
    const fetcher = apiWorker && typeof apiWorker.fetch === 'function' ? apiWorker.fetch.bind(apiWorker) : fetch
    upstreamRes = await fetcher(new Request(upstreamUrl, { method, headers: forwardedHeaders }))
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Could not reach catalogs API' } },
      { status: 502 },
    )
  }

  const responseHeaders = new Headers()
  for (const name of [
    'content-type',
    'content-disposition',
    'content-length',
    'cache-control',
    'etag',
    'accept-ranges',
    'content-range',
    'last-modified',
  ]) {
    const value = upstreamRes.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyCatalogRequest(req, slug, 'GET')
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  return proxyCatalogRequest(req, slug, 'HEAD')
}
