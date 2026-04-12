/**
 * Allegro Order Bulk Reconcile — check processing/paid orders against Allegro API
 *
 * Used for:
 * 1. Admin endpoint (POST /admin/orders/reconcile-processing) — one-shot bulk reconcile
 * 2. Cron guard (reconcileStaleProcessing) — periodic watchdog to prevent stuck orders
 */

import { createDb } from '@repo/db/client'
import { orders, orderItems, products, stockChanges, allegroSyncLog } from '@repo/db/schema'
import { eq, and, inArray, isNotNull, sql } from 'drizzle-orm'
import { getActiveAllegroToken } from '../allegro-tokens'
import { fetchCheckoutForm, sleep } from './helpers'
import { reconcileOrder } from './handlers'
import type { Env } from '../../index'

// KV key: '0' = no processing orders exist (skip DB). Cleared when new order enters processing.
export const PROCESSING_ACTIVE_KV_KEY = 'orders:has_processing'
// KV key: unix ms timestamp when the oldest processing order will become stale.
export const PROCESSING_NEXT_DUE_KV_KEY = 'orders:processing:next_due_at'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ReconcileResult {
  orderId: number
  orderNumber: string
  externalId: string
  previousStatus: string
  newStatus: string | null
  action: 'updated' | 'skipped' | 'error' | 'not_found'
  details?: string
}

export interface BulkReconcileReport {
  total: number
  updated: number
  skipped: number
  errors: number
  notFound: number
  results: ReconcileResult[]
}

// ── Bulk reconcile logic ──────────────────────────────────────────────────

/**
 * Bulk reconcile processing orders against Allegro API.
 * Fetches current checkout-form state for each order and syncs local status.
 *
 * @param env         Worker env bindings
 * @param options     Configuration options
 * @returns           Report with results for each processed order
 */
export async function bulkReconcileProcessingOrders(
  env: Env,
  options: {
    dryRun?: boolean
    includeStatuses?: string[]
    maxOrders?: number
  } = {},
): Promise<BulkReconcileReport> {
  const {
    dryRun = false,
    includeStatuses = ['processing'],
    maxOrders = 50,
  } = options

  const db = createDb(env.DATABASE_URL)
  const token = await getActiveAllegroToken(env)

  if (!token) {
    return {
      total: 0, updated: 0, skipped: 0, errors: 0, notFound: 0,
      results: [{ orderId: 0, orderNumber: '', externalId: '', previousStatus: '', newStatus: null, action: 'error', details: 'Brak aktywnego tokenu Allegro' }],
    }
  }

  // Fetch candidate orders
  const candidates = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      externalId: orders.externalId,
      allegroFulfillmentStatus: orders.allegroFulfillmentStatus,
      trackingNumber: orders.trackingNumber,
      shippedAt: orders.shippedAt,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, includeStatuses as any),
        eq(orders.source, 'allegro'),
        isNotNull(orders.externalId),
      ),
    )
    .orderBy(sql`${orders.createdAt} ASC`)
    .limit(maxOrders)

  const report: BulkReconcileReport = {
    total: candidates.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    notFound: 0,
    results: [],
  }

  if (candidates.length === 0) {
    return report
  }

  for (const order of candidates) {
    // Rate limit: 100ms delay between API calls
    await sleep(100)

    try {
      // Fetch current state from Allegro
      const form = await fetchCheckoutForm(
        token.apiBase,
        token.accessToken,
        order.externalId!,
      )

      if (!form) {
        report.notFound++
        report.results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          externalId: order.externalId!,
          previousStatus: order.status,
          newStatus: null,
          action: 'not_found',
          details: 'Allegro checkout-form nie znaleziony (może za stary?)',
        })
        continue
      }

      // Determine what would change
      const allegroStatus = form.status
      const fulfillmentStatus = form.fulfillment?.status ?? null
      const waybill = (form.delivery?.shipmentSummary?.waybill ?? form.delivery?.shipmentSummary?.trackingNumber ?? '').trim() || null

      const isCancelled = allegroStatus === 'CANCELLED' || fulfillmentStatus === 'CANCELLED'
      const isSent = fulfillmentStatus === 'SENT' || fulfillmentStatus === 'PICKED_UP'

      let expectedNewStatus: string | null = null
      if (isCancelled && order.status !== 'cancelled') {
        expectedNewStatus = 'cancelled'
      } else if (isSent && order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled') {
        expectedNewStatus = 'shipped'
      }

      if (!expectedNewStatus && fulfillmentStatus === order.allegroFulfillmentStatus && !waybill) {
        // Nothing changed
        report.skipped++
        report.results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          externalId: order.externalId!,
          previousStatus: order.status,
          newStatus: null,
          action: 'skipped',
          details: `Allegro: status=${allegroStatus}, fulfillment=${fulfillmentStatus ?? 'null'}`,
        })
        continue
      }

      if (dryRun) {
        // Preview only — don't change DB
        report.updated++
        report.results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          externalId: order.externalId!,
          previousStatus: order.status,
          newStatus: expectedNewStatus,
          action: 'updated',
          details: `[DRY RUN] Allegro: status=${allegroStatus}, fulfillment=${fulfillmentStatus ?? 'null'}, waybill=${waybill ?? 'brak'}`,
        })
        continue
      }

      // Apply changes via reconcileOrder (reuses existing idempotent logic)
      await reconcileOrder(db, form, env.ALLEGRO_KV)

      // Re-read to check what actually changed
      const [updated] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, order.id))
        .limit(1)

      const actualNewStatus = updated?.status !== order.status ? updated?.status ?? null : null

      if (actualNewStatus) {
        report.updated++
      } else {
        report.skipped++
      }

      report.results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        externalId: order.externalId!,
        previousStatus: order.status,
        newStatus: actualNewStatus,
        action: actualNewStatus ? 'updated' : 'skipped',
        details: `Allegro: status=${allegroStatus}, fulfillment=${fulfillmentStatus ?? 'null'}, waybill=${waybill ?? 'brak'}`,
      })

    } catch (err) {
      report.errors++
      report.results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        externalId: order.externalId!,
        previousStatus: order.status,
        newStatus: null,
        action: 'error',
        details: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Log to allegro_sync_log
  if (!dryRun) {
    await db.insert(allegroSyncLog).values({
      action: 'bulk_reconcile',
      status: report.errors > 0 ? 'partial' : 'success',
      responsePayload: {
        total: report.total,
        updated: report.updated,
        skipped: report.skipped,
        errors: report.errors,
        notFound: report.notFound,
        statuses: includeStatuses,
      },
    }).catch(() => {})
  }

  return report
}

// ── Cron guard: reconcile stale processing orders ─────────────────────────

const CRON_BATCH_SIZE = 5
const STALE_THRESHOLD_MS = 60 * 60 * 1000  // 1 hour
const PROCESSING_IDLE_TTL_SECONDS = 60 * 60
const PAID_SWEEP_LAST_RUN_KV_KEY = 'orders:paid_sweep:last_run_at'
const PAID_SWEEP_CURSOR_KV_KEY = 'orders:paid_sweep:cursor'
const PAID_SWEEP_INTERVAL_MS = 60 * 60 * 1000
const PAID_SWEEP_BATCH_SIZE = 3

type PaidSweepCursor = { createdAt: Date; id: number }

function parsePaidSweepCursor(raw: string | null): PaidSweepCursor | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as { createdAt?: string; id?: number }
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'number') return null
    const createdAt = new Date(parsed.createdAt)
    if (Number.isNaN(createdAt.getTime())) return null
    return { createdAt, id: parsed.id }
  } catch {
    return null
  }
}

function serializePaidSweepCursor(cursor: PaidSweepCursor): string {
  return JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })
}

/**
 * Cron guard: periodically check processing orders against Allegro.
 * Called from the 'every 5 minutes' cron trigger — runs in background via waitUntil.
 *
 * Uses KV idle guard to avoid waking Neon when there are no processing orders.
 */
export async function reconcileStaleProcessing(env: Env): Promise<void> {
  // KV idle guard: skip DB entirely when no processing orders exist
  const activeFlag = await env.ALLEGRO_KV.get(PROCESSING_ACTIVE_KV_KEY)
  if (activeFlag === '0') return

  // Adaptive guard: if we already know when the oldest processing order becomes stale,
  // skip DB until that time.
  const nowMs = Date.now()
  const nextDueRaw = await env.ALLEGRO_KV.get(PROCESSING_NEXT_DUE_KV_KEY)
  const nextDueAtMs = Number(nextDueRaw)
  if (Number.isFinite(nextDueAtMs) && nextDueAtMs > nowMs) return

  const db = createDb(env.DATABASE_URL)
  const staleBefore = new Date(nowMs - STALE_THRESHOLD_MS)

  // Find stale processing orders (not updated in the last hour)
  let candidates: Array<{ id: number; orderNumber: string; externalId: string | null }>
  try {
    candidates = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        externalId: orders.externalId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'processing'),
          eq(orders.source, 'allegro'),
          isNotNull(orders.externalId),
          sql`${orders.updatedAt} < ${staleBefore}`,
        ),
      )
      .orderBy(sql`${orders.updatedAt} ASC`)
      .limit(CRON_BATCH_SIZE)
  } catch (err) {
    console.error('[ReconcileProcessing] Błąd pobierania kandydatów:', err instanceof Error ? err.message : String(err))
    return
  }

  if (candidates.length === 0) {
    // No stale candidates right now.
    // If there are no processing orders at all, set idle flag.
    // Otherwise, compute the next due time for the oldest processing order and skip DB until then.
    const [oldestProcessing] = await db
      .select({ updatedAt: orders.updatedAt })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'processing'),
          eq(orders.source, 'allegro'),
          isNotNull(orders.externalId),
        ),
      )
      .orderBy(sql`${orders.updatedAt} ASC`)
      .limit(1)

    if (!oldestProcessing?.updatedAt) {
      await Promise.all([
        env.ALLEGRO_KV.put(PROCESSING_ACTIVE_KV_KEY, '0', { expirationTtl: PROCESSING_IDLE_TTL_SECONDS }).catch(() => {}),
        env.ALLEGRO_KV.delete(PROCESSING_NEXT_DUE_KV_KEY).catch(() => {}),
      ])
      return
    }

    const nextDueAt = oldestProcessing.updatedAt.getTime() + STALE_THRESHOLD_MS
    if (Number.isFinite(nextDueAt) && nextDueAt > nowMs) {
      const ttlSeconds = Math.max(Math.ceil((nextDueAt - nowMs) / 1000), 60)
      await env.ALLEGRO_KV.put(PROCESSING_NEXT_DUE_KV_KEY, String(nextDueAt), { expirationTtl: ttlSeconds }).catch(() => {})
    } else {
      await env.ALLEGRO_KV.delete(PROCESSING_NEXT_DUE_KV_KEY).catch(() => {})
    }
    return
  }

  await env.ALLEGRO_KV.delete(PROCESSING_NEXT_DUE_KV_KEY).catch(() => {})

  const token = await getActiveAllegroToken(env)
  if (!token) {
    console.warn('[ReconcileProcessing] Brak tokenu Allegro — pomijam reconcile')
    return
  }

  let reconciled = 0

  for (const order of candidates) {
    if (!order.externalId) continue

    try {
      await sleep(100)  // Rate limit

      const form = await fetchCheckoutForm(token.apiBase, token.accessToken, order.externalId)
      if (!form) {
        // Allegro might have purged old checkout forms — touch updatedAt to avoid re-checking
        await db.update(orders)
          .set({ updatedAt: new Date() })
          .where(eq(orders.id, order.id))
        continue
      }

      await reconcileOrder(db, form, env.ALLEGRO_KV)
      reconciled++
    } catch (err) {
      console.warn(`[ReconcileProcessing] Błąd dla zamówienia ${order.orderNumber}:`, err instanceof Error ? err.message : String(err))
    }
  }

  if (reconciled > 0) {
    console.log(`[ReconcileProcessing] Zrekoncylowano ${reconciled}/${candidates.length} zamówień processing`)
  }
}

/**
 * Hourly paid sweep: reconcile a small batch of the oldest paid Allegro orders.
 * Traversal is cursor-based (oldest -> newest), wraps to oldest after reaching the end.
 */
export async function reconcileHourlyPaidOrders(env: Env): Promise<void> {
  const nowMs = Date.now()

  const [lastRunRaw, cursorRaw] = await Promise.all([
    env.ALLEGRO_KV.get(PAID_SWEEP_LAST_RUN_KV_KEY),
    env.ALLEGRO_KV.get(PAID_SWEEP_CURSOR_KV_KEY),
  ])

  const lastRunMs = Number(lastRunRaw)
  if (Number.isFinite(lastRunMs) && nowMs - lastRunMs < PAID_SWEEP_INTERVAL_MS) {
    return
  }

  const cursor = parsePaidSweepCursor(cursorRaw)
  const db = createDb(env.DATABASE_URL)

  const loadCandidates = async (afterCursor: PaidSweepCursor | null) => {
    const base = [
      eq(orders.status, 'paid'),
      eq(orders.source, 'allegro'),
      isNotNull(orders.externalId),
    ]

    const where = afterCursor
      ? and(
          ...base,
          sql`(
            ${orders.createdAt} > ${afterCursor.createdAt}
            OR (${orders.createdAt} = ${afterCursor.createdAt} AND ${orders.id} > ${afterCursor.id})
          )`,
        )
      : and(...base)

    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        externalId: orders.externalId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(where)
      .orderBy(sql`${orders.createdAt} ASC, ${orders.id} ASC`)
      .limit(PAID_SWEEP_BATCH_SIZE)
  }

  let candidates = await loadCandidates(cursor)

  // Reached end of stream — wrap to oldest paid orders.
  if (candidates.length === 0 && cursor) {
    candidates = await loadCandidates(null)
  }

  if (candidates.length === 0) {
    await Promise.all([
      env.ALLEGRO_KV.put(PAID_SWEEP_LAST_RUN_KV_KEY, String(nowMs)).catch(() => {}),
      env.ALLEGRO_KV.delete(PAID_SWEEP_CURSOR_KV_KEY).catch(() => {}),
    ])
    return
  }

  const token = await getActiveAllegroToken(env)
  if (!token) {
    console.warn('[PaidSweep] Brak tokenu Allegro — pomijam hourly sweep paid')
    await env.ALLEGRO_KV.put(PAID_SWEEP_LAST_RUN_KV_KEY, String(nowMs)).catch(() => {})
    return
  }

  let reconciled = 0

  for (const order of candidates) {
    if (!order.externalId) continue

    try {
      await sleep(100)

      const form = await fetchCheckoutForm(token.apiBase, token.accessToken, order.externalId)
      if (!form) continue

      await reconcileOrder(db, form, env.ALLEGRO_KV)
      reconciled++
    } catch (err) {
      console.warn(`[PaidSweep] Błąd dla zamówienia ${order.orderNumber}:`, err instanceof Error ? err.message : String(err))
    }
  }

  const last = candidates[candidates.length - 1]

  await Promise.all([
    env.ALLEGRO_KV.put(PAID_SWEEP_LAST_RUN_KV_KEY, String(nowMs)).catch(() => {}),
    env.ALLEGRO_KV.put(
      PAID_SWEEP_CURSOR_KV_KEY,
      serializePaidSweepCursor({ createdAt: last.createdAt, id: last.id }),
    ).catch(() => {}),
  ])

  if (reconciled > 0) {
    console.log(`[PaidSweep] Zrekoncylowano ${reconciled}/${candidates.length} zamówień paid`)
  }
}
