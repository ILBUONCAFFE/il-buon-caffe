import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders, orderItems, products, auditLog } from '@repo/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { Env } from '../index'

export interface WebhookEnv extends Env {
  P24_MERCHANT_ID: string
  P24_API_KEY:     string
  P24_CRC_KEY:     string
  P24_SANDBOX?:    string
}

const P24_PROD_URL    = 'https://secure.przelewy24.pl'
const P24_SANDBOX_URL = 'https://sandbox.przelewy24.pl'

function p24BaseUrl(env: WebhookEnv): string {
  return env.P24_SANDBOX === 'true' ? P24_SANDBOX_URL : P24_PROD_URL
}

function basicAuth(merchantId: string, apiKey: string): string {
  return 'Basic ' + btoa(`${merchantId}:${apiKey}`)
}

/**
 * Verify Przelewy24 webhook signature.
 * Expected sign = SHA384({ merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, crc })
 */
async function verifyWebhookSign(
  params: {
    merchantId: number; posId: number; sessionId: string
    amount: number; originAmount: number; currency: string
    orderId: number; methodId: number; statement: string
  },
  receivedSign: string,
  crcKey: string,
): Promise<boolean> {
  const payload    = JSON.stringify({ ...params, crc: crcKey })
  const encoded    = new TextEncoder().encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-384', encoded)
  const computed   = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  // Constant-time comparison
  if (computed.length !== receivedSign.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ receivedSign.charCodeAt(i)
  }
  return diff === 0
}

export const webhooksRouter = new Hono<{ Bindings: WebhookEnv }>()

// ============================================
// POST /api/webhooks/przelewy24
// Notyfikacja P24 o statusie transakcji
// ============================================
webhooksRouter.post('/przelewy24', async (c) => {
  const db = createDb(c.env.DATABASE_URL)

  let body: {
    merchantId: number; posId: number; sessionId: string
    amount: number; originAmount: number; currency: string
    orderId: number; methodId: number; statement: string
    sign: string
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // ── Step 1: Verify webhook signature ───────────────────────────────────
  const signIsValid = await verifyWebhookSign(
    {
      merchantId:   body.merchantId,
      posId:        body.posId,
      sessionId:    body.sessionId,
      amount:       body.amount,
      originAmount: body.originAmount,
      currency:     body.currency,
      orderId:      body.orderId,
      methodId:     body.methodId,
      statement:    body.statement,
    },
    body.sign,
    c.env.P24_CRC_KEY,
  )

  if (!signIsValid) {
    console.warn(`[P24 Webhook] Invalid signature for sessionId: ${body.sessionId}`)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  // ── Step 2: Find the order by sessionId ────────────────────────────────
  const order = await db.query.orders.findFirst({
    columns: {
      id: true, orderNumber: true, status: true, total: true,
      p24SessionId: true, p24Status: true, userId: true,
    },
    where: eq(orders.p24SessionId, body.sessionId),
  })

  if (!order) {
    console.warn(`[P24 Webhook] Order not found for sessionId: ${body.sessionId}`)
    // Return 200 to prevent P24 retrying for unknown sessions
    return c.json({ error: 'Order not found' }, 200)
  }

  // Already processed — idempotent
  if (order.status === 'paid' || order.status === 'delivered' || order.status === 'cancelled') {
    return c.json({ success: true, alreadyProcessed: true })
  }

  // ── Step 3: Verify with P24 API (double-check) ─────────────────────────
  const merchantId = parseInt(c.env.P24_MERCHANT_ID)
  const verifyRes = await fetch(`${p24BaseUrl(c.env)}/api/v1/transaction/verify`, {
    signal: AbortSignal.timeout(10_000),
    method: 'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': basicAuth(c.env.P24_MERCHANT_ID, c.env.P24_API_KEY),
    },
    body: JSON.stringify({
      merchantId,
      posId:      merchantId,
      sessionId:  body.sessionId,
      amount:     body.amount,
      currency:   body.currency,
      orderId:    body.orderId,
    }),
  }).catch(err => {
    console.error('[P24 Webhook] Verify request failed:', err instanceof Error ? err.message : String(err))
    return null
  })

  if (!verifyRes || !verifyRes.ok) {
    const errBody = await verifyRes?.text()
    console.error('[P24 Webhook] Verify failed:', verifyRes?.status, errBody)
    return c.json({ error: 'Payment verification failed' }, 502)
  }

  const verifyData = await verifyRes.json<{ data: { status: string } }>()
  const txStatus   = verifyData?.data?.status

  // ── Step 4: Update order based on transaction status ───────────────────
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '0.0.0.0'

  if (txStatus === 'success' || txStatus === 'completed') {
    // Mark order as paid
    await db.update(orders)
      .set({
        status:      'paid',
        p24OrderId:  String(body.orderId),
        p24Status:   'success',
        paidAt:      new Date(),
        updatedAt:   new Date(),
      })
      .where(eq(orders.id, order.id))

    // Confirm stock reservation: decrement stock by ordered quantities
    const items = await db.query.orderItems.findMany({
      columns: { productSku: true, quantity: true, productName: true },
      where: eq(orderItems.orderId, order.id),
    })

    for (const item of items) {
      const prev = await db.query.products.findFirst({
        columns: { stock: true, reserved: true },
        where: eq(products.sku, item.productSku),
      })

      if (prev) {
        const newStock    = Math.max(0, prev.stock - item.quantity)
        const newReserved = Math.max(0, prev.reserved - item.quantity)

        await db.update(products).set({
          stock:    newStock,
          reserved: newReserved,
        }).where(eq(products.sku, item.productSku))
      }
    }

    // Audit log
    await db.insert(auditLog).values({
      action:        'admin_action',
      targetOrderId: order.id,
      ipAddress:     ip,
      details: {
        event:     'payment_confirmed',
        p24OrderId: String(body.orderId),
        amount:    body.amount,
        currency:  body.currency,
      },
    })

    console.log(`[P24 Webhook] Order ${order.orderNumber} marked as PAID`)

  } else if (txStatus === 'cancelled' || txStatus === 'failure' || txStatus === 'error') {
    // Release reserved stock
    const items = await db.query.orderItems.findMany({
      columns: { productSku: true, quantity: true },
      where: eq(orderItems.orderId, order.id),
    })

    for (const item of items) {
      await db.update(products)
        .set({ reserved: sql`GREATEST(0, ${products.reserved} - ${item.quantity})` })
        .where(eq(products.sku, item.productSku))
    }

    await db.update(orders)
      .set({
        status:    'cancelled',
        p24OrderId: String(body.orderId),
        p24Status:  txStatus,
        updatedAt:  new Date(),
      })
      .where(eq(orders.id, order.id))

    await db.insert(auditLog).values({
      action:        'admin_action',
      targetOrderId: order.id,
      ipAddress:     ip,
      details:       { event: 'payment_failed', p24OrderId: String(body.orderId), txStatus },
    })

    console.log(`[P24 Webhook] Order ${order.orderNumber} CANCELLED (payment failed)`)
  }

  // P24 expects 200 OK
  return c.json({ success: true })
})
