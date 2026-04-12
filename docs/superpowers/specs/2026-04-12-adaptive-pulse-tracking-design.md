# Adaptive Pulse — Inteligentny system auto-aktualizacji przesyłek

**Data:** 2026-04-12  
**Zakres:** Panel admina (priorytet) + przygotowanie pod /account/orders  
**Status:** Zatwierdzone przez użytkownika

---

## 1. Cel

Zbudować inteligentny, samoregulujący się system automatycznych aktualizacji statusów przesyłek w panelu admina. System ma być:

- **Tani dla Neon** — polling odpytuje DB tylko gdy są aktywne zamówienia, nie częściej niż cron produkuje nowe dane
- **Tani dla Workers** — lekki edge endpoint, minimalne payload, pauzuje gdy tab nieaktywny
- **Adaptywny** — interwał pollingu wynika ze stanu zamówień, nie ze stałego timera
- **Transparentny dla admina** — status odświeża się sam, toast przy zmianie, wskaźnik świeżości

---

## 2. Architektura

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Workers Cron (*/5 * * * *)                       │
│  runTrackingStatusSync()                                     │
│  └─ KV guard → selectCandidates → refreshSnapshot → DB      │
└────────────────────────┬────────────────────────────────────┘
                         │ aktualizuje orders.tracking*
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Neon DB — tabela orders                                     │
│  tracking_status, tracking_status_code,                     │
│  tracking_status_updated_at, shipment_display_status        │
└────────────────────────┬────────────────────────────────────┘
                         │ GET /tracking-pulse?since=T
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend — useTrackingPulse(orders)                         │
│  ├─ oblicza urgency tier → adaptiveInterval                 │
│  ├─ setTimeout(poll, adaptiveInterval)                      │
│  ├─ pauzuje na visibilitychange:hidden                      │
│  ├─ patch lokalny stan orders (tylko zmienione)             │
│  └─ toast gdy zmiana + aktualizacja otwartego modalu        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Kluczowa zasada: symetria z backendem

Interwał pollingu frontendu **lustrzanie odzwierciedla cooldowny cronu**. Nigdy nie pytamy częściej niż cron produkuje nowe dane.

| `trackingStatusCode` (najwyższy priorytet w widoku) | Interwał pollingu | Cooldown cronu |
|---|---|---|
| `*OUT_FOR_DELIVERY*` / `*COURIER*` | 5 min | 5 min |
| `*EXCEPTION*` / `*RETURN*` / `*FAILED*` | 20 min | 20 min |
| `*IN_TRANSIT*` / `*TRANSIT*` / `*SENT*` | 30 min | 30 min |
| `*LABEL_CREATED*` / `*REGISTERED*` | 90 min | 90 min |
| `*DELIVERED*` / `*PICKED_UP*` | 12 h | 12 h |
| `UNKNOWN` / null | 60 min | 60 min |
| Brak zamówień shipped/delivered w widoku | brak pollingu | KV guard = skip |

Interwał obliczany client-side z załadowanych danych — zero dodatkowych requestów. Przy zmianie statusu zamówienia (np. `IN_TRANSIT` → `OUT_FOR_DELIVERY`) interwał skraca się automatycznie.

---

## 4. Backend: nowy endpoint

### `GET /admin/orders/tracking-pulse`

**Query params:**
- `since` — ISO timestamp, np. `2026-04-12T10:00:00.000Z`

**Auth:** adminMiddleware (ten sam co reszta)

**Query Neon:**
```sql
SELECT id, tracking_status, tracking_status_code, tracking_status_updated_at, 
       tracking_last_event_at, shipment_display_status (computed)
FROM orders
WHERE updated_at > :since
  AND status IN ('shipped', 'delivered')
ORDER BY tracking_status_updated_at DESC
LIMIT 50
```

Trafia w istniejący partial index `idx_orders_tracking_refresh`. Brak Allegro API call. Brak KV write.

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "trackingStatus": "Paczka w drodze",
      "trackingStatusCode": "IN_TRANSIT",
      "trackingStatusUpdatedAt": "2026-04-12T10:05:00.000Z",
      "trackingLastEventAt": "2026-04-12T09:58:00.000Z",
      "shipmentDisplayStatus": "in_transit",
      "shipmentFreshness": "fresh"
    }
  ]
}
```

Pusta tablica `data: []` gdy brak zmian → ~30 bajtów, ~1ms Neon.

---

## 5. Frontend: useTrackingPulse hook

**Lokalizacja:** `apps/web/src/admin/hooks/useTrackingPulse.ts`

```typescript
interface TrackingPulseOptions {
  orders: AdminOrder[]
  onOrdersUpdated: (updates: TrackingSnapshot[]) => void
  onStatusChanged: (orderId: number, prev: string, next: string) => void
  enabled?: boolean
}
```

**Algorytm:**

1. `computeAdaptiveInterval(orders)` — skanuje orders w statusie shipped/delivered, bierze najwyższy priorytet (najkrótszy interwał), zwraca ms lub `null` (brak pollingu)
2. `scheduleNextPoll(interval)` — `setTimeout` z dynamicznym interwałem
3. `executePoll()`:
   - Wywołuje `GET /tracking-pulse?since={lastPollAt}`
   - Jeśli pusta odpowiedź → tylko aktualizuje `lastPollAt`, reschedules
   - Jeśli zmiany → wywołuje `onOrdersUpdated(changes)`
   - Porównuje `trackingStatusCode` przed/po → jeśli zmiana → `onStatusChanged`
   - Reschedules z przeliczonym interwałem
4. `visibilitychange`:
   - `hidden` → clearTimeout, zatrzymuje polling
   - `visible` → natychmiastowy poll (mogło coś zmienić się gdy tab był nieaktywny), restart timera

**Zarządzanie `lastPollAt`:**
- Inicjalizowane: `Date.now()` przy mount
- Na focus po pauzie: cofnięte o 2× aktualny interwał (żeby odświeżyć to co mogło się zmienić podczas pauzy)
- Nie persystowane między sesjami (odświeżenie strony = nowy snapshot)

---

## 6. Modal: Stale-While-Revalidate

**Plik:** `apps/web/src/admin/components/OrderDetailModal.tsx`

**Flow:**
1. Modal otwiera się → pokazuje snapshot z DB natychmiast (brak loadera)
2. Jeśli `shipmentFreshness === 'stale' || 'unknown'` → auto-trigger `POST /admin/orders/:id/tracking/refresh` w tle
3. W trakcie odświeżania: subtelny tekst "Sprawdzam status..." przy sekcji przesyłki
4. Po zwrocie: aktualizacja danych modalu, zmiana tekstu na "Zaktualizowano [relative time]"
5. Jeśli status zmienił się vs poprzedni snapshot → toast "Status przesyłki: W drodze → Doręczono"

**Manual refresh button:** zawsze widoczny (nie tylko gdy stale). Pokazuje spinner gdy w trakcie. Disabled gdy KV lock aktywny (odpowiedź 429 → przycisk wyszarza się z tooltipem "Odświeżono przed chwilą").

---

## 7. Toast system

**Lokalizacja:** `apps/web/src/admin/components/ui/TrackingToast.tsx`

**Przypadki:**
- Zmiana statusu via pulse: `"Zamówienie #1234 — Paczka w drodze → W doręczeniu"` (4 s, auto-dismiss)
- Zmiana statusu via modal SWR: `"Status zaktualizowany: Etykieta → W drodze"` (3 s)
- Błąd odświeżania: `"Nie udało się odświeżyć statusu"` (czerwony, 5 s)
- Wiele zmian naraz (pulse zwróci np. 3 zamówienia): `"Zaktualizowano status 3 przesyłek"` (zbiorczy, 4 s)

Toasty stackują się (max 3 widoczne jednocześnie), najnowszy na górze.

Jeśli otwarty jest modal zamówienia, którego status się zmienił → zamiast toastu, aktualizacja inline w modalu (toast byłby redundantny).

---

## 8. Wskaźnik świeżości w liście zamówień

Obecny kod już wyświetla `• stare dane` przy `shipmentFreshness === 'stale'`. Po wdrożeniu:
- `fresh` → tylko status, bez wskaźnika
- `stale` → `• stare dane` (zostaje)
- `unknown` → `• brak danych` (nowe)

Relatywny czas (np. "2 min temu") — opcjonalnie w tooltipie na hover przy kolumnie przesyłki.

---

## 9. Fix buga: DISPLAY_STATUS_MAP

**Plik:** `apps/web/src/admin/lib/shipmentStatus.ts`

Brakujące wpisy w `DISPLAY_STATUS_MAP`:
```typescript
none: { step: 0, label: 'Brak przesyłki' },
unknown: { step: 1, label: 'Status nieznany' },
```

Bez tego fix każdy `shipmentDisplayStatus === 'none'` (zamówienie bez numeru śledzenia) spada do fallbacku i pokazuje błędną etykietę.

---

## 10. Rozszerzenie na /account/orders (przyszłość)

Architektura jest już zaprojektowana pod to:
- `useTrackingPulse` hook jest generyczny — przyjmuje callback, nie zna nic o panelu admina
- Nowy endpoint `GET /orders/tracking-pulse?since=T` dla zalogowanych klientów (user auth zamiast admin auth), filtrowany po `user_id`
- Ten sam hook, inne źródło danych
- Interwał adaptywny identyczny — klient też nie chce ciągłego pollingu gdy paczka delivered

---

## 11. Pliki zmieniane

| Plik | Zmiana |
|---|---|
| `apps/api/src/routes/admin/orders.ts` | +endpoint `GET /tracking-pulse` |
| `apps/web/src/admin/hooks/useTrackingPulse.ts` | Nowy hook |
| `apps/web/src/admin/views/Orders/index.tsx` | Podpięcie hooka, patch state, toast |
| `apps/web/src/admin/components/OrderDetailModal.tsx` | Auto SWR na otwarciu, loading state |
| `apps/web/src/admin/components/ui/TrackingToast.tsx` | Nowy komponent toastów |
| `apps/web/src/admin/lib/shipmentStatus.ts` | +`none`, +`unknown` w mapie |

Brak migracji DB. Brak nowych kolumn. Brak WebSocketów.

---

## 12. Kryteria sukcesu

- Admin widzi aktualny status przesyłki bez przeładowania strony
- Interwał pollingu adaptuje się do statusu (OUT_FOR_DELIVERY = 5 min, nie 30 min)
- Tab nieaktywny = 0 requestów do Workers/Neon
- Brak zamówień w transporcie = 0 requestów
- Modal pokazuje dane natychmiast, odświeża w tle gdy stale
- Toast przy zmianie statusu podczas pracy admina
- Fix "Brak przesyłki" — poprawna etykieta dla zamówień bez przesyłki
