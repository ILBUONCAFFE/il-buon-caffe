import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders, orderItems, products, users, stockChanges,
  returns, returnItems, refunds, allegroIssues, allegroIssueMessages,
  orderStatusHistory, auditLog,
} from '@repo/db/schema'
import { logAdminAction } from '../../lib/audit'
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import { recordStatusChange } from '../../lib/record-status-change'
import { refreshOrderShipments, type ShipmentSnapshotEntry } from '../../lib/allegro-shipments'
import { getActiveAllegroToken } from '../../lib/allegro-tokens'
import { containsLikePattern } from '@repo/db/orm'
import { allegroHeaders, buildCustomerData, fetchCheckoutForm } from '../../lib/allegro-orders/helpers'
import { reconcileOrder } from '../../lib/allegro-orders/handlers'
import type { Env } from '../../index'
import { checkContentLength, parsePagination, parseQueryDate, getClientIp, serverError } from '../../lib/request'

export const adminOrdersRouter = new Hono<{ Bindings: Env }>()

type ShipmentDisplayStatus = 'none' | 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'issue' | 'unknown'
type ShipmentFreshness = 'fresh' | 'stale' | 'unknown'

const TRACKING_STALE_MS = 60 * 60 * 1000
const TRACKING_DELIVERED_STALE_MS = 24 * 60 * 60 * 1000

function normalizeCode(value: string | null | undefined): string | null {
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

function mapStatusCodeToDisplay(rawCode: string | null, orderStatus: string): ShipmentDisplayStatus {
  if (orderStatus === 'cancelled' || orderStatus === 'refunded') return 'none'
  // Local order state authoritative for terminal delivery — Allegro fulfillment PICKED_UP
  // sets status='delivered', but shipment snapshot may stay stale at SENT for manual trackings.
  if (orderStatus === 'delivered') return 'delivered'
  const code = normalizeCode(rawCode)
  if (!code) return orderStatus === 'shipped' ? 'in_transit' : 'none'

  // Issues first — RETURN_TO_SENDER must beat any PICKUP/DELIVERED match
  if (
    code === 'EXCEPTION' || code === 'HOLD' || code === 'FAILED' ||
    code === 'UNDELIVERED' || code === 'REFUSED' || code === 'CANCELLED' ||
    code === 'RETURNED' || code === 'RETURN_TO_SENDER' || code === 'ERROR'
  ) return 'issue'

  // Terminal delivered states
  if (code === 'DELIVERED' || code === 'PICKED_UP') return 'delivered'

  // Awaiting customer pickup — counted as out-for-delivery semantically
  if (code === 'READY_FOR_PICKUP' || code === 'PICKUP_READY' || code === 'AVAILABLE_FOR_PICKUP') return 'out_for_delivery'
  if (code === 'OUT_FOR_DELIVERY' || code === 'RELEASED_FOR_DELIVERY' || code === 'NOTICE_LEFT' || code.includes('COURIER')) return 'out_for_delivery'

  // In-transit family (carrier facility scans, sorted, sent, shipped)
  if (
    code === 'IN_TRANSIT' || code === 'SENT' || code === 'SHIPPED' ||
    code === 'ARRIVED_CARRIER_FACILITY' || code === 'DEPARTED_CARRIER_FACILITY' ||
    code.includes('TRANSIT') || code.includes('SORT') || code.includes('FACILITY')
  ) return 'in_transit'

  // Pre-handover — label exists or carrier acknowledged manifest
  if (
    code === 'LABEL_CREATED' || code === 'LABEL_PRINTED' || code === 'PRINTED' ||
    code === 'CREATED' || code === 'NEW' || code === 'READY' || code === 'PENDING' ||
    code === 'REGISTERED' || code === 'INFO_RECEIVED'
  ) return 'label_created'

  return 'unknown'
}

function getShipmentFreshness(orderStatus: string, occurredAt: string | null): ShipmentFreshness {
  if (!['shipped', 'delivered'].includes(orderStatus)) return 'unknown'
  const updatedAt = toDateOrNull(occurredAt)
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
  allegroShipmentsSnapshot?: ShipmentSnapshotEntry[] | null
}) {
  const all = (order.allegroShipmentsSnapshot ?? []) as ShipmentSnapshotEntry[]
  const selected = all.find((s) => s.isSelected) ?? all[0] ?? null

  const statusCode = selected?.statusCode ?? null
  const statusLabel = selected?.statusLabel ?? null
  const occurredAt = selected?.occurredAt ?? null

  const shipmentDisplayStatus = mapStatusCodeToDisplay(statusCode, order.status)
  const shipmentFreshness = getShipmentFreshness(order.status, occurredAt)

  return {
    id: order.id,
    status: order.status,
    trackingNumber: order.trackingNumber,
    trackingStatus: statusLabel,
    trackingStatusCode: normalizeCode(statusCode),
    trackingStatusUpdatedAt: occurredAt,
    shipmentDisplayStatus,
    shipmentFreshness,
    allShipments: all.length > 0 ? all : null,
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function dateToIso(value: Date | string | null | undefined): string | null {
  const date = toDateOrNull(value)
  return date ? date.toISOString() : null
}

function buildOrderWarnings(order: {
  source: string
  status: string
  externalId: string | null
  allegroFulfillmentStatus: string | null
  trackingNumber: string | null
  allegroShipmentsSnapshot?: ShipmentSnapshotEntry[] | null
}) {
  const warnings: Array<{ code: string; level: 'warning' | 'error'; message: string }> = []
  if (order.source === 'allegro' && !order.externalId) {
    warnings.push({ code: 'MISSING_ALLEGRO_ID', level: 'error', message: 'Brak ID zamówienia Allegro.' })
  }
  if (order.source === 'allegro' && ['paid', 'processing', 'shipped'].includes(order.status) && !order.allegroFulfillmentStatus) {
    warnings.push({ code: 'MISSING_FULFILLMENT', level: 'warning', message: 'Brak lokalnie zapisanego statusu fulfillment Allegro.' })
  }
  if (order.status === 'shipped' && !order.trackingNumber && !(order.allegroShipmentsSnapshot ?? []).some((s) => s.waybill)) {
    warnings.push({ code: 'MISSING_TRACKING', level: 'warning', message: 'Zamówienie oznaczone jako wysłane, ale bez numeru przesyłki.' })
  }
  return warnings
}

function buildActionAvailability(order: {
  source: string
  status: string
  externalId: string | null
  allegroShipmentId: string | null
  trackingNumber: string | null
  allegroShipmentsSnapshot?: ShipmentSnapshotEntry[] | null
}) {
  const isAllegro = order.source === 'allegro' && !!order.externalId
  const hasShipment = !!order.allegroShipmentId || !!order.trackingNumber || (order.allegroShipmentsSnapshot ?? []).length > 0
  return {
    canRefreshShipment: isAllegro,
    canCreateShipment: isAllegro && ['paid', 'processing'].includes(order.status) && !order.allegroShipmentId,
    canDownloadLabel: isAllegro && !!order.allegroShipmentId,
    canSyncFulfillment: isAllegro && ['paid', 'processing', 'shipped'].includes(order.status),
    canMarkShipped: isAllegro && !hasShipment && ['paid', 'processing'].includes(order.status),
  }
}

async function fetchAllegroOrderLive(env: Env, externalId: string) {
  const token = await getActiveAllegroToken(env)
  if (!token) {
    return {
      connected: false,
      fetchedAt: new Date().toISOString(),
      error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podłączone' },
    }
  }

  const resp = await fetch(`${token.apiBase}/order/checkout-forms/${encodeURIComponent(externalId)}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { ...allegroHeaders(token.accessToken), 'Accept-Language': 'pl-PL' },
  })

  if (!resp.ok) {
    return {
      connected: true,
      fetchedAt: new Date().toISOString(),
      error: { code: 'ALLEGRO_ERROR', message: `Allegro API zwróciło ${resp.status}` },
    }
  }

  const form = await resp.json() as Record<string, any>
  const address = form.delivery?.address
  const buyerName = `${address?.firstName ?? form.buyer?.firstName ?? ''} ${address?.lastName ?? form.buyer?.lastName ?? ''}`.trim()
  const totalToPay = form.summary?.totalToPay
  const deliveryCost = form.delivery?.cost
  const totalAmount = Number(totalToPay?.amount)
  const shippingAmount = Number(deliveryCost?.amount ?? 0)
  const subtotal = Number.isFinite(totalAmount)
    ? {
        amount: Math.max(0, totalAmount - (Number.isFinite(shippingAmount) ? shippingAmount : 0)).toFixed(2),
        currency: totalToPay?.currency ?? deliveryCost?.currency ?? 'PLN',
      }
    : null

  return {
    connected: true,
    fetchedAt: new Date().toISOString(),
    order: {
      status: form.status ?? null,
      revision: form.revision ?? null,
      buyer: {
        login: form.buyer?.login ?? null,
        email: form.buyer?.email ?? null,
        phone: form.buyer?.phoneNumber ?? form.buyer?.address?.phoneNumber ?? address?.phoneNumber ?? null,
      },
      delivery: {
        methodName: form.delivery?.method?.name ?? null,
        waybill: form.delivery?.shipmentSummary?.waybill ?? form.delivery?.shipmentSummary?.trackingNumber ?? null,
        pickupPoint: form.delivery?.pickupPoint ?? null,
        address: address
          ? {
              name: buyerName || form.buyer?.login || null,
              street: address.street ?? '',
              city: address.city ?? '',
              postalCode: address.zipCode ?? address.postCode ?? '',
              country: address.countryCode ?? '',
              phone: address.phoneNumber ?? null,
            }
          : null,
      },
      fulfillment: {
        status: form.fulfillment?.status ?? null,
        shipmentSummary: form.delivery?.shipmentSummary ?? null,
      },
      payment: {
        id: form.payment?.id ?? null,
        type: form.payment?.type ?? null,
        provider: form.payment?.provider ?? null,
        finishedAt: form.payment?.finishedAt ?? null,
        paidAmount: form.payment?.paidAmount ?? null,
      },
      totals: {
        subtotal,
        shipping: deliveryCost ?? null,
        totalToPay: totalToPay ?? null,
      },
      invoice: {
        required: form.invoice?.required === true,
        address: form.invoice?.address ?? null,
      },
      messageToSeller: form.messageToSeller ?? null,
      lineItems: Array.isArray(form.lineItems)
        ? form.lineItems.map((item: Record<string, any>) => ({
            id: item.id ?? null,
            offerId: item.offer?.id ?? null,
            name: item.offer?.name ?? null,
            quantity: item.quantity ?? null,
            price: item.price ?? null,
            boughtAt: item.boughtAt ?? null,
          }))
        : [],
    },
  }
}

async function syncAllegroOrderSnapshot(
  db: ReturnType<typeof createDb>,
  env: Env,
  orderId: number,
) {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      source: orders.source,
      externalId: orders.externalId,
      notes: orders.notes,
      paymentMethod: orders.paymentMethod,
      shippingMethod: orders.shippingMethod,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order) {
    return { ok: false as const, status: 404, error: { code: 'NOT_FOUND', message: 'Zamówienie nie znalezione' } }
  }
  if (order.source !== 'allegro' || !order.externalId) {
    return { ok: false as const, status: 400, error: { code: 'NOT_ALLEGRO', message: 'Zamówienie nie pochodzi z Allegro' } }
  }

  const token = await getActiveAllegroToken(env)
  if (!token) {
    return { ok: false as const, status: 503, error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podłączone' } }
  }

  const form = await fetchCheckoutForm(token.apiBase, token.accessToken, order.externalId)
  if (!form) {
    return { ok: false as const, status: 502, error: { code: 'ALLEGRO_ORDER_FETCH_FAILED', message: 'Nie udało się pobrać zamówienia z Allegro' } }
  }

  await db
    .update(orders)
    .set({
      customerData: buildCustomerData(form),
      invoiceRequired: form.invoice?.required === true,
      notes: form.messageToSeller ?? order.notes,
      paymentMethod: form.payment?.type ?? order.paymentMethod,
      shippingMethod: form.delivery?.method?.name ?? order.shippingMethod,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))

  await reconcileOrder(db, form, env.ALLEGRO_KV, { force: true })
  const shipment = await refreshOrderShipments(db, env, orderId, { force: true })

  return {
    ok: true as const,
    data: {
      synced: true,
      orderId,
      orderNumber: order.orderNumber,
      externalId: order.externalId,
      revision: form.revision ?? null,
      status: form.status ?? null,
      fulfillmentStatus: form.fulfillment?.status ?? null,
      shipment,
      fetchedAt: new Date().toISOString(),
    },
  }
}

// All admin order routes require admin role or internal proxy secret
adminOrdersRouter.use('*', requireAdminOrProxy())

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
    const fromDate = parseQueryDate(from)
    const toDate = parseQueryDate(to)
    if (fromDate) conditions.push(gte(orders.createdAt, fromDate))
    if (toDate)   conditions.push(lte(orders.createdAt, toDate))
    if (search.trim()) {
      const raw  = search.trim()
      const term = containsLikePattern(raw)

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
        const nipTerm  = containsLikePattern(cleanNip)
        conditions.push(
          sql`(${orders.customerData}::text ILIKE ${nipTerm})`
        )
      } else if (isPhone) {
        // Take last 9 digits to strip country prefix (+48, 0048) — Polish mobile = 9 digits
        const suffix    = stripped.slice(-9)
        const phoneTerm = containsLikePattern(suffix)
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
          trackingNumber: true,
          allegroShipmentId: true, allegroFulfillmentStatus: true,
          allegroShipmentsSnapshot: true,
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
        allegroShipmentsSnapshot: o.allegroShipmentsSnapshot ?? null,
      }),
    }))

    // Background refresh of visible Allegro shipments (KV-throttled 5min per order — Neon-safe).
    const refreshable = rows
      .filter((o) => o.source === 'allegro' && ['paid', 'processing', 'shipped'].includes(o.status) && o.externalId)
      .map((o) => o.id)
    if (refreshable.length > 0) {
      c.executionCtx.waitUntil((async () => {
        const bgDb = createDb(c.env.DATABASE_URL)
        for (const id of refreshable) {
          try { await refreshOrderShipments(bgDb, c.env, id, { force: false }) } catch {}
        }
      })())
    }

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

    const [historyRows, returnRows, issueRows, auditRows] = await Promise.all([
      db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderId))
        .orderBy(desc(orderStatusHistory.occurredAt)),
      db
        .select({
          id: returns.id,
          returnNumber: returns.returnNumber,
          orderId: returns.orderId,
          source: returns.source,
          status: returns.status,
          reason: returns.reason,
          reasonNote: returns.reasonNote,
          totalRefundAmount: returns.totalRefundAmount,
          currency: returns.currency,
          customerData: returns.customerData,
          allegro: returns.allegro,
          restockApplied: returns.restockApplied,
          closedAt: returns.closedAt,
          createdAt: returns.createdAt,
          updatedAt: returns.updatedAt,
          orderNumber: orders.orderNumber,
        })
        .from(returns)
        .leftJoin(orders, eq(returns.orderId, orders.id))
        .where(eq(returns.orderId, orderId))
        .orderBy(desc(returns.createdAt)),
      db
        .select({
          id: allegroIssues.id,
          allegroIssueId: allegroIssues.allegroIssueId,
          orderId: allegroIssues.orderId,
          returnId: allegroIssues.returnId,
          status: allegroIssues.status,
          subject: allegroIssues.subject,
          lastMessageAt: allegroIssues.lastMessageAt,
          payload: allegroIssues.payload,
          createdAt: allegroIssues.createdAt,
          updatedAt: allegroIssues.updatedAt,
        })
        .from(allegroIssues)
        .where(eq(allegroIssues.orderId, orderId))
        .orderBy(desc(allegroIssues.lastMessageAt), desc(allegroIssues.createdAt)),
      db
        .select({
          id: auditLog.id,
          adminId: auditLog.adminId,
          action: auditLog.action,
          details: auditLog.details,
          ipAddress: auditLog.ipAddress,
          createdAt: auditLog.createdAt,
          adminEmail: users.email,
          adminName: users.name,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.adminId, users.id))
        .where(eq(auditLog.targetOrderId, orderId))
        .orderBy(desc(auditLog.createdAt))
        .limit(100),
    ])

    const returnIds = returnRows.map((row) => row.id)
    const issueIds = issueRows.map((row) => row.id)

    const [returnItemRows, refundRows, issueMessageRows] = await Promise.all([
      returnIds.length > 0
        ? db.select().from(returnItems).where(inArray(returnItems.returnId, returnIds))
        : Promise.resolve([]),
      returnIds.length > 0
        ? db.select().from(refunds).where(inArray(refunds.returnId, returnIds)).orderBy(desc(refunds.createdAt))
        : Promise.resolve([]),
      issueIds.length > 0
        ? db.select().from(allegroIssueMessages).where(inArray(allegroIssueMessages.issueId, issueIds)).orderBy(allegroIssueMessages.createdAt)
        : Promise.resolve([]),
    ])

    const returnItemsByReturn = new Map<number, typeof returnItemRows>()
    for (const item of returnItemRows) {
      const bucket = returnItemsByReturn.get(item.returnId) ?? []
      bucket.push(item)
      returnItemsByReturn.set(item.returnId, bucket)
    }

    const refundsByReturn = new Map<number, typeof refundRows>()
    for (const refund of refundRows) {
      const bucket = refundsByReturn.get(refund.returnId) ?? []
      bucket.push(refund)
      refundsByReturn.set(refund.returnId, bucket)
    }

    const messagesByIssue = new Map<number, typeof issueMessageRows>()
    for (const message of issueMessageRows) {
      const bucket = messagesByIssue.get(message.issueId) ?? []
      bucket.push(message)
      messagesByIssue.set(message.issueId, bucket)
    }

    const allShipments = (order.allegroShipmentsSnapshot ?? []) as ShipmentSnapshotEntry[]
    const tracking = buildTrackingSnapshot({
      id: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber ?? null,
      allegroShipmentsSnapshot: allShipments,
    })
    const warnings = buildOrderWarnings({
      source: order.source,
      status: order.status,
      externalId: order.externalId ?? null,
      allegroFulfillmentStatus: order.allegroFulfillmentStatus ?? null,
      trackingNumber: order.trackingNumber ?? null,
      allegroShipmentsSnapshot: allShipments,
    })
    const actions = buildActionAvailability({
      source: order.source,
      status: order.status,
      externalId: order.externalId ?? null,
      allegroShipmentId: order.allegroShipmentId ?? null,
      trackingNumber: order.trackingNumber ?? null,
      allegroShipmentsSnapshot: allShipments,
    })

    return c.json({
      success: true,
      data: {
        ...order,
        total:        Number(order.total),
        subtotal:     Number(order.subtotal),
        shippingCost: Number(order.shippingCost ?? 0),
        taxAmount:    order.taxAmount    != null ? Number(order.taxAmount)    : null,
        totalPln:     order.totalPln     != null ? Number(order.totalPln)     : null,
        exchangeRate: order.exchangeRate != null ? Number(order.exchangeRate) : null,
        rateDate:     order.rateDate     ?? null,
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        p24Status: order.p24Status ?? null,
        p24SessionId: order.p24SessionId ?? null,
        p24TransactionId: order.p24TransactionId ?? null,
        ...tracking,
        statusHistory: historyRows.map((row) => ({
          id: row.id,
          orderId: row.orderId,
          category: row.category,
          previousValue: row.previousValue,
          newValue: row.newValue,
          source: row.source,
          sourceRef: row.sourceRef,
          metadata: row.metadata ?? null,
          occurredAt: row.occurredAt.toISOString(),
        })),
        returns: returnRows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          closedAt: dateToIso(row.closedAt),
          totalRefundAmount: toNumberOrNull(row.totalRefundAmount),
          items: (returnItemsByReturn.get(row.id) ?? []).map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
          refunds: (refundsByReturn.get(row.id) ?? []).map((refund) => ({
            ...refund,
            createdAt: refund.createdAt.toISOString(),
            updatedAt: refund.updatedAt.toISOString(),
            amount: Number(refund.amount),
          })),
        })),
        complaints: issueRows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          lastMessageAt: dateToIso(row.lastMessageAt),
          orderNumber: order.orderNumber,
          customerData: order.customerData,
          messages: (messagesByIssue.get(row.id) ?? []).map((message) => ({
            ...message,
            createdAt: message.createdAt.toISOString(),
          })),
        })),
        audit: auditRows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        allegroPanel: {
          externalId: order.externalId ?? null,
          revision: order.allegroRevision ?? null,
          fulfillmentStatus: order.allegroFulfillmentStatus ?? null,
          shipmentId: order.allegroShipmentId ?? null,
          shipments: allShipments,
          tracking,
          warnings,
          actions,
        },
        badgeCounts: {
          returns: returnRows.length,
          complaints: issueRows.length,
          messages: issueMessageRows.filter((message) => message.authorRole === 'BUYER').length,
          audit: auditRows.length,
        },
        warnings,
        actions,
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/:id', err)
  }
})

// ============================================
// GET /admin/orders/:id/allegro-live
// Dane live z Allegro, bez zapisu w lokalnej bazie
// ============================================
adminOrdersRouter.get('/:id/allegro-live', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = Number(c.req.param('id'))
    if (!Number.isFinite(orderId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Nieprawidłowe ID zamówienia' } }, 400)
    }

    const [order] = await db
      .select({ id: orders.id, source: orders.source, externalId: orders.externalId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!order) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zamówienie nie znalezione' } }, 404)
    }
    if (order.source !== 'allegro' || !order.externalId) {
      return c.json({ error: { code: 'NOT_ALLEGRO', message: 'Zamówienie nie pochodzi z Allegro' } }, 400)
    }

    const data = await fetchAllegroOrderLive(c.env, order.externalId)
    return c.json({ success: true, data })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/:id/allegro-live', err)
  }
})

// ============================================
// POST /admin/orders/:id/allegro-sync
// Odświeża lokalny snapshot zamówienia, fulfillment i tracking z Allegro
// ============================================
adminOrdersRouter.post('/:id/allegro-sync', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = Number(c.req.param('id'))
    if (!Number.isFinite(orderId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Nieprawidłowe ID zamówienia' } }, 400)
    }

    const result = await syncAllegroOrderSnapshot(db, c.env, orderId)
    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400 | 404 | 502 | 503)
    }

    const adminUser = c.get('user')
    await logAdminAction(db, {
      adminSub: adminUser.sub,
      action: 'admin_action',
      targetOrderId: orderId,
      ipAddress: getClientIp(c),
      details: {
        event: 'allegro_order_sync',
        externalId: result.data.externalId,
        revision: result.data.revision,
        fulfillmentStatus: result.data.fulfillmentStatus,
        shipmentRefreshed: result.data.shipment.refreshed,
      },
    })

    return c.json({ success: true, data: result.data })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/allegro-sync', err)
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

// ── POST /:id/refresh-shipment ────────────────────────────────────────────
// On-demand fetch from Allegro. KV cache 5 min — `?force=1` bypasses cache.
adminOrdersRouter.post('/:id/refresh-shipment', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = Number(c.req.param('id'))
    if (!Number.isFinite(orderId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Nieprawidłowe ID zamówienia' } }, 400)
    }
    const force = c.req.query('force') === '1'
    const result = await refreshOrderShipments(db, c.env, orderId, { force })
    return c.json({ data: result })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/refresh-shipment', err)
  }
})

