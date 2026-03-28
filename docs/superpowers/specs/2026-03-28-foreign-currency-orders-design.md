# Foreign Currency Orders — Design Spec
**Date:** 2026-03-28
**Status:** Approved
**Scope:** allegro.cz (CZK), allegro.sk (EUR), allegro.hu (HUF) order handling

---

## Problem

Orders from foreign Allegro marketplaces arrive in local currencies (CZK, EUR, HUF). Currently:
1. `orders.total_pln` is always `null` for non-PLN orders — nothing populates it
2. Admin orders list shows PLN symbol regardless of actual currency (`formatAmount` missing currency arg)
3. Revenue stats and dashboard sum `total` across all currencies treating CZK/HUF/EUR as PLN — producing garbage numbers
4. HeroMetrics hardcodes `suffix="zł"` even for mixed-currency aggregates

The `orders` table already has `currency` (varchar, default PLN) and `total_pln` (decimal, nullable). The sync handler in `handlers.ts` already correctly reads `currency` from Allegro API and sets `total_pln = null` for non-PLN orders.

---

## Solution Overview

**Approach C — Inline fetch + nightly cron backfill:**
- During Allegro sync, attempt to fetch NBP rate inline and populate `total_pln` immediately
- If NBP call fails, leave `total_pln = null` — sync does not fail
- Nightly cron at 03:00 backfills all orders with `total_pln IS NULL`

---

## Section 1: DB Migration

Add two nullable columns to `orders`:

```sql
ALTER TABLE orders
  ADD COLUMN exchange_rate DECIMAL(10,6),   -- 1 foreign unit = X PLN (NBP mid rate)
  ADD COLUMN rate_date DATE;                -- NBP table date used for this rate
```

Drizzle schema additions in `packages/db/schema/index.ts`:
```typescript
exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }),
rateDate:     date('rate_date'),
```

**Why store these?** Polish VAT law (art. 31a ustawy o VAT) requires the exact rate and its date to be auditable per transaction. `total_pln` alone is not enough for accounting.

For PLN orders: `exchange_rate = 1.000000`, `rate_date = order date`, `total_pln = total`.

---

## Section 2: NBP Client (`apps/api/src/lib/nbp.ts`)

Single exported function:

```typescript
getRate(
  currency: 'CZK' | 'EUR' | 'HUF',
  date: Date,
  kv: KVNamespace
): Promise<{ rate: number; rateDate: string }>
```

**Logic:**
1. Build KV key: `nbp_rate:{CUR}:{YYYY-MM-DD}` (e.g. `nbp_rate:CZK:2026-03-28`)
2. KV cache hit → return immediately (zero subrequests to NBP)
3. Cache miss → `GET https://api.nbp.pl/api/exchangerates/rates/a/{currency}/{date}/?format=json`
4. On 404 (weekend / public holiday / rate not yet published before ~12:00 Warsaw time) → decrement date by 1 day, retry up to 5 times
5. On success → write to KV with TTL 26h → return `{ rate: mid, rateDate }`
6. On unrecoverable error → throw (caller decides whether to swallow)

**KV namespace:** Reuse existing `ALLEGRO_TOKENS` KV or add dedicated `RATE_CACHE` binding in `wrangler.json` — decided at implementation time based on namespace hygiene preference.

**Subrequest budget:** max 3 currencies × 5 retries = 15 worst-case per cron. Well within Workers 1000 subrequest limit. KV reads are free and ~1ms — dozens of same-day orders never hit NBP more than once per currency.

---

## Section 3: Inline Rate Fetch in handlers.ts

In both `insertOrder` and `updateOrder` functions in `apps/api/src/lib/allegro-orders/handlers.ts`, after parsing `currency` and `totalAmount`:

```typescript
let totalPln: string | null = null
let exchangeRate: string | null = null
let rateDate: string | null = null

if (currency === 'PLN') {
  totalPln    = totalAmount
  exchangeRate = '1.000000'
  rateDate    = today
} else {
  try {
    const orderDate = new Date(form.lineItems[0].boughtAt) // use order date, not now
    const { rate, rateDate: rd } = await getRate(currency as 'CZK'|'EUR'|'HUF', orderDate, kv)
    totalPln     = (parseFloat(totalAmount) * rate).toFixed(2)
    exchangeRate = rate.toFixed(6)
    rateDate     = rd
  } catch {
    // NBP unavailable — leave nulls, cron will backfill
  }
}
```

**Key detail:** Use `form.lineItems[0].boughtAt` (Allegro order date) as the rate lookup date — not `Date.now()`. This is correct for both real-time sync and historical backfill via the `backfill.ts` path.

**KV access:** Pass `c.env` KV binding through to `getRate`. No `waitUntil` needed — rate fetch is synchronous before DB write.

---

## Section 4: Nightly Cron Backfill

New cron trigger: `0 3 * * *` (03:00 UTC daily), added to the existing `scheduled` handler in `apps/api/src/index.ts`.

**Algorithm — optimized for minimal DB and Workers usage:**

```
Step 1 — one SELECT DISTINCT query:
  SELECT DISTINCT currency, DATE(created_at) AS order_date
  FROM orders
  WHERE total_pln IS NULL
    AND currency != 'PLN'
    AND created_at >= NOW() - INTERVAL '90 days'
  ORDER BY order_date DESC

Step 2 — fetch rates (KV-cached, deduplicated):
  For each unique (currency, order_date) pair → getRate()
  e.g. 3 currencies × 7 days = 21 pairs max in first week

Step 3 — one batch UPDATE per (currency, order_date):
  UPDATE orders
  SET total_pln    = ROUND(total::numeric * $rate, 2),
      exchange_rate = $rate,
      rate_date     = $rateDate
  WHERE currency = $cur
    AND DATE(created_at) = $orderDate
    AND total_pln IS NULL
```

**Optimizations:**
- `SELECT DISTINCT` — minimal data transfer from DB
- In-memory grouping in Worker — one UPDATE per (currency, date) group, not per order row
- 90-day rolling window per run — protects against overwhelming Workers on first backfill with large history; older orders processed in subsequent nightly runs
- KV cache means today's rates already populated by inline sync — cron only hits NBP for historical dates

---

## Section 5: Display Fixes

### 5a. Orders list — wrong currency symbol
**File:** `apps/web/src/admin/views/Orders/index.tsx:347`

```typescript
// Before:
formatAmount(order.total)
// After:
formatAmount(order.total, order.currency)
```

`formatAmount` already accepts a second `currency` argument (line 72-73) — this is a one-line fix.

### 5b. Order detail — show PLN equivalent
**File:** `apps/api/src/routes/admin/orders.ts` — ensure `totalPln`, `exchangeRate`, `rateDate` are included in the `GET /admin/orders/:id` response.

**Frontend order detail view** — add when `currency !== 'PLN'`:
```
629.65 Kč  (~102.25 zł po kursie 0.1623 z 27.03.2026)
```

### 5c. Revenue summary in orders list
**File:** `apps/web/src/admin/views/Orders/index.tsx:169`

```typescript
// Before:
revenue = reduce((s, o) => s + Number(o.total), 0)
// After:
revenue = reduce((s, o) => s + Number(o.totalPln ?? (o.currency === 'PLN' ? o.total : 0)), 0)
```

Excludes orders where PLN equivalent is not yet known (avoids inflated numbers from raw CZK/HUF amounts).

### 5d. Dashboard stats — HeroMetrics + RevenueChart
**Backend** (`GET /admin/stats`, `GET /admin/activity`): revenue aggregation switches to:

```sql
SUM(COALESCE(total_pln, CASE WHEN currency = 'PLN' THEN total ELSE NULL END))
```

Only orders with a known PLN value contribute to revenue totals. `suffix="zł"` in HeroMetrics stays correct — the value is always in PLN.

---

## Data Flow Summary

```
Allegro API order (CZK)
  → handlers.ts parses currency + totalAmount
  → getRate('CZK', orderDate, kv)
      → KV hit: return cached rate
      → KV miss: NBP API → cache → return rate
  → compute totalPln, exchangeRate, rateDate
  → INSERT/UPDATE orders (all fields populated)

03:00 cron
  → SELECT DISTINCT currency, date WHERE total_pln IS NULL
  → getRate() per pair (KV-cached)
  → batch UPDATE orders per (currency, date)

Admin panel
  → formatAmount(total, currency) → "629.65 Kč"
  → totalPln for PLN equivalent display
  → revenue stats sum COALESCE(total_pln, ...) → always PLN
```

---

## Files Changed

| File | Change |
|------|--------|
| `packages/db/schema/index.ts` | Add `exchangeRate`, `rateDate` columns to `orders` |
| `packages/db/` | Generate + apply migration |
| `apps/api/src/lib/nbp.ts` | New — NBP client with KV cache |
| `apps/api/src/lib/allegro-orders/handlers.ts` | Inline rate fetch for non-PLN orders |
| `apps/api/src/index.ts` | Add nightly cron trigger (03:00) |
| `apps/api/src/lib/allegro-orders/backfill-rates.ts` | New — cron backfill logic |
| `apps/api/wrangler.json` | Add cron trigger, optionally add `RATE_CACHE` KV binding |
| `apps/api/src/routes/admin/orders.ts` | Include `totalPln`, `exchangeRate`, `rateDate` in order detail response |
| `apps/web/src/admin/views/Orders/index.tsx` | Fix `formatAmount` call + revenue sum |
| `apps/web/src/admin/views/Orders/OrderDetail` | Show PLN equivalent for foreign currency orders |

---

## Out of Scope

- HUF symbol (Ft) — add to `currencySymbol` map in `routes/admin/index.ts` alongside existing PLN/EUR/CZK
- allegro.sk uses EUR — same flow, no special handling needed
- Przelewy24 payments are always PLN — no changes to payment flow
- Rate reconciliation with actual Allegro Finance wallet conversions — manual process, not automatable via API
