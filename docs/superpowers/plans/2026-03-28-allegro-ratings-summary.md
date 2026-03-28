# Allegro Ratings Summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two `/sale/user-ratings` calls in `fetchAllegroQualityData` with a single `/users/{userId}/ratings-summary` Allegro endpoint, extend the ratings type with per-period breakdowns, and keep `SalesQualityCard` showing all-time positive/negative counts.

**Architecture:** Backend: in `fetchAllegroQualityData`, swap two `user-ratings` calls for `/me` (to get userId) + `/users/{userId}/ratings-summary` (both added to the existing `Promise.all` → now 3 parallel, then 1 serial). The flat `ratings.positive`/`ratings.negative` fields remain canonical (= all-time) so stale KV cache continues to work. New optional period fields (`lastThreeMonths`, `lastSixMonths`, `lastTwelveMonths`) are added alongside. Frontend: `SalesQualityCard` already reads `quality.ratings.positive`/`negative` — no breaking change; the label is updated to clarify all-time scope.

**Tech Stack:** Hono.js (Cloudflare Workers), Drizzle ORM, Next.js 16 App Router, TypeScript, Tailwind CSS 4

> ⚠️ **Before implementing Task 2:** Verify the Allegro API response shape for `GET /users/{userId}/ratings-summary`. The plan assumes:
> ```json
> {
>   "lastThreeMonths":  { "recommended": 45, "notRecommended": 2 },
>   "lastSixMonths":    { "recommended": 89, "notRecommended": 4 },
>   "lastTwelveMonths": { "recommended": 156, "notRecommended": 7 },
>   "all":              { "recommended": 312, "notRecommended": 15 }
> }
> ```
> Adjust field paths in the `toEntry()` calls if the actual response differs.

---

## Files

| File | Change |
|------|--------|
| `packages/types/index.ts` | Extend `AllegroSalesQuality.ratings` with optional period fields |
| `apps/api/src/routes/allegro.ts` | In `fetchAllegroQualityData`: replace 2× user-ratings calls with `/me` + `/users/{userId}/ratings-summary`, add console.warn on /me failure, remove dead `satisfactionMetric` variable |
| `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx` | Update ratings label to "Oceny (łącznie)" — no breaking change to data access |

---

## Task 1: Extend the `AllegroSalesQuality` type

**Files:**
- Modify: `packages/types/index.ts` (around line 553)

- [ ] **Step 1: Update `ratings` shape**

Find the existing `ratings` block (line ~553) and replace it. Flat `positive`/`negative` remain canonical (= all-time). Period fields are optional so stale KV cache data (without them) doesn't break consumers.

```ts
ratings: {
  positive: number             // all-time: from /users/{userId}/ratings-summary .all.recommended
  negative: number             // all-time: from /users/{userId}/ratings-summary .all.notRecommended
  negativePercent: number      // calculated: negative / (positive + negative) * 100
  lastThreeMonths?:  { positive: number; negative: number }
  lastSixMonths?:    { positive: number; negative: number }
  lastTwelveMonths?: { positive: number; negative: number }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
turbo type-check
```

Expected: passes (or only fails in `apps/api` until Task 2 fixes the backend — that's fine).

---

## Task 2: Update `fetchAllegroQualityData` in the API

**Files:**
- Modify: `apps/api/src/routes/allegro.ts` lines 744–823

**Context:** Current 4-call `Promise.all` at line 754. Remove the two `/sale/user-ratings` calls, add `/me`. Then fetch `/users/{userId}/ratings-summary` serially (needs userId from `/me`).

- [ ] **Step 1: Update the `Promise.all` block (line 754)**

Replace lines 754–759:

```ts
const [qualityResp, meResp, returnsResp] = await Promise.all([
  fetch(`${apiBase}/sale/quality`,                    { headers, signal: AbortSignal.timeout(10_000) }),
  fetch(`${apiBase}/me`,                              { headers, signal: AbortSignal.timeout(10_000) }),
  fetch(`${apiBase}/order/customer-returns?limit=1`,  { headers, signal: AbortSignal.timeout(10_000) }),
])
```

- [ ] **Step 2: Replace the ratings block (lines ~766–770)**

After the quality fail-hard check, replace the old `posRatings`/`negRatings` lines:

```ts
// Secondary sources degrade gracefully to 0 on failure
const quality   = await qualityResp.json() as any
const returns_  = returnsResp.ok ? await returnsResp.json() as any : { count: 0 }

// Get userId from /me, then fetch ratings-summary
if (!meResp.ok) {
  console.warn('[Allegro Quality] /me returned', meResp.status, '— ratings will default to 0')
}
const me      = meResp.ok ? await meResp.json() as any : null
const userId  = (me?.id as string | undefined) ?? null

let ratingsResp: Response | null = null
if (userId) {
  ratingsResp = await fetch(
    `${apiBase}/users/${userId}/ratings-summary`,
    { headers, signal: AbortSignal.timeout(10_000) },
  )
  if (!ratingsResp.ok) {
    console.warn('[Allegro Quality] /users/ratings-summary returned', ratingsResp.status, '— ratings will default to 0')
  }
}
```

- [ ] **Step 3: Replace the `posCount`/`negCount` block (lines ~792–796)**

```ts
// Parse ratings-summary — degrade gracefully to zero if unavailable
// Expected shape: { all: { recommended, notRecommended }, lastThreeMonths: ..., ... }
const ratingsSummary = ratingsResp?.ok ? await ratingsResp.json() as any : null

const toEntry = (obj: any): { positive: number; negative: number } => ({
  positive: (obj?.recommended    as number) ?? 0,
  negative: (obj?.notRecommended as number) ?? 0,
})

const allEntry    = toEntry(ratingsSummary?.all)
const last3Entry  = toEntry(ratingsSummary?.lastThreeMonths)
const last6Entry  = toEntry(ratingsSummary?.lastSixMonths)
const last12Entry = toEntry(ratingsSummary?.lastTwelveMonths)

const posCount        = allEntry.positive
const negCount        = allEntry.negative
const totalRatings    = posCount + negCount
const negativePercent = totalRatings > 0 ? (negCount / totalRatings) * 100 : 0
```

- [ ] **Step 4: Update the returned `ratings` field (lines ~815–818)**

```ts
ratings: {
  positive:         posCount,
  negative:         negCount,
  negativePercent,
  lastThreeMonths:  last3Entry,
  lastSixMonths:    last6Entry,
  lastTwelveMonths: last12Entry,
},
```

- [ ] **Step 5: Remove dead `satisfactionMetric` variable (line ~799)**

Delete the unused line:
```ts
const satisfactionMetric = getMetric('BUYER_SATISFACTION')
```

- [ ] **Step 6: Verify type-check passes**

```bash
turbo type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/types/index.ts apps/api/src/routes/allegro.ts
git commit -m "feat(allegro): use /users/{userId}/ratings-summary for per-period rating counts"
```

---

## Task 3: Update `SalesQualityCard` label

**Files:**
- Modify: `apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx` (line ~147)

No data-access change needed — `quality.ratings.positive`/`negative` are still the correct paths (all-time canonical). Only update the label for clarity.

- [ ] **Step 1: Update label in the ratings column**

Find line ~147 (`<p className="text-[#A3A3A3] mb-1">Oceny</p>`) and change:

```tsx
<p className="text-[#A3A3A3] mb-1">Oceny (łącznie)</p>
```

- [ ] **Step 2: Type-check web app**

```bash
turbo type-check --filter=web
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

1. `turbo dev --filter=api` + `turbo dev --filter=web`
2. Open `/admin` dashboard
3. `SalesQualityCard` shows ratings (or zeros if sandbox/not connected) — no crash
4. Click the refresh button — data reloads

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/views/Dashboard/components/SalesQualityCard.tsx
git commit -m "feat(web): update ratings label to reflect all-time scope in SalesQualityCard"
```
