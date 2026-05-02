import { Hono } from 'hono'
import { z } from 'zod'
import { requireAdminOrProxy } from '../../middleware/auth'
import { checkContentLength, serverError } from '../../lib/request'
import {
  getProductContent,
  putProductContent,
  putProductWineDetails,
  deleteProductContent,
  getProductContentHistory,
  restoreProductContent,
  getProducer,
  listProducers,
  putProducer,
  getProducerHistory,
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

const ProductContentSchema = z.object({
  category:     z.string().min(1).max(50),
  producerSlug: z.string().max(100).nullable().optional(),
  awards:       z.array(AwardSchema).optional(),
  ritual:       z.string().max(5000).nullable().optional(),
  servingTemp:  z.string().max(100).nullable().optional(),
  profile:      z.record(z.string(), z.number().min(0).max(100)).optional(),
  sensory:      z.record(z.string(), z.string().max(2000)).optional(),
  extended:     z.record(z.string(), z.unknown()).optional(),
  isPublished:  z.boolean().optional(),
})

const ProductWineDetailsSchema = z.object({
  category: z.string().min(1).max(50).optional().default('wine'),
  wineDetails: z.record(z.string(), z.unknown()),
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

const OptionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}, z.string().url().max(500).nullable().optional())

const ProducerSchema = z.object({
  category:   z.string().min(1).max(50),
  name:       z.string().min(1).max(255),
  region:     z.string().min(1).max(200),
  country:    z.string().min(1).max(100),
  founded:    z.number().int().min(1000).max(2100).nullable().optional(),
  countryCode: z.string().min(2).max(2).nullable().optional(),
  established: z.string().max(100).nullable().optional(),
  altitude:   z.string().max(100).nullable().optional(),
  soil:       z.string().max(200).nullable().optional(),
  climate:    z.string().max(200).nullable().optional(),
  shortStory: z.string().max(500).nullable().optional(),
  story:      z.string().max(20000).nullable().optional(),
  philosophy: z.string().max(5000).nullable().optional(),
  estateInfo: z.array(ProducerEstateInfoSchema).optional(),
  images:     z.array(ProducerImageSchema).optional(),
  website:    OptionalUrlSchema,
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

adminContentRouter.put('/product/:sku/wine-details', async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_BODY)
    if (sizeErr) return sizeErr

    const raw = await c.req.json()
    const parsed = ProductWineDetailsSchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, 400)
    }

    const body = parsed.data
    const result = await putProductWineDetails(
      c.env.CONTENT_DB,
      c.req.param('sku'),
      body.category,
      body.wineDetails,
      getAdminId(c)
    )
    return c.json({ data: result })
  } catch (err) {
    return serverError(c, 'PUT /admin/content/product/:sku/wine-details', err)
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
      countryCode: body.countryCode?.toLowerCase() ?? null,
      established: body.established ?? null,
      altitude:   body.altitude   ?? null,
      soil:       body.soil       ?? null,
      climate:    body.climate    ?? null,
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
