import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders, shipments, shipmentCommands, shipmentEvents } from '@repo/db/schema'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Env } from '../../index'
import { requireAdminOrProxy } from '../../middleware/auth'
import { getClientIp, serverError } from '../../lib/request'
import { logAdminAction } from '../../lib/audit'
import { allegroHeaders, sleep } from '../../lib/allegro-orders/helpers'
import { getActiveAllegroToken } from '../../lib/allegro-tokens'
import { recordStatusChange } from '../../lib/record-status-change'
import { refreshOrderShipments, type ShipmentSnapshotEntry } from '../../lib/allegro-shipments'

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

const ORDER_STATUSES_BLOCKING_DELIVERED = new Set([
  'delivered',
  'cancelled',
  'refunded',
  'return_requested',
  'return_in_transit',
  'return_received',
  'disputed',
])

const ORDER_STATUSES_BLOCKING_SHIPPED = new Set([
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'return_requested',
  'return_in_transit',
  'return_received',
  'disputed',
])

const ACTIVE_SHIPMENT_ORDER_STATUSES = ['paid', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'] as const
const ISSUE_CODES = new Set(['EXCEPTION', 'HOLD', 'FAILED', 'UNDELIVERED', 'REFUSED', 'CANCELLED', 'RETURNED', 'RETURN_TO_SENDER', 'ERROR'])
const TERMINAL_CODES = new Set(['DELIVERED', 'PICKED_UP', 'RETURNED', 'CANCELLED'])

type ShipmentQueue =
  | 'all'
  | 'to_ship'
  | 'label_created'
  | 'awaiting_pickup'
  | 'in_transit'
  | 'problem'
  | 'delivered'
  | 'stale'

type ShippingCenterRow = {
  id: string
  orderId: number
  orderNumber: string
  externalOrderId: string | null
  orderStatus: string
  fulfillmentStatus: string | null
  customerName: string | null
  customerEmail: string | null
  buyerLogin: string | null
  shippingMethod: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  waybill: string | null
  allegroShipmentId: string | null
  carrierId: string | null
  carrierName: string | null
  deliveryMethodId: string | null
  pickupId: string | null
  statusCode: string
  statusLabel: string | null
  occurredAt: string | null
  lastSyncedAt: string | null
  queue: ShipmentQueue
  freshness: 'fresh' | 'stale' | 'unknown'
  events: Array<{ code: string; label: string | null; occurredAt: string | null }>
}

const batchIdsSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1).max(100),
  force: z.boolean().optional(),
})

const shipmentIdsSchema = z.object({
  shipmentIds: z.array(z.string().min(1)).min(1).max(100),
})

const cancelShipmentSchema = z.object({
  shipmentId: z.string().min(1),
})

const pickupAddressSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().nullable(),
  street: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional().nullable(),
  countryCode: z.string().min(2).max(2).default('PL'),
  email: z.string().email(),
  phone: z.string().min(5),
  point: z.string().optional().nullable(),
})

const pickupProposalsSchema = z.object({
  shipmentIds: z.array(z.string().min(1)).min(1).max(100),
  readyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: pickupAddressSchema.optional(),
})

const createPickupSchema = z.object({
  shipmentIds: z.array(z.string().min(1)).min(1).max(100),
  pickupTime: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    minTime: z.string().optional(),
    maxTime: z.string().optional(),
  }),
  address: pickupAddressSchema.optional(),
})

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function normCode(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase() || 'UNKNOWN'
}

function getFreshness(orderStatus: string, occurredAt: string | null): 'fresh' | 'stale' | 'unknown' {
  if (!['shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(orderStatus)) return 'unknown'
  const d = parseDate(occurredAt)
  if (!d) return 'unknown'
  const ageMs = Date.now() - d.getTime()
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown'
  const threshold = orderStatus === 'delivered' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
  return ageMs <= threshold ? 'fresh' : 'stale'
}

function deriveQueue(row: {
  orderStatus: string
  waybill: string | null
  statusCode: string
  fulfillmentStatus: string | null
  occurredAt: string | null
}): ShipmentQueue {
  const code = normCode(row.statusCode)
  const freshness = getFreshness(row.orderStatus, row.occurredAt)
  if (freshness === 'stale' && !TERMINAL_CODES.has(code)) return 'stale'
  if (ISSUE_CODES.has(code)) return 'problem'
  if (row.orderStatus === 'delivered' || code === 'DELIVERED' || code === 'PICKED_UP') return 'delivered'
  if (!row.waybill && ['paid', 'processing'].includes(row.orderStatus)) return 'to_ship'
  if (code === 'LABEL_CREATED' || code === 'CREATED' || code === 'NEW' || code === 'READY' || code === 'REGISTERED') return 'label_created'
  if (row.waybill && (!row.fulfillmentStatus || row.fulfillmentStatus === 'READY_FOR_SHIPMENT')) return 'awaiting_pickup'
  if (row.waybill || code === 'SENT' || code.includes('TRANSIT') || code.includes('SORT')) return 'in_transit'
  return 'all'
}

function buildShippingRows(orderRows: Array<{
  id: number
  orderNumber: string
  externalId: string | null
  status: string
  allegroFulfillmentStatus: string | null
  customerData: { name?: string; email?: string; allegroLogin?: string } | null
  shippingMethod: string | null
  trackingNumber: string | null
  allegroShipmentId: string | null
  allegroShipmentsSnapshot: ShipmentSnapshotEntry[] | null
  createdAt: Date
  paidAt: Date | null
  shippedAt: Date | null
  deliveredAt: Date | null
  updatedAt: Date
}>): ShippingCenterRow[] {
  const rows: ShippingCenterRow[] = []

  for (const order of orderRows) {
    const snapshots = order.allegroShipmentsSnapshot ?? []
    const base = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      externalOrderId: order.externalId,
      orderStatus: order.status,
      fulfillmentStatus: order.allegroFulfillmentStatus,
      customerName: order.customerData?.name ?? null,
      customerEmail: order.customerData?.email ?? null,
      buyerLogin: order.customerData?.allegroLogin ?? null,
      shippingMethod: order.shippingMethod ?? null,
      createdAt: order.createdAt.toISOString(),
      paidAt: toIso(order.paidAt),
      shippedAt: toIso(order.shippedAt),
      deliveredAt: toIso(order.deliveredAt),
      deliveryMethodId: null,
      pickupId: null,
      lastSyncedAt: toIso(order.updatedAt),
    }

    if (snapshots.length === 0) {
      const statusCode = order.trackingNumber ? 'SENT' : 'NONE'
      const occurredAt = toIso(order.shippedAt ?? order.paidAt ?? order.createdAt)
      const draft = {
        ...base,
        id: `${order.id}:pending`,
        waybill: order.trackingNumber ?? null,
        allegroShipmentId: order.allegroShipmentId ?? null,
        carrierId: null,
        carrierName: null,
        statusCode,
        statusLabel: order.trackingNumber ? 'Nadana' : 'Do nadania',
        occurredAt,
        events: [],
      }
      rows.push({
        ...draft,
        queue: deriveQueue(draft),
        freshness: getFreshness(order.status, occurredAt),
      })
      continue
    }

    snapshots.forEach((snapshot, idx) => {
      const statusCode = normCode(snapshot.statusCode)
      const occurredAt = snapshot.occurredAt ?? null
      const draft = {
        ...base,
        id: `${order.id}:${encodeURIComponent(snapshot.waybill || `shipment-${idx}`)}`,
        waybill: snapshot.waybill || null,
        allegroShipmentId: order.allegroShipmentId ?? null,
        carrierId: snapshot.carrierId ?? null,
        carrierName: snapshot.carrierName ?? null,
        statusCode,
        statusLabel: snapshot.statusLabel ?? null,
        occurredAt,
        events: snapshot.events ?? [],
      }
      rows.push({
        ...draft,
        queue: deriveQueue(draft),
        freshness: getFreshness(order.status, occurredAt),
      })
    })
  }

  return rows
}

async function persistShipmentSnapshot(
  db: ReturnType<typeof createDb>,
  order: { id: number; externalId: string | null; allegroShipmentId: string | null },
  snapshot: ShipmentSnapshotEntry[] | null,
) {
  if (!order.externalId || !snapshot?.length) return
  const now = new Date()

  for (const entry of snapshot) {
    if (!entry.waybill) continue
    const occurredAt = parseDate(entry.occurredAt)
    const [saved] = await db.insert(shipments).values({
      orderId: order.id,
      externalOrderId: order.externalId,
      allegroShipmentId: order.allegroShipmentId,
      waybill: entry.waybill.slice(0, 100),
      carrierId: entry.carrierId?.slice(0, 100) ?? null,
      carrierName: entry.carrierName?.slice(0, 255) ?? null,
      statusCode: normCode(entry.statusCode),
      statusLabel: entry.statusLabel?.slice(0, 255) ?? null,
      occurredAt,
      lastSyncedAt: now,
      raw: entry as unknown as Record<string, unknown>,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [shipments.orderId, shipments.waybill],
      set: {
        allegroShipmentId: order.allegroShipmentId,
        carrierId: entry.carrierId?.slice(0, 100) ?? null,
        carrierName: entry.carrierName?.slice(0, 255) ?? null,
        statusCode: normCode(entry.statusCode),
        statusLabel: entry.statusLabel?.slice(0, 255) ?? null,
        occurredAt,
        lastSyncedAt: now,
        raw: entry as unknown as Record<string, unknown>,
        updatedAt: now,
      },
    }).returning({ id: shipments.id })

    for (const event of entry.events ?? []) {
      await db.insert(shipmentEvents).values({
        shipmentId: saved.id,
        code: normCode(event.code),
        label: event.label?.slice(0, 255) ?? null,
        occurredAt: parseDate(event.occurredAt),
        source: 'allegro_sync',
        raw: event as Record<string, unknown>,
      }).onConflictDoNothing().catch(() => {})
    }
  }
}

async function recordShipmentCommand(
  db: ReturnType<typeof createDb>,
  values: {
    commandId: string
    type: string
    status: string
    orderId?: number | null
    shipmentId?: number | null
    allegroShipmentId?: string | null
    pickupId?: string | null
    retryAfter?: number | null
    requestPayload?: Record<string, unknown> | null
    responsePayload?: Record<string, unknown> | null
    errors?: Array<Record<string, unknown>> | null
    createdByAdminId?: number | null
  },
) {
  const now = new Date()
  await db.insert(shipmentCommands).values({
    commandId: values.commandId,
    type: values.type,
    status: values.status,
    orderId: values.orderId ?? null,
    shipmentId: values.shipmentId ?? null,
    allegroShipmentId: values.allegroShipmentId ?? null,
    pickupId: values.pickupId ?? null,
    retryAfter: values.retryAfter ?? null,
    requestPayload: values.requestPayload ?? null,
    responsePayload: values.responsePayload ?? null,
    errors: values.errors ?? null,
    createdByAdminId: values.createdByAdminId ?? null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: shipmentCommands.commandId,
    set: {
      status: values.status,
      shipmentId: values.shipmentId ?? null,
      allegroShipmentId: values.allegroShipmentId ?? null,
      pickupId: values.pickupId ?? null,
      retryAfter: values.retryAfter ?? null,
      responsePayload: values.responsePayload ?? null,
      errors: values.errors ?? null,
      updatedAt: now,
    },
  }).catch((err) => console.warn('[ShippingCenter] command log failed', err))
}

// GET /admin/shipping
adminShipmentsRouter.get('/shipping', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const page = Math.max(parseInt(c.req.query('page') ?? '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10), 1), 100)
    const queue = (c.req.query('queue') ?? 'all') as ShipmentQueue
    const search = (c.req.query('search') ?? '').trim()
    const carrierId = (c.req.query('carrierId') ?? '').trim()
    const fulfillment = (c.req.query('fulfillment') ?? '').trim()
    const from = c.req.query('from') ?? ''
    const to = c.req.query('to') ?? ''

    const conditions: any[] = [
      eq(orders.source, 'allegro'),
      inArray(orders.status, [...ACTIVE_SHIPMENT_ORDER_STATUSES] as any),
    ]

    if (fulfillment) conditions.push(eq(orders.allegroFulfillmentStatus, fulfillment))
    if (from) conditions.push(gte(orders.createdAt, new Date(from)))
    if (to) conditions.push(lte(orders.createdAt, new Date(to)))
    if (search) {
      const safe = search.replace(/[%_]/g, '')
      const term = `%${safe}%`
      conditions.push(sql`(
        ${orders.orderNumber} ILIKE ${term}
        OR ${orders.externalId} ILIKE ${term}
        OR ${orders.trackingNumber} ILIKE ${term}
        OR ${orders.customerData}->>'name' ILIKE ${term}
        OR ${orders.customerData}->>'email' ILIKE ${term}
        OR ${orders.customerData}->>'allegroLogin' ILIKE ${term}
        OR ${orders.allegroShipmentsSnapshot}::text ILIKE ${term}
      )`)
    }

    const orderRows = await db.query.orders.findMany({
      columns: {
        id: true,
        orderNumber: true,
        externalId: true,
        status: true,
        allegroFulfillmentStatus: true,
        customerData: true,
        shippingMethod: true,
        trackingNumber: true,
        allegroShipmentId: true,
        allegroShipmentsSnapshot: true,
        createdAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        updatedAt: true,
      },
      where: and(...conditions),
      orderBy: desc(orders.createdAt),
      limit: 500,
    })

    let rows = buildShippingRows(orderRows)
    if (queue && queue !== 'all') rows = rows.filter((row) => row.queue === queue)
    if (carrierId) rows = rows.filter((row) => row.carrierId === carrierId)

    const summary = {
      total: rows.length,
      toShip: rows.filter((row) => row.queue === 'to_ship').length,
      labelCreated: rows.filter((row) => row.queue === 'label_created').length,
      awaitingPickup: rows.filter((row) => row.queue === 'awaiting_pickup').length,
      inTransit: rows.filter((row) => row.queue === 'in_transit').length,
      problem: rows.filter((row) => row.queue === 'problem').length,
      delivered: rows.filter((row) => row.queue === 'delivered').length,
      stale: rows.filter((row) => row.queue === 'stale').length,
    }

    const carriers = Array.from(new Set(rows.map((row) => row.carrierId).filter((id): id is string => !!id))).sort()
    const start = (page - 1) * limit
    const data = rows.slice(start, start + limit)

    return c.json({
      success: true,
      data,
      summary,
      filters: { carriers },
      meta: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) },
      health: {
        circuitOpen: await c.env.ALLEGRO_KV.get('shipments:circuit_open').catch(() => null),
        nextDueAt: await c.env.ALLEGRO_KV.get('shipments:next_due_at').catch(() => null),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/shipping', err)
  }
})

// GET /admin/shipping/orders/:id
adminShipmentsRouter.get('/shipping/orders/:id', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id') ?? '', 10)
    if (!Number.isFinite(orderId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Nieprawidlowe ID zamowienia' } }, 400)
    }

    const order = await db.query.orders.findFirst({
      columns: {
        id: true,
        orderNumber: true,
        externalId: true,
        status: true,
        allegroFulfillmentStatus: true,
        customerData: true,
        shippingMethod: true,
        trackingNumber: true,
        allegroShipmentId: true,
        allegroShipmentsSnapshot: true,
        createdAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        updatedAt: true,
      },
      where: eq(orders.id, orderId),
    })

    if (!order) return c.json({ error: { code: 'NOT_FOUND', message: 'Zamowienie nie znalezione' } }, 404)

    const [commands, persistedShipments] = await Promise.all([
      db.select().from(shipmentCommands).where(eq(shipmentCommands.orderId, orderId)).orderBy(desc(shipmentCommands.createdAt)).limit(20),
      db.query.shipments.findMany({
        where: eq(shipments.orderId, orderId),
        with: { events: { orderBy: desc(shipmentEvents.occurredAt), limit: 50 } },
        orderBy: desc(shipments.updatedAt),
      }).catch(() => []),
    ])

    return c.json({
      success: true,
      data: {
        rows: buildShippingRows([order]),
        commands,
        persistedShipments,
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/shipping/orders/:id', err)
  }
})

// POST /admin/shipping/refresh
adminShipmentsRouter.post('/shipping/refresh', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const body = batchIdsSchema.parse(await c.req.json())
    const results: Array<{ orderId: number; refreshed: boolean; cached: boolean }> = []

    for (const orderId of body.orderIds) {
      const result = await refreshOrderShipments(db, c.env, orderId, { force: body.force ?? false })
      const [order] = await db.select({
        id: orders.id,
        externalId: orders.externalId,
        allegroShipmentId: orders.allegroShipmentId,
      }).from(orders).where(eq(orders.id, orderId)).limit(1)
      if (order) await persistShipmentSnapshot(db, order, result.snapshot)
      results.push({ orderId, refreshed: result.refreshed, cached: result.cached })
    }

    if (c.env.ALLEGRO_KV) {
      await c.env.ALLEGRO_KV.put('shipments:next_due_at', new Date(Date.now() + 10 * 60 * 1000).toISOString(), { expirationTtl: 3600 }).catch(() => {})
    }

    return c.json({ success: true, data: results })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Nieprawidlowe dane odswiezania przesylek' } }, 400)
    }
    return serverError(c, 'POST /admin/shipping/refresh', err)
  }
})

// POST /admin/shipping/protocol
adminShipmentsRouter.post('/shipping/protocol', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const body = shipmentIdsSchema.parse(await c.req.json())
    const token = await getActiveAllegroToken(c.env)
    if (!token) return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)

    const resp = await fetch(`${token.apiBase}/shipment-management/protocol`, {
      method: 'POST',
      headers: { ...allegroHeaders(token.accessToken, true), Accept: 'application/octet-stream' },
      body: JSON.stringify({ shipmentIds: body.shipmentIds }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!resp.ok) {
      return c.json({ error: { code: 'PROTOCOL_FAILED', message: `Nie udalo sie pobrac protokolu: ${resp.status}` } }, 502)
    }

    const now = new Date()
    await db.update(shipments).set({ protocolDownloadedAt: now, updatedAt: now }).where(inArray(shipments.allegroShipmentId, body.shipmentIds)).catch(() => {})

    const pdfBuffer = await resp.arrayBuffer()
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="protokol-nadania.pdf"',
        'Content-Length': String(pdfBuffer.byteLength),
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Wybierz od 1 do 100 przesylek' } }, 400)
    }
    return serverError(c, 'POST /admin/shipping/protocol', err)
  }
})

// POST /admin/shipping/cancel
adminShipmentsRouter.post('/shipping/cancel', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const body = cancelShipmentSchema.parse(await c.req.json())
    const token = await getActiveAllegroToken(c.env)
    if (!token) return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)

    const commandId = crypto.randomUUID()
    const requestPayload = { commandId, input: { shipmentId: body.shipmentId } }
    const adminUser = c.get('user')
    await recordShipmentCommand(db, {
      commandId,
      type: 'cancel_shipment',
      status: 'IN_PROGRESS',
      allegroShipmentId: body.shipmentId,
      requestPayload,
      createdByAdminId: parseInt(adminUser.sub),
    })

    const resp = await fetch(`${token.apiBase}/shipment-management/shipments/cancel-commands`, {
      method: 'POST',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(10_000),
    })

    const data = await resp.json().catch(() => ({})) as Record<string, any>
    if (!resp.ok) {
      await recordShipmentCommand(db, {
        commandId,
        type: 'cancel_shipment',
        status: 'ERROR',
        allegroShipmentId: body.shipmentId,
        responsePayload: data,
        errors: data.errors ?? [{ status: resp.status }],
      })
      return c.json({ error: { code: 'CANCEL_FAILED', message: data.errors?.[0]?.message ?? `Allegro error: ${resp.status}` } }, 502)
    }

    let finalStatus = 'IN_PROGRESS'
    let finalData = data
    for (let attempt = 0; attempt < 8; attempt++) {
      const pollResp = await fetch(`${token.apiBase}/shipment-management/shipments/cancel-commands/${commandId}`, {
        headers: allegroHeaders(token.accessToken),
        signal: AbortSignal.timeout(10_000),
      })
      const pollData = await pollResp.json().catch(() => ({})) as Record<string, any>
      finalData = pollData
      finalStatus = String(pollData.status ?? finalStatus)
      if (finalStatus !== 'IN_PROGRESS') break
      const retryAfter = parseInt(pollResp.headers.get('Retry-After') ?? '2', 10)
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 2) * 1000)
    }

    await recordShipmentCommand(db, {
      commandId,
      type: 'cancel_shipment',
      status: finalStatus,
      allegroShipmentId: body.shipmentId,
      responsePayload: finalData,
      errors: finalData.errors ?? null,
    })

    if (finalStatus === 'SUCCESS') {
      const now = new Date()
      await db.update(shipments).set({ statusCode: 'CANCELLED', statusLabel: 'Anulowana', updatedAt: now }).where(eq(shipments.allegroShipmentId, body.shipmentId)).catch(() => {})
    }

    return c.json({ success: true, data: { commandId, status: finalStatus, response: finalData } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Brak ID przesylki do anulowania' } }, 400)
    }
    return serverError(c, 'POST /admin/shipping/cancel', err)
  }
})

// POST /admin/shipping/pickup-proposals
adminShipmentsRouter.post('/shipping/pickup-proposals', async (c) => {
  try {
    const body = pickupProposalsSchema.parse(await c.req.json())
    const token = await getActiveAllegroToken(c.env)
    if (!token) return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)

    const payload = {
      shipmentIds: body.shipmentIds,
      ...(body.readyDate ? { readyDate: body.readyDate } : {}),
      ...(body.address ? { address: body.address } : {}),
    }

    const resp = await fetch(`${token.apiBase}/shipment-management/pickup-proposals`, {
      method: 'POST',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return c.json({ error: { code: 'PICKUP_PROPOSALS_FAILED', message: `Allegro error: ${resp.status}` } }, 502)
    }
    return c.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Nieprawidlowe dane odbioru przesylek' } }, 400)
    }
    return serverError(c, 'POST /admin/shipping/pickup-proposals', err)
  }
})

// POST /admin/shipping/pickups
adminShipmentsRouter.post('/shipping/pickups', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const body = createPickupSchema.parse(await c.req.json())
    const token = await getActiveAllegroToken(c.env)
    if (!token) return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)

    const commandId = crypto.randomUUID()
    const input = {
      shipmentIds: body.shipmentIds,
      pickupTime: body.pickupTime,
      ...(body.address ? { address: body.address } : {}),
    }
    const adminUser = c.get('user')
    await recordShipmentCommand(db, {
      commandId,
      type: 'create_pickup',
      status: 'IN_PROGRESS',
      requestPayload: { commandId, input },
      createdByAdminId: parseInt(adminUser.sub),
    })

    const resp = await fetch(`${token.apiBase}/shipment-management/pickups/create-commands`, {
      method: 'POST',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({ commandId, input }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await resp.json().catch(() => ({})) as Record<string, any>
    if (!resp.ok) {
      await recordShipmentCommand(db, {
        commandId,
        type: 'create_pickup',
        status: 'ERROR',
        responsePayload: data,
        errors: data.errors ?? [{ status: resp.status }],
      })
      return c.json({ error: { code: 'PICKUP_FAILED', message: data.errors?.[0]?.message ?? `Allegro error: ${resp.status}` } }, 502)
    }

    let finalStatus = 'IN_PROGRESS'
    let finalData = data
    for (let attempt = 0; attempt < 8; attempt++) {
      const pollResp = await fetch(`${token.apiBase}/shipment-management/pickups/create-commands/${commandId}`, {
        headers: allegroHeaders(token.accessToken),
        signal: AbortSignal.timeout(10_000),
      })
      const pollData = await pollResp.json().catch(() => ({})) as Record<string, any>
      finalData = pollData
      finalStatus = String(pollData.status ?? finalStatus)
      if (finalStatus !== 'IN_PROGRESS') break
      const retryAfter = parseInt(pollResp.headers.get('Retry-After') ?? '2', 10)
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 2) * 1000)
    }

    await recordShipmentCommand(db, {
      commandId,
      type: 'create_pickup',
      status: finalStatus,
      pickupId: typeof finalData.pickupId === 'string' ? finalData.pickupId : null,
      responsePayload: finalData,
      errors: finalData.errors ?? null,
    })

    if (finalStatus === 'SUCCESS' && typeof finalData.pickupId === 'string') {
      const now = new Date()
      await db.update(shipments).set({ pickupId: finalData.pickupId, updatedAt: now }).where(inArray(shipments.allegroShipmentId, body.shipmentIds)).catch(() => {})
    }

    return c.json({ success: true, data: { commandId, status: finalStatus, response: finalData } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Nieprawidlowe dane zamowienia odbioru' } }, 400)
    }
    return serverError(c, 'POST /admin/shipping/pickups', err)
  }
})

// GET /admin/shipping/pickups/:id
adminShipmentsRouter.get('/shipping/pickups/:id', async (c) => {
  try {
    const token = await getActiveAllegroToken(c.env)
    if (!token) return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    const pickupId = c.req.param('id')
    const resp = await fetch(`${token.apiBase}/shipment-management/pickups/${encodeURIComponent(pickupId)}`, {
      headers: allegroHeaders(token.accessToken),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return c.json({ error: { code: 'PICKUP_DETAILS_FAILED', message: `Allegro error: ${resp.status}` } }, 502)
    return c.json({ success: true, data })
  } catch (err) {
    return serverError(c, 'GET /admin/shipping/pickups/:id', err)
  }
})

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
      packages?: Array<{ weight: number; length: number; width: number; height: number; textOnLabel?: string }>
      additionalServices?: string[]
      referenceNumber?: string
    }>()

    const packageRows = body.packages?.length
      ? body.packages
      : [{ weight: body.weight, length: body.length, width: body.width, height: body.height }]

    if (!body.carrierId || !body.deliveryMethodId || packageRows.some((pkg) => !pkg.weight || !pkg.length || !pkg.width || !pkg.height)) {
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
    const adminUser = c.get('user')
    await recordShipmentCommand(db, {
      commandId,
      type: 'create_shipment',
      status: 'IN_PROGRESS',
      orderId,
      requestPayload: {
        deliveryMethodId: body.deliveryMethodId,
        checkoutFormId: order.externalId,
        packages: packageRows,
        additionalServices: body.additionalServices ?? [],
        referenceNumber: body.referenceNumber ?? null,
      },
      createdByAdminId: parseInt(adminUser.sub),
    })

    const createResp = await fetch(`${token.apiBase}/shipment-management/shipments/create-commands`, {
      method: 'POST',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({
        commandId,
        input: {
          deliveryMethodId: body.deliveryMethodId,
          checkoutFormId: order.externalId,
          packages: packageRows.map((pkg) => ({
            weight: { value: String(pkg.weight), unit: 'KILOGRAM' },
            dimensions: {
              length: { value: String(pkg.length), unit: 'CENTIMETER' },
              width: { value: String(pkg.width), unit: 'CENTIMETER' },
              height: { value: String(pkg.height), unit: 'CENTIMETER' },
            },
            ...(pkg.textOnLabel ? { textOnLabel: pkg.textOnLabel.slice(0, 100) } : {}),
          })),
          ...(body.additionalServices?.length ? { additionalServices: body.additionalServices } : {}),
          ...(body.referenceNumber ? { referenceNumber: body.referenceNumber } : {}),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!createResp.ok) {
      const errBody = await createResp.json().catch(() => ({})) as { errors?: Array<{ message?: string }> }
      const errMsg = errBody.errors?.[0]?.message ?? `Allegro error ${createResp.status}`
      await recordShipmentCommand(db, {
        commandId,
        type: 'create_shipment',
        status: 'ERROR',
        orderId,
        responsePayload: errBody as Record<string, unknown>,
        errors: errBody.errors as Array<Record<string, unknown>> | undefined ?? [{ status: createResp.status }],
      })
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
        await recordShipmentCommand(db, {
          commandId,
          type: 'create_shipment',
          status: 'FAILURE',
          orderId,
          responsePayload: pollData as Record<string, unknown>,
          errors: pollData.errors as Array<Record<string, unknown>> | undefined ?? null,
        })
        return c.json({ error: { code: 'SHIPMENT_FAILED', message: errMsg } }, 502)
      }

      const retryAfter = parseInt(pollResp.headers.get('Retry-After') ?? '2', 10)
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 2) * 1000)
    }

    if (!shipmentId) {
      await recordShipmentCommand(db, {
        commandId,
        type: 'create_shipment',
        status: 'TIMEOUT',
        orderId,
      })
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
    const snapshot = trackingNumber ? [{
      waybill: trackingNumber,
      carrierId: 'UNKNOWN',
      statusCode: 'LABEL_CREATED',
      statusLabel: 'Etykieta wygenerowana',
      occurredAt: now.toISOString(),
      isSelected: true,
    }] : undefined

    await db.update(orders).set({
      status: 'shipped',
      shippedAt: now,
      trackingNumber: trackingNumber || null,
      allegroShipmentId: shipmentId,
      allegroFulfillmentStatus: fulfillmentResp.ok ? 'SENT' : null,
      ...(snapshot && { allegroShipmentsSnapshot: snapshot }),
      updatedAt: now,
    }).where(eq(orders.id, orderId))

    await recordShipmentCommand(db, {
      commandId,
      type: 'create_shipment',
      status: 'SUCCESS',
      orderId,
      allegroShipmentId: shipmentId,
      responsePayload: { shipmentId, trackingNumber, fulfillmentSynced: fulfillmentResp.ok },
    })

    if (snapshot) {
      await persistShipmentSnapshot(db, { id: orderId, externalId: order.externalId, allegroShipmentId: shipmentId }, snapshot)
    }

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
      status: orders.status,
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

    const now = new Date()
    const nextStatus =
      body.status === 'PICKED_UP' && !ORDER_STATUSES_BLOCKING_DELIVERED.has(order.status)
        ? 'delivered'
        : body.status === 'SENT' && !ORDER_STATUSES_BLOCKING_SHIPPED.has(order.status)
          ? 'shipped'
          : null

    await db.update(orders).set({
      allegroFulfillmentStatus: body.status,
      ...(body.status === 'PICKED_UP'
        ? { deliveredAt: now }
        : body.status === 'SENT' && nextStatus === 'shipped'
          ? { shippedAt: now }
          : {}),
      updatedAt: now,
    }).where(eq(orders.id, orderId))

    if (nextStatus) {
      await recordStatusChange(db, {
        orderId: order.id,
        category: 'status',
        newValue: nextStatus,
        source: 'admin',
        sourceRef: order.externalId,
        metadata: {
          fulfillmentStatus: body.status,
          previousStatus: order.status,
        },
      })
    }

    return c.json({ success: true })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/fulfillment', err)
  }
})
