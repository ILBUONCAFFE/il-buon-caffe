import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { products, productImages, categories, stockChanges } from '@repo/db/schema'
import { logAdminAction } from '../../lib/audit'
import { eq, and, asc, desc, sql, count, ilike } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import type { Env } from '../../index'
import { sanitize } from '../../lib/sanitize'
import { slugify } from '../../lib/slugify'
import { checkContentLength, parsePagination, getClientIp, serverError } from '../../lib/request'
import { notifyIndexNow, productUrl } from '../../lib/indexnow'
import { patchAllegroOfferFields } from '../../lib/allegro-offer-sync'

const MAX_BODY = 50_000

const SKU_PREFIX_BY_CATEGORY: Record<string, string> = {
  kawa: 'KAW',
  coffee: 'KAW',
  wino: 'WIN',
  alcohol: 'WIN',
  slodycze: 'SLO',
  sweets: 'SLO',
  spizarnia: 'SPI',
  pantry: 'SPI',
}

function normalizeSkuPart(value: string, max = 24): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
}

async function generateProductSku(
  db: ReturnType<typeof createDb>,
  name: string,
  categoryId?: number | null,
): Promise<string> {
  let categorySlug = ''
  if (categoryId) {
    const category = await db.query.categories.findFirst({
      columns: { slug: true },
      where: eq(categories.id, categoryId),
    })
    categorySlug = category?.slug ?? ''
  }

  const prefix = SKU_PREFIX_BY_CATEGORY[categorySlug] ?? 'IBC'
  const namePart = normalizeSkuPart(name) || 'PRODUKT'
  const base = `${prefix}-${namePart}`.slice(0, 42).replace(/-+$/g, '')

  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`.slice(0, 50).replace(/-+$/g, '')
    const existing = await db.query.products.findFirst({
      columns: { sku: true },
      where: eq(products.sku, candidate),
    })
    if (!existing) return candidate
  }

  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

function syncProductMutationToAllegro(
  env: Env,
  ctx: ExecutionContext,
  args: {
    sku: string
    offerId: string | null
    syncPrice?: boolean
    syncStock?: boolean
    price?: number | string | null
    currency?: string | null
    stock?: number | null
    reserved?: number | null
  },
) {
  if (!args.offerId) return
  if (!args.syncPrice && !args.syncStock) return

  const available = Math.max(0, (args.stock ?? 0) - (args.reserved ?? 0))
  ctx.waitUntil(
    patchAllegroOfferFields(env, {
      offerId: args.offerId,
      price: args.syncPrice && args.price != null
        ? { amount: args.price, currency: args.currency || 'PLN' }
        : undefined,
      stock: args.syncStock ? available : undefined,
    }).catch((err) => {
      console.error('[products] Allegro sync failed', {
        sku: args.sku,
        offerId: args.offerId,
        message: err instanceof Error ? err.message : String(err),
      })
    }),
  )
}

export const adminProductsRouter = new Hono<{ Bindings: Env }>()
adminProductsRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/products  🛡️
// Lista wszystkich produktów (w tym nieaktywnych)
// ============================================
adminProductsRouter.get('/', async (c) => {
  try {
    const db               = createDb(c.env.DATABASE_URL)
    const { page, limit } = parsePagination(c, { maxLimit: 200 })
    const search   = sanitize(c.req.query('search') || '', 100)
    const activeQ  = c.req.query('active')
    const category = c.req.query('category') || ''

    const conditions: any[] = []
    if (search)            conditions.push(ilike(products.name, `%${search}%`))
    if (activeQ === 'true')  conditions.push(eq(products.isActive, true))
    if (activeQ === 'false') conditions.push(eq(products.isActive, false))
    if (category)          conditions.push(eq(categories.slug, category))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult, rows] = await Promise.all([
      db.select({ count: count() }).from(products).where(where),
      db.query.products.findMany({
        with: {
          category: { columns: { id: true, name: true, slug: true } },
          images: { columns: { id: true, url: true, isPrimary: true, sortOrder: true }, orderBy: asc(productImages.sortOrder) },
        },
        where,
        orderBy: desc(products.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
    ])

    const total      = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    return c.json({
      success: true,
      data: rows.map(p => ({
        ...p,
        price:          Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        available:      Math.max(0, p.stock - p.reserved),
      })),
      meta: { total, page, limit, totalPages },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/products', err)
  }
})

// ============================================
// GET /admin/products/low-stock  🛡️
// Produkty z niskim stanem (stock - reserved <= threshold)
// ============================================
adminProductsRouter.get('/low-stock', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const threshold = Math.max(0, Math.min(100, Number(c.req.query('threshold') ?? '5')))

    const rows = await db.query.products.findMany({
      columns: { sku: true, name: true, stock: true, reserved: true, isActive: true, allegroOfferId: true },
      with: { category: { columns: { name: true } } },
      where: and(
        eq(products.isActive, true),
        sql`${products.stock} - ${products.reserved} <= ${threshold}`,
      ),
      orderBy: asc(sql`${products.stock} - ${products.reserved}`),
      limit: 200,
    })

    return c.json({
      success: true,
      data: rows.map(p => ({
        ...p,
        available: Math.max(0, p.stock - p.reserved),
      })),
      meta: { threshold, total: rows.length },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/products/low-stock', err)
  }
})

// ============================================
// GET /admin/products/:sku  🛡️
// Szczegóły produktu (admin view — wszystkie pola)
// ============================================
adminProductsRouter.get('/:sku', async (c) => {
  try {
    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50)

    const product = await db.query.products.findFirst({
      where: eq(products.sku, sku),
      with: {
        category: true,
        images:   { orderBy: asc(productImages.sortOrder) },
      },
    })

    if (!product) return c.json({ error: 'Produkt nie znaleziony' }, 404)

    return c.json({
      success: true,
      data: {
        ...product,
        price:          Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        available:      Math.max(0, product.stock - product.reserved),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/products/:sku', err)
  }
})

// ============================================
// POST /admin/products  🛡️
// Tworzenie nowego produktu
// ============================================
adminProductsRouter.post('/', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const db   = createDb(c.env.DATABASE_URL)
    const body = await c.req.json<{
      sku?: string; name: string; description?: string
      categoryId?: number; price: number; compareAtPrice?: number | null
      stock?: number; imageUrl?: string; origin?: string; year?: string
      weight?: number; isActive?: boolean; isNew?: boolean; isFeatured?: boolean
      allegroOfferId?: string | null
      allegroSyncPrice?: boolean
      allegroSyncStock?: boolean
    }>()

    const name = sanitize(body.name, 255)

    if (!name) return c.json({ error: 'Nazwa jest wymagana' }, 400)
    if (typeof body.price !== 'number' || body.price < 0) return c.json({ error: 'Nieprawidłowa cena' }, 400)

    const requestedSku = sanitize(body.sku || '', 50).toUpperCase()
    const sku = requestedSku || await generateProductSku(db, name, body.categoryId ?? null)

    // Check SKU uniqueness
    const existing = await db.query.products.findFirst({
      columns: { sku: true },
      where: eq(products.sku, sku),
    })
    if (existing) return c.json({ error: `SKU '${sku}' już istnieje` }, 409)

    const slug    = slugify(name)
    const adminIp = getClientIp(c)
    const admin   = c.get('user')

    const [product] = await db.insert(products).values({
      sku,
      slug,
      name,
      description:     sanitize(body.description || '', 2000)  || null,
      categoryId:      body.categoryId ?? null,
      price:           body.price.toString(),
      compareAtPrice:  body.compareAtPrice != null ? body.compareAtPrice.toString() : null,
      stock:           body.stock ?? 0,
      reserved:        0,
      imageUrl:        sanitize(body.imageUrl || '', 500) || null,
      origin:          sanitize(body.origin   || '', 255) || null,
      year:            sanitize(body.year     || '', 10)  || null,
      weight:          body.weight ?? null,
      isActive:        body.isActive  ?? true,
      isNew:           body.isNew     ?? false,
      isFeatured:      body.isFeatured ?? false,
      allegroOfferId:  sanitize(body.allegroOfferId || '', 50) || null,
      allegroSyncPrice: body.allegroSyncPrice ?? false,
      allegroSyncStock: body.allegroSyncStock ?? false,
    }).returning()

    await logAdminAction(db, {
      adminSub:  admin.sub,
      action:    'admin_action',
      ipAddress: adminIp,
      details:   { event: 'product_created', sku, name },
    })

    // Notify Bing of the new product URL — fire-and-forget, never blocks the response
    if (product.slug && c.env.INDEXNOW_KEY) {
      void notifyIndexNow([productUrl(product.slug)], c.env.INDEXNOW_KEY)
    }

    return c.json({ success: true, data: product }, 201)
  } catch (err: any) {
    if (err?.code === '23505') return c.json({ error: 'SKU lub slug już istnieje' }, 409)
    return serverError(c, 'POST /admin/products', err)
  }
})

// ============================================
// PUT /admin/products/:sku  🛡️
// Aktualizacja produktu
// ============================================
adminProductsRouter.put('/:sku', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50).toUpperCase()

    const existing = await db.query.products.findFirst({
      columns: { sku: true },
      where: eq(products.sku, sku),
    })
    if (!existing) return c.json({ error: 'Produkt nie znaleziony' }, 404)

    const body = await c.req.json<Partial<{
      name: string; description: string
      categoryId: number | null; price: number; compareAtPrice: number | null
      imageUrl: string | null; origin: string; year: string; weight: number | null
      isActive: boolean; isNew: boolean; isFeatured: boolean
      allegroOfferId: string | null
      allegroSyncPrice: boolean
      allegroSyncStock: boolean
    }>>()

    const setCols: Record<string, unknown> = { updatedAt: new Date() }

    if (body.name !== undefined)            setCols.name           = sanitize(body.name, 255)
    if (body.description !== undefined)     setCols.description    = sanitize(body.description, 2000) || null
    if (body.categoryId !== undefined)      setCols.categoryId     = body.categoryId
    if (body.price !== undefined)           setCols.price          = body.price.toString()
    if (body.compareAtPrice !== undefined)  setCols.compareAtPrice = body.compareAtPrice != null ? body.compareAtPrice.toString() : null
    if (body.imageUrl !== undefined)        setCols.imageUrl       = sanitize(body.imageUrl || '', 500) || null
    if (body.origin !== undefined)          setCols.origin         = sanitize(body.origin || '', 255) || null
    if (body.year !== undefined)            setCols.year           = sanitize(body.year || '', 10) || null
    if (body.weight !== undefined)          setCols.weight         = body.weight
    if (body.isActive !== undefined)        setCols.isActive       = body.isActive
    if (body.isNew !== undefined)           setCols.isNew          = body.isNew
    if (body.isFeatured !== undefined)      setCols.isFeatured     = body.isFeatured
    if (body.allegroOfferId !== undefined)  setCols.allegroOfferId = sanitize(body.allegroOfferId || '', 50) || null
    if (body.allegroSyncPrice !== undefined) setCols.allegroSyncPrice = body.allegroSyncPrice
    if (body.allegroSyncStock !== undefined) setCols.allegroSyncStock = body.allegroSyncStock

    if (body.name) setCols.slug = slugify(body.name)

    const [updated] = await db.update(products).set(setCols as any).where(eq(products.sku, sku)).returning()

    if (body.price !== undefined && updated.allegroSyncPrice) {
      syncProductMutationToAllegro(c.env, c.executionCtx, {
        sku,
        offerId: updated.allegroOfferId,
        syncPrice: true,
        price: updated.price,
        currency: updated.currency,
        stock: updated.stock,
        reserved: updated.reserved,
      })
    }

    const admin   = c.get('user')
    await logAdminAction(db, {
      adminSub:  admin.sub,
      action:    'admin_action',
      ipAddress: getClientIp(c),
      details:   { event: 'product_updated', sku, fields: Object.keys(setCols) },
    })

    // Notify Bing that the product page has changed — fire-and-forget
    if (updated.slug && c.env.INDEXNOW_KEY) {
      void notifyIndexNow([productUrl(updated.slug)], c.env.INDEXNOW_KEY)
    }

    // Invalidate KV static cache (slug may have changed if name was updated)
    if (c.env.ALLEGRO_KV) {
      c.executionCtx.waitUntil(
        Promise.all([
          c.env.ALLEGRO_KV.delete(`product:static:${sku.toLowerCase()}`),
          c.env.ALLEGRO_KV.delete(`product:static:${updated.slug}`),
        ])
      )
    }

    return c.json({
      success: true,
      data: {
        ...updated,
        price:          Number(updated.price),
        compareAtPrice: updated.compareAtPrice ? Number(updated.compareAtPrice) : null,
      },
    })
  } catch (err: any) {
    if (err?.code === '23505') return c.json({ error: 'SKU lub slug już istnieje' }, 409)
    return serverError(c, 'PUT /admin/products/:sku', err)
  }
})

// ============================================
// PUT /admin/products/:sku/stock  🛡️
// Korekta stanu magazynowego z audytem
// ============================================
adminProductsRouter.put('/:sku/stock', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const db    = createDb(c.env.DATABASE_URL)
    const sku   = sanitize(c.req.param('sku'), 50).toUpperCase()
    const admin = c.get('user')
    const adminIp = getClientIp(c)

    const body = await c.req.json<{
      stock: number
      reason: string
      notes?: string
    }>()

    const VALID_REASONS = ['manual', 'inventory', 'damage', 'cancellation']
    if (typeof body.stock !== 'number' || body.stock < 0 || !Number.isInteger(body.stock)) {
      return c.json({ error: 'Stan magazynowy musi być nieujemną liczbą całkowitą' }, 400)
    }
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return c.json({ error: `Nieprawidłowy powód. Dozwolone: ${VALID_REASONS.join(', ')}` }, 400)
    }

    const product = await db.query.products.findFirst({
      columns: {
        sku: true,
        stock: true,
        reserved: true,
        name: true,
        allegroOfferId: true,
        allegroSyncStock: true,
      },
      where: eq(products.sku, sku),
    })
    if (!product) return c.json({ error: 'Produkt nie znaleziony' }, 404)

    const newStock    = body.stock
    const changeAmount = newStock - product.stock
    const newReserved  = Math.min(product.reserved, newStock) // Clamp reserved

    await db.update(products)
      .set({ stock: newStock, reserved: newReserved, updatedAt: new Date() })
      .where(eq(products.sku, sku))

    syncProductMutationToAllegro(c.env, c.executionCtx, {
      sku,
      offerId: product.allegroOfferId,
      syncStock: product.allegroSyncStock,
      stock: newStock,
      reserved: newReserved,
    })

    await db.insert(stockChanges).values({
      productSku:    sku,
      previousStock: product.stock,
      newStock,
      change:        changeAmount,
      reason:        body.reason,
      adminId:       parseInt(admin.sub),
      notes:         sanitize(body.notes || '', 1000) || null,
    })

    await logAdminAction(db, {
      adminSub:  admin.sub,
      action:    'admin_action',
      ipAddress: adminIp,
      details: {
        event:         'stock_updated',
        sku,
        productName:   product.name,
        previousStock: product.stock,
        newStock,
        change:        changeAmount,
        reason:        body.reason,
      },
    })

    return c.json({
      success: true,
      data: {
        sku,
        previousStock: product.stock,
        newStock,
        change:        changeAmount,
        available:     Math.max(0, newStock - newReserved),
      },
    })
  } catch (err) {
    return serverError(c, 'PUT /admin/products/:sku/stock', err)
  }
})

// ============================================
// GET /admin/products/:sku/stock-history  🛡️
// Historia zmian stanu magazynowego
// ============================================
adminProductsRouter.get('/:sku/stock-history', async (c) => {
  try {
    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50)
    const { page, limit } = parsePagination(c, { maxLimit: 100 })

    // Check product exists
    const product = await db.query.products.findFirst({
      columns: { sku: true },
      where: eq(products.sku, sku),
    })
    if (!product) return c.json({ error: 'Produkt nie znaleziony' }, 404)

    const [countResult, rows] = await Promise.all([
      db.select({ count: count() }).from(stockChanges).where(eq(stockChanges.productSku, sku)),
      db.select().from(stockChanges)
        .where(eq(stockChanges.productSku, sku))
        .orderBy(desc(stockChanges.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ])

    const total = Number(countResult[0]?.count ?? 0)
    return c.json({
      success: true,
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/products/:sku/stock-history', err)
  }
})

// ============================================
// DELETE /admin/products/:sku  🛡️
// ?permanent=true  → hard delete (physical removal from DB)
// default          → soft delete (deactivate only)
// ============================================
adminProductsRouter.delete('/:sku', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const sku       = sanitize(c.req.param('sku'), 50).toUpperCase()
    const permanent = c.req.query('permanent') === 'true'
    const admin     = c.get('user')
    const adminIp   = getClientIp(c)

    const product = await db.query.products.findFirst({
      columns: { sku: true, name: true, slug: true, isActive: true },
      where: eq(products.sku, sku),
    })
    if (!product) return c.json({ error: 'Produkt nie znaleziony' }, 404)

    if (permanent) {
      if (product.isActive) {
        return c.json({ error: 'Przed trwałym usunięciem produkt musi być zdezaktywowany' }, 409)
      }

      const [deletedImages, deletedStockChanges] = await Promise.all([
        db.delete(productImages)
          .where(eq(productImages.productSku, sku))
          .returning({ id: productImages.id }),
        db.delete(stockChanges)
          .where(eq(stockChanges.productSku, sku))
          .returning({ id: stockChanges.id }),
      ])

      // Hard delete — physically removes the product row. Order items keep their product snapshot
      // and intentionally do not have a FK to products.
      await db.delete(products).where(eq(products.sku, sku))

      await logAdminAction(db, {
        adminSub:  admin.sub,
        action:    'admin_action',
        ipAddress: adminIp,
        details:   {
          event: 'product_deleted_permanently',
          sku,
          productName: product.name,
          deletedImages: deletedImages.length,
          deletedStockChanges: deletedStockChanges.length,
        },
      })

      if (product.slug && c.env.INDEXNOW_KEY) {
        void notifyIndexNow([productUrl(product.slug)], c.env.INDEXNOW_KEY)
      }

      if (c.env.ALLEGRO_KV && product.slug) {
        c.executionCtx.waitUntil(
          Promise.all([
            c.env.ALLEGRO_KV.delete(`product:static:${sku.toLowerCase()}`),
            c.env.ALLEGRO_KV.delete(`product:static:${product.slug}`),
          ])
        )
      }

      return c.json({ success: true, message: `Produkt '${sku}' został trwale usunięty`, permanent: true })
    }

    // Soft delete — deactivate only
    await db.update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.sku, sku))

    await logAdminAction(db, {
      adminSub:  admin.sub,
      action:    'admin_action',
      ipAddress: adminIp,
      details:   { event: 'product_deactivated', sku, productName: product.name },
    })

    if (product.slug && c.env.INDEXNOW_KEY) {
      void notifyIndexNow([productUrl(product.slug)], c.env.INDEXNOW_KEY)
    }

    if (c.env.ALLEGRO_KV && product.slug) {
      c.executionCtx.waitUntil(
        c.env.ALLEGRO_KV.delete(`product:static:${product.slug}`)
      )
    }

    return c.json({ success: true, message: `Produkt '${sku}' został zdezaktywowany`, permanent: false })
  } catch (err) {
    return serverError(c, 'DELETE /admin/products/:sku', err)
  }
})

// ============================================
// DELETE /admin/products/:sku/cache  🛡️
// Czyści KV static cache dla produktu
// ============================================
adminProductsRouter.delete('/:sku/cache', async (c) => {
  try {
    const sku = sanitize(c.req.param('sku'), 50).toUpperCase()

    if (!c.env.ALLEGRO_KV) {
      return c.json({ success: true, data: { cleared: false, reason: 'no_kv' } })
    }

    const db      = createDb(c.env.DATABASE_URL)
    const product = await db.query.products.findFirst({
      columns: { slug: true },
      where: eq(products.sku, sku),
    })

    await Promise.all([
      c.env.ALLEGRO_KV.delete(`product:static:${sku.toLowerCase()}`),
      product ? c.env.ALLEGRO_KV.delete(`product:static:${product.slug}`) : Promise.resolve(),
    ])

    return c.json({ success: true, data: { cleared: true } })
  } catch (err) {
    return serverError(c, 'DELETE /admin/products/:sku/cache', err)
  }
})

// ============================================
// POST /admin/products/:sku/images  🛡️
// Dodanie obrazu do produktu
// ============================================
adminProductsRouter.post('/:sku/images', async (c) => {
  try {
    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50).toUpperCase()

    const product = await db.query.products.findFirst({
      columns: { sku: true },
      where: eq(products.sku, sku),
    })
    if (!product) return c.json({ error: 'Produkt nie znaleziony' }, 404)

    const body = await c.req.json<{
      url: string; altText?: string; sortOrder?: number; isPrimary?: boolean
    }>()

    const url = sanitize(body.url, 500)
    if (!url) return c.json({ error: 'URL obrazu jest wymagany' }, 400)

    // If setting as primary, unset all others
    if (body.isPrimary) {
      await db.update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productSku, sku))
    }

    const [image] = await db.insert(productImages).values({
      productSku: sku,
      url,
      altText:    sanitize(body.altText || '', 255) || null,
      sortOrder:  body.sortOrder ?? 0,
      isPrimary:  body.isPrimary ?? false,
    }).returning()

    return c.json({ success: true, data: image }, 201)
  } catch (err) {
    return serverError(c, 'POST /admin/products/:sku/images', err)
  }
})

// ============================================
// DELETE /admin/products/:sku/images/:imageId  🛡️
// Usunięcie obrazu
// ============================================
adminProductsRouter.delete('/:sku/images/:imageId', async (c) => {
  try {
    const db      = createDb(c.env.DATABASE_URL)
    const sku     = sanitize(c.req.param('sku'), 50).toUpperCase()
    const imageId = parseInt(c.req.param('imageId') ?? '', 10)

    if (isNaN(imageId)) return c.json({ error: 'Nieprawidłowe ID obrazu' }, 400)

    const image = await db.query.productImages.findFirst({
      columns: { id: true },
      where: and(
        eq(productImages.id, imageId),
        eq(productImages.productSku, sku),
      ),
    })
    if (!image) return c.json({ error: 'Obraz nie znaleziony' }, 404)

    await db.delete(productImages).where(eq(productImages.id, imageId))

    return c.json({ success: true, message: 'Obraz usunięty' })
  } catch (err) {
    return serverError(c, 'DELETE /admin/products/:sku/images/:imageId', err)
  }
})
