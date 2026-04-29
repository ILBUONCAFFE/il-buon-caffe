import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders, auditLog } from '@repo/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import type { Env } from '../index'

// ── Przelewy24 helpers ─────────────────────────────────────────────────────

const P24_PROD_URL    = 'https://secure.przelewy24.pl'
const P24_SANDBOX_URL = 'https://sandbox.przelewy24.pl'

/** Extend Env with P24 bindings */
export interface EnvWithP24 extends Env {
  P24_MERCHANT_ID: string
  P24_API_KEY:     string
  P24_CRC_KEY:     string
  P24_SANDBOX?:    string
  PUBLIC_URL:      string // e.g. https://api.ilbuoncaffe.pl
  FRONTEND_URL:    string // e.g. https://ilbuoncaffe.pl
}

function p24BaseUrl(env: EnvWithP24): string {
  return env.P24_SANDBOX === 'true' ? P24_SANDBOX_URL : P24_PROD_URL
}

/**
 * Compute P24 SHA384 sign for transaction registration.
 * sign = SHA384 JSON { sessionId, merchantId, amount, currency, crc }
 */
async function signTransaction(
  sessionId: string,
  merchantId: number,
  amount: number,
  currency: string,
  crcKey: string,
): Promise<string> {
  const payload     = JSON.stringify({ sessionId, merchantId, amount, currency, crc: crcKey })
  const encoded     = new TextEncoder().encode(payload)
  const hashBuffer  = await crypto.subtle.digest('SHA-384', encoded)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compute P24 SHA384 sign for webhook verification.
 * sign = SHA384 JSON { merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement, crc }
 */
async function signVerify(params: {
  merchantId: number; posId: number; sessionId: string; amount: number
  originAmount: number; currency: string; orderId: number; methodId: number
  statement: string; crcKey: string
}): Promise<string> {
  const { crcKey, ...rest } = params
  const payload    = JSON.stringify({ ...rest, crc: crcKey })
  const encoded    = new TextEncoder().encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-384', encoded)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function basicAuth(merchantId: string, apiKey: string): string {
  return 'Basic ' + btoa(`${merchantId}:${apiKey}`)
}

function resolveReturnUrl(rawReturnUrl: string | undefined, frontendUrl: string): string | null {
  const fallback = `${frontendUrl.replace(/\/+$/, '')}/zamowienie/potwierdzenie`
  if (!rawReturnUrl) return fallback

  if (rawReturnUrl.startsWith('/')) {
    if (rawReturnUrl.startsWith('//')) return null
    return `${frontendUrl.replace(/\/+$/, '')}${rawReturnUrl}`
  }

  try {
    const parsed = new URL(rawReturnUrl)
    if (parsed.origin !== new URL(frontendUrl).origin) return null
    return parsed.toString()
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────
export const paymentsRouter = new Hono<{ Bindings: EnvWithP24 }>()

// ============================================
// POST /api/payments/p24/initiate  🔒
// Zainicjowanie płatności Przelewy24
// ============================================
paymentsRouter.post('/p24/initiate', requireAuth(), async (c) => {
  try {
    const payload = c.get('user')
    const userId  = parseInt(payload.sub)
    const db      = createDb(c.env.DATABASE_URL)

    const body = await c.req.json<{
      orderId: number
      returnUrl?: string
      language?: string
    }>()

    const orderId   = body.orderId
    const language  = body.language === 'en' ? 'en' : 'pl'
    const returnUrl = resolveReturnUrl(body.returnUrl, c.env.FRONTEND_URL)
    if (!returnUrl) {
      return c.json({ error: 'Nieprawidłowy adres powrotu' }, 400)
    }

    if (!orderId || isNaN(orderId)) {
      return c.json({ error: 'Nieprawidłowe ID zamówienia' }, 400)
    }

    // Verify order belongs to user and is in pending state
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.userId, userId),
      ),
    })

    if (!order) {
      return c.json({ error: 'Zamówienie nie znalezione' }, 404)
    }
    if (order.status !== 'pending') {
      return c.json({ error: 'Zamówienie nie jest w stanie oczekującym na płatność' }, 409)
    }
    if (order.p24SessionId) {
      // Already initiated — return existing session
      const redirectUrl = `${p24BaseUrl(c.env)}/trnRequest/${order.p24SessionId}`
      return c.json({
        success: true,
        data: {
          sessionId:   order.p24SessionId,
          redirectUrl,
        },
      })
    }

    // Check reservation not expired
    if (order.reservationExpiresAt && new Date(order.reservationExpiresAt) < new Date()) {
      return c.json({ error: 'Rezerwacja produktów wygasła. Złóż zamówienie ponownie.' }, 410)
    }

    const merchantId = parseInt(c.env.P24_MERCHANT_ID)
    const amountGrosze = Math.round(Number(order.total) * 100)
    const sessionId    = `IBC-${order.id}-${Date.now()}`
    const customerData = order.customerData as { email: string; name?: string; phone?: string }

    const sign = await signTransaction(sessionId, merchantId, amountGrosze, 'PLN', c.env.P24_CRC_KEY)

    const p24Payload = {
      merchantId,
      posId:       merchantId,
      sessionId,
      amount:      amountGrosze,
      currency:    'PLN',
      description: `Zamówienie ${order.orderNumber}`,
      email:       customerData.email,
      country:     'PL',
      language,
      urlReturn: returnUrl,
      urlStatus: `${c.env.PUBLIC_URL}/api/webhooks/przelewy24`,
      sign,
    }

    const p24Res = await fetch(`${p24BaseUrl(c.env)}/api/v1/transaction/register`, {
      signal:  AbortSignal.timeout(10_000),
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': basicAuth(c.env.P24_MERCHANT_ID, c.env.P24_API_KEY),
      },
      body: JSON.stringify(p24Payload),
    })

    if (!p24Res.ok) {
      const errJson = await p24Res.json<{ error?: string; errorCode?: string }>().catch(() => ({}))
      console.error('P24 register error:', p24Res.status, errJson)
      return c.json({ error: 'Błąd inicjowania płatności. Spróbuj ponownie.' }, 502)
    }

    const p24Data = await p24Res.json<{ data: { token: string } }>()
    const token   = p24Data?.data?.token

    if (!token) {
      return c.json({ error: 'Brak tokena z Przelewy24' }, 502)
    }

    // Store session ID in order
    await db.update(orders)
      .set({ p24SessionId: sessionId, updatedAt: new Date() })
      .where(eq(orders.id, orderId))

    const redirectUrl = `${p24BaseUrl(c.env)}/trnRequest/${token}`
    const expiresAt   = new Date(Date.now() + 15 * 60 * 1000)

    return c.json({
      success: true,
      data: {
        sessionId,
        redirectUrl,
        expiresAt,
      },
    })
  } catch (err) {
    console.error('POST /payments/p24/initiate error:', err instanceof Error ? err.message : String(err))
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/payments/p24/status/:orderId  🔒
// Sprawdzenie statusu płatności (fallback)
// ============================================
paymentsRouter.get('/p24/status/:orderId', requireAuth(), async (c) => {
  try {
    const payload = c.get('user')
    const userId  = parseInt(payload.sub)
    const orderId = parseInt(c.req.param('orderId') as string)
    const db      = createDb(c.env.DATABASE_URL)

    if (isNaN(orderId)) return c.json({ error: 'Nieprawidłowe ID zamówienia' }, 400)

    const order = await db.query.orders.findFirst({
      columns: { id: true, userId: true, status: true, p24SessionId: true, p24Status: true, paidAt: true, total: true },
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    })

    if (!order) return c.json({ error: 'Zamówienie nie znalezione' }, 404)

    return c.json({
      success: true,
      data: {
        orderId:     order.id,
        status:      order.status,
        p24Status:   order.p24Status,
        paidAt:      order.paidAt,
        total:       Number(order.total),
      },
    })
  } catch (err) {
    console.error('GET /payments/p24/status error:', err instanceof Error ? err.message : String(err))
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})
