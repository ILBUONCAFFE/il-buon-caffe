# Allegro Return Rate — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Goal

Calculate and display a return rate (%) in the `SalesQualityCard` alongside the existing returns count. Rate is only shown when the DB order sync is non-empty (guard against misleading inflated rates from incomplete sync).

## Formula

```
ratePercent = returnsCount / ordersCount * 100
```

- **Window:** rolling 90 days (matches Allegro quality metric window)
- **Guard:** if `ordersCount === 0` → `ratePercent = undefined` (not displayed)

---

## Data Sources

### Numerator — `returnsCount`

**Endpoint:** `GET /order/customer-returns`
**Parameters:** `status=FINISHED&createdAt.gte={90daysAgo}&limit=1`
**Field:** `response.count` (total count, no pagination needed)

> Only `FINISHED` returns are counted. `CREATED` status = buyer initiated but not resolved — excluded to avoid false positives.

Current call (`?limit=1`, no filters) is replaced with the filtered version.

### Denominator — `ordersCount`

**Source:** Neon DB (`orders` table)
**Query:**
```sql
SELECT COUNT(*) FROM orders
WHERE source = 'allegro'
  AND status != 'cancelled'
  AND created_at >= now() - interval '90 days'
```

Cancelled orders excluded — they never reached fulfillment so should not be in the denominator.

**Limitation:** Denominator is only as complete as our Allegro order sync. If the sync cron has gaps, the denominator is understated and the rate is inflated. The `ordersCount === 0` guard protects against the worst case (no synced orders at all), but partial sync gaps are a known accepted limitation.

---

## Type Changes (`packages/types/index.ts`)

```ts
returns: {
  count: number        // always present — from /order/customer-returns (FINISHED, 90d)
  ratePercent?: number // optional — undefined when ordersCount === 0
}
```

---

## Backend Changes (`apps/api/src/routes/allegro.ts`)

### `fetchAllegroQualityData` signature

Add `db` parameter (Drizzle client):

```ts
async function fetchAllegroQualityData(
  accessToken: string,
  environment: AllegroEnvironment,
  db: DrizzleClient,
): Promise<AllegroSalesQuality>
```

### Inside the function

1. Change returns call: `?status=FINISHED&createdAt.gte={90daysAgo}&limit=1`
2. After Allegro calls resolve, query DB for orders count (same 90d window)
3. Compute rate:
   ```ts
   const ratePercent = ordersCount > 0
     ? (returnsCount / ordersCount) * 100
     : undefined
   ```

### Callers — pass `db`

Two callers need updating:
- `GET /quality` route handler — already has `c.var.db` via `dbMiddleware`
- Cron trigger for quality refresh — needs `db` passed in

---

## Frontend Changes (`SalesQualityCard.tsx`)

Column "Zwroty" already shows `returns.count`. Add conditional rate display:

```tsx
<p className="font-semibold text-[#1A1A1A] tabular-nums">{quality.returns.count}</p>
{quality.returns.ratePercent != null && (
  <p className="text-[#A3A3A3] tabular-nums">({quality.returns.ratePercent.toFixed(1)}%)</p>
)}
```

No changes needed if `ratePercent` is `undefined` — the line simply doesn't render.

---

## Error Handling

- DB query fails → treat as `ordersCount = 0` → `ratePercent = undefined` (degrade gracefully, don't break the whole quality fetch)
- `/order/customer-returns` fails → existing behavior: `returnsCount = 0`

---

## What Is Not Changing

- KV cache key (`QUALITY_CACHE`), TTL (24h), cron schedule (6:00 AM) — unchanged
- `returns.count` semantics — still always present
- All other `AllegroSalesQuality` fields — unchanged
- No new endpoints, no new KV keys
