import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { categories, products } from '@repo/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'
import type { Env } from '../index'
import { serverError } from '../lib/request'

export const categoriesRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /api/categories
// Lista aktywnych kategorii z liczbą produktów
// ============================================
categoriesRouter.get('/', async (c) => {
  try {
    // ── Edge cache — 10 min TTL (categories change rarely) ──
    const cache    = caches.default
    const cacheKey = new Request(c.req.url)
    const cached   = await cache.match(cacheKey)
    if (cached) return cached

    const db = createDb(c.env.DATABASE_URL)

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
        productCount: count(products.sku),
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          eq(products.isActive, true),
        ),
      )
      .where(eq(categories.isActive, true))
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.imageUrl,
        categories.layoutConfig,
        categories.isActive,
        categories.sortOrder,
      )
      .orderBy(categories.sortOrder)

    const body     = JSON.stringify({ success: true, data: rows })
    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
    })
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    return serverError(c, 'GET /categories', error)
  }
})

// ============================================
// GET /api/categories/:slug
// Szczegóły kategorii
// ============================================
categoriesRouter.get('/:slug', async (c) => {
  try {
    const db   = createDb(c.env.DATABASE_URL)
    const slug = c.req.param('slug')

    const cat = await db.query.categories.findFirst({
      where: and(eq(categories.slug, slug), eq(categories.isActive, true)),
    })

    if (!cat) {
      return c.json({ error: 'Kategoria nie znaleziona' }, 404)
    }

    return c.json({ success: true, data: cat })
  } catch (error) {
    return serverError(c, 'GET /categories/:slug', error)
  }
})
