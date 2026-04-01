# Allegro Order Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize all Allegro order status changes (including manual seller changes) by treating every event as a trigger for full checkout-form reconciliation, using `revision` to skip no-op updates.

**Architecture:** Instead of filtering to known event types, every `/order/events` entry triggers `reconcileOrder()` which fetches the full checkout form, compares the `revision` hash against the stored one, and syncs `status` + `fulfillment.status` if changed. Existing creation/payment handlers keep their business logic (stock deduction etc.) — `reconcileOrder` runs as an idempotent follow-up for all events.

**Tech Stack:** Drizzle ORM (schema + migration), TypeScript, Hono.js Cloudflare Workers

---

## File Map

| File | Change |
|---|---|
| `packages/db/schema/index.ts` | Add `allegroRevision` + `allegroFulfillmentStatus` columns to `orders` |
| `apps/api/src/lib/allegro-orders/types.ts` | Add `revision` + `fulfillment` fields to `AllegroCheckoutForm` |
| `apps/api/src/lib/allegro-orders/handlers.ts` | Add `reconcileOrder()`, update `processEvent()` default case |
| `apps/api/src/lib/allegro-orders/sync.ts` | Remove `HANDLED_EVENT_TYPES` filter — process all events |

---

### Task 1: Add columns to DB schema

**Files:**
- Modify: `packages/db/schema/index.ts` (orders table, after `externalId` column, ~line 403)

- [ ] **Step 1: Add two columns to the orders table**

In `packages/db/schema/index.ts`, after the line:
```ts
  externalId: varchar('external_id', { length: 100 }),
```
Add:
```ts
  // ===== Allegro reconciliation =====
  allegroRevision: varchar('allegro_revision', { length: 50 }),
  allegroFulfillmentStatus: varchar('allegro_fulfillment_status', { length: 50 }),
```

- [ ] **Step 2: Generate migration SQL**

```bash
cd packages/db && npx drizzle-kit generate
```
Expected: creates a new SQL file in `drizzle/` with two `ALTER TABLE orders ADD COLUMN` statements. Review it — make sure there are no DROP statements.

- [ ] **Step 3: Push to dev database**

```bash
cd packages/db && npx drizzle-kit push
```
Expected: `[✓] Changes applied`

- [ ] **Step 4: Commit**

```bash
git add packages/db/schema/index.ts packages/db/drizzle/
git commit -m "feat(db): add allegroRevision and allegroFulfillmentStatus to orders"
```

---

### Task 2: Extend AllegroCheckoutForm type

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/types.ts`

- [ ] **Step 1: Add `revision` and `fulfillment` to the interface**

In `apps/api/src/lib/allegro-orders/types.ts`, replace:
```ts
export interface AllegroCheckoutForm {
  id:     string
  status: string
  buyer: {
```
With:
```ts
export interface AllegroCheckoutForm {
  id:        string
  status:    string
  revision?: string
  fulfillment?: {
    status: string  // NEW | PROCESSING | READY_FOR_SHIPMENT | READY_FOR_PICKUP | SENT | PICKED_UP | CANCELLED | SUSPENDED | RETURNED
  }
  buyer: {
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/allegro-orders/types.ts
git commit -m "feat(allegro): add revision and fulfillment fields to AllegroCheckoutForm type"
```

---

### Task 3: Add `reconcileOrder()` and update `processEvent()`

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/handlers.ts`

- [ ] **Step 1: Add import for new schema columns**

At the top of `handlers.ts`, the import from `@repo/db/schema` currently is:
```ts
import {
  orders,
  orderItems,
  products,
  allegroSyncLog,
  stockChanges,
} from '@repo/db/schema'
```
No change needed — `orders` already covers the new columns.

- [ ] **Step 2: Add `reconcileOrder()` function**

Add this function before `processEvent` (after `handleCancelled`):

```ts
/**
 * reconcileOrder — Idempotent status sync for ANY event type.
 *
 * Called after every event (including unknown types). Fetches current
 * checkout-form state and syncs status + fulfillmentStatus if revision changed.
 *
 * Status mapping:
 *   Allegro status CANCELLED           → local 'cancelled' (+ stock restore)
 *   Allegro fulfillment.status CANCELLED → local 'cancelled' (+ stock restore)
 *   Allegro fulfillment.status SENT     → local 'shipped'
 *   Other changes                       → update allegroFulfillmentStatus only
 */
export async function reconcileOrder(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
): Promise<void> {
  const [existing] = await db
    .select({
      id:                      orders.id,
      status:                  orders.status,
      allegroRevision:         orders.allegroRevision,
      allegroFulfillmentStatus: orders.allegroFulfillmentStatus,
    })
    .from(orders)
    .where(eq(orders.externalId, form.id))
    .limit(1)

  if (!existing) return // not our order (e.g. cancelled before BOUGHT was processed)

  // Skip if Allegro says nothing changed
  if (form.revision && form.revision === existing.allegroRevision) return

  const allegroStatus      = form.status                   // BOUGHT | FILLED_IN | READY_FOR_PROCESSING | CANCELLED
  const fulfillmentStatus  = form.fulfillment?.status ?? null // NEW | PROCESSING | SENT | CANCELLED | ...

  const isCancelled =
    allegroStatus === 'CANCELLED' ||
    fulfillmentStatus === 'CANCELLED'

  const isSent = fulfillmentStatus === 'SENT' || fulfillmentStatus === 'PICKED_UP'

  let newLocalStatus: string | null = null

  if (isCancelled && existing.status !== 'cancelled') {
    newLocalStatus = 'cancelled'
  } else if (isSent && existing.status !== 'cancelled' && existing.status !== 'shipped' && existing.status !== 'delivered') {
    newLocalStatus = 'shipped'
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    allegroRevision:          form.revision ?? null,
    allegroFulfillmentStatus: fulfillmentStatus,
    updatedAt:                new Date(),
  }

  if (newLocalStatus) {
    updatePayload.status = newLocalStatus
    if (newLocalStatus === 'shipped') {
      updatePayload.shippedAt = new Date()
    }
  }

  await db
    .update(orders)
    .set(updatePayload)
    .where(eq(orders.externalId, form.id))

  // If newly cancelled AND was previously paid → restore stock
  if (newLocalStatus === 'cancelled' &&
      (existing.status === 'paid' || existing.status === 'processing' || existing.status === 'shipped')) {
    const items = await db
      .select({ productSku: orderItems.productSku, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, existing.id))

    for (const item of items) {
      const [product] = await db
        .select({ sku: products.sku, stock: products.stock })
        .from(products)
        .where(eq(products.sku, item.productSku))
        .limit(1)

      if (!product) continue

      const newStock = product.stock + item.quantity
      await db
        .update(products)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(products.sku, product.sku))

      await db.insert(stockChanges).values({
        productSku:    product.sku,
        previousStock: product.stock,
        newStock,
        change:        item.quantity,
        reason:        'order',
        orderId:       existing.id,
        notes:         `Zwrot stocku: reconcile (${allegroStatus}/${fulfillmentStatus ?? '-'})`,
      })
    }
  }

  if (newLocalStatus) {
    console.log(`[AllegroOrders] reconcile → ${newLocalStatus} (allegro id: ${form.id}, fulfillment: ${fulfillmentStatus ?? '-'})`)
  }
}
```

- [ ] **Step 3: Update `processEvent()` to call `reconcileOrder` for all events**

Replace the current `processEvent` function:

```ts
export async function processEvent(
  db: ReturnType<typeof createDb>,
  apiBase: string,
  accessToken: string,
  event: AllegroOrderEvent,
  kv: KVNamespace,
): Promise<boolean> {
  const checkoutFormId = event.order.checkoutForm.id

  const form = await fetchCheckoutForm(apiBase, accessToken, checkoutFormId)
  if (!form) {
    await db.insert(allegroSyncLog).values({
      offerId:      checkoutFormId,
      action:       'order_sync',
      status:       'error',
      errorMessage: `GET /checkout-forms HTTP error`,
      errorCode:    event.type,
    }).catch(() => {})
    return true // advance cursor — unfetchable event should not block progress
  }

  switch (event.type) {
    case 'BOUGHT':
      await handleBought(db, form, kv)
      break
    case 'FILLED_IN':
      await handleFilledIn(db, form, kv)
      break
    case 'READY_FOR_PROCESSING':
      await handleReadyForProcessing(db, form, kv)
      break
    case 'BUYER_CANCELLED':
    case 'AUTO_CANCELLED':
      await handleCancelled(db, form, event.type)
      break
  }

  // ★ Reconcile for ALL event types — catches manual seller changes,
  //   fulfillment status updates, and any future Allegro event types.
  //   Idempotent: revision check prevents unnecessary DB writes.
  await reconcileOrder(db, form)

  return true
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/allegro-orders/handlers.ts
git commit -m "feat(allegro): add reconcileOrder for event-triggered full status sync"
```

---

### Task 4: Remove HANDLED_EVENT_TYPES filter in sync.ts

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/sync.ts`

Currently `sync.ts` filters events before deduplication:
```ts
const events = allEvents.filter(e => HANDLED_EVENT_TYPES.has(e.type))
```
This silently skips unknown event types. We want ALL events to trigger reconciliation.

- [ ] **Step 1: Remove the filter, use allEvents directly**

In `sync.ts`, find this block (~line 129):
```ts
    const allEvents = eventsJson.events ?? []
    const events = allEvents.filter(e => HANDLED_EVENT_TYPES.has(e.type))

    // ★ No events at all — we're caught up. No DB connection needed.
    if (allEvents.length === 0) break

    // If only non-handled events, just advance KV cursor (no DB)
    if (events.length === 0) {
      const pageLastId = allEvents[allEvents.length - 1]?.id
      if (pageLastId && pageLastId !== nextFrom) {
        await kv.put(CURSOR_KV_KEY, pageLastId)
      }
      if (allEvents.length < PAGE_SIZE) break
      nextFrom = pageLastId ?? nextFrom
      pagesProcessed++
      continue
    }
```

Replace with:
```ts
    const allEvents = eventsJson.events ?? []

    // ★ No events at all — we're caught up. No DB connection needed.
    if (allEvents.length === 0) break

    const events = allEvents // process ALL event types (reconcileOrder handles unknowns)
```

- [ ] **Step 2: Remove the HANDLED_EVENT_TYPES import from sync.ts**

At the top of `sync.ts`, find:
```ts
import { CURSOR_KV_KEY, HANDLED_EVENT_TYPES, type AllegroOrderEvent } from './types'
```
Replace with:
```ts
import { CURSOR_KV_KEY, type AllegroOrderEvent } from './types'
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/sync.ts
git commit -m "feat(allegro): process all event types — reconcileOrder handles status sync universally"
```

---

### Task 5: (Optional cleanup) Remove HANDLED_EVENT_TYPES from types.ts

`HANDLED_EVENT_TYPES` is no longer used anywhere after Task 4. Remove it to avoid confusion.

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/types.ts`

- [ ] **Step 1: Remove the constant**

In `types.ts`, remove:
```ts
export const HANDLED_EVENT_TYPES = new Set([
  'BOUGHT',
  'FILLED_IN',
  'READY_FOR_PROCESSING',
  'BUYER_CANCELLED',
  'AUTO_CANCELLED',
])
```

- [ ] **Step 2: Verify no other file imports it**

```bash
cd apps/api && grep -r "HANDLED_EVENT_TYPES" src/
```
Expected: no output (zero matches).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/types.ts
git commit -m "chore(allegro): remove unused HANDLED_EVENT_TYPES constant"
```

---

## Self-Review

### Spec coverage
- ✅ Manual seller status change → any event triggers reconcileOrder → status synced
- ✅ `fulfillment.status` CANCELLED → local `cancelled` + stock restore
- ✅ `fulfillment.status` SENT → local `shipped`
- ✅ `revision` hash prevents unnecessary DB writes
- ✅ Creation/payment events still go through specific handlers (stock deduction preserved)
- ✅ Unknown future event types automatically handled via reconcileOrder

### Edge cases covered
- Order not found in DB → reconcileOrder returns early (no crash)
- Order already `cancelled` → reconcileOrder skips (idempotent)
- Order already `shipped` or `delivered` → won't downgrade status
- `revision` absent from API response → `form.revision` is `undefined`, condition `form.revision && ...` safely skips the early-return, reconcile runs every time (safe, just slightly less efficient — rare)

### No placeholders
- All code blocks are complete and compilable
- All file paths are exact
- No "TBD" or "handle edge cases" without code
