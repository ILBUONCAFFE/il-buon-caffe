import type { ShipmentState, AllegroShipmentRecord, CadenceRule } from './types'

// ── Allegro carrier code → internal state ────────────────────────────────
const ALLEGRO_STATUS_MAP: Record<string, ShipmentState> = {
  // Final
  DELIVERED: 'delivered',
  PICKED_UP: 'delivered',
  // Last mile
  OUT_FOR_DELIVERY: 'out_for_delivery',
  READY_FOR_PICKUP: 'out_for_delivery',
  AT_DELIVERY_POINT: 'out_for_delivery',
  // In transit
  IN_TRANSIT: 'in_transit',
  SORTING: 'in_transit',
  HANDED_TO_CARRIER: 'in_transit',
  IN_DELIVERY: 'in_transit',
  SENT: 'in_transit',
  // Label only
  LABEL_CREATED: 'label_created',
  AWAITING_PICKUP: 'label_created',
  NEW: 'label_created',
  // Problems
  RETURNED: 'exception',
  DELIVERY_FAILED: 'exception',
  LOST: 'exception',
  ADDRESSEE_ABSENT: 'exception',
  CANCELLED: 'exception',
}

// Worst → best ordering for multi-parcel reduction
const STATE_RANK: Record<ShipmentState, number> = {
  exception: 0,
  awaiting_handover: 1,
  label_created: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
  stale: 6,
}

export function mapAllegroStatus(raw: string | undefined | null): ShipmentState | null {
  if (!raw) return null
  const key = raw.toUpperCase().trim()
  return ALLEGRO_STATUS_MAP[key] ?? null
}

/**
 * Derive overall shipment state from all parcels.
 * Rule: worst-of-all. Unknown parcel codes are treated as `in_transit`
 * (safe fallback — don't regress to earlier states, don't advance to delivered).
 */
export function deriveWorstState(
  shipments: AllegroShipmentRecord[],
  fallbackWhenEmpty: ShipmentState = 'awaiting_handover',
): ShipmentState {
  if (!shipments || shipments.length === 0) return fallbackWhenEmpty

  let worst: ShipmentState = 'delivered'
  for (const s of shipments) {
    const mapped = mapAllegroStatus(s.status) ?? 'in_transit'
    if (STATE_RANK[mapped] < STATE_RANK[worst]) worst = mapped
  }
  return worst
}

// ── Cadence rules (success path) ─────────────────────────────────────────
export const CADENCE: Record<ShipmentState, CadenceRule> = {
  awaiting_handover: { intervalMs: 30 * 60 * 1000,      maxLifetimeMs: 24 * 60 * 60 * 1000,       lifetimeExceededState: 'exception' },
  label_created:     { intervalMs: 2 * 60 * 60 * 1000,  maxLifetimeMs: 48 * 60 * 60 * 1000,       lifetimeExceededState: 'exception' },
  in_transit:        { intervalMs: 6 * 60 * 60 * 1000,  maxLifetimeMs: 14 * 24 * 60 * 60 * 1000,  lifetimeExceededState: 'stale' },
  out_for_delivery:  { intervalMs: 30 * 60 * 1000,      maxLifetimeMs: 48 * 60 * 60 * 1000,       lifetimeExceededState: 'exception' },
  delivered:         { intervalMs: 0,                   maxLifetimeMs: null,                       lifetimeExceededState: 'delivered' },
  exception:         { intervalMs: 12 * 60 * 60 * 1000, maxLifetimeMs: 7 * 24 * 60 * 60 * 1000,   lifetimeExceededState: 'stale' },
  stale:             { intervalMs: 0,                   maxLifetimeMs: null,                       lifetimeExceededState: 'stale' },
}

export function computeNextCheckAt(state: ShipmentState, now: Date = new Date()): Date | null {
  const rule = CADENCE[state]
  if (rule.intervalMs === 0) return null
  return new Date(now.getTime() + rule.intervalMs)
}

/**
 * Exponential backoff for failed polls.
 * Formula: 2^attempts × 5min, capped at 4h.
 */
export function computeBackoffNextCheckAt(attempts: number, now: Date = new Date()): Date {
  const fiveMin = 5 * 60 * 1000
  const fourH = 4 * 60 * 60 * 1000
  const delay = Math.min(Math.pow(2, attempts) * fiveMin, fourH)
  return new Date(now.getTime() + delay)
}

export const MAX_BACKOFF_ATTEMPTS = 8

/**
 * Check if an order in a given state has exceeded its maximum lifetime.
 * Returns the escalation state if yes, null if still within window.
 */
export function checkLifetimeExceeded(
  state: ShipmentState,
  stateChangedAt: Date,
  now: Date = new Date(),
): ShipmentState | null {
  const rule = CADENCE[state]
  if (!rule.maxLifetimeMs) return null
  const elapsed = now.getTime() - stateChangedAt.getTime()
  if (elapsed < rule.maxLifetimeMs) return null
  return rule.lifetimeExceededState as ShipmentState
}
