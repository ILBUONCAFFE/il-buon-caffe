/**
 * Admin Command Functions — Allegro Returns
 *
 * Five idempotent, side-effect-bearing commands for admin-triggered return actions.
 * Each command fetches state, guards invariants, calls external APIs as needed,
 * persists changes, and records audit/history entries.
 *
 * CommandError is thrown for known invalid-state conditions (404, 422).
 * All other errors propagate to the caller for generic 500 handling.
 */

import { eq } from 'drizzle-orm'
import { createDb } from '@repo/db/client'
import { returns, refunds, orders } from '@repo/db/schema'
import { logAdminAction } from '../../audit'
import { recordStatusChange } from '../../record-status-change'
import { createP24Refund } from '../../p24/refund'
import {
  acceptCustomerReturnRefund,
  rejectCustomerReturn,
  createCommissionRefundClaim,
} from '../client'
import { resolveAccessToken } from '../../allegro-orders/resolve-token'
import type { Env } from '../../../index'

// ── Supporting types ────────────────────────────────────────────────────────

/** Pre-fetched return row — pass from the route to avoid a second DB round-trip inside commands. */
export interface PrefetchedReturn {
  id:                number
  status:            string
  source:            string
  orderId:           number
  totalRefundAmount: string | null
  allegro?:          Record<string, unknown> | null
}

export interface CommandEnv {
  DATABASE_URL: string
  ALLEGRO_KV: KVNamespace
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string
  P24_MERCHANT_ID?: string
  P24_SECRET_ID?: string
  P24_CRC?: string
}

export class CommandError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message?: string,
  ) {
    super(message ?? code)
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

const ALLEGRO_API_BASE = {
  production: 'https://api.allegro.pl',
  sandbox: 'https://api.allegro.pl.allegrosandbox.pl',
} as const

function getApiBase(env: CommandEnv): string {
  return ALLEGRO_API_BASE[env.ALLEGRO_ENVIRONMENT] ?? ALLEGRO_API_BASE.production
}

async function resolveToken(env: CommandEnv, db: ReturnType<typeof createDb>): Promise<string> {
  const token = await resolveAccessToken(env.ALLEGRO_KV, db, env as unknown as Env)
  if (!token) {
    throw new CommandError('ALLEGRO_TOKEN_UNAVAILABLE', 503, 'Allegro access token could not be resolved')
  }
  return token
}

// ── Command 1: acceptShopReturn ─────────────────────────────────────────────

/**
 * Approve a shop-sourced return.
 * Optionally triggers a P24 refund if a transactionId exists on the linked order.
 */
export async function acceptShopReturn(
  db: ReturnType<typeof createDb>,
  returnId: number,
  adminId: number,
  env: CommandEnv,
  prefetchedReturn?: PrefetchedReturn,
): Promise<void> {
  let ret: PrefetchedReturn | undefined = prefetchedReturn
  if (!ret) {
    const returnRows = await db
      .select({
        id:                returns.id,
        status:            returns.status,
        source:            returns.source,
        orderId:           returns.orderId,
        totalRefundAmount: returns.totalRefundAmount,
      })
      .from(returns)
      .where(eq(returns.id, returnId))
      .limit(1)
    ret = returnRows[0]
  }

  if (!ret) {
    throw new CommandError('NOT_FOUND', 404, `Return ${returnId} not found`)
  }

  if (ret.source !== 'shop') {
    throw new CommandError('INVALID_STATE', 422, `acceptShopReturn requires source='shop', got '${ret.source}'`)
  }

  if (ret.status !== 'new' && ret.status !== 'in_review') {
    throw new CommandError('INVALID_STATE', 422, `Cannot approve return in status '${ret.status}'`)
  }

  const orderId = ret.orderId

  // Fetch order to check for P24 transactionId
  const orderRows = await db
    .select({
      p24TransactionId: orders.p24TransactionId,
      p24SessionId:     orders.p24SessionId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  const order = orderRows[0]
  const transactionId = order?.p24TransactionId ?? null
  const sessionId = order?.p24SessionId ?? null

  const commandId = crypto.randomUUID()
  const amount = ret.totalRefundAmount != null ? Number(ret.totalRefundAmount) : 0

  if (transactionId && sessionId) {
    const refundResult = await createP24Refund(
      {
        P24_MERCHANT_ID: env.P24_MERCHANT_ID ?? '',
        // P24 uses API key + CRC separately; CommandEnv has P24_SECRET_ID & P24_CRC
        P24_API_KEY: env.P24_SECRET_ID ?? '',
        P24_CRC_KEY: env.P24_CRC ?? '',
      },
      {
        transactionId,
        sessionId,
        amount,
        orderId,
        requestId: commandId,
        description: `Zwrot #${returnId} — zamówienie #${orderId}`,
      },
    )

    await db.insert(refunds).values({
      returnId,
      method: 'p24',
      status: refundResult.status as 'pending' | 'processing' | 'succeeded' | 'failed',
      amount: String(amount),
      commandId,
      externalId: refundResult.externalId ?? null,
      payload: refundResult.raw as Record<string, unknown> ?? null,
      error: refundResult.error
        ? { message: refundResult.error.message, code: refundResult.error.code }
        : null,
    })
  } else {
    // No P24 transaction — manual bank transfer refund placeholder
    await db.insert(refunds).values({
      returnId,
      method: 'bank_transfer_manual',
      status: 'pending',
      amount: String(amount),
      commandId,
    })
  }

  await db
    .update(returns)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(returns.id, returnId))

  await recordStatusChange(db, {
    orderId,
    category: 'status',
    newValue: 'return_received',
    source: 'admin',
  })

  await logAdminAction(db, {
    adminSub: String(adminId),
    action: 'approve_return' as never,
    targetOrderId: orderId,
    details: { returnId },
  })
}

// ── Command 2: acceptAllegroReturnRefund ────────────────────────────────────

/**
 * Approve an Allegro-sourced return by calling Allegro's refund endpoint.
 * Optionally fires a commission refund claim in the background.
 */
export async function acceptAllegroReturnRefund(
  db: ReturnType<typeof createDb>,
  returnId: number,
  adminId: number,
  env: CommandEnv,
  waitUntil?: (p: Promise<unknown>) => void,
  prefetchedReturn?: PrefetchedReturn,
): Promise<void> {
  let ret: PrefetchedReturn | undefined = prefetchedReturn
  if (!ret) {
    const returnRows = await db
      .select({
        id:                returns.id,
        status:            returns.status,
        source:            returns.source,
        orderId:           returns.orderId,
        totalRefundAmount: returns.totalRefundAmount,
        allegro:           returns.allegro,
      })
      .from(returns)
      .where(eq(returns.id, returnId))
      .limit(1)
    ret = returnRows[0]
  }

  if (!ret) {
    throw new CommandError('NOT_FOUND', 404, `Return ${returnId} not found`)
  }

  if (ret.source !== 'allegro') {
    throw new CommandError('INVALID_STATE', 422, `acceptAllegroReturnRefund requires source='allegro', got '${ret.source}'`)
  }

  if (ret.status !== 'new' && ret.status !== 'in_review') {
    throw new CommandError('INVALID_STATE', 422, `Cannot approve return in status '${ret.status}'`)
  }

  const allegroCustomerReturnId = ret.allegro?.customerReturnId
  if (!allegroCustomerReturnId) {
    throw new CommandError('INVALID_STATE', 422, 'Return has no allegro.customerReturnId')
  }

  const orderId = ret.orderId
  const apiBase = getApiBase(env)
  const accessToken = await resolveToken(env, db)

  await acceptCustomerReturnRefund(allegroCustomerReturnId, {}, apiBase, accessToken, db)

  const amount = ret.totalRefundAmount != null ? Number(ret.totalRefundAmount) : 0

  await db.insert(refunds).values({
    returnId,
    method: 'allegro_payments',
    status: 'processing',
    amount: String(amount),
    commandId: crypto.randomUUID(),
  })

  await db
    .update(returns)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(returns.id, returnId))

  await recordStatusChange(db, {
    orderId,
    category: 'status',
    newValue: 'return_received',
    source: 'admin',
  })

  if (waitUntil) {
    waitUntil(
      createCommissionRefundClaim(
        { orderId: String(orderId) },
        apiBase,
        accessToken,
        db,
      ).catch((err: unknown) =>
        console.warn('[Returns] commission claim failed:', err instanceof Error ? err.message : err),
      ),
    )
  }

  await logAdminAction(db, {
    adminSub: String(adminId),
    action: 'approve_return' as never,
    targetOrderId: orderId,
    details: { returnId },
  })
}

// ── Command 3: rejectReturn ─────────────────────────────────────────────────

/**
 * Reject a return. For Allegro returns, calls Allegro's rejection endpoint first.
 */
export async function rejectReturn(
  db: ReturnType<typeof createDb>,
  returnId: number,
  adminId: number,
  reason: { code: string; reason?: string },
  env: CommandEnv,
): Promise<void> {
  const returnRows = await db
    .select({
      id:      returns.id,
      status:  returns.status,
      source:  returns.source,
      orderId: returns.orderId,
      allegro: returns.allegro,
    })
    .from(returns)
    .where(eq(returns.id, returnId))
    .limit(1)

  const ret = returnRows[0]
  if (!ret) {
    throw new CommandError('NOT_FOUND', 404, `Return ${returnId} not found`)
  }

  if (ret.status !== 'new' && ret.status !== 'in_review') {
    throw new CommandError('INVALID_STATE', 422, `Cannot reject a return in status '${ret.status}'`)
  }

  const orderId = ret.orderId

  if (ret.source === 'allegro') {
    const allegroCustomerReturnId = ret.allegro?.customerReturnId
    if (!allegroCustomerReturnId) {
      throw new CommandError('INVALID_STATE', 422, 'Allegro return has no allegro.customerReturnId')
    }
    const apiBase = getApiBase(env)
    const accessToken = await resolveToken(env, db)
    await rejectCustomerReturn(
      allegroCustomerReturnId,
      { rejection: reason },
      apiBase,
      accessToken,
      db,
    )
  }

  const now = new Date()
  await db
    .update(returns)
    .set({ status: 'rejected', closedAt: now, updatedAt: now })
    .where(eq(returns.id, returnId))

  await recordStatusChange(db, {
    orderId,
    category: 'status',
    newValue: 'return_requested',
    source: 'admin',
  })

  await logAdminAction(db, {
    adminSub: String(adminId),
    action: 'reject_return' as never,
    targetOrderId: orderId,
    details: { returnId, ...reason },
  })
}

// ── Command 4: issueManualRefund ────────────────────────────────────────────

/**
 * Record a manual bank-transfer refund for a return and mark it as refunded.
 */
export async function issueManualRefund(
  db: ReturnType<typeof createDb>,
  returnId: number,
  adminId: number,
  amount: number,
): Promise<void> {
  const returnRows = await db
    .select({
      id:      returns.id,
      status:  returns.status,
      orderId: returns.orderId,
    })
    .from(returns)
    .where(eq(returns.id, returnId))
    .limit(1)

  const ret = returnRows[0]
  if (!ret) {
    throw new CommandError('NOT_FOUND', 404, `Return ${returnId} not found`)
  }

  if (ret.status === 'refunded' || ret.status === 'closed') {
    throw new CommandError('INVALID_STATE', 422, `Cannot issue refund for return in status '${ret.status}'`)
  }

  const orderId = ret.orderId

  await db.insert(refunds).values({
    returnId,
    method: 'bank_transfer_manual',
    status: 'succeeded',
    amount: String(amount),
    commandId: crypto.randomUUID(),
  })

  await db
    .update(returns)
    .set({ status: 'refunded', updatedAt: new Date() })
    .where(eq(returns.id, returnId))

  await recordStatusChange(db, {
    orderId,
    category: 'status',
    newValue: 'refunded',
    source: 'admin',
  })

  await logAdminAction(db, {
    adminSub: String(adminId),
    action: 'issue_refund' as never,
    targetOrderId: orderId,
    details: { returnId, amount },
  })
}

// ── Command 5: reopenReturn ─────────────────────────────────────────────────

/**
 * Reopen a closed return by transitioning it back to 'in_review'.
 */
export async function reopenReturn(
  db: ReturnType<typeof createDb>,
  returnId: number,
  adminId: number,
): Promise<void> {
  const returnRows = await db
    .select({
      id:      returns.id,
      status:  returns.status,
      orderId: returns.orderId,
    })
    .from(returns)
    .where(eq(returns.id, returnId))
    .limit(1)

  const ret = returnRows[0]
  if (!ret) {
    throw new CommandError('NOT_FOUND', 404, `Return ${returnId} not found`)
  }

  if (ret.status !== 'closed') {
    throw new CommandError('INVALID_STATE', 422, `Can only reopen returns in status 'closed', got '${ret.status}'`)
  }

  await db
    .update(returns)
    .set({ status: 'in_review', closedAt: null, updatedAt: new Date() })
    .where(eq(returns.id, returnId))

  // TODO: add 'reopen_return' to auditActionEnum when schema migration is feasible
  await logAdminAction(db, {
    adminSub: String(adminId),
    action: 'admin_action' as never,
    targetOrderId: ret.orderId,
    details: { returnId, action: 'reopen' },
  })
}
