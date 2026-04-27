import { Hono } from 'hono'
import { serverError } from '../lib/request'
import {
  getProductContent,
  getProducer,
  listProducers,
} from '../lib/content-store'
import type { Env } from '../index'

export const contentRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /api/content/product/:sku
// Rich content for a single product from D1
// ============================================
contentRouter.get('/product/:sku', async (c) => {
  try {
    const { sku } = c.req.param()
    const content = await getProductContent(c.env.CONTENT_DB, sku)
    if (!content) return c.json({ error: { code: 'NOT_FOUND', message: 'No content for this SKU' } }, 404)
    return c.json({ data: content }, 200, {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=86400',
    })
  } catch (err) {
    return serverError(c, 'GET /api/content/product/:sku', err)
  }
})

// ============================================
// GET /api/content/producer/:slug
// Producer profile from D1
// ============================================
contentRouter.get('/producer/:slug', async (c) => {
  try {
    const { slug } = c.req.param()
    const producer = await getProducer(c.env.CONTENT_DB, slug)
    if (!producer) return c.json({ error: { code: 'NOT_FOUND', message: 'Producer not found' } }, 404)
    return c.json({ data: producer }, 200, {
      'Cache-Control': 's-maxage=600, stale-while-revalidate=86400',
    })
  } catch (err) {
    return serverError(c, 'GET /api/content/producer/:slug', err)
  }
})

// ============================================
// GET /api/content/producers
// List producers with optional filters
// ?category=wine&region=Toscana&country=IT
// ============================================
contentRouter.get('/producers', async (c) => {
  try {
    const category = c.req.query('category') || undefined
    const region   = c.req.query('region')   || undefined
    const country  = c.req.query('country')  || undefined

    const producers = await listProducers(c.env.CONTENT_DB, { category, region, country })
    return c.json({ data: producers }, 200, {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
    })
  } catch (err) {
    return serverError(c, 'GET /api/content/producers', err)
  }
})
