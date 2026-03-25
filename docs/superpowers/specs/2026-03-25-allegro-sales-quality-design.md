# Allegro Sales Quality Dashboard Card — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Admin panel dashboard — `SalesQualityCard` component wired to live Allegro data

---

## Overview

Replace the hardcoded placeholder in `SalesQualityCard` with real data fetched from the Allegro REST API. Data is cached daily in Cloudflare KV and pre-warmed by a cron job. When Allegro is not connected, the card shows a "not connected" state with a link to settings.

---

## Architecture

```
Dashboard (browser)
  └── SalesQualityCard
        └── useSalesQuality() hook
              └── adminFetch → Next.js proxy (X-Admin-Internal-Secret)
                    └── GET /admin/allegro/quality  (Hono Worker)
                          ├── KV hit  → return cached JSON immediately
                          └── KV miss / ?force=true
                                └── Promise.all([
                                      GET /sale/quality,
                                      GET /sale/user-ratings?recommended=true&limit=1,
                                      GET /sale/user-ratings?recommended=false&limit=1,
                                      GET /order/returns?limit=1
                                    ])
                                    → aggregate → KV.put (TTL 24h) → return

Cron: 0 6 * * *  → same aggregation logic → pre-warms KV
```

---

## Allegro API Calls

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `GET /sale/quality` | Overall score (0–500), `fulfillmentOnTimePercent`, `returnsRatePercent`, `negativeFeedbackRatePercent` |
| 2 | `GET /sale/user-ratings?recommended=true&limit=1` | `totalCount` → positive rating count |
| 3 | `GET /sale/user-ratings?recommended=false&limit=1` | `totalCount` → negative rating count |
| 4 | `GET /order/returns?limit=1` | `totalCount` → returns count |

All 4 run in parallel via `Promise.all()`. Each uses the standard Allegro headers (`Authorization: Bearer`, `Accept: application/vnd.allegro.public.v1+json`). Uses the existing `resolveAllegroToken()` helper (which handles transparent token refresh before giving up). `negativePercent` in the aggregated response maps directly from Allegro's `negativeFeedbackRatePercent` field on `/sale/quality` — it is NOT recomputed from raw counts.

---

## API Contract

**Endpoint:** `GET /admin/allegro/quality`
**Auth:** `requireAdminOrProxy()`
**Query param:** `?force=true` — bypass cache, force fresh fetch

**Success response (`200`):**
```typescript
{
  data: {
    score: number             // e.g. 450
    maxScore: number          // 500
    fetchedAt: string         // ISO — displayed as "Dane z: wczoraj 06:00"
    fulfillment: {
      onTimePercent: number   // e.g. 94.2
    }
    returns: {
      count: number           // e.g. 12
      ratePercent: number     // e.g. 1.2
    }
    ratings: {
      positive: number        // e.g. 847
      negative: number        // e.g. 9
      negativePercent: number // e.g. 0.8
    }
  }
}
```

**Not connected response (`200`):**
```typescript
{ data: null }
```

**Error response (`502`):**
```typescript
{ error: { code: 'ALLEGRO_FETCH_FAILED', message: string } }
```

---

## KV Cache

- **Key:** `KV_KEYS.QUALITY_CACHE` = `'allegro:quality:cache'` — must be added to the `KV_KEYS` constant in `apps/api/src/lib/allegro.ts` alongside existing keys
- **TTL:** `expirationTtl: 86400` (24 hours)
- **On request:** KV hit → return immediately (no Allegro call)
- **On `?force=true`:** skip KV read, fetch fresh, overwrite KV
- **On Allegro not connected:** skip KV entirely, return `{ data: null }`
- **Cron pre-warm:** `0 5 * * *` (UTC) — = 06:00 CET / 07:00 CEST. Cloudflare Workers cron runs in UTC; `0 6 * * *` would fire at 07:00 CET which is too late. If pre-warm fails (Allegro down at 05:00), the first dashboard request that day triggers a live fetch (KV miss path) — no manual retry needed.

---

## Frontend

### Hook: `useSalesQuality()`

Location: `apps/web/src/admin/hooks/useDashboard.ts` (alongside `useAllegroStatus`)

```typescript
interface SalesQualityData {
  score: number
  maxScore: number
  fetchedAt: string
  fulfillment: { onTimePercent: number }
  returns: { count: number; ratePercent: number }
  ratings: { positive: number; negative: number; negativePercent: number }
}

// Returns: { quality: SalesQualityData | null, loading: boolean, refetch: () => void }
```

`refetch()` calls with `?force=true` to bypass cache.

### Component: `SalesQualityCard`

Location: `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx`

**Layout:**
```
┌─────────────────────────────────────┐
│ Jakość sprzedaży          Doskonała │  ← header + quality label (color-coded)
│                                     │
│  450 / 500                          │  ← score / maxScore
│  ████████████████░░  90%            │  ← progress bar
│                                     │
│  Czas realizacji   Zwroty   Oceny   │  ← 3 metric columns
│  94.2%             12       847 ✓   │
│                          (1.2%)  9 ✗│
│                               (0.8%)│
│                                     │
│  Dane z: wczoraj 06:00          ↺   │  ← fetchedAt + refresh button
└─────────────────────────────────────┘
```

**Not connected state:** Icon + "Nie połączono z Allegro" + link to `/admin/settings` — identical pattern to `AllegroStatusCard`.

**Error state (502):** Icon + "Nie udało się pobrać danych" + retry button. Hook exposes `error: boolean` alongside `loading` and `quality`.

**Loading state:** Skeleton pulse animations on all data fields — identical pattern to `AllegroStatusCard`.

**Refresh button:** Disabled (`pointer-events-none`, reduced opacity) while `loading === true` to prevent duplicate requests. No backend throttle needed — admin-only panel.

**Quality label thresholds:**
- ≥ 90% → "Doskonała" (green `#059669`)
- ≥ 70% → "Dobra" (dark `#1A1A1A`)
- ≥ 50% → "Średnia" (amber `#D97706`)
- < 50% → "Wymaga uwagi" (red `#DC2626`)

---

## Types

Add to `packages/types/index.ts`:

```typescript
export interface AllegroSalesQuality {
  score: number
  maxScore: number
  fetchedAt: string
  fulfillment: { onTimePercent: number }
  returns: { count: number; ratePercent: number }
  ratings: { positive: number; negative: number; negativePercent: number }
}

export interface AllegroSalesQualityResponse {
  data: AllegroSalesQuality | null
}
```

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `apps/api/src/lib/allegro.ts` | Add `QUALITY_CACHE: 'allegro:quality:cache'` to `KV_KEYS` constant |
| `apps/api/src/routes/allegro.ts` | Add `GET /quality` route + `preWarmAllegroQualityCache` helper |
| `apps/api/wrangler.json` | Add `"0 5 * * *"` to `triggers.crons` (UTC = 06:00 CET) |
| `apps/api/src/index.ts` | Add `else if (event.cron === '0 5 * * *')` branch in scheduled handler |
| `packages/types/index.ts` | Add `AllegroSalesQuality`, `AllegroSalesQualityResponse` |
| `apps/web/src/admin/hooks/useDashboard.ts` | Add `useSalesQuality()` hook |
| `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx` | Wire to real data |
| `apps/web/src/admin/types/admin-api.ts` | Add `import type { AllegroSalesQuality, AllegroSalesQualityResponse } from '@repo/types'` — re-export if needed, no local duplication |

---

## Error Handling

- If any of the 4 Allegro calls fails: return `502` with `ALLEGRO_FETCH_FAILED` — do not write partial data to KV
- Token expiry: `resolveAllegroToken()` attempts a refresh automatically. If refresh also fails (account truly disconnected), treat as not-connected — return `{ data: null }` with HTTP `200`, do NOT return `401` to the frontend
- If KV write fails: log but still return the data to the caller (non-blocking)

---

## Cron: wrangler.json + index.ts Changes

**`apps/api/wrangler.json`** — add `"0 5 * * *"` to `triggers.crons` array (UTC = 06:00 CET).

**`apps/api/src/index.ts`** — add explicit branch to the scheduled handler:

```typescript
} else if (event.cron === '0 5 * * *') {
  ctx.waitUntil(preWarmAllegroQualityCache(env))
}
```

`preWarmAllegroQualityCache` runs the same 4-parallel-call aggregation logic and writes to KV. The `0 6 * * *` slot does NOT conflict with existing crons (`0 * * * *` = token refresh, `*/5 * * * *` = order poll).
