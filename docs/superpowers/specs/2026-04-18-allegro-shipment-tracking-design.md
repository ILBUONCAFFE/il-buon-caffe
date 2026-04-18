# Allegro Shipment Tracking — Intelligent Refresh Layer

**Date:** 2026-04-18
**Status:** Design approved, ready for implementation plan
**Scope:** API (Cloudflare Workers) + DB schema + admin UI surface

## Problem

The previous tracking automation (`tracking-refresh.ts` + `bulk-reconcile.ts`, removed in `2df5aba`) tied refresh eligibility to Allegro order statuses (`fulfillmentStatus`, `status`). That caused:

- Orders stuck in `in_transit` / `out_for_delivery` not being polled when Allegro flipped fulfillment flags unexpectedly.
- Bulk-reconcile processing overriding eligibility on every sync cycle.
- Opaque next-refresh timing — admins couldn't see when a given shipment would next be polled.

## Goals

1. **Independent shipment lifecycle** — a queue driven by our own `shipment_state`, derived from carrier tracking (not Allegro order status).
2. **Neon-friendly** — DB woken only when shipments are actually due.
3. **Safe under failure** — Allegro API outages, 401/429, multi-parcel edge cases must not cascade.
4. **Extensible** — structure ready for direct courier APIs (InPost/DPD/DHL) without schema rewrite.
5. **Observable** — admin modal shows current shipment state + next expected refresh.

## Non-Goals

- Direct integration with courier APIs (future phase).
- Tracking for shop-source orders (P24 flow — separate pipeline).
- Push notifications to buyer (out of scope here).

## Internal `shipment_state` Enum

Independent from `order_status`. Drives refresh cadence.

| State | Meaning | Poll interval | Max lifetime |
|---|---|---|---|
| `awaiting_handover` | Order paid, no waybill yet | 30 min | 24h → exception |
| `label_created` | Waybill exists, no carrier scan yet | 2h | 48h → exception |
| `in_transit` | Carrier confirmed pickup, moving | 6h | 14d → stale |
| `out_for_delivery` | Last-mile | 30 min | 48h → exception |
| `delivered` | Final | stop | — |
| `exception` | Failed delivery, return, address error | 12h | 7d → stale |
| `stale` | 14+ days no change, admin flag | stop | — |

**Mapping from Allegro carrier codes** (`allegroShipmentsSnapshot[].status` / `trackingStatus`):
- `DELIVERED` → `delivered`
- `OUT_FOR_DELIVERY` / `READY_FOR_PICKUP` → `out_for_delivery`
- `IN_TRANSIT` / `SORTING` / `HANDED_TO_CARRIER` → `in_transit`
- `LABEL_CREATED` / `AWAITING_PICKUP` → `label_created`
- `RETURNED` / `DELIVERY_FAILED` / `LOST` → `exception`
- Unknown codes → preserve current state (no regression).

**Multi-parcel rule:** `shipmentState = worst-of-all` across parcels in `allegroShipmentsSnapshot`. Order is `delivered` only when **every** parcel is `delivered`. Ordering (worst → best): `exception` > `awaiting_handover` > `label_created` > `in_transit` > `out_for_delivery` > `delivered`.

## Data Model

### New columns on `orders`

```ts
shipmentState:      varchar('shipment_state', { length: 32 })   // enum above, nullable until enrolled
shipmentLastCheckedAt: timestamp('shipment_last_checked_at', { withTimezone: true })
shipmentNextCheckAt:   timestamp('shipment_next_check_at', { withTimezone: true })
shipmentCheckAttempts: integer('shipment_check_attempts').notNull().default(0)
shipmentCarrier:       varchar('shipment_carrier', { length: 32 })  // 'allegro' now, future 'inpost'/'dpd'
shipmentStateChangedAt: timestamp('shipment_state_changed_at', { withTimezone: true })
```

### New partial index (queue driver)

Replaces current `orders_tracking_queue_idx`:

```sql
CREATE INDEX orders_shipment_queue_idx
  ON orders (shipment_next_check_at ASC)
  WHERE source = 'allegro'
    AND shipment_state IS NOT NULL
    AND shipment_state NOT IN ('delivered', 'stale');
```

Covering only active shipments = tiny index, fast scan.

### State history

Reuse existing `orderStatusHistory` with `category='tracking'`. Every `shipment_state` transition writes one row (not every poll — only changes).

### New enum (optional)

Keep `shipmentState` as `varchar` for forward-compat (adding states = no migration). Validate at app layer via TS union type in `packages/types`.

## Queue Algorithm

```
refreshShipments(env):
  // 1. KV idle guard
  nextDue = KV.get('shipments:next_due_at')
  if (nextDue && parseDate(nextDue) > now()) return { skipped: 'not_due' }

  // 2. KV circuit breaker
  if (KV.get('shipments:circuit_open') === '1') return { skipped: 'circuit_open' }

  // 3. Select batch (LIMIT 10, ORDER BY next_check_at ASC)
  due = SELECT id, external_id, shipment_state, check_attempts, allegro_shipments_snapshot
        FROM orders
        WHERE source = 'allegro'
          AND shipment_state IS NOT NULL
          AND shipment_state NOT IN ('delivered','stale')
          AND shipment_next_check_at <= now()
        ORDER BY shipment_next_check_at ASC
        LIMIT 10

  if (due.empty):
    upcoming = SELECT MIN(shipment_next_check_at) FROM orders WHERE ... (active only)
    KV.put('shipments:next_due_at', upcoming ?? now()+1h, TTL=1h)
    return { processed: 0 }

  // 4. Poll each (sequential — 10 requests × ~500ms = 5s, safe under 30s CPU)
  failures = 0
  for each order in due:
    try:
      shipments = await allegroGetShipments(order.external_id, token)
      newState = deriveWorstState(shipments)
      updateOrderShipment(order.id, shipments, newState)
      if (newState !== order.shipment_state):
        recordStatusChange(order.id, 'tracking', newState)
    except err:
      failures++
      applyBackoff(order, err)

  // 5. Circuit breaker check
  if (failures / due.length > 0.5):
    KV.put('shipments:circuit_open', '1', TTL=15min)

  // 6. Update next-due hint
  upcoming = SELECT MIN(shipment_next_check_at) FROM orders WHERE ... (active only)
  KV.put('shipments:next_due_at', upcoming, TTL=1h)
```

## Cadence & Backoff

**Happy path:** `nextCheckAt = now + interval[state]` (from table above), `checkAttempts = 0`.

**Failure (non-fatal):** `nextCheckAt = now + min(2^attempts × 5min, 4h)`, `checkAttempts++`. After 8 attempts → `shipmentState = exception`, `checkAttempts = 0`.

**401 Unauthorized:** Invalidate KV access token (`ALLEGRO_KV.delete(KV_KEYS.ACCESS_TOKEN)`), retry once in same cycle. If still 401 → abort cycle, let next `*/10` order-sync cron refresh token via existing flow.

**429 Rate Limit:** Honor `Retry-After` header. Cut cycle short, set `shipments:circuit_open = 1` with TTL = `Retry-After` seconds.

**No waybill yet (awaiting_handover):** Poll shipments endpoint; if empty array and order age > 24h → `exception`.

## Enrollment

### Eager (primary)

In `handlers.ts`, extend `handlePaid` and `handleReadyForProcessing`:

```ts
await db.update(orders).set({
  shipmentState: 'awaiting_handover',
  shipmentCarrier: 'allegro',
  shipmentNextCheckAt: new Date(Date.now() + 30 * 60 * 1000),
  shipmentStateChangedAt: new Date(),
}).where(eq(orders.id, orderId))

// Invalidate idle guard — new work arrived
await env.ALLEGRO_KV.delete('shipments:next_due_at')
```

### Lazy backfill (safety net)

Extend nightly cron (`0 3 * * *`) with `backfillShipmentEnrollment(db)`:

```sql
UPDATE orders
SET shipment_state = 'awaiting_handover',
    shipment_carrier = 'allegro',
    shipment_next_check_at = now(),
    shipment_state_changed_at = now()
WHERE source = 'allegro'
  AND status IN ('paid','processing','shipped','in_transit','out_for_delivery')
  AND shipment_state IS NULL
  AND created_at > now() - interval '30 days';
```

Bounded by 30 days to avoid enrolling ancient orders.

## File Layout

```
apps/api/src/lib/shipments/
  index.ts              # exports: refreshShipments, enrollShipment, backfillShipmentEnrollment
  state-machine.ts      # shipment_state enum, cadence table, deriveWorstState(), mapAllegroStatus()
  queue.ts              # selectDueShipments(), updateNextDueKv(), KV guards
  poller.ts             # pollAllegroShipment(), applyResult(), applyBackoff()
  enrollment.ts         # enrollShipment(orderId), backfillShipmentEnrollment()
  scheduler.ts          # refreshShipments(env) — cron entry point
  types.ts              # ShipmentState, PollResult, CadenceConfig
```

No code lives under `allegro-orders/` — this is a sibling concern, deliberately separated to prepare for multi-carrier.

## Admin UI

`OrderDetailModal.tsx` — add shipment section:

```
┌─ Przesyłka ────────────────────────────────────┐
│ Stan:        [in_transit]   (chip, colored)   │
│ Kurier:      InPost · 6204... (waybill link)  │
│ Ostatnie sprawdzenie: 12 min temu             │
│ Kolejne sprawdzenie: za ~5h 48m               │
│ Prób nieudanych: 0                            │
│ [Odśwież teraz] (admin button)                │
└────────────────────────────────────────────────┘
```

`[Odśwież teraz]` = POST to `/api/admin/allegro/orders/{id}/refresh-shipment` — sets `shipmentNextCheckAt = now()` and invalidates KV idle guard. Next `*/5` cron picks it up.

## wrangler.json changes

Add fourth cron trigger:

```json
"triggers": {
  "crons": [
    "0 * * * *",       // token refresh (existing)
    "*/10 * * * *",    // order sync (existing)
    "*/5 * * * *",     // shipment refresh (new)
    "0 3 * * *"        // nightly (existing, extended with backfill)
  ]
}
```

## Observability

- `console.log` prefixed `[Shipments]` with counts per cycle: `due`, `updated`, `state_changes`, `failures`, `skipped_reason`.
- `orderStatusHistory` rows = audit trail of state transitions.
- No new table needed for metrics (derive from history if ever required).

## Edge Cases

1. **Order has waybill but `allegroShipmentsSnapshot` is null** — first poll writes snapshot + sets state. Idempotent.
2. **Shipment appears in snapshot then disappears** (Allegro edit) — keep last known state, log warning, set `exception` after 3 consecutive empty responses.
3. **Order cancelled after enrollment** — order-sync handler (`handleCancelled`) sets `shipmentState = NULL` (drops from queue).
4. **Token expired mid-cycle** — handled by 401 path above, no data corruption.
5. **Duplicate parcel labels** — worst-of-all rule naturally handles this; snapshot stores all, queue reads worst.
6. **Workers 30s CPU limit** — batch 10 × ~500ms = 5s nominal. Hard cap: abort remaining if cycle exceeds 20s.

## Testing Strategy

- Unit: `deriveWorstState()` with multi-parcel fixtures.
- Unit: `mapAllegroStatus()` covers all documented codes + unknowns.
- Unit: cadence calculator (backoff formula, cap at 4h).
- Integration: full `refreshShipments()` against a mock Allegro API, verify DB + KV state after.
- Manual smoke: admin dashboard shows `nextCheckAt` for active orders.

## Migration

Single Drizzle migration:
1. Add 6 columns to `orders` (all nullable / with defaults).
2. Drop old `orders_tracking_queue_idx`.
3. Create new `orders_shipment_queue_idx`.
4. Backfill: `UPDATE orders SET shipment_state = 'awaiting_handover', ... WHERE source='allegro' AND status IN (...) AND created_at > now() - interval '30 days'`.

Deploy order:
1. DB migration (via Neon MCP).
2. API deploy with new code + cron trigger.
3. Web deploy with admin UI.

No destructive operations. Old `trackingStatus*` columns remain untouched (still populated by poller for backwards display compat, removed in a follow-up).

## Open Questions (deferred to implementation)

- Exact mapping table for less-common Allegro carrier codes (will iterate from first week of logs).
- Whether to expose `[Odśwież teraz]` rate-limit (proposal: 1/min per order).
