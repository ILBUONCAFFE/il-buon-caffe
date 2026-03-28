# Foreign Currency Orders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `total_pln`, `exchange_rate`, `rate_date` for foreign-currency Allegro orders (CZK/EUR/HUF) using NBP rates cached in KV, and fix currency display bugs in the admin UI.

**Architecture:** New `apps/api/src/lib/nbp.ts` fetches NBP mid rates with 26h KV cache (`ALLEGRO_KV`, key `nbp_rate:{CUR}:{DATE}`). Called inline during Allegro order sync (handlers.ts), and by a nightly `0 3 * * *` cron that batch-updates all orders with `total_pln IS NULL` grouped by (currency, date) — one UPDATE per group.

**Tech Stack:** Hono.js, Drizzle ORM 0.45, Cloudflare Workers KV (`ALLEGRO_KV`), NBP public REST API, Next.js 16 admin frontend

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/db/schema/index.ts` | Modify | Add `exchangeRate`, `rateDate` to `orders` table |
| `packages/db/migrations/` | Generate | Drizzle migration SQL |
| `apps/api/src/lib/nbp.ts` | **Create** | NBP rate client with KV cache |
| `apps/api/src/lib/allegro-orders/handlers.ts` | Modify | Add `kv` to `processEvent` + handlers; call `getRate` in `handleBought` + `handleReadyForProcessing` |
| `apps/api/src/lib/allegro-orders/sync.ts` | Modify | Pass `kv` to `processEvent` |
| `apps/api/src/lib/allegro-orders/backfill-rates.ts` | **Create** | Nightly cron backfill function |
| `apps/api/src/index.ts` | Modify | Dispatch `backfillExchangeRates` on `0 3 * * *` |
| `apps/api/wrangler.json` | Modify | Add `"0 3 * * *"` to `triggers.crons` |
| `apps/api/src/routes/admin/orders.ts` | Modify | Add `currency`, `totalPln` to list; convert decimal fields in detail |
| `apps/api/src/routes/admin/index.ts` | Modify | Fix `revenueMonth` sum + add HUF to currency symbol map |
| `apps/web/src/admin/views/Orders/index.tsx` | Modify | Pass `order.currency` to `formatAmount`; fix revenue sum |

---

## Task 1: Add `exchangeRate` and `rateDate` to DB schema

**Files:**
- Modify: `packages/db/schema/index.ts`

> Note: `date` is already imported in the schema (used on line 166 for `dataRetentionUntil`). No import change needed.

- [ ] **Step 1: Add columns to orders table**

In `packages/db/schema/index.ts`, find line 411:
```typescript
  totalPln: decimal('total_pln', { precision: 10, scale: 2 }),
```
Add the two new columns immediately after it:
```typescript
  totalPln:     decimal('total_pln',     { precision: 10, scale: 2 }),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }),
  rateDate:     date('rate_date'),
```

- [ ] **Step 2: Generate migration**

```bash
cd packages/db && npx drizzle-kit generate
```
Expected: new file in `packages/db/migrations/` containing:
```sql
ALTER TABLE "orders" ADD COLUMN "exchange_rate" numeric(10,6);
ALTER TABLE "orders" ADD COLUMN "rate_date" date;
```
Review to confirm no DROP statements.

- [ ] **Step 3: Apply migration to dev DB**

```bash
cd packages/db && npx drizzle-kit push
```
Expected: `[✓] Changes applied`

- [ ] **Step 4: Commit**

```bash
git add packages/db/schema/index.ts packages/db/migrations/
git commit -m "feat(db): add exchange_rate + rate_date columns to orders"
```

---

## Task 2: Create NBP rate client

**Files:**
- Create: `apps/api/src/lib/nbp.ts`

- [ ] **Step 1: Create the file**

Create `apps/api/src/lib/nbp.ts` with this exact content:

```typescript
/**
 * NBP (Narodowy Bank Polski) exchange rate client
 *
 * Rate semantics: 1 unit of foreign currency = `rate` PLN
 * e.g. getRate('CZK', ...) → { rate: 0.1623, ... } means 1 CZK = 0.1623 PLN
 *
 * Caches in Cloudflare KV for 26h (NBP publishes once daily ~12:00 Warsaw).
 * Falls back up to 5 calendar days for weekends/holidays/unpublished dates.
 */

export type ForeignCurrency = 'CZK' | 'EUR' | 'HUF'

export interface NbpRate {
  rate:     number  // 1 foreign unit = rate PLN (NBP table A mid rate)
  rateDate: string  // YYYY-MM-DD (NBP effectiveDate)
}

export async function getRate(
  currency: ForeignCurrency,
  date: Date,
  kv: KVNamespace,
): Promise<NbpRate> {
  const dateStr  = toDateStr(date)
  const cacheKey = `nbp_rate:${currency}:${dateStr}`

  // 1. KV cache check — avoids repeated NBP subrequests for same currency+day
  const cached = await kv.get(cacheKey)
  if (cached) return JSON.parse(cached) as NbpRate

  // 2. Fetch from NBP — walk back up to 5 days for weekends/holidays
  const attempt = new Date(date)
  for (let i = 0; i < 5; i++) {
    const attemptStr = toDateStr(attempt)
    const url        = `https://api.nbp.pl/api/exchangerates/rates/a/${currency.toLowerCase()}/${attemptStr}/?format=json`
    const res        = await fetch(url)

    if (res.status === 404) {
      attempt.setDate(attempt.getDate() - 1)
      continue
    }

    if (!res.ok) {
      throw new Error(`NBP API ${res.status} for ${currency} ${attemptStr}`)
    }

    const body  = await res.json() as { rates: Array<{ mid: number; effectiveDate: string }> }
    const entry = body.rates[0]
    if (!entry) throw new Error(`NBP API: empty rates for ${currency} ${attemptStr}`)

    const result: NbpRate = { rate: entry.mid, rateDate: entry.effectiveDate }

    // Cache 26h — covers next-day re-use before NBP publishes new rate
    await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 26 * 60 * 60 })
    return result
  }

  throw new Error(`NBP API: no rate for ${currency} within 5 days of ${dateStr}`)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors from `nbp.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/nbp.ts
git commit -m "feat(allegro): add NBP exchange rate client with KV cache"
```

---

## Task 3: Update handlers.ts — populate exchange rate on insert/update

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/handlers.ts`

- [ ] **Step 1: Add import**

At the top of `handlers.ts`, add after existing imports:
```typescript
import { getRate, type ForeignCurrency } from '../nbp'
```

- [ ] **Step 2: Add shared rate-resolution helper inside the file**

Directly above the `handleBought` function, add this private helper:

```typescript
// ── Shared rate resolution ─────────────────────────────────────────────────

async function resolveRateFields(
  totalAmount: string,
  currency: string,
  orderDate: Date,
  kv: KVNamespace,
): Promise<{ totalPln: string | null; exchangeRate: string | null; rateDate: string | null }> {
  if (currency === 'PLN') {
    return {
      totalPln:     totalAmount,
      exchangeRate: '1.000000',
      rateDate:     orderDate.toISOString().slice(0, 10),
    }
  }
  try {
    const nbp = await getRate(currency as ForeignCurrency, orderDate, kv)
    return {
      totalPln:     (parseFloat(totalAmount) * nbp.rate).toFixed(2),
      exchangeRate: nbp.rate.toFixed(6),
      rateDate:     nbp.rateDate,
    }
  } catch (err) {
    console.warn(`[AllegroOrders] NBP unavailable for ${currency}:`, err instanceof Error ? err.message : err)
    return { totalPln: null, exchangeRate: null, rateDate: null }
  }
}
```

- [ ] **Step 3: Update `handleBought` signature**

Change the function signature from:
```typescript
export async function handleBought(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
): Promise<void> {
```
to:
```typescript
export async function handleBought(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
  kv: KVNamespace,
): Promise<void> {
```

- [ ] **Step 4: Call `resolveRateFields` in `handleBought`**

In `handleBought`, after the existing lines:
```typescript
  const totalAmount    = form.summary.totalToPay.amount
  const currency       = form.summary.totalToPay.currency
```
Add:
```typescript
  const orderDate = new Date()
  const { totalPln, exchangeRate, rateDate } = await resolveRateFields(totalAmount, currency, orderDate, kv)
```

In the `db.insert(orders).values({...})` call, replace:
```typescript
    totalPln:       currency === 'PLN' ? totalAmount : null,
```
with:
```typescript
    totalPln,
    exchangeRate,
    rateDate,
```

- [ ] **Step 5: Update `handleReadyForProcessing` signature**

Change from:
```typescript
export async function handleReadyForProcessing(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
): Promise<void> {
```
to:
```typescript
export async function handleReadyForProcessing(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
  kv: KVNamespace,
): Promise<void> {
```

- [ ] **Step 6: Call `resolveRateFields` in `handleReadyForProcessing`**

In `handleReadyForProcessing`, after the existing lines:
```typescript
    const totalAmount    = form.summary.totalToPay.amount
    const currency       = form.summary.totalToPay.currency
```
Add:
```typescript
    const orderDate = new Date()
    const { totalPln, exchangeRate, rateDate } = await resolveRateFields(totalAmount, currency, orderDate, kv)
```

In the `db.insert(orders).values({...})` call (INSERT path), replace:
```typescript
      totalPln:       currency === 'PLN' ? totalAmount : null,
```
with:
```typescript
      totalPln,
      exchangeRate,
      rateDate,
```

Also find the UPDATE path (existing pending order becoming paid) — the `.update(orders).set({ status: 'paid', paidAt, updatedAt: new Date() })` line. Extend its `.set()` to also fill rate fields:
```typescript
      .set({ status: 'paid', paidAt, totalPln, exchangeRate, rateDate, updatedAt: new Date() })
```

- [ ] **Step 7: Update `processEvent` signature and pass `kv`**

Change `processEvent` signature from:
```typescript
export async function processEvent(
  db: ReturnType<typeof createDb>,
  apiBase: string,
  accessToken: string,
  event: AllegroOrderEvent,
): Promise<boolean> {
```
to:
```typescript
export async function processEvent(
  db: ReturnType<typeof createDb>,
  apiBase: string,
  accessToken: string,
  event: AllegroOrderEvent,
  kv: KVNamespace,
): Promise<boolean> {
```

In the switch statement, update the calls that need `kv`:
```typescript
    case 'BOUGHT':
      await handleBought(db, form, kv)
      break
    case 'READY_FOR_PROCESSING':
      await handleReadyForProcessing(db, form, kv)
      break
```
(`handleFilledIn` and `handleCancelled` don't touch amounts — leave them unchanged.)

- [ ] **Step 8: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```
Fix any errors before continuing.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/lib/allegro-orders/handlers.ts
git commit -m "feat(allegro): populate total_pln + exchange_rate inline during order sync"
```

---

## Task 4: Pass `kv` from sync.ts to processEvent

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/sync.ts`

- [ ] **Step 1: Update processEvent call**

In `sync.ts`, find line 185:
```typescript
        const ok = await processEvent(db, apiBase, accessToken, event)
```
Change to:
```typescript
        const ok = await processEvent(db, apiBase, accessToken, event, kv)
```
`kv` is already in scope at the top of `syncAllegroOrders` as `const kv = env.ALLEGRO_KV`.

- [ ] **Step 2: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/sync.ts
git commit -m "fix(allegro): pass kv binding to processEvent for NBP rate lookup"
```

---

## Task 5: Create nightly cron backfill

**Files:**
- Create: `apps/api/src/lib/allegro-orders/backfill-rates.ts`

- [ ] **Step 1: Create the file**

Create `apps/api/src/lib/allegro-orders/backfill-rates.ts`:

```typescript
/**
 * Nightly exchange rate backfill
 *
 * Fills total_pln / exchange_rate / rate_date for orders where total_pln IS NULL.
 * Groups by (currency, DATE(created_at)) — one NBP fetch + one UPDATE per group.
 * Processes last 90 days per run; runs again the next night for older records.
 */

import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, isNull, sql, gte } from 'drizzle-orm'
import { getRate, type ForeignCurrency } from '../nbp'
import type { Env } from '../../index'

const FOREIGN_CURRENCIES: ForeignCurrency[] = ['CZK', 'EUR', 'HUF']

export async function backfillExchangeRates(env: Env): Promise<void> {
  if (!env.DATABASE_URL || !env.ALLEGRO_KV) {
    console.warn('[BackfillRates] Missing DATABASE_URL or ALLEGRO_KV — skipping')
    return
  }

  const db  = createDb(env.DATABASE_URL)
  const kv  = env.ALLEGRO_KV
  const ago = new Date()
  ago.setDate(ago.getDate() - 90)

  // 1. One SELECT DISTINCT — minimal data transfer from DB
  const pairs = await db
    .selectDistinct({
      currency:  orders.currency,
      orderDate: sql<string>`DATE(${orders.createdAt})::text`,
    })
    .from(orders)
    .where(
      and(
        isNull(orders.totalPln),
        sql`${orders.currency} IN ('CZK', 'EUR', 'HUF')`,
        gte(orders.createdAt, ago),
      )
    )

  if (pairs.length === 0) {
    console.log('[BackfillRates] Nothing to backfill')
    return
  }

  console.log(`[BackfillRates] ${pairs.length} (currency, date) pairs to process`)

  let updated = 0
  let errors  = 0

  // 2. One NBP fetch + one batch UPDATE per (currency, date) pair
  for (const { currency, orderDate } of pairs) {
    if (!FOREIGN_CURRENCIES.includes(currency as ForeignCurrency)) continue

    try {
      const nbp = await getRate(currency as ForeignCurrency, new Date(orderDate), kv)

      await db
        .update(orders)
        .set({
          totalPln:     sql`ROUND(${orders.total}::numeric * ${nbp.rate}, 2)::text`,
          exchangeRate: nbp.rate.toFixed(6),
          rateDate:     nbp.rateDate,
        })
        .where(
          and(
            isNull(orders.totalPln),
            sql`${orders.currency} = ${currency}`,
            sql`DATE(${orders.createdAt})::text = ${orderDate}`,
          )
        )

      updated++
      console.log(`[BackfillRates] ${currency} ${orderDate} @ ${nbp.rate} PLN`)
    } catch (err) {
      errors++
      console.error(`[BackfillRates] ${currency} ${orderDate} failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`[BackfillRates] Done — ${updated} groups updated, ${errors} errors`)
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```
Fix any errors (likely Drizzle type issues with `sql` template — adjust casting as needed).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/backfill-rates.ts
git commit -m "feat(allegro): nightly exchange rate backfill for null total_pln orders"
```

---

## Task 6: Wire backfill cron in index.ts and wrangler.json

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/wrangler.json`

- [ ] **Step 1: Add cron to wrangler.json**

In `apps/api/wrangler.json`, find the `triggers.crons` array:
```json
"triggers": {
  "crons": [
    "0 * * * *",
    "*/5 * * * *",
    "0 5 * * *"
  ]
}
```
Add the backfill trigger:
```json
"triggers": {
  "crons": [
    "0 * * * *",
    "*/5 * * * *",
    "0 5 * * *",
    "0 3 * * *"
  ]
}
```

- [ ] **Step 2: Import backfill function in index.ts**

In `apps/api/src/index.ts`, add alongside other allegro imports:
```typescript
import { backfillExchangeRates } from './lib/allegro-orders/backfill-rates'
```

- [ ] **Step 3: Dispatch in scheduled handler**

In the `scheduled` handler, the current structure is:
```typescript
    if (event.cron === '*/5 * * * *') {
      ctx.waitUntil(syncAllegroOrders(env))
    } else if (event.cron === '0 5 * * *') {
      ctx.waitUntil(preWarmAllegroQualityCache(env))
    } else {
      // hourly: token refresh + data retention
      ctx.waitUntil(autoRefreshAllegroToken(env))
      ctx.waitUntil(dataRetentionCleanup(env))
    }
```
Insert the new branch between `0 5 * * *` and the `else`:
```typescript
    if (event.cron === '*/5 * * * *') {
      ctx.waitUntil(syncAllegroOrders(env))
    } else if (event.cron === '0 5 * * *') {
      ctx.waitUntil(preWarmAllegroQualityCache(env))
    } else if (event.cron === '0 3 * * *') {
      // Daily at 04:00 CET (03:00 UTC) — backfill exchange rates for foreign currency orders
      ctx.waitUntil(backfillExchangeRates(env))
    } else {
      // Default: hourly token refresh + data retention
      ctx.waitUntil(autoRefreshAllegroToken(env))
      ctx.waitUntil(dataRetentionCleanup(env))
    }
```

Also update the comment at the top of the scheduled handler to document the new cron:
```typescript
    // "0 * * * *"   — hourly token refresh + daily retention cleanup
    // "*/5 * * * *" — every 5 min Allegro order polling
    // "0 5 * * *"   — daily at 06:00 CET — pre-warm Allegro sales quality cache
    // "0 3 * * *"   — daily at 04:00 CET — backfill exchange rates (total_pln)
```

- [ ] **Step 4: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/wrangler.json
git commit -m "feat(infra): add 04:00 CET cron for exchange rate backfill"
```

---

## Task 7: Fix admin orders API responses

**Files:**
- Modify: `apps/api/src/routes/admin/orders.ts`

- [ ] **Step 1: Add `currency` and `totalPln` to orders list query columns**

In `GET /admin/orders`, find the `db.query.orders.findMany({ columns: { ... } })` call (around line 52). The current columns are:
```typescript
          id: true, orderNumber: true, source: true, externalId: true,
          status: true, total: true, subtotal: true, shippingCost: true,
          customerData: true, paymentMethod: true, shippingMethod: true,
          trackingNumber: true, paidAt: true, shippedAt: true, createdAt: true,
          updatedAt: true, internalNotes: true, notes: true,
```
Add `currency` and `totalPln`:
```typescript
          id: true, orderNumber: true, source: true, externalId: true,
          status: true, total: true, subtotal: true, shippingCost: true,
          currency: true, totalPln: true,
          customerData: true, paymentMethod: true, shippingMethod: true,
          trackingNumber: true, paidAt: true, shippedAt: true, createdAt: true,
          updatedAt: true, internalNotes: true, notes: true,
```

- [ ] **Step 2: Update list response map to convert decimal fields**

Find the `rows.map(o => ({...}))` block (around line 77):
```typescript
    const data = rows.map(o => ({
      ...o,
      total:        Number(o.total),
      subtotal:     Number(o.subtotal),
      shippingCost: Number(o.shippingCost ?? 0),
      itemsCount:   o.items.length,
    }))
```
Add `totalPln` conversion:
```typescript
    const data = rows.map(o => ({
      ...o,
      total:        Number(o.total),
      subtotal:     Number(o.subtotal),
      shippingCost: Number(o.shippingCost ?? 0),
      totalPln:     o.totalPln != null ? Number(o.totalPln) : null,
      itemsCount:   o.items.length,
    }))
```
(`currency` is already a string — the `...o` spread includes it as-is.)

- [ ] **Step 3: Update order detail response to convert new decimal fields**

In `GET /admin/orders/:id`, find the response (around line 118):
```typescript
    return c.json({
      success: true,
      data: {
        ...order,
        total:        Number(order.total),
        subtotal:     Number(order.subtotal),
        shippingCost: Number(order.shippingCost ?? 0),
      },
    })
```
Replace with:
```typescript
    return c.json({
      success: true,
      data: {
        ...order,
        total:        Number(order.total),
        subtotal:     Number(order.subtotal),
        shippingCost: Number(order.shippingCost ?? 0),
        totalPln:     order.totalPln     != null ? Number(order.totalPln)     : null,
        exchangeRate: order.exchangeRate != null ? Number(order.exchangeRate) : null,
        rateDate:     order.rateDate     ?? null,
      },
    })
```

- [ ] **Step 4: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/orders.ts
git commit -m "fix(api): expose currency, totalPln, exchangeRate, rateDate in admin orders responses"
```

---

## Task 8: Fix admin/index.ts — revenueMonth stat and HUF symbol

**Files:**
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 1: Fix `revenueMonth` query**

Find the query around line 107:
```typescript
      // Monthly revenue (paid + processing + shipped + delivered)
      db.select({ total: sql<number>`SUM(CAST(${orders.total} AS NUMERIC))` })
        .from(orders)
        .where(and(
          gte(orders.createdAt, thirtyDaysAgo),
          sql`${orders.status} IN ('paid', 'processing', 'shipped', 'delivered')`,
        )),
```
Replace with:
```typescript
      // Monthly revenue — PLN-normalised (uses total_pln when available)
      db.select({
        total: sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)), 0)`,
      })
        .from(orders)
        .where(and(
          gte(orders.createdAt, thirtyDaysAgo),
          sql`${orders.status} IN ('paid', 'processing', 'shipped', 'delivered')`,
        )),
```
The `CASE WHEN currency = 'PLN'` ensures that orders without `total_pln` (PLN orders) are still counted, while foreign-currency orders with no rate yet are excluded rather than inflating the total.

- [ ] **Step 2: Add HUF to currencySymbol map**

Find:
```typescript
    const currencySymbol: Record<string, string> = { PLN: 'zł', EUR: '€', CZK: 'Kč' }
```
Replace with:
```typescript
    const currencySymbol: Record<string, string> = { PLN: 'zł', EUR: '€', CZK: 'Kč', HUF: 'Ft' }
```

- [ ] **Step 3: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin/index.ts
git commit -m "fix(api): normalize revenueMonth to PLN; add HUF symbol"
```

---

## Task 9: Fix frontend — currency display and revenue sum

**Files:**
- Modify: `apps/web/src/admin/views/Orders/index.tsx`

- [ ] **Step 1: Fix `formatAmount` call in orders table**

Find line 347:
```typescript
                          {formatAmount(order.total)}
```
Change to:
```typescript
                          {formatAmount(order.total, order.currency)}
```

- [ ] **Step 2: Fix revenue sum in page stats**

Find line 169:
```typescript
    revenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
```
Replace with:
```typescript
    revenue: orders.filter(o => o.status !== 'cancelled').reduce(
      (s, o) => s + Number(o.totalPln ?? (o.currency === 'PLN' ? o.total : 0)),
      0,
    ),
```

- [ ] **Step 3: Update order type if explicitly defined**

Search the file for a TypeScript `type` or `interface` that describes order objects from the API (look for `total:`, `status:`, `source:`). If found, add the new fields:
```typescript
  currency:     string
  totalPln:     number | null
  exchangeRate: number | null
  rateDate:     string | null
```
If orders use an imported type from `@repo/types`, update `packages/types/index.ts` instead.

- [ ] **Step 4: Type-check frontend**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```
Fix any type errors.

- [ ] **Step 5: Build**

```bash
turbo build --filter=web 2>&1 | tail -15
```
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/admin/views/Orders/index.tsx
git commit -m "fix(web): show correct currency symbol and PLN-normalised revenue in orders view"
```

---

## Final Verification

- [ ] `turbo type-check` passes across all workspaces
- [ ] DB migration applied: `exchange_rate` and `rate_date` columns present in `orders`
- [ ] Columns `currency: true, totalPln: true` present in orders list query
- [ ] `processEvent` now receives `kv` from `sync.ts`
- [ ] `wrangler.json` has 4 cron entries including `"0 3 * * *"`
- [ ] `index.ts` dispatches `backfillExchangeRates` on `0 3 * * *`
- [ ] Orders list: CZK order shows `629.65 Kč` not `629.65 PLN`
- [ ] Dashboard `revenueMonth` no longer inflates CZK/HUF as PLN
- [ ] After first nightly cron run: historical CZK/EUR/HUF orders have `total_pln` populated
