import { createDbWithPool } from '@repo/db/client'
import { orders, orderStatusHistory } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import type { ShipmentState, PollResult, PollFailure, AllegroShipmentRecord } from './types'
import type { DueOrder } from './queue'
import {
  deriveWorstState,
  computeNextCheckAt,
  computeBackoffNextCheckAt,
  checkLifetimeExceeded,
  MAX_BACKOFF_ATTEMPTS,
} from './state-machine'
import { KV_KEYS } from '../allegro'
import { decryptText } from '../crypto'

type ShipmentDb = ReturnType<typeof createDbWithPool>['db']

const ALLEGRO_API = {
  sandbox:    'https://api.allegro.pl.allegrosandbox.pl',
  production: 'https://api.allegro.pl',
} as const

const INPOST_TRACKING_API = 'https://api-shipx-pl.easypack24.net/v1/trackings'

interface PollerEnv {
  ALLEGRO_KV: KVNamespace
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string
}

// Raw shape returned by GET /order/checkout-forms/{id}/shipments
interface AllegroApiShipment {
  id: string
  waybill?: string
  carrierId?: string
  createdAt?: string
  lineItems?: unknown[]
}

async function getAccessToken(env: PollerEnv): Promise<string | null> {
  const rawToken = await env.ALLEGRO_KV.get(KV_KEYS.ACCESS_TOKEN)
  if (!rawToken) return null

  const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
  if (!encKey) {
    console.error('[Shipments] ALLEGRO_TOKEN_ENCRYPTION_KEY is missing — cannot decrypt access token')
    return null
  }

  try {
    return await decryptText(rawToken, encKey)
  } catch (err) {
    console.warn('[Shipments] Failed to decrypt access token from KV — clearing stale token', err instanceof Error ? err.message : String(err))
    await env.ALLEGRO_KV.delete(KV_KEYS.ACCESS_TOKEN).catch(() => {})
    return null
  }
}

/**
 * Fetch carrier tracking status from InPost ShipX public API (no auth needed).
 * Returns the latest status string (e.g. "picked_up_by_recipient") or undefined on failure.
 */
async function fetchInPostStatus(waybill: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${INPOST_TRACKING_API}/${waybill}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      console.warn(`[Shipments] InPost tracking HTTP ${res.status} for waybill ${waybill}`)
      return undefined
    }
    // InPost ShipX v1 response: { tracking_number, status, parcels: [{ status, events }] }
    const data = await res.json<{
      status?: string
      parcels?: Array<{ status?: string }>
    }>()
    return data?.status ?? data?.parcels?.[0]?.status ?? undefined
  } catch (err) {
    console.warn(`[Shipments] InPost tracking failed for waybill ${waybill}:`, err instanceof Error ? err.message : String(err))
    return undefined
  }
}

/**
 * Fetch current fulfillment.status from Allegro checkout form.
 * Used as fallback when carrier-level tracking is unavailable.
 */
async function fetchAllegroFulfillmentStatus(
  base: string,
  token: string,
  checkoutFormId: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(`${base}/order/checkout-forms/${checkoutFormId}`, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.allegro.public.v1+json',
      },
    })
    if (!res.ok) return undefined
    const form = await res.json<{ fulfillment?: { status?: string } }>()
    return form?.fulfillment?.status ?? undefined
  } catch {
    return undefined
  }
}

export async function pollAllegroShipment(
  checkoutFormId: string,
  env: PollerEnv,
): Promise<
  | { ok: true; shipments: AllegroShipmentRecord[] }
  | { ok: false; failure: PollFailure }
> {
  const token = await getAccessToken(env)
  if (!token) return { ok: false, failure: { kind: 'auth', message: 'no_usable_token_in_kv' } }

  const base = ALLEGRO_API[env.ALLEGRO_ENVIRONMENT] ?? ALLEGRO_API.production

  // Step 1: Fetch Allegro shipments list — gives us waybill + carrierId.
  // Note: this endpoint does NOT include tracking status, only dispatch metadata.
  const url = `${base}/order/checkout-forms/${checkoutFormId}/shipments`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.allegro.public.v1+json',
    },
  })

  if (res.status === 401) {
    await env.ALLEGRO_KV.delete(KV_KEYS.ACCESS_TOKEN)
    console.warn(`[Shipments] Allegro rejected access token for checkoutFormId=${checkoutFormId} (401)`)
    return { ok: false, failure: { kind: 'auth', message: 'token_rejected' } }
  }
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10)
    return { ok: false, failure: { kind: 'rate_limit', retryAfterSec: retryAfter, message: '429' } }
  }
  if (!res.ok) {
    return { ok: false, failure: { kind: 'http', message: `HTTP ${res.status}` } }
  }

  let allegroShipments: AllegroApiShipment[]
  try {
    const body = await res.json<{ shipments?: AllegroApiShipment[] }>()
    allegroShipments = Array.isArray(body?.shipments) ? body.shipments : []
  } catch (e) {
    return { ok: false, failure: { kind: 'parse', message: String(e) } }
  }

  // Step 2: No Allegro shipments yet — fall back to fulfillment.status from checkout form
  if (allegroShipments.length === 0) {
    const status = await fetchAllegroFulfillmentStatus(base, token, checkoutFormId)
    return { ok: true, shipments: [{ id: checkoutFormId, status }] }
  }

  // Step 3: Resolve tracking status for each shipment.
  // Priority: carrier API (InPost) > Allegro fulfillment.status
  // Fetch fulfillment.status once (shared fallback for all shipments in this order).
  let fulfillmentStatus: string | undefined
  const shipments: AllegroShipmentRecord[] = []

  for (const s of allegroShipments) {
    const carrierId = s.carrierId?.toUpperCase()
    let status: string | undefined

    if (carrierId === 'INPOST' && s.waybill) {
      status = await fetchInPostStatus(s.waybill)
    }

    // Fall back to Allegro fulfillment.status for non-InPost carriers or when InPost fails
    if (!status) {
      if (fulfillmentStatus === undefined) {
        fulfillmentStatus = await fetchAllegroFulfillmentStatus(base, token, checkoutFormId)
      }
      status = fulfillmentStatus
    }

    shipments.push({ id: s.id, waybillNumber: s.waybill, carrierId: s.carrierId, status })
  }

  return { ok: true, shipments }
}

/**
 * Apply a successful poll result to DB.
 * Updates shipment_state, snapshot, timestamps, resets attempts, logs state change.
 */
export async function applyPollResult(
  db: ShipmentDb,
  order: DueOrder,
  shipments: AllegroShipmentRecord[],
  now: Date = new Date(),
): Promise<PollResult> {
  const previousState = order.shipmentState as ShipmentState
  let newState = deriveWorstState(shipments, previousState)

  // No-regression: carrier APIs can return stale data (e.g. PROCESSING after in_transit).
  // Never move to a lower-rank state unless it is an exception/stale escalation.
  const STATE_RANK_INLINE: Record<ShipmentState, number> = {
    exception: 0, awaiting_handover: 1, label_created: 2,
    in_transit: 3, out_for_delivery: 4, delivered: 5, stale: 6,
  }
  if (
    STATE_RANK_INLINE[newState] < STATE_RANK_INLINE[previousState] &&
    newState !== 'exception' && newState !== 'stale'
  ) {
    newState = previousState
  }

  // Lifetime escalation: only when state is UNCHANGED (order stuck in same state).
  // If Allegro returned a different state, the clock resets — don't use the old timestamp.
  if (newState === previousState && order.shipmentStateChangedAt) {
    const escalated = checkLifetimeExceeded(newState, order.shipmentStateChangedAt, now)
    if (escalated) newState = escalated
  }

  const stateChanged = newState !== previousState
  const nextCheckAt  = computeNextCheckAt(newState, now)

  await db.update(orders).set({
    shipmentState:            newState,
    shipmentLastCheckedAt:    now,
    shipmentNextCheckAt:      nextCheckAt,
    shipmentCheckAttempts:    0,
    shipmentStateChangedAt:   stateChanged ? now : order.shipmentStateChangedAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allegroShipmentsSnapshot: shipments as any, // Drizzle jsonb requires cast
    updatedAt:                now,
  }).where(eq(orders.id, order.id))

  if (stateChanged) {
    await db.insert(orderStatusHistory).values({
      orderId:       order.id,
      category:      'tracking',
      previousValue: previousState ?? null,
      newValue:      newState,
      source:        'allegro_sync',
      occurredAt:    now,
    })
  }

  return { orderId: order.id, previousState, newState, stateChanged, snapshot: shipments }
}

/**
 * Apply backoff after a failure.
 */
export async function applyBackoff(
  db: ShipmentDb,
  order: DueOrder,
  failure: PollFailure,
  now: Date = new Date(),
): Promise<void> {
  const attempts = order.shipmentCheckAttempts + 1

  if (attempts >= MAX_BACKOFF_ATTEMPTS) {
    await db.update(orders).set({
      shipmentState:          'exception',
      shipmentStateChangedAt: now,
      shipmentLastCheckedAt:  now,
      shipmentNextCheckAt:    computeNextCheckAt('exception', now),
      shipmentCheckAttempts:  0,
      updatedAt:              now,
    }).where(eq(orders.id, order.id))

    await db.insert(orderStatusHistory).values({
      orderId:       order.id,
      category:      'tracking',
      previousValue: order.shipmentState,
      newValue:      'exception',
      source:        'allegro_sync',
      occurredAt:    now,
    })
    return
  }

  await db.update(orders).set({
    shipmentCheckAttempts: attempts,
    shipmentLastCheckedAt: now,
    shipmentNextCheckAt:   computeBackoffNextCheckAt(attempts, now),
    updatedAt:             now,
  }).where(eq(orders.id, order.id))
}
