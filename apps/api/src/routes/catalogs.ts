import { Hono } from 'hono'
import type { Env } from '../index'
import { catalogs } from '@repo/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAdmin } from '../middleware/auth'

/**
 * ═══════════════════════════════════════════════════════════
 * CATALOGS ROUTER — PDF Flipbook Catalogs
 * ═══════════════════════════════════════════════════════════
 *
 * GET  /api/catalogs/:slug      → Publiczny — metadane katalogu
 * GET  /api/catalogs/:slug/pdf  → Publiczny — stream PDF z R2
 * POST /api/catalogs            → Admin — utwórz katalog
 * DELETE /api/catalogs/:id      → Admin — usuń katalog
 *
 * Bezpieczeństwo: dostęp przez nieodgadnialny UUID slug.
 * Brak auth na GET — kto ma link, ten widzi.
 * ═══════════════════════════════════════════════════════════
 */

const app = new Hono<{ Bindings: Env }>()

// ─────────────────────────────────────────────────────────
// GET /api/catalogs/:slug — metadane katalogu (publiczny)
// ─────────────────────────────────────────────────────────
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = c.get('db')

  const [catalog] = await db
    .select({
      id: catalogs.id,
      name: catalogs.name,
      slug: catalogs.slug,
      r2Key: catalogs.r2Key,
      pageCount: catalogs.pageCount,
      createdAt: catalogs.createdAt,
    })
    .from(catalogs)
    .where(and(eq(catalogs.slug, slug), eq(catalogs.isActive, true)))
    .limit(1)

  if (!catalog) {
    return c.json({ error: 'Katalog nie znaleziony' }, 404)
  }

  return c.json({
    data: {
      ...catalog,
      pdfUrl: `/api/catalogs/${slug}/pdf`,
    }
  })
})

// ─────────────────────────────────────────────────────────
// GET /api/catalogs/:slug/pdf — stream PDF z R2 (publiczny)
// ─────────────────────────────────────────────────────────
app.get('/:slug/pdf', async (c) => {
  const slug = c.req.param('slug')
  const db = c.get('db')

  const [catalog] = await db
    .select({ r2Key: catalogs.r2Key })
    .from(catalogs)
    .where(and(eq(catalogs.slug, slug), eq(catalogs.isActive, true)))
    .limit(1)

  if (!catalog) {
    return c.json({ error: 'Katalog nie znaleziony' }, 404)
  }

  // Forward incoming Range headers to R2 so PDF.js can stream by byte ranges.
  const object = await c.env.CATALOGS_BUCKET.get(catalog.r2Key, {
    range: c.req.raw.headers,
  })
  if (!object) {
    return c.json({ error: 'Plik PDF nie znaleziony w storage' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('content-type', 'application/pdf')
  headers.set('cache-control', 'public, max-age=86400')
  // Zapobiegaj pobieraniu — wyświetl inline
  headers.set('content-disposition', 'inline')
  headers.set('accept-ranges', 'bytes')

  const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined
  if (range) {
    let start = 0
    let end = Math.max(0, object.size - 1)

    if (typeof range.suffix === 'number') {
      const suffix = Math.max(0, Math.min(range.suffix, object.size))
      start = object.size - suffix
    } else if (typeof range.offset === 'number') {
      start = Math.max(0, range.offset)
      if (typeof range.length === 'number') {
        end = Math.min(object.size - 1, start + range.length - 1)
      }
    }

    const partialLength = Math.max(0, end - start + 1)
    headers.set('content-range', `bytes ${start}-${end}/${object.size}`)
    headers.set('content-length', String(partialLength))
    return new Response(object.body, { status: 206, headers })
  }

  headers.set('content-length', String(object.size))

  return new Response(object.body, { headers })
})

// ─────────────────────────────────────────────────────────
// POST /api/catalogs — utwórz nowy katalog (admin)
// Body JSON: { name, r2Key, pageCount? }
// ─────────────────────────────────────────────────────────
function generateCatalogSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const token = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return `${base}-${token}`
}

app.post('/', requireAdmin(), async (c) => {
  const body = await c.req.json<{ name: string; r2Key: string; pageCount?: number }>()

  if (!body.name || !body.r2Key) {
    return c.json({ error: 'Wymagane pola: name, r2Key' }, 400)
  }

  const db = c.get('db')
  const slug = generateCatalogSlug(body.name)

  const [catalog] = await db.insert(catalogs).values({
    name: body.name,
    slug,
    r2Key: body.r2Key,
    pageCount: body.pageCount ?? null,
  }).returning()

  return c.json({
    data: {
      ...catalog,
      url: `/katalogi/${catalog.slug}`,
    }
  }, 201)
})

// ─────────────────────────────────────────────────────────
// DELETE /api/catalogs/:id — usuń katalog (admin)
// ─────────────────────────────────────────────────────────
app.delete('/:id', requireAdmin(), async (c) => {
  const id = parseInt(c.req.param('id') ?? '', 10)
  if (isNaN(id)) return c.json({ error: 'Nieprawidłowe ID' }, 400)

  const db = c.get('db')

  // Soft-delete — deaktywacja
  const [updated] = await db
    .update(catalogs)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(catalogs.id, id))
    .returning()

  if (!updated) return c.json({ error: 'Katalog nie znaleziony' }, 404)

  return c.json({ data: { deleted: true, id } })
})

export { app as catalogsRouter }
