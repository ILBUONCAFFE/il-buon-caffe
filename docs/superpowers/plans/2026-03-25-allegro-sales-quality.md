# Allegro Sales Quality Dashboard Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `SalesQualityCard` on the admin dashboard to live Allegro data: sales quality score, fulfillment %, returns count/rate, positive/negative rating counts — cached daily in Cloudflare KV.

**Architecture:** New `GET /admin/allegro/quality` Hono route aggregates 4 parallel Allegro API calls into one JSON blob stored in KV (TTL 24h). A cron at `0 5 * * *` UTC pre-warms the cache. Frontend `useSalesQuality()` hook follows the existing `useAsync` pattern in `useDashboard.ts`. `SalesQualityCard` displays three metric columns + refresh button.

**Tech Stack:** Hono.js 4.11, Cloudflare KV (`ALLEGRO_KV`), Cloudflare Workers cron, Next.js 16 App Router, React 19, TypeScript, `@repo/types` shared package.

**Spec:** `docs/superpowers/specs/2026-03-25-allegro-sales-quality-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/types/index.ts` | Modify | Add `AllegroSalesQuality`, `AllegroSalesQualityResponse` shared types |
| `apps/api/src/lib/allegro.ts` | Modify | Add `QUALITY_CACHE` to `KV_KEYS` constant |
| `apps/api/src/routes/allegro.ts` | Modify | Add `GET /quality` route + exported `preWarmAllegroQualityCache` helper |
| `apps/api/wrangler.json` | Modify | Add `"0 5 * * *"` to `triggers.crons` |
| `apps/api/src/index.ts` | Modify | Add `else if (event.cron === '0 5 * * *')` branch calling `preWarmAllegroQualityCache` |
| `apps/web/src/admin/types/admin-api.ts` | Modify | Import + re-export `AllegroSalesQuality`, `AllegroSalesQualityResponse` from `@repo/types` |
| `apps/web/src/admin/lib/adminApiClient.ts` | Modify | Add `getAllegroQuality(force?)` method using `allegroRequest` |
| `apps/web/src/admin/hooks/useDashboard.ts` | Modify | Add `useSalesQuality()` hook using `useAsync` |
| `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx` | Modify | Full rewrite: replace hardcoded data with `useSalesQuality()`, add all states |

---

## Task 1: Add shared types

**Files:**
- Modify: `packages/types/index.ts` (append after line 535)

- [ ] **Step 1: Add types**

Open `packages/types/index.ts` and append after the last `}` before the final blank line:

```typescript
// ============================================
// ALLEGRO SALES QUALITY TYPES
// ============================================

export interface AllegroSalesQuality {
  score: number
  maxScore: number
  fetchedAt: string                              // ISO timestamp
  fulfillment: {
    onTimePercent: number                        // e.g. 94.2
  }
  returns: {
    count: number                                // e.g. 12
    ratePercent: number                          // e.g. 1.2 — from /sale/quality component
  }
  ratings: {
    positive: number                             // totalCount from /sale/user-ratings?recommended=true
    negative: number                             // totalCount from /sale/user-ratings?recommended=false
    negativePercent: number                      // mapped from /sale/quality negativeFeedbackRatePercent
  }
}

export interface AllegroSalesQualityResponse {
  data: AllegroSalesQuality | null
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/types/index.ts
git commit -m "feat(types): add AllegroSalesQuality shared types"
```

---

## Task 2: Add KV_KEYS.QUALITY_CACHE

**Files:**
- Modify: `apps/api/src/lib/allegro.ts` (around line 193–199)

- [ ] **Step 1: Add key to KV_KEYS**

In `apps/api/src/lib/allegro.ts`, find the `KV_KEYS` object and add `QUALITY_CACHE`:

```typescript
export const KV_KEYS = {
  ACCESS_TOKEN:   'allegro:access_token',
  REFRESH_TOKEN:  'allegro:refresh_token',
  ENVIRONMENT:    'allegro:environment',
  STATUS:         'allegro:status',       // { connected, expiresAt, environment }
  STATE_PREFIX:   'allegro:state:',       // + uuid → CSRF state (TTL 10 min)
  QUALITY_CACHE:  'allegro:quality:cache', // AllegroSalesQuality — refreshed daily
} as const
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/allegro.ts
git commit -m "feat(api): add QUALITY_CACHE key to KV_KEYS"
```

---

## Task 3: Add GET /quality route

**Files:**
- Modify: `apps/api/src/routes/allegro.ts` (append before the last route or at end of file)

> **Important:** The exact Allegro API response shapes must be verified in sandbox before deploying to production. Check `/sale/quality`, `/sale/user-ratings`, and `/order/returns` responses against actual Allegro sandbox responses and adjust field names in `aggregateQualityData` accordingly.

- [ ] **Step 1: Add import for AllegroSalesQuality type**

At the top of `apps/api/src/routes/allegro.ts`, in the `@repo/types` import block (or add one), add:

```typescript
import type { AllegroSalesQuality } from '@repo/types'
```

> `AllegroEnvironment` is already imported from `../lib/allegro` (line 26 of the existing file: `type AllegroEnvironment`). No additional import needed for it.

- [ ] **Step 2: Add preWarmAllegroQualityCache helper and route**

Append to `apps/api/src/routes/allegro.ts`:

```typescript
// ── Helpers: quality aggregation ─────────────────────────────────────────────

/**
 * Fetches and aggregates Allegro sales quality data from 4 parallel API calls.
 * Exported for use in cron pre-warm (apps/api/src/index.ts).
 *
 * NOTE: Verify exact Allegro API response field names against sandbox before prod deploy.
 * - /sale/quality            → score, maxScore, and component percentage rates
 * - /sale/user-ratings       → count.total (filtered by recommended param)
 * - /order/returns           → count.total
 */
export async function preWarmAllegroQualityCache(env: Env): Promise<void> {
  const kv = env.ALLEGRO_KV
  if (!kv) return

  const accessToken = await kv.get(KV_KEYS.ACCESS_TOKEN)
  const environment = ((await kv.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment
  if (!accessToken) return

  try {
    const data = await fetchAllegroQualityData(accessToken, environment)
    await kv.put(KV_KEYS.QUALITY_CACHE, JSON.stringify(data), { expirationTtl: 86400 })
    console.log('[Allegro Quality] Cache pre-warmed at', data.fetchedAt)
  } catch (err) {
    console.error('[Allegro Quality] Pre-warm failed:', err instanceof Error ? err.message : String(err))
  }
}

async function fetchAllegroQualityData(
  accessToken: string,
  environment: AllegroEnvironment,
): Promise<AllegroSalesQuality> {
  const apiBase = getAllegroApiBase(environment)
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.allegro.public.v1+json',
  }

  const [qualityResp, posRatingsResp, negRatingsResp, returnsResp] = await Promise.all([
    fetch(`${apiBase}/sale/quality`, { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`${apiBase}/sale/user-ratings?recommended=true&limit=1`, { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`${apiBase}/sale/user-ratings?recommended=false&limit=1`, { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`${apiBase}/order/returns?limit=1`, { headers, signal: AbortSignal.timeout(10_000) }),
  ])

  if (!qualityResp.ok || !posRatingsResp.ok || !negRatingsResp.ok || !returnsResp.ok) {
    const failedStatus = [qualityResp, posRatingsResp, negRatingsResp, returnsResp]
      .map((r, i) => `[${i}] ${r.status}`)
      .join(', ')
    throw new Error(`One or more Allegro API calls failed: ${failedStatus}`)
  }

  const [quality, posRatings, negRatings, returns_] = await Promise.all([
    qualityResp.json() as Promise<Record<string, unknown>>,
    posRatingsResp.json() as Promise<Record<string, unknown>>,
    negRatingsResp.json() as Promise<Record<string, unknown>>,
    returnsResp.json() as Promise<Record<string, unknown>>,
  ])

  // NOTE: Adjust these field paths after verifying against actual Allegro sandbox responses.
  // Common shapes observed in Allegro REST API docs:
  //   /sale/quality → { score: number, maxScore: number, metrics: { fulfillmentTime: { value }, returns: { value }, negativeFeedback: { value } } }
  //   /sale/user-ratings → { count: { total: number } }
  //   /order/returns → { count: { total: number } }
  const score = (quality.score as number) ?? 0
  const maxScore = (quality.maxScore as number) ?? 500
  const metrics = (quality.metrics as Record<string, { value: number }>) ?? {}

  return {
    score,
    maxScore,
    fetchedAt: new Date().toISOString(),
    fulfillment: {
      onTimePercent: metrics.fulfillmentTime?.value ?? 0,
    },
    returns: {
      count: ((returns_.count as Record<string, number>)?.total) ?? 0,
      ratePercent: metrics.returns?.value ?? 0,
    },
    ratings: {
      positive: ((posRatings.count as Record<string, number>)?.total) ?? 0,
      negative: ((negRatings.count as Record<string, number>)?.total) ?? 0,
      negativePercent: metrics.negativeFeedback?.value ?? 0,
    },
  }
}

// ── GET /quality ──────────────────────────────────────────────────────────────

allegroRouter.get('/quality', requireAdminOrProxy(), async (c) => {
  const env   = c.env as Env
  const kv    = env.ALLEGRO_KV
  const force = c.req.query('force') === 'true'

  try {
    // Check connection
    const accessToken = await kv?.get(KV_KEYS.ACCESS_TOKEN)
    if (!accessToken) {
      return c.json({ data: null })
    }

    // KV cache hit (skip if force=true)
    if (!force && kv) {
      const cached = await kv.get<AllegroSalesQuality>(KV_KEYS.QUALITY_CACHE, 'json')
      if (cached) {
        return c.json({ data: cached })
      }
    }

    // Cache miss or forced refresh — fetch live
    const environment = ((await kv?.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment
    const data = await fetchAllegroQualityData(accessToken, environment)

    // Write to KV non-blocking (don't delay the response)
    if (kv) {
      c.executionCtx.waitUntil(
        kv.put(KV_KEYS.QUALITY_CACHE, JSON.stringify(data), { expirationTtl: 86400 })
          .catch(err => console.error('[Allegro Quality] KV write failed:', err))
      )
    }

    return c.json({ data })
  } catch (err) {
    console.error('[Allegro Quality] fetch error:', err instanceof Error ? err.message : String(err))
    return c.json(
      { error: { code: 'ALLEGRO_FETCH_FAILED', message: err instanceof Error ? err.message : 'Błąd pobierania danych jakości' } },
      502,
    )
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/allegro.ts
git commit -m "feat(api): add GET /admin/allegro/quality endpoint with KV cache"
```

---

## Task 4: Wire cron pre-warm

**Files:**
- Modify: `apps/api/wrangler.json`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Add cron to wrangler.json**

In `apps/api/wrangler.json`, update `triggers.crons`:

```json
"triggers": {
  "crons": [
    "0 * * * *",
    "*/5 * * * *",
    "0 5 * * *"
  ]
}
```

- [ ] **Step 2: Add import and branch to index.ts**

In `apps/api/src/index.ts`, add the import at the top alongside existing allegro imports:

```typescript
import { preWarmAllegroQualityCache } from './routes/allegro'
```

Then in the `scheduled` handler, update the cron dispatch block. Find:

```typescript
if (event.cron === '*/5 * * * *') {
  ctx.waitUntil(syncAllegroOrders(env))
} else {
  // Default: hourly token refresh + data retention (runs once/day)
  ctx.waitUntil(autoRefreshAllegroToken(env))
```

Replace with:

```typescript
if (event.cron === '*/5 * * * *') {
  ctx.waitUntil(syncAllegroOrders(env))
} else if (event.cron === '0 5 * * *') {
  // Daily at 06:00 CET (05:00 UTC) — pre-warm Allegro sales quality cache
  ctx.waitUntil(preWarmAllegroQualityCache(env))
} else {
  // Default: hourly token refresh + data retention (runs once/day)
  ctx.waitUntil(autoRefreshAllegroToken(env))
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/wrangler.json apps/api/src/index.ts
git commit -m "feat(api): add daily cron 0 5 * * * for Allegro quality cache pre-warm"
```

---

## Task 5: Frontend types

**Files:**
- Modify: `apps/web/src/admin/types/admin-api.ts`

- [ ] **Step 1: Add import at top of file**

`apps/web/src/admin/types/admin-api.ts` currently has no imports. Add at the very top (line 1, before existing content):

```typescript
import type { AllegroSalesQuality, AllegroSalesQualityResponse } from '@repo/types'
export type { AllegroSalesQuality, AllegroSalesQualityResponse }
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/types/admin-api.ts
git commit -m "feat(web): re-export AllegroSalesQuality types from @repo/types"
```

---

## Task 6: Add adminApiClient method

**Files:**
- Modify: `apps/web/src/admin/lib/adminApiClient.ts`

- [ ] **Step 1: Add import for AllegroSalesQualityResponse**

In `apps/web/src/admin/lib/adminApiClient.ts`, find the block where `AllegroStatusResponse`, `AllegroConnectUrlResponse` etc. are imported (around line 10). Add `AllegroSalesQualityResponse` to that list:

```typescript
import type {
  // ... existing imports ...
  AllegroSalesQualityResponse,
} from '../types/admin-api'
```

Also add it to the re-export block at the bottom of the file:

```typescript
export type {
  // ... existing ...
  AllegroSalesQualityResponse,
}
```

- [ ] **Step 2: Add getAllegroQuality method**

In the `adminApi` object, find the Allegro OAuth section (around `getAllegroStatus`) and add after `getAllegroStatus`:

```typescript
getAllegroQuality: (force = false) =>
  allegroRequest<AllegroSalesQualityResponse>(
    `/api/admin/allegro/quality${force ? '?force=true' : ''}`,
  ),
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/lib/adminApiClient.ts
git commit -m "feat(web): add getAllegroQuality to adminApiClient"
```

---

## Task 7: Add useSalesQuality hook

**Files:**
- Modify: `apps/web/src/admin/hooks/useDashboard.ts`

- [ ] **Step 1: Add import**

At the top of `apps/web/src/admin/hooks/useDashboard.ts`, update the React import to include `useEffect` (already has `useState`, `useEffect`, `useCallback`), and add `AllegroSalesQuality` to the type import:

```typescript
import type {
  DashboardStats,
  DashboardOverview,
  WeeklyRevenuePoint,
  WeeklyPoint,
  OrdersQueryParams,
  AdminOrder,
  ActivityItem,
  AllegroConnectionStatus,
  AllegroSalesQuality,           // add this
} from '../types/admin-api'
```

- [ ] **Step 2: Add hook**

Append to `apps/web/src/admin/hooks/useDashboard.ts` after `useAllegroStatus`:

```typescript
// ── Allegro sales quality ─────────────────────────────────────────────────────
export function useSalesQuality() {
  const [force, setForce] = useState(false)

  const { data, loading, error } = useAsync(
    () => adminApi.getAllegroQuality(force).then(r => r.data),
    [force],
  )

  // Reset force flag after the fetch triggered by it completes,
  // so subsequent automatic re-renders don't bypass KV cache.
  useEffect(() => {
    if (!loading && force) setForce(false)
  }, [loading, force])

  const refetch = useCallback(() => setForce(true), [])

  return {
    quality: data as AllegroSalesQuality | null,
    loading,
    error,
    refetch,
  }
}
```

> Note: `useState`, `useEffect`, and `useCallback` are already imported at the top of the file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/hooks/useDashboard.ts
git commit -m "feat(web): add useSalesQuality hook"
```

---

## Task 8: Rewrite SalesQualityCard

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire content of `SalesQualityCard.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { RefreshCw, Loader2, Link2Off, AlertCircle } from 'lucide-react'
import { useSalesQuality } from '../../../hooks/useDashboard'

function formatFetchedAt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  if (diffH < 1) return 'przed chwilą'
  if (diffH < 24) return `${diffH}h temu`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return `wczoraj ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
  return `${diffD} dni temu`
}

function qualityLabel(pct: number): { label: string; color: string } {
  if (pct >= 0.9) return { label: 'Doskonała',     color: '#059669' }
  if (pct >= 0.7) return { label: 'Dobra',         color: '#1A1A1A' }
  if (pct >= 0.5) return { label: 'Średnia',       color: '#D97706' }
  return           { label: 'Wymaga uwagi',         color: '#DC2626' }
}

export const SalesQualityCard = () => {
  const { quality, loading, error, refetch } = useSalesQuality()

  const pct    = quality ? quality.score / quality.maxScore : 0
  const ql     = qualityLabel(pct)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Jakość sprzedaży</h2>
        <div className="flex items-center gap-2">
          {quality && (
            <span className="text-xs font-medium" style={{ color: ql.color }}>
              {ql.label}
            </span>
          )}
          {loading ? (
            <Loader2 size={14} className="text-[#A3A3A3] animate-spin" />
          ) : (
            <button
              onClick={refetch}
              disabled={loading}
              title="Odśwież"
              className="p-1 rounded hover:bg-[#F5F4F1] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw size={12} className="text-[#A3A3A3]" />
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-8 w-24 rounded bg-[#E5E4E1] animate-pulse" />
          <div className="h-1.5 rounded-full bg-[#E5E4E1] animate-pulse" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-full rounded bg-[#E5E4E1] animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-[#E5E4E1] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not connected */}
      {!loading && !error && !quality && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#737373]">
            <Link2Off size={14} className="text-[#A3A3A3]" />
            <span>Nie połączono z Allegro</span>
          </div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0066CC] transition-colors"
          >
            Zarządzaj połączeniem →
          </Link>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#DC2626]">
            <AlertCircle size={14} />
            <span>Nie udało się pobrać danych</span>
          </div>
          <button
            onClick={refetch}
            className="text-sm text-[#737373] hover:text-[#1A1A1A] transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Data */}
      {!loading && !error && quality && (
        <>
          {/* Score + progress */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: ql.color }}>
              {quality.score}
            </span>
            <span className="text-sm text-[#A3A3A3]">/ {quality.maxScore}</span>
          </div>
          <div className="h-1.5 bg-[#E5E4E1] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct * 100}%`, backgroundColor: ql.color }}
            />
          </div>

          {/* 3-column breakdown */}
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            {/* Fulfillment */}
            <div>
              <p className="text-[#A3A3A3] mb-1">Czas realizacji</p>
              <p className="font-semibold text-[#1A1A1A] tabular-nums">
                {quality.fulfillment.onTimePercent.toFixed(1)}%
              </p>
            </div>
            {/* Returns */}
            <div>
              <p className="text-[#A3A3A3] mb-1">Zwroty</p>
              <p className="font-semibold text-[#1A1A1A] tabular-nums">{quality.returns.count}</p>
              <p className="text-[#A3A3A3] tabular-nums">({quality.returns.ratePercent.toFixed(1)}%)</p>
            </div>
            {/* Ratings */}
            <div>
              <p className="text-[#A3A3A3] mb-1">Oceny</p>
              <p className="font-semibold text-[#059669] tabular-nums">{quality.ratings.positive} ✓</p>
              <p className="font-semibold text-[#DC2626] tabular-nums">{quality.ratings.negative} ✗</p>
              <p className="text-[#A3A3A3] tabular-nums">({quality.ratings.negativePercent.toFixed(1)}%)</p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="mt-3 text-[10px] text-[#A3A3A3]">
            Dane z: {formatFetchedAt(quality.fetchedAt)}
          </p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd "apps/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx
git commit -m "feat(web): wire SalesQualityCard to live Allegro sales quality data"
```

---

## Task 9: Verify Allegro API response shapes in sandbox

> **This task must be done before deploying to production.** The field names in `fetchAllegroQualityData` in `allegro.ts` are based on documented Allegro REST API patterns but should be verified.

- [ ] **Step 1: Test endpoint in sandbox**

With Allegro sandbox credentials configured, hit the endpoint:

```bash
curl -s "http://localhost:8787/admin/allegro/quality" \
  -H "X-Admin-Internal-Secret: <your_secret>" | jq .
```

- [ ] **Step 2: Check raw Allegro responses**

Temporarily add `console.log(JSON.stringify(quality))` after `qualityResp.json()` in `fetchAllegroQualityData` and check Worker logs for actual field names.

- [ ] **Step 3: Adjust field mapping if needed**

If the actual response fields differ from the plan's assumptions, update the field paths in `fetchAllegroQualityData`:

```typescript
// Current assumptions — adjust as needed:
// quality.score, quality.maxScore
// quality.metrics.fulfillmentTime.value
// quality.metrics.returns.value
// quality.metrics.negativeFeedback.value
// posRatings.count.total
// negRatings.count.total
// returns_.count.total
```

- [ ] **Step 4: Commit any adjustments**

```bash
git add apps/api/src/routes/allegro.ts
git commit -m "fix(api): adjust Allegro quality API field mapping after sandbox verification"
```
