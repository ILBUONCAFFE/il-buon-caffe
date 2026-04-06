# Tracking Status Cron Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać do cronu `*/5 * * * *` cykliczne odświeżanie statusów trackingu dla przesyłek Allegro, oparte o stan przesyłki (nie czas od wysyłki), bez blokowania event sync.

**Architecture:** Nowa funkcja `runTrackingStatusSync(env)` uruchamiana przez `ctx.waitUntil` w handlerze cron równolegle z `syncAllegroOrders`. Kandydaci do odświeżenia wybierani zapytaniem SQL z cooldownem zależnym od `trackingStatusCode` (CASE expression — brak stanu w KV). Logika `refreshOrderTrackingSnapshot` wydzielona do dedykowanego modułu `tracking-refresh.ts`, dzielonego między endpoint `/tracking/refresh` a cron.

**Tech Stack:** Hono.js 4.11, Drizzle ORM 0.45, Neon HTTP driver (`@repo/db/client`), Cloudflare Workers KV (locki), TypeScript.

---

## Mapa plików

| Plik | Akcja | Odpowiedzialność |
|---|---|---|
| `apps/api/src/lib/allegro-orders/tracking-refresh.ts` | **Create** | `refreshOrderTrackingSnapshot`, `selectTrackingRefreshCandidates`, `runTrackingStatusSync` |
| `apps/api/src/routes/admin/orders.ts` | **Modify** | Usuń inline `refreshOrderTrackingSnapshot`, importuj z nowego modułu, przekaż `db` |
| `apps/api/src/index.ts` | **Modify** | Dodaj `ctx.waitUntil(runTrackingStatusSync(env))` w branchu `*/5 * * * *` |
| `packages/db/migrations/0008_tracking_refresh_index.sql` | **Create** | Partial index na `orders` dla wydajnych zapytań cronu |
| `packages/db/migrations/meta/_journal.json` | **Modify** | Rejestracja nowej migracji |

---

## Task 1: Utwórz `tracking-refresh.ts` — wydziel `refreshOrderTrackingSnapshot`

**Files:**
- Create: `apps/api/src/lib/allegro-orders/tracking-refresh.ts`
- Reference (do skopiowania logiki): `apps/api/src/routes/admin/orders.ts:154-294`

- [ ] **Krok 1: Utwórz plik z wydzieloną funkcją `refreshOrderTrackingSnapshot`**

Skopiuj logikę z `orders.ts:154-294`. Zmień sygnaturę — `db` jest teraz pierwszym parametrem (nie jest tworzony wewnątrz).

```typescript
/**
 * Allegro Tracking Refresh — shared logic for cron and API endpoint
 */

import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { getActiveAllegroToken } from '../allegro-tokens'
import { allegroHeaders } from './helpers'
import type { Env } from '../../index'

// ── Helpers (copied from orders.ts — keep in sync) ───────────────────────

function normalizeTrackingCode(value: string | null | undefined): string | null {
  if (!value) return null
  const norm = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return norm || null
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

// ── Tracking snapshot refresh ─────────────────────────────────────────────

/**
 * Fetch current shipment status from Allegro + carrier API and persist to DB.
 * Only writes when data changed (IS DISTINCT FROM guard).
 *
 * @param db   Drizzle client — HTTP driver for API endpoint, WS pool for cron
 * @param env  Worker env bindings (token resolution, KV)
 * @param orderId         Internal order ID
 * @param checkoutFormId  Allegro checkout form UUID
 */
export async function refreshOrderTrackingSnapshot(
  db: ReturnType<typeof createDb>,
  env: Env,
  orderId: number,
  checkoutFormId: string,
): Promise<void> {
  const token = await getActiveAllegroToken(env)
  if (!token) return

  const headers = {
    ...allegroHeaders(token.accessToken),
    'Accept-Language': 'pl-PL',
  }

  const shipResp = await fetch(`${token.apiBase}/order/checkout-forms/${checkoutFormId}/shipments`, {
    signal: AbortSignal.timeout(10_000),
    headers,
  })

  if (!shipResp.ok) return

  const shipData = await shipResp.json() as {
    shipments?: Array<{ carrierId?: string; waybill?: string; trackingNumber?: string }>
  }

  const firstShipment = shipData.shipments?.[0]
  const carrierId = firstShipment?.carrierId?.trim() ?? ''
  const waybill = (firstShipment?.waybill ?? firstShipment?.trackingNumber ?? '').trim().slice(0, 100) || null
  if (!waybill) return

  const now = new Date()

  if (!carrierId) {
    await db.update(orders)
      .set({
        trackingNumber: waybill,
        trackingStatus: 'Etykieta wygenerowana',
        trackingStatusCode: 'LABEL_CREATED',
        trackingStatusUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(orders.id, orderId),
        sql`(
          ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
          OR ${orders.trackingStatus} IS DISTINCT FROM ${'Etykieta wygenerowana'}
          OR ${orders.trackingStatusCode} IS DISTINCT FROM ${'LABEL_CREATED'}
          OR ${orders.trackingStatusUpdatedAt} IS NULL
        )`,
      ))
    return
  }

  const trackResp = await fetch(
    `${token.apiBase}/order/carriers/${encodeURIComponent(carrierId)}/tracking?waybill=${encodeURIComponent(waybill)}`,
    { signal: AbortSignal.timeout(10_000), headers },
  )

  if (!trackResp.ok) {
    await db.update(orders)
      .set({
        trackingNumber: waybill,
        trackingStatusCode: 'LABEL_CREATED',
        trackingStatusUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(orders.id, orderId),
        sql`(
          ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
          OR ${orders.trackingStatusCode} IS DISTINCT FROM ${'LABEL_CREATED'}
          OR ${orders.trackingStatusUpdatedAt} IS NULL
        )`,
      ))
    return
  }

  const trackData = await trackResp.json() as Record<string, unknown>

  const buckets: Array<Record<string, unknown>> = []
  for (const key of ['shipments', 'packages', 'items', 'waybills', 'tracking']) {
    if (!Array.isArray(trackData[key])) continue
    for (const item of trackData[key] as unknown[]) {
      if (item != null && typeof item === 'object') {
        buckets.push(item as Record<string, unknown>)
      }
    }
  }

  const normWaybill = waybill.toUpperCase()
  const pick = buckets.find((entry) => {
    const value = String(entry.waybill ?? entry.number ?? entry.id ?? '').toUpperCase()
    return value === normWaybill
  }) ?? buckets[0]

  const trackingDetails = pick?.trackingDetails
  const trackingDetailsStatuses =
    trackingDetails != null &&
    typeof trackingDetails === 'object' &&
    Array.isArray((trackingDetails as { statuses?: unknown[] }).statuses)
      ? (trackingDetails as { statuses: unknown[] }).statuses
      : null

  const rawStatuses = trackingDetailsStatuses != null
    ? trackingDetailsStatuses
    : Array.isArray(pick?.statuses)
      ? pick.statuses
      : Array.isArray(pick?.events)
        ? pick.events
        : Array.isArray(pick?.history)
          ? pick.history
          : []

  const sorted = rawStatuses.slice().sort((a: any, b: any) => {
    const left = new Date(b?.occurredAt ?? b?.time ?? b?.date ?? 0).getTime()
    const right = new Date(a?.occurredAt ?? a?.time ?? a?.date ?? 0).getTime()
    return left - right
  })

  const latest = sorted[0] as Record<string, unknown> | undefined
  const latestCode = normalizeTrackingCode(String(latest?.code ?? latest?.status ?? '')) ?? 'UNKNOWN'
  const latestDescription = latest?.description == null ? null : String(latest.description).slice(0, 255)
  const latestOccurredRaw = latest?.occurredAt ?? latest?.time ?? latest?.date ?? null
  const latestOccurredAt = latestOccurredRaw == null ? null : toDateOrNull(String(latestOccurredRaw))

  await db.update(orders)
    .set({
      trackingNumber: waybill,
      trackingStatus: latestDescription,
      trackingStatusCode: latestCode,
      trackingStatusUpdatedAt: now,
      trackingLastEventAt: latestOccurredAt,
      updatedAt: now,
    })
    .where(and(
      eq(orders.id, orderId),
      sql`(
        ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
        OR ${orders.trackingStatus} IS DISTINCT FROM ${latestDescription}
        OR ${orders.trackingStatusCode} IS DISTINCT FROM ${latestCode}
        OR ${orders.trackingLastEventAt} IS DISTINCT FROM ${latestOccurredAt}
        OR ${orders.trackingStatusUpdatedAt} IS NULL
      )`,
    ))
}
```

- [ ] **Krok 2: Sprawdź, że TypeScript się kompiluje**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

Oczekiwane: 0 błędów dla nowego pliku (stary `orders.ts` nadal ma swoją kopię — to tymczasowe, naprawione w Task 3).

- [ ] **Krok 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/tracking-refresh.ts
git commit -m "feat(api): extract refreshOrderTrackingSnapshot to tracking-refresh module"
```

---

## Task 2: Dodaj `selectTrackingRefreshCandidates` i `runTrackingStatusSync`

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/tracking-refresh.ts` (dopisz na końcu)

- [ ] **Krok 1: Dopisz stałe, `selectTrackingRefreshCandidates` i `runTrackingStatusSync`**

Dopisz poniższy kod na końcu pliku `tracking-refresh.ts` (po `refreshOrderTrackingSnapshot`):

```typescript
// ── Cron batch refresh ────────────────────────────────────────────────────

const BATCH_SIZE = 15
const CONCURRENCY = 3
const HARD_CUTOFF_DAYS = 30

/**
 * Select orders whose tracking snapshot is stale and needs refreshing.
 *
 * Cooldown per status (based on trackingStatusCode pattern):
 *   out_for_delivery / courier  →  5 min   (delivery imminent)
 *   exception / return / failed → 20 min   (issue resolution)
 *   in_transit / sent           → 30 min   (active transit)
 *   label_created / registered  → 90 min   (pre-pickup)
 *   delivered / picked_up       → 12 h     (post-delivery final check)
 *   unknown / null              → 60 min   (fallback)
 *
 * Hard cutoff: orders shipped > 30 days ago are excluded entirely.
 * Priority: out_for_delivery > issue > in_transit > label_created > rest.
 */
export async function selectTrackingRefreshCandidates(
  db: ReturnType<typeof createDb>,
): Promise<Array<{ id: number; externalId: string }>> {
  const cutoffDate = new Date(Date.now() - HARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({ id: orders.id, externalId: orders.externalId })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.allegroShipmentId),
        inArray(orders.status, ['shipped', 'delivered']),
        isNotNull(orders.externalId),
        sql`COALESCE(${orders.shippedAt}, ${orders.createdAt}) > ${cutoffDate}`,
        sql`(
          ${orders.trackingStatusUpdatedAt} IS NULL
          OR ${orders.trackingStatusUpdatedAt} < NOW() - (
            CASE
              WHEN ${orders.trackingStatusCode} ILIKE '%PICKED_UP%'
                OR ${orders.trackingStatusCode} ILIKE '%DELIVERED%'         THEN INTERVAL '12 hours'
              WHEN ${orders.trackingStatusCode} ILIKE '%OUT_FOR_DELIVERY%'
                OR ${orders.trackingStatusCode} ILIKE '%COURIER%'           THEN INTERVAL '5 minutes'
              WHEN ${orders.trackingStatusCode} ILIKE '%EXCEPTION%'
                OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
                OR ${orders.trackingStatusCode} ILIKE '%FAILED%'            THEN INTERVAL '20 minutes'
              WHEN ${orders.trackingStatusCode} ILIKE '%IN_TRANSIT%'
                OR ${orders.trackingStatusCode} ILIKE '%TRANSIT%'
                OR ${orders.trackingStatusCode} ILIKE '%SENT%'              THEN INTERVAL '30 minutes'
              WHEN ${orders.trackingStatusCode} ILIKE '%LABEL_CREATED%'
                OR ${orders.trackingStatusCode} ILIKE '%CREATED%'
                OR ${orders.trackingStatusCode} ILIKE '%REGISTERED%'        THEN INTERVAL '90 minutes'
              ELSE INTERVAL '60 minutes'
            END
          )
        )`,
      ),
    )
    .orderBy(
      sql`CASE
        WHEN ${orders.trackingStatusCode} ILIKE '%OUT_FOR_DELIVERY%'
          OR ${orders.trackingStatusCode} ILIKE '%COURIER%'             THEN 1
        WHEN ${orders.trackingStatusCode} ILIKE '%EXCEPTION%'
          OR ${orders.trackingStatusCode} ILIKE '%RETURN%'
          OR ${orders.trackingStatusCode} ILIKE '%FAILED%'              THEN 2
        WHEN ${orders.trackingStatusCode} ILIKE '%IN_TRANSIT%'
          OR ${orders.trackingStatusCode} ILIKE '%TRANSIT%'
          OR ${orders.trackingStatusCode} ILIKE '%SENT%'                THEN 3
        WHEN ${orders.trackingStatusCode} ILIKE '%LABEL_CREATED%'
          OR ${orders.trackingStatusCode} ILIKE '%CREATED%'
          OR ${orders.trackingStatusCode} ILIKE '%REGISTERED%'          THEN 4
        ELSE 5
      END,
      ${orders.trackingStatusUpdatedAt} ASC NULLS FIRST`,
    )
    .limit(BATCH_SIZE)

  return rows.filter((r): r is { id: number; externalId: string } => r.externalId !== null)
}

/**
 * Run one batch of tracking status refreshes.
 * Called from the cron handler via ctx.waitUntil — runs in background.
 *
 * Reuses the same KV lock as the manual /tracking/refresh endpoint,
 * so cron and user-triggered refreshes never race on the same order.
 */
export async function runTrackingStatusSync(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL)

  let candidates: Array<{ id: number; externalId: string }>
  try {
    candidates = await selectTrackingRefreshCandidates(db)
  } catch (err) {
    console.error('[TrackingSync] Błąd pobierania kandydatów:', err instanceof Error ? err.message : err)
    return
  }

  if (candidates.length === 0) return

  let refreshed = 0

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const slice = candidates.slice(i, i + CONCURRENCY)

    const results = await Promise.allSettled(
      slice.map(async (order) => {
        // Reuse /tracking/refresh KV lock — skip if already refreshing
        const lockKey = `allegro:tracking:refresh:order:${order.id}`
        const locked = await env.ALLEGRO_KV.get(lockKey)
        if (locked) return

        await env.ALLEGRO_KV.put(lockKey, String(Date.now()), { expirationTtl: 90 })
        try {
          await refreshOrderTrackingSnapshot(db, env, order.id, order.externalId)
          refreshed++
        } finally {
          await env.ALLEGRO_KV.delete(lockKey).catch(() => {})
        }
      }),
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('[TrackingSync] Błąd odświeżania trackingu:', result.reason instanceof Error ? result.reason.message : result.reason)
      }
    }
  }

  if (refreshed > 0) {
    console.log(`[TrackingSync] Odświeżono tracking dla ${refreshed}/${candidates.length} zamówień`)
  }
}
```

- [ ] **Krok 2: Sprawdź kompilację**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```

Oczekiwane: brak błędów w `tracking-refresh.ts`.

- [ ] **Krok 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/tracking-refresh.ts
git commit -m "feat(api): add selectTrackingRefreshCandidates and runTrackingStatusSync"
```

---

## Task 3: Zaktualizuj `orders.ts` — usuń inline, importuj z modułu

**Files:**
- Modify: `apps/api/src/routes/admin/orders.ts`

Cel: usunąć duplikację — `refreshOrderTrackingSnapshot` i jej helperów z `orders.ts`, zastąpić importem.

- [ ] **Krok 1: Dodaj import na początku `orders.ts`**

Znajdź blok importów na górze pliku (ok. linia 1–14). Dopisz:

```typescript
import { refreshOrderTrackingSnapshot } from '../../lib/allegro-orders/tracking-refresh'
```

- [ ] **Krok 2: Usuń inline `normalizeTrackingCode`, `toDateOrNull`, `toIsoOrNull`, `refreshOrderTrackingSnapshot`**

Usuń z `orders.ts` następujące funkcje (teraz żyją w `tracking-refresh.ts`):
- `normalizeTrackingCode` (linia ~24)
- `toDateOrNull` (linia ~30)
- `toIsoOrNull` (linia ~36)
- całą funkcję `refreshOrderTrackingSnapshot` (linia ~154–294)

**Uwaga:** `toIsoOrNull` i `normalizeTrackingCode` są nadal używane lokalnie w `orders.ts` (przez `buildTrackingSnapshot` i `getShipmentFreshness`). Przenieś je z powrotem jako lokalne funkcje w `orders.ts`, LUB wyeksportuj je z `tracking-refresh.ts` i importuj. Najprostsze: zostaw lokalne kopie w `orders.ts` — DRY tu nie jest priorytetem, funkcje są trywialne.

Zostaw w `orders.ts` lokalne kopie:
```typescript
function normalizeTrackingCode(value: string | null | undefined): string | null {
  if (!value) return null
  const norm = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return norm || null
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  const d = toDateOrNull(value)
  return d ? d.toISOString() : null
}
```

Usuń tylko `refreshOrderTrackingSnapshot` (i jej wewnętrzny `createDb` call).

- [ ] **Krok 3: Zaktualizuj endpoint `POST /:id/tracking/refresh`**

Znajdź w `orders.ts` linie ~553–559:

```typescript
c.executionCtx.waitUntil((async () => {
  try {
    await refreshOrderTrackingSnapshot(c.env, order.id, order.externalId!)
  } finally {
    await c.env.ALLEGRO_KV.delete(lockKey).catch(() => {})
  }
})())
```

Zmień na (przekazuj `db` tworzony z HTTP driverem):

```typescript
c.executionCtx.waitUntil((async () => {
  try {
    const refreshDb = createDb(c.env.DATABASE_URL)
    await refreshOrderTrackingSnapshot(refreshDb, c.env, order.id, order.externalId!)
  } finally {
    await c.env.ALLEGRO_KV.delete(lockKey).catch(() => {})
  }
})())
```

Upewnij się, że `createDb` jest zaimportowane w `orders.ts` (już jest — `import { createDb } from '@repo/db/client'`).

- [ ] **Krok 4: Sprawdź kompilację**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -40
```

Oczekiwane: 0 błędów. Jeśli są błędy o brakujących funkcjach lokalnych — dodaj lokalne kopie z Kroku 2.

- [ ] **Krok 5: Ręczna weryfikacja endpointu**

Uruchom API lokalnie i otwórz modal zamówienia Allegro ze statusem `shipped`:
```bash
cd apps/api && wrangler dev
```
Kliknij "Odśwież status" w modalu — powinno zadziałać identycznie jak przed zmianą.

- [ ] **Krok 6: Commit**

```bash
git add apps/api/src/routes/admin/orders.ts
git commit -m "refactor(api): use shared refreshOrderTrackingSnapshot from tracking-refresh module"
```

---

## Task 4: Podłącz `runTrackingStatusSync` do cronu w `index.ts`

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Krok 1: Dodaj import**

W `index.ts`, znajdź linię z importem `syncAllegroOrders` (ok. linia 18):

```typescript
import { syncAllegroOrders } from './lib/allegro-orders'
```

Dopisz obok (lub na tej samej linii jako named import):

```typescript
import { runTrackingStatusSync } from './lib/allegro-orders/tracking-refresh'
```

- [ ] **Krok 2: Dodaj `waitUntil` w handlerze cronu**

Znajdź w `index.ts` blok `if (event.cron === '*/5 * * * *')` (ok. linia 308):

```typescript
if (event.cron === '*/5 * * * *') {
  ctx.waitUntil(syncAllegroOrders(env))
}
```

Zmień na:

```typescript
if (event.cron === '*/5 * * * *') {
  ctx.waitUntil(syncAllegroOrders(env))
  ctx.waitUntil(runTrackingStatusSync(env))
}
```

Obie funkcje uruchamiają się równolegle w tle — `syncAllegroOrders` obsługuje eventy zamówień, `runTrackingStatusSync` odświeża statusy trackingu. Każda ma własny `waitUntil`, więc błąd w jednej nie wpływa na drugą.

- [ ] **Krok 3: Sprawdź kompilację**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: 0 błędów.

- [ ] **Krok 4: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): add runTrackingStatusSync to 5-min cron via waitUntil"
```

---

## Task 5: Dodaj partial index dla wydajności zapytania cronu

**Files:**
- Create: `packages/db/migrations/0008_tracking_refresh_index.sql`
- Modify: `packages/db/migrations/meta/_journal.json`

Zapytanie w `selectTrackingRefreshCandidates` skanuje zamówienia z `source = 'allegro'`, `allegro_shipment_id IS NOT NULL`, `status IN ('shipped', 'delivered')`. Partial index na tych warunkach + `tracking_status_updated_at` eliminuje full table scan gdy tabela urośnie.

- [ ] **Krok 1: Utwórz plik migracji**

```sql
-- Partial index dla cron-based tracking status refresh
-- Pokrywa zapytanie selectTrackingRefreshCandidates:
--   WHERE source = 'allegro'
--     AND allegro_shipment_id IS NOT NULL
--     AND status IN ('shipped', 'delivered')
--   ORDER BY ... tracking_status_updated_at ASC NULLS FIRST

CREATE INDEX IF NOT EXISTS idx_orders_tracking_refresh
  ON orders (tracking_status_updated_at ASC NULLS FIRST, updated_at DESC)
  WHERE source = 'allegro'
    AND allegro_shipment_id IS NOT NULL
    AND status IN ('shipped', 'delivered');
```

- [ ] **Krok 2: Zarejestruj migrację w `_journal.json`**

Otwórz `packages/db/migrations/meta/_journal.json`. Dodaj wpis na końcu tablicy `"entries"`:

```json
{
  "idx": 8,
  "version": "7",
  "when": 1743811200000,
  "tag": "0008_tracking_refresh_index",
  "breakpoints": true
}
```

(`when` = timestamp 2026-04-05 00:00 UTC w ms — możesz użyć aktualnego `Date.now()`)

- [ ] **Krok 3: Aplikuj migrację na dev**

```bash
cd packages/db && npx drizzle-kit migrate
```

Oczekiwane: `[✓] migrations/0008_tracking_refresh_index.sql` — applied successfully.

- [ ] **Krok 4: Zweryfikuj index w Neon Studio**

```bash
cd packages/db && npx drizzle-kit studio
```

W Studio przejdź do tabeli `orders` → zakładka Indexes — powinien być `idx_orders_tracking_refresh` z predykatem WHERE.

- [ ] **Krok 5: Commit**

```bash
git add packages/db/migrations/0008_tracking_refresh_index.sql packages/db/migrations/meta/_journal.json
git commit -m "feat(db): add partial index for tracking status cron refresh query"
```

---

## Task 6: Weryfikacja end-to-end

- [ ] **Krok 1: Uruchom pełny build**

```bash
turbo build --filter=api
```

Oczekiwane: build bez błędów TypeScript.

- [ ] **Krok 2: Test manualny — symulacja cron run**

```bash
cd apps/api && wrangler dev
```

W osobnym terminalu:
```bash
curl -X POST "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*" \
  -H "Content-Type: application/json"
```

Sprawdź logi — powinny pojawić się:
- `[AllegroOrders] Sync zakończony ...` (lub brak eventów)
- `[TrackingSync] Odświeżono tracking dla X/Y zamówień` (jeśli są kandydaci)
- Brak błędów TypeScript/runtime

- [ ] **Krok 3: Sprawdź brak race condition z manual refresh**

1. W UI otwórz modal zamówienia shipped
2. Kliknij "Odśwież status" — powinien ustawić KV lock `allegro:tracking:refresh:order:{id}`
3. Jednocześnie wywołaj cron (`curl` jak wyżej)
4. W logach: cron powinien pominąć to zamówienie (`locked — skip`) i odświeżyć pozostałe

- [ ] **Krok 4: Final commit jeśli potrzebny**

```bash
git status
# Jeśli są niezacommitowane zmiany:
git add -p
git commit -m "chore(api): tracking sync e2e verification cleanup"
```

---

## Podsumowanie zmian

```
apps/api/src/lib/allegro-orders/tracking-refresh.ts  ← NEW (cała logika)
apps/api/src/routes/admin/orders.ts                  ← usuń refreshOrderTrackingSnapshot, import + przekaż db
apps/api/src/index.ts                                ← +1 waitUntil w cron */5
packages/db/migrations/0008_tracking_refresh_index.sql ← NEW
packages/db/migrations/meta/_journal.json             ← +1 entry
```

**Nie zmienia się:**
- Zachowanie endpointu `POST /admin/orders/:id/tracking/refresh` — identyczne dla użytkownika
- Struktura tabeli `orders` — brak nowych kolumn
- Logika `syncAllegroOrders` — brak modyfikacji
- Frontend — brak zmian
