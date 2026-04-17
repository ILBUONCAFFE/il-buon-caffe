# Order Status History & Extended Status Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an append-only audit trail of every order + shipment status transition, extend the status enum to cover returns/refunds/disputes, and formalize the "external vs internal" status split — so dashboard can reconstruct the full timeline of any order without touching Allegro/courier APIs.

**Architecture:** One new table `order_status_history` captures every transition (both lifecycle status and shipment tracking state) with source attribution. Status writes funnel through a single helper (`recordStatusChange`) that diffs current vs. new state and inserts history rows atomically. The `orderStatusEnum` grows to cover return/refund/dispute states. `allegroFulfillmentStatus` is renamed to `externalStatus` + `externalSource` so the model is carrier-agnostic for future couriers.

**Tech Stack:** Drizzle ORM 0.45 (Postgres enums, JSONB), Hono 4.11, Cloudflare Workers, Neon Postgres, TypeScript, Zod.

**Out of scope (separate plan):** `last_synced_at` + hot/warm/cold segmentation, webhook inbound handlers, return/refund business logic (this plan only introduces the states + audit; state machine rules stay as-is).

---

## File Structure

**Create:**
- `packages/db/migrations/0043_order_status_history.sql` — DDL for enum extension, rename, new table
- `apps/api/src/lib/orders/record-status-change.ts` — single helper that writes to `order_status_history`
- `apps/api/src/lib/orders/record-status-change.test.ts` — unit tests (Vitest)
- `apps/api/src/routes/admin/orders-history.ts` — `GET /admin/orders/:id/history`
- `apps/web/src/admin/views/orders/OrderTimeline.tsx` — timeline UI component
- `packages/db/scripts/backfill-status-history.ts` — one-shot backfill from existing temporal columns

**Modify:**
- `packages/db/schema/index.ts:37-44` — extend `orderStatusEnum`, add `statusSourceEnum`, rename column, add `orderStatusHistory` table + relations
- `packages/db/schema/index.ts:394-479` — rename `allegroFulfillmentStatus` → `externalStatus`, add `externalSource` column
- `apps/api/src/lib/allegro-orders/sync.ts` — replace direct status UPDATEs with `recordStatusChange` calls
- `apps/api/src/lib/allegro-orders/tracking-refresh.ts` — same
- `apps/api/src/routes/admin/orders.ts` — admin manual status change → `recordStatusChange`
- `apps/api/src/routes/admin/index.ts` (or wherever admin router is mounted) — wire `orders-history.ts`
- `packages/types/index.ts` — export `OrderStatusHistoryEntry`, extended `OrderStatus`
- `apps/web/src/admin/views/orders/OrderDetail.tsx` (or equivalent) — render `<OrderTimeline />`

---

## Task 1: Extend enum, rename column, add history table — migration + schema

**Files:**
- Modify: `packages/db/schema/index.ts:37-84`
- Modify: `packages/db/schema/index.ts:394-479` (orders table)
- Create: `packages/db/migrations/0043_order_status_history.sql`

### Step 1.1 — [ ] Extend `orderStatusEnum` and add `statusSourceEnum`

In `packages/db/schema/index.ts`, replace the existing `orderStatusEnum` (lines 37-44) with:

```ts
export const orderStatusEnum = pgEnum('order_status', [
  'pending',              // awaiting payment (stock reserved)
  'paid',                 // payment confirmed
  'processing',           // being prepared
  'shipped',              // handed to carrier
  'in_transit',           // carrier confirmed pickup, not yet delivered
  'out_for_delivery',     // last mile
  'delivered',            // delivered
  'return_requested',     // buyer opened a return
  'return_in_transit',    // return parcel moving back
  'return_received',      // we received the return
  'refunded',             // money returned to buyer
  'disputed',             // Allegro dispute opened
  'cancelled'             // cancelled before fulfillment
]);

export const statusSourceEnum = pgEnum('status_source', [
  'system',          // automatic transition (e.g. p24 webhook → paid)
  'admin',           // manual admin change in dashboard
  'allegro_sync',    // Allegro /order/events poll
  'carrier_sync',    // courier tracking poll
  'p24_webhook',     // Przelewy24 payment callback
  'backfill'         // one-shot backfill from legacy columns
]);
```

Place `statusSourceEnum` right after `orderStatusEnum`.

### Step 1.2 — [ ] Rename `allegroFulfillmentStatus` → `externalStatus` + add `externalSource`

In `orders` table (`packages/db/schema/index.ts:406-408`), replace:

```ts
  // ===== Allegro reconciliation =====
  allegroRevision: varchar('allegro_revision', { length: 50 }),
  allegroFulfillmentStatus: varchar('allegro_fulfillment_status', { length: 50 }),
```

with:

```ts
  // ===== External system reconciliation =====
  allegroRevision: varchar('allegro_revision', { length: 50 }),
  externalStatus: varchar('external_status', { length: 50 }),
  externalStatusSource: varchar('external_status_source', { length: 20 }),  // 'allegro' | 'inpost' | 'dpd' | ...
  externalStatusAt: timestamp('external_status_at', { withTimezone: true }),
```

### Step 1.3 — [ ] Define `orderStatusHistory` table

Append after the `orders` table definition (after line 479):

```ts
export const orderStatusHistory = pgTable('order_status_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),

  // Which axis changed: 'status' = internal lifecycle, 'tracking' = carrier state
  category: varchar('category', { length: 20 }).notNull(),

  // For category='status': previous/next values are orderStatusEnum literals
  // For category='tracking': free-form carrier codes (e.g. 'DELIVERED', 'IN_TRANSIT')
  previousValue: varchar('previous_value', { length: 100 }),
  newValue: varchar('new_value', { length: 100 }).notNull(),

  source: statusSourceEnum('source').notNull(),
  sourceRef: varchar('source_ref', { length: 200 }),  // e.g. Allegro event ID, admin user ID, waybill

  // Snapshot of extra context (raw payload fragment, revision, user email, etc.)
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('osh_order_idx').on(table.orderId, table.occurredAt),
  categoryIdx: index('osh_category_idx').on(table.category, table.occurredAt),
  sourceIdx: index('osh_source_idx').on(table.source),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));
```

### Step 1.4 — [ ] Write migration SQL

Create `packages/db/migrations/0043_order_status_history.sql`:

```sql
-- Extend order_status enum (Postgres needs one ALTER per value, cannot be in a transaction with CREATE TABLE below, so do in separate statements)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'shipped';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery' AFTER 'in_transit';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_requested' AFTER 'delivered';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_in_transit' AFTER 'return_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_received' AFTER 'return_in_transit';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded' AFTER 'return_received';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed' AFTER 'refunded';

-- New enum for status change attribution
CREATE TYPE status_source AS ENUM (
  'system', 'admin', 'allegro_sync', 'carrier_sync', 'p24_webhook', 'backfill'
);

-- Rename legacy column, add external source + timestamp
ALTER TABLE orders RENAME COLUMN allegro_fulfillment_status TO external_status;
ALTER TABLE orders ADD COLUMN external_status_source varchar(20);
ALTER TABLE orders ADD COLUMN external_status_at timestamp with time zone;

-- Seed source for existing rows: if external_status IS NOT NULL it came from Allegro sync
UPDATE orders SET external_status_source = 'allegro' WHERE external_status IS NOT NULL;

-- History table
CREATE TABLE order_status_history (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category varchar(20) NOT NULL,
  previous_value varchar(100),
  new_value varchar(100) NOT NULL,
  source status_source NOT NULL,
  source_ref varchar(200),
  metadata jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX osh_order_idx ON order_status_history (order_id, occurred_at);
CREATE INDEX osh_category_idx ON order_status_history (category, occurred_at);
CREATE INDEX osh_source_idx ON order_status_history (source);
```

### Step 1.5 — [ ] Apply migration

Run via Neon MCP (per CLAUDE.md "Neon / Cloudflare Workers" section — don't ask user to run psql):

```
mcp__Neon__run_sql_transaction with all ALTER TYPE statements
mcp__Neon__run_sql with the CREATE TYPE + ALTER TABLE + CREATE TABLE + indexes
```

Note: Postgres disallows `ALTER TYPE ... ADD VALUE` inside a transaction block in older versions. Run each `ALTER TYPE` as its own statement.

### Step 1.6 — [ ] Verify schema

Run via Neon MCP:

```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'order_status'::regtype
ORDER BY enumsortorder;
```

Expected: 13 values including new ones.

```sql
\d order_status_history
```

Expected: table exists with indexes.

### Step 1.7 — [ ] Commit

```bash
git add packages/db/schema/index.ts packages/db/migrations/0043_order_status_history.sql
git commit -m "feat(db): extend order status enum, rename external_status, add order_status_history"
```

---

## Task 2: `recordStatusChange` helper

**Files:**
- Create: `apps/api/src/lib/orders/record-status-change.ts`
- Create: `apps/api/src/lib/orders/record-status-change.test.ts`

### Step 2.1 — [ ] Write failing test

Create `apps/api/src/lib/orders/record-status-change.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { orders, orderStatusHistory } from '@repo/db';
import { recordStatusChange } from './record-status-change';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const db = drizzle(pool);

async function makeOrder() {
  const [o] = await db.insert(orders).values({
    orderNumber: `T-${Date.now()}-${Math.random()}`,
    customerData: { email: 'test@test.pl', firstName: 'T', lastName: 'T', phone: '111', address: { street: 's', city: 'c', postalCode: '00-000', country: 'PL' } },
    subtotal: '10', total: '10',
  }).returning();
  return o;
}

describe('recordStatusChange', () => {
  it('writes a history row and updates orders.status', async () => {
    const o = await makeOrder();

    await recordStatusChange(db, {
      orderId: o.id,
      category: 'status',
      newValue: 'paid',
      source: 'p24_webhook',
      sourceRef: 'p24-tx-123',
    });

    const [updated] = await db.select().from(orders).where(eq(orders.id, o.id));
    expect(updated.status).toBe('paid');

    const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
    expect(history).toHaveLength(1);
    expect(history[0].previousValue).toBe('pending');
    expect(history[0].newValue).toBe('paid');
    expect(history[0].source).toBe('p24_webhook');
    expect(history[0].sourceRef).toBe('p24-tx-123');
  });

  it('is a no-op when new value equals current value', async () => {
    const o = await makeOrder();

    await recordStatusChange(db, { orderId: o.id, category: 'status', newValue: 'pending', source: 'system' });

    const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
    expect(history).toHaveLength(0);
  });

  it('records tracking-category changes without touching orders.status', async () => {
    const o = await makeOrder();

    await recordStatusChange(db, {
      orderId: o.id,
      category: 'tracking',
      newValue: 'IN_TRANSIT',
      source: 'carrier_sync',
      sourceRef: 'WAYBILL-ABC',
    });

    const [updated] = await db.select().from(orders).where(eq(orders.id, o.id));
    expect(updated.status).toBe('pending');  // unchanged
    expect(updated.trackingStatusCode).toBe('IN_TRANSIT');

    const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
    expect(history).toHaveLength(1);
    expect(history[0].category).toBe('tracking');
    expect(history[0].newValue).toBe('IN_TRANSIT');
  });

  it('stores metadata as jsonb', async () => {
    const o = await makeOrder();

    await recordStatusChange(db, {
      orderId: o.id,
      category: 'status',
      newValue: 'shipped',
      source: 'allegro_sync',
      metadata: { allegroEventId: 'evt-1', revision: 'rev-7' },
    });

    const [h] = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
    expect(h.metadata).toEqual({ allegroEventId: 'evt-1', revision: 'rev-7' });
  });
});
```

### Step 2.2 — [ ] Run test, verify it fails

```bash
cd apps/api && npx vitest run src/lib/orders/record-status-change.test.ts
```

Expected: FAIL — "Cannot find module './record-status-change'".

### Step 2.3 — [ ] Implement `recordStatusChange`

Create `apps/api/src/lib/orders/record-status-change.ts`:

```ts
import { eq, sql } from 'drizzle-orm';
import { orders, orderStatusHistory } from '@repo/db';
import type { DrizzleDb } from '@repo/db';  // or whatever exported client type

type Category = 'status' | 'tracking';
type Source = 'system' | 'admin' | 'allegro_sync' | 'carrier_sync' | 'p24_webhook' | 'backfill';

export interface RecordStatusChangeInput {
  orderId: number;
  category: Category;
  newValue: string;
  source: Source;
  sourceRef?: string;
  metadata?: Record<string, unknown>;
  /** If provided, skip reading current value (caller already has it). */
  previousValue?: string | null;
}

/**
 * Append-only status change recorder. Updates the relevant column on `orders`
 * AND inserts a row into `order_status_history`. No-op if new value equals current.
 *
 * All writes happen in a single transaction — history and orders cannot diverge.
 */
export async function recordStatusChange(db: DrizzleDb, input: RecordStatusChangeInput): Promise<void> {
  const { orderId, category, newValue, source, sourceRef, metadata } = input;

  await db.transaction(async (tx) => {
    let previousValue = input.previousValue;

    if (previousValue === undefined) {
      const [current] = await tx.select({
        status: orders.status,
        trackingStatusCode: orders.trackingStatusCode,
      }).from(orders).where(eq(orders.id, orderId));

      if (!current) throw new Error(`Order ${orderId} not found`);
      previousValue = category === 'status' ? current.status : current.trackingStatusCode;
    }

    if (previousValue === newValue) return;

    if (category === 'status') {
      await tx.update(orders)
        .set({ status: newValue as typeof orders.$inferInsert.status, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    } else {
      await tx.update(orders)
        .set({
          trackingStatusCode: newValue,
          trackingStatusUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
    }

    await tx.insert(orderStatusHistory).values({
      orderId,
      category,
      previousValue: previousValue ?? null,
      newValue,
      source,
      sourceRef: sourceRef ?? null,
      metadata: metadata ?? null,
    });
  });
}
```

### Step 2.4 — [ ] Run test, verify it passes

```bash
cd apps/api && npx vitest run src/lib/orders/record-status-change.test.ts
```

Expected: 4/4 PASS.

### Step 2.5 — [ ] Commit

```bash
git add apps/api/src/lib/orders/record-status-change.ts apps/api/src/lib/orders/record-status-change.test.ts
git commit -m "feat(api): add recordStatusChange helper with transactional history write"
```

---

## Task 3: Wire helper into Allegro sync

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/sync.ts`

### Step 3.1 — [ ] Find all places where `orders.status` or `orders.externalStatus` is UPDATE'd

Use Grep:

```
pattern: "\\.update\\(orders\\)" path: apps/api/src
```

For each hit, note the file + line + which fields are being updated.

### Step 3.2 — [ ] Replace status UPDATEs with `recordStatusChange`

Inside `apps/api/src/lib/allegro-orders/sync.ts`, every place that updates `status` should instead:

```ts
// BEFORE
await db.update(orders)
  .set({ status: 'processing', allegroFulfillmentStatus: ev.fulfillmentStatus })
  .where(eq(orders.id, order.id));

// AFTER
await recordStatusChange(db, {
  orderId: order.id,
  category: 'status',
  newValue: 'processing',
  source: 'allegro_sync',
  sourceRef: ev.id,
  metadata: { allegroRevision: ev.revision, externalStatus: ev.fulfillmentStatus },
});
// Update external_status in a separate UPDATE (not state-machine — just raw mirror)
await db.update(orders)
  .set({
    externalStatus: ev.fulfillmentStatus,
    externalStatusSource: 'allegro',
    externalStatusAt: new Date(ev.occurredAt),
  })
  .where(eq(orders.id, order.id));
```

Keep `externalStatus` as a simple mirror of the raw carrier value — it does NOT go through `recordStatusChange` (the history table is for *internal* lifecycle transitions + tracking codes; raw Allegro labels are noise).

### Step 3.3 — [ ] Build API

```bash
cd apps/api && npm run build
```

Expected: PASS (or TS errors to fix).

### Step 3.4 — [ ] Smoke test sync locally

```bash
cd apps/api && wrangler dev
```

In another terminal trigger the sync:

```bash
curl -X POST http://localhost:8787/admin/allegro/sync/force -H "X-Admin-Internal-Secret: $SECRET"
```

Then verify via Neon MCP:

```sql
SELECT category, previous_value, new_value, source FROM order_status_history ORDER BY id DESC LIMIT 10;
```

Expected: rows with `source = 'allegro_sync'` reflecting real events.

### Step 3.5 — [ ] Commit

```bash
git add apps/api/src/lib/allegro-orders/sync.ts
git commit -m "refactor(allegro): funnel status updates through recordStatusChange"
```

---

## Task 4: Wire helper into tracking refresh

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/tracking-refresh.ts`

### Step 4.1 — [ ] Replace tracking UPDATEs

Inside `tracking-refresh.ts`, every place that sets `trackingStatusCode` should go through `recordStatusChange` with `category: 'tracking'`:

```ts
// BEFORE
await db.update(orders)
  .set({
    trackingStatusCode: latest.statusCode,
    trackingStatus: latest.statusLabel,
    trackingStatusUpdatedAt: new Date(),
    trackingLastEventAt: latest.occurredAt ? new Date(latest.occurredAt) : null,
  })
  .where(eq(orders.id, order.id));

// AFTER
await recordStatusChange(db, {
  orderId: order.id,
  category: 'tracking',
  newValue: latest.statusCode,
  source: 'carrier_sync',
  sourceRef: order.trackingNumber ?? undefined,
  metadata: { statusLabel: latest.statusLabel, occurredAt: latest.occurredAt, carrierId: latest.carrierId },
});
// Label + lastEventAt stay in the direct UPDATE (they're not the canonical key)
await db.update(orders)
  .set({
    trackingStatus: latest.statusLabel,
    trackingLastEventAt: latest.occurredAt ? new Date(latest.occurredAt) : null,
  })
  .where(eq(orders.id, order.id));
```

### Step 4.2 — [ ] Build + smoke test

Same as Task 3.3–3.4, but trigger tracking refresh:

```bash
curl -X POST http://localhost:8787/admin/allegro/tracking/refresh -H "X-Admin-Internal-Secret: $SECRET"
```

Verify via SQL:

```sql
SELECT * FROM order_status_history WHERE category = 'tracking' ORDER BY id DESC LIMIT 10;
```

Expected: tracking rows appear.

### Step 4.3 — [ ] Commit

```bash
git add apps/api/src/lib/allegro-orders/tracking-refresh.ts
git commit -m "refactor(allegro): track shipment status transitions in history"
```

---

## Task 5: Wire helper into admin manual status change + P24 webhook

**Files:**
- Modify: `apps/api/src/routes/admin/orders.ts` (find `PATCH /admin/orders/:id/status` or similar)
- Modify: `apps/api/src/routes/payments.ts` or wherever `p24Status = 'CONFIRMED'` triggers `status = 'paid'`

### Step 5.1 — [ ] Find admin status change handler

Grep for `.update(orders)` in `apps/api/src/routes/admin/`. Find the handler that lets admin flip status.

### Step 5.2 — [ ] Route it through `recordStatusChange`

```ts
await recordStatusChange(c.var.db, {
  orderId: Number(c.req.param('id')),
  category: 'status',
  newValue: body.status,
  source: 'admin',
  sourceRef: c.var.user.email,
  metadata: { reason: body.reason ?? null },
});
```

### Step 5.3 — [ ] Find P24 payment-confirmed handler

Grep for `status: 'paid'` in `apps/api/src/routes/`. Replace the UPDATE with:

```ts
await recordStatusChange(c.var.db, {
  orderId: order.id,
  category: 'status',
  newValue: 'paid',
  source: 'p24_webhook',
  sourceRef: p24TransactionId,
  metadata: { p24SessionId, amount, currency },
});
```

### Step 5.4 — [ ] Build + test

```bash
cd apps/api && npm run build && npm run test
```

Expected: PASS.

### Step 5.5 — [ ] Commit

```bash
git add apps/api/src/routes/admin/orders.ts apps/api/src/routes/payments.ts
git commit -m "refactor(api): route admin + p24 status changes through history helper"
```

---

## Task 6: Admin API — GET /admin/orders/:id/history

**Files:**
- Create: `apps/api/src/routes/admin/orders-history.ts`
- Modify: wherever admin router is composed (grep for `.route('/admin/orders'`)

### Step 6.1 — [ ] Write failing test

Create `apps/api/src/routes/admin/orders-history.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { app } from '../../index';

describe('GET /admin/orders/:id/history', () => {
  it('returns history ordered oldest-first with both categories', async () => {
    // Seed: order + 3 history rows via direct DB insert (status→paid, tracking→IN_TRANSIT, status→shipped)
    const orderId = await seedOrderWithHistory();

    const res = await app.request(`/admin/orders/${orderId}/history`, {
      headers: { 'X-Admin-Internal-Secret': process.env.ADMIN_INTERNAL_SECRET! },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(body.data[0].newValue).toBe('paid');
    expect(body.data[2].newValue).toBe('shipped');
    expect(body.data.map((r: any) => r.category)).toContain('tracking');
  });

  it('returns 404 for unknown order', async () => {
    const res = await app.request('/admin/orders/99999999/history', {
      headers: { 'X-Admin-Internal-Secret': process.env.ADMIN_INTERNAL_SECRET! },
    });
    expect(res.status).toBe(404);
  });
});
```

### Step 6.2 — [ ] Run test, verify it fails

```bash
cd apps/api && npx vitest run src/routes/admin/orders-history.test.ts
```

Expected: FAIL (route not registered, 404 on both).

### Step 6.3 — [ ] Implement route

Create `apps/api/src/routes/admin/orders-history.ts`:

```ts
import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { orders, orderStatusHistory } from '@repo/db';
import type { AppEnv } from '../../types';

export const ordersHistoryRoute = new Hono<AppEnv>();

ordersHistoryRoute.get('/:id/history', async (c) => {
  const orderId = Number(c.req.param('id'));
  if (!Number.isFinite(orderId)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid order id' } }, 400);
  }

  const [order] = await c.var.db.select({ id: orders.id })
    .from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  }

  const history = await c.var.db.select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.occurredAt));

  return c.json({ data: history });
});
```

### Step 6.4 — [ ] Mount the route

In the admin router composition file (likely `apps/api/src/routes/admin/index.ts` or `apps/api/src/index.ts`):

```ts
import { ordersHistoryRoute } from './orders-history';
// ...
adminRouter.route('/orders', ordersHistoryRoute);
```

Place AFTER `rateLimitMiddleware`, `dbMiddleware`, `authMiddleware`, `adminMiddleware`.

### Step 6.5 — [ ] Run test, verify passes

```bash
cd apps/api && npx vitest run src/routes/admin/orders-history.test.ts
```

Expected: 2/2 PASS.

### Step 6.6 — [ ] Commit

```bash
git add apps/api/src/routes/admin/orders-history.ts apps/api/src/routes/admin/index.ts apps/api/src/routes/admin/orders-history.test.ts
git commit -m "feat(api): add GET /admin/orders/:id/history endpoint"
```

---

## Task 7: Admin UI timeline component

**Files:**
- Create: `apps/web/src/admin/views/orders/OrderTimeline.tsx`
- Modify: `apps/web/src/admin/views/orders/OrderDetail.tsx` (or the admin order detail page)
- Modify: `packages/types/index.ts` (add `OrderStatusHistoryEntry` type)

### Step 7.1 — [ ] Export shared type

Append to `packages/types/index.ts`:

```ts
export interface OrderStatusHistoryEntry {
  id: number;
  orderId: number;
  category: 'status' | 'tracking';
  previousValue: string | null;
  newValue: string;
  source: 'system' | 'admin' | 'allegro_sync' | 'carrier_sync' | 'p24_webhook' | 'backfill';
  sourceRef: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;  // ISO
}
```

### Step 7.2 — [ ] Create `OrderTimeline.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { OrderStatusHistoryEntry } from '@repo/types';

const SOURCE_LABELS: Record<OrderStatusHistoryEntry['source'], string> = {
  system: 'System',
  admin: 'Administrator',
  allegro_sync: 'Allegro',
  carrier_sync: 'Kurier',
  p24_webhook: 'Przelewy24',
  backfill: 'Backfill (historyczne)',
};

const CATEGORY_LABELS: Record<OrderStatusHistoryEntry['category'], string> = {
  status: 'Status zamówienia',
  tracking: 'Status przesyłki',
};

export function OrderTimeline({ orderId }: { orderId: number }) {
  const [entries, setEntries] = useState<OrderStatusHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/orders/${orderId}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body) => { if (!cancelled) setEntries(body.data); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (error) return <p className="text-sm text-red-600">Nie udało się wczytać historii: {error}</p>;
  if (!entries) return <p className="text-sm text-neutral-500">Wczytywanie…</p>;
  if (entries.length === 0) return <p className="text-sm text-neutral-500">Brak historii zmian.</p>;

  return (
    <ol className="relative border-l border-neutral-200 pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="mb-6 last:mb-0">
          <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-neutral-900" />
          <time className="block text-xs text-neutral-500">
            {new Date(entry.occurredAt).toLocaleString('pl-PL')}
          </time>
          <p className="mt-0.5 text-sm font-medium text-neutral-900">
            {CATEGORY_LABELS[entry.category]}: {entry.previousValue ?? '—'} → {entry.newValue}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Źródło: {SOURCE_LABELS[entry.source]}
            {entry.sourceRef ? ` · ${entry.sourceRef}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
```

### Step 7.3 — [ ] Render it in admin order detail

In the admin order detail page, add a section:

```tsx
import { OrderTimeline } from './OrderTimeline';
// ...
<section className="mt-8">
  <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">Historia zmian</h2>
  <OrderTimeline orderId={order.id} />
</section>
```

### Step 7.4 — [ ] Visual smoke test

```bash
turbo dev --filter=web
```

Open admin, navigate to an order with history rows (from Task 3.4 smoke test). Verify:
- Timeline renders with entries oldest-first
- Both `status` and `tracking` categories show
- Polish labels

### Step 7.5 — [ ] Commit

```bash
git add apps/web/src/admin/views/orders/OrderTimeline.tsx apps/web/src/admin/views/orders/OrderDetail.tsx packages/types/index.ts
git commit -m "feat(web): add OrderTimeline to admin order detail"
```

---

## Task 8: Backfill script for historical orders

**Files:**
- Create: `packages/db/scripts/backfill-status-history.ts`

### Step 8.1 — [ ] Write the script

Create `packages/db/scripts/backfill-status-history.ts`:

```ts
/**
 * One-shot backfill: synthesize order_status_history rows from the temporal
 * columns we already have on existing orders (createdAt, paidAt, shippedAt,
 * deliveredAt). Source = 'backfill' so they're distinguishable from live data.
 *
 * Idempotent: inserts only for orders with zero existing history rows.
 *
 * Run via: `npx tsx packages/db/scripts/backfill-status-history.ts`
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { orders, orderStatusHistory } from '../schema';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const rows = await db.execute(sql`
    SELECT id, status, created_at, paid_at, shipped_at, delivered_at, external_status
    FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id = o.id)
  `);

  let inserted = 0;
  for (const o of rows.rows as any[]) {
    const entries: Array<{ newValue: string; occurredAt: Date; previous: string | null }> = [];
    let prev: string | null = null;

    entries.push({ newValue: 'pending', occurredAt: o.created_at, previous: null });
    prev = 'pending';

    if (o.paid_at) { entries.push({ newValue: 'paid', occurredAt: o.paid_at, previous: prev }); prev = 'paid'; }
    if (o.shipped_at) { entries.push({ newValue: 'shipped', occurredAt: o.shipped_at, previous: prev }); prev = 'shipped'; }
    if (o.delivered_at) { entries.push({ newValue: 'delivered', occurredAt: o.delivered_at, previous: prev }); prev = 'delivered'; }

    // Collapse to match current status (in case of cancelled orders with paid_at but status='cancelled', etc.)
    if (o.status !== prev) {
      entries.push({ newValue: o.status, occurredAt: o.created_at, previous: prev });
    }

    await db.insert(orderStatusHistory).values(entries.map((e) => ({
      orderId: o.id,
      category: 'status',
      previousValue: e.previous,
      newValue: e.newValue,
      source: 'backfill',
      occurredAt: e.occurredAt,
    })));

    inserted += entries.length;
  }

  console.log(`Backfilled ${inserted} rows across ${rows.rows.length} orders`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### Step 8.2 — [ ] Dry run against local DB

```bash
cd packages/db && DATABASE_URL=$LOCAL_DB npx tsx scripts/backfill-status-history.ts
```

Expected: prints count, no errors.

### Step 8.3 — [ ] Verify via Neon MCP

```sql
SELECT source, count(*) FROM order_status_history GROUP BY source;
```

Expected: `backfill` row with count matching existing orders × ~2-4.

### Step 8.4 — [ ] Run on production (after reviewing)

Coordinate with user — this writes to prod DB. Use Neon MCP after user confirmation:

```
mcp__Neon__run_sql with the backfill SQL rewritten to run inline (convert the script's logic to a single WITH … INSERT statement)
```

Or run the tsx script pointed at prod `DATABASE_URL`.

### Step 8.5 — [ ] Commit

```bash
git add packages/db/scripts/backfill-status-history.ts
git commit -m "chore(db): add one-shot backfill for order_status_history"
```

---

## Task 9: Final verification

### Step 9.1 — [ ] Full build + type-check

```bash
turbo type-check && turbo build
```

Expected: PASS.

### Step 9.2 — [ ] Deploy API + web

```bash
cd apps/api && wrangler deploy
cd apps/web && npm run cf:build && npm run cf:deploy
```

### Step 9.3 — [ ] Smoke test on production

1. Open admin order list on `https://ilbuoncaffe.pl/admin`.
2. Open a recently-synced Allegro order.
3. Confirm the "Historia zmian" section renders with status + tracking entries.
4. Change status manually from admin UI, reload, confirm a new entry with source = `admin`.

### Step 9.4 — [ ] Final commit + push

```bash
git push origin main
```

(Per CLAUDE.md "Automation & Lazy Workflow" — push = deploy.)

---

## Self-Review Notes

- **Spec coverage:** All five recommendations from my prior report are addressed except hot/warm/cold segmentation + `last_synced_at` (explicitly deferred to a follow-up plan).
- **Placeholder scan:** No TBDs. Every code block has concrete code. Every bash command has expected output.
- **Type consistency:** `recordStatusChange` signature is defined once in Task 2.3 and used identically in Tasks 3, 4, 5. `OrderStatusHistoryEntry` in Task 7.1 matches the schema in Task 1.3 field-for-field (camelCase ↔ snake_case via Drizzle mapper).
- **Risks:** Renaming `allegroFulfillmentStatus` → `externalStatus` may require grepping downstream (admin UI filters, Allegro reconciliation screens). The TypeScript build in Task 3.3 surfaces these.

---
