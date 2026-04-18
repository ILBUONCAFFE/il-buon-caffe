import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import type { Env } from '../../index'
import { requireAdminOrProxy } from '../../middleware/auth'
import { getClientIp, serverError } from '../../lib/request'
import { logAdminAction } from '../../lib/audit'
import { allegroHeaders, sleep } from '../../lib/allegro-orders/helpers'
import { getActiveAllegroToken } from '../../lib/allegro-tokens'

export const adminShipmentsRouter = new Hono<{ Bindings: Env }>()

adminShipmentsRouter.use('*', requireAdminOrProxy())

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

// GET /admin/shipment/delivery-services
adminShipmentsRouter.get('/shipment/delivery-services', async (c) => {
  try {
    const cacheKey = 'allegro:delivery-services'
    const cached = await c.env.ALLEGRO_KV.get(cacheKey)
    if (cached) {
      return c.json({ success: true, data: JSON.parse(cached) })
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const resp = await fetch(`${token.apiBase}/shipment-management/delivery-services`, {
      headers: allegroHeaders(token.accessToken),
      signal: AbortSignal.timeout(10_000),
    })

    if (!resp.ok) {
      return c.json({ error: { code: 'ALLEGRO_ERROR', message: `Allegro API error: ${resp.status}` } }, 502)
    }

    const raw = await resp.json() as { deliveryServices?: Array<Record<string, unknown>> }
    const services = (raw.deliveryServices ?? []).map((service) => ({
      id: String(service.id ?? ''),
      name: String(service.name ?? ''),
      carrierId: String(service.carrierId ?? ''),
      maxWeight: asNumber(service.maxWeight),
      maxLength: asNumber(service.maxLength),
      maxWidth: asNumber(service.maxWidth),
      maxHeight: asNumber(service.maxHeight),
      volumetricDivisor: service.volumetricDivisor == null ? null : asNumber(service.volumetricDivisor),
    }))

    await c.env.ALLEGRO_KV.put(cacheKey, JSON.stringify(services), { expirationTtl: 3600 })

    return c.json({ success: true, data: services })
  } catch (err) {
    return serverError(c, 'GET /admin/shipment/delivery-services', err)
  }
})

// POST /admin/orders/:id/shipment
adminShipmentsRouter.post('/orders/:id/shipment', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id') ?? '', 10)

    const body = await c.req.json<{
      carrierId: string
      deliveryMethodId: string
      weight: number
      length: number
      width: number
      height: number
      referenceNumber?: string
    }>()

    if (!body.carrierId || !body.deliveryMethodId || !body.weight || !body.length || !body.width || !body.height) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Brakujace pola: carrierId, deliveryMethodId, weight, length, width, height' } }, 400)
    }

    if (body.referenceNumber && body.referenceNumber.length > 35) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'referenceNumber max 35 znakow (limit ORLEN Paczka)' } }, 400)
    }

    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      source: orders.source,
      externalId: orders.externalId,
      allegroShipmentId: orders.allegroShipmentId,
    }).from(orders).where(eq(orders.id, orderId)).limit(1)

    if (!order) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zamowienie nie znalezione' } }, 404)
    }
    if (order.source !== 'allegro' || !order.externalId) {
      return c.json({ error: { code: 'NOT_ALLEGRO', message: 'Zamowienie nie pochodzi z Allegro' } }, 400)
    }
    if (!['paid', 'processing'].includes(order.status)) {
      return c.json({ error: { code: 'INVALID_STATUS', message: `Nie mozna nadac przesylki dla statusu: ${order.status}` } }, 400)
    }
    if (order.allegroShipmentId) {
      return c.json({ error: { code: 'ALREADY_SHIPPED', message: 'Przesylka juz zostala nadana' } }, 409)
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const commandId = crypto.randomUUID()

    const createResp = await fetch(`${token.apiBase}/shipment-management/shipments/create-commands`, {
      method: 'POST',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({
        commandId,
        input: {
          deliveryMethodId: body.deliveryMethodId,
          checkoutFormId: order.externalId,
          packages: [{
            weight: { value: String(body.weight), unit: 'KILOGRAM' },
            dimensions: {
              length: { value: String(body.length), unit: 'CENTIMETER' },
              width: { value: String(body.width), unit: 'CENTIMETER' },
              height: { value: String(body.height), unit: 'CENTIMETER' },
            },
          }],
          ...(body.referenceNumber ? { referenceNumber: body.referenceNumber } : {}),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!createResp.ok) {
      const errBody = await createResp.json().catch(() => ({})) as { errors?: Array<{ message?: string }> }
      const errMsg = errBody.errors?.[0]?.message ?? `Allegro error ${createResp.status}`
      return c.json({ error: { code: 'SHIPMENT_CREATE_FAILED', message: errMsg } }, 502)
    }

    let shipmentId: string | null = null

    for (let attempt = 0; attempt < 10; attempt++) {
      const pollResp = await fetch(`${token.apiBase}/shipment-management/shipments/create-commands/${commandId}`, {
        headers: allegroHeaders(token.accessToken),
        signal: AbortSignal.timeout(10_000),
      })

      if (!pollResp.ok) {
        return c.json({ error: { code: 'POLL_FAILED', message: `Polling status failed: ${pollResp.status}` } }, 502)
      }

      const pollData = await pollResp.json() as {
        status: string
        shipmentId?: string
        errors?: Array<{ message?: string }>
      }

      if (pollData.status === 'SUCCESS' && pollData.shipmentId) {
        shipmentId = pollData.shipmentId
        break
      }

      if (pollData.status === 'FAILURE') {
        const errMsg = pollData.errors?.[0]?.message ?? 'Allegro shipment creation failed'
        return c.json({ error: { code: 'SHIPMENT_FAILED', message: errMsg } }, 502)
      }

      const retryAfter = parseInt(pollResp.headers.get('Retry-After') ?? '2', 10)
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 2) * 1000)
    }

    if (!shipmentId) {
      return c.json({ error: { code: 'TIMEOUT', message: 'Tworzenie przesylki trwa zbyt dlugo - sprobuj ponownie' } }, 504)
    }

    const shipmentResp = await fetch(`${token.apiBase}/shipment-management/shipments/${shipmentId}`, {
      headers: allegroHeaders(token.accessToken),
      signal: AbortSignal.timeout(10_000),
    })

    let trackingNumber = ''
    if (shipmentResp.ok) {
      const shipmentData = await shipmentResp.json() as { packages?: Array<{ waybill?: string }> }
      trackingNumber = shipmentData.packages?.[0]?.waybill ?? ''
    }

    const fulfillmentResp = await fetch(`${token.apiBase}/order/checkout-forms/${order.externalId}/fulfillment`, {
      method: 'PUT',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({ status: 'SENT' }),
      signal: AbortSignal.timeout(10_000),
    })

    const now = new Date()
    await db.update(orders).set({
      status: 'shipped',
      shippedAt: now,
      trackingNumber: trackingNumber || null,
      trackingStatus: trackingNumber ? 'Etykieta wygenerowana' : null,
      trackingStatusCode: trackingNumber ? 'LABEL_CREATED' : null,
      trackingStatusUpdatedAt: trackingNumber ? now : null,
      allegroShipmentId: shipmentId,
      allegroFulfillmentStatus: fulfillmentResp.ok ? 'SENT' : null,
      updatedAt: now,
    }).where(eq(orders.id, orderId))

    const adminUser = c.get('user')
    await logAdminAction(db, {
      adminSub: adminUser.sub,
      action: 'admin_action',
      targetOrderId: orderId,
      ipAddress: getClientIp(c),
      details: {
        event: 'shipment_created',
        orderId,
        orderNumber: order.orderNumber,
        shipmentId,
        trackingNumber,
        carrierId: body.carrierId,
        fulfillmentSynced: fulfillmentResp.ok,
      },
    })

    return c.json({
      success: true,
      data: { shipmentId, trackingNumber, status: 'shipped' as const },
    })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/shipment', err)
  }
})

// GET /admin/orders/:id/label
adminShipmentsRouter.get('/orders/:id/label', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id') ?? '', 10)
    const mode = c.req.query('mode')

    const [order] = await db.select({
      orderNumber: orders.orderNumber,
      allegroShipmentId: orders.allegroShipmentId,
      externalId: orders.externalId,
    }).from(orders).where(eq(orders.id, orderId)).limit(1)

    if (!order) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zamowienie nie znalezione' } }, 404)
    }
    if (!order.allegroShipmentId) {
      return c.json({ error: { code: 'NO_SHIPMENT', message: 'Przesylka nie zostala jeszcze nadana' } }, 400)
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    let shipmentIds: string[] = [order.allegroShipmentId]

    if (mode === 'all' && order.externalId) {
      const listResp = await fetch(
        `${token.apiBase}/shipment-management/shipments?checkoutFormId=${order.externalId}`,
        { headers: allegroHeaders(token.accessToken), signal: AbortSignal.timeout(10_000) }
      )
      if (listResp.ok) {
        const listData = await listResp.json() as { shipments?: Array<{ id?: string }> }
        const ids = (listData.shipments ?? []).map(s => s.id).filter((id): id is string => Boolean(id))
        if (ids.length > 0) shipmentIds = ids
      }
    }

    const labelResp = await fetch(`${token.apiBase}/shipment-management/label`, {
      method: 'POST',
      headers: {
        ...allegroHeaders(token.accessToken, true),
        Accept: 'application/octet-stream',
      },
      body: JSON.stringify({
        shipmentIds,
        pageSize: 'A4',
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!labelResp.ok) {
      return c.json({ error: { code: 'LABEL_FAILED', message: `Nie udalo sie pobrac etykiety: ${labelResp.status}` } }, 502)
    }

    const pdfBuffer = await labelResp.arrayBuffer()
    const filename = `etykieta-${order.orderNumber}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/:id/label', err)
  }
})

// POST /admin/orders/:id/fulfillment
adminShipmentsRouter.post('/orders/:id/fulfillment', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id') ?? '', 10)
    const body = await c.req.json<{ status: string }>()

    const validStatuses = ['NEW', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SENT', 'PICKED_UP', 'CANCELLED', 'SUSPENDED']
    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: `Nieprawidlowy status: ${body.status}` } }, 400)
    }

    const [order] = await db.select({
      id: orders.id,
      externalId: orders.externalId,
    }).from(orders).where(eq(orders.id, orderId)).limit(1)

    if (!order?.externalId) {
      return c.json({ error: { code: 'NOT_ALLEGRO', message: 'Zamowienie nie pochodzi z Allegro' } }, 400)
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const resp = await fetch(`${token.apiBase}/order/checkout-forms/${order.externalId}/fulfillment`, {
      method: 'PUT',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({ status: body.status }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!resp.ok) {
      return c.json({ error: { code: 'FULFILLMENT_FAILED', message: `Allegro error: ${resp.status}` } }, 502)
    }

    await db.update(orders).set({
      allegroFulfillmentStatus: body.status,
      ...(body.status === 'SENT' || body.status === 'PICKED_UP'
        ? {
            trackingStatusCode: body.status,
            trackingStatus: body.status === 'PICKED_UP' ? 'Przesylka odebrana' : 'Przesylka nadana',
            trackingStatusUpdatedAt: new Date(),
          }
        : {}),
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId))

    return c.json({ success: true })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/fulfillment', err)
  }
})
