import { Hono } from 'hono'
import { products, categories, productImages } from '@repo/db/schema'
import { eq, and, gt, sql, asc, desc, count } from 'drizzle-orm'
import type { Env } from '../index'

export const productsRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /api/products
// Lista produktów z filtrowaniem i paginacją
// ============================================
productsRouter.get('/', async (c) => {
  try {
    // ── Edge cache (Cloudflare Cache API) — 60s TTL ──
    const cache    = caches.default
    const cacheKey = new Request(c.req.url)
    const cached   = await cache.match(cacheKey)
    if (cached) return cached

    const db = c.get('db')

    // Parse query params
    const categorySlug = c.req.query('category')
    const pageRaw    = parseInt(c.req.query('page')  || '1',  10)
    const limitRaw   = parseInt(c.req.query('limit') || '20', 10)
    const sort       = c.req.query('sort') || 'newest'
    const inStockRaw = c.req.query('inStock')
    const isFeatured = c.req.query('featured') === 'true'
    const isNew      = c.req.query('new')      === 'true'

    const page  = Math.max(1, isNaN(pageRaw)  ? 1  : pageRaw)
    const limit = Math.min(100, Math.max(1, isNaN(limitRaw) ? 20 : limitRaw))
    const offset = (page - 1) * limit

    // Resolve category id from slug
    let categoryId: number | undefined
    if (categorySlug) {
      const cat = await db.query.categories.findFirst({
        columns: { id: true },
        where: and(eq(categories.slug, categorySlug), eq(categories.isActive, true)),
      })
      if (!cat) {
        return c.json({ success: true, data: [], meta: { total: 0, page, limit, totalPages: 0 } })
      }
      categoryId = cat.id
    }

    // Build conditions
    const conditions = [eq(products.isActive, true)]
    if (categoryId !== undefined) conditions.push(eq(products.categoryId, categoryId))
    if (inStockRaw === 'true')    conditions.push(gt(products.stock, 0))
    if (isFeatured)               conditions.push(eq(products.isFeatured, true))
    if (isNew)                    conditions.push(eq(products.isNew, true))

    const whereClause = and(...conditions)

    // Sort
    let orderBy
    switch (sort) {
      case 'price-asc':  orderBy = asc(sql`CAST(${products.price} AS NUMERIC)`) ; break
      case 'price-desc': orderBy = desc(sql`CAST(${products.price} AS NUMERIC)`); break
      case 'name':       orderBy = asc(products.name)  ; break
      case 'newest':
      default:           orderBy = desc(products.createdAt)
    }

    // Total count + paginated rows (parallel)
    const [totalResult, rows] = await Promise.all([
      db.select({ count: count() }).from(products).where(whereClause),
      db.query.products.findMany({
        columns: {
          sku: true, slug: true, name: true, description: true,
          price: true, compareAtPrice: true, stock: true, reserved: true,
          imageUrl: true, origin: true, year: true, weight: true,
          isNew: true, isFeatured: true, createdAt: true,
        },
        with: {
          category: { columns: { id: true, name: true, slug: true } },
        },
        where: whereClause,
        orderBy,
        limit,
        offset,
      }),
    ])

    const total      = Number(totalResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    // Compute available stock
    const data = rows.map(p => ({
      ...p,
      price:          Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      available:      Math.max(0, p.stock - p.reserved),
    }))

    const body     = JSON.stringify({ success: true, data, meta: { total, page, limit, totalPages } })
    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    })
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    console.error('GET /products error:', error instanceof Error ? error.message : String(error))
    return c.json({ success: false, error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/products/:slug
// Szczegóły produktu z obrazami
// Layer 1: Cloudflare Cache API (edge, 5 min)
// Layer 2: KV static cache (global, 24h) — avoids full Neon query on edge-cache miss
// ============================================
productsRouter.get('/:slug', async (c) => {
  try {
    // ── Layer 1: Edge cache — 5 min TTL ──
    const cache    = caches.default
    const cacheKey = new Request(c.req.url)
    const edgeCached = await cache.match(cacheKey)
    if (edgeCached) return edgeCached

    const db   = c.get('db')
    const slug = c.req.param('slug')

    // ── Layer 2: KV static cache ──
    const kvKey      = `product:static:${slug}`
    const kvStatic   = c.env.ALLEGRO_KV ? await c.env.ALLEGRO_KV.get(kvKey, 'json') as Record<string, unknown> | null : null

    let data: Record<string, unknown>

    if (kvStatic) {
      // KV hit — only fetch dynamic fields from Neon
      const row = await db.query.products.findFirst({
        columns: {
          price: true, compareAtPrice: true, stock: true, reserved: true,
          year: true, allegroOfferId: true, isActive: true, updatedAt: true,
        },
        where: and(eq(products.slug, slug), eq(products.isActive, true)),
      })
      if (!row) return c.json({ success: false, error: 'Produkt nie znaleziony' }, 404)

      data = {
        ...kvStatic,
        price:          Number(row.price),
        compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
        stock:          row.stock,
        reserved:       row.reserved,
        available:      Math.max(0, row.stock - row.reserved),
        year:           row.year,
        allegroOfferId: row.allegroOfferId,
        isActive:       row.isActive,
        updatedAt:      row.updatedAt,
      }
    } else {
      // KV miss — full Neon query
      const product = await db.query.products.findFirst({
        where: and(eq(products.slug, slug), eq(products.isActive, true)),
        with: {
          category: { columns: { id: true, name: true, slug: true } },
          images: {
            columns: { id: true, url: true, altText: true, sortOrder: true, isPrimary: true },
            orderBy: asc(productImages.sortOrder),
          },
        },
      })
      if (!product) return c.json({ success: false, error: 'Produkt nie znaleziony' }, 404)

      const staticData = {
        sku:             product.sku,
        slug:            product.slug,
        name:            product.name,
        description:     product.description,
        imageUrl:        product.imageUrl,
        images:          product.images,
        category:        product.category,
        origin:          product.origin,
        weight:          product.weight,
        originCountry:   product.originCountry,
        originRegion:    product.originRegion,
        grapeVariety:    product.grapeVariety,
        isNew:           product.isNew,
        isFeatured:      product.isFeatured,
        wineDetails:     product.wineDetails,
        coffeeDetails:   product.coffeeDetails,
        metaTitle:       product.metaTitle,
        metaDescription: product.metaDescription,
        createdAt:       product.createdAt,
      }

      if (c.env.ALLEGRO_KV) {
        c.executionCtx.waitUntil(
          c.env.ALLEGRO_KV.put(kvKey, JSON.stringify(staticData), { expirationTtl: 86400 })
        )
      }

      data = {
        ...staticData,
        price:          Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        stock:          product.stock,
        reserved:       product.reserved,
        available:      Math.max(0, product.stock - product.reserved),
        year:           product.year,
        allegroOfferId: product.allegroOfferId,
        isActive:       product.isActive,
        updatedAt:      product.updatedAt,
      }
    }

    const body     = JSON.stringify({ success: true, data })
    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    console.error('GET /products/:slug error:', error instanceof Error ? error.message : String(error))
    return c.json({ success: false, error: 'Błąd serwera' }, 500)
  }
})
