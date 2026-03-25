import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders, orderItems, orderSequences, products, users, stockChanges, auditLog,
} from '@repo/db/schema'
import { eq, and, sql, desc, lte, gt } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../index'
import type { CustomerData, ShippingAddress } from '@repo/db/schema'
import { sanitize } from '../lib/sanitize'
import { checkContentLength, parsePagination, errMsg } from '../lib/request'

const MAX_REQUEST_BODY_SIZE = 20_000

/** Polish postal-code regex: NN-NNN */
const postalCodeRegex = /^\d{2}-\d{3}$/

/** Generate order number: IBC-YYYY-NNNNN
 *  Atomic upsert on order_sequences — O(1), index-only, safe under concurrent inserts.
 *  Returns the sequence number that was just claimed (nextSeq before increment).
 */
async function generateOrderNumber(db: ReturnType<typeof createDb>): Promise<string> {
  const year = new Date().getFullYear()
  const [row] = await db
    .insert(orderSequences)
    .values({ year, nextSeq: 2 })
    .onConflictDoUpdate({
      target: orderSequences.year,
      set: { nextSeq: sql`${orderSequences.nextSeq} + 1` },
    })
    .returning({ seq: sql<number>`${orderSequences.nextSeq} - 1` })
  const seq = Number(row.seq).toString().padStart(5, '0')
  return `IBC-${year}-${seq}`
}

export const ordersRouter = new Hono<{ Bindings: Env }>()

// ============================================
// POST /api/orders  🔒
// Składanie zamówienia z ochroną idempotencji
// ============================================
ordersRouter.post('/', requireAuth(), async (c) => {
  try {
    const sizeErr = checkContentLength(c, MAX_REQUEST_BODY_SIZE)
    if (sizeErr) return sizeErr

    const idempotencyKey = sanitize(c.req.header('Idempotency-Key') || '', 100)
    if (!idempotencyKey) {
      return c.json({ error: 'Nagłówek Idempotency-Key jest wymagany' }, 400)
    }

    const user    = c.get('user')
    const userId  = parseInt(user.sub)
    const db      = createDb(c.env.DATABASE_URL)

    // ── Idempotency check ────────────────────────────────────────────────
    const existingOrder = await db.query.orders.findFirst({
      columns: { id: true, orderNumber: true, total: true, status: true, reservationExpiresAt: true },
      where: eq(orders.idempotencyKey, idempotencyKey),
    })
    if (existingOrder) {
      return c.json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Zamówienie z tym kluczem idempotencji już istnieje',
          existingOrderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
        },
      }, 409)
    }

    // ── Parse and validate body ───────────────────────────────────────────
    const body = await c.req.json<{
      items: { sku: string; quantity: number }[]
      shippingAddress: ShippingAddress
      paymentMethod?: string
      shippingMethod?: string
      notes?: string
    }>()

    const items         = body.items
    const shippingAddr  = body.shippingAddress
    const paymentMethod = sanitize(body.paymentMethod || 'p24', 50)
    const shippingMethod = sanitize(body.shippingMethod || 'inpost', 50)
    const notes         = sanitize(body.notes || '', 1000)

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Brak produktów w zamówieniu' }, 400)
    }
    if (items.length > 50) {
      return c.json({ error: 'Zbyt wiele pozycji (max 50)' }, 400)
    }

    // Validate shipping address
    if (!shippingAddr?.name || !shippingAddr?.street || !shippingAddr?.city ||
        !shippingAddr?.postalCode || !shippingAddr?.country) {
      return c.json({ error: 'Adres dostawy jest niekompletny' }, 400)
    }
    if (!postalCodeRegex.test(shippingAddr.postalCode)) {
      return c.json({ error: 'Nieprawidłowy format kodu pocztowego (NN-NNN)' }, 400)
    }

    // Validate items
    for (const item of items) {
      if (!item.sku || typeof item.sku !== 'string' || item.sku.trim().length === 0) {
        return c.json({ error: 'Nieprawidłowe SKU produktu' }, 400)
      }
      if (item.sku.trim().length > 50) {
        return c.json({ error: `SKU produktu jest za długie (max 50 znaków): ${item.sku.slice(0, 20)}…` }, 400)
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 999) {
        return c.json({ error: `Nieprawidłowa ilość dla produktu: ${item.sku}` }, 400)
      }
    }

    // ── Verify SKUs and check stock ──────────────────────────────────────
    const uniqueSkus = [...new Set(items.map(i => i.sku.trim()))]
    const productRows = await db.query.products.findMany({
      columns: { sku: true, name: true, price: true, stock: true, reserved: true, isActive: true, imageUrl: true },
      where: and(
        sql`${products.sku} = ANY(ARRAY[${sql.join(uniqueSkus.map(s => sql`${s}`), sql`, `)}])`,
        eq(products.isActive, true),
      ),
    })

    const productMap = new Map(productRows.map(p => [p.sku, p]))

    const stockErrors: string[] = []
    let subtotal = 0
    const lineItems: {
      sku: string; name: string; imageUrl: string | null
      quantity: number; unitPrice: number; totalPrice: number
    }[] = []

    for (const item of items) {
      const p = productMap.get(item.sku.trim())
      if (!p) {
        return c.json({ error: `Produkt nie znaleziony lub niedostępny: ${item.sku}` }, 404)
      }
      const available = p.stock - p.reserved
      if (available < item.quantity) {
        stockErrors.push(`Niewystarczający stan magazynowy dla "${p.name}" (dostępne: ${available})`)
      }
      const unitPrice  = Number(p.price)
      const totalPrice = unitPrice * item.quantity
      subtotal += totalPrice
      lineItems.push({
        sku: p.sku, name: p.name, imageUrl: p.imageUrl,
        quantity: item.quantity, unitPrice, totalPrice,
      })
    }

    if (stockErrors.length > 0) {
      return c.json({ success: false, error: stockErrors[0], errors: stockErrors }, 422)
    }

    // ── Fetch user data ──────────────────────────────────────────────────
    const userRow = await db.query.users.findFirst({
      columns: { email: true, name: true },
      where: eq(users.id, userId),
    })

    // ── Compute totals ───────────────────────────────────────────────────
    const shippingCost = subtotal >= 299 ? 0 : 14.99  // Free shipping over 299 PLN
    const total        = subtotal + shippingCost

    const customerData: CustomerData = {
      email:           userRow?.email || '',
      name:            shippingAddr.name,
      phone:           shippingAddr.phone,
      shippingAddress: shippingAddr,
    }

    const orderNumber          = await generateOrderNumber(db)
    const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // ── Reserve stock atomically ─────────────────────────────────────────
    // Increment reserved for each SKU with atomic SQL (prevents oversell)
    for (const item of lineItems) {
      const updated = await db
        .update(products)
        .set({ reserved: sql`${products.reserved} + ${item.quantity}` })
        .where(
          and(
            eq(products.sku, item.sku),
            sql`(${products.stock} - ${products.reserved}) >= ${item.quantity}`,
          ),
        )
        .returning({ sku: products.sku })

      if (updated.length === 0) {
        // Race condition — another order grabbed the stock
        // Release all reservations we already set
        for (const prev of lineItems) {
          if (prev.sku === item.sku) break
          await db
            .update(products)
            .set({ reserved: sql`${products.reserved} - ${prev.quantity}` })
            .where(eq(products.sku, prev.sku))
        }
        return c.json({ error: `Niewystarczający stan magazynowy dla "${item.name}"` }, 422)
      }
    }

    // ── Create order ─────────────────────────────────────────────────────
    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      userId,
      customerData,
      status:               'pending',
      source:               'shop',
      subtotal:             subtotal.toString(),
      shippingCost:         shippingCost.toString(),
      total:                total.toString(),
      paymentMethod,
      shippingMethod,
      notes:                notes || null,
      idempotencyKey,
      reservationExpiresAt,
    }).returning({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      status: orders.status,
      reservationExpiresAt: orders.reservationExpiresAt,
    })

    // ── Create order items ────────────────────────────────────────────────
    await db.insert(orderItems).values(
      lineItems.map(item => ({
        orderId:     newOrder.id,
        productSku:  item.sku,
        productName: item.name,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice.toString(),
        totalPrice:  item.totalPrice.toString(),
      })),
    )

    return c.json({
      success: true,
      data: {
        orderId:              newOrder.id,
        orderNumber:          newOrder.orderNumber,
        total:                Number(newOrder.total),
        status:               newOrder.status,
        reservationExpiresAt: newOrder.reservationExpiresAt,
      },
    }, 201)

  } catch (error) {
    console.error('POST /orders error:', errMsg(error))
    return c.json({ error: 'Błąd serwera podczas tworzenia zamówienia' }, 500)
  }
})

// ============================================
// GET /api/orders  🔒
// Historia zamówień zalogowanego użytkownika
// ============================================
ordersRouter.get('/', requireAuth(), async (c) => {
  try {
    const user   = c.get('user')
    const userId = parseInt(user.sub)
    const db     = createDb(c.env.DATABASE_URL)

    const { page, limit } = parsePagination(c, { maxLimit: 50, defaultLimit: 20 })
    const statusQ  = c.req.query('status') || ''

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

    const conditions = [eq(orders.userId, userId)]
    if (statusQ && validStatuses.includes(statusQ)) {
      conditions.push(eq(orders.status, statusQ as typeof conditions[0] extends ReturnType<typeof eq> ? never : any))
    }

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(and(...conditions)),
      db.query.orders.findMany({
        columns: {
          id: true, orderNumber: true, status: true, source: true,
          total: true, shippingCost: true, subtotal: true, paymentMethod: true,
          customerData: true, paidAt: true, shippedAt: true, createdAt: true,
          trackingNumber: true, shippingMethod: true,
        },
        with: {
          items: {
            columns: { id: true, productSku: true, productName: true, quantity: true, unitPrice: true, totalPrice: true },
          },
        },
        where: and(...conditions),
        orderBy: desc(orders.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
    ])

    const total      = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    return c.json({
      success: true,
      data: rows.map(o => ({
        ...o,
        total:        Number(o.total),
        subtotal:     Number(o.subtotal),
        shippingCost: Number(o.shippingCost ?? 0),
      })),
      meta: { total, page, limit, totalPages },
    })
  } catch (error) {
    console.error('GET /orders error:', errMsg(error))
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/orders/:id  🔒
// Szczegóły zamówienia — tylko własne
// ============================================
ordersRouter.get('/:id', requireAuth(), async (c) => {
  try {
    const user    = c.get('user')
    const userId  = parseInt(user.sub)
    const orderId = parseInt(c.req.param('') as string)
    const db      = createDb(c.env.DATABASE_URL)

    if (isNaN(orderId)) {
      return c.json({ error: 'Nieprawidłowe ID zamówienia' }, 400)
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      with: {
        items: {
          columns: {
            id: true, productSku: true, productName: true,
            quantity: true, unitPrice: true, totalPrice: true,
          },
        },
      },
    })

    if (!order) {
      return c.json({ error: 'Zamówienie nie znalezione' }, 404)
    }

    return c.json({
      success: true,
      data: {
        ...order,
        total:        Number(order.total),
        subtotal:     Number(order.subtotal),
        shippingCost: Number(order.shippingCost ?? 0),
      },
    })
  } catch (error) {
    console.error('GET /orders/:id error:', errMsg(error))
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})
