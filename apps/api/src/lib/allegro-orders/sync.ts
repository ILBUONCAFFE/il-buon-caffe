/**
 * Allegro Order Sync — Core sync function (cron-driven)
 *
 * Polls GET /order/events (ALL types) and handles each per docs/ALLEGRO_API_STRATEGY.md Dodatek C.
 *
 * Event routing (Dodatek C):
 *  BOUGHT              → create order (status: pending)           — waiting for payment
 *  FILLED_IN           → update delivery address                  — buyer filled address
 *  READY_FOR_PROCESSING→ mark paid + deduct stock                 — ★ main import
 *  BUYER_CANCELLED     → cancel order + restore stock if was paid
 *  AUTO_CANCELLED      → cancel order + restore stock if was paid
 *
 * Cursor strategy: KV primary, DB backup. Conditional writes only (§Dodatek D).
 */

import { createDb, createDbWsPool, setHttpMode } from '@repo/db/client'
import { allegroSyncLog, orders } from '@repo/db/schema'
import { getAllegroApiBase, type AllegroEnvironment } from '../allegro'
import type { Env } from '../../index'
import { CURSOR_KV_KEY, type AllegroOrderEvent } from './types'
import { readCursor, writeCursor, allegroHeaders, sleep } from './helpers'
import { processEvent } from './handlers'
import { resolveAccessToken } from './resolve-token'
import { AllegroInvalidGrantError } from '../allegro'
import { and, desc, eq, gte, inArray, isNotNull, isNull } from 'drizzle-orm'

const TRACKING_SYNC_LIMIT = 30
const TRACKING_SYNC_LOOKBACK_DAYS = 30
const TRACKING_SYNC_MIN_INTERVAL_MS = 60 * 60 * 1000
const TRACKING_SYNC_LAST_RUN_KV_KEY = 'allegro:tracking_sync:last_run_at'

type AllegroShipment = {
  carrierId?: string
  waybill?: string
  trackingNumber?: string
}

function pickWaybill(shipments: AllegroShipment[] | undefined): string | null {
  for (const shipment of shipments ?? []) {
    const value = (shipment.waybill ?? shipment.trackingNumber ?? '').trim()
    if (value) return value.slice(0, 100)
  }
  return null
}

async function syncMissingTrackingNumbers(
  db: ReturnType<typeof createDb>,
  apiBase: string,
  accessToken: string,
): Promise<number> {
  const lookbackDate = new Date(Date.now() - TRACKING_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

  const candidates = await db
    .select({ id: orders.id, externalId: orders.externalId })
    .from(orders)
    .where(and(
      eq(orders.source, 'allegro'),
      inArray(orders.status, ['shipped', 'delivered']),
      isNull(orders.trackingNumber),
      isNotNull(orders.externalId),
      gte(orders.createdAt, lookbackDate),
    ))
    .orderBy(desc(orders.updatedAt))
    .limit(TRACKING_SYNC_LIMIT)

  if (candidates.length === 0) return 0

  const headers = allegroHeaders(accessToken)
  let updated = 0

  for (const order of candidates) {
    if (!order.externalId) continue

    const shipResp = await fetch(`${apiBase}/order/checkout-forms/${order.externalId}/shipments`, {
      signal: AbortSignal.timeout(10_000),
      headers,
    })

    if (!shipResp.ok) {
      if (shipResp.status === 401) break
      continue
    }

    const payload = await shipResp.json() as { shipments?: AllegroShipment[] }
    const waybill = pickWaybill(payload.shipments)
    if (!waybill) continue

    await db.update(orders)
      .set({ trackingNumber: waybill, updatedAt: new Date() })
      .where(eq(orders.id, order.id))

    updated++
    await sleep(80)
  }

  return updated
}

async function shouldRunTrackingBackfill(kv: KVNamespace): Promise<boolean> {
  try {
    const lastRun = await kv.get(TRACKING_SYNC_LAST_RUN_KV_KEY)
    if (!lastRun) return true
    const lastRunAt = Number(lastRun)
    if (!Number.isFinite(lastRunAt)) return true
    return Date.now() - lastRunAt >= TRACKING_SYNC_MIN_INTERVAL_MS
  } catch {
    // If KV read fails, we prefer keeping sync resilient.
    return true
  }
}

export async function syncAllegroOrders(env: Env): Promise<void> {
  const kv = env.ALLEGRO_KV
  if (!kv) {
    console.log('[AllegroOrders] Brak ALLEGRO_KV — pomijam')
    return
  }

  // ── Resolve access token: KV first, then DB fallback ─────────────────
  // For token resolution we may need a quick DB read — use HTTP driver (1 subrequest)
  let accessToken: string | null
  try {
    const connStr = env.DATABASE_URL
    setHttpMode(true, connStr)
    const httpDb = createDb(connStr)
    accessToken = await resolveAccessToken(kv, httpDb, env)
  } catch (err) {
    if (err instanceof AllegroInvalidGrantError) {
      console.warn('[AllegroOrders] Refresh token unieważniony — pomijam sync (wymagane ponowne połączenie)')
    } else {
      console.error('[AllegroOrders] Błąd odświeżania wygasłego tokenu:', err instanceof Error ? err.message : err)
    }
    return
  }

  if (!accessToken) {
    console.warn('[AllegroOrders] Brak połączenia z Allegro (brak credentials w DB) — pomijam sync')
    return
  }

  // Log token restoration if it came from DB (was not in KV initially)
  // Note: resolveAccessToken handles KV write-back internally

  const allegroEnv = (env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
  const apiBase    = getAllegroApiBase(allegroEnv)
  const cursor     = await readCursor(kv)

  // ── If no cursor: skip full sync, start from current latest event ──
  if (!cursor) {
    try {
      const resp = await fetch(`${apiBase}/order/event-stats`, {
        signal:  AbortSignal.timeout(10_000),
        headers: allegroHeaders(accessToken),
      })
      if (resp.ok) {
        const data = await resp.json() as { latestEvent?: { id: string } }
        const latestId = data.latestEvent?.id
        if (latestId) {
          // Write cursor to KV only — skip DB write for initial cursor (saves CU)
          await kv.put(CURSOR_KV_KEY, latestId)
          console.log(`[AllegroOrders] Brak kursora — ustawiono na najnowszy event ${latestId}, sync od teraz`)
        }
      }
    } catch { /* non-critical */ }
    return
  }

  // ── Fetch first event page BEFORE opening DB connection ──────────────
  // This avoids waking up Neon on idle runs (0 events = no DB needed).
  // Subrequest budget: CF Workers limit 1000. Each fetch() counts.
  // WebSocket DB queries do NOT count (single connection).
  // Budget: ~10 for setup → ~990 for checkout-form fetches. Cap at 200 for safety.
  const MAX_CHECKOUT_FETCHES = 200
  const PAGE_SIZE = 1000
  const MAX_PAGES = 5

  let nextFrom: string | null = cursor
  let totalProcessed = 0
  let fetchesDone = 0
  let pagesProcessed = 0

  // Lazy WS pool — only opened when we actually have events to process
  let _pool: ReturnType<typeof createDbWsPool> | null = null
  function getPool() {
    if (!_pool) _pool = createDbWsPool(env.DATABASE_URL)
    return _pool.db
  }

  try {

  while (nextFrom !== null && pagesProcessed < MAX_PAGES && fetchesDone < MAX_CHECKOUT_FETCHES) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
    params.set('from', nextFrom)

    let eventsJson: { events: AllegroOrderEvent[] }
    try {
      const resp = await fetch(`${apiBase}/order/events?${params}`, {
        signal:  AbortSignal.timeout(10_000),
        headers: allegroHeaders(accessToken),
      })
      if (resp.status === 401) {
        console.warn('[AllegroOrders] Token wygasł (401) — cron odświeży za chwilę')
        return
      }
      if (!resp.ok) {
        console.error(`[AllegroOrders] GET /order/events → ${resp.status}`)
        return
      }
      eventsJson = await resp.json() as { events: AllegroOrderEvent[] }
    } catch (err) {
      console.error('[AllegroOrders] Network error:', err instanceof Error ? err.message : String(err))
      return
    }

    const allEvents = eventsJson.events ?? []

    // ★ No events at all — we're caught up. No DB connection needed.
    if (allEvents.length === 0) break

    const events = allEvents // process ALL event types (reconcileOrder handles unknowns)

    // ── Deduplicate: group events by checkoutFormId, keep only the highest-priority event ──
    // Multiple events for the same order (BOUGHT → FILLED_IN → READY_FOR_PROCESSING) produce
    // redundant fetchCheckoutForm calls. We only need to process the latest/most-important one.
    const EVENT_PRIORITY: Record<string, number> = {
      'BUYER_CANCELLED':      5,
      'AUTO_CANCELLED':       5,
      'READY_FOR_PROCESSING': 4,
      'FILLED_IN':            2,
      'BOUGHT':               1,
    }

    const bestEventPerOrder = new Map<string, AllegroOrderEvent>()

    for (const event of events) {
      const formId = event.order.checkoutForm.id
      const existing = bestEventPerOrder.get(formId)
      const priority = EVENT_PRIORITY[event.type] ?? 0
      const existingPriority = existing ? (EVENT_PRIORITY[existing.type] ?? 0) : -1

      if (priority > existingPriority) {
        bestEventPerOrder.set(formId, event)
      }
    }

    const dedupedEvents = Array.from(bestEventPerOrder.values())

    console.log(`[AllegroOrders] Strona ${pagesProcessed + 1}: ${events.length} eventów → ${dedupedEvents.length} unikalnych zamówień (z ${allEvents.length} total)`)

    let lastCursor: string = nextFrom
    const db = getPool() // ← DB connection opened HERE, only when events exist

    for (const event of dedupedEvents) {
      if (fetchesDone >= MAX_CHECKOUT_FETCHES) {
        console.log(`[AllegroOrders] Osiągnięto limit ${MAX_CHECKOUT_FETCHES} fetch'y — kontynuacja w następnym cron run`)
        break
      }

      try {
        const ok = await processEvent(db, apiBase, accessToken, event, kv)
        if (ok) lastCursor = event.id
        totalProcessed++
        fetchesDone++
      } catch (err) {
        console.error(`[AllegroOrders] Błąd przy ${event.type}/${event.order.checkoutForm.id}:`, err instanceof Error ? err.message : err)
        await db.insert(allegroSyncLog).values({
          offerId:      event.order.checkoutForm.id,
          action:       'order_sync',
          status:       'error',
          errorMessage: err instanceof Error ? err.message : String(err),
          errorCode:    event.type,
        }).catch(() => {})
        fetchesDone++ // count failed fetches too — they still consumed a subrequest
      }
    }

    // Always advance cursor to end of page (even non-handled events advance the stream)
    const pageLastId = allEvents[allEvents.length - 1]?.id
    if (pageLastId) lastCursor = pageLastId

    // Persist cursor — KV always, DB only when events were processed (saves CU on idle runs)
    if (lastCursor && lastCursor !== nextFrom) {
      if (totalProcessed > 0) {
        await writeCursor(kv, db, lastCursor)
      } else {
        await kv.put(CURSOR_KV_KEY, lastCursor)
      }
    }

    // Continue paging only if page was full
    if (allEvents.length < PAGE_SIZE) break

    nextFrom = lastCursor
    pagesProcessed++
    await sleep(100) // Rate-limit friendly delay between pages
  }

  // Keep order list fresh: fill tracking numbers for recently shipped Allegro orders.
  // Runs only when DB pool was already opened by event processing.
  if (_pool && await shouldRunTrackingBackfill(kv)) {
    const updatedTracking = await syncMissingTrackingNumbers(getPool(), apiBase, accessToken)
    await kv.put(TRACKING_SYNC_LAST_RUN_KV_KEY, String(Date.now())).catch(() => {})
    if (updatedTracking > 0) {
      console.log(`[AllegroOrders] Uzupełniono tracking dla ${updatedTracking} zamówień`)
    }
  }

  if (totalProcessed > 0) {
    console.log(`[AllegroOrders] Sync zakończony — ${totalProcessed} eventów przetworzonych, ${fetchesDone} fetch'y Allegro API`)
  }

  } finally {
    // Close WS pool only if it was opened
    const poolForClose = _pool as { end: () => Promise<void> } | null
    if (poolForClose) await poolForClose.end()
  }
}
