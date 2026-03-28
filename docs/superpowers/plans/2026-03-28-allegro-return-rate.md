# Allegro Return Rate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculate and display `returns.ratePercent` in `SalesQualityCard` using FINISHED customer-returns (90-day window) as numerator and synced Allegro orders from our DB as denominator; omit rate display entirely when DB has no orders for the window (incomplete sync guard).

**Architecture:** `fetchAllegroQualityData` receives a `db: Database` parameter. The returns API call gets `status=FINISHED` + `createdAt.gte` filters. A Drizzle `count()` query on the `orders` table provides the denominator. `ratePercent` is `undefined` when `ordersCount === 0`. The `GET /quality` route gains `dbMiddleware`. `preWarmAllegroQualityCache` creates a DB client from `env.DATABASE_URL` (HTTP mode already set before cron handlers run).

**Tech Stack:** Hono.js (Cloudflare Workers), Drizzle ORM + Neon HTTP, Next.js App Router, TypeScript

---

## Files

| File | Change |
|------|--------|
| `packages/types/index.ts` | `ratePercent?: number` (make optional) |
| `apps/api/src/routes/allegro.ts` | Add `db` param to `fetchAllegroQualityData`; filtered returns call; DB orders count; update both callers |
| `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx` | Render rate conditionally |

---

## Task 1: Make `ratePercent` optional in shared types

**Files:**
- Modify: `packages/types/index.ts` (around line 549)

- [ ] **Step 1: Update `returns` shape**

Find the `returns` block inside `AllegroSalesQuality` and replace it:

```ts
// BEFORE
returns: {
  count: number                                // e.g. 12 (from /order/customer-returns)
  ratePercent: number                          // e.g. 1.2
}

// AFTER
returns: {
  count: number        // from /order/customer-returns (FINISHED, 90-day window)
  ratePercent?: number // undefined when DB ordersCount === 0 (incomplete sync guard)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
turbo type-check
```

Expected: passes (or only fails in `apps/api` until Task 2 fixes the backend — that's fine).

- [ ] **Step 3: Commit**

```bash
git add packages/types/index.ts
git commit -m "feat(types): make AllegroSalesQuality.returns.ratePercent optional"
```

---

## Task 2: Compute return rate in `fetchAllegroQualityData`

**Files:**
- Modify: `apps/api/src/routes/allegro.ts`

**Context:** `fetchAllegroQualityData` lives at line ~745. Two callers:
1. `preWarmAllegroQualityCache` (~line 728) — cron, has `env.DATABASE_URL`
2. `GET /quality` handler (~line 846) — on-demand, currently no `dbMiddleware`

`createDb` is already imported from `@repo/db/client`. `orders` is already imported from `@repo/db/schema`. `and`, `eq` are already imported from `drizzle-orm`.

- [ ] **Step 1: Extend drizzle-orm imports and add Database type**

Find line:
```ts
import { createDb, createDbHttp } from '@repo/db/client'
```
Replace with:
```ts
import { createDb, createDbHttp, type Database } from '@repo/db/client'
```

Find line:
```ts
import { eq, desc, and, lt } from 'drizzle-orm'
```
Replace with:
```ts
import { eq, desc, and, lt, ne, gte, count } from 'drizzle-orm'
```

- [ ] **Step 2: Add `dbMiddleware` import**

Find the imports block (look for other middleware imports). Add:
```ts
import { dbMiddleware } from '../middleware/db'
```

- [ ] **Step 3: Add `db` parameter to `fetchAllegroQualityData`**

Find:
```ts
async function fetchAllegroQualityData(
  accessToken: string,
  environment: AllegroEnvironment,
): Promise<AllegroSalesQuality> {
```
Replace with:
```ts
async function fetchAllegroQualityData(
  accessToken: string,
  environment: AllegroEnvironment,
  db: Database,
): Promise<AllegroSalesQuality> {
```

- [ ] **Step 4: Add `ninetyDaysAgo` constant and update the returns call**

Immediately after the `const headers = { ... }` block, add:
```ts
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
```

Then find the `Promise.all` block and replace the returns fetch line:
```ts
// BEFORE
fetch(`${apiBase}/order/customer-returns?limit=1`,  { headers, signal: AbortSignal.timeout(10_000) }),

// AFTER
fetch(`${apiBase}/order/customer-returns?status=FINISHED&createdAt.gte=${ninetyDaysAgo.toISOString()}&limit=1`, { headers, signal: AbortSignal.timeout(10_000) }),
```

- [ ] **Step 5: Add DB orders count query**

Find the block that computes `returnsCount`:
```ts
const returnsCount = (returns_.count as number) ??
  (Array.isArray(returns_.customerReturns) ? returns_.customerReturns.length : 0)
```

Replace with:
```ts
const returnsCount = (returns_.count as number) ??
  (Array.isArray(returns_.customerReturns) ? returns_.customerReturns.length : 0)

// Count synced Allegro orders in the same 90-day window for the denominator
let ordersCount = 0
try {
  const result = await db
    .select({ count: count() })
    .from(orders)
    .where(and(
      eq(orders.source, 'allegro'),
      ne(orders.status, 'cancelled'),
      gte(orders.createdAt, ninetyDaysAgo),
    ))
  ordersCount = Number(result[0]?.count ?? 0)
} catch (err) {
  console.warn('[Allegro Quality] DB orders count failed — ratePercent will be undefined', err)
}
const ratePercent = ordersCount > 0 ? (returnsCount / ordersCount) * 100 : undefined
```

- [ ] **Step 6: Update the `returns` field in the return object**

Find:
```ts
returns: {
  count: returnsCount,
  ratePercent: 0,
},
```
Replace with:
```ts
returns: {
  count: returnsCount,
  ratePercent,
},
```

- [ ] **Step 7: Update `preWarmAllegroQualityCache` caller**

Find:
```ts
  try {
    const data = await fetchAllegroQualityData(accessToken, environment)
```
(inside `preWarmAllegroQualityCache`)

Replace with:
```ts
  try {
    const db = createDb(env.DATABASE_URL)
    const data = await fetchAllegroQualityData(accessToken, environment, db)
```

- [ ] **Step 8: Update `GET /quality` route — add `dbMiddleware` and pass `c.var.db`**

Find:
```ts
allegroRouter.get('/quality', requireAdminOrProxy(), async (c) => {
```
Replace with:
```ts
allegroRouter.get('/quality', dbMiddleware(), requireAdminOrProxy(), async (c) => {
```

Then find the cache-miss call inside the handler:
```ts
    const data = await fetchAllegroQualityData(accessToken, environment)
```
Replace with:
```ts
    const data = await fetchAllegroQualityData(accessToken, environment, c.var.db)
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
turbo type-check
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/routes/allegro.ts
git commit -m "feat(allegro): compute return rate from customer-returns + DB orders (90-day window)"
```

---

## Task 3: Display return rate conditionally in `SalesQualityCard`

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx` (around line 141)

**Context:** Currently renders `{quality.returns.ratePercent.toFixed(1)}%` unconditionally (always shows `0.0%` since backend hardcodes `0`). After Task 2, `ratePercent` is `undefined` when sync is empty — must render conditionally.

- [ ] **Step 1: Make rate line conditional**

Find:
```tsx
            <div>
              <p className="text-[#A3A3A3] mb-1">Zwroty</p>
              <p className="font-semibold text-[#1A1A1A] tabular-nums">{quality.returns.count}</p>
              <p className="text-[#A3A3A3] tabular-nums">({quality.returns.ratePercent.toFixed(1)}%)</p>
            </div>
```
Replace with:
```tsx
            <div>
              <p className="text-[#A3A3A3] mb-1">Zwroty</p>
              <p className="font-semibold text-[#1A1A1A] tabular-nums">{quality.returns.count}</p>
              {quality.returns.ratePercent != null && (
                <p className="text-[#A3A3A3] tabular-nums">({quality.returns.ratePercent.toFixed(1)}%)</p>
              )}
            </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
turbo type-check --filter=web
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

1. `turbo dev --filter=api` + `turbo dev --filter=web`
2. Open `/admin` dashboard
3. `SalesQualityCard` → "Zwroty": shows count; rate shows if DB has Allegro orders in last 90 days, hidden otherwise
4. Hit refresh button — card reloads without crash

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx
git commit -m "feat(web): show return rate conditionally in SalesQualityCard"
```
