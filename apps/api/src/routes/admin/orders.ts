import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders, orderItems, products, users, stockChanges,
} from '@repo/db/schema'
import { logAdminAction } from '../../lib/audit'
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import { getActiveAllegroToken } from '../../lib/allegro-tokens'
import { allegroHeaders } from '../../lib/allegro-orders/helpers'
import { refreshOrderTrackingSnapshot } from '../../lib/allegro-orders/tracking-refresh'
import { bulkReconcileProcessingOrders } from '../../lib/allegro-orders/bulk-reconcile'
import { recordStatusChange } from '../../lib/record-status-change'
import type { Env } from '../../index'
import { checkContentLength, parsePagination, getClientIp, serverError } from '../../lib/request'

export const adminOrdersRouter = new Hono<{ Bindings: Env }>()

type ShipmentDisplayStatus = 'none' | 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'issue' | 'unknown'
type ShipmentFreshness = 'fresh' | 'stale' | 'unknown'

const TRACKING_STALE_MS = 60 * 60 * 1000
const TRACKING_DELIVERED_STALE_MS = 24 * 60 * 60 * 1000
const TRACKING_REFRESH_LOCK_TTL_SECONDS = 90

function normalizeTrackingCode(value: string | null | undefined): string | null {
  if (!value) return null
  const norm = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return norm || null
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  const d = toDateOrNull(value)
  return d ? d.toISOString() : null
}

function mapShipmentDisplayStatus(input: {
  orderStatus: string
  trackingNumber: string | null
  trackingStatusCode: string | null
  trackingStatus: string | null
}): ShipmentDisplayStatus {
  const status = input.orderStatus
  const code = normalizeTrackingCode(input.trackingStatusCode)
  const statusText = (input.trackingStatus ?? '').toLowerCase()

  // Cancelled/refunded orders have no active shipment regardless of stale tracking data
  if (status === 'cancelled' || status === 'refunded') return 'none'

  if (!input.trackingNumber) {
    const code = normalizeTrackingCode(input.trackingStatusCode)
    if (!code) return 'none'
    if (
      code.includes('DELIVERED') ||
      code.includes('PICKED_UP') ||
      code.includes('PICKUP') ||
      code.includes('RECEIVED')
    ) return 'delivered'
    if (
      code.includes('OUT_FOR_DELIVERY') ||
      code.includes('COURIER')
    ) return 'out_for_delivery'
    if (
      code.includes('IN_TRANSIT') ||
      code.includes('TRANSIT') ||
      code.includes('SENT') ||
      code.includes('SHIPPED')
    ) return 'in_transit'
    if (
      code.includes('LABEL_CREATED') ||
      code.includes('CREATED') ||
      code.includes('REGISTERED')
    ) return 'label_created'
    if (
      code.includes('EXCEPTION') ||
      code.includes('FAILED') ||
      code.includes('RETURN') ||
      code.includes('UNDELIVERED') ||
      code.includes('REFUSED')
    ) return 'issue'
    return 'none'
  }

  if (status === 'delivered') return 'delivered'

  if (!code) return 'label_created'

  if (
    code.includes('DELIVERED') ||
    code.includes('PICKED_UP') ||
    code.includes('PICKUP') ||
    code.includes('RECEIVED')
  ) {
    return 'delivered'
  }

  if (
    code.includes('OUT_FOR_DELIVERY') ||
    code.includes('COURIER') ||
    statusText.includes('dor')
  ) {
    return 'out_for_delivery'
  }

  if (
    code === 'LABEL_CREATED' ||
    code.includes('CREATED') ||
    code.includes('REGISTERED')
  ) {
    return 'label_created'
  }

  if (
    code.includes('EXCEPTION') ||
    code.includes('FAILED') ||
    code.includes('RETURN') ||
    code.includes('UNDELIVERED') ||
    code.includes('REFUSED') ||
    code.includes('CANCELLED') ||
    statusText.includes('problem') ||
    statusText.includes('blad') ||
    statusText.includes('error')
  ) {
    return 'issue'
  }

  if (
    code.includes('IN_TRANSIT') ||
    code.includes('TRANSIT') ||
    code.includes('SORT') ||
    code.includes('SHIPPED') ||
    code.includes('SENT') ||
    statusText.includes('tranzyt') ||
    statusText.includes('w drodze')
  ) {
    return 'in_transit'
  }

  return 'unknown'
}

function getShipmentFreshness(orderStatus: string, trackingStatusUpdatedAt: Date | string | null | undefined): ShipmentFreshness {
  if (!['shipped', 'delivered'].includes(orderStatus)) return 'unknown'
  const updatedAt = toDateOrNull(trackingStatusUpdatedAt)
  if (!updatedAt) return 'unknown'

  const ageMs = Date.now() - updatedAt.getTime()
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown'

  const threshold = orderStatus === 'delivered' ? TRACKING_DELIVERED_STALE_MS : TRACKING_STALE_MS
  return ageMs <= threshold ? 'fresh' : 'stale'
}

function buildTrackingSnapshot(order: {
  id: number
  status: string
  trackingNumber: string | null
  trackingStatus: string | null
  trackingStatusCode: string | null
  trackingStatusUpdatedAt: Date | string | null
  trackingLastEventAt: Date | string | null
  allegroShipmentsSnapshot?: { waybill: string; carrierId: string; statusCode: string; statusLabel: string | null; occurredAt: string | null; isSelected: boolean }[] | null
}) {
  const trackingStatusCode = normalizeTrackingCode(order.trackingStatusCode)
  const shipmentDisplayStatus = mapShipmentDisplayStatus({
    orderStatus: order.status,
    trackingNumber: order.trackingNumber,
    trackingStatus: order.trackingStatus,
    trackingStatusCode,
  })

  return {
    id: order.id,
    status: order.status,
    trackingNumber: order.trackingNumber,
    trackingStatus: order.trackingStatus,
    trackingStatusCode,
    trackingStatusUpdatedAt: toIsoOrNull(order.trackingStatusUpdatedAt),
    trackingLastEventAt: toIsoOrNull(order.trackingLastEventAt),
    shipmentDisplayStatus,
    shipmentFreshness: getShipmentFreshness(order.status, order.trackingStatusUpdatedAt),
    allShipments: order.allegroShipmentsSnapshot ?? null,
  }
}

// All admin order routes require admin role or internal proxy secret
adminOrdersRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/orders/tracking-pulse  🛡️
// Lightweight delta endpoint for frontend adaptive polling.
// Returns only changed tracking fields for shipped/delivered orders since `since`.
// LIMIT 51 trick: if 51 rows → hasMore:true (return 50, signal more).
// nextSince is always server-side time — never trust client clock.
// ============================================
adminOrdersRouter.get('/tracking-pulse', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const sinceParam = c.req.query('since')

    let sinceDate: Date
    if (sinceParam) {
      sinceDate = new Date(sinceParam)
      if (Number.isNaN(sinceDate.getTime())) {
        return c.json({ error: { code: 'INVALID_SINCE', message: 'Nieprawidłowy parametr since' } }, 400)
      }
    } else {
      // First poll — default to last 5 min so any recent cron run is included
      sinceDate = new Date(Date.now() - 5 * 60 * 1000)
    }

    // Capture server time BEFORE the query — used as nextSince in response.
    // Client must use this value in the next poll to avoid clock drift.
    const serverNow = new Date().toISOString()

    const rows = await db
      .select({
        id: orders.id,
        status: orders.status,
        trackingNumber: orders.trackingNumber,
        trackingStatus: orders.trackingStatus,
        trackingStatusCode: orders.trackingStatusCode,
        trackingStatusUpdatedAt: orders.trackingStatusUpdatedAt,
        trackingLastEventAt: orders.trackingLastEventAt,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.updatedAt} > ${sinceDate}`,
          inArray(orders.status, ['shipped', 'delivered']),
        ),
      )
      .orderBy(sql`${orders.updatedAt} ASC`)
      .limit(51)

    const hasMore = rows.length === 51
    const slice = hasMore ? rows.slice(0, 50) : rows

    const data = slice.map(o =>
      buildTrackingSnapshot({
        id: o.id,
        status: o.status,
        trackingNumber: o.trackingNumber ?? null,
        trackingStatus: o.trackingStatus ?? null,
        trackingStatusCode: o.trackingStatusCode ?? null,
        trackingStatusUpdatedAt: o.trackingStatusUpdatedAt ?? null,
        trackingLastEventAt: o.trackingLastEventAt ?? null,
      }),
    )

    return c.json({ success: true, data, nextSince: serverNow, hasMore })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/tracking-pulse', err)
  }
})

// ============================================
// GET /admin/orders  🛡️
// Wszystkie zamówienia (shop + allegro) z paginacją
// ============================================
adminOrdersRouter.get('/', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db               = createDb(c.env.DATABASE_URL)
    const { page, limit } = parsePagination(c)
    const source   = c.req.query('source')   || ''
    const queue    = c.req.query('queue')    || ''
    const status   = c.req.query('status')   || ''
    const from     = c.req.query('from')     || ''
    const to       = c.req.query('to')       || ''
    const search   = c.req.query('search')   || ''

    const conditions: ReturnType<typeof eq>[] = []

    const validSources  = ['shop', 'allegro']
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
    const validQueues   = ['fulfillment', 'awaiting_payment']

    if (source  && validSources.includes(source))   conditions.push(eq(orders.source,  source  as any))
    if (queue && validQueues.includes(queue)) {
      if (queue === 'fulfillment') {
        // Ready to pack/fulfil: paid or processing orders only.
        conditions.push(inArray(orders.status, ['paid', 'processing']))
      } else if (queue === 'awaiting_payment') {
        // Allegro BOUGHT/FILLED_IN are persisted as pending until READY_FOR_PROCESSING arrives.
        conditions.push(eq(orders.source, 'allegro'))
        conditions.push(eq(orders.status, 'pending'))
      }
    }
    if (status  && validStatuses.includes(status))  conditions.push(eq(orders.status,  status  as any))
    if (from)   conditions.push(gte(orders.createdAt, new Date(from)))
    if (to)     conditions.push(lte(orders.createdAt, new Date(to)))
    if (search) {
      const raw  = search.trim()
      const safe = raw.replace(/[%_]/g, '')
      const term = `%${safe}%`

      // Detect: pure number or #number → search by order id/number
      const isNumericId = /^#?\d{1,8}$/.test(raw)
      // Detect: email
      const isEmail = raw.includes('@')
      // Detect: NIP (10 digits, optionally with dashes)
      const isNip = /^\d{3}[-]?\d{3}[-]?\d{2}[-]?\d{2}$/.test(raw)
      // Detect: phone — after stripping separators (+, -, spaces, parens), 7–12 digits
      const stripped = raw.replace(/[\s\-\+\(\)\.]/g, '')
      const isPhone  = /^\d{7,12}$/.test(stripped) && !isNip && !isNumericId

      if (isNumericId) {
        const numId = parseInt(raw.replace('#', ''), 10)
        conditions.push(
          sql`(${orders.orderNumber} ILIKE ${term} OR ${orders.id} = ${numId})`
        )
      } else if (isEmail) {
        conditions.push(
          sql`(${orders.customerData}->>'email' ILIKE ${term})`
        )
      } else if (isNip) {
        const cleanNip = raw.replace(/-/g, '')
        const nipTerm  = `%${cleanNip}%`
        conditions.push(
          sql`(${orders.customerData}::text ILIKE ${nipTerm})`
        )
      } else if (isPhone) {
        // Take last 9 digits to strip country prefix (+48, 0048) — Polish mobile = 9 digits
        const suffix    = stripped.slice(-9)
        const phoneTerm = `%${suffix}%`
        conditions.push(
          sql`REGEXP_REPLACE(${orders.customerData}->>'phone', '[^0-9]', '', 'g') LIKE ${phoneTerm}`
        )
      } else {
        // Wide search across all relevant fields + product names via subquery
        conditions.push(
          sql`(
            ${orders.orderNumber}    ILIKE ${term}
            OR ${orders.externalId}  ILIKE ${term}
            OR ${orders.trackingNumber} ILIKE ${term}
            OR ${orders.customerData}->>'name'  ILIKE ${term}
            OR ${orders.customerData}->>'email' ILIKE ${term}
            OR ${orders.customerData}->>'phone' ILIKE ${term}
            OR EXISTS (
              SELECT 1 FROM order_items oi
              WHERE oi.order_id = ${orders.id}
                AND oi.product_name ILIKE ${term}
            )
          )`
        )
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(where),
      db.query.orders.findMany({
        columns: {
          id: true, orderNumber: true, source: true, externalId: true,
          status: true, total: true, subtotal: true, shippingCost: true,
          currency: true, totalPln: true,
          customerData: true, paymentMethod: true, shippingMethod: true,
          trackingNumber: true, trackingStatus: true,
          trackingStatusCode: true, trackingStatusUpdatedAt: true,
          trackingLastEventAt: true,
          allegroShipmentId: true, allegroFulfillmentStatus: true,
          paidAt: true, shippedAt: true, createdAt: true,
          updatedAt: true, internalNotes: true, notes: true, invoiceRequired: true,
        },
        with: {
          items: {
            columns: { id: true, productSku: true, productName: true, quantity: true, unitPrice: true, totalPrice: true },
          },
        },
        where,
        // Sort by most relevant date: paidAt for paid orders, createdAt for pending.
        // NULLS LAST so pending orders (no paidAt) appear after paid ones.
        orderBy: sql`COALESCE(${orders.paidAt}, ${orders.createdAt}) DESC NULLS LAST`,
        limit,
        offset: (page - 1) * limit,
      }),
    ])

    const total      = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    const data = rows.map(o => ({
      ...o,
      total:        Number(o.total),
      subtotal:     Number(o.subtotal),
      shippingCost: Number(o.shippingCost ?? 0),
      totalPln:     o.totalPln != null ? Number(o.totalPln) : null,
      itemsCount:   o.items.length,
      ...buildTrackingSnapshot({
        id: o.id,
        status: o.status,
        trackingNumber: o.trackingNumber ?? null,
        trackingStatus: o.trackingStatus ?? null,
        trackingStatusCode: o.trackingStatusCode ?? null,
        trackingStatusUpdatedAt: o.trackingStatusUpdatedAt ?? null,
        trackingLastEventAt: o.trackingLastEventAt ?? null,
      }),
    }))

    return c.json({ success: true, data, meta: { total, page, limit, totalPages } })
  } catch (err) {
    return serverError(c, 'GET /admin/orders', err)
  }
})

// ============================================
// GET /admin/orders/:id  🛡️
// Szczegóły zamówienia
// ============================================
adminOrdersRouter.get('/:id', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db      = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(orderId)) return c.json({ error: 'Nieprawidłowe ID' }, 400)

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        user: {
          columns: { id: true, email: true, name: true, role: true },
        },
      },
    })

    if (!order) return c.json({ error: 'Zamówienie nie znalezione' }, 404)

    return c.json({
      success: true,
      data: {
        ...order,
        total:        Number(order.total),
        subtotal:     Number(order.subtotal),
        shippingCost: Number(order.shippingCost ?? 0),
        totalPln:     order.totalPln     != null ? Number(order.totalPln)     : null,
        exchangeRate: order.exchangeRate != null ? Number(order.exchangeRate) : null,
        rateDate:     order.rateDate     ?? null,
        ...buildTrackingSnapshot({
          id: order.id,
          status: order.status,
          trackingNumber: order.trackingNumber ?? null,
          trackingStatus: order.trackingStatus ?? null,
          trackingStatusCode: order.trackingStatusCode ?? null,
          trackingStatusUpdatedAt: order.trackingStatusUpdatedAt ?? null,
          trackingLastEventAt: order.trackingLastEventAt ?? null,
        }),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/:id', err)
  }
})

// ============================================
// POST /admin/orders/:id/tracking/refresh  🛡️
// Asynchroniczne odświeżenie snapshotu trackingu
// ============================================
adminOrdersRouter.post('/:id/tracking/refresh', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(orderId)) return c.json({ error: 'Nieprawidłowe ID zamówienia' }, 400)

    const [order] = await db.select({
      id: orders.id,
      status: orders.status,
      source: orders.source,
      externalId: orders.externalId,
      allegroShipmentId: orders.allegroShipmentId,
      trackingNumber: orders.trackingNumber,
      trackingStatus: orders.trackingStatus,
      trackingStatusCode: orders.trackingStatusCode,
      trackingStatusUpdatedAt: orders.trackingStatusUpdatedAt,
      trackingLastEventAt: orders.trackingLastEventAt,
      allegroShipmentsSnapshot: orders.allegroShipmentsSnapshot,
    }).from(orders).where(eq(orders.id, orderId)).limit(1)

    if (!order) return c.json({ error: 'Zamówienie nie znalezione' }, 404)

    const snapshot = buildTrackingSnapshot({
      id: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      trackingStatus: order.trackingStatus,
      trackingStatusCode: order.trackingStatusCode,
      trackingStatusUpdatedAt: order.trackingStatusUpdatedAt,
      trackingLastEventAt: order.trackingLastEventAt,
    })

    if (order.source !== 'allegro' || !order.externalId) {
      return c.json({
        success: true,
        refreshed: false,
        reason: 'not_refreshable',
        data: snapshot,
      })
    }

    if (snapshot.shipmentFreshness === 'fresh') {
      return c.json({
        success: true,
        refreshed: false,
        reason: 'fresh',
        data: snapshot,
      })
    }

    const lockKey = `allegro:tracking:refresh:order:${order.id}`
    const alreadyRefreshing = await c.env.ALLEGRO_KV.get(lockKey)
    if (alreadyRefreshing) {
      return c.json({
        success: true,
        refreshed: false,
        reason: 'already_refreshing',
        data: snapshot,
      })
    }

    await c.env.ALLEGRO_KV.put(lockKey, String(Date.now()), { expirationTtl: TRACKING_REFRESH_LOCK_TTL_SECONDS })

    // Synchronous refresh — returns fresh data to the frontend immediately
    try {
      await refreshOrderTrackingSnapshot(db, c.env, order.id, order.externalId!)
    } finally {
      await c.env.ALLEGRO_KV.delete(lockKey).catch(() => {})
    }

    // Re-read updated tracking data from DB
    const [updated] = await db.select({
      id: orders.id,
      status: orders.status,
      trackingNumber: orders.trackingNumber,
      trackingStatus: orders.trackingStatus,
      trackingStatusCode: orders.trackingStatusCode,
      trackingStatusUpdatedAt: orders.trackingStatusUpdatedAt,
      trackingLastEventAt: orders.trackingLastEventAt,
      allegroShipmentsSnapshot: orders.allegroShipmentsSnapshot,
    }).from(orders).where(eq(orders.id, orderId)).limit(1)

    const freshSnapshot = updated ? buildTrackingSnapshot({
      id: updated.id,
      status: updated.status,
      trackingNumber: updated.trackingNumber,
      trackingStatus: updated.trackingStatus,
      trackingStatusCode: updated.trackingStatusCode,
      trackingStatusUpdatedAt: updated.trackingStatusUpdatedAt,
      trackingLastEventAt: updated.trackingLastEventAt,
    }) : snapshot

    return c.json({
      success: true,
      refreshed: true,
      reason: 'refreshed',
      data: freshSnapshot,
    })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/tracking/refresh', err)
  }
})

// ============================================
// POST /admin/orders/reconcile-processing  🛡️
// Jednorazowy bulk reconcile dla zamówień processing
// ============================================
adminOrdersRouter.post('/reconcile-processing', async (c) => {
  try {
    const adminUser = c.get('user')
    const body = await c.req.json<{
      dryRun?: boolean
      includeStatuses?: string[]
      maxOrders?: number
    }>().catch(() => ({} as { dryRun?: boolean, includeStatuses?: string[], maxOrders?: number }))

    const result = await bulkReconcileProcessingOrders(c.env, {
      dryRun: body.dryRun ?? false,
      includeStatuses: body.includeStatuses,
      maxOrders: body.maxOrders,
    })

    const db = createDb(c.env.DATABASE_URL)
    await logAdminAction(db, {
      adminSub: adminUser.sub,
      action: 'admin_action',
      ipAddress: getClientIp(c),
      details: {
        event: 'reconcile_orders',
        total: result.total,
        updated: result.updated,
      },
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/reconcile-processing', err)
  }
})

// ============================================
// PATCH /admin/orders/:id/status  🛡️
// Zmiana statusu zamówienia
// ============================================
adminOrdersRouter.patch('/:id/status', async (c) => {
  try {
    const adminUser = c.get('user')
    const db        = createDb(c.env.DATABASE_URL)
    const orderId   = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(orderId)) return c.json({ error: 'Nieprawidłowe ID zamówienia' }, 400)

    const sizeErr = checkContentLength(c, 2_000)
    if (sizeErr) return sizeErr

    const body = await c.req.json<{
      status: string
      trackingNumber?: string
      internalNotes?: string
    }>()

    const validStatuses = ['paid', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: `Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}` }, 400)
    }

    const order = await db.query.orders.findFirst({
      columns: { id: true, orderNumber: true, status: true, userId: true },
      where: eq(orders.id, orderId),
    })

    if (!order) return c.json({ error: 'Zamówienie nie znalezione' }, 404)

    // Business rules: status flow
    const previousStatus = order.status
    const allowedTransitions: Record<string, string[]> = {
      pending:    ['paid', 'cancelled'],
      paid:       ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped:    ['delivered'],
      delivered:  [],
      cancelled:  [],
    }

    if (!allowedTransitions[previousStatus]?.includes(body.status)) {
      return c.json({
        error: `Niedozwolona zmiana statusu z '${previousStatus}' na '${body.status}'`,
      }, 422)
    }

    const setCols: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.trackingNumber) setCols.trackingNumber = body.trackingNumber.trim().slice(0, 100)
    if (body.internalNotes) setCols.internalNotes = body.internalNotes.trim().slice(0, 5000)
    if (body.status === 'shipped') setCols.shippedAt   = new Date()
    if (body.status === 'delivered') setCols.deliveredAt = new Date()

    // Release stock reservation if cancelled (before it was paid)
    if (body.status === 'cancelled' && previousStatus === 'pending') {
      const items = await db.query.orderItems.findMany({
        columns: { productSku: true, quantity: true },
        where: eq(orderItems.orderId, orderId),
      })
      for (const item of items) {
        await db.update(products)
          .set({ reserved: sql`GREATEST(0, ${products.reserved} - ${item.quantity})` })
          .where(eq(products.sku, item.productSku))
      }
    }

    // Restore stock if cancelled after being paid (return to stock)
    if (body.status === 'cancelled' && (previousStatus === 'paid' || previousStatus === 'processing')) {
      const items = await db.query.orderItems.findMany({
        columns: { productSku: true, quantity: true },
        where: eq(orderItems.orderId, orderId),
      })
      for (const item of items) {
        const prev = await db.query.products.findFirst({
          columns: { stock: true },
          where: eq(products.sku, item.productSku),
        })
        if (prev) {
          await db.update(products).set({
            stock: prev.stock + item.quantity,
          }).where(eq(products.sku, item.productSku))

          await db.insert(stockChanges).values({
            productSku:    item.productSku,
            previousStock: prev.stock,
            newStock:      prev.stock + item.quantity,
            change:        item.quantity,
            reason:        'cancellation',
            orderId,
            adminId:       parseInt(adminUser.sub),
            notes:         `Zwrot po anulowaniu zamówienia ${order.orderNumber}`,
          })
        }
      }
    }

    await recordStatusChange(db, {
      orderId,
      category: 'status',
      newValue: body.status,
      source: 'admin',
      sourceRef: adminUser.sub,
      metadata: body.internalNotes ? { note: body.internalNotes.trim().slice(0, 500) } : null,
    })
    if (Object.keys(setCols).length > 1) {
      await db.update(orders).set(setCols as any).where(eq(orders.id, orderId))
    }

    // Trigger processing watchdog if order becomes processing
    if (body.status === 'processing') {
      await Promise.all([
        c.env.ALLEGRO_KV.delete('orders:has_processing').catch(() => {}),
        c.env.ALLEGRO_KV.delete('orders:processing:next_due_at').catch(() => {}),
      ])
    }

    // Audit
    await logAdminAction(db, {
      adminSub:      adminUser.sub,
      action:        'admin_action',
      targetOrderId: orderId,
      ipAddress:     getClientIp(c),
      details: {
        event:          'status_change',
        previousStatus,
        newStatus:      body.status,
        orderNumber:    order.orderNumber,
        trackingNumber: body.trackingNumber,
      },
    })

    return c.json({ success: true, message: `Status zamówienia zmieniony na '${body.status}'` })
  } catch (err) {
    return serverError(c, 'PATCH /admin/orders/:id/status', err)
  }
})

// ── GET /:id/history ──────────────────────────────────────────────────────
adminOrdersRouter.get('/:id/history', async (c) => {
  try {
    const db  = c.get('db') as ReturnType<typeof createDb>
    const orderId = Number(c.req.param('id'))
    if (!Number.isFinite(orderId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Nieprawidłowe ID zamówienia' } }, 400)
    }

    // Verify order exists
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
    if (!order) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zamówienie nie znalezione' } }, 404)
    }

    // Raw SQL — order_status_history not in @repo/db/schema symlink yet (worktree)
    const result = await db.execute(sql`
      SELECT id, order_id, category, previous_value, new_value,
             source, source_ref, metadata, occurred_at
      FROM   order_status_history
      WHERE  order_id = ${orderId}
      ORDER  BY occurred_at ASC
    `)

    return c.json({ data: result.rows })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/:id/history', err)
  }
})
