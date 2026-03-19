import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders, orderItems, products, users, stockChanges, auditLog,
} from '@repo/db/schema'
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import type { Env } from '../../index'

export const adminOrdersRouter = new Hono<{ Bindings: Env }>()

// All admin order routes require admin role or internal proxy secret
adminOrdersRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/orders  🛡️
// Wszystkie zamówienia (shop + allegro) z paginacją
// ============================================
adminOrdersRouter.get('/', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db       = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const page     = Math.max(1, parseInt(c.req.query('page')  || '1', 10))
    const limit    = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)))
    const source   = c.req.query('source')   || ''
    const status   = c.req.query('status')   || ''
    const from     = c.req.query('from')     || ''
    const to       = c.req.query('to')       || ''
    const search   = c.req.query('search')   || ''

    const conditions: ReturnType<typeof eq>[] = []

    const validSources  = ['shop', 'allegro']
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

    if (source  && validSources.includes(source))   conditions.push(eq(orders.source,  source  as any))
    if (status  && validStatuses.includes(status))  conditions.push(eq(orders.status,  status  as any))
    if (from)   conditions.push(gte(orders.createdAt, new Date(from)))
    if (to)     conditions.push(lte(orders.createdAt, new Date(to)))
    if (search) {
      const term = `%${search.replace(/[%_]/g, '')}%`
      conditions.push(
        sql`(${orders.orderNumber} ILIKE ${term} OR ${orders.customerData}::text ILIKE ${term} OR ${orders.externalId} ILIKE ${term})`
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(where),
      db.query.orders.findMany({
        columns: {
          id: true, orderNumber: true, source: true, externalId: true,
          status: true, total: true, subtotal: true, shippingCost: true,
          customerData: true, paymentMethod: true, shippingMethod: true,
          trackingNumber: true, paidAt: true, shippedAt: true, createdAt: true,
          updatedAt: true, internalNotes: true, notes: true,
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
      itemsCount:   o.items.length,
    }))

    return c.json({ success: true, data, meta: { total, page, limit, totalPages } })
  } catch (err) {
    console.error('GET /admin/orders error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /admin/orders/:id  🛡️
// Szczegóły zamówienia
// ============================================
adminOrdersRouter.get('/:id', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db      = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id'))

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
      },
    })
  } catch (err) {
    console.error('GET /admin/orders/:id error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// PATCH /admin/orders/:id/status  🛡️
// Zmiana statusu zamówienia
// ============================================
adminOrdersRouter.patch('/:id/status', async (c) => {
  try {
    const adminUser = c.get('user')
    const db        = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const orderId   = parseInt(c.req.param('id'))

    if (isNaN(orderId)) return c.json({ error: 'Nieprawidłowe ID zamówienia' }, 400)

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
      status:    body.status,
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

    await db.update(orders).set(setCols as any).where(eq(orders.id, orderId))

    // Audit
    const ip = c.req.header('CF-Connecting-IP') || 'unknown'
    await db.insert(auditLog).values({
      adminId:       parseInt(adminUser.sub),
      action:        'admin_action',
      targetOrderId: orderId,
      ipAddress:     ip,
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
    console.error('PATCH /admin/orders/:id/status error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})
