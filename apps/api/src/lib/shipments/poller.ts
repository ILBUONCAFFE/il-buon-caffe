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

interface PollerEnv {
  ALLEGRO_KV: KVNamespace
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string
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

  try {
    const body = await res.json<{ shipments?: AllegroShipmentRecord[] }>()
    const list = Array.isArray(body?.shipments) ? body.shipments : []
    return { ok: true, shipments: list }
  } catch (e) {
    return { ok: false, failure: { kind: 'parse', message: String(e) } }
  }
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

  // Lifetime escalation
  if (order.shipmentStateChangedAt) {
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
