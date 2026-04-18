/**
 * Allegro Tracking Refresh — shared logic for cron and API endpoint
 */

import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { getActiveAllegroToken, type ActiveAllegroToken } from '../allegro-tokens'
import { allegroHeaders } from './helpers'
import type { Env } from '../../index'

// ── Helpers ───────────────────────────────────────────────────────────────

function normalizeTrackingCode(value: string | null | undefined): string | null {
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

function shouldAutoMarkDelivered(code: string | null): boolean {
  if (!code) return false
  return (
    code.includes('DELIVERED') ||
    code.includes('PICKED_UP') ||
    code.includes('PICKUP') ||
    code.includes('RECEIVED')
  )
}

function formatDbError(err: unknown): string {
  if (!(err instanceof Error)) return String(err)

  const cause = (err as Error & { cause?: unknown }).cause
  if (cause && typeof cause === 'object') {
    const causeObj = cause as { message?: unknown; code?: unknown }
    const parts = [
      typeof causeObj.code === 'string' ? `code=${causeObj.code}` : null,
      typeof causeObj.message === 'string' ? causeObj.message : null,
    ].filter((x): x is string => !!x)

    if (parts.length > 0) {
      return `${err.message} | cause: ${parts.join(' | ')}`
    }
  }

  return err.message
}

interface TrackingSnapshotState {
  trackingNumber: string | null
  trackingStatus: string | null
  trackingStatusCode: string | null
}

interface RefreshOrderTrackingOptions {
  tokenOverride?: ActiveAllegroToken
  previousSnapshot?: TrackingSnapshotState
}

interface RefreshOrderTrackingOutcome {
  before: TrackingSnapshotState
  after: TrackingSnapshotState
  changed: boolean
}

interface TrackingRefreshCandidate {
  id: number
  externalId: string
  trackingNumber: string | null
  trackingStatus: string | null
  trackingStatusCode: string | null
}

interface ShipmentCandidate {
  carrierId: string
  waybill: string
}

interface ShipmentTrackingSnapshot {
  carrierId: string
  waybill: string
  latestCode: string
  latestDescription: string | null
  latestOccurredAt: Date | null
}

function normalizeSnapshotState(value?: Partial<TrackingSnapshotState> | null): TrackingSnapshotState {
  return {
    trackingNumber: value?.trackingNumber ?? null,
    trackingStatus: value?.trackingStatus ?? null,
    trackingStatusCode: value?.trackingStatusCode ?? null,
  }
}

function buildRefreshOutcome(
  before: TrackingSnapshotState,
  after: TrackingSnapshotState,
): RefreshOrderTrackingOutcome {
  return {
    before,
    after,
    changed: before.trackingNumber !== after.trackingNumber
      || before.trackingStatus !== after.trackingStatus
      || before.trackingStatusCode !== after.trackingStatusCode,
  }
}

function displayStatusCode(value: string | null): string {
  return value ?? 'UNKNOWN'
}

function displayStatusText(value: string | null): string {
  return value ?? 'brak'
}

function extractLatestCarrierTrackingStatus(
  trackData: Record<string, unknown>,
  waybill: string,
): { latestCode: string; latestDescription: string | null; latestOccurredAt: Date | null } {
  const buckets: Array<Record<string, unknown>> = []
  for (const key of ['shipments', 'packages', 'items', 'waybills', 'tracking']) {
    if (!Array.isArray(trackData[key])) continue
    for (const item of trackData[key] as unknown[]) {
      if (item != null && typeof item === 'object') {
        buckets.push(item as Record<string, unknown>)
      }
    }
  }

  const normWaybill = waybill.toUpperCase()
  const pick = buckets.find((entry) => {
    const value = String(entry.waybill ?? entry.number ?? entry.id ?? '').toUpperCase()
    return value === normWaybill
  }) ?? buckets[0]

  const trackingDetails = pick?.trackingDetails
  const trackingDetailsStatuses =
    trackingDetails != null
    && typeof trackingDetails === 'object'
    && Array.isArray((trackingDetails as { statuses?: unknown[] }).statuses)
      ? (trackingDetails as { statuses: unknown[] }).statuses
      : null

  const rawStatuses = trackingDetailsStatuses != null
    ? trackingDetailsStatuses
    : Array.isArray(pick?.statuses)
      ? pick.statuses
      : Array.isArray(pick?.events)
        ? pick.events
        : Array.isArray(pick?.history)
          ? pick.history
          : []

  const sorted = rawStatuses.slice().sort((a: any, b: any) => {
    const left = new Date(b?.occurredAt ?? b?.time ?? b?.date ?? 0).getTime()
    const right = new Date(a?.occurredAt ?? a?.time ?? a?.date ?? 0).getTime()
    return left - right
  })

  const latest = sorted[0] as Record<string, unknown> | undefined
  const latestCode = normalizeTrackingCode(String(latest?.code ?? latest?.status ?? '')) ?? 'UNKNOWN'
  const latestDescription = latest?.description == null ? null : String(latest.description).slice(0, 255)
  const latestOccurredRaw = latest?.occurredAt ?? latest?.time ?? latest?.date ?? null
  const latestOccurredAt = latestOccurredRaw == null ? null : toDateOrNull(String(latestOccurredRaw))

  return {
    latestCode,
    latestDescription,
    latestOccurredAt,
  }
}

// ── Tracking snapshot refresh ─────────────────────────────────────────────

/**
 * Fetch current shipment status from Allegro + carrier API and persist to DB.
 * Only writes when data changed (IS DISTINCT FROM guard).
 *
 * @param db   Drizzle client — HTTP driver for API endpoint, WS pool for cron
 * @param env  Worker env bindings (token resolution, KV)
 * @param orderId         Internal order ID
 * @param checkoutFormId  Allegro checkout form UUID
 */
export async function refreshOrderTrackingSnapshot(
  db: ReturnType<typeof createDb>,
  env: Env,
  orderId: number,
  checkoutFormId: string,
  options?: RefreshOrderTrackingOptions,
): Promise<RefreshOrderTrackingOutcome | null> {
  const before = normalizeSnapshotState(options?.previousSnapshot)
  const token = options?.tokenOverride ?? await getActiveAllegroToken(env)
  if (!token) return null

  const headers = {
    ...allegroHeaders(token.accessToken),
    'Accept-Language': 'pl-PL',
  }

  const shipResp = await fetch(`${token.apiBase}/order/checkout-forms/${checkoutFormId}/shipments`, {
    signal: AbortSignal.timeout(10_000),
    headers,
  })

  if (!shipResp.ok) return null

  const shipData = await shipResp.json() as {
    shipments?: Array<{ carrierId?: string; waybill?: string; trackingNumber?: string }>
  }

  const shipmentCandidates = (shipData.shipments ?? [])
    .map((shipment) => {
      const rawWaybill = (shipment.waybill ?? shipment.trackingNumber ?? '').trim().slice(0, 100)
      return {
        carrierId: shipment.carrierId?.trim() ?? '',
        waybill: rawWaybill,
      }
    })
    .filter((shipment): shipment is ShipmentCandidate => shipment.waybill.length > 0)

  if (shipmentCandidates.length === 0) {
    // No waybill yet — write timestamp only on the first check (IS NULL).
    // Subsequent cooldown is handled entirely by the selector's CASE interval,
    // so writing repeatedly would just wake Neon without changing anything.
    const now = new Date()
    await db.update(orders)
      .set({ trackingStatusUpdatedAt: now, updatedAt: now })
      .where(and(
        eq(orders.id, orderId),
        sql`${orders.trackingStatusUpdatedAt} IS NULL`,
      ))
    return buildRefreshOutcome(before, before)
  }

  const now = new Date()

  const readShipmentSnapshot = async (shipment: ShipmentCandidate): Promise<ShipmentTrackingSnapshot> => {
    if (!shipment.carrierId) {
      return {
        carrierId: '',
        waybill: shipment.waybill,
        latestCode: 'LABEL_CREATED',
        latestDescription: 'Etykieta wygenerowana',
        latestOccurredAt: null,
      }
    }

    const trackResp = await fetch(
      `${token.apiBase}/order/carriers/${encodeURIComponent(shipment.carrierId)}/tracking?waybill=${encodeURIComponent(shipment.waybill)}`,
      { signal: AbortSignal.timeout(10_000), headers },
    )

    if (!trackResp.ok) {
      return {
        carrierId: shipment.carrierId,
        waybill: shipment.waybill,
        latestCode: 'LABEL_CREATED',
        latestDescription: before.trackingStatus,
        latestOccurredAt: null,
      }
    }

    const trackData = await trackResp.json() as Record<string, unknown>
    const latest = extractLatestCarrierTrackingStatus(trackData, shipment.waybill)
    return {
      carrierId: shipment.carrierId,
      waybill: shipment.waybill,
      latestCode: latest.latestCode,
      latestDescription: latest.latestDescription,
      latestOccurredAt: latest.latestOccurredAt,
    }
  }

  let selectedSnapshot: ShipmentTrackingSnapshot | null = null
  let shouldMarkDelivered = false
  const allSnapshots: ShipmentTrackingSnapshot[] = []

  for (const shipment of shipmentCandidates) {
    const snapshot = await readShipmentSnapshot(shipment)
    allSnapshots.push(snapshot)

    if (
      selectedSnapshot == null
      || (
        !shouldAutoMarkDelivered(selectedSnapshot.latestCode)
        && snapshot.latestOccurredAt != null
        && (selectedSnapshot.latestOccurredAt == null || snapshot.latestOccurredAt.getTime() > selectedSnapshot.latestOccurredAt.getTime())
      )
    ) {
      selectedSnapshot = snapshot
    }

    if (shouldAutoMarkDelivered(snapshot.latestCode)) {
      // Delivered snapshot wins — mark it as selected but continue to collect remaining
      // shipments for display in the admin panel (multi-parcel / duplicate label support).
      selectedSnapshot = snapshot
      shouldMarkDelivered = true
    }
  }

  if (allSnapshots.length > 1) {
    const summary = allSnapshots.map((s) =>
      `${s.waybill}(${s.latestCode})${s === selectedSnapshot ? ' ← selected' : ''}`
    ).join(', ')
    console.log(`[TrackingRefresh] order=${orderId} multi-shipment: ${summary}`)
  }

  if (!selectedSnapshot) {
    return buildRefreshOutcome(before, before)
  }

  const latestOccurredAt = selectedSnapshot.latestOccurredAt
  const after = {
    trackingNumber: selectedSnapshot.waybill,
    trackingStatus: selectedSnapshot.latestDescription,
    trackingStatusCode: selectedSnapshot.latestCode,
  }

  const allShipmentsForDb = allSnapshots.map((s) => ({
    waybill: s.waybill,
    carrierId: s.carrierId,
    statusCode: s.latestCode,
    statusLabel: s.latestDescription,
    occurredAt: s.latestOccurredAt?.toISOString() ?? null,
    isSelected: s === selectedSnapshot,
  }))

  await db.update(orders)
    .set({
      trackingNumber: after.trackingNumber,
      trackingStatus: after.trackingStatus,
      trackingStatusCode: after.trackingStatusCode,
      trackingStatusUpdatedAt: now,
      trackingLastEventAt: latestOccurredAt,
      allegroShipmentsSnapshot: allShipmentsForDb,
      updatedAt: now,
    })
    .where(and(
      eq(orders.id, orderId),
      sql`(
        ${orders.trackingNumber} IS DISTINCT FROM ${after.trackingNumber}
        OR ${orders.trackingStatus} IS DISTINCT FROM ${after.trackingStatus}
        OR ${orders.trackingStatusCode} IS DISTINCT FROM ${after.trackingStatusCode}
        OR ${orders.trackingLastEventAt} IS DISTINCT FROM ${latestOccurredAt}
        OR ${orders.trackingStatusUpdatedAt} IS NULL
      )`,
    ))

  // Log tracking code transition (raw SQL — avoids @repo/db import resolution in worktree)
  if (before.trackingStatusCode !== after.trackingStatusCode && after.trackingStatusCode) {
    await db.execute(sql`
      INSERT INTO order_status_history (order_id, category, previous_value, new_value, source, source_ref, metadata)
      VALUES (
        ${orderId}, 'tracking',
        ${before.trackingStatusCode},
        ${after.trackingStatusCode},
        'carrier_sync'::status_source,
        ${after.trackingNumber ?? null},
        ${selectedSnapshot?.carrierId ? JSON.stringify({ carrierId: selectedSnapshot.carrierId }) : null}::jsonb
      )
    `)
  }

  if (shouldMarkDelivered) {
    // Carrier-level delivery confirmation is authoritative for the final transition.
    // Allow processing → delivered for orders that were never manually marked shipped
    // (e.g. Allegro fulfillment went SENT → DELIVERED without an intermediate admin action).
    await db.update(orders)
      .set({
        status: 'delivered',
        deliveredAt: sql`COALESCE(${orders.deliveredAt}, ${now})`,
        updatedAt: now,
      })
      .where(and(
        eq(orders.id, orderId),
        // Include 'paid': merchants sometimes add tracking without updating Allegro fulfillmentStatus,
        // so the order never transitions through 'shipped'. Carrier delivery is authoritative.
        inArray(orders.status, ['shipped', 'processing', 'paid']),
      ))
    // Log carrier-confirmed delivery to status history
    await db.execute(sql`
      INSERT INTO order_status_history (order_id, category, previous_value, new_value, source, source_ref, metadata)
      VALUES (
        ${orderId}, 'status',
        NULL,
        'delivered',
        'carrier_sync'::status_source,
        ${after.trackingNumber ?? null},
        ${after.trackingStatusCode ? JSON.stringify({ trackingStatusCode: after.trackingStatusCode }) : null}::jsonb
      )
    `)
  }

  return buildRefreshOutcome(before, after)
}

// ── One-time backfill ─────────────────────────────────────────────────────

const BACKFILL_PAGE_SIZE = 10
const BACKFILL_CONCURRENCY = 3

/**
 * Process one page of the 180-day backfill.
 * No cooldown filter — every order with externalId and trackingNumber is eligible.
 * Returns { processed, hasMore } so the caller can chain to the next page.
 */
const BACKFILL_LOCK_KEY = 'allegro:tracking:backfill:lock'
const BACKFILL_LOCK_TTL = 5 * 60 // 5 minutes

export async function runTrackingBackfillPage(
  db: ReturnType<typeof createDb>,
  env: Env,
  page: number,
): Promise<{ processed: number; hasMore: boolean }> {
  // Prevent concurrent backfill calls from duplicating Allegro subrequests.
  const existing = await env.ALLEGRO_KV.get(BACKFILL_LOCK_KEY)
  if (existing) {
    console.log('[TrackingBackfill] Lock held — skipping concurrent call')
    return { processed: 0, hasMore: false }
  }
  await env.ALLEGRO_KV.put(BACKFILL_LOCK_KEY, '1', { expirationTtl: BACKFILL_LOCK_TTL })

  try {
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({ id: orders.id, externalId: orders.externalId })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.externalId),
        sql`COALESCE(${orders.shippedAt}, ${orders.createdAt}) > ${cutoff}`,
      ),
    )
    .orderBy(orders.id)
    .limit(BACKFILL_PAGE_SIZE)
    .offset(page * BACKFILL_PAGE_SIZE)

  const candidates = rows.filter((r): r is { id: number; externalId: string } => r.externalId !== null)
  const token = await getActiveAllegroToken(env)
  if (!token) {
    return { processed: 0, hasMore: candidates.length === BACKFILL_PAGE_SIZE }
  }

  for (let i = 0; i < candidates.length; i += BACKFILL_CONCURRENCY) {
    await Promise.allSettled(
      candidates.slice(i, i + BACKFILL_CONCURRENCY).map((order) =>
        refreshOrderTrackingSnapshot(db, env, order.id, order.externalId, {
          tokenOverride: token,
        }),
      ),
    )
  }

    return { processed: candidates.length, hasMore: candidates.length === BACKFILL_PAGE_SIZE }
  } finally {
    await env.ALLEGRO_KV.delete(BACKFILL_LOCK_KEY)
  }
}

// ── Cron batch refresh ────────────────────────────────────────────────────

const BATCH_SIZE = 5
const CONCURRENCY = 2
const HARD_CUTOFF_DAYS = 30
const TRACKING_IDLE_TTL_SECONDS = 24 * 60 * 60

/**
 * When 0 candidates are found, query the soonest time any active order will become stale.
 * Returns TTL in seconds: how long to suppress DB checks via the KV idle guard.
 * Falls back to TRACKING_IDLE_TTL_SECONDS when no active tracked orders exist at all.
 */
async function querySoonestNextDueTtlSeconds(db: ReturnType<typeof createDb>): Promise<number> {
  const cutoffDate = new Date(Date.now() - HARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000)
  const result = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM (
      MIN(CASE
        WHEN ${orders.trackingStatusCode} ILIKE '%OUT_FOR_DELIVERY%'
          OR ${orders.trackingStatusCode} ILIKE '%COURIER%'
          THEN ${orders.trackingStatusUpdatedAt} + INTERVAL '5 minutes'
        WHEN ${orders.trackingStatusCode} ILIKE '%EXCEPTION%'
          OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
          OR ${orders.trackingStatusCode} ILIKE '%FAILED%'
          THEN ${orders.trackingStatusUpdatedAt} + INTERVAL '20 minutes'
        WHEN ${orders.trackingStatusCode} ILIKE '%IN_TRANSIT%'
          OR ${orders.trackingStatusCode} ILIKE '%TRANSIT%'
          OR ${orders.trackingStatusCode} ILIKE '%SENT%'
          THEN ${orders.trackingStatusUpdatedAt} + INTERVAL '30 minutes'
        WHEN ${orders.trackingStatusCode} ILIKE '%PICKED_UP%'
          OR ${orders.trackingStatusCode} ILIKE '%DELIVERED%'
          THEN ${orders.trackingStatusUpdatedAt} + INTERVAL '12 hours'
        WHEN ${orders.trackingStatusCode} ILIKE '%LABEL_CREATED%'
          OR ${orders.trackingStatusCode} ILIKE '%CREATED%'
          OR ${orders.trackingStatusCode} ILIKE '%REGISTERED%'
          THEN ${orders.trackingStatusUpdatedAt} + INTERVAL '90 minutes'
        ELSE ${orders.trackingStatusUpdatedAt} + INTERVAL '60 minutes'
      END) - NOW()
    ))::int AS ttl_seconds
    FROM ${orders}
    WHERE ${orders.source} = 'allegro'
      AND ${orders.externalId} IS NOT NULL
      AND COALESCE(${orders.shippedAt}, ${orders.createdAt}) > ${cutoffDate}
      AND NOT (
        (${orders.status} = 'delivered'
          AND (${orders.trackingStatusCode} ILIKE '%DELIVERED%' OR ${orders.trackingStatusCode} ILIKE '%PICKED_UP%'))
        OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
      )
      AND ${orders.trackingStatusUpdatedAt} IS NOT NULL
  `)
  const row = result.rows?.[0] as { ttl_seconds: number | null } | undefined
  const ttl = row?.ttl_seconds
  if (typeof ttl === 'number' && ttl > 0) return Math.min(ttl, TRACKING_IDLE_TTL_SECONDS)
  return TRACKING_IDLE_TTL_SECONDS
}

// KV key: '0' = no active tracked orders (skip DB), absent/other = check DB.
// Cleared by processEvent when an order becomes shipped so tracking kicks in immediately.
export const TRACKING_ACTIVE_KV_KEY = 'allegro:tracking:has_active_orders'

/**
 * Select orders whose tracking snapshot is stale and needs refreshing.
 *
 * Cooldown per status (based on trackingStatusCode pattern):
 *   out_for_delivery / courier  →  5 min   (delivery imminent)
 *   exception / return / failed → 20 min   (issue resolution)
 *   in_transit / sent           → 30 min   (active transit)
 *   label_created / registered  → 90 min   (pre-pickup)
 *   delivered / picked_up       → 12 h     (post-delivery final check)
 *   unknown / null              → 60 min   (fallback)
 *
 * Hard cutoff: orders shipped > 30 days ago are excluded entirely.
 * Priority: out_for_delivery > issue > in_transit > label_created > rest.
 */
export async function selectTrackingRefreshCandidates(
  db: ReturnType<typeof createDb>,
): Promise<TrackingRefreshCandidate[]> {
  const cutoffDate = new Date(Date.now() - HARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: orders.id,
      externalId: orders.externalId,
      trackingNumber: orders.trackingNumber,
      trackingStatus: orders.trackingStatus,
      trackingStatusCode: orders.trackingStatusCode,
    })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        // Poll shipments for any active Allegro order regardless of allegroFulfillmentStatus —
        // merchant may add a waybill in Allegro without transitioning fulfillment to SENT.
        inArray(orders.status, ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'processing', 'paid', 'pending']),
        isNotNull(orders.externalId),
        // Only shippedAt/createdAt — never updatedAt (reconcile/admin bumps updatedAt on old
        // orders, causing stale November orders to appear eligible forever).
        sql`COALESCE(${orders.shippedAt}, ${orders.createdAt}) > ${cutoffDate}`,
        // Skip orders with terminal tracking states — carrier confirmed final outcome.
        // DELIVERED/PICKED_UP: package received by buyer.
        // RETURN*: package back at sender — terminal, will never change.
        sql`NOT (
          (
            ${orders.status} = 'delivered'
            AND (
              ${orders.trackingStatusCode} ILIKE '%DELIVERED%'
              OR ${orders.trackingStatusCode} ILIKE '%PICKED_UP%'
            )
          )
          OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
        )`,
        sql`(
          ${orders.trackingStatusUpdatedAt} IS NULL
          OR ${orders.trackingStatusUpdatedAt} < NOW() - (
            CASE
              WHEN ${orders.trackingStatusCode} ILIKE '%PICKED_UP%'
                OR ${orders.trackingStatusCode} ILIKE '%DELIVERED%'         THEN INTERVAL '12 hours'
              WHEN ${orders.trackingStatusCode} ILIKE '%OUT_FOR_DELIVERY%'
                OR ${orders.trackingStatusCode} ILIKE '%COURIER%'           THEN INTERVAL '5 minutes'
              WHEN ${orders.trackingStatusCode} ILIKE '%EXCEPTION%'
                OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
                OR ${orders.trackingStatusCode} ILIKE '%FAILED%'            THEN INTERVAL '20 minutes'
              WHEN ${orders.trackingStatusCode} ILIKE '%IN_TRANSIT%'
                OR ${orders.trackingStatusCode} ILIKE '%TRANSIT%'
                OR ${orders.trackingStatusCode} ILIKE '%SENT%'              THEN INTERVAL '30 minutes'
              WHEN ${orders.trackingStatusCode} ILIKE '%LABEL_CREATED%'
                OR ${orders.trackingStatusCode} ILIKE '%CREATED%'
                OR ${orders.trackingStatusCode} ILIKE '%REGISTERED%'        THEN INTERVAL '90 minutes'
              ELSE INTERVAL '60 minutes'
            END
          )
        )`,
      ),
    )
    .orderBy(
      sql`CASE
        WHEN ${orders.trackingStatusCode} ILIKE '%OUT_FOR_DELIVERY%'
          OR ${orders.trackingStatusCode} ILIKE '%COURIER%'             THEN 1
        WHEN ${orders.trackingStatusCode} ILIKE '%EXCEPTION%'
          OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
          OR ${orders.trackingStatusCode} ILIKE '%FAILED%'              THEN 2
        WHEN ${orders.trackingStatusCode} ILIKE '%IN_TRANSIT%'
          OR ${orders.trackingStatusCode} ILIKE '%TRANSIT%'
          OR ${orders.trackingStatusCode} ILIKE '%SENT%'                THEN 3
        WHEN ${orders.trackingStatusCode} ILIKE '%LABEL_CREATED%'
          OR ${orders.trackingStatusCode} ILIKE '%CREATED%'
          OR ${orders.trackingStatusCode} ILIKE '%REGISTERED%'          THEN 4
        ELSE 5
      END,
      ${orders.trackingStatusUpdatedAt} ASC NULLS FIRST`,
    )
    .limit(BATCH_SIZE)

  return rows.filter((r): r is TrackingRefreshCandidate => r.externalId !== null)
}

/**
 * Run one batch of tracking status refreshes.
 * Called from the cron handler via ctx.waitUntil — runs in background.
 *
 * Reuses the same KV lock as the manual /tracking/refresh endpoint,
 * so cron and user-triggered refreshes never race on the same order.
 */
export async function runTrackingStatusSync(env: Env): Promise<void> {
  console.log('[TrackingSync] Start runTrackingStatusSync')

  // KV guard: skip DB entirely when no active tracked orders exist.
  // This prevents waking Neon on every 5-min cron run during idle periods.
  const activeFlag = await env.ALLEGRO_KV.get(TRACKING_ACTIVE_KV_KEY)
  if (activeFlag === '0') {
    console.log('[TrackingSync] Skip — active flag is 0 (brak aktywnych przesyłek do odświeżenia)')
    return
  }

  const db = createDb(env.DATABASE_URL)

  let candidates: TrackingRefreshCandidate[]
  try {
    candidates = await selectTrackingRefreshCandidates(db)
  } catch (err) {
    console.error('[TrackingSync] Błąd pobierania kandydatów:', formatDbError(err))
    return
  }

  if (candidates.length === 0) {
    // No stale candidates right now — compute exactly when the soonest one will become stale
    // and use that as TTL so we don't oversleep (old 24h TTL caused multi-hour gaps after refresh).
    const idleTtl = await querySoonestNextDueTtlSeconds(db).catch(() => TRACKING_IDLE_TTL_SECONDS)
    await env.ALLEGRO_KV.put(TRACKING_ACTIVE_KV_KEY, '0', { expirationTtl: Math.max(60, idleTtl) }).catch(() => {})
    console.log(`[TrackingSync] Brak kandydatów — active flag=0, następny run za ${Math.round(idleTtl / 60)} min`)
    return
  }

  console.log(`[TrackingSync] Znaleziono kandydatów do odświeżenia: ${candidates.length}`)

  const token = await getActiveAllegroToken(env)
  if (!token) {
    console.warn('[TrackingSync] Brak tokenu Allegro — pomijam odświeżanie trackingu')
    return
  }

  let refreshed = 0
  let subrequestLimitHit = false
  const refreshTransitions: Array<{
    orderId: number
    checkoutFormId: string
    before: TrackingSnapshotState
    after: TrackingSnapshotState
    changed: boolean
  }> = []

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const slice = candidates.slice(i, i + CONCURRENCY)

    const results = await Promise.allSettled(
      slice.map(async (order) => {
        const lockKey = `allegro:tracking:refresh:order:${order.id}`
        const locked = await env.ALLEGRO_KV.get(lockKey)
        if (locked) return

        await env.ALLEGRO_KV.put(lockKey, String(Date.now()), { expirationTtl: 180 })
        try {
          const outcome = await refreshOrderTrackingSnapshot(db, env, order.id, order.externalId, {
            tokenOverride: token,
            previousSnapshot: {
              trackingNumber: order.trackingNumber,
              trackingStatus: order.trackingStatus,
              trackingStatusCode: order.trackingStatusCode,
            },
          })
          if (outcome) {
            refreshed++
            refreshTransitions.push({
              orderId: order.id,
              checkoutFormId: order.externalId,
              before: outcome.before,
              after: outcome.after,
              changed: outcome.changed,
            })
          }
        } finally {
          await env.ALLEGRO_KV.delete(lockKey).catch(() => {})
        }
      }),
    )

    let shouldStopBatch = false
    for (const result of results) {
      if (result.status === 'rejected') {
        const message = formatDbError(result.reason)
        if (message.toLowerCase().includes('too many subrequests')) {
          subrequestLimitHit = true
          shouldStopBatch = true
          continue
        }
        console.warn('[TrackingSync] Błąd odświeżania trackingu:', message)
      }
    }

    if (shouldStopBatch) break
  }

  if (subrequestLimitHit) {
    console.warn('[TrackingSync] Osiągnięto limit subrequestów — dokończę pozostałe zamówienia w kolejnym cyklu crona')
  }

  for (const transition of refreshTransitions) {
    const trackingNo = transition.after.trackingNumber ?? transition.before.trackingNumber ?? 'brak'
    const suffix = transition.changed ? '' : ' [bez zmian]'
    console.log(
      `[TrackingSync] Przesyłka #${transition.orderId} (${transition.checkoutFormId}, waybill: ${trackingNo}) ${displayStatusCode(transition.before.trackingStatusCode)} (${displayStatusText(transition.before.trackingStatus)}) -> ${displayStatusCode(transition.after.trackingStatusCode)} (${displayStatusText(transition.after.trackingStatus)})${suffix}`,
    )
  }

  if (refreshed === 0) {
    console.log(`[TrackingSync] Run zakończony bez odświeżeń (kandydaci: ${candidates.length})`)
  }

  if (refreshed > 0) {
    console.log(`[TrackingSync] Odświeżono tracking dla ${refreshed}/${candidates.length} zamówień`)
  }
}
