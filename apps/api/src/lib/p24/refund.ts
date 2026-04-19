export type RefundStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export interface P24RefundRequest {
  transactionId: string    // p24TransactionId from orders table
  sessionId: string        // p24SessionId from orders table
  amount: number           // PLN amount (will be converted to grosze internally)
  orderId: number          // local order id (for logging)
  requestId: string        // idempotency UUID (= refund.commandId)
  description?: string
}

export interface P24RefundResult {
  status: RefundStatus
  externalId?: string    // P24 refund ID
  raw?: unknown          // raw response for audit
  error?: { code?: string; message: string }
}

export interface P24Env {
  P24_MERCHANT_ID: string
  P24_API_KEY: string
  P24_CRC_KEY: string
  P24_SANDBOX?: string
}

/**
 * Initiate a refund via Przelewy24 API.
 * Endpoint: POST /api/v1/transactions/{transactionId}/refund
 *
 * Amount in grosze = Math.round(amountPLN * 100)
 * requestId is used as P24's idempotency key.
 */
export async function createP24Refund(
  env: P24Env,
  req: P24RefundRequest,
): Promise<P24RefundResult> {
  const base = env.P24_SANDBOX === 'true'
    ? 'https://sandbox.przelewy24.pl'
    : 'https://secure.przelewy24.pl'

  const amountGrosze = Math.round(req.amount * 100)
  const auth = btoa(`${env.P24_MERCHANT_ID}:${env.P24_API_KEY}`)

  const body = {
    requestId:   req.requestId,
    refundsUuid: req.requestId,
    urlStatus:   '',                            // no webhook for refunds (polling-based)
    refunds: [{
      orderId:     req.sessionId,               // P24 uses sessionId as their orderId
      sessionId:   req.sessionId,
      amount:      amountGrosze,
      description: req.description ?? `Zwrot zamówienia #${req.orderId}`,
    }],
  }

  try {
    const res = await fetch(
      `${base}/api/v1/transactions/${encodeURIComponent(req.transactionId)}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(body),
      },
    )

    const raw = await res.json().catch(() => null)

    if (!res.ok) {
      const msg = (raw as any)?.error?.message ?? `HTTP ${res.status}`
      return {
        status: 'failed',
        raw,
        error: { code: String(res.status), message: msg },
      }
    }

    // P24 returns { data: { refundId, status, ... } } on success
    const data = (raw as any)?.data ?? raw
    const externalId = data?.refundId ?? data?.id ?? undefined

    return {
      status: 'processing',   // P24 refunds are async; final status comes via webhook/polling
      externalId: externalId ? String(externalId) : undefined,
      raw,
    }
  } catch (err) {
    return {
      status: 'failed',
      error: { message: err instanceof Error ? err.message : 'Nieznany błąd P24' },
    }
  }
}

/**
 * Map P24 refund status string to internal RefundStatus.
 */
export function mapP24RefundStatus(p24Status: string): RefundStatus {
  switch (p24Status?.toUpperCase()) {
    case 'SUCCESS':
    case 'COMPLETED':
    case 'CONFIRMED':
      return 'succeeded'
    case 'PENDING':
    case 'IN_PROGRESS':
      return 'processing'
    case 'ERROR':
    case 'FAILED':
    case 'REJECTED':
      return 'failed'
    default:
      return 'processing'
  }
}
