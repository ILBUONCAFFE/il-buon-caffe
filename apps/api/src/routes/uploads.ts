import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { products } from '@repo/db/schema'
import type { Env } from '../index'
import { requireAdminOrProxy } from '../middleware/auth'
import { sanitize } from '../lib/sanitize'

/**
 * ═══════════════════════════════════════════════════════════
 * UPLOADS ROUTER — Cloudflare R2
 * ═══════════════════════════════════════════════════════════
 *
 * POST /api/uploads/image
 *   → Upload pliku do R2, zwraca klucz i publiczny URL (po skonfigurowaniu domeny)
 *   → Dla folderu "products" można podać "productSku" — wtedy URL jest zapisywany do Neon DB
 *
 * GET  /api/uploads/image/:key
 *   → Pobierz plik z R2 (proxy — bucket jest prywatny)
 *
 * DELETE /api/uploads/image/:key
 *   → Usuń plik z R2 (tylko admin)
 *
 * Foldery:
 *   dishes/    – zdjęcia talerzy (food pairing)
 *   products/  – zdjęcia butelek/produktów
 *   banners/   – banery CMS
 * ═══════════════════════════════════════════════════════════
 */

// Dozwolone foldery i typy plików
const ALLOWED_FOLDERS = ['dishes', 'products', 'banners', 'catalogs'] as const
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'application/pdf']
const PUBLIC_READ_PREFIXES = ['products/', 'dishes/', 'banners/'] as const
const MAX_SIZE_MB = 4
const MAX_PDF_SIZE_MB = 20
const DEFAULT_MEDIA_PUBLIC_URL = 'https://media.ilbuoncaffe.pl'

type Folder = typeof ALLOWED_FOLDERS[number]

const app = new Hono<{ Bindings: Env }>()

function encodeR2KeyForUrl(key: string): string {
  return key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function getMediaPublicBaseUrl(c: { env: Env }): string {
  return (c.env.MEDIA_PUBLIC_URL || DEFAULT_MEDIA_PUBLIC_URL).replace(/\/+$/, '')
}

function buildProxyUrl(key: string): string {
  return `/api/uploads/image/${encodeR2KeyForUrl(key)}`
}

function buildPublicMediaUrl(c: { env: Env }, key: string): string {
  return `${getMediaPublicBaseUrl(c)}/${encodeR2KeyForUrl(key)}`
}

function appendVersionQuery(url: string, version: number): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${version}`
}

function isPublicReadableKey(key: string): boolean {
  return PUBLIC_READ_PREFIXES.some((prefix) => key.startsWith(prefix))
}

// ─────────────────────────────────────────────────────────
// POST /api/uploads/image
// Body: multipart/form-data — pole "file" + "folder"
// Wymaga: admin (JWT lub Next.js proxy z internal secret)
// ─────────────────────────────────────────────────────────
app.post('/image', requireAdminOrProxy(), async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) ?? 'products'
  const productSku = sanitize(formData.get('productSku'), 50).toUpperCase()
  const shouldPersistProductUrl = folder === 'products' && !!productSku

  if (!file) {
    return c.json({ error: 'Brak pliku w polu "file"' }, 400)
  }

  if (!ALLOWED_FOLDERS.includes(folder as Folder)) {
    return c.json({ error: `Niedozwolony folder. Dozwolone: ${ALLOWED_FOLDERS.join(', ')}` }, 400)
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: `Niedozwolony typ pliku. Dozwolone: webp, jpeg, png, avif` }, 400)
  }

  const sizeMB = file.size / (1024 * 1024)
  const maxSize = file.type === 'application/pdf' ? MAX_PDF_SIZE_MB : MAX_SIZE_MB
  if (sizeMB > maxSize) {
    return c.json({ error: `Plik za duży. Maksymalna wielkość: ${maxSize}MB` }, 413)
  }

  const extFromType = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
  const ext = (file.name.split('.').pop() || extFromType || 'webp').toLowerCase()
  const safeName = file.name
    .replace(/\.[^.]+$/, '')                  // usuń rozszerzenie
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')             // znaki specjalne → myślnik
    .replace(/^-+|-+$/g, '')                  // obetnij krawędziowe myślniki
    .slice(0, 60)
  const uploadVersion = Date.now()
  let key = `${folder}/${uploadVersion}-${safeName}.${ext}`

  const db = c.get('db')
  let productSlugForCache: string | null = null
  if (shouldPersistProductUrl) {
    const product = await db.query.products.findFirst({
      columns: { sku: true, slug: true },
      where: eq(products.sku, productSku),
    })

    if (!product) {
      return c.json({ error: `Produkt SKU '${productSku}' nie istnieje` }, 404)
    }

    // Stabilny klucz oparty o SKU — zmiana nazwy/slugu produktu nie łamie URL obrazka.
    key = `products/${productSku.toLowerCase()}/main.${ext}`
    productSlugForCache = product.slug
  }

  const uploadBucket = folder === 'catalogs' ? c.env.CATALOGS_BUCKET : c.env.MEDIA_BUCKET
  const buffer = await file.arrayBuffer()

  await uploadBucket.put(key, buffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })

  const proxyUrl = buildProxyUrl(key)
  const baseUrl = folder === 'catalogs' ? proxyUrl : buildPublicMediaUrl(c, key)
  const url = shouldPersistProductUrl ? appendVersionQuery(baseUrl, uploadVersion) : baseUrl

  if (shouldPersistProductUrl) {
    try {
      await db
        .update(products)
        .set({ imageUrl: url, updatedAt: new Date() })
        .where(eq(products.sku, productSku))
    } catch (error) {
      // Nie zostawiaj osieroconego pliku, jeśli zapis URL do DB się nie powiedzie.
      await uploadBucket.delete(key).catch(() => undefined)
      console.error('[uploads] failed to persist imageUrl in DB', error)
      return c.json({ error: 'Nie udało się zapisać URL zdjęcia w bazie' }, 500)
    }

    if (c.env.ALLEGRO_KV) {
      c.executionCtx.waitUntil(
        Promise.all([
          c.env.ALLEGRO_KV.delete(`product:static:${productSku.toLowerCase()}`),
          productSlugForCache ? c.env.ALLEGRO_KV.delete(`product:static:${productSlugForCache}`) : Promise.resolve(),
        ])
      )
    }
  }

  return c.json({
    key,
    // Dla media zwracamy publiczny URL CDN; proxy zostaje jako fallback.
    url,
    proxyUrl,
    bucket: folder === 'catalogs' ? 'catalogs' : 'media',
    productSku: shouldPersistProductUrl ? productSku : undefined,
    persistedInDb: shouldPersistProductUrl,
    size: file.size,
    type: file.type,
  }, 201)
})

// ─────────────────────────────────────────────────────────
// GET /api/uploads/image/:key — public proxy for explicitly public media keys.
// ─────────────────────────────────────────────────────────
app.get('/image/:key{.+}', async (c) => {
  const key = c.req.param('key')   // Hono automatycznie dekoduje %20, %C3%B3 itp.

  if (!isPublicReadableKey(key)) {
    return c.json({ error: 'Plik nie znaleziony' }, 404)
  }

  // New uploads are in MEDIA_BUCKET. IMAGES_BUCKET is kept as legacy fallback.
  const object = (await c.env.MEDIA_BUCKET.get(key)) || (await c.env.IMAGES_BUCKET.get(key))
  if (!object) {
    return c.json({ error: 'Plik nie znaleziony' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

// ─────────────────────────────────────────────────────────
// DELETE /api/uploads/image/:key
// ─────────────────────────────────────────────────────────
app.delete('/image/:key{.+}', requireAdminOrProxy(), async (c) => {
  const key = c.req.param('key')!
  // Delete in both buckets to support mixed legacy/new storage.
  await Promise.allSettled([
    c.env.MEDIA_BUCKET.delete(key),
    c.env.IMAGES_BUCKET.delete(key),
    c.env.CATALOGS_BUCKET.delete(key),
  ])
  return c.json({ deleted: key })
})

// ─────────────────────────────────────────────────────────
// GET /api/uploads/list/:folder — lista plików w folderze
// ─────────────────────────────────────────────────────────
app.get('/list/:folder', requireAdminOrProxy(), async (c) => {
  const { folder } = c.req.param()

  if (!ALLOWED_FOLDERS.includes(folder as Folder)) {
    return c.json({ error: 'Niedozwolony folder' }, 400)
  }

  const prefix = `${folder}/`
  const files: Array<{
    key: string
    size: number
    uploaded: Date
    url: string
    source: 'media' | 'images-legacy' | 'catalogs'
  }> = []
  const seen = new Set<string>()

  if (folder === 'catalogs') {
    const listed = await c.env.CATALOGS_BUCKET.list({ prefix, limit: 200 })
    for (const obj of listed.objects) {
      files.push({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        url: buildProxyUrl(obj.key),
        source: 'catalogs',
      })
    }
  } else {
    const [mediaListed, legacyListed] = await Promise.all([
      c.env.MEDIA_BUCKET.list({ prefix, limit: 200 }),
      c.env.IMAGES_BUCKET.list({ prefix, limit: 200 }),
    ])

    for (const obj of mediaListed.objects) {
      seen.add(obj.key)
      files.push({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        url: buildPublicMediaUrl(c, obj.key),
        source: 'media',
      })
    }

    for (const obj of legacyListed.objects) {
      if (seen.has(obj.key)) continue
      files.push({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        url: buildProxyUrl(obj.key),
        source: 'images-legacy',
      })
    }
  }

  return c.json({ folder, count: files.length, files })
})

export { app as uploadsRouter }
