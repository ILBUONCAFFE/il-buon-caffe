# Allegro Shipment Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an intelligent, Neon-safe shipment refresh layer for Allegro orders driven by internal `shipment_state` (independent from Allegro order status).

**Architecture:** Queue = derived query on `orders` table (new columns + partial index). Cron `*/5 * * * *` checks KV idle-guard + circuit breaker before touching DB; batches 10 due orders; applies exponential backoff on failure. Eager enrollment in order handlers, lazy backfill in nightly cron. Extensible via `carrier` column for future multi-carrier support.

**Tech Stack:** Hono.js on Cloudflare Workers, Drizzle ORM, Neon PostgreSQL, Cloudflare KV, Next.js admin panel.

**Spec:** `docs/superpowers/specs/2026-04-18-allegro-shipment-tracking-design.md`

---

## File Structure

**New files:**
- `apps/api/src/lib/shipments/types.ts` — `ShipmentState` union, `CadenceConfig`, `PollResult`
- `apps/api/src/lib/shipments/state-machine.ts` — `mapAllegroStatus`, `deriveWorstState`, `computeNextCheckAt`
- `apps/api/src/lib/shipments/queue.ts` — `selectDueShipments`, `getKvGuards`, `updateNextDueKv`
- `apps/api/src/lib/shipments/poller.ts` — `pollAllegroShipment`, `applyPollResult`, `applyBackoff`
- `apps/api/src/lib/shipments/enrollment.ts` — `enrollShipment`, `backfillShipmentEnrollment`
- `apps/api/src/lib/shipments/scheduler.ts` — `refreshShipments(env)` cron entry point
- `apps/api/src/lib/shipments/index.ts` — barrel exports
- `apps/api/src/lib/shipments/__tests__/state-machine.test.ts` — unit tests

**Modified files:**
- `packages/db/schema/index.ts` — add 6 columns to `orders` + new partial index
- `apps/api/src/lib/allegro-orders/handlers.ts` — call `enrollShipment` in `handlePaid` and status transitions
- `apps/api/src/index.ts` — register new cron in `scheduled` handler
- `apps/api/wrangler.json` — add `*/5 * * * *` cron trigger
- `apps/api/src/routes/admin/orders.ts` (or similar) — new `POST /:id/refresh-shipment` endpoint
- `apps/web/src/admin/components/OrderDetailModal.tsx` — shipment section UI
- `packages/types/index.ts` — export `ShipmentState` type

---

## Task 1: Schema — add shipment columns

**Files:**
- Modify: `packages/db/schema/index.ts` (orders table definition)

- [ ] **Step 1: Add columns to orders table**

Locate the `orders` pgTable definition. Inside the column list (after existing tracking columns around line 452), insert:

```ts
  // ── Intelligent shipment tracking layer (2026-04) ──────────────────────
  shipmentState:          varchar('shipment_state', { length: 32 }),
  shipmentCarrier:        varchar('shipment_carrier', { length: 32 }),
  shipmentLastCheckedAt:  timestamp('shipment_last_checked_at', { withTimezone: true }),
  shipmentNextCheckAt:    timestamp('shipment_next_check_at', { withTimezone: true }),
  shipmentCheckAttempts:  integer('shipment_check_attempts').notNull().default(0),
  shipmentStateChangedAt: timestamp('shipment_state_changed_at', { withTimezone: true }),
```

- [ ] **Step 2: Replace the old tracking index with shipment queue index**

In the same table's index block, remove the `trackingQueueIdx` definition and replace with:

```ts
  shipmentQueueIdx: index('orders_shipment_queue_idx')
    .on(table.shipmentNextCheckAt)
    .where(sql`${table.source} = 'allegro'
             AND ${table.shipmentState} IS NOT NULL
             AND ${table.shipmentState} NOT IN ('delivered', 'stale')`),
```

- [ ] **Step 3: Generate migration**

Run:
```bash
cd packages/db && npx drizzle-kit generate --name shipment_tracking_columns
```
Expected: new SQL file created under `packages/db/drizzle/` with `ALTER TABLE orders ADD COLUMN shipment_state ...` and the new index.

- [ ] **Step 4: Review generated SQL**

Open the generated migration file. Verify:
- 6 `ADD COLUMN` statements (all nullable except `shipment_check_attempts`)
- `DROP INDEX orders_tracking_queue_idx`
- `CREATE INDEX orders_shipment_queue_idx ... WHERE ...`
- No unexpected `DROP COLUMN`

If the generator produced destructive statements (e.g., dropping old tracking columns), remove them manually — we keep backwards compatibility with `tracking*` columns.

- [ ] **Step 5: Commit schema change**

```bash
git add packages/db/schema/index.ts packages/db/drizzle/
git commit -m "feat(db): add shipment tracking columns and queue index"
```

---

## Task 2: Apply migration to Neon

**Files:** none (infra only)

- [ ] **Step 1: Apply migration via Neon MCP**

Use `mcp__Neon__run_sql_transaction` to execute the generated SQL from Task 1 against the production database. Pass each statement as a separate entry in the transaction array.

- [ ] **Step 2: Verify with `mcp__Neon__describe_table_schema`**

Call `describe_table_schema` for `orders`. Confirm 6 new columns exist with correct types.

- [ ] **Step 3: Verify index exists**

Run via `mcp__Neon__run_sql`:
```sql
SELECT indexname FROM pg_indexes WHERE tablename='orders' AND indexname='orders_shipment_queue_idx';
```
Expected: 1 row.

---

## Task 3: Export ShipmentState type

**Files:**
- Modify: `packages/types/index.ts`

- [ ] **Step 1: Add ShipmentState union**

Append to `packages/types/index.ts`:

```ts
// ── Shipment tracking ─────────────────────────────────────────────────────
export const SHIPMENT_STATES = [
  'awaiting_handover',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'stale',
] as const

export type ShipmentState = typeof SHIPMENT_STATES[number]

export interface ShipmentRefreshInfo {
  state: ShipmentState | null
  carrier: string | null
  lastCheckedAt: string | null
  nextCheckAt: string | null
  checkAttempts: number
  stateChangedAt: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/types/index.ts
git commit -m "feat(types): add ShipmentState union and refresh info type"
```

---

## Task 4: Shipments — types.ts

**Files:**
- Create: `apps/api/src/lib/shipments/types.ts`

- [ ] **Step 1: Create types file**

```ts
import type { ShipmentState } from '@repo/types'

export type { ShipmentState }

export interface AllegroShipmentRecord {
  id: string
  waybillNumber?: string
  carrierId?: string
  status?: string              // raw Allegro carrier code
  trackingUrl?: string
  sentAt?: string
  deliveredAt?: string
}

export interface CadenceRule {
  intervalMs: number
  maxLifetimeMs: number | null   // null = no lifetime cap
  lifetimeExceededState: ShipmentState | 'delivered'
}

export interface PollResult {
  orderId: number
  previousState: ShipmentState | null
  newState: ShipmentState
  stateChanged: boolean
  snapshot: AllegroShipmentRecord[]
}

export interface PollFailure {
  orderId: number
  kind: 'http' | 'auth' | 'rate_limit' | 'parse' | 'unknown'
  retryAfterSec?: number
  message: string
}

export interface CycleSummary {
  processed: number
  updated: number
  stateChanges: number
  failures: number
  skippedReason?: 'not_due' | 'circuit_open' | 'rate_limited'
  nextDueAt: Date | null
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/shipments/types.ts
git commit -m "feat(api): shipment tracking types"
```

---

## Task 5: State machine — mapping + worst-of + cadence

**Files:**
- Create: `apps/api/src/lib/shipments/state-machine.ts`

- [ ] **Step 1: Write the module**

```ts
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
  awaiting_handover: { intervalMs: 30 * 60 * 1000,     maxLifetimeMs: 24 * 60 * 60 * 1000, lifetimeExceededState: 'exception' },
  label_created:     { intervalMs: 2 * 60 * 60 * 1000, maxLifetimeMs: 48 * 60 * 60 * 1000, lifetimeExceededState: 'exception' },
  in_transit:        { intervalMs: 6 * 60 * 60 * 1000, maxLifetimeMs: 14 * 24 * 60 * 60 * 1000, lifetimeExceededState: 'stale' },
  out_for_delivery:  { intervalMs: 30 * 60 * 1000,     maxLifetimeMs: 48 * 60 * 60 * 1000, lifetimeExceededState: 'exception' },
  delivered:         { intervalMs: 0,                  maxLifetimeMs: null, lifetimeExceededState: 'delivered' },
  exception:         { intervalMs: 12 * 60 * 60 * 1000, maxLifetimeMs: 7 * 24 * 60 * 60 * 1000, lifetimeExceededState: 'stale' },
  stale:             { intervalMs: 0,                  maxLifetimeMs: null, lifetimeExceededState: 'stale' },
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/shipments/state-machine.ts
git commit -m "feat(api): shipment state machine and cadence rules"
```

---

## Task 6: State machine unit tests

**Files:**
- Create: `apps/api/src/lib/shipments/__tests__/state-machine.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  mapAllegroStatus,
  deriveWorstState,
  computeNextCheckAt,
  computeBackoffNextCheckAt,
  checkLifetimeExceeded,
  CADENCE,
} from '../state-machine'

describe('mapAllegroStatus', () => {
  it('maps DELIVERED → delivered', () => {
    expect(mapAllegroStatus('DELIVERED')).toBe('delivered')
  })
  it('is case-insensitive', () => {
    expect(mapAllegroStatus('delivered')).toBe('delivered')
    expect(mapAllegroStatus(' In_Transit ')).toBe('in_transit')
  })
  it('returns null for unknown', () => {
    expect(mapAllegroStatus('SOMETHING_WEIRD')).toBeNull()
  })
  it('returns null for empty/null', () => {
    expect(mapAllegroStatus(null)).toBeNull()
    expect(mapAllegroStatus('')).toBeNull()
  })
})

describe('deriveWorstState', () => {
  it('returns fallback on empty array', () => {
    expect(deriveWorstState([])).toBe('awaiting_handover')
    expect(deriveWorstState([], 'label_created')).toBe('label_created')
  })
  it('returns delivered when all parcels delivered', () => {
    expect(deriveWorstState([
      { id: 'a', status: 'DELIVERED' },
      { id: 'b', status: 'DELIVERED' },
    ])).toBe('delivered')
  })
  it('picks worst across parcels (one in_transit, one delivered)', () => {
    expect(deriveWorstState([
      { id: 'a', status: 'DELIVERED' },
      { id: 'b', status: 'IN_TRANSIT' },
    ])).toBe('in_transit')
  })
  it('exception beats everything', () => {
    expect(deriveWorstState([
      { id: 'a', status: 'DELIVERED' },
      { id: 'b', status: 'RETURNED' },
    ])).toBe('exception')
  })
  it('unknown parcel codes fall back to in_transit', () => {
    expect(deriveWorstState([{ id: 'a', status: 'WHATEVER' }])).toBe('in_transit')
  })
})

describe('computeNextCheckAt', () => {
  it('returns future date with correct interval for in_transit', () => {
    const now = new Date('2026-04-18T10:00:00Z')
    const next = computeNextCheckAt('in_transit', now)
    expect(next?.toISOString()).toBe('2026-04-18T16:00:00.000Z')
  })
  it('returns null for terminal states', () => {
    expect(computeNextCheckAt('delivered')).toBeNull()
    expect(computeNextCheckAt('stale')).toBeNull()
  })
})

describe('computeBackoffNextCheckAt', () => {
  it('first attempt = 10min (2^1 * 5min)', () => {
    const now = new Date('2026-04-18T10:00:00Z')
    const next = computeBackoffNextCheckAt(1, now)
    expect(next.getTime() - now.getTime()).toBe(10 * 60 * 1000)
  })
  it('caps at 4h after many attempts', () => {
    const now = new Date('2026-04-18T10:00:00Z')
    const next = computeBackoffNextCheckAt(20, now)
    expect(next.getTime() - now.getTime()).toBe(4 * 60 * 60 * 1000)
  })
})

describe('checkLifetimeExceeded', () => {
  it('returns null when still within window', () => {
    const changed = new Date('2026-04-18T10:00:00Z')
    const now    = new Date('2026-04-18T11:00:00Z')
    expect(checkLifetimeExceeded('awaiting_handover', changed, now)).toBeNull()
  })
  it('escalates awaiting_handover → exception after 24h', () => {
    const changed = new Date('2026-04-17T09:00:00Z')
    const now    = new Date('2026-04-18T10:00:00Z')
    expect(checkLifetimeExceeded('awaiting_handover', changed, now)).toBe('exception')
  })
  it('escalates in_transit → stale after 14d', () => {
    const changed = new Date('2026-04-01T10:00:00Z')
    const now    = new Date('2026-04-18T10:00:00Z')
    expect(checkLifetimeExceeded('in_transit', changed, now)).toBe('stale')
  })
})

describe('CADENCE completeness', () => {
  it('has a rule for every state', () => {
    const states = ['awaiting_handover','label_created','in_transit','out_for_delivery','delivered','exception','stale'] as const
    for (const s of states) expect(CADENCE[s]).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (vitest not yet configured?)**

Run: `cd apps/api && npx vitest run src/lib/shipments/__tests__/state-machine.test.ts`

If vitest is not present: add `vitest` as a dev dep at `apps/api` (`npm install -D vitest --workspace=apps/api`) and add minimal `vitest.config.ts`. If vitest already works in the repo, just run it.

- [ ] **Step 3: Run tests — expect PASS**

All tests should pass against the code from Task 5.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/shipments/__tests__/ apps/api/vitest.config.ts apps/api/package.json
git commit -m "test(api): state machine unit tests"
```

---

## Task 7: Queue selection + KV guards

**Files:**
- Create: `apps/api/src/lib/shipments/queue.ts`

- [ ] **Step 1: Write module**

```ts
import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, lte, isNotNull, notInArray, sql, asc } from 'drizzle-orm'
import type { AllegroShipmentRecord } from './types'

export const KV_NEXT_DUE_AT = 'shipments:next_due_at'
export const KV_CIRCUIT_OPEN = 'shipments:circuit_open'
const BATCH_SIZE = 10
const TERMINAL_STATES = ['delivered', 'stale'] as const

export interface DueOrder {
  id: number
  externalId: string | null
  shipmentState: string
  shipmentCheckAttempts: number
  shipmentStateChangedAt: Date | null
  allegroShipmentsSnapshot: AllegroShipmentRecord[] | null
}

export async function isCircuitOpen(kv: KVNamespace): Promise<boolean> {
  return (await kv.get(KV_CIRCUIT_OPEN)) === '1'
}

export async function openCircuit(kv: KVNamespace, ttlSec = 15 * 60): Promise<void> {
  await kv.put(KV_CIRCUIT_OPEN, '1', { expirationTtl: ttlSec })
}

/**
 * Returns true if we should skip DB entirely this cycle.
 * KV stores the timestamp of the earliest future `shipment_next_check_at`.
 * If that timestamp is in the future, nothing is due — don't wake Neon.
 */
export async function isBeforeNextDue(kv: KVNamespace, now: Date = new Date()): Promise<boolean> {
  const raw = await kv.get(KV_NEXT_DUE_AT)
  if (!raw) return false                    // unknown → must check DB
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return false
  return t > now.getTime()
}

export async function selectDueShipments(
  db: ReturnType<typeof createDb>,
  now: Date = new Date(),
): Promise<DueOrder[]> {
  const rows = await db
    .select({
      id:                      orders.id,
      externalId:              orders.externalId,
      shipmentState:           orders.shipmentState,
      shipmentCheckAttempts:   orders.shipmentCheckAttempts,
      shipmentStateChangedAt:  orders.shipmentStateChangedAt,
      allegroShipmentsSnapshot: orders.allegroShipmentsSnapshot,
    })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.shipmentState),
        notInArray(orders.shipmentState, TERMINAL_STATES as any),
        lte(orders.shipmentNextCheckAt, now),
      ),
    )
    .orderBy(asc(orders.shipmentNextCheckAt))
    .limit(BATCH_SIZE)
  return rows as DueOrder[]
}

/**
 * After a cycle, update KV with the earliest future check timestamp.
 * If no active orders remain, set flag 1h ahead.
 */
export async function refreshNextDueKv(
  db: ReturnType<typeof createDb>,
  kv: KVNamespace,
): Promise<Date | null> {
  const [row] = await db
    .select({ next: sql<Date | null>`MIN(${orders.shipmentNextCheckAt})` })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.shipmentState),
        notInArray(orders.shipmentState, TERMINAL_STATES as any),
      ),
    )
  const next = row?.next ? new Date(row.next) : new Date(Date.now() + 60 * 60 * 1000)
  // TTL: 1h max — so a missed invalidation auto-corrects after 1h
  await kv.put(KV_NEXT_DUE_AT, next.toISOString(), { expirationTtl: 3600 })
  return next
}

export async function invalidateNextDueKv(kv: KVNamespace): Promise<void> {
  await kv.delete(KV_NEXT_DUE_AT)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/shipments/queue.ts
git commit -m "feat(api): shipment queue selection and KV idle guards"
```

---

## Task 8: Poller — fetch + apply + backoff

**Files:**
- Create: `apps/api/src/lib/shipments/poller.ts`

- [ ] **Step 1: Write module**

```ts
import { createDb } from '@repo/db/client'
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

const ALLEGRO_API = {
  sandbox:    'https://api.allegro.pl.allegrosandbox.pl',
  production: 'https://api.allegro.pl',
} as const

interface PollerEnv {
  ALLEGRO_KV: KVNamespace
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
}

async function getAccessToken(kv: KVNamespace): Promise<string | null> {
  return kv.get(KV_KEYS.ACCESS_TOKEN)
}

export async function pollAllegroShipment(
  checkoutFormId: string,
  env: PollerEnv,
): Promise<
  | { ok: true; shipments: AllegroShipmentRecord[] }
  | { ok: false; failure: PollFailure }
> {
  const token = await getAccessToken(env.ALLEGRO_KV)
  if (!token) return { ok: false, failure: { orderId: 0, kind: 'auth', message: 'no_token_in_kv' } }

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
    return { ok: false, failure: { orderId: 0, kind: 'auth', message: 'token_rejected' } }
  }
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10)
    return { ok: false, failure: { orderId: 0, kind: 'rate_limit', retryAfterSec: retryAfter, message: '429' } }
  }
  if (!res.ok) {
    return { ok: false, failure: { orderId: 0, kind: 'http', message: `HTTP ${res.status}` } }
  }

  try {
    const body = await res.json<{ shipments?: AllegroShipmentRecord[] }>()
    const list = Array.isArray(body?.shipments) ? body.shipments : []
    return { ok: true, shipments: list }
  } catch (e) {
    return { ok: false, failure: { orderId: 0, kind: 'parse', message: String(e) } }
  }
}

/**
 * Apply a successful poll result to DB.
 * Updates shipment_state, snapshot, timestamps, resets attempts, logs state change.
 */
export async function applyPollResult(
  db: ReturnType<typeof createDb>,
  order: DueOrder,
  shipments: AllegroShipmentRecord[],
  now: Date = new Date(),
): Promise<PollResult> {
  const previousState = order.shipmentState as ShipmentState
  let newState = deriveWorstState(shipments, previousState)

  // Lifetime escalation (e.g., awaiting_handover → exception after 24h with no shipments)
  if (order.shipmentStateChangedAt) {
    const escalated = checkLifetimeExceeded(newState, order.shipmentStateChangedAt, now)
    if (escalated) newState = escalated
  }

  const stateChanged = newState !== previousState
  const nextCheckAt  = computeNextCheckAt(newState, now)

  await db.update(orders).set({
    shipmentState:          newState,
    shipmentLastCheckedAt:  now,
    shipmentNextCheckAt:    nextCheckAt,
    shipmentCheckAttempts:  0,
    shipmentStateChangedAt: stateChanged ? now : order.shipmentStateChangedAt,
    allegroShipmentsSnapshot: shipments as any,
    updatedAt:              now,
  }).where(eq(orders.id, order.id))

  if (stateChanged) {
    await db.insert(orderStatusHistory).values({
      orderId:   order.id,
      category:  'tracking',
      fromValue: previousState ?? null,
      toValue:   newState,
      changedAt: now,
      source:    'allegro_sync',
      note:      `shipment state: ${previousState ?? 'null'} → ${newState}`,
    } as any)
  }

  return {
    orderId:       order.id,
    previousState,
    newState,
    stateChanged,
    snapshot:      shipments,
  }
}

/**
 * Apply backoff after a failure. Escalates to `exception` after MAX_BACKOFF_ATTEMPTS.
 */
export async function applyBackoff(
  db: ReturnType<typeof createDb>,
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
      orderId:   order.id,
      category:  'tracking',
      fromValue: order.shipmentState,
      toValue:   'exception',
      changedAt: now,
      source:    'allegro_sync',
      note:      `escalated after ${attempts} failed polls (${failure.kind}: ${failure.message})`,
    } as any)
    return
  }

  await db.update(orders).set({
    shipmentCheckAttempts: attempts,
    shipmentLastCheckedAt: now,
    shipmentNextCheckAt:   computeBackoffNextCheckAt(attempts, now),
    updatedAt:             now,
  }).where(eq(orders.id, order.id))
}
```

- [ ] **Step 2: Verify `orderStatusHistory` column names match schema**

Open `packages/db/schema/index.ts`, locate `orderStatusHistory` pgTable. Confirm columns: `orderId`, `category`, `fromValue`, `toValue`, `changedAt`, `source`, `note`. If the real schema uses different names (e.g., `from_value` vs `oldValue`), adjust the insert in `poller.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/shipments/poller.ts
git commit -m "feat(api): shipment poller with backoff and history logging"
```

---

## Task 9: Scheduler — cron entry point

**Files:**
- Create: `apps/api/src/lib/shipments/scheduler.ts`
- Create: `apps/api/src/lib/shipments/index.ts`

- [ ] **Step 1: Write scheduler**

```ts
import { createDbWithPool } from '@repo/db/client'
import type { CycleSummary } from './types'
import {
  selectDueShipments,
  isBeforeNextDue,
  isCircuitOpen,
  openCircuit,
  refreshNextDueKv,
} from './queue'
import { pollAllegroShipment, applyPollResult, applyBackoff } from './poller'

interface SchedulerEnv {
  DATABASE_URL: string
  ALLEGRO_KV: KVNamespace
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
}

export async function refreshShipments(env: SchedulerEnv): Promise<CycleSummary> {
  // 1. KV idle guard — cheap skip before DB
  if (await isBeforeNextDue(env.ALLEGRO_KV)) {
    return { processed: 0, updated: 0, stateChanges: 0, failures: 0, skippedReason: 'not_due', nextDueAt: null }
  }

  // 2. Circuit breaker
  if (await isCircuitOpen(env.ALLEGRO_KV)) {
    return { processed: 0, updated: 0, stateChanges: 0, failures: 0, skippedReason: 'circuit_open', nextDueAt: null }
  }

  const { db, end } = createDbWithPool(env.DATABASE_URL)
  try {
    const due = await selectDueShipments(db)
    if (due.length === 0) {
      const next = await refreshNextDueKv(db, env.ALLEGRO_KV)
      return { processed: 0, updated: 0, stateChanges: 0, failures: 0, nextDueAt: next }
    }

    let updated = 0
    let stateChanges = 0
    let failures = 0
    let rateLimitedRetryAfter: number | null = null

    // Sequential — safer for CPU budget, easier Allegro rate profile
    for (const order of due) {
      if (!order.externalId) { failures++; continue }

      const res = await pollAllegroShipment(order.externalId, env)
      if (!res.ok) {
        failures++
        await applyBackoff(db, order, { ...res.failure, orderId: order.id })
        if (res.failure.kind === 'rate_limit') {
          rateLimitedRetryAfter = res.failure.retryAfterSec ?? 60
          break   // stop cycle on 429
        }
        if (res.failure.kind === 'auth') break   // token dead — let */10 cron refresh it
        continue
      }

      const applied = await applyPollResult(db, order, res.shipments)
      updated++
      if (applied.stateChanged) stateChanges++
    }

    // Circuit breaker: >50% failure rate in a non-trivial cycle
    if (due.length >= 4 && failures / due.length > 0.5) {
      await openCircuit(env.ALLEGRO_KV, 15 * 60)
    }
    // Rate-limit-specific circuit
    if (rateLimitedRetryAfter !== null) {
      await openCircuit(env.ALLEGRO_KV, rateLimitedRetryAfter)
    }

    const nextDueAt = await refreshNextDueKv(db, env.ALLEGRO_KV)

    console.log(
      `[Shipments] cycle done — due=${due.length} updated=${updated} stateChanges=${stateChanges} failures=${failures} nextDueAt=${nextDueAt?.toISOString() ?? 'none'}`,
    )

    return {
      processed:    due.length,
      updated,
      stateChanges,
      failures,
      skippedReason: rateLimitedRetryAfter !== null ? 'rate_limited' : undefined,
      nextDueAt,
    }
  } finally {
    await end()
  }
}
```

- [ ] **Step 2: Write barrel exports**

Create `apps/api/src/lib/shipments/index.ts`:

```ts
export { refreshShipments } from './scheduler'
export { enrollShipment, backfillShipmentEnrollment } from './enrollment'
export { invalidateNextDueKv } from './queue'
export type { ShipmentState, ShipmentRefreshInfo } from './types'
```

(Barrel references `enrollment.ts` — Task 10 creates it. If running out of order, comment the `enrollment` export temporarily.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/shipments/scheduler.ts apps/api/src/lib/shipments/index.ts
git commit -m "feat(api): shipment refresh scheduler with circuit breaker"
```

---

## Task 10: Enrollment — eager + backfill

**Files:**
- Create: `apps/api/src/lib/shipments/enrollment.ts`

- [ ] **Step 1: Write module**

```ts
import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, isNull, inArray, gt, sql } from 'drizzle-orm'
import { invalidateNextDueKv } from './queue'
import { computeNextCheckAt } from './state-machine'

/**
 * Eager enrollment — call from order handlers when a paid/processing
 * order is confirmed. Idempotent: only sets fields if shipmentState is NULL.
 */
export async function enrollShipment(
  db: ReturnType<typeof createDb>,
  orderId: number,
  kv: KVNamespace,
  now: Date = new Date(),
): Promise<{ enrolled: boolean }> {
  const nextCheckAt = computeNextCheckAt('awaiting_handover', now)
  const res = await db.update(orders).set({
    shipmentState:          'awaiting_handover',
    shipmentCarrier:        'allegro',
    shipmentNextCheckAt:    nextCheckAt,
    shipmentStateChangedAt: now,
    shipmentCheckAttempts:  0,
    updatedAt:              now,
  }).where(
    and(
      eq(orders.id, orderId),
      isNull(orders.shipmentState),
    ),
  ).returning({ id: orders.id })

  if (res.length > 0) {
    // New work arrived — clear idle guard so next cycle doesn't skip
    await invalidateNextDueKv(kv)
    return { enrolled: true }
  }
  return { enrolled: false }
}

/**
 * Lazy backfill — runs in nightly cron. Enrolls Allegro orders that somehow
 * missed eager enrollment. Scoped to last 30 days to avoid ancient data.
 */
export async function backfillShipmentEnrollment(
  db: ReturnType<typeof createDb>,
  kv: KVNamespace,
): Promise<{ enrolled: number }> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const res = await db.update(orders).set({
    shipmentState:          'awaiting_handover',
    shipmentCarrier:        'allegro',
    shipmentNextCheckAt:    now,
    shipmentStateChangedAt: now,
    shipmentCheckAttempts:  0,
    updatedAt:              now,
  }).where(
    and(
      eq(orders.source, 'allegro'),
      isNull(orders.shipmentState),
      inArray(orders.status, ['paid', 'processing', 'shipped', 'in_transit', 'out_for_delivery'] as any),
      gt(orders.createdAt, thirtyDaysAgo),
    ),
  ).returning({ id: orders.id })

  if (res.length > 0) await invalidateNextDueKv(kv)
  return { enrolled: res.length }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/shipments/enrollment.ts
git commit -m "feat(api): shipment enrollment (eager + nightly backfill)"
```

---

## Task 11: Wire enrollment into order handlers

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/handlers.ts`

- [ ] **Step 1: Import and call enrollShipment**

At the top of the file, add:

```ts
import { enrollShipment } from '../shipments'
```

In `handlePaid` (find the function — triggers when Allegro event type is `READY_FOR_PROCESSING` / similar paid transition), after the `db.update(orders).set({ status: 'paid', ... })` call, add:

```ts
  // Enrol into shipment refresh queue (idempotent)
  if (existingOrder?.id) {
    await enrollShipment(db, existingOrder.id, kv)
  }
```

Also add the same call in any other handler that sets status to `paid`, `processing`, or `shipped` — search for `.set({ status: 'paid'` and `.set({ status: 'processing'` patterns in handlers.ts and ensure enrollment runs there too.

- [ ] **Step 2: Verify handler signatures include `kv`**

Each handler we touch must have `kv: KVNamespace` as a parameter. Existing handlers like `handleBought` already do. If a handler is missing it, thread it through from the caller in `sync.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/handlers.ts
git commit -m "feat(allegro): enrol orders into shipment queue on paid transition"
```

---

## Task 12: Wrangler cron + scheduled handler wiring

**Files:**
- Modify: `apps/api/wrangler.json`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Add cron trigger**

In `apps/api/wrangler.json`, replace the `triggers.crons` array:

```json
"triggers": {
  "crons": [
    "0 * * * *",
    "*/10 * * * *",
    "*/5 * * * *",
    "0 3 * * *"
  ]
}
```

- [ ] **Step 2: Wire scheduler into index.ts**

In `apps/api/src/index.ts`:

1. Add import near the top (next to existing allegro-orders import):
   ```ts
   import { refreshShipments, backfillShipmentEnrollment } from './lib/shipments'
   ```

2. Find the exported `scheduled` handler (`export default { fetch: app.fetch, scheduled: ... }`). Add a constant for the new cron:
   ```ts
   const SHIPMENT_REFRESH_CRON = '*/5 * * * *'
   ```

3. In the cron dispatch switch/if chain, add a branch matching `*/5 * * * *`. It must run **before** the `*/10 * * * *` branch (since `*/5` runs more often):
   ```ts
   if (normalized === SHIPMENT_REFRESH_CRON) {
     ctx.waitUntil(refreshShipments(env).catch((err) => {
       console.error('[Shipments] cycle failed', err)
     }))
     return
   }
   ```

4. In the nightly `0 3 * * *` branch, add a backfill call:
   ```ts
   ctx.waitUntil((async () => {
     const { db, end } = createDbWithPool(env.DATABASE_URL)
     try {
       const r = await backfillShipmentEnrollment(db, env.ALLEGRO_KV)
       if (r.enrolled > 0) console.log(`[Shipments] nightly backfill enrolled ${r.enrolled} orders`)
     } finally {
       await end()
     }
   })())
   ```

- [ ] **Step 3: Commit**

```bash
git add apps/api/wrangler.json apps/api/src/index.ts
git commit -m "feat(api): register shipment refresh cron (*/5) and nightly backfill"
```

---

## Task 13: Admin manual refresh endpoint

**Files:**
- Modify: an existing admin orders route file (likely `apps/api/src/routes/admin/orders.ts`). If none exists, create it and mount in `apps/api/src/routes/admin/index.ts`.

- [ ] **Step 1: Locate or create the admin orders router**

Check `apps/api/src/routes/admin/` for an `orders.ts`. If missing, create one and mount it in the admin barrel.

- [ ] **Step 2: Add refresh-shipment endpoint**

```ts
import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import { invalidateNextDueKv } from '../../lib/shipments'

// assume adminMiddleware + dbMiddleware are applied at the mount point
export const adminOrdersShipmentRouter = new Hono<{ Bindings: Env; Variables: { db: ReturnType<typeof createDb> } }>()

adminOrdersShipmentRouter.post('/:id/refresh-shipment', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: { code: 'BAD_ID', message: 'invalid id' } }, 400)

  const db = c.var.db
  const now = new Date()
  const res = await db.update(orders).set({
    shipmentNextCheckAt:   now,
    shipmentCheckAttempts: 0,
    updatedAt:             now,
  }).where(eq(orders.id, id)).returning({ id: orders.id })

  if (res.length === 0) return c.json({ error: { code: 'NOT_FOUND', message: 'order not found' } }, 404)

  await invalidateNextDueKv(c.env.ALLEGRO_KV)
  return c.json({ data: { id, queuedAt: now.toISOString() } })
})
```

Mount it (if new):
```ts
// in apps/api/src/routes/admin/index.ts or wherever orders admin routes live
adminRouter.route('/orders', adminOrdersShipmentRouter)
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/admin/
git commit -m "feat(api): admin endpoint to force shipment refresh"
```

---

## Task 14: Admin UI — shipment section in modal

**Files:**
- Modify: `apps/web/src/admin/components/OrderDetailModal.tsx`

- [ ] **Step 1: Extend the order fetch shape**

Ensure the order loaded into the modal includes: `shipmentState`, `shipmentCarrier`, `shipmentLastCheckedAt`, `shipmentNextCheckAt`, `shipmentCheckAttempts`, `trackingNumber`, `allegroShipmentsSnapshot`. If the admin API layer selects specific columns, add these to the query.

- [ ] **Step 2: Add ShipmentSection component**

Near the top of OrderDetailModal.tsx (or as a sibling component file), add:

```tsx
const SHIPMENT_STATE_LABELS: Record<string, { label: string; tone: string }> = {
  awaiting_handover: { label: 'Oczekuje na nadanie',  tone: 'bg-amber-100 text-amber-800' },
  label_created:     { label: 'Etykieta utworzona',   tone: 'bg-blue-100 text-blue-800' },
  in_transit:        { label: 'W drodze',             tone: 'bg-indigo-100 text-indigo-800' },
  out_for_delivery:  { label: 'W doręczeniu',         tone: 'bg-purple-100 text-purple-800' },
  delivered:         { label: 'Dostarczone',          tone: 'bg-emerald-100 text-emerald-800' },
  exception:         { label: 'Problem',              tone: 'bg-rose-100 text-rose-800' },
  stale:             { label: 'Brak aktualizacji',    tone: 'bg-stone-100 text-stone-700' },
}

function formatRelative(date: Date | null, now = new Date()): string {
  if (!date) return '—'
  const diff = date.getTime() - now.getTime()
  const abs  = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  if (mins < 60) return `${diff < 0 ? '' : 'za '}${mins} min${diff < 0 ? ' temu' : ''}`
  const hrs = Math.round(mins / 60)
  return `${diff < 0 ? '' : 'za '}${hrs}h${diff < 0 ? ' temu' : ''}`
}

function ShipmentSection({ order, onRefresh }: { order: any; onRefresh: () => void }) {
  const state = order.shipmentState as string | null
  if (!state) return null
  const meta = SHIPMENT_STATE_LABELS[state] ?? { label: state, tone: 'bg-stone-100 text-stone-700' }
  const lastChecked = order.shipmentLastCheckedAt ? new Date(order.shipmentLastCheckedAt) : null
  const nextCheck   = order.shipmentNextCheckAt   ? new Date(order.shipmentNextCheckAt)   : null

  return (
    <section className="rounded-lg border border-stone-200 p-4 space-y-2">
      <h3 className="text-sm font-semibold text-stone-800">Przesyłka</h3>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.tone}`}>{meta.label}</span>
        {order.shipmentCarrier && <span className="text-xs text-stone-500">{order.shipmentCarrier}</span>}
      </div>
      {order.trackingNumber && (
        <div className="text-xs text-stone-600">Waybill: <code>{order.trackingNumber}</code></div>
      )}
      <div className="text-xs text-stone-600">
        Ostatnie sprawdzenie: {formatRelative(lastChecked)}
      </div>
      <div className="text-xs text-stone-600">
        Kolejne sprawdzenie: {formatRelative(nextCheck)}
      </div>
      {order.shipmentCheckAttempts > 0 && (
        <div className="text-xs text-rose-600">
          Prób nieudanych: {order.shipmentCheckAttempts}
        </div>
      )}
      <button
        onClick={onRefresh}
        className="mt-2 px-3 py-1.5 text-xs rounded bg-stone-900 text-white hover:bg-stone-700"
      >
        Odśwież teraz
      </button>
    </section>
  )
}
```

- [ ] **Step 3: Render the section + wire refresh**

Inside the modal's main render (next to existing tracking/allegro info), add:

```tsx
<ShipmentSection
  order={order}
  onRefresh={async () => {
    await fetch(`/api/admin/orders/${order.id}/refresh-shipment`, { method: 'POST' })
    // rely on existing modal refetch — or call the page's reload handler
    onReload?.()
  }}
/>
```

If the modal doesn't already have an `onReload` prop, either add one or call existing query invalidation.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/components/OrderDetailModal.tsx
git commit -m "feat(web): shipment section in order detail modal with force-refresh"
```

---

## Task 15: Integration smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Deploy API + web**

```bash
cd apps/api && wrangler deploy
cd ../web && npm run cf:deploy
```

- [ ] **Step 2: Manually enroll one order via Neon MCP**

Pick a recent Allegro order in `paid` or `shipped` status. Using `mcp__Neon__run_sql`:
```sql
UPDATE orders SET
  shipment_state = 'awaiting_handover',
  shipment_carrier = 'allegro',
  shipment_next_check_at = now(),
  shipment_state_changed_at = now()
WHERE id = <pick_one>;
```

- [ ] **Step 3: Wait up to 5 minutes**

The `*/5` cron should pick it up. Watch logs:
```bash
wrangler tail il-buon-caffe-api --format pretty
```
Expect: `[Shipments] cycle done — due=1 updated=1 ...`

- [ ] **Step 4: Verify DB state**

```sql
SELECT id, shipment_state, shipment_last_checked_at, shipment_next_check_at, allegro_shipments_snapshot
FROM orders WHERE id = <picked>;
```
Expect: `shipment_last_checked_at` populated, `shipment_next_check_at` in future according to CADENCE table, snapshot contains shipment objects.

- [ ] **Step 5: Verify admin UI**

Open the order in admin modal. Expect: shipment section visible with chip + next-refresh estimate.

- [ ] **Step 6: Verify KV idle guard**

Wait for a cycle with no due orders, then in a rapid second cycle, check Neon Rows chart — should show flat line (guard held). Via `wrangler tail`, look for `skippedReason=not_due`.

- [ ] **Step 7: Verify force-refresh button**

Click `Odśwież teraz` in admin. Expect: `shipment_next_check_at` jumps to `now`. Within 5 min, new log entry for that order.

---

## Task 16: Documentation update

**Files:**
- Modify: `CLAUDE.md` (Project Status section or new "Allegro shipment tracking" note)
- Create: `.claude/skills/allegro-integration.md` additions if skill file exists

- [ ] **Step 1: Add to CLAUDE.md "Neon / Cloudflare Workers — Lessons Learned"**

Append a short note:

```md
### Shipment tracking layer (2026-04)
- Own `shipment_state` enum decoupled from `order_status`; cadence table in `apps/api/src/lib/shipments/state-machine.ts`.
- Cron `*/5` → KV idle-guard (`shipments:next_due_at`) → `SELECT` due batch of 10 → poll Allegro `/order/checkout-forms/{id}/shipments` → update + log history.
- Exponential backoff per order (max 4h, escalate to `exception` after 8 attempts).
- Global circuit breaker on 429 or >50% failure rate.
- Enrollment: eager in `handlePaid`, lazy backfill in nightly cron.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: shipment tracking layer overview in CLAUDE.md"
```

---

## Task 17: Remove legacy `tracking*` admin UI references (optional cleanup)

**Files:** search results dependent

- [ ] **Step 1: Identify stale references**

Grep for the old `trackingStatus` / `trackingStatusCode` usage in admin UI:
```
grep -rn 'trackingStatus\|trackingStatusCode\|trackingLastEventAt' apps/web/src/admin
```

- [ ] **Step 2: Decide replacement**

If a field was previously shown to admins, switch its display source to the new `shipmentState` + `allegroShipmentsSnapshot[0].status`. Keep the DB columns (downstream exports may still depend on them).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/
git commit -m "refactor(web): admin UI uses shipment_state instead of trackingStatus*"
```

---

## Self-Review Notes

**Spec coverage:**
- Internal `shipment_state` enum + cadence table → Task 5 ✓
- Multi-parcel worst-of-all → Task 5 + 6 ✓
- Allegro status mapping → Task 5 (mapAllegroStatus) ✓
- DB columns + partial index → Task 1 ✓
- Queue algorithm (KV guards, LIMIT 10, circuit breaker) → Tasks 7, 9 ✓
- Exponential backoff + lifetime escalation → Task 5, 8 ✓
- 401 / 429 handling → Task 8, 9 ✓
- Eager + lazy enrollment → Tasks 10, 11, 12 ✓
- `*/5` cron trigger → Task 12 ✓
- Admin force-refresh endpoint + UI → Tasks 13, 14 ✓
- Observability (log lines) → Task 9 ✓
- Manual smoke → Task 15 ✓

**Scope note:** No direct courier APIs (future phase per spec). No push notifications (out of scope per spec). No removal of legacy `trackingStatus*` columns (kept for backward compat per spec's migration section).
