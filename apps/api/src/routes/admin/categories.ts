import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { categories, products, auditLog } from '@repo/db/schema'
import { eq, and, asc, desc, sql, count } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import type { Env } from '../../index'
import type { CategoryLayoutConfig } from '@repo/db/schema'

const MAX_BODY = 20_000

function sanitize(raw: unknown, max = 255): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, max)
}

function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const adminCategoriesRouter = new Hono<{ Bindings: Env }>()
adminCategoriesRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/categories  🛡️
// All categories including inactive
// ============================================
adminCategoriesRouter.get('/', async (c) => {
  try {
    const db = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)

    const rows = await db
      .select({
        id:           categories.id,
        name:         categories.name,
        slug:         categories.slug,
        description:  categories.description,
        imageUrl:     categories.imageUrl,
        layoutConfig: categories.layoutConfig,
        isActive:     categories.isActive,
        sortOrder:    categories.sortOrder,
        createdAt:    categories.createdAt,
        productCount: count(products.sku),
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id, categories.name, categories.slug, categories.description,
               categories.imageUrl, categories.layoutConfig, categories.isActive,
               categories.sortOrder, categories.createdAt)
      .orderBy(asc(categories.sortOrder))

    return c.json({ success: true, data: rows })
  } catch (err) {
    console.error('GET /admin/categories error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// POST /admin/categories  🛡️
// Create category
// ============================================
adminCategoriesRouter.post('/', async (c) => {
  try {
    const contentLength = parseInt(c.req.header('Content-Length') || '0', 10)
    if (contentLength > MAX_BODY) return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)

    const db   = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const body = await c.req.json<{
      name: string; description?: string; imageUrl?: string
      layoutConfig?: CategoryLayoutConfig; isActive?: boolean; sortOrder?: number
    }>()

    const name = sanitize(body.name, 255)
    if (!name) return c.json({ error: 'Nazwa kategorii jest wymagana' }, 400)

    const [cat] = await db.insert(categories).values({
      name,
      slug:         slugify(name),
      description:  sanitize(body.description || '', 2000) || null,
      imageUrl:     sanitize(body.imageUrl    || '', 500)  || null,
      layoutConfig: body.layoutConfig ?? null,
      isActive:     body.isActive  ?? true,
      sortOrder:    body.sortOrder ?? 0,
    }).returning()

    return c.json({ success: true, data: cat }, 201)
  } catch (err: any) {
    if (err?.code === '23505') return c.json({ error: 'Slug już istnieje' }, 409)
    console.error('POST /admin/categories error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// PUT /admin/categories/:id  🛡️
// Update category
// ============================================
adminCategoriesRouter.put('/:id', async (c) => {
  try {
    const contentLength = parseInt(c.req.header('Content-Length') || '0', 10)
    if (contentLength > MAX_BODY) return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)

    const db  = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const id  = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'Nieprawidłowe ID' }, 400)

    const body = await c.req.json<Partial<{
      name: string; description: string; imageUrl: string | null
      layoutConfig: CategoryLayoutConfig; isActive: boolean; sortOrder: number
    }>>()

    const setCols: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined)         { setCols.name = sanitize(body.name, 255); setCols.slug = slugify(body.name) }
    if (body.description !== undefined)  setCols.description  = sanitize(body.description, 2000) || null
    if (body.imageUrl !== undefined)     setCols.imageUrl     = sanitize(body.imageUrl || '', 500) || null
    if (body.layoutConfig !== undefined) setCols.layoutConfig = body.layoutConfig
    if (body.isActive !== undefined)     setCols.isActive     = body.isActive
    if (body.sortOrder !== undefined)    setCols.sortOrder    = body.sortOrder

    const [updated] = await db.update(categories).set(setCols as any).where(eq(categories.id, id)).returning()
    if (!updated) return c.json({ error: 'Kategoria nie znaleziona' }, 404)

    return c.json({ success: true, data: updated })
  } catch (err: any) {
    if (err?.code === '23505') return c.json({ error: 'Slug już istnieje' }, 409)
    console.error('PUT /admin/categories/:id error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// DELETE /admin/categories/:id  🛡️
// Deactivate category
// ============================================
adminCategoriesRouter.delete('/:id', async (c) => {
  try {
    const db = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) return c.json({ error: 'Nieprawidłowe ID' }, 400)

    await db.update(categories).set({ isActive: false, updatedAt: new Date() }).where(eq(categories.id, id))

    return c.json({ success: true, message: 'Kategoria została zdezaktywowana' })
  } catch (err) {
    console.error('DELETE /admin/categories/:id error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})
