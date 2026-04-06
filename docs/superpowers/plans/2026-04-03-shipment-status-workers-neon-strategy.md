+# Strategia statusu przesylki (Workers API + Neon DB)

Data: 2026-04-03  
Zakres: tabela zamowien + modal detalu zamowienia (admin)

## 1. Cel

Zbudowac szybkie i stabilne wyswietlanie statusu przesylki, bez kosztownego "live fetch" przy kazdym otwarciu modalu i bez dodatkowego obciazania Neon przy listowaniu zamowien.

Docelowo:
- tabela pokazuje status przesylki z lokalnego snapshotu DB,
- modal pokazuje snapshot natychmiast + opcjonalny odswiezacz asynchroniczny,
- synchronizacja z Allegro i trackingiem przewoznika dzieje sie glownie w tle (cron + waitUntil).

## 2. Diagnoza stanu obecnego

Aktualnie:
- status zamowienia lokalnego jest w `orders.status`,
- status Allegro jest w `orders.allegroFulfillmentStatus`,
- status trackingu jest aktualizowany dopiero podczas otwarcia modalu przez endpoint trackingu,
- modal uruchamia zewnetrzne call-e do Allegro (shipments + carrier tracking),
- cron dopelnia glownie brakujacy `trackingNumber`, ale nie utrzymuje stalej swiezosci `trackingStatus`.

Skutek:
- otwarcie modalu moze byc wolne i niestabilne,
- UI tabeli i modalu moze pokazywac niespojny obraz statusu,
- niepotrzebne koszty subrequestow i CPU po stronie Workers.

## 3. Zasady architektoniczne

- DB snapshot jako zrodlo prawdy dla UI listy.
- Stale-While-Revalidate dla modalu.
- Brak zewnetrznych fetchy na sciezce krytycznej listowania zamowien.
- Aktualizacje statusu tylko gdy dane sie rzeczywiscie zmienily (`IS DISTINCT FROM`).
- Ograniczenie zapytan do Allegro przez batchowanie, limity i locki KV.

## 4. Model danych (Neon)

Minimalne rozszerzenie tabeli `orders`:
- `trackingStatusCode` varchar(50) NULL
- `trackingStatusUpdatedAt` timestamptz NULL
- `trackingLastEventAt` timestamptz NULL

Uwagi:
- `trackingStatus` zostaje jako "label/opis" dla UI.
- `trackingStatusCode` sluzy do deterministicznego badge mapowania w tabeli i modalu.
- `trackingStatusUpdatedAt` sluzy do obliczania freshness.

Proponowany indeks pod job sync:
- partial index dla rekordow Allegro z aktywna przesylka:
  - warunek: `source = 'allegro' AND allegro_shipment_id IS NOT NULL AND status IN ('shipped','delivered')`
  - kolumny: `(tracking_status_updated_at, updated_at)`

## 5. Kontrakt API

### 5.1 GET /admin/orders (tabela)

Zwracac gotowe pole prezentacyjne:
- `shipmentDisplayStatus`: enum UI (`none`, `label_created`, `in_transit`, `out_for_delivery`, `delivered`, `issue`, `unknown`)
- `shipmentFreshness`: enum (`fresh`, `stale`, `unknown`)
- `trackingStatusUpdatedAt`

Wazne:
- ten endpoint nigdy nie wywoluje Allegro/carrier API.
- tylko szybki odczyt Neon + mapowanie po stronie backend.

### 5.2 GET /admin/orders/:id (modal snapshot)

Rozszerzyc response o:
- `trackingStatusCode`
- `trackingStatus`
- `trackingStatusUpdatedAt`
- `trackingLastEventAt`
- `shipmentFreshness`

### 5.3 POST /admin/orders/:id/tracking/refresh

Nowy endpoint do odswiezenia jednego zamowienia:
- zwraca natychmiast ostatni snapshot,
- jesli snapshot jest stale, uruchamia odswiezenie w tle przez `c.executionCtx.waitUntil(...)`,
- nie blokuje UI na dlugie zewnetrzne requesty.

Dodatkowo:
- KV lock: `allegro:tracking:refresh:order:{id}` TTL 60-90s,
- zabezpieczenie przed wielokrotnym odswiezaniem tego samego zamowienia rownolegle.

## 6. Synchronizacja w tle (Workers Cron)

Dopisac nowy etap w cyklu `*/5 * * * *`:
- wybierac kandydatow do refreshu statusu trackingu,
- przetwarzac w malych batchach (np. 15-25 zamowien/run),
- ograniczyc wspolbieznosc (2-3 rownoleglych call-i),
- stosowac `Retry-After` + krotki backoff,
- aktualizowac DB tylko gdy status sie zmienil.

Priorytety refreshu:
- `shipped` z ostatnich 48h: co 10-15 min,
- `shipped` starsze niz 48h: co 60 min,
- `delivered`: rzadko (np. 1x/24h przez 2-3 dni) lub wcale.

## 7. Strategia UI

### 7.1 Orders table

- Badge statusu przesylki oparty na `shipmentDisplayStatus` z API.
- Pokazywac marker swiezosci (np. subtelna kropka lub "stare dane").
- Bez live fetchy na poziomie tabeli.

### 7.2 Order modal

- Po otwarciu: pokaz natychmiast snapshot z DB.
- Jesli `shipmentFreshness = stale`: uruchom `POST /tracking/refresh` (asynchronicznie).
- Dodaj przycisk "Odswiez status" do recznego triggera.
- Pokazuj "Ostatnia aktualizacja" na podstawie `trackingStatusUpdatedAt`.

## 8. Normalizacja statusow

Utrzymywac mapowanie provider -> status UI po stronie API, nie po stronie React:
- rozne kody przewoznikow mapowac do jednej warstwy domenowej,
- React dostaje juz status domenowy, nie surowy payload przewoznika.

Przyklad mapowania domenowego:
- `LABEL_CREATED`
- `IN_TRANSIT`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `EXCEPTION`
- `RETURNED`
- `UNKNOWN`

## 9. Ochrona wydajnosci i kosztu

- Zmniejszyc koszty modalu: brak obowiazkowego live trackingu na wejciu.
- Zmniejszyc write amplification: update tylko gdy zmiana statusu.
- Trzymac surowy payload trackingu maksymalnie w KV (krotkie TTL), nie koniecznie w Neon.
- Dla listy zamowien utrzymac lekki response (bez ciezkich danych niepotrzebnych do statusu).

## 10. Monitoring i SLO

Mierzyc:
- p95 dla `GET /admin/orders`
- p95 dla otwarcia modalu
- odsetek modal refresh zakonczony sukcesem
- srednia "staleness" statusu trackingu
- liczbe zewnetrznych call-i do Allegro na 100 otwarc modalu

Docelowe SLO:
- tabela p95 < 250ms
- modal first paint statusu < 300ms
- >95% zamowien w statusie shipped ma freshness <= 60 min

## 11. Plan wdrozenia

Etap 1 (backend/db):
- migracja kolumn tracking snapshot,
- mapowanie statusow po stronie API,
- endpoint refresh + lock KV.

Etap 2 (cron):
- job cyklicznego refreshu tracking status,
- limity batch/concurrency,
- logowanie metryk.

Etap 3 (frontend):
- tabela i modal oparte o snapshot + freshness,
- reczny refresh w modalu,
- usuniecie zaleznosci od live fetch jako glownej sciezki.

Etap 4 (hardening):
- tune TTL i batch size wg metryk produkcyjnych,
- doprecyzowanie mapowania statusow edge-case.

## 12. Kryteria sukcesu

- Brak zaciec przy otwieraniu modalu dla zamowien Allegro.
- Spójny status przesylki miedzy tabela a modalem.
- Istotny spadek liczby live call-i per modal open.
- Przewidywalny koszt Workers + Neon przy rosnacym wolumenie zamowien.
