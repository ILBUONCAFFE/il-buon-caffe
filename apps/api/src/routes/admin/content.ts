import { Hono } from 'hono'
import { z } from 'zod'
import { requireAdminOrProxy } from '../../middleware/auth'
import { checkContentLength, serverError } from '../../lib/request'
import {
  getProductContent,
  putProductContent,
  deleteProductContent,
  getProductContentHistory,
  restoreProductContent,
  getProducer,
  listProducers,
  putProducer,
  getProducerHistory,
  listDishTemplates,
  createDishTemplate,
  updateDishTemplate,
  deleteDishTemplate,
} from '../../lib/content-store'
import type { Env } from '../../index'

const MAX_BODY = 50_000

export const adminContentRouter = new Hono<{ Bindings: Env }>()
adminContentRouter.use('*', requireAdminOrProxy())

// ── Zod schemas ──────────────────────────────────────────────────────────────

const AwardSchema = z.object({
  name: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100),
  rank: z.string().max(100).optional(),
})

const PairingSchema = z.object({
  dish: z.string().min(1).max(200),
  note: z.string().max(500).optional(),
})

const DishTemplateSchema = z.object({
  category:  z.string().min(1).max(50).optional().default('wine'),
  name:      z.string().min(1).max(200),
  note:      z.string().max(500).nullable().optional(),
  dishType:  z.string().max(100).nullable().optional(),
  imageUrl:  z.string().max(500).nullable().optional(),
  emoji:     z.string().max(20).nullable().optional(),
  tags:      z.array(z.string().min(1).max(50)).max(20).optional(),
  isActive:  z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
})

const ProductContentSchema = z.object({
  category:     z.string().min(1).max(50),
  producerSlug: z.string().max(100).nullable().optional(),
  awards:       z.array(AwardSchema).optional(),
  pairing:      z.array(PairingSchema).optional(),
  ritual:       z.string().max(5000).nullable().optional(),
  servingTemp:  z.string().max(100).nullable().optional(),
  profile:      z.record(z.string(), z.number().min(0).max(100)).optional(),
  sensory:      z.record(z.string(), z.string().max(2000)).optional(),
  extended:     z.record(z.string(), z.unknown()).optional(),
  isPublished:  z.boolean().optional(),
})

const ProducerEstateInfoSchema = z.object({
  name:     z.string().min(1).max(200),
  hectares: z.number().optional(),
  soil:     z.string().max(200).optional(),
  altitude: z.number().optional(),
  variety:  z.string().max(200).optional(),
})

const ProducerImageSchema = z.object({
  url:     z.string().url().max(500),
  caption: z.string().max(200).optional(),
})

const ProducerSchema = z.object({
  category:   z.string().min(1).max(50),
  name:       z.string().min(1).max(255),
  region:     z.string().min(1).max(200),
  country:    z.string().min(1).max(100),
  founded:    z.number().int().min(1000).max(2100).nullable().optional(),
  shortStory: z.string().max(500).nullable().optional(),
  story:      z.string().max(20000).nullable().optional(),
  philosophy: z.string().max(5000).nullable().optional(),
  estateInfo: z.array(ProducerEstateInfoSchema).optional(),
  images:     z.array(ProducerImageSchema).optional(),
  website:    z.string().url().max(500).nullable().optional(),
})

function getAdminId(c: Parameters<typeof serverError>[0]): number | null {
  return (c.get('user') as { id?: number } | undefined)?.id ?? null
}

// ── Product content endpoints ─────────────────────────────────────────────────

adminContentRouter.get('/product/:sku', async (c) => {
  try {
    const content = await getProductContent(c.env.CONTENT_DB, c.req.param('sku'))
    if (!content) return c.json({ error: { code: 'NOT_FOUND', message: 'No content for this SKU' } }, 404)
    return c.json({ data: content })
  } catch (err) {
    return serverError(c, 'GET /admin/content/product/:sku', err)
  }
})

adminContentRouter.put('/product/:sku', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const raw    = await c.req.json()
    const parsed = ProductContentSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400)
    }

    const body    = parsed.data
    const result  = await putProductContent(c.env.CONTENT_DB, c.req.param('sku'), body.category, body, getAdminId(c))
    return c.json({ data: result })
  } catch (err) {
    return serverError(c, 'PUT /admin/content/product/:sku', err)
  }
})

adminContentRouter.delete('/product/:sku', async (c) => {
  try {
    await deleteProductContent(c.env.CONTENT_DB, c.req.param('sku'))
    return c.json({ data: { deleted: true } })
  } catch (err) {
    return serverError(c, 'DELETE /admin/content/product/:sku', err)
  }
})

adminContentRouter.get('/product/:sku/history', async (c) => {
  try {
    const limit   = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
    const history = await getProductContentHistory(c.env.CONTENT_DB, c.req.param('sku'), limit)
    return c.json({ data: history })
  } catch (err) {
    return serverError(c, 'GET /admin/content/product/:sku/history', err)
  }
})

adminContentRouter.post('/product/:sku/restore/:historyId', async (c) => {
  try {
    const sku       = c.req.param('sku')
    const historyId = parseInt(c.req.param('historyId'), 10)
    if (!Number.isInteger(historyId) || historyId <= 0) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid historyId' } }, 400)
    }
    const result = await restoreProductContent(c.env.CONTENT_DB, sku, historyId, getAdminId(c))
    return c.json({ data: result })
  } catch (err) {
    return serverError(c, 'POST /admin/content/product/:sku/restore/:historyId', err)
  }
})

// ── Producer endpoints ────────────────────────────────────────────────────────

adminContentRouter.get('/producers', async (c) => {
  try {
    const list = await listProducers(c.env.CONTENT_DB, {
      category: c.req.query('category') || undefined,
      region:   c.req.query('region')   || undefined,
      country:  c.req.query('country')  || undefined,
    })
    return c.json({ data: list })
  } catch (err) {
    return serverError(c, 'GET /admin/content/producers', err)
  }
})

adminContentRouter.get('/producer/:slug', async (c) => {
  try {
    const producer = await getProducer(c.env.CONTENT_DB, c.req.param('slug'))
    if (!producer) return c.json({ error: { code: 'NOT_FOUND', message: 'Producer not found' } }, 404)
    return c.json({ data: producer })
  } catch (err) {
    return serverError(c, 'GET /admin/content/producer/:slug', err)
  }
})

adminContentRouter.put('/producer/:slug', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const raw    = await c.req.json()
    const parsed = ProducerSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400)
    }

    const body   = parsed.data
    const result = await putProducer(c.env.CONTENT_DB, c.req.param('slug'), {
      category:   body.category,
      name:       body.name,
      region:     body.region,
      country:    body.country,
      founded:    body.founded    ?? null,
      shortStory: body.shortStory ?? null,
      story:      body.story      ?? null,
      philosophy: body.philosophy ?? null,
      estateInfo: body.estateInfo ?? [],
      images:     body.images     ?? [],
      website:    body.website    ?? null,
    }, getAdminId(c))
    return c.json({ data: result })
  } catch (err) {
    return serverError(c, 'PUT /admin/content/producer/:slug', err)
  }
})

adminContentRouter.get('/producer/:slug/history', async (c) => {
  try {
    const limit   = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
    const history = await getProducerHistory(c.env.CONTENT_DB, c.req.param('slug'), limit)
    return c.json({ data: history })
  } catch (err) {
    return serverError(c, 'GET /admin/content/producer/:slug/history', err)
  }
})

// ── Dish template endpoints ──────────────────────────────────────────────────

adminContentRouter.get('/dish-templates', async (c) => {
  try {
    const activeParam = c.req.query('active')
    const list = await listDishTemplates(c.env.CONTENT_DB, {
      category: c.req.query('category') || 'wine',
      active: activeParam === undefined ? undefined : activeParam === 'true',
      search: c.req.query('search') || undefined,
    })
    return c.json({ data: list })
  } catch (err) {
    return serverError(c, 'GET /admin/content/dish-templates', err)
  }
})

adminContentRouter.post('/dish-templates', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const raw = await c.req.json()
    const parsed = DishTemplateSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400)
    }

    const result = await createDishTemplate(c.env.CONTENT_DB, parsed.data)
    return c.json({ data: result }, 201)
  } catch (err) {
    return serverError(c, 'POST /admin/content/dish-templates', err)
  }
})

adminContentRouter.put('/dish-templates/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid dish template id' } }, 400)
    }

    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const raw = await c.req.json()
    const parsed = DishTemplateSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400)
    }

    const result = await updateDishTemplate(c.env.CONTENT_DB, id, parsed.data)
    return c.json({ data: result })
  } catch (err) {
    return serverError(c, 'PUT /admin/content/dish-templates/:id', err)
  }
})

adminContentRouter.delete('/dish-templates/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid dish template id' } }, 400)
    }

    await deleteDishTemplate(c.env.CONTENT_DB, id)
    return c.json({ data: { deleted: true } })
  } catch (err) {
    return serverError(c, 'DELETE /admin/content/dish-templates/:id', err)
  }
})
