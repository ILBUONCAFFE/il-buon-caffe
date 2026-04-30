import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders, orderItems, products, stockChanges,
  returns, returnItems, refunds, allegroIssues, allegroIssueMessages,
} from '@repo/db/schema'
import { logAdminAction } from '../../lib/audit'
import { eq, and, desc, sql, gte, lte, inArray, or, ilike } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import { recordStatusChange } from '../../lib/record-status-change'
import { parsePagination, serverError } from '../../lib/request'
import type { Env } from '../../index'
import {
  acceptShopReturn,
  acceptAllegroReturnRefund,
  rejectReturn,
  issueManualRefund,
  reopenReturn,
  CommandError,
  type CommandEnv,
  type PrefetchedReturn,
} from '../../lib/allegro-returns/commands'
import { getCustomerReturn } from '../../lib/allegro-returns/client'
import { upsertAllegroReturn } from '../../lib/allegro-returns/reconciler'
import { resolveAccessToken } from '../../lib/allegro-orders/resolve-token'

export const adminReturnsRouter = new Hono<{ Bindings: Env }>()

// All routes require admin or internal proxy auth
adminReturnsRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/returns
// Lista zwrotów z filtrami i paginacją
// ============================================
adminReturnsRouter.get('/', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db             = createDb(c.env.DATABASE_URL)
    const { page, limit } = parsePagination(c)
    const status  = c.req.query('status')  || ''
    const source  = c.req.query('source')  || ''
    const search  = c.req.query('search')  || ''
    const from    = c.req.query('from')    || ''
    const to      = c.req.query('to')      || ''

    const conditions: ReturnType<typeof eq>[] = []

    const validStatuses = ['new', 'in_review', 'approved', 'rejected', 'refunded', 'closed']
    const validSources  = ['shop', 'allegro']

    if (status && validStatuses.includes(status)) conditions.push(eq(returns.status, status as any))
    if (source && validSources.includes(source))  conditions.push(eq(returns.source, source as any))
    if (from) conditions.push(gte(returns.createdAt, new Date(from)))
    if (to)   conditions.push(lte(returns.createdAt, new Date(to)))

    if (search) {
      const safe = search.trim().replace(/[%_]/g, '')
      const term = `%${safe}%`
      conditions.push(
        sql`(
          ${returns.returnNumber} ILIKE ${term}
          OR ${returns.customerData}->>'email' ILIKE ${term}
          OR ${returns.customerData}->>'name'  ILIKE ${term}
          OR EXISTS (
            SELECT 1 FROM orders o WHERE o.id = ${returns.orderId}
              AND (o.order_number ILIKE ${term} OR o.customer_data->>'email' ILIKE ${term})
          )
        )`
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(returns).where(where),
      db.select({
        id:                returns.id,
        returnNumber:      returns.returnNumber,
        orderId:           returns.orderId,
        source:            returns.source,
        status:            returns.status,
        reason:            returns.reason,
        reasonNote:        returns.reasonNote,
        totalRefundAmount: returns.totalRefundAmount,
        currency:          returns.currency,
        customerData:      returns.customerData,
        allegro:           returns.allegro,
        restockApplied:    returns.restockApplied,
        closedAt:          returns.closedAt,
        createdAt:         returns.createdAt,
        updatedAt:         returns.updatedAt,
        orderNumber:       orders.orderNumber,
      })
        .from(returns)
        .leftJoin(orders, eq(returns.orderId, orders.id))
        .where(where)
        .orderBy(desc(returns.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ])

    // Fetch items for each return in one batch
    const returnIds = rows.map(r => r.id)
    const allItems = returnIds.length > 0
      ? await db.select().from(returnItems).where(inArray(returnItems.returnId, returnIds))
      : []

    const itemsByReturn: Record<number, typeof allItems> = {}
    for (const item of allItems) {
      if (!itemsByReturn[item.returnId]) itemsByReturn[item.returnId] = []
      itemsByReturn[item.returnId].push(item)
    }

    const total      = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    const data = rows.map(r => ({
      ...r,
      totalRefundAmount: r.totalRefundAmount != null ? Number(r.totalRefundAmount) : null,
      items: (itemsByReturn[r.id] ?? []).map(i => ({
        ...i,
        unitPrice:  Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    }))

    return c.json({ data, meta: { total, page, limit, totalPages } })
  } catch (err) {
    return serverError(c, 'GET /admin/returns', err)
  }
})

// ============================================
// GET /admin/returns/:id
// Szczegóły zwrotu z przedmiotami, refundami i wątkiem Allegro
// ============================================
adminReturnsRouter.get('/:id', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db       = createDb(c.env.DATABASE_URL)
    const returnId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const returnRow = await db.select({
      id:                returns.id,
      returnNumber:      returns.returnNumber,
      orderId:           returns.orderId,
      source:            returns.source,
      status:            returns.status,
      reason:            returns.reason,
      reasonNote:        returns.reasonNote,
      totalRefundAmount: returns.totalRefundAmount,
      currency:          returns.currency,
      customerData:      returns.customerData,
      allegro:           returns.allegro,
      restockApplied:    returns.restockApplied,
      closedAt:          returns.closedAt,
      createdAt:         returns.createdAt,
      updatedAt:         returns.updatedAt,
      orderNumber:       orders.orderNumber,
    })
      .from(returns)
      .leftJoin(orders, eq(returns.orderId, orders.id))
      .where(eq(returns.id, returnId))
      .limit(1)

    if (!returnRow[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zwrot nie istnieje' } }, 404)
    }

    const [items, refundRows, issueRows] = await Promise.all([
      db.select().from(returnItems).where(eq(returnItems.returnId, returnId)),
      db.select().from(refunds).where(eq(refunds.returnId, returnId)).orderBy(desc(refunds.createdAt)),
      db.select().from(allegroIssues).where(eq(allegroIssues.returnId, returnId)).limit(1),
    ])

    // Fetch messages for the linked issue (if any)
    let issueMessages: (typeof allegroIssueMessages.$inferSelect)[] = []
    if (issueRows[0]) {
      issueMessages = await db
        .select()
        .from(allegroIssueMessages)
        .where(eq(allegroIssueMessages.issueId, issueRows[0].id))
        .orderBy(allegroIssueMessages.createdAt)
    }

    const data = {
      ...returnRow[0],
      totalRefundAmount: returnRow[0].totalRefundAmount != null ? Number(returnRow[0].totalRefundAmount) : null,
      items: items.map(i => ({
        ...i,
        unitPrice:  Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      refunds: refundRows.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      allegroIssue: issueRows[0]
        ? { ...issueRows[0], messages: issueMessages }
        : null,
    }

    return c.json({ data })
  } catch (err) {
    return serverError(c, 'GET /admin/returns/:id', err)
  }
})

// ============================================
// PATCH /admin/returns/:id/status
// Ręczna zmiana statusu tylko dla lokalnych zwrotów sklepowych
// ============================================
adminReturnsRouter.patch('/:id/status', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const returnId  = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const body = await c.req.json().catch(() => null) as { status?: string } | null
    const nextStatus = body?.status
    const validStatuses = ['new', 'in_review', 'approved', 'rejected', 'refunded', 'closed']
    if (!nextStatus || !validStatuses.includes(nextStatus)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Nieprawidłowy status zwrotu' } }, 400)
    }

    const [ret] = await db
      .select({ id: returns.id, source: returns.source, status: returns.status, orderId: returns.orderId })
      .from(returns)
      .where(eq(returns.id, returnId))
      .limit(1)

    if (!ret) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zwrot nie istnieje' } }, 404)
    }
    if (ret.source === 'allegro') {
      return c.json({
        error: {
          code: 'ALLEGRO_STATUS_READ_ONLY',
          message: 'Status zwrotu Allegro jest odczytywany z Allegro API. Użyj odświeżenia zwrotu.',
        },
      }, 422)
    }

    const transitions: Record<string, string[]> = {
      new: ['in_review', 'rejected'],
      in_review: ['approved', 'rejected'],
      approved: ['refunded', 'closed'],
      rejected: ['closed', 'in_review'],
      refunded: ['closed'],
      closed: ['in_review'],
    }
    if (!transitions[ret.status]?.includes(nextStatus)) {
      return c.json({
        error: { code: 'INVALID_TRANSITION', message: `Niedozwolona zmiana statusu z ${ret.status} na ${nextStatus}` },
      }, 422)
    }

    await db.update(returns).set({
      status: nextStatus as any,
      closedAt: nextStatus === 'closed' || nextStatus === 'rejected' ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(returns.id, returnId))

    await logAdminAction(db, {
      adminSub: adminUser?.sub ?? '0',
      action: 'admin_action',
      targetOrderId: ret.orderId,
      details: { event: 'return_status_change', returnId, previousStatus: ret.status, newStatus: nextStatus },
    })

    return c.json({ data: { id: returnId, status: nextStatus } })
  } catch (err) {
    return serverError(c, 'PATCH /admin/returns/:id/status', err)
  }
})

// ============================================
// POST /admin/returns
// Ręczne tworzenie zwrotu sklepowego
// ============================================
adminReturnsRouter.post('/', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const body      = await c.req.json().catch(() => null)

    if (!body) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Brak danych w ciele żądania' } }, 400)
    }

    const { orderId, reason, reasonNote, items } = body as {
      orderId: number
      reason: string
      reasonNote?: string
      items: Array<{ orderItemId: number; quantity: number; condition?: string }>
    }

    if (!orderId || !reason || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Wymagane: orderId, reason, items (niepuste)' } }, 400)
    }

    // Validate order exists and has appropriate status
    const orderRow = await db
      .select({ id: orders.id, status: orders.status, customerData: orders.customerData })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!orderRow[0]) {
      return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Zamówienie nie istnieje' } }, 404)
    }

    const allowedStatuses = ['delivered', 'shipped', 'paid', 'processing']
    if (!allowedStatuses.includes(orderRow[0].status)) {
      return c.json({
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: `Zwrot możliwy tylko dla zamówień w statusie: ${allowedStatuses.join(', ')}`,
        },
      }, 422)
    }

    // Fetch the referenced order items
    const orderItemIds = items.map(i => i.orderItemId)
    const fetchedItems = await db
      .select()
      .from(orderItems)
      .where(and(
        eq(orderItems.orderId, orderId),
        inArray(orderItems.id, orderItemIds),
      ))

    if (fetchedItems.length === 0) {
      return c.json({ error: { code: 'ITEMS_NOT_FOUND', message: 'Nie znaleziono pozycji zamówienia' } }, 404)
    }

    // Build return number: Z-{year}-{padded 5-digit seq}
    const year        = new Date().getFullYear()
    const seq         = Date.now() % 100000
    const returnNumber = `Z-${year}-${String(seq).padStart(5, '0')}`

    // Insert return row (without totalRefundAmount first)
    const [inserted] = await db.insert(returns).values({
      returnNumber,
      orderId,
      source: 'shop',
      status: 'new',
      reason: reason as any,
      reasonNote: reasonNote ?? null,
      currency: 'PLN',
      customerData: orderRow[0].customerData as any,
      restockApplied: false,
    }).returning({ id: returns.id, returnNumber: returns.returnNumber })

    const returnId = inserted.id

    // Build return items rows
    const itemRows = items.map(reqItem => {
      const oi = fetchedItems.find(f => f.id === reqItem.orderItemId)
      if (!oi) return null
      const unitPrice  = Number(oi.unitPrice)
      const qty        = Math.min(reqItem.quantity, oi.quantity)
      const totalPrice = unitPrice * qty
      return {
        returnId,
        orderItemId:  oi.id,
        productSku:   oi.productSku,
        productName:  oi.productName,
        quantity:     qty,
        unitPrice:    String(unitPrice),
        totalPrice:   String(totalPrice),
        condition:    reqItem.condition ?? null,
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)

    if (itemRows.length === 0) {
      return c.json({ error: { code: 'ITEMS_NOT_FOUND', message: 'Żadna pozycja nie pasuje do zamówienia' } }, 404)
    }

    await db.insert(returnItems).values(itemRows)

    // Calculate and persist totalRefundAmount
    const totalRefundAmount = itemRows.reduce((sum, i) => sum + Number(i.totalPrice), 0)
    await db
      .update(returns)
      .set({ totalRefundAmount: String(totalRefundAmount), updatedAt: new Date() })
      .where(eq(returns.id, returnId))

    // Record order status change
    await recordStatusChange(db, {
      orderId,
      category: 'status',
      newValue: 'return_requested',
      source: 'admin',
    })

    // Audit log
    await logAdminAction(db, {
      adminSub: adminUser?.sub ?? '0',
      action: 'create_return' as any,
      targetOrderId: orderId,
      details: { returnId, returnNumber, itemCount: itemRows.length },
    })

    return c.json({ data: { id: returnId, returnNumber } }, 201)
  } catch (err) {
    return serverError(c, 'POST /admin/returns', err)
  }
})

// ============================================
// POST /admin/returns/:id/approve
// Zatwierdzenie zwrotu — shop lub Allegro (z P24/Allegro API)
// ============================================
adminReturnsRouter.post('/:id/approve', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const returnId  = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    // Fetch once — pass to command to avoid a second DB round-trip inside the command
    const returnRow = await db
      .select({
        id:                returns.id,
        source:            returns.source,
        status:            returns.status,
        orderId:           returns.orderId,
        totalRefundAmount: returns.totalRefundAmount,
        allegro:           returns.allegro,
      })
      .from(returns)
      .where(eq(returns.id, returnId))
      .limit(1)

    if (!returnRow[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zwrot nie istnieje' } }, 404)
    }

    // Idempotency: already approved
    if (returnRow[0].status === 'approved') {
      return c.json({ data: { id: returnId, status: 'approved' } })
    }

    const adminId = parseInt(adminUser?.sub ?? '0')
    const env = c.env as unknown as CommandEnv
    const prefetched: PrefetchedReturn = {
      id:                returnRow[0].id,
      status:            returnRow[0].status,
      source:            returnRow[0].source,
      orderId:           returnRow[0].orderId,
      totalRefundAmount: returnRow[0].totalRefundAmount,
      allegro:           returnRow[0].allegro as Record<string, unknown> | null,
    }

    if (returnRow[0].source === 'allegro') {
      await acceptAllegroReturnRefund(db, returnId, adminId, env, c.executionCtx.waitUntil.bind(c.executionCtx), prefetched)
    } else {
      await acceptShopReturn(db, returnId, adminId, env, prefetched)
    }

    return c.json({ data: { id: returnId, status: 'approved' } })
  } catch (err) {
    if (err instanceof CommandError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.httpStatus as 400 | 404 | 422 | 503)
    }
    return serverError(c, 'POST /admin/returns/:id/approve', err)
  }
})

// ============================================
// POST /admin/returns/:id/reject
// Odrzucenie zwrotu (shop lub Allegro)
// ============================================
adminReturnsRouter.post('/:id/reject', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const returnId  = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const body = await c.req.json().catch(() => null)
    if (!body || !body.code) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Wymagane: code' } }, 400)
    }

    const { code, reason } = body as { code: string; reason?: string }

    const adminId = parseInt(adminUser?.sub ?? '0')
    const env = c.env as unknown as CommandEnv

    await rejectReturn(db, returnId, adminId, { code, reason }, env)

    return c.json({ data: { id: returnId, status: 'rejected' } })
  } catch (err) {
    if (err instanceof CommandError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.httpStatus as 400 | 404 | 422 | 503)
    }
    return serverError(c, 'POST /admin/returns/:id/reject', err)
  }
})

// ============================================
// POST /admin/returns/:id/refund
// Ręczny zwrot pieniędzy (przelew bankowy)
// ============================================
adminReturnsRouter.post('/:id/refund', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const returnId  = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const body = await c.req.json().catch(() => null)
    if (!body || typeof body.amount !== 'number' || body.amount <= 0) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Wymagane: amount (liczba > 0)' } }, 400)
    }

    const adminId = parseInt(adminUser?.sub ?? '0')

    await issueManualRefund(db, returnId, adminId, body.amount as number)

    return c.json({ data: { id: returnId, status: 'refunded' } })
  } catch (err) {
    if (err instanceof CommandError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.httpStatus as 400 | 404 | 422 | 503)
    }
    return serverError(c, 'POST /admin/returns/:id/refund', err)
  }
})

// ============================================
// POST /admin/returns/:id/reopen
// Ponowne otwarcie zamkniętego zwrotu
// ============================================
adminReturnsRouter.post('/:id/reopen', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const returnId  = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const adminId = parseInt(adminUser?.sub ?? '0')

    await reopenReturn(db, returnId, adminId)

    return c.json({ data: { id: returnId, status: 'in_review' } })
  } catch (err) {
    if (err instanceof CommandError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.httpStatus as 400 | 404 | 422 | 503)
    }
    return serverError(c, 'POST /admin/returns/:id/reopen', err)
  }
})

// ============================================
// POST /admin/returns/:id/restock
// Przyjęcie towaru z powrotem do magazynu
// ============================================
adminReturnsRouter.post('/:id/restock', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const adminUser = c.get('user')
    const returnId  = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const returnRow = await db
      .select({ id: returns.id, restockApplied: returns.restockApplied, orderId: returns.orderId })
      .from(returns)
      .where(eq(returns.id, returnId))
      .limit(1)

    if (!returnRow[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zwrot nie istnieje' } }, 404)
    }

    // Idempotency guard
    if (returnRow[0].restockApplied) {
      return c.json({ data: { restocked: 0, alreadyApplied: true } })
    }

    // Fetch the return items
    const items = await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, returnId))

    if (items.length === 0) {
      return c.json({ data: { restocked: 0 } })
    }

    // For each item, increment product stock and log stockChange
    let restocked = 0
    const adminId = parseInt(adminUser?.sub ?? '0')

    for (const item of items) {
      // Only restock items that have a matching product in our catalog
      const productRow = await db
        .select({ sku: products.sku, stock: products.stock })
        .from(products)
        .where(eq(products.sku, item.productSku))
        .limit(1)

      if (!productRow[0]) continue // Allegro-only product — skip

      const previousStock = productRow[0].stock
      const newStock      = previousStock + item.quantity

      await db
        .update(products)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(products.sku, item.productSku))

      await db.insert(stockChanges).values({
        productSku:    item.productSku,
        previousStock,
        newStock,
        change:        item.quantity,
        reason:        'return',
        orderId:       returnRow[0].orderId,
        adminId:       adminId || null,
        notes:         `Zwrot #${returnId} — ${item.productName}`,
      })

      restocked++
    }

    // Mark restock as applied
    await db
      .update(returns)
      .set({ restockApplied: true, updatedAt: new Date() })
      .where(eq(returns.id, returnId))

    return c.json({ data: { restocked } })
  } catch (err) {
    return serverError(c, 'POST /admin/returns/:id/restock', err)
  }
})

// ============================================
// POST /admin/returns/:id/refresh
// Odczyt szczegółów zwrotu z Allegro REST API i zapis lokalnego snapshotu
// ============================================
adminReturnsRouter.post('/:id/refresh', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const returnId = parseInt(c.req.param('id') ?? '', 10)
    if (isNaN(returnId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID zwrotu' } }, 400)
    }

    const [ret] = await db
      .select({ id: returns.id, source: returns.source, orderId: returns.orderId, allegro: returns.allegro })
      .from(returns)
      .where(eq(returns.id, returnId))
      .limit(1)

    if (!ret) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zwrot nie istnieje' } }, 404)
    }
    if (ret.source !== 'allegro') {
      return c.json({ data: { refreshed: false, reason: 'shop_return' } })
    }

    const customerReturnId = ret.allegro?.customerReturnId
    if (typeof customerReturnId !== 'string' || !customerReturnId) {
      return c.json({ error: { code: 'MISSING_ALLEGRO_ID', message: 'Brak identyfikatora zwrotu Allegro' } }, 422)
    }

    const accessToken = await resolveAccessToken(c.env.ALLEGRO_KV, db, c.env)
    if (!accessToken) {
      return c.json({ error: { code: 'ALLEGRO_TOKEN_UNAVAILABLE', message: 'Brak aktywnego tokenu Allegro' } }, 503)
    }

    const environment = c.env.ALLEGRO_ENVIRONMENT ?? 'production'
    const apiBase = environment === 'sandbox'
      ? 'https://api.allegro.pl.allegrosandbox.pl'
      : 'https://api.allegro.pl'
    const allegroReturn = await getCustomerReturn(customerReturnId, apiBase, accessToken, db)
    const result = await upsertAllegroReturn(db, allegroReturn, ret.orderId)

    return c.json({ data: { refreshed: true, ...result } })
  } catch (err) {
    return serverError(c, 'POST /admin/returns/:id/refresh', err)
  }
})
