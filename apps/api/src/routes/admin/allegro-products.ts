/**
 * Admin — Allegro Products Router
 * Endpoints: list offers, link/unlink SKU↔offerId, push stock
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { eq, isNotNull, sql } from 'drizzle-orm'
import { createDb } from '@repo/db/client'
import { products } from '@repo/db/schema'
import { requireAdminOrProxy } from '../../middleware/auth'
import { serverError } from '../../lib/request'
import { KV_KEYS, getAllegroApiBase } from '../../lib/allegro'
import { decryptText } from '../../lib/crypto'
import { patchAllegroOfferFields } from '../../lib/allegro-offer-sync'
import type { Env } from '../../index'

const ALLEGRO_CONTENT_TYPE = 'application/vnd.allegro.public.v1+json'

// ── Helper: resolve access token from KV (with DB fallback) ──────────────────

async function resolveAccessToken(env: Env): Promise<string | null> {
  const rawKvToken = await env.ALLEGRO_KV.get(KV_KEYS.ACCESS_TOKEN)
  const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
  if (rawKvToken && encKey) {
    const token = await decryptText(rawKvToken, encKey).catch(() => null)
    if (token) return token
  }
  return null
}

export const adminAllegroProductsRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /admin/allegro-products/offers  🛡️
// Lista ofert sprzedawcy z Allegro
// z informacją które SKU są już podłączone
// ============================================
adminAllegroProductsRouter.get('/offers', requireAdminOrProxy(), async (c) => {
  try {
    const search = c.req.query('search') ?? ''
    const limit  = Math.min(200, Math.max(1, parseInt(c.req.query('limit') ?? '50', 10)))
    const offset = Math.max(0, parseInt(c.req.query('offset') ?? '0', 10))

    const accessToken = await resolveAccessToken(c.env)
    if (!accessToken) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podłączone' } }, 400)
    }

    const environment = ((await c.env.ALLEGRO_KV.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as 'sandbox' | 'production'
    const apiBase     = getAllegroApiBase(environment)

    // Build Allegro query params
    const params = new URLSearchParams({
      limit:  String(limit),
      offset: String(offset),
    })
    if (search) params.set('name', search)

    const allegroResp = await fetch(`${apiBase}/sale/offers?${params}`, {
      signal:  AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        ALLEGRO_CONTENT_TYPE,
      },
    })

    if (!allegroResp.ok) {
      const body = await allegroResp.text().catch(() => '')
      return c.json(
        { error: { code: 'ALLEGRO_API_ERROR', message: `Allegro zwróciło ${allegroResp.status}: ${body}` } },
        502,
      )
    }

    const allegroData = await allegroResp.json() as {
      offers: Array<{ id: string; name: string; [key: string]: unknown }>
      totalCount?: number
      count?: number
    }

    // Fetch linked products from DB
    const db = createDb(c.env.DATABASE_URL)
    const linkedProducts = await db
      .select({ sku: products.sku, allegroOfferId: products.allegroOfferId })
      .from(products)
      .where(isNotNull(products.allegroOfferId))

    // Build offerId → sku map
    const offerToSku = new Map<string, string>()
    for (const p of linkedProducts) {
      if (p.allegroOfferId) offerToSku.set(p.allegroOfferId, p.sku)
    }

    const offers = (allegroData.offers ?? []).map((offer) => ({
      ...offer,
      linkedSku: offerToSku.get(offer.id) ?? null,
    }))

    return c.json({
      success: true,
      data: offers,
      meta: {
        total:  allegroData.totalCount ?? allegroData.count ?? offers.length,
        limit,
        offset,
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/allegro-products/offers', err)
  }
})

// ============================================
// POST /admin/allegro-products/link  🛡️
// Podłącz SKU ↔ offerId (1:1)
// ============================================
const LinkSchema = z.object({
  sku:        z.string().min(1),
  offerId:    z.string().min(1),
  syncPrice:  z.boolean().optional().default(false),
  syncStock:  z.boolean().optional().default(false),
})

adminAllegroProductsRouter.post('/link', requireAdminOrProxy(), async (c) => {
    try {
      const body   = await c.req.json().catch(() => null)
      const parsed = LinkSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: { code: 'INVALID_BODY', message: 'Wymagane pola: sku, offerId' } }, 400)
      }
      const { sku, offerId, syncPrice, syncStock } = parsed.data
      const db = createDb(c.env.DATABASE_URL)

      // Check product exists
      const [product] = await db
        .select({
          sku:      products.sku,
          price:    products.price,
          currency: products.currency,
          stock:    products.stock,
          reserved: products.reserved,
        })
        .from(products)
        .where(eq(products.sku, sku))
        .limit(1)

      if (!product) {
        return c.json({ error: { code: 'PRODUCT_NOT_FOUND', message: `Produkt o SKU "${sku}" nie istnieje` } }, 404)
      }

      let syncResult: Awaited<ReturnType<typeof patchAllegroOfferFields>> | null = null
      if (syncPrice || syncStock) {
        syncResult = await patchAllegroOfferFields(c.env, {
          offerId,
          price: syncPrice ? { amount: product.price, currency: product.currency } : undefined,
          stock: syncStock ? Math.max(0, product.stock - product.reserved) : undefined,
        })
      }

      // Enforce 1:1 — unlink any product currently holding this offerId
      await db
        .update(products)
        .set({
          allegroOfferId: null,
          allegroSyncPrice: false,
          allegroSyncStock: false,
          updatedAt: new Date(),
        })
        .where(sql`${products.allegroOfferId} = ${offerId}`)

      // Link the target product
      const [updated] = await db
        .update(products)
        .set({
          allegroOfferId: offerId,
          allegroSyncPrice: syncPrice,
          allegroSyncStock: syncStock,
          updatedAt: new Date(),
        })
        .where(eq(products.sku, sku))
        .returning({
          sku: products.sku,
          allegroOfferId: products.allegroOfferId,
          allegroSyncPrice: products.allegroSyncPrice,
          allegroSyncStock: products.allegroSyncStock,
        })

      return c.json({ success: true, data: { ...updated, syncResult } })
    } catch (err) {
      return serverError(c, 'POST /admin/allegro-products/link', err)
    }
})

// ============================================
// DELETE /admin/allegro-products/link/:sku  🛡️
// Odłącz SKU od oferty Allegro
// ============================================
adminAllegroProductsRouter.delete('/link/:sku', requireAdminOrProxy(), async (c) => {
  try {
    const sku = c.req.param('sku') ?? ''
    const db  = createDb(c.env.DATABASE_URL)

    const [product] = await db
      .select({ sku: products.sku })
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1)

    if (!product) {
      return c.json({ error: { code: 'PRODUCT_NOT_FOUND', message: `Produkt o SKU "${sku}" nie istnieje` } }, 404)
    }

    await db
      .update(products)
      .set({
        allegroOfferId: null,
        allegroSyncPrice: false,
        allegroSyncStock: false,
        updatedAt: new Date(),
      })
      .where(sql`${products.sku} = ${sku}`)

    return c.json({ success: true })
  } catch (err) {
    return serverError(c, 'DELETE /admin/allegro-products/link/:sku', err)
  }
})

// ============================================
// POST /admin/allegro-products/:sku/push-sync  🛡️
// Wypchnij wybrane pola do Allegro
// ============================================
adminAllegroProductsRouter.post('/:sku/push-sync', requireAdminOrProxy(), async (c) => {
  try {
    const sku = c.req.param('sku') ?? ''
    const db  = createDb(c.env.DATABASE_URL)

    const [product] = await db
      .select({
        sku:            products.sku,
        allegroOfferId: products.allegroOfferId,
        allegroSyncPrice: products.allegroSyncPrice,
        allegroSyncStock: products.allegroSyncStock,
        price:          products.price,
        currency:       products.currency,
        stock:          products.stock,
        reserved:       products.reserved,
      })
      .from(products)
      .where(sql`${products.sku} = ${sku}`)
      .limit(1)

    if (!product) {
      return c.json({ error: { code: 'PRODUCT_NOT_FOUND', message: `Produkt o SKU "${sku}" nie istnieje` } }, 404)
    }

    if (!product.allegroOfferId) {
      return c.json(
        { error: { code: 'NOT_LINKED', message: `Produkt "${sku}" nie jest podłączony do żadnej oferty Allegro` } },
        400,
      )
    }

    if (!product.allegroSyncPrice && !product.allegroSyncStock) {
      return c.json(
        { error: { code: 'NO_SYNC_FIELDS', message: 'Nie wybrano pól do synchronizacji z Allegro' } },
        400,
      )
    }

    const available = Math.max(0, (product.stock ?? 0) - (product.reserved ?? 0))
    const syncResult = await patchAllegroOfferFields(c.env, {
      offerId: product.allegroOfferId,
      price: product.allegroSyncPrice ? { amount: product.price, currency: product.currency } : undefined,
      stock: product.allegroSyncStock ? available : undefined,
    })

    return c.json({
      success: true,
      data: {
        sku,
        allegroOfferId: product.allegroOfferId,
        ...syncResult,
      },
    })
  } catch (err) {
    return serverError(c, 'POST /admin/allegro-products/:sku/push-sync', err)
  }
})

// Backwards-compatible stock-only endpoint used by older UI.
adminAllegroProductsRouter.post('/:sku/push-stock', requireAdminOrProxy(), async (c) => {
  try {
    const sku = c.req.param('sku') ?? ''
    const db  = createDb(c.env.DATABASE_URL)

    const [product] = await db
      .select({
        sku:            products.sku,
        allegroOfferId: products.allegroOfferId,
        stock:          products.stock,
        reserved:       products.reserved,
      })
      .from(products)
      .where(sql`${products.sku} = ${sku}`)
      .limit(1)

    if (!product) {
      return c.json({ error: { code: 'PRODUCT_NOT_FOUND', message: `Produkt o SKU "${sku}" nie istnieje` } }, 404)
    }

    if (!product.allegroOfferId) {
      return c.json(
        { error: { code: 'NOT_LINKED', message: `Produkt "${sku}" nie jest podłączony do żadnej oferty Allegro` } },
        400,
      )
    }

    const available = Math.max(0, (product.stock ?? 0) - (product.reserved ?? 0))
    await patchAllegroOfferFields(c.env, {
      offerId: product.allegroOfferId,
      stock: available,
    })

    return c.json({
      success: true,
      data: {
        sku,
        allegroOfferId: product.allegroOfferId,
        pushed: available,
      },
    })
  } catch (err) {
    return serverError(c, 'POST /admin/allegro-products/:sku/push-stock', err)
  }
})
