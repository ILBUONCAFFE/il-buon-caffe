/**
 * Allegro Tracking Refresh — shared logic for cron and API endpoint
 */

import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { getActiveAllegroToken, type ActiveAllegroToken } from '../allegro-tokens'
import { allegroHeaders } from './helpers'
import type { Env } from '../../index'
import { TrackingQueueManager } from './tracking-queue'

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
): Omit<ShipmentTrackingSnapshot, 'waybill' | 'carrierId'> {
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

export interface QueueBootstrapRow {
  id: number
  externalId: string
  trackingStatusCode: string | null
  trackingStatusUpdatedAt: Date | null
}

/**
 * Pobiera wszystkie zamówienia kwalifikujące się do trackingu z DB.
 * Używana TYLKO do bootstrapu/rebuildu kolejki KV — nie jest wywoływana na każdym runie crona.
 *
 * Różni się od starego selectTrackingRefreshCandidates:
 *   - brak filtru cooldown (trackingStatusUpdatedAt < NOW() - INTERVAL)
 *   - brak LIMIT (pobieramy wszystkie)
 *   - brak ORDER BY priorytetu (kolejka KV sama sortuje)
 *   - dodaje trackingStatusUpdatedAt do SELECT (do obliczenia początkowego nextCheckAt)
 */
export async function buildQueueFromDb(
  db: ReturnType<typeof createDb>,
): Promise<QueueBootstrapRow[]> {
  const cutoffDate = new Date(Date.now() - HARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: orders.id,
      externalId: orders.externalId,
      trackingStatusCode: orders.trackingStatusCode,
      trackingStatusUpdatedAt: orders.trackingStatusUpdatedAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        or(
          inArray(orders.status, ['shipped', 'delivered']),
          and(
            inArray(orders.status, ['processing', 'paid', 'pending']),
            or(
              inArray(orders.allegroFulfillmentStatus, ['SENT', 'PICKED_UP']),
              and(
                isNotNull(orders.trackingNumber),
                sql`${orders.allegroFulfillmentStatus} IN ('NEW', 'PROCESSING') OR ${orders.allegroFulfillmentStatus} IS NULL`,
              ),
            ),
          ),
        ),
        isNotNull(orders.externalId),
        sql`COALESCE(${orders.shippedAt}, ${orders.createdAt}) > ${cutoffDate}`,
        sql`NOT (
          ${orders.status} = 'delivered'
          AND (
            ${orders.trackingStatusCode} ILIKE '%DELIVERED%'
            OR ${orders.trackingStatusCode} ILIKE '%PICKED_UP%'
          )
        )`,
      ),
    )
    .orderBy(orders.id)

  return rows.filter((r): r is QueueBootstrapRow => r.externalId !== null)
}

/**
 * Run one batch of tracking status refreshes.
 * Called from the cron handler via ctx.waitUntil — runs in background.
 *
 * Scheduling is now KV-driven (TrackingQueueManager), not DB-polled.
 * After every check (regardless of status change), reschedule() resets nextCheckAt —
 * this eliminates the root bug where unchanged-status orders looped forever.
 */
export async function runTrackingStatusSync(env: Env): Promise<void> {
  console.log('[TrackingSync] Start runTrackingStatusSync')

  // Wczytaj kolejkę KV (drainuje pending entries, aplikuje tombstones)
  let queue: TrackingQueueManager
  try {
    queue = await TrackingQueueManager.load(env.ALLEGRO_KV)
  } catch (err) {
    console.error('[TrackingSync] Błąd wczytywania kolejki KV:', formatDbError(err))
    return
  }

  // Bootstrap: przebuduj z DB jeśli pierwszy run lub >25h od ostatniego rebuildu
  if (queue.needsRebuild) {
    console.log('[TrackingSync] Przebuduję kolejkę z DB...')
    try {
      const dbForRebuild = createDb(env.DATABASE_URL)
      const rows = await buildQueueFromDb(dbForRebuild)
      for (const row of rows) {
        queue.enqueue(
          row.id,
          row.externalId,
          row.trackingStatusCode,
          row.trackingStatusUpdatedAt?.getTime(), // uszanuj istniejący cooldown przy rebuildu
        )
      }
      queue.markRebuilt()
      console.log(`[TrackingSync] Kolejka przebudowana: ${rows.length} zamówień`)
    } catch (err) {
      console.error('[TrackingSync] Błąd rebuildu kolejki z DB:', formatDbError(err))
      // Kontynuuj z tym co jest w kolejce — nie przerywaj całkowicie
    }
  }

  // Przytnij stale entries (starsze niż HARD_CUTOFF_DAYS + 2 dni buforu)
  queue.pruneStale(HARD_CUTOFF_DAYS + 2)

  const due = queue.getDue(BATCH_SIZE)

  if (due.length === 0) {
    console.log(`[TrackingSync] Brak kandydatów do odświeżenia (${queue.summary()})`)
    await queue.save(env.ALLEGRO_KV).catch((err) => {
      console.error('[TrackingSync] Błąd zapisu kolejki (empty run):', formatDbError(err))
    })
    return
  }

  console.log(`[TrackingSync] Due: ${due.length} z kolejki (${queue.summary()})`)

  const token = await getActiveAllegroToken(env)
  if (!token) {
    console.warn('[TrackingSync] Brak tokenu Allegro — pomijam odświeżanie trackingu')
    await queue.save(env.ALLEGRO_KV).catch(() => {})
    return
  }

  const db = createDb(env.DATABASE_URL)
  let refreshed = 0
  let subrequestLimitHit = false

  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const slice = due.slice(i, i + CONCURRENCY)

    const results = await Promise.allSettled(
      slice.map(async (entry) => {
        const outcome = await refreshOrderTrackingSnapshot(db, env, entry.id, entry.eid, {
          tokenOverride: token,
          previousSnapshot: {
            trackingNumber: null,
            trackingStatus: null,
            trackingStatusCode: entry.s,
          },
        })

        if (!outcome) {
          // Błąd API (np. HTTP 5xx od kuriera) — zachowaj status, normalny cooldown
          queue.reschedule(entry.id, entry.s)
          return
        }

        const newCode = outcome.after.trackingStatusCode
        const isDelivered = shouldAutoMarkDelivered(newCode)

        if (isDelivered) {
          queue.remove(entry.id)
        } else {
          // SERCE FIXA: reschedule zawsze, niezależnie od zmiany statusu
          queue.reschedule(entry.id, newCode)
        }

        refreshed++

        const waybill = outcome.after.trackingNumber ?? outcome.before.trackingNumber ?? entry.eid
        const suffix = outcome.changed ? '' : ' [bez zmian]'
        const deliveredSuffix = isDelivered ? ' → usunięto z kolejki' : ''
        console.log(
          `[TrackingSync] #${entry.id} (${waybill}) ${displayStatusCode(outcome.before.trackingStatusCode)} → ${displayStatusCode(newCode)}${suffix}${deliveredSuffix}`,
        )
      }),
    )

    let shouldStop = false
    for (const result of results) {
      if (result.status === 'rejected') {
        const message = formatDbError(result.reason)
        if (message.toLowerCase().includes('too many subrequests')) {
          subrequestLimitHit = true
          shouldStop = true
          continue
        }
        console.warn('[TrackingSync] Błąd odświeżania trackingu:', message)
      }
    }

    if (shouldStop) break
  }

  if (subrequestLimitHit) {
    console.warn('[TrackingSync] Osiągnięto limit subrequestów — dokończę pozostałe w kolejnym cyklu crona')
  }

  console.log(`[TrackingSync] Zakończono: odświeżono ${refreshed}/${due.length}, kolejka: ${queue.summary()}`)

  await queue.save(env.ALLEGRO_KV).catch((err) => {
    console.error('[TrackingSync] Błąd zapisu kolejki do KV:', formatDbError(err))
  })
}
