import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { categories, products } from '@repo/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'
import type { Env } from '../index'

export const categoriesRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /api/categories
// Lista aktywnych kategorii z liczbą produktów
// ============================================
categoriesRouter.get('/', async (c) => {
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

    return c.json({ success: true, data: rows })
  } catch (error) {
    console.error('GET /categories error:', error)
    return c.json({ success: false, error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/categories/:slug
// Szczegóły kategorii
// ============================================
categoriesRouter.get('/:slug', async (c) => {
  try {
    const db   = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const slug = c.req.param('slug')

    const cat = await db.query.categories.findFirst({
      where: and(eq(categories.slug, slug), eq(categories.isActive, true)),
    })

    if (!cat) {
      return c.json({ success: false, error: 'Kategoria nie znaleziona' }, 404)
    }

    return c.json({ success: true, data: cat })
  } catch (error) {
    console.error('GET /categories/:slug error:', error)
    return c.json({ success: false, error: 'Błąd serwera' }, 500)
  }
})
