# Adaptive Pulse Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować inteligentny system auto-aktualizacji statusów przesyłek w panelu admina: adaptywny polling z interwałem opartym o status przesyłki, toast przy zmianie, SWR w modalu, fix buga "Brak przesyłki".

**Architecture:** Frontend co N minut (N zależy od trackingStatusCode najwyższego priorytetu) odpytuje lekki endpoint `GET /admin/orders/tracking-pulse?since=SERVER_TIMESTAMP`, patch-uje lokalny stan. `nextSince` pochodzi zawsze z serwera — zero clock drift. Tab nieaktywny → polling zatrzymany. Cron już działa (runTrackingStatusSync co 5 min).

**Tech Stack:** Hono.js 4.11, Drizzle ORM, Next.js 16 App Router, React 19, TypeScript, Cloudflare Workers KV, Tailwind CSS 4.

---

## Mapa plików

| Plik | Akcja | Odpowiedzialność |
|---|---|---|
| `apps/web/src/admin/lib/shipmentStatus.ts` | Modify | Fix: dodaj `none` i `unknown` do `DISPLAY_STATUS_MAP` |
| `apps/web/src/admin/types/admin-api.ts` | Modify | Dodaj `TrackingPulseUpdate`, `TrackingPulseResponse` |
| `apps/web/src/admin/lib/adminApiClient.ts` | Modify | Dodaj `getTrackingPulse()` |
| `apps/api/src/routes/admin/orders.ts` | Modify | Dodaj `GET /tracking-pulse` endpoint (przed istniejącymi trasami) |
| `apps/web/src/admin/hooks/useTrackingPulse.ts` | Create | Adaptive polling hook z visibilitychange i serverSince |
| `apps/web/src/admin/components/ui/TrackingToast.tsx` | Create | Stack-based toast komponent (max 3, auto-dismiss) |
| `apps/web/src/admin/views/Orders/index.tsx` | Modify | Podepnij hook + toast, patch orders state |
| `apps/web/src/admin/components/OrderDetailModal.tsx` | Modify | Obsłuż `already_refreshing` (retry po 10s), wskaźnik ładowania |

---

## Task 1: Fix buga — DISPLAY_STATUS_MAP

**Files:**
- Modify: `apps/web/src/admin/lib/shipmentStatus.ts`

- [ ] **Krok 1: Dodaj brakujące wpisy do mapy**

Otwórz `apps/web/src/admin/lib/shipmentStatus.ts`. Znajdź `const DISPLAY_STATUS_MAP`. Dodaj dwa wpisy na początku (przed `label_created`):

```typescript
const DISPLAY_STATUS_MAP: Record<string, ShipmentStage> = {
  none: { step: 0, label: 'Brak przesyłki' },
  unknown: { step: 1, label: 'Status nieznany' },
  label_created: { step: 1, label: 'Etykieta utworzona' },
  // ... reszta bez zmian
```

- [ ] **Krok 2: Commit**

```bash
git add apps/web/src/admin/lib/shipmentStatus.ts
git commit -m "fix(web): add none and unknown to DISPLAY_STATUS_MAP"
```

---

## Task 2: Typy i klient API dla tracking-pulse

**Files:**
- Modify: `apps/web/src/admin/types/admin-api.ts`
- Modify: `apps/web/src/admin/lib/adminApiClient.ts`

- [ ] **Krok 1: Dodaj typy do `admin-api.ts`**

Na końcu pliku `apps/web/src/admin/types/admin-api.ts` (po `OrderTrackingRefreshResponse`) dodaj:

```typescript
export interface TrackingPulseUpdate {
  id: number
  trackingStatus: string | null
  trackingStatusCode: string | null
  trackingStatusUpdatedAt: string | null
  trackingLastEventAt: string | null
  shipmentDisplayStatus: ShipmentDisplayStatus
  shipmentFreshness: ShipmentFreshness
}

export interface TrackingPulseResponse {
  success: boolean
  data: TrackingPulseUpdate[]
  nextSince: string
  hasMore: boolean
}
```

- [ ] **Krok 2: Dodaj import w `adminApiClient.ts`**

Znajdź blok importów na początku `apps/web/src/admin/lib/adminApiClient.ts`. Dodaj `TrackingPulseResponse` do listy importowanych typów:

```typescript
import type {
  // ... istniejące typy ...
  TrackingPulseResponse,
} from '../types/admin-api'
```

- [ ] **Krok 3: Dodaj metodę `getTrackingPulse` do `adminApi`**

W `adminApiClient.ts` w obiekcie `adminApi`, po `refreshOrderTracking`:

```typescript
  getTrackingPulse: (since?: string) => {
    const qs = since ? `?since=${encodeURIComponent(since)}` : ''
    return request<TrackingPulseResponse>(`/api/admin/orders/tracking-pulse${qs}`)
  },
```

- [ ] **Krok 4: Sprawdź typy**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: 0 błędów.

- [ ] **Krok 5: Commit**

```bash
git add apps/web/src/admin/types/admin-api.ts apps/web/src/admin/lib/adminApiClient.ts
git commit -m "feat(web): add TrackingPulseResponse types and getTrackingPulse API method"
```

---

## Task 3: Backend endpoint `GET /admin/orders/tracking-pulse`

**Files:**
- Modify: `apps/api/src/routes/admin/orders.ts`

- [ ] **Krok 1: Dodaj `inArray` do importów Drizzle**

Linia 7 w `apps/api/src/routes/admin/orders.ts`:

```typescript
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm'
```

- [ ] **Krok 2: Dodaj endpoint przed linią `adminOrdersRouter.use('*', requireAdminOrProxy())`**

Znajdź w pliku linię `// All admin order routes require admin role or internal proxy secret` (ok. linia 180). Wstaw **przed** nią:

```typescript
// ============================================
// GET /admin/orders/tracking-pulse  (public — auth via requireAdminOrProxy below)
// Lightweight delta endpoint for frontend adaptive polling.
// Returns only changed tracking fields for shipped/delivered orders since `since`.
// Uses LIMIT 51 trick: if 51 rows returned → hasMore:true (return 50, signal more).
// nextSince is always server-side Date.now() — never trust client clock.
// ============================================
adminOrdersRouter.get('/tracking-pulse', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const sinceParam = c.req.query('since')

    let sinceDate: Date
    if (sinceParam) {
      sinceDate = new Date(sinceParam)
      if (Number.isNaN(sinceDate.getTime())) {
        return c.json({ error: { code: 'INVALID_SINCE', message: 'Nieprawidłowy parametr since' } }, 400)
      }
    } else {
      // First poll — default to last 5 min so any recent cron run is included
      sinceDate = new Date(Date.now() - 5 * 60 * 1000)
    }

    // Capture server time BEFORE the query — used as nextSince in response.
    // Client must use this value in the next poll to avoid clock drift.
    const serverNow = new Date().toISOString()

    const rows = await db
      .select({
        id: orders.id,
        status: orders.status,
        trackingNumber: orders.trackingNumber,
        trackingStatus: orders.trackingStatus,
        trackingStatusCode: orders.trackingStatusCode,
        trackingStatusUpdatedAt: orders.trackingStatusUpdatedAt,
        trackingLastEventAt: orders.trackingLastEventAt,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.updatedAt} > ${sinceDate}`,
          inArray(orders.status, ['shipped', 'delivered']),
        ),
      )
      .orderBy(sql`${orders.updatedAt} ASC`)
      .limit(51)

    const hasMore = rows.length === 51
    const slice = hasMore ? rows.slice(0, 50) : rows

    const data = slice.map(o =>
      buildTrackingSnapshot({
        id: o.id,
        status: o.status,
        trackingNumber: o.trackingNumber ?? null,
        trackingStatus: o.trackingStatus ?? null,
        trackingStatusCode: o.trackingStatusCode ?? null,
        trackingStatusUpdatedAt: o.trackingStatusUpdatedAt ?? null,
        trackingLastEventAt: o.trackingLastEventAt ?? null,
      }),
    )

    return c.json({ success: true, data, nextSince: serverNow, hasMore })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/tracking-pulse', err)
  }
})
```

**Ważne:** Ten route musi być zarejestrowany PRZED `adminOrdersRouter.use('*', requireAdminOrProxy())`. Hono stosuje middleware sekwencyjnie — route zarejestrowany po `use('*')` przejdzie przez auth, ale route przed nim nie. Upewnij się że wpasowujesz kod PRZED tą linią.

Poczekaj — w Hono `use('*', middleware)` nie blokuje route'ów zarejestrowanych przed nim. Ale dla pewności: sprawdź czy inne route'y `GET /` itp. są po `use('*', ...)`. W tym pliku `adminOrdersRouter.use('*', requireAdminOrProxy())` jest na linii ~181, a route'y są po niej. Więc `/tracking-pulse` też powinien być po `use('*')`. Przenieś endpoint PO linii `adminOrdersRouter.use('*', requireAdminOrProxy())`.

Ostateczna pozycja: dodaj endpoint **po** `adminOrdersRouter.use('*', requireAdminOrProxy())` i **przed** `adminOrdersRouter.get('/', ...)`.

- [ ] **Krok 3: Sprawdź kompilację API**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: 0 błędów.

- [ ] **Krok 4: Lokalny smoke test**

```bash
cd apps/api && wrangler dev
```

W osobnym terminalu:
```bash
curl "http://localhost:8787/admin/orders/tracking-pulse" \
  -H "X-Admin-Internal-Secret: dev-secret"
```

Oczekiwane: `{"success":true,"data":[],"nextSince":"2026-...","hasMore":false}` (lub dane jeśli są zamówienia shipped).

- [ ] **Krok 5: Commit**

```bash
git add apps/api/src/routes/admin/orders.ts
git commit -m "feat(api): add GET /admin/orders/tracking-pulse delta endpoint"
```

---

## Task 4: TrackingToast komponent

**Files:**
- Create: `apps/web/src/admin/components/ui/TrackingToast.tsx`

- [ ] **Krok 1: Utwórz komponent**

```typescript
'use client'

import { useEffect, useRef } from 'react'

export interface TrackingToastMessage {
  id: string
  message: string
  type: 'info' | 'error'
  duration?: number
}

interface TrackingToastProps {
  messages: TrackingToastMessage[]
  onDismiss: (id: string) => void
}

export function TrackingToast({ messages, onDismiss }: TrackingToastProps) {
  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.slice(0, 3).map((msg) => (
        <ToastItem key={msg.id} msg={msg} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({
  msg,
  onDismiss,
}: {
  msg: TrackingToastMessage
  onDismiss: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(msg.id), msg.duration ?? 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [msg.id, msg.duration, onDismiss])

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm animate-in slide-in-from-bottom-2 fade-in duration-200 ${
        msg.type === 'error'
          ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-[#1A1A1A] text-white'
      }`}
    >
      <span className="flex-1 leading-snug">{msg.message}</span>
      <button
        onClick={() => onDismiss(msg.id)}
        className="shrink-0 text-base leading-none opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Zamknij"
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Krok 2: Commit**

```bash
git add apps/web/src/admin/components/ui/TrackingToast.tsx
git commit -m "feat(web): add TrackingToast component"
```

---

## Task 5: useTrackingPulse hook

**Files:**
- Create: `apps/web/src/admin/hooks/useTrackingPulse.ts`

- [ ] **Krok 1: Utwórz hook**

```typescript
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { adminApi } from '../lib/adminApiClient'
import type { AdminOrder, TrackingPulseUpdate } from '../types/admin-api'

// Mirrors backend cron cooldowns — no point polling faster than cron refreshes
const INTERVAL_MAP: Array<{ pattern: RegExp; ms: number }> = [
  { pattern: /OUT_FOR_DELIVERY|COURIER/i,       ms: 5  * 60 * 1000 },
  { pattern: /EXCEPTION|RETURN|FAILED/i,         ms: 20 * 60 * 1000 },
  { pattern: /IN_TRANSIT|TRANSIT|SENT/i,         ms: 30 * 60 * 1000 },
  { pattern: /LABEL_CREATED|CREATED|REGISTERED/i, ms: 90 * 60 * 1000 },
  { pattern: /DELIVERED|PICKED_UP/i,             ms: 12 * 60 * 60 * 1000 },
]
const FALLBACK_INTERVAL_MS = 60 * 60 * 1000 // 60 min for UNKNOWN

/** Returns shortest applicable interval among active orders, or null if none. */
function computeAdaptiveInterval(orders: AdminOrder[]): number | null {
  const active = orders.filter(
    (o) => o.status === 'shipped' || o.status === 'delivered',
  )
  if (active.length === 0) return null

  let min = FALLBACK_INTERVAL_MS
  for (const order of active) {
    const code = order.trackingStatusCode ?? ''
    for (const { pattern, ms } of INTERVAL_MAP) {
      if (pattern.test(code)) {
        if (ms < min) min = ms
        break
      }
    }
  }
  return min
}

export interface TrackingStatusChange {
  orderId: number
  orderNumber: string
  prevCode: string
  nextCode: string
}

export interface UseTrackingPulseOptions {
  orders: AdminOrder[]
  onOrdersUpdated: (updates: TrackingPulseUpdate[]) => void
  /** Called once per pulse with ALL changed orders (not per-order). Use count to decide single vs collective toast. */
  onStatusChanged: (changes: TrackingStatusChange[]) => void
  enabled?: boolean
}

export function useTrackingPulse({
  orders,
  onOrdersUpdated,
  onStatusChanged,
  enabled = true,
}: UseTrackingPulseOptions): void {
  // Refs — avoid stale closures without re-creating callbacks
  const serverSinceRef = useRef<string | null>(null)
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ordersRef      = useRef(orders)
  const enabledRef     = useRef(enabled)
  const cbRef          = useRef({ onOrdersUpdated, onStatusChanged })

  useEffect(() => { ordersRef.current = orders },            [orders])
  useEffect(() => { enabledRef.current = enabled },          [enabled])
  useEffect(() => { cbRef.current = { onOrdersUpdated, onStatusChanged } }, [onOrdersUpdated, onStatusChanged])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * Execute one poll cycle.
   * wakeFromHidden=true → patches UI silently, suppresses toasts.
   * After completion schedules next poll via adaptive interval.
   */
  const executePoll = useCallback(async (wakeFromHidden: boolean): Promise<void> => {
    if (!enabledRef.current) return

    const since = serverSinceRef.current ?? undefined

    try {
      const res = await adminApi.getTrackingPulse(since)

      // Always use server-provided nextSince — eliminates clock drift
      serverSinceRef.current = res.nextSince

      if (res.data.length > 0) {
        // Snapshot prev codes before notifying parent (parent mutates orders)
        const prevMap = new Map(
          ordersRef.current.map((o) => [
            o.id,
            { code: o.trackingStatusCode, number: o.orderNumber ?? `#${o.id}` },
          ]),
        )

        cbRef.current.onOrdersUpdated(res.data)

        if (!wakeFromHidden) {
          const changes: TrackingStatusChange[] = []
          for (const update of res.data) {
            const prev = prevMap.get(update.id)
            if (
              prev &&
              update.trackingStatusCode &&
              prev.code !== update.trackingStatusCode
            ) {
              changes.push({
                orderId: update.id,
                orderNumber: prev.number,
                prevCode: prev.code ?? 'UNKNOWN',
                nextCode: update.trackingStatusCode,
              })
            }
          }
          if (changes.length > 0) {
            cbRef.current.onStatusChanged(changes)
          }
        }
      }

      // hasMore → immediately fetch next page (cursor already advanced via serverSinceRef)
      if (res.hasMore) {
        void executePoll(wakeFromHidden)
        return
      }
    } catch {
      // Network error — will retry on next scheduled poll
    }

    // Schedule next poll based on current order statuses
    if (enabledRef.current) {
      const interval = computeAdaptiveInterval(ordersRef.current)
      if (interval !== null) {
        timerRef.current = setTimeout(() => void executePoll(false), interval)
      }
    }
  }, []) // No deps — uses only refs

  // Derived stable key: changes only when the SET of shipped/delivered order IDs changes.
  // This prevents re-triggering when tracking status of an existing order updates.
  const activeKey = orders
    .filter((o) => o.status === 'shipped' || o.status === 'delivered')
    .map((o) => o.id)
    .sort((a, b) => a - b)
    .join(',')

  useEffect(() => {
    stopTimer()
    if (!enabled) return

    const interval = computeAdaptiveInterval(orders)
    if (interval === null) return

    // Fire immediately so admin sees fresh data on page load / filter change
    void executePoll(false)

    return stopTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, enabled, executePoll, stopTimer])

  // Pause/resume on tab visibility
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopTimer()
      } else if (enabledRef.current) {
        // Silent poll on wake — patches UI without toasts
        void executePoll(true)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stopTimer()
    }
  }, [executePoll, stopTimer])
}
```

- [ ] **Krok 2: Sprawdź typy**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: 0 błędów.

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/admin/hooks/useTrackingPulse.ts
git commit -m "feat(web): add useTrackingPulse adaptive polling hook"
```

---

## Task 6: Podepnij hook i toast do OrdersView

**Files:**
- Modify: `apps/web/src/admin/views/Orders/index.tsx`

- [ ] **Krok 1: Dodaj importy na górze pliku**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'  // useState już jest
import { useTrackingPulse } from '../../hooks/useTrackingPulse'
import { TrackingToast, type TrackingToastMessage } from '../../components/ui/TrackingToast'
import type { TrackingPulseUpdate } from '../../types/admin-api'
import type { TrackingStatusChange } from '../../hooks/useTrackingPulse'
```

- [ ] **Krok 2: Dodaj stan toastów do `OrdersView`**

Po istniejących `useState` (np. po `const [shipmentOrder, ...]`):

```typescript
const [toasts, setToasts] = useState<TrackingToastMessage[]>([])
const toastCounterRef = useRef(0)
```

- [ ] **Krok 3: Dodaj callback `patchOrders`**

Po `handleStatusChange`:

```typescript
const patchOrders = useCallback((updates: TrackingPulseUpdate[]) => {
  const map = new Map(updates.map((u) => [u.id, u]))
  setOrders((prev) =>
    prev.map((o) => {
      const u = map.get(o.id)
      if (!u) return o
      return {
        ...o,
        trackingStatus: u.trackingStatus,
        trackingStatusCode: u.trackingStatusCode,
        trackingStatusUpdatedAt: u.trackingStatusUpdatedAt,
        trackingLastEventAt: u.trackingLastEventAt,
        shipmentDisplayStatus: u.shipmentDisplayStatus,
        shipmentFreshness: u.shipmentFreshness,
      }
    }),
  )
}, [])
```

- [ ] **Krok 4: Dodaj callback `handleTrackingChanged`**

```typescript
const handleTrackingChanged = useCallback((changes: TrackingStatusChange[]) => {
  toastCounterRef.current += 1
  const id = `tracking-${toastCounterRef.current}`

  const label = (code: string): string => {
    if (/OUT_FOR_DELIVERY|COURIER/i.test(code)) return 'W doręczeniu'
    if (/DELIVERED|PICKED_UP/i.test(code))      return 'Dostarczona'
    if (/IN_TRANSIT|TRANSIT|SENT/i.test(code))  return 'W drodze'
    if (/EXCEPTION|RETURN|FAILED/i.test(code))  return 'Problem z przesyłką'
    if (/LABEL_CREATED|CREATED|REGISTERED/i.test(code)) return 'Etykieta'
    return code
  }

  // Single change → specific toast; multiple → collective toast
  const message =
    changes.length === 1
      ? `${changes[0].orderNumber} — ${label(changes[0].prevCode)} → ${label(changes[0].nextCode)}`
      : `Zaktualizowano status ${changes.length} przesyłek`

  setToasts((prev) => [
    ...prev.slice(-2), // max 3 widoczne
    { id, message, type: 'info' as const, duration: 4000 },
  ])
}, [])
```

- [ ] **Krok 5: Podepnij hook**

Po deklaracji callbacków (np. po `handleTrackingChanged`):

```typescript
useTrackingPulse({
  orders,
  onOrdersUpdated: patchOrders,
  onStatusChanged: handleTrackingChanged,
})
```

- [ ] **Krok 6: Renderuj `TrackingToast`**

Na samym końcu JSX `OrdersView`, bezpośrednio przed zamknięciem `</div>` lub `</>` komponentu:

```typescript
<TrackingToast
  messages={toasts}
  onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
/>
```

- [ ] **Krok 7: Sprawdź typy**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: 0 błędów.

- [ ] **Krok 8: Commit**

```bash
git add apps/web/src/admin/views/Orders/index.tsx
git commit -m "feat(web): wire useTrackingPulse and TrackingToast into OrdersView"
```

---

## Task 7: Ulepszenie OrderDetailModal

**Files:**
- Modify: `apps/web/src/admin/components/OrderDetailModal.tsx`

- [ ] **Krok 1: Dodaj obsługę `already_refreshing` — retry po 10s**

Znajdź w `OrderDetailModal` funkcję `refreshTrackingSnapshot` (ok. linia 158). Dodaj `retryTimerRef` i logikę retry:

Po importach na górze pliku dodaj:
```typescript
// (useRef jest już zaimportowany)
```

W ciele `OrderDetailModal` po istniejących `useState`:
```typescript
const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

Zaktualizuj `refreshTrackingSnapshot`:
```typescript
const refreshTrackingSnapshot = useCallback(async (showError = true) => {
  if (!order) return
  if (order.source !== 'allegro' || !order.externalId) return

  // Clear any pending retry
  if (retryTimerRef.current) {
    clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null
  }

  setTrackingLoading(true)
  setTrackingError(null)
  try {
    const res = await adminApi.refreshOrderTracking(order.id)
    setTracking(res.data)

    // Backend returned stale snapshot because cron/another request has the lock.
    // Schedule a re-poll of just the snapshot in 10s to pick up the fresh data.
    if (res.reason === 'already_refreshing') {
      retryTimerRef.current = setTimeout(() => {
        void refreshTrackingSnapshot(false)
      }, 10_000)
    }
  } catch {
    if (showError) {
      setTrackingError('Nie udało się odświeżyć statusu przesyłki')
    }
  } finally {
    setTrackingLoading(false)
  }
}, [order])
```

Wyczyść timer przy zamknięciu modalu — w `useEffect` obsługującym `isOpen`:
```typescript
useEffect(() => {
  if (!isOpen) {
    // Clear retry timer when modal closes
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    return
  }
  // ... istniejąca logika auto-refresh
}, [isOpen, order, refreshTrackingSnapshot])
```

- [ ] **Krok 2: Dodaj wskaźnik ładowania w sekcji przesyłki**

Znajdź w JSX modalu gdzie renderowana jest sekcja przesyłki (szukaj `ShipmentTimeline` lub `canRefresh`). Tuż przed przyciskiem "Odśwież status" / sekcją trackingu dodaj wskaźnik:

```typescript
{canRefresh && trackingLoading && (
  <p className="text-xs text-[#A3A3A3] animate-pulse mt-1">
    Sprawdzam status przesyłki...
  </p>
)}
{canRefresh && !trackingLoading && effectiveTrackingStatusUpdatedAt && (
  <p className="text-xs text-[#A3A3A3] mt-1">
    Zaktualizowano: {formatDate(effectiveTrackingStatusUpdatedAt)}
  </p>
)}
```

- [ ] **Krok 3: Sprawdź typy**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: 0 błędów.

- [ ] **Krok 4: Commit**

```bash
git add apps/web/src/admin/components/OrderDetailModal.tsx
git commit -m "feat(web): handle already_refreshing in modal SWR, add loading indicator"
```

---

## Task 8: Build i weryfikacja

- [ ] **Krok 1: Pełny type-check**

```bash
turbo type-check
```

Oczekiwane: 0 błędów w `web` i `api`.

- [ ] **Krok 2: Build API**

```bash
turbo build --filter=api
```

Oczekiwane: build bez błędów.

- [ ] **Krok 3: Lokalny test endpoint**

```bash
cd apps/api && wrangler dev
```

```bash
# Test 1: bez parametru since (pierwsze wywołanie)
curl "http://localhost:8787/admin/orders/tracking-pulse" \
  -H "X-Admin-Internal-Secret: dev-secret"
# Oczekiwane: {"success":true,"data":[...],"nextSince":"2026-...Z","hasMore":false}

# Test 2: z nextSince z poprzedniej odpowiedzi
curl "http://localhost:8787/admin/orders/tracking-pulse?since=2026-04-12T10%3A00%3A00.000Z" \
  -H "X-Admin-Internal-Secret: dev-secret"
# Oczekiwane: data:[] jeśli brak zmian od tamtej chwili
```

- [ ] **Krok 4: Test UI — fix "Brak przesyłki"**

1. Otwórz panel admina → lista zamówień
2. Znajdź zamówienie `shipped` z Allegro bez numeru śledzenia
3. Sprawdź czy pokazuje "Brak przesyłki" (nie "Przyjęte" ani błędną etykietę)

- [ ] **Krok 5: Test UI — adaptive polling**

1. Otwórz DevTools → Network
2. Przefiltruj po `tracking-pulse`
3. Poczekaj — powinny się pojawiać requesty w interwałach zgodnych z najwyższym statusem zamówień
4. Przełącz tab na inny — requesty zatrzymują się
5. Wróć — natychmiastowy request, potem restart timera

- [ ] **Krok 6: Test UI — toast**

Trudny do wywołania manualnie — można symulować przez bezpośrednie wywołanie `handleTrackingChanged` w React DevTools, lub poczekać na rzeczywistą zmianę statusu w cyklu cronu.

- [ ] **Krok 7: Push**

```bash
git push origin main
```

---

## Podsumowanie zmian

```
apps/web/src/admin/lib/shipmentStatus.ts         ← fix: +none, +unknown w mapie
apps/web/src/admin/types/admin-api.ts            ← +TrackingPulseUpdate, +TrackingPulseResponse
apps/web/src/admin/lib/adminApiClient.ts         ← +getTrackingPulse()
apps/api/src/routes/admin/orders.ts              ← +GET /tracking-pulse endpoint
apps/web/src/admin/hooks/useTrackingPulse.ts     ← NEW adaptive polling hook
apps/web/src/admin/components/ui/TrackingToast.tsx ← NEW toast komponent
apps/web/src/admin/views/Orders/index.tsx        ← hook + toast + patchOrders
apps/web/src/admin/components/OrderDetailModal.tsx ← already_refreshing retry + loading
```

Brak migracji DB. Brak nowych kolumn. Brak WebSocketów.
