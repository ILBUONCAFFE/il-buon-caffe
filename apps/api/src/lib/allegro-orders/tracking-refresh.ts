/**
 * Allegro Tracking Refresh — shared logic for cron and API endpoint
 */

import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { getActiveAllegroToken } from '../allegro-tokens'
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
): Promise<void> {
  const token = await getActiveAllegroToken(env)
  if (!token) return

  const headers = {
    ...allegroHeaders(token.accessToken),
    'Accept-Language': 'pl-PL',
  }

  const shipResp = await fetch(`${token.apiBase}/order/checkout-forms/${checkoutFormId}/shipments`, {
    signal: AbortSignal.timeout(10_000),
    headers,
  })

  if (!shipResp.ok) return

  const shipData = await shipResp.json() as {
    shipments?: Array<{ carrierId?: string; waybill?: string; trackingNumber?: string }>
  }

  const firstShipment = shipData.shipments?.[0]
  const carrierId = firstShipment?.carrierId?.trim() ?? ''
  const waybill = (firstShipment?.waybill ?? firstShipment?.trackingNumber ?? '').trim().slice(0, 100) || null
  if (!waybill) return

  const now = new Date()

  if (!carrierId) {
    await db.update(orders)
      .set({
        trackingNumber: waybill,
        trackingStatus: 'Etykieta wygenerowana',
        trackingStatusCode: 'LABEL_CREATED',
        trackingStatusUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(orders.id, orderId),
        sql`(
          ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
          OR ${orders.trackingStatus} IS DISTINCT FROM ${'Etykieta wygenerowana'}
          OR ${orders.trackingStatusCode} IS DISTINCT FROM ${'LABEL_CREATED'}
          OR ${orders.trackingStatusUpdatedAt} IS NULL
        )`,
      ))
    return
  }

  const trackResp = await fetch(
    `${token.apiBase}/order/carriers/${encodeURIComponent(carrierId)}/tracking?waybill=${encodeURIComponent(waybill)}`,
    { signal: AbortSignal.timeout(10_000), headers },
  )

  if (!trackResp.ok) {
    await db.update(orders)
      .set({
        trackingNumber: waybill,
        trackingStatusCode: 'LABEL_CREATED',
        trackingStatusUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(orders.id, orderId),
        sql`(
          ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
          OR ${orders.trackingStatusCode} IS DISTINCT FROM ${'LABEL_CREATED'}
          OR ${orders.trackingStatusUpdatedAt} IS NULL
        )`,
      ))
    return
  }

  const trackData = await trackResp.json() as Record<string, unknown>

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
    trackingDetails != null &&
    typeof trackingDetails === 'object' &&
    Array.isArray((trackingDetails as { statuses?: unknown[] }).statuses)
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

  await db.update(orders)
    .set({
      trackingNumber: waybill,
      trackingStatus: latestDescription,
      trackingStatusCode: latestCode,
      trackingStatusUpdatedAt: now,
      trackingLastEventAt: latestOccurredAt,
      updatedAt: now,
    })
    .where(and(
      eq(orders.id, orderId),
      sql`(
        ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
        OR ${orders.trackingStatus} IS DISTINCT FROM ${latestDescription}
        OR ${orders.trackingStatusCode} IS DISTINCT FROM ${latestCode}
        OR ${orders.trackingLastEventAt} IS DISTINCT FROM ${latestOccurredAt}
        OR ${orders.trackingStatusUpdatedAt} IS NULL
      )`,
    ))
}

// ── Cron batch refresh ────────────────────────────────────────────────────

const BATCH_SIZE = 15
const CONCURRENCY = 3
const HARD_CUTOFF_DAYS = 30
const TRACKING_SCHEMA_CACHE_TTL_MS = 10 * 60 * 1000
const TRACKING_REQUIRED_COLUMNS = [
  'allegro_shipment_id',
  'tracking_status_code',
  'tracking_status_updated_at',
  'tracking_last_event_at',
] as const

let trackingSchemaCheckedAt = 0
let trackingSchemaReady: boolean | null = null

async function hasTrackingSchema(db: ReturnType<typeof createDb>): Promise<boolean> {
  const now = Date.now()
  if (trackingSchemaReady !== null && now - trackingSchemaCheckedAt < TRACKING_SCHEMA_CACHE_TTL_MS) {
    return trackingSchemaReady
  }

  try {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name IN ('allegro_shipment_id', 'tracking_status_code', 'tracking_status_updated_at', 'tracking_last_event_at')
    `)

    const rows = (result as { rows?: unknown[] }).rows ?? []
    const found = new Set(
      rows
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const value = (row as { column_name?: unknown }).column_name
          return typeof value === 'string' ? value : null
        })
        .filter((x): x is string => x !== null),
    )

    const missing = TRACKING_REQUIRED_COLUMNS.filter((column) => !found.has(column))
    trackingSchemaReady = missing.length === 0

    if (!trackingSchemaReady) {
      console.error(`[TrackingSync] Brak wymaganych kolumn w tabeli orders: ${missing.join(', ')}. Uruchom migracje Drizzle.`)
    }
  } catch (err) {
    // Do not block sync permanently if metadata query fails transiently.
    trackingSchemaReady = true
    console.warn('[TrackingSync] Nie udało się zweryfikować schematu orders:', formatDbError(err))
  } finally {
    trackingSchemaCheckedAt = now
  }

  return trackingSchemaReady ?? true
}

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
): Promise<Array<{ id: number; externalId: string }>> {
  const cutoffDate = new Date(Date.now() - HARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({ id: orders.id, externalId: orders.externalId })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.allegroShipmentId),
        inArray(orders.status, ['shipped', 'delivered']),
        isNotNull(orders.externalId),
        sql`COALESCE(${orders.shippedAt}, ${orders.createdAt}) > ${cutoffDate}`,
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

  return rows.filter((r): r is { id: number; externalId: string } => r.externalId !== null)
}

/**
 * Run one batch of tracking status refreshes.
 * Called from the cron handler via ctx.waitUntil — runs in background.
 *
 * Reuses the same KV lock as the manual /tracking/refresh endpoint,
 * so cron and user-triggered refreshes never race on the same order.
 */
export async function runTrackingStatusSync(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL)

  if (!(await hasTrackingSchema(db))) {
    return
  }

  let candidates: Array<{ id: number; externalId: string }>
  try {
    candidates = await selectTrackingRefreshCandidates(db)
  } catch (err) {
    console.error('[TrackingSync] Błąd pobierania kandydatów:', formatDbError(err))
    return
  }

  if (candidates.length === 0) return

  const token = await getActiveAllegroToken(env)
  if (!token) {
    console.warn('[TrackingSync] Brak tokenu Allegro — pomijam odświeżanie trackingu')
    return
  }

  let refreshed = 0

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const slice = candidates.slice(i, i + CONCURRENCY)

    const results = await Promise.allSettled(
      slice.map(async (order) => {
        const lockKey = `allegro:tracking:refresh:order:${order.id}`
        const locked = await env.ALLEGRO_KV.get(lockKey)
        if (locked) return

        await env.ALLEGRO_KV.put(lockKey, String(Date.now()), { expirationTtl: 180 })
        try {
          await refreshOrderTrackingSnapshot(db, env, order.id, order.externalId)
          refreshed++
        } finally {
          await env.ALLEGRO_KV.delete(lockKey).catch(() => {})
        }
      }),
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('[TrackingSync] Błąd odświeżania trackingu:', formatDbError(result.reason))
      }
    }
  }

  if (refreshed > 0) {
    console.log(`[TrackingSync] Odświeżono tracking dla ${refreshed}/${candidates.length} zamówień`)
  }
}
