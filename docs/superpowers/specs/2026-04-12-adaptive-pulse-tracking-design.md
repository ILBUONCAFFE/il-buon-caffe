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
- `since` — ISO timestamp **dostarczony przez serwer** (nie `Date.now()` klienta — patrz niżej)

**Auth:** adminMiddleware (ten sam co reszta)

**Query Neon:**
```sql
SELECT id, tracking_status, tracking_status_code, tracking_status_updated_at, 
       tracking_last_event_at, shipment_display_status (computed)
FROM orders
WHERE updated_at > :since
  AND status IN ('shipped', 'delivered')
ORDER BY updated_at ASC
LIMIT 51
```

`LIMIT 51` zamiast 50 — jeśli zwróci 51 wierszy, wiemy że jest `hasMore: true` (zwracamy tylko 50, odrzucamy ostatni jako marker).

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
  ],
  "nextSince": "2026-04-12T10:05:01.000Z",
  "hasMore": false
}
```

- `nextSince` — **czas serwera** w momencie wykonania zapytania (`new Date().toISOString()`). Klient zawsze używa tej wartości w kolejnym poll, nigdy lokalnego `Date.now()`. Eliminuje clock drift.
- `hasMore: true` — gdy zmian jest więcej niż 50. Klient natychmiast odpytuje ponownie z `nextSince` z poprzedniej odpowiedzi (bez czekania na timer).
- Pusta tablica `data: []` gdy brak zmian → ~50 bajtów, ~1ms Neon.

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
3. `executePoll(wakeFromHidden = false)`:
   - Wywołuje `GET /tracking-pulse?since={serverSince}` — zawsze timestamp serwera, nie Date.now()
   - Jeśli `hasMore: true` → natychmiast wywołuje kolejny poll (cursor przez `nextSince`), bez timera
   - Jeśli pusta odpowiedź → zapisuje `nextSince`, reschedules
   - Jeśli zmiany → wywołuje `onOrdersUpdated(changes)`
   - Porównuje `trackingStatusCode` przed/po → jeśli zmiana i `!wakeFromHidden` → `onStatusChanged` (toast)
   - Jeśli zmiana i `wakeFromHidden` → tylko patch UI, bez toastu (admin nie potrzebuje powiadomienia o zmianach z przeszłości)
   - Zapisuje `nextSince` z odpowiedzi, reschedules z przeliczonym interwałem
4. `visibilitychange`:
   - `hidden` → clearTimeout, zatrzymuje polling
   - `visible` → natychmiastowy `executePoll(wakeFromHidden: true)`, restart timera

**Zarządzanie `serverSince`:**
- Inicjalizowane: `null` → przy pierwszym poll serwer zwraca `nextSince`, zapisywany jako `serverSince`
- Przy pierwszym wywołaniu (brak `serverSince`): backend używa `NOW() - 5 min` jako domyślne `since` (obsługiwane server-side gdy brak parametru)
- Na focus po pauzie: używa zapamiętanego `serverSince` — serwer zwróci wszystko co się zmieniło od ostatniego poll, niezależnie jak długo tab był nieaktywny
- Nie persystowane między sesjami (odświeżenie strony = nowy snapshot)

**Zakres hooka (scope):**
Hook aktualizuje wyłącznie zamówienia aktualnie załadowane w pamięci klienta (aktualna strona listy). Nie jest globalnym systemem powiadomień — jeśli admin przefiltruje widok do statusu "Nowe", polling zatrzymuje się (brak shipped/delivered w pamięci). To jest zamierzone zachowanie: tracking pulse służy do odświeżania widocznych danych, nie do monitowania całej bazy.

---

## 6. Modal: Stale-While-Revalidate

**Plik:** `apps/web/src/admin/components/OrderDetailModal.tsx`

**Flow:**
1. Modal otwiera się → pokazuje snapshot z DB natychmiast (brak loadera)
2. Jeśli `shipmentFreshness === 'stale' || 'unknown'` → auto-trigger `POST /admin/orders/:id/tracking/refresh` w tle
3. W trakcie odświeżania: subtelny tekst "Sprawdzam status..." przy sekcji przesyłki
4. Po zwrocie: aktualizacja danych modalu, zmiana tekstu na "Zaktualizowano [relative time]"
5. Jeśli status zmienił się vs poprzedni snapshot → toast "Status przesyłki: W drodze → Doręczono"

**Manual refresh button:** zawsze widoczny (nie tylko gdy stale). Pokazuje spinner gdy w trakcie. Disabled gdy KV lock aktywny (odpowiedź 409 Conflict → przycisk wyszarza się z tooltipem "Odświeżono przed chwilą").

**Race condition modal vs cron:** rozwiązana przez istniejący KV lock `allegro:tracking:refresh:order:{id}` (TTL 180s). Gdy cron lub inny request już odświeża to zamówienie, endpoint zwraca `409 Conflict` z body `{ "refreshInProgress": true }`. Frontend interpretuje 409 jako "już się odświeża w tle" — wyświetla "Sprawdzam status..." i po 10s odpytuje `GET /admin/orders/:id` o nowy snapshot zamiast ponownie triggerować refresh.

---

## 7. Toast system

**Lokalizacja:** `apps/web/src/admin/components/ui/TrackingToast.tsx`

**Przypadki:**
- Zmiana statusu via pulse: `"Zamówienie #1234 — Paczka w drodze → W doręczeniu"` (4 s, auto-dismiss)
- Zmiana statusu via modal SWR: `"Status zaktualizowany: Etykieta → W drodze"` (3 s)
- Błąd odświeżania: `"Nie udało się odświeżyć statusu"` (czerwony, 5 s)
- Wiele zmian naraz (pulse zwróci >1 zamówienie): `"Zaktualizowano status 3 przesyłek"` (zbiorczy, 4 s) — próg: `data.length > 1`

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
