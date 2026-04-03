# Order Management Redesign — Specyfikacja

**Data:** 2026-04-03  
**Status:** Zatwierdzony  
**Scope:** `apps/web` (admin UI) + `apps/api` (nowe endpointy) + `packages/db` (1 nowa kolumna)

---

## 1. Cel i kontekst

Przeprojektowanie widoku zarządzania zamówieniami w panelu admina, eliminacja Kanban (zbyt skomplikowane mapowanie statusów Allegro), redesign wizualny tabeli i modalu, oraz pełna dwukierunkowa integracja z Allegro Shipment Management API (tworzenie przesyłek, generowanie etykiet PDF, aktualizacja statusów fulfillment).

---

## 2. Usuwane elementy

- **`KanbanView`** — cały komponent do usunięcia z `apps/web/src/admin/views/Orders/index.tsx`
- Przełącznik widoków (lista/kanban) z headera
- Powiązana logika drag-and-drop

Plik `views/Orders/index.tsx` (534 linii) przepisujemy od zera. Stary `OrderDetailModal.tsx` (410 linii) — zastępujemy nowym komponentem.

---

## 3. Architektura widoków

**Główna strona:** `/admin/zamowienia`  
**Komponenty:** `apps/web/src/admin/views/Orders/`

```
OrdersView              — główny widok, filtry, tabela, paginacja
OrdersTable             — tabela z bulk select, wiersze, context menu
OrderRow                — pojedynczy wiersz
OrderContextMenu        — własny context menu (React portal do body)
OrderDetailModal        — redesigned modal detali
ShipmentModal           — modal "Nadaj przesyłkę" (3-krokowy stepper)
OrderStatusBadge        — nowy system badge'y (lokalny + Allegro fulfillment)
BulkActionBar           — floating bar przy bulk select
```

---

## 4. Tabela zamówień

### Kolumny

| # | Nazwa | Zawartość | Szerokość |
|---|-------|-----------|-----------|
| 1 | ☐ | Checkbox bulk select | 40px |
| 2 | Zamówienie | Numer `IBC-YYYY-NNNNN` + badge źródła + ikona FV | 180px |
| 3 | Klient | Imię nazwisko + email (szary, mniejszy) | 220px |
| 4 | Produkty | Pierwszy produkt + `+N więcej` chip | flex |
| 5 | Kwota | Total bold + waluta + ikona zegara jeśli pending | 110px |
| 6 | Status | `OrderStatusBadge` (patrz niżej) | 160px |
| 7 | ··· | Ikona dots — otwiera context menu | 48px |

### Wiersze

- Wysokość: 56px
- Hover: `bg-white/5`
- Kliknięcie wiersza → otwiera `OrderDetailModal`
- Prawy przycisk myszy → otwiera `OrderContextMenu`

### System statusów — `OrderStatusBadge`

Badge łączy lokalny status z Allegro fulfillment status:

```
[● Opłacone]              — lokalny paid, brak rozbieżności
[▲ Opłacone · Allegro ⚠]  — lokalny paid, Allegro fulfillment nie zsynchronizowany
[⚠ Wysłane · SENT↑]       — lokalny shipped, Allegro fulfillment = SENT ✓
```

Rozbieżność (lokalny `shipped` ale Allegro nadal `NEW`/`PROCESSING`) wyświetlana jako ostrzeżenie na badge — nigdy cicha porażka.

### Bulk select i action bar

- Checkbox w headerze = zaznacz wszystkie na bieżącej stronie
- Po zaznaczeniu ≥1 wiersza pojawia się floating `BulkActionBar` na dole ekranu:
  ```
  [N zaznaczonych] [Zmień status ▾] [Pobierz etykiety ZIP] [Anuluj zaznaczenie]
  ```
- "Pobierz etykiety ZIP" → `POST /shipment-management/label` z tablicą `shipmentIds` (tylko zamówienia z wygenerowaną przesyłką), `Accept: application/zip`

---

## 5. Context Menu

Komponent `OrderContextMenu` renderowany przez React portal do `document.body`. Zamykany kliknięciem poza / Escape. Pozycjonowany przy kursorze z ograniczeniem do viewport.

```
┌─────────────────────────────┐
│  Otwórz szczegóły      ↵   │
├─────────────────────────────┤
│  Zmień status           ›  │──► podmenu z dozwolonymi przejściami
├─────────────────────────────┤
│  Nadaj przesyłkę           │  ← aktywne tylko gdy status = paid | processing
├─────────────────────────────┤
│  Pobierz etykietę          │  ← aktywne tylko gdy allegroShipmentId != null
├─────────────────────────────┤
│  ─────────────────────      │
│  Kopiuj nr zamówienia       │
│  Kopiuj email klienta       │
├─────────────────────────────┤
│  Otwórz na Allegro    ↗   │  ← tylko gdy source = allegro
└─────────────────────────────┘
```

**Zachowanie podmenu "Zmień status":**
- Pokazuje wszystkie statusy
- Niedostępne przejścia: wyszarzone + `cursor-not-allowed` (nie ukryte)
- Dozwolone przejścia per status (z `apps/api/src/routes/admin/orders.ts`):
  - `pending` → paid, cancelled
  - `paid` → processing, cancelled
  - `processing` → shipped, cancelled
  - `shipped` → delivered
  - `delivered`, `cancelled` → brak (wszystkie wyszarzone)

**"Pobierz etykietę":** jeśli `allegroShipmentId = null` → pozycja wyszarzona z tooltipem "Najpierw nadaj przesyłkę". Implementacja bez bibliotek zewnętrznych — własny CSS zgodny z systemem designu admin panelu.

---

## 6. Redesign Modalu Detali — `OrderDetailModal`

**Rozmiar:** `max-w-5xl`, wysokość `90vh`, przewijalne body.

### Header

```
IBC-2026-00123  [Allegro]  [FV]                [● Opłacone]  [✕]
12 marca 2026, 14:32
```

### Body — dwie kolumny (40% / 60%)

**Lewa kolumna:**
- Klient: imię, email, telefon, login Allegro (jeśli dostępny)
- Dostawa: pełny adres
- Faktura (jeśli `invoiceRequired`): NIP, nazwa firmy lub "Faktura dla osoby prywatnej", adres
- Notatka klienta (jeśli `notes`): żółty callout

**Prawa kolumna:**
- Tabela produktów: SKU, nazwa, cena jedn., ilość, łączna
- Footer tabeli: dostawa, separator, **Razem** bold
- Płatność: metoda + status + data opłacenia
- Przesyłka:
  - Przed nadaniem: komunikat "Brak przesyłki" + przycisk "Nadaj przesyłkę"
  - Po nadaniu: przewoźnik, numer śledzenia (monospace), status Allegro, `[Pobierz etykietę PDF]`

### Footer

```
[Anuluj zamówienie]                          [Edytuj]  [Nadaj przesyłkę →]
```

- "Anuluj zamówienie": lewy, destructive, widoczny tylko gdy status pozwala
- "Nadaj przesyłkę" → zastępuje się "Pobierz etykietę" po wygenerowaniu przesyłki

---

## 7. Modal "Nadaj przesyłkę" — `ShipmentModal`

3-krokowy stepper. `max-w-2xl`.

### Krok 1 — Wybór przewoźnika

Pobiera dostępne usługi z `GET /admin/shipment/delivery-services` (proxy do Allegro). Karty przewoźników: nazwa + ikona + typ usługi. **Bez cen** (ceny z cenników Allegro będą konfigurowalne w ustawieniach — osobny moduł).

Przewoźnicy: InPost Paczkomat, InPost Kurier, DPD Kurier, DPD Pickup, Pocztex Kurier, Pocztex Automat, ORLEN Paczka.

DHL: ukryty z tooltipem "Wymaga programu Allegro Delivery — skonfiguruj w ustawieniach".

### Krok 2 — Dane paczki

Pola: Długość (cm), Szerokość (cm), Wysokość (cm), Waga rzeczywista (kg).

Kalkulator wagi gabarytowej (live, po każdej zmianie):
```
Waga rzeczywista:        X.X kg
Waga gabarytowa:         Y.Y kg   = (D×S×W) / dzielnik_przewoźnika
Waga przeliczeniowa:     Z.Z kg   = max(rzeczywista, gabarytowa)
```

Dzielniki per przewoźnik (z `GET /shipment-management/delivery-services`, cache w KV):
- InPost: 5000
- DPD: 6000
- DHL krajowy: 5000, DHL eksport: 4000
- Pocztex: brak (tylko masa rzeczywista)

Walidacja wymiarów w locie — błąd inline gdy przekroczony limit przewoźnika (np. InPost Paczkomat max 41×38×64 cm, max 25 kg).

Pole `referenceNumber`: prefillowane numerem zamówienia, max **35 znaków** (najostrzejszy limit — ORLEN Paczka). Jeśli `IBC-YYYY-NNNNN` > 35 znaków → automatyczne skrócenie + info tooltip.

### Krok 3 — Potwierdzenie

Podsumowanie wyborów + przycisk "Nadaj i pobierz etykietę".

Podczas wykonywania — spinner z etapami:
```
✓ Tworzenie przesyłki w Allegro...
✓ Pobieranie numeru śledzenia...
✓ Aktualizacja statusu fulfillment (SENT)...
✓ Generowanie etykiety PDF...
```

Po sukcesie: PDF otwiera się w nowej karcie, modal zamknięty, wiersz w tabeli odświeżony.

---

## 8. Backend — nowe endpointy API

Lokalizacja: `apps/api/src/routes/admin/orders.ts` + nowy plik `apps/api/src/routes/admin/shipments.ts`

### `POST /admin/orders/:id/shipment`

**Flow:**

```
1. Wygeneruj commandId (UUID v4)
2. POST /shipment-management/shipments/create-commands
   Headers:
     User-Agent: IlBuonCaffe/1.0 (+https://ilbuoncaffe.pl/api-info)
     Authorization: Bearer {accessToken}
     Accept: application/vnd.allegro.public.v1+json
     Content-Type: application/vnd.allegro.public.v1+json
3. Poll GET /shipment-management/shipments/create-commands/{commandId}
   → odczytaj nagłówek Retry-After z odpowiedzi i czekaj podaną liczbę sekund
   → max 10 prób
   → użyj c.executionCtx.waitUntil() dla background work
4. Wyciągnij shipmentId z odpowiedzi komendy
5. GET /shipment-management/shipments/{shipmentId}
   → wyciągnij packages[0].waybill jako trackingNumber
6. PUT /order/checkout-forms/{externalId}/fulfillment { status: "SENT" }
7. PATCH orders SET:
     status = 'shipped'
     shippedAt = now()
     trackingNumber = waybill
     allegroShipmentId = shipmentId
     updatedAt = now()
8. Audit log (action: 'order_shipped', adminId, orderId, shipmentId)
```

**Request body (Zod schema):**
```typescript
z.object({
  carrierId: z.string(),           // "INPOST", "DPD", "POCZTA_POLSKA", "ORLEN"
  deliveryMethodId: z.string(),    // z GET /delivery-services
  weight: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  referenceNumber: z.string().max(35).optional(),
})
```

**Response:** `{ data: { shipmentId, trackingNumber, status: 'shipped' } }`

### `GET /admin/orders/:id/label`

```
POST /shipment-management/label
  Accept: application/octet-stream
  Body: { shipmentIds: [allegroShipmentId], pageSize: "A4" }
→ pipe response stream jako application/pdf do klienta
  Content-Disposition: attachment; filename="etykieta-{orderNumber}.pdf"
```

### `GET /admin/shipment/delivery-services`

Proxy + cache (KV, TTL 1h) do `GET /shipment-management/delivery-services`. Zwraca listę dostępnych przewoźników z limitami wymiarów i dzielnikami.

### `POST /admin/orders/:id/fulfillment` (fallback)

Manualny update fulfillment status na Allegro gdy auto-sync zawiedzie.
`PUT /order/checkout-forms/{externalId}/fulfillment { status: body.status }`

---

## 9. Zmiany w bazie danych

**Nowa kolumna w tabeli `orders`** (`packages/db/schema/index.ts`):

```typescript
allegroShipmentId: varchar('allegro_shipment_id', { length: 36 })
```

Migracja: `drizzle-kit generate` → review SQL → `drizzle-kit push` (dev) / `migrate` (prod).

---

## 10. User-Agent — wymaganie Allegro 2026

Allegro wymaga niestandardowego nagłówka `User-Agent` we wszystkich żądaniach API od **czerwca 2026**.

Implementacja w `apps/api/src/lib/allegro/helpers.ts`:

```typescript
const ALLEGRO_USER_AGENT = 'IlBuonCaffe/1.0 (+https://ilbuoncaffe.pl/api-info)'
```

Dodawany do **wszystkich** wywołań Allegro API (nie tylko shipment) — w funkcji `allegroHeaders()`.

---

## 11. Nowe typy (packages/types/index.ts)

```typescript
// Żądanie nadania przesyłki
export interface CreateShipmentRequest {
  carrierId: string
  deliveryMethodId: string
  weight: number
  length: number
  width: number
  height: number
  referenceNumber?: string
}

// Odpowiedź po nadaniu
export interface CreateShipmentResponse {
  shipmentId: string
  trackingNumber: string
  status: 'shipped'
}

// Usługa dostawcy z Allegro
export interface AllegroDeliveryService {
  id: string
  name: string
  carrierId: string
  maxWeight: number
  maxLength: number
  maxWidth: number
  maxHeight: number
  volumetricDivisor: number | null
}
```

---

## 12. Co NIE wchodzi w ten scope

- Disputes / zwroty — osobna podstrona `/admin/zamowienia/zwroty`, oddzielny PR
- Cenniki przewoźników (konfigurowalny moduł w ustawieniach)
- Integracja DHL przez Allegro Delivery
- Wielopaczkowe przesyłki (multi-pack)
- Druk bezpośredni ZPL (drukarki termiczne)
- Seller-initiated cancel na Allegro

---

## 13. Pliki do modyfikacji / stworzenia

| Plik | Akcja |
|------|-------|
| `apps/web/src/admin/views/Orders/index.tsx` | Przepisać od zera |
| `apps/web/src/admin/components/OrderDetailModal.tsx` | Przepisać od zera |
| `apps/web/src/admin/components/OrderContextMenu.tsx` | Nowy komponent |
| `apps/web/src/admin/components/ShipmentModal.tsx` | Nowy komponent |
| `apps/web/src/admin/components/BulkActionBar.tsx` | Nowy komponent |
| `apps/web/src/admin/components/OrderStatusBadge.tsx` | Nowy (zastępuje `getStatusBadge.tsx`) |
| `apps/api/src/routes/admin/shipments.ts` | Nowy plik routera |
| `apps/api/src/lib/allegro/helpers.ts` | Dodać `ALLEGRO_USER_AGENT` do `allegroHeaders()` |
| `packages/db/schema/index.ts` | Dodać kolumnę `allegroShipmentId` |
| `packages/types/index.ts` | Dodać nowe typy |
