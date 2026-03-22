import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAdmin } from '../middleware/auth'

/**
 * ═══════════════════════════════════════════════════════════
 * UPLOADS ROUTER — Cloudflare R2
 * ═══════════════════════════════════════════════════════════
 *
 * POST /api/uploads/image
 *   → Upload pliku do R2, zwraca klucz i publiczny URL (po skonfigurowaniu domeny)
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
const ALLOWED_FOLDERS = ['dishes', 'products', 'banners'] as const
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif']
const MAX_SIZE_MB = 4

type Folder = typeof ALLOWED_FOLDERS[number]

const app = new Hono<{ Bindings: Env }>()

// ─────────────────────────────────────────────────────────
// POST /api/uploads/image
// Body: multipart/form-data — pole "file" + "folder"
// Wymaga: JWT admin
// ─────────────────────────────────────────────────────────
app.post('/image', requireAdmin(), async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) ?? 'products'

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
  if (sizeMB > MAX_SIZE_MB) {
    return c.json({ error: `Plik za duży. Maksymalna wielkość: ${MAX_SIZE_MB}MB` }, 413)
  }

  // Klucz: folder/timestamp-nazwa.ext
  const ext = file.name.split('.').pop() ?? 'webp'
  const safeName = file.name
    .replace(/\.[^.]+$/, '')                  // usuń rozszerzenie
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')             // znaki specjalne → myślnik
    .replace(/^-+|-+$/g, '')                  // obetnij krawędziowe myślniki
    .slice(0, 60)
  const key = `${folder}/${Date.now()}-${safeName}.${ext}`

  const buffer = await file.arrayBuffer()

  await c.env.IMAGES_BUCKET.put(key, buffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })

  return c.json({
    key,
    // Gdy będziesz miał domenę: `https://images.ilbuoncaffe.pl/${key}`
    // Na razie proxy przez ten endpoint:
    url: `/api/uploads/image/${key}`,
    size: file.size,
    type: file.type,
  }, 201)
})

// ─────────────────────────────────────────────────────────
// GET /api/uploads/image/:key — proxy dowolnego klucza R2
// Obsługuje: dishes/plik.png  ORAZ  Plik bez folderu.png
// ─────────────────────────────────────────────────────────
app.get('/image/:key{.+}', async (c) => {
  const key = c.req.param('key')   // Hono automatycznie dekoduje %20, %C3%B3 itp.

  const object = await c.env.IMAGES_BUCKET.get(key)
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
app.delete('/image/:key{.+}', requireAdmin(), async (c) => {
  const key = c.req.param('key')!
  await c.env.IMAGES_BUCKET.delete(key)
  return c.json({ deleted: key })
})

// ─────────────────────────────────────────────────────────
// GET /api/uploads/list/:folder — lista plików w folderze
// ─────────────────────────────────────────────────────────
app.get('/list/:folder', requireAdmin(), async (c) => {
  const { folder } = c.req.param()

  if (!ALLOWED_FOLDERS.includes(folder as Folder)) {
    return c.json({ error: 'Niedozwolony folder' }, 400)
  }

  const listed = await c.env.IMAGES_BUCKET.list({ prefix: `${folder}/`, limit: 200 })
  const files = listed.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
    url: `/api/uploads/image/${obj.key}`,
  }))

  return c.json({ folder, count: files.length, files })
})

export { app as uploadsRouter }
