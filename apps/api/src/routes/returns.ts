import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders, orderItems, returns, returnItems } from '@repo/db/schema'
import { eq, and, desc, inArray, not } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import { recordStatusChange } from '../lib/record-status-change'
import { checkContentLength, serverError } from '../lib/request'
import type { Env } from '../index'

export const returnsRouter = new Hono<{ Bindings: Env }>()

const VALID_REASONS = [
  'damaged',
  'wrong_item',
  'not_as_described',
  'change_of_mind',
  'defect',
  'mistake',
  'other',
] as const

type ReturnReason = typeof VALID_REASONS[number]

// ============================================
// GET /api/returns  🔒
// Lista zwrotów zalogowanego użytkownika
// ============================================
returnsRouter.get('/', requireAuth(), async (c) => {
  try {
    const user   = c.get('user')
    const userId = parseInt(user.sub)
    const db     = createDb(c.env.DATABASE_URL)

    // Join returns → orders to filter by userId
    const rows = await db
      .select({
        id:                returns.id,
        returnNumber:      returns.returnNumber,
        orderId:           returns.orderId,
        orderNumber:       orders.orderNumber,
        status:            returns.status,
        reason:            returns.reason,
        totalRefundAmount: returns.totalRefundAmount,
        currency:          returns.currency,
        createdAt:         returns.createdAt,
      })
      .from(returns)
      .innerJoin(orders, eq(returns.orderId, orders.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(returns.createdAt))

    return c.json({ data: rows })
  } catch (err) {
    return serverError(c, 'GET /api/returns', err)
  }
})

// ============================================
// POST /api/orders/:orderId/return-request  🔒
// Złożenie wniosku o zwrot towaru
// ============================================
returnsRouter.post('/:orderId/return-request', requireAuth(), async (c) => {
  try {
    const sizeErr = checkContentLength(c, 10_000)
    if (sizeErr) return sizeErr

    const user    = c.get('user')
    const userId  = parseInt(user.sub)
    const orderId = parseInt(c.req.param('orderId') ?? '')

    if (isNaN(orderId) || orderId <= 0) {
      return c.json({ error: { code: 'INVALID_ORDER_ID', message: 'Nieprawidłowy identyfikator zamówienia.' } }, 400)
    }

    // ── Parse & validate body ──────────────────────────────────────────────
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { code: 'INVALID_JSON', message: 'Nieprawidłowy format danych.' } }, 400)
    }

    if (typeof body !== 'object' || body === null) {
      return c.json({ error: { code: 'INVALID_BODY', message: 'Brak wymaganych danych.' } }, 400)
    }

    const { reason, reasonNote, items } = body as Record<string, unknown>

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason as ReturnReason)) {
      return c.json({
        error: {
          code: 'INVALID_REASON',
          message: `Nieprawidłowy powód zwrotu. Dozwolone wartości: ${VALID_REASONS.join(', ')}.`,
        },
      }, 400)
    }

    // Validate reasonNote
    if (reasonNote !== undefined && (typeof reasonNote !== 'string' || reasonNote.length > 1000)) {
      return c.json({ error: { code: 'INVALID_REASON_NOTE', message: 'Opis powodu nie może przekraczać 1000 znaków.' } }, 400)
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: { code: 'ITEMS_REQUIRED', message: 'Lista produktów do zwrotu nie może być pusta.' } }, 400)
    }
    if (items.length > 20) {
      return c.json({ error: { code: 'TOO_MANY_ITEMS', message: 'Można zgłosić maksymalnie 20 pozycji w jednym zwrocie.' } }, 400)
    }

    for (const item of items) {
      if (
        typeof item !== 'object' || item === null
        || typeof (item as Record<string, unknown>).orderItemId !== 'number'
        || typeof (item as Record<string, unknown>).quantity !== 'number'
        || ((item as Record<string, unknown>).quantity as number) <= 0
      ) {
        return c.json({
          error: { code: 'INVALID_ITEM', message: 'Każda pozycja musi zawierać orderItemId (liczba) i quantity (liczba > 0).' },
        }, 400)
      }
    }

    const itemsTyped = items as Array<{ orderItemId: number; quantity: number }>

    const db = createDb(c.env.DATABASE_URL)

    // ── Fetch order ────────────────────────────────────────────────────────
    const order = await db.query.orders.findFirst({
      columns: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        createdAt: true,
      },
      where: eq(orders.id, orderId),
    })

    if (!order) {
      return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Zamówienie nie zostało znalezione.' } }, 404)
    }

    if (order.userId !== userId) {
      return c.json({ error: { code: 'ORDER_NOT_FOUND', message: 'Zamówienie nie zostało znalezione.' } }, 404)
    }

    // ── Status check ───────────────────────────────────────────────────────
    const allowedStatuses = ['delivered', 'shipped']
    if (!allowedStatuses.includes(order.status)) {
      return c.json({
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: 'Zwrot można złożyć tylko dla zamówień ze statusem "dostarczone" lub "wysłane".',
        },
      }, 400)
    }

    // ── Return window: 30 days from order creation ─────────────────────────
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (order.createdAt < thirtyDaysAgo) {
      return c.json({
        error: {
          code: 'RETURN_WINDOW_EXPIRED',
          message: 'Termin złożenia zwrotu (30 dni od złożenia zamówienia) minął.',
        },
      }, 400)
    }

    // ── No open return for this order ──────────────────────────────────────
    const existingReturn = await db.query.returns.findFirst({
      columns: { id: true, status: true },
      where: and(
        eq(returns.orderId, orderId),
        not(inArray(returns.status, ['rejected', 'closed']))
      ),
    })

    if (existingReturn) {
      return c.json({
        error: {
          code: 'RETURN_ALREADY_EXISTS',
          message: 'Dla tego zamówienia istnieje już aktywny wniosek o zwrot.',
        },
      }, 409)
    }

    // ── Fetch order items ──────────────────────────────────────────────────
    const dbOrderItems = await db
      .select({
        id:          orderItems.id,
        orderId:     orderItems.orderId,
        productSku:  orderItems.productSku,
        productName: orderItems.productName,
        quantity:    orderItems.quantity,
        unitPrice:   orderItems.unitPrice,
        totalPrice:  orderItems.totalPrice,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))

    // ── Validate each requested item belongs to this order ─────────────────
    const orderItemMap = new Map(dbOrderItems.map((oi) => [oi.id, oi]))
    for (const item of itemsTyped) {
      if (!orderItemMap.has(item.orderItemId)) {
        return c.json({
          error: {
            code: 'INVALID_ORDER_ITEM',
            message: `Pozycja o id ${item.orderItemId} nie należy do tego zamówienia.`,
          },
        }, 400)
      }
    }

    // ── Generate return number ─────────────────────────────────────────────
    const year = new Date().getFullYear()
    const returnNumber = `Z-${year}-${String(Date.now() % 100000).padStart(5, '0')}`

    // ── Insert returns row ─────────────────────────────────────────────────
    const [newReturn] = await db
      .insert(returns)
      .values({
        returnNumber,
        orderId,
        source: 'shop',
        status: 'new',
        reason: reason as ReturnReason,
        reasonNote: reasonNote ? String(reasonNote) : null,
        currency: 'PLN',
      })
      .returning({ id: returns.id, returnNumber: returns.returnNumber })

    // ── Insert return items + calculate total ──────────────────────────────
    let totalRefundAmount = 0

    const returnItemRows = itemsTyped.map((item) => {
      const oi = orderItemMap.get(item.orderItemId)!
      // Cap quantity at ordered quantity
      const qty = Math.min(item.quantity, oi.quantity)
      const unitPrice = Number(oi.unitPrice)
      const itemTotal = unitPrice * qty
      totalRefundAmount += itemTotal

      return {
        returnId:    newReturn.id,
        orderItemId: item.orderItemId,
        productSku:  oi.productSku,
        productName: oi.productName,
        quantity:    qty,
        unitPrice:   String(unitPrice),
        totalPrice:  String(itemTotal),
      }
    })

    await db.insert(returnItems).values(returnItemRows)

    // ── Update totalRefundAmount on return ─────────────────────────────────
    await db
      .update(returns)
      .set({ totalRefundAmount: String(totalRefundAmount) })
      .where(eq(returns.id, newReturn.id))

    // ── Record status change on order ──────────────────────────────────────
    await recordStatusChange(db, {
      orderId,
      category: 'status',
      newValue: 'return_requested',
      source: 'system',
    })

    return c.json({ data: { returnNumber: newReturn.returnNumber, status: 'new' } }, 201)
  } catch (err) {
    return serverError(c, 'POST /api/orders/:orderId/return-request', err)
  }
})
