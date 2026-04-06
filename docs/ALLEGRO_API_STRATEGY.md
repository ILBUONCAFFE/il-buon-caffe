# Strategia Integracji Allegro REST API — Il Buon Caffè

> **Wersja:** 1.1 (rewizja)  
> **Data:** 2026-03-06  
> **Autor:** System Architect  
> **Status:** Dokument projektowy (pre-implementacja, po rewizji)  
> **Powiązane docs:** [ARCHITECTURE.md](ARCHITECTURE.md) · [API.md](API.md) · [DATABASE_SETUP.md](DATABASE_SETUP.md) · [WEBADMIN_MENU.md](WEBADMIN_MENU.md) · [WORKERS_TRAFFIC.md](WORKERS_TRAFFIC.md)  
> **Ostatnia rewizja:** offer-bundles, price-automation/rules, allegro-prices/*; budżet Workers 100k; korekta KV writes, CSRF state, cron dispatch, schema alignment

---

## Spis treści

1. [Podsumowanie wykonawcze](#1-podsumowanie-wykonawcze)
2. [Architektura integracji](#2-architektura-integracji)
3. [Autentykacja OAuth2](#3-autentykacja-oauth2)
4. [Mapa endpointów Allegro REST API](#4-mapa-endpointów-allegro-rest-api)
5. [Synchronizacja zamówień](#5-synchronizacja-zamówień)
6. [Synchronizacja stanów magazynowych](#6-synchronizacja-stanów-magazynowych)
7. [Synchronizacja cen](#7-synchronizacja-cen)
8. [Zarządzanie ofertami](#8-zarządzanie-ofertami)
9. [Wysyłka i tracking](#9-wysyłka-i-tracking)
10. [Wiadomości i spory posprzedażowe](#10-wiadomości-i-spory-posprzedażowe)
11. [Rozliczenia i prowizje](#11-rozliczenia-i-prowizje)
12. [Harmonogram zadań automatycznych (CRON)](#12-harmonogram-zadań-automatycznych-cron)
13. [Strategia cache i odciążenie bazy danych](#13-strategia-cache-i-odciążenie-bazy-danych)
14. [Gdzie obliczane: klient vs serwer vs edge](#14-gdzie-obliczane-klient-vs-serwer-vs-edge)
15. [Circuit breaker i obsługa błędów](#15-circuit-breaker-i-obsługa-błędów)
16. [Panel Admin — widoki Allegro](#16-panel-admin--widoki-allegro)
17. [Rate limits Allegro API](#17-rate-limits-allegro-api)
18. [Schemat bazy danych — tabele Allegro](#18-schemat-bazy-danych--tabele-allegro)
19. [Diagram przepływu danych](#19-diagram-przepływu-danych)
20. [Fazy wdrożenia](#20-fazy-wdrożenia)
21. [Bezpieczeństwo i RODO](#21-bezpieczeństwo-i-rodo)
22. [Statystyki, projekcje i szybkość panelu admina](#22-statystyki-projekcje-i-szybkość-panelu-admina)

---

## 1. Podsumowanie wykonawcze

### Kontekst

Il Buon Caffè to polski sklep delikatesowy (~50 SKU, ~10-50 zamówień/dzień) działający na:
- **Strona własna** — `ilbuoncaffe.pl` (Next.js na Cloudflare Pages)
- **Allegro** — kanał sprzedaży nr 2 (marketplace)

### Cel dokumentu

Kompletna strategia integracji z Allegro REST API (`https://api.allegro.pl`) obejmująca:
- Jakie endpointy Allegro używać i kiedy
- Co odpytywać automatycznie (cron w nocy), a co na żądanie admina
- Gdzie przetwarzać dane (Cloudflare Worker, klient, edge, baza)
- Jak nie przeciążać bazy danych Neon (scale-to-zero, free tier)
- Jak wykorzystać Cloudflare KV/Queues do buforowania

### Zasada nadrzędna

> **Baza danych lokalna (Neon PostgreSQL) jest jedynym źródłem prawdy (source of truth) dla stanów magazynowych i cen.**  
> Allegro to konsument tych danych, nie ich autor. Wyjątek: zamówienia z Allegro — tu Allegro jest źródłem.

### Wymagane nagłówki Allegro REST API

> **Każdy request do Allegro REST API musi zawierać specyficzne nagłówki Content-Type/Accept.**  
> Bez nich API zwróci `406 Not Acceptable` lub `415 Unsupported Media Type`.

```
Accept: application/vnd.allegro.public.v1+json
Content-Type: application/vnd.allegro.public.v1+json
Authorization: Bearer {access_token}
```

> Nagłówek `Accept` jest już poprawnie użyty w implementacji (`apps/api/src/routes/allegro.ts` — endpoint `/me`).  
> Przy implementacji kolejnych endpointów — zawsze dodawać oba nagłówki.

---

## 2. Architektura integracji

### Stos technologiczny

| Warstwa | Technologia | Rola w integracji |
|---------|-------------|-------------------|
| **Frontend Admin** | Next.js (apps/admin) | UI do mapowania SKU, podgląd sync, ręczne akcje |
| **API Gateway** | Cloudflare Worker + Hono (apps/api) | Proxy do Allegro API, endpointy `/admin/allegro/*` |
| **Cron Workers** | Cloudflare Workers Cron Triggers | Automatyczne polle co 60s/5min/1h/24h |
| **Kolejka** | Cloudflare Queues | Buferowanie zmian stocku/cen, batch processing |
| **Cache** | Cloudflare KV | Token cache, snapshot ofert, rate limit counters |
| **Baza danych** | Neon PostgreSQL (via Hyperdrive) | Źródło prawdy: produkty, zamówienia, logi sync |
| **Blob storage** | Cloudflare R2 | Zdjęcia produktów (upload do Allegro z R2) |

### Przepływ danych (wysoki poziom)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin Panel │────▶│  API Worker       │────▶│  Allegro REST   │
│  (Next.js)   │◀────│  (Hono on CF)     │◀────│  API            │
└─────────────┘     └──────┬───────────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Neon DB  │ │ CF KV    │ │ CF Queue │
        │ (prawda) │ │ (cache)  │ │ (batch)  │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 3. Autentykacja OAuth2

### Endpointy Allegro Auth

| Operacja | URL | Metoda |
|----------|-----|--------|
| Authorization code | `https://allegro.pl/auth/oauth/authorize` | GET (redirect) |
| Token exchange | `https://allegro.pl/auth/oauth/token` | POST |
| Token refresh | `https://allegro.pl/auth/oauth/token` | POST (grant_type=refresh_token) |
| Device code flow | `https://allegro.pl/auth/oauth/device` | POST |

### Strategia tokenów

| Parametr | Wartość |
|----------|---------|
| Access Token TTL | 12 godzin |
| Refresh Token TTL | 3 miesiące (rolling) |
| Przechowywanie | Tabela `allegro_credentials` (encrypted AES-256-GCM) + KV cache |
| Odświeżanie | Cron Worker co 1h — sprawdza czy token ma <2h do wygaśnięcia, jeśli tak → refresh |
| Sandbox/Production | Toggle w `allegro_credentials.environment` |

### Flow autentykacji

1. **Jednorazowo (admin panel):**
   - Admin klika "Połącz z Allegro" → `GET /api/admin/allegro/connect/url`
   - Worker generuje losowy `state` (24 bajty hex) i zapisuje go w KV z TTL 10 min
   - Redirect do Allegro OAuth z parametrem `state` (ochrona CSRF)
   - Allegro callback → `GET /api/admin/allegro/callback`
   - Worker weryfikuje `state` z KV (one-time use — kasuje po odczycie)
   - Token exchange → zapis tokenów do DB (encrypted) + KV (plaintext, TTL)

   > ✅ **Zaimplementowane:** CSRF `state` jest już w kodzie (`apps/api/src/routes/allegro.ts`)

2. **Automatycznie (cron co 1h):**
   Worker sprawdza `allegro_credentials.expiresAt` — jeśli < 2h do wygaśnięcia → refresh token.  
   *(Aktualny cron: `0 * * * *` co godzinę w `wrangler.json`)*

3. **Fallback:** Jeśli refresh token wygaśnie (>3 msc bez użycia) → status `connected: false` widoczny w admin panel

### Gdzie obliczane

| Operacja | Gdzie |
|----------|-------|
| OAuth redirect URL | Server (API Worker) |
| CSRF state generation + weryfikacja | Server (API Worker) + KV (TTL 10min) |
| Token exchange | Server (API Worker) |
| Token refresh | Server (Cron Worker — `0 * * * *`) |
| Szyfrowanie tokenów | Server (AES-256-GCM, klucz: `ALLEGRO_TOKEN_ENCRYPTION_KEY` w CF secret) |
| Status połączenia | KV cache (TTL 5min) → fallback DB |

### Uwaga: Token refresh — race condition

> **Problem:** Jeśli w przyszłości dodamy więcej cron workerów (np. order poller co 60s),  
> wiele instancji Workera może jednocześnie wykryć wygasający token i próbować go odświeżyć.
> KV nie ma atomic compare-and-swap — oba zapiszą różne tokeny, jeden z nich będzie nieważny.
>
> **Obecna sytuacja:** Z jednym cronem `0 * * * *` problem NIE występuje.
>
> **Przyszłe rozwiązanie (gdy dodamy więcej cronów):** Odświeżanie tokena TYLKO w dedykowanym  
> cron handlerze (nie w order pollerze czy offer monitorze). Jeśli inny handler napotki 401 →  
> retry 1x po pobraniu świeżego tokena z KV (nie odświeżaj sam).

---

## 4. Mapa endpointów Allegro REST API

### 4.1 Endpointy używane AUTOMATYCZNIE (Cron — w nocy/w tle)

| # | Endpoint Allegro | Metoda | Częstotliwość | Cel | Priorytet |
|---|-----------------|--------|---------------|-----|-----------|
| A1 | `/order/events` | GET | Co 60 sekund (24/7) | Pobieranie nowych zamówień | KRYTYCZNY |
| A2 | `/order/event-stats` | GET | Co 60 sekund | Punkt startowy dla kursora zdarzeń | KRYTYCZNY |
| A3 | `/order/checkout-forms/{id}` | GET | On-demand (po evencie) | Pełne dane zamówienia | KRYTYCZNY |
| A4 | `/sale/offer-quantity-change-commands/{commandId}` | PUT | Po zmianie stocku (Queue) | Aktualizacja stocku na Allegro | KRYTYCZNY |
| A5 | `/sale/offer-price-change-commands/{commandId}` | PUT | Po zmianie ceny (Queue) | Aktualizacja ceny na Allegro | WYSOKI |
| A6 | `/auth/oauth/token` | POST | Cron co 1h (jeśli <2h do wygaśnięcia) | Odświeżanie access tokena | KRYTYCZNY |
| A7 | `/sale/offer-events` | GET | Co 5 minut | Monitoring zmian w ofertach | ŚREDNI |
| A8 | `/billing/billing-entries` | GET | Co 24h (3:00 AM) | Pobranie prowizji/opłat | NISKI |
| A9 | `/me` | GET | Co 24h (3:00 AM) | Weryfikacja statusu konta | NISKI |
| A10 | `/sale/price-automation/rules` | GET | Co 1h (razem z token refresh handler) | Cache reguł → KV; wykrywanie konfliktów z naszym price sync | NISKI |
| A11 | `/sale/allegro-prices/account/consent` | GET | Co 24h (3:00 AM) | Status uczestnictwa w programie Allegro Ceny → KV | NISKI |

### 4.2 Endpointy wywoływane NA ŻĄDANIE ADMINA (kliknięcie w panel)

| # | Endpoint Allegro | Metoda | Wyzwalacz | Cel | Priorytet |
|---|-----------------|--------|-----------|-----|-----------|
| M1 | `/sale/product-offers` | POST | Admin: "Wystaw na Allegro" | Utworzenie nowej oferty | WYSOKI |
| M2 | `/sale/product-offers/{offerId}` | PATCH | Admin: edycja oferty | Modyfikacja istniejącej oferty | WYSOKI |
| M3 | `/sale/product-offers/{offerId}` | GET | Admin: podgląd oferty | Pobranie aktualnych danych oferty | ŚREDNI |
| M4 | `/sale/offers/{offerId}/change-price-commands/{cmdId}` | PUT | Admin: zmiana ceny | Zmiana ceny Buy Now | WYSOKI |
| M5 | `/sale/offer-publication-commands/{cmdId}` | PUT | Admin: publikuj/wycofaj | Batch publish/unpublish | ŚREDNI |
| M6 | `/order/checkout-forms` | GET | Admin: lista zamówień Allegro | Pobranie zamówień z filtrami | ŚREDNI |
| M7 | `/order/checkout-forms/{id}` | GET | Admin: szczegóły zamówienia | Pełne dane zamówienia | ŚREDNI |
| M8 | `/order/checkout-forms/{id}/fulfillment` | PUT | Admin: zmiana statusu | Oznaczenie jako wysłane/anulowane | WYSOKI |
| M9 | `/order/checkout-forms/{id}/shipments` | POST | Admin: dodanie trackingu | Numer przesyłki → Allegro | WYSOKI |
| M10 | `/sale/categories` | GET | Admin: konfiguracja mappingu | Przeglądanie kategorii Allegro | NISKI |
| M11 | `/sale/categories/{id}/parameters` | GET | Admin: parametry kategorii | Wymagane parametry oferty | NISKI |
| M12 | `/order/carriers` | GET | Admin: konfiguracja | Lista dostępnych kurierów | NISKI |
| M13 | `/sale/delivery-methods` | GET | Admin: konfiguracja | Metody dostaw | NISKI |
| M14 | `/sale/shipping-rates` | GET/POST | Admin: cenniki dostaw | Zarządzanie cennikami | NISKI |
| M15 | `/after-sales-service-conditions/return-policies` | GET | Admin: konfiguracja | Polityki zwrotów | NISKI |
| M16 | `/after-sales-service-conditions/implied-warranties` | GET | Admin: konfiguracja | Warunki reklamacji | NISKI |
| M17 | `/me/payments/payment-operations` | GET | Admin: finanse | Historia operacji płatniczych | NISKI |
| M18 | `/sale/badges/campaigns` | GET | Admin: kampanie badge | Dostępne kampanie promocyjne | NISKI |
| M19 | `/messaging/threads` | GET | Admin: wiadomości | Wątki wiadomości od kupujących | ŚREDNI |
| M20 | `/messaging/threads/{id}/messages` | GET/POST | Admin: odpowiedź | Odczyt/wysyłka wiadomości | ŚREDNI |
| M21 | `/sale/disputes` | GET | Admin: spory | Lista sporów/reklamacji | ŚREDNI |
| M22 | `/sale/images` | POST | Admin: upload zdjęcia | Upload obrazu do Allegro CDN | ŚREDNI |
| M23 | `/users/{userId}/ratings/summary` | GET | Admin: profil sprzedawcy | Podsumowanie ocen | NISKI |
| M24 | `/sale/offer-bundles` | GET/POST | Admin: zestawy produktów | Lista/tworzenie zestawów prezentowych i pakietów | ŚREDNI |
| M25 | `/sale/offer-bundles/{bundleId}` | GET/PATCH/DELETE | Admin: zarządzanie zestawem | Edycja składników, ceny, usunięcie | ŚREDNI |
| M26 | `/sale/price-automation/rules` | POST/DELETE | Admin: reguły cen | Tworzenie/usuwanie reguł automatyzacji cen (⚠️ konflikt z naszym price sync) | NISKI |
| M27 | `/sale/allegro-prices/eligible-offers` | GET | Admin: eligibility | Które oferty kwalifikują się do programu Allegro Ceny | NISKI |
| M28 | `/sale/allegro-prices/offers/{offerId}` | PUT/DELETE | Admin: cena Smart | Ustaw/usuń cenę specjalną dla posiadaczy Allegro Smart | ŚREDNI |

### 4.3 Endpointy NIGDY nie wywoływane (nieistotne dla Il Buon Caffè)

| Endpoint | Powód pominięcia |
|----------|------------------|
| `/sale/offer-variants` | Brak wariantów (flat SKU model) |
| `/sale/compatibility-list` | Nie dotyczy (żywność, nie motoryzacja) |
| `/fulfillment/*` (One Fulfillment) | Wysyłka własna, nie z magazynu Allegro |
| `/auctions/*` | Brak licytacji — tylko Buy Now |
| `/charity` | Nie dotyczy |
| `/sale/deposits` | Nie dotyczy (brak kaucji) |

---

## 5. Synchronizacja zamówień

### Kierunek: Allegro → Nasza baza (PULL)

### 5.1 Event polling — główna pętla

| Parametr | Wartość |
|----------|---------|
| **Endpoint** | `GET /order/events` |
| **Częstotliwość** | Co 60 sekund (non-stop, 24/7) |
| **Limit na request** | 100 (domyślny) |
| **Typy zdarzeń** | `READY_FOR_PROCESSING`, `BUYER_CANCELLED`, `FULFILLMENT_STATUS_CHANGED` |
| **Kursor** | Zapisywany w `allegro_state` (klucz: `order_events_cursor`) |
| **Wykonawca** | Cron Worker (Cloudflare Cron Trigger) |

### 5.2 Przepływ przetwarzania zamówienia

```
Cron Worker (co 60s)
  │
  ├─ 1. Odczyt kursora z KV (cache) lub DB (fallback)
  │
  ├─ 2. GET /order/events?from={cursor}&type=READY_FOR_PROCESSING
  │
  ├─ 3. Dla każdego nowego eventu:
  │     │
  │     ├─ 3a. GET /order/checkout-forms/{checkoutFormId}
  │     │       → Pełne dane: buyer, items, payment, delivery
  │     │
  │     ├─ 3b. Mapowanie SKU:
  │     │       allegro offerId → products.sku (via products.allegroOfferId)
  │     │
  │     ├─ 3c. INSERT do orders (source='allegro', externalId=checkoutFormId)
  │     │       + INSERT order_items (snapshot cen)
  │     │
  │     ├─ 3d. UPDATE products SET stock = stock - quantity
  │     │       + INSERT stock_changes (reason='allegro_order')
  │     │
  │     └─ 3e. Zapis kursora do KV + DB
  │
  └─ 4. Jeśli brak eventów → sleep do następnego cron trigger
```

### 5.3 Idempotentność zamówień

| Mechanizm | Implementacja |
|-----------|---------------|
| **Deduplikacja** | `orders.externalId` (UNIQUE) = Allegro checkoutForm ID |
| **Idempotency key** | `orders.idempotencyKey` = `allegro-{checkoutFormId}` |
| **Powtórne przetwarzanie** | INSERT ON CONFLICT DO NOTHING |

### 5.5 Struktura zamówienia z Allegro API (`/order/checkout-forms/{id}`)

Kluczowe pola odpowiedzi Allegro i ich mapowanie na schemat DB:

```jsonc
{
  "id": "checkout-form-uuid",           // → orders.externalId
  "status": "READY_FOR_PROCESSING",
  "buyer": {
    "id": "allegro-user-id",
    "email": "kontakt@ilbuoncaffe.pl",       // → orders.customerData.email
    "firstName": "Jan",
    "lastName": "Kowalski"              // → orders.customerData.name
  },
  "payment": {
    "id": "payment-uuid",
    "type": "CASH_ON_DELIVERY" | "ONLINE",
    "paidAmount": {
      "amount": "149.90",              // → SUMA kontrolna (nie mapowane bezpośrednio)
      "currency": "PLN"               // → orders.currency (patrz §5.6)
    },
    "finishedAt": "2026-03-06T12:00:00Z"
  },
  "lineItems": [
    {
      "id": "item-uuid",
      "offer": {
        "id": "allegro-offer-id",      // → lookup products.allegroOfferId → products.sku
        "name": "Barolo DOCG 2020"
      },
      "quantity": 2,
      "price": {
        "amount": "64.95",            // → order_items.unitPrice
        "currency": "PLN"
      },
      "selectedAdditionalServices": []
    }
  ],
  "delivery": {
    "address": {
      "firstName": "Jan",
      "lastName": "Kowalski",
      "street": "ul. Przykładowa 1",
      "zipCode": "00-001",
      "city": "Warszawa",
      "countryCode": "PL",
      "phoneNumber": "+48 664 937 937"  // → orders.customerData.shippingAddress
    },
    "cost": {
      "amount": "12.90",            // → orders.shippingCost
      "currency": "PLN"
    }
  },
  "summary": {
    "totalToPay": {
      "amount": "149.90",          // → orders.total (patrz §5.6)
      "currency": "PLN"
    }
  }
}
```

### 5.6 Obsługa walut w zamówieniach

> **Obecny stan:** Allegro.pl sprzedaje wyłącznie w PLN. `currency` = zawsze `'PLN'`.  
> **Przyszłość:** Allegro cross-border (.cz, .sk, .hu) mogą generować zamówienia w EUR/CZK.  
> Schemat jest gotowy — nie wymaga migracji przy rozszerzeniu rynków.

| Pole DB | Typ | Opis |
|---------|-----|------|
| `orders.currency` | `VARCHAR(3) DEFAULT 'PLN'` | ISO 4217: waluta oryginalna zamówienia |
| `orders.total` | `DECIMAL(10,2)` | Kwota w walucie oryginalnej |
| `orders.totalPln` | `DECIMAL(10,2) NULLABLE` | Równoważnik PLN (= `total` gdy PLN; kurs NBP gdy inna waluta) |

**Logika przy synchronizacji zamówienia Allegro:**
```typescript
// Worker: mapowanie pola payment.paidAmount → orders
const { amount, currency } = checkoutForm.summary.totalToPay
const isPlnOrder = currency === 'PLN'

await db.insert(orders).values({
  source: 'allegro',
  externalId: checkoutForm.id,
  total: amount,
  currency,
  // totalPln: dla PLN = total; dla EUR/CZK pobierz kurs z NBP API (lub z CronCache)
  totalPln: isPlnOrder ? amount : null, // null = do przeliczenia asynchronicznie
  // ...
})
```

**Statystyki używają `totalPln`** (gdy NULL → fallback na `total`):
```sql
COALESCE(CAST(total_pln AS NUMERIC), CAST(total AS NUMERIC))
```
Dzięki temu wykresy przychodów są zawsze w PLN, niezależnie od waluty zamówienia.

### 5.4 Gdzie obliczane

| Operacja | Gdzie | Dlaczego |
|----------|-------|----------|
| Polling eventów | Cron Worker (server) | Brak interakcji użytkownika, non-stop |
| Mapowanie offerId→SKU | Worker (server) | Wymaga dostępu DB |
| Przeliczenie totali | Worker (server) | Krytyczne dane finansowe |
| Rezerwacja stocku | Worker (server, DB transaction) | Atomiczność |
| Wyświetlanie zamówień | Admin client (SSR + client fetch) | UX admina |

---

## 6. Synchronizacja stanów magazynowych

### Kierunek: Nasza baza → Allegro (PUSH)

### 6.1 Trigger: kiedy synchronizować stock

| Zdarzenie | Źródło | Priorytet |
|-----------|--------|-----------|
| Zakup na stronie (checkout) | Web → DB | NATYCHMIASTOWY |
| Zakup na Allegro (order event) | Cron → DB | NATYCHMIASTOWY (jeśli stock=0) |
| Ręczna korekta admina | Admin panel → DB | NORMALNY |
| Import CSV/Bulk update | Admin panel → DB | BATCH |

### 6.2 Proces synchronizacji

```
Zmiana stocku w DB
  │
  ├─ 1. INSERT stock_changes (audit trail)
  │
  ├─ 2. Enqueue do CF Queue: { sku, newStock, priority }
  │
  ├─ CF Queue Consumer (batch, max 10 msgs):
  │     │
  │     ├─ 3a. Deduplikacja: jeśli >1 zmiana dla tego SKU → weź najnowszą
  │     │
  │     ├─ 3b. Lookup: products.allegroOfferId WHERE sku = ?
  │     │       (KV cache, TTL 1h — unikamy DB hit)
  │     │
  │     ├─ 3c. IF stock = 0 → priorytet URGENT (natychmiast)
  │     │       ELSE → batch (co 30s zbiera kilka zmian)
  │     │
  │     ├─ 3d. PUT /sale/offer-quantity-change-commands/{uuid}
  │     │       body: { modification: { changeType: "FIXED", value: newStock },
  │     │               offerCriteria: [{ offers: [{ id: offerId }] }] }
  │     │
  │     └─ 3e. IF stock > 0 AND oferta miała stock=0 wcześniej:
  │             → oferta mogła zostać automatycznie zakończona (ENDED)
  │             → PUT /sale/offer-publication-commands/{cmdId}
  │               body: { offerCriteria: [{ offers: [{ id: offerId }], type: "ACTIVATE" }] }
  │             → UPDATE products SET allegro_status = 'active' WHERE sku = ?
  │
  └─ 4. Log do allegro_sync_log (status, response)
```

### 6.3 Reaktywacja oferty po powrocie stocku

> **Ważne:** Allegro **automatycznie kończy ofertę** gdy quantity osiąga 0 (status → ENDED).  
> Samo zaktualizowanie quantity NIE wystarczy — trzeba ponownie opublikować ofertę.

| Stan | Akcja |
|------|-------|
| stock spadł do 0 | Allegro auto-kończy ofertę (ENDED). Aktualizujemy `allegro_status = 'ended'` |
| stock wrócił > 0 | PUT quantity + PUT publication command (type: ACTIVATE). `allegro_status = 'active'` |

> Kolumna `products.allegro_status` (enum: `active`/`ended`/`error`/`unmapped`) już istnieje w schemacie DB.

### 6.4 Batch API vs Single

| Scenariusz | Strategia | Endpoint |
|------------|-----------|----------|
| 1 SKU zmieniony | Single offer update | `PUT /sale/offer-quantity-change-commands/{cmdId}` |
| Wiele SKU (bulk import) | Batch (do 1000 ofert/request) | `PUT /sale/offer-quantity-change-commands/{cmdId}` (z listą) |
| Stock = 0 (sold out) | Natychmiast! Bez kolejki | `PUT /sale/offer-quantity-change-commands/{cmdId}` |
| Stock > 0 po sold out | Quantity update + publication command | Batch: quantity + `PUT /sale/offer-publication-commands/{cmdId}` |

### 6.5 Limity rate

| Limit | Wartość |
|-------|---------|
| Batch quantity change | 250 000 zmian/h LUB 9 000 zmian/min |
| Przy ~50 SKU | Daleko poniżej limitów |

### 6.6 Race condition przy niskim stocku

> **Problem:** Przy stock=1, jednoczesne zamówienie ze strony i z Allegro mogą obie przejść walidację.
>
> **Rozwiązanie:** Transakcja DB z `UPDATE products SET stock = stock - $qty WHERE sku = $sku AND stock >= $qty RETURNING stock`.  
> Jeśli RETURNING zwróci 0 wierszy → stock nie wystarczał → odmów zamówienia.  
> Jest to optymistyczne lockowanie — atomiczne na poziomie bazy danych.
>
> Przy ~50 SKU i ~10-50 zamówień/dzień prawdopodobieństwo kolizji jest niskie,  
> ale mechanizm musi istnieć dla poprawności.

### 6.7 Gdzie obliczane

| Operacja | Gdzie | Dlaczego |
|----------|-------|----------|
| Obliczenie nowego stocku | Server (DB transaction) | ACID wymagane |
| Deduplikacja w kolejce | CF Queue consumer (server) | Optymalizacja |
| Lookup offerId po SKU | KV (cache) → DB (fallback) | Odciążenie DB |
| Wysłanie do Allegro | CF Queue consumer (server) | Asynchroniczne |
| Status syncu w UI | Admin client (polling /api/admin/allegro/sync-status) | UX |

---

## 7. Synchronizacja cen

### Kierunek: Nasza baza → Allegro (PUSH)

### 7.1 Trigger: kiedy synchronizować cenę

| Zdarzenie | Źródło | Opóźnienie |
|-----------|--------|------------|
| Admin zmienia cenę produktu | Admin panel → DB | 5 sekund (debounce) |
| Bulk price update | Admin panel → DB | Batch (30s window) |
| Promocja start/koniec | Scheduled Worker | Natychmiast |

### 7.2 Endpointy cenowe

| Scenariusz | Endpoint | Metoda |
|------------|----------|--------|
| Zmiana ceny 1 oferty | `/offers/{offerId}/change-price-commands/{commandId}` | PUT |
| Zmiana cen wielu ofert | `/sale/offer-price-change-commands/{commandId}` | PUT |
| Sprawdzenie statusu | `/sale/offer-price-change-commands/{commandId}` | GET |
| Szczegółowy raport | `/sale/offer-price-change-commands/{commandId}/tasks` | GET |

### 7.3 Rate limits cen

| Limit | Wartość |
|-------|---------|
| Batch price change | 150 000 zmian/h LUB 9 000 zmian/min |
| Single price change | Bez osobnego limitu (ale zalecane użycie batch) |

### 7.4 cena na Allegro vs cena na stronie

| Pole | Strona (products.price) | Allegro |
|------|------------------------|---------|
| Cena bazowa | `price` | `sellingMode.price.amount` |
| Cena przed promocją | `compareAtPrice` | `sellingMode.startingPrice` (opcjonalne) |
| Waluta | PLN (produkty w sklepie zawsze PLN) | PLN (allegro.pl); EUR/CZK cross-border — patrz §5.6 |

> **Decyzja:** Ceny mogą być **różne** na stronie i Allegro (prowizja Allegro ~8-15%).  
> Dodatkowe pole w przyszłości: `products.allegroPriceOverride` (nullable decimal).  
> Jeśli NULL → cena = `products.price`. Jeśli ustawione → cena na Allegro = override.

### 7.5 Edge case: wyczyszczenie `allegroPriceOverride`

> **Problem:** Admin ustawia override na 100 PLN, potem czyści pole (NULL = wróć do `price`).  
> Logika synchronizacji **musi** wykryć tę zmianę i zaktualizować cenę na Allegro.
>
> **Rozwiązanie:** Trigger cenowy reaguje na zmianę wartości `allegroPriceOverride` (w tym zmianę na NULL).  
> Efektywna cena Allegro = `COALESCE(allegroPriceOverride, price)`.  
> Przy każdej zmianie `price` LUB `allegroPriceOverride` → enqueue price sync do CF Queue.

### 7.6 Program Allegro Ceny (`/sale/allegro-prices/*`)

Specjalny program Allegro umożliwiający ustawienie obniżonych cen dla posiadaczy Allegro Smart — wyświetlane z wyróżnionym badge'm „Cena Allegro". Uczestnictwo zwiększa widoczność w wynikach wyszukiwania.

| Endpoint | Metoda | Cel | Kiedy wywołać |
|----------|--------|-----|---------------|
| `/sale/allegro-prices/account/consent` | GET | Czy konto uczestniczy w programie | 1×/dzień (cron 3:00) → KV `allegro:allegro-prices:consent` TTL 1h |
| `/sale/allegro-prices/eligible-offers` | GET | Które oferty kwalifikują się | Admin on-demand → KV `allegro:allegro-prices:eligible` TTL 24h |
| `/sale/allegro-prices/offers/{offerId}` | PUT | Ustaw cenę Smart dla oferty | Admin per oferta |
| `/sale/allegro-prices/offers/{offerId}` | DELETE | Usuń cenę Smart | Admin per oferta |

**Hierarchia efektywnej ceny na Allegro:**
```
Cena Smart (program) > allegroPriceOverride > products.price
```

> **Przykład:** Kawa 250g — `products.price` = 45 PLN, `allegroPriceOverride` = 49 PLN (marża Allegro).  
> Cena Allegro Ceny = 42 PLN. Posiadacze Smart widzą 42 PLN, pozostali — 49 PLN.

**Wymagania programu:**
- Cena Allegro Ceny **musi być niższa** niż aktualna cena regularna oferty
- Jeśli podniesiemy `allegroPriceOverride` powyżej ceny Smart → program może zawiesić ofertę
- Przy syncronizacji ceny sprawdź: `COALESCE(allegro_price_program, allegroPriceOverride, price)` > cena Smart → log warning

**Worker requests:** +1/dzień (consent, mieści się w istniejącym cron 3:00) + admin on-demand

### 7.7 Reguły automatyzacji cen (`/sale/price-automation/rules`)

Allegro pozwala skonfigurować reguły auto-cenowania (np. „zawsze najtańszy w kategorii"). Reguły są egzekwowane przez Allegro po stronie Allegro — **bez wywołania naszego Workera**.

| Endpoint | Metoda | Cel |
|----------|--------|-----|
| `/sale/price-automation/rules` | GET | Lista aktywnych reguł *(A10 — co 1h do KV)* |
| `/sale/price-automation/rules` | POST | Utwórz regułę *(admin on-demand M26)* |
| `/sale/price-automation/rules/{ruleId}` | DELETE | Usuń regułę *(admin on-demand M26)* |

**⚠️ Krytyczny konflikt z naszym price sync:**

```
1. Admin ustawia allegroPriceOverride = 49 PLN
   → nasz Worker: PUT price-change-command 49 PLN ✓
2. Reguła Allegro (match competitor) → cena zmieniona na 46 PLN
3. Nasz offer monitor wykrywa OFFER_PRICE_CHANGED (event)
4. Przy kolejnym trigger cenowym → nasz Worker znowu pisze 49 PLN
   → pętla aż admin zauważy
```

**Zasada: albo nasze price sync, albo reguły Allegro — nigdy oba dla tej samej oferty.**

| Sytuacja | Akcja w systemie |
|----------|-----------------|
| Oferta ma aktywną regułę Allegro | Pomiń nasz price sync dla tej oferty |
| Admin tworzy regułę przez nasz panel | Skasuj `allegroPriceOverride` dla tej oferty (lub zablokuj UI) |
| Admin próbuje sync ceny dla oferty z regułą | Warning modal — wymagane potwierdzenie |

**Implementacja:**
```typescript
// Przed każdym price push — sprawdź KV
const rulesCache = await env.ALLEGRO_KV.get('allegro:price-rules:offer-ids', 'json')
// ['offerId1', 'offerId2', ...]
if (rulesCache?.includes(offerId)) {
  log.warn('Skipping price sync — offer has automation rule', { offerId })
  return
}
```
Cron `0 * * * *` (handler `autoRefreshAllegroToken`) po odświeżeniu tokena wywołuje `GET /sale/price-automation/rules` i zapisuje do KV listę offerIds z regułami.

**Worker requests:** +0/dzień — A10 mieści się w istniejącym cron `0 * * * *`

### 7.8 Gdzie obliczane

| Operacja | Gdzie |
|----------|-------|
| Kalkulacja ceny Allegro (marża) | Server (Worker) |
| Debounce (5s) | CF Queue (delay) |
| Batch window (30s) | CF Queue consumer |
| Wyświetlenie porównania cen | Admin client (tabela różnic) |
| Sprawdzenie reguł przed push | Server — KV lookup `allegro:price-rules:offer-ids` |
| Eligibility Allegro Ceny | KV cache TTL 24h → fallback Allegro API |

---

## 8. Zarządzanie ofertami

### 8.1 Cykl życia oferty

```
[Produkt w DB] ──admin──▶ [Wystawienie] ──allegro──▶ [ACTIVE na Allegro]
                               │                            │
                               │                     ┌──────┴──────┐
                               │                     │ Monitoring  │
                               │                     │ (offer      │
                               │                     │  events)    │
                               │                     └──────┬──────┘
                               │                            │
                          [Edycja] ◀──admin──────────────────┘
                               │
                          [Zakończenie] ──admin──▶ [ENDED na Allegro]
                               │                        │
                               │                  [Stock > 0]
                               │                        │
                          [Reaktywacja] ◀──auto/admin──┘
                               │
                          [ACTIVE] (ponownie)
```

> **Status oferty w DB:** `products.allegro_status` (enum: `active` | `ended` | `error` | `unmapped`)  
> Przy stock=0 → Allegro auto-kończy ofertę → aktualizujemy `allegro_status = 'ended'`  
> Przy stock > 0 po ended → publication command → `allegro_status = 'active'`

### 8.2 Tworzenie oferty (z panelu admin)

| Krok | Endpoint | Dane |
|------|----------|------|
| 1. Wybierz kategorię Allegro | `GET /sale/categories?parent.id={id}` | Nawigacja po drzewie |
| 2. Pobierz parametry | `GET /sale/categories/{id}/parameters` | Wymagane pola |
| 3. Upload zdjęć | `POST /sale/images` | Binarka z R2 |
| 4. Utwórz ofertę | `POST /sale/product-offers` | Pełny payload |
| 5. Sprawdź status | `GET /sale/product-offers/{offerId}/operations/{operationId}` | Asynchroniczne |
| 6. Zapisz mapping | `UPDATE products SET allegroOfferId = ? WHERE sku = ?` | W lokalnej DB |

### 8.3 Monitoring zmian w ofertach

| Parametr | Wartość |
|----------|---------|
| **Endpoint** | `GET /sale/offer-events` |
| **Częstotliwość** | Co 5 minut (Cron Worker) |
| **Typy do monitorowania** | `OFFER_STOCK_CHANGED`, `OFFER_ENDED`, `OFFER_PRICE_CHANGED` |
| **Kursor** | `allegro_state` klucz: `offer_events_cursor` |
| **Retencja eventów Allegro** | 24 godziny |
| **Reakcja** | Log do `allegro_sync_log` + alert jeśli niespodziewana zmiana |

### 8.4 Gdzie obliczane

| Operacja | Gdzie |
|----------|-------|
| Formularz tworzenia oferty | Admin client (formularz) |
| Walidacja parametrów | Server (Worker) + client (preview) |
| Upload zdjęć do Allegro | Server (Worker: R2 → Allegro CDN) |
| Zapis mappingu SKU↔offerId | Server (Worker → DB) |
| Monitoring offer events | Cron Worker (server) |

### 8.5 Zestawy produktów (`/sale/offer-bundles`)

Zestaw (bundle) to oddzielna oferta Allegro grupująca kilka istniejących ofert jako jeden zakup z opcjonalną obniżoną ceną. Dla Il Buon Caffè to naturalny format: **zestawy prezentowe**, **pakiety degustacyjne kawy**, **startery**.

**Jak działają bundles na Allegro:**
- Bundle = nowa oferta Allegro złożona z 2+ aktywnych ofert z `allegroOfferId`
- Cena bundla ustawiana niezależnie (rabat ~5-30% względem sumy składników)
- Stock bundla = `min(stocki składników)` — obliczony przez Allegro automatycznie
- Kiedy kupujący kupi bundle → order event zawiera **składniki** jako osobne `lineItems`, nie bundle ID → **nasze obecne order processing działa bez zmian** ✅

**Endpointy:**

| Endpoint | Metoda | Cel |
|----------|--------|-----|
| `/sale/offer-bundles` | GET | Lista zestawów konta |
| `/sale/offer-bundles` | POST | Utwórz nowy zestaw |
| `/sale/offer-bundles/{bundleId}` | GET | Szczegóły zestawu + składniki |
| `/sale/offer-bundles/{bundleId}` | PATCH | Zmień cenę / skład |
| `/sale/offer-bundles/{bundleId}` | DELETE | Usuń zestaw |

**Ważne zależności:**
- Wszystkie składniki muszą być aktywnymi ofertami z nadanym `allegroOfferId`
- Jeśli składnik kończy się (stock=0, oferta ENDED) → bundle zostaje automatycznie zawieszony przez Allegro
- Offer monitor (`*/5 * * * *`) monitoruje `OFFER_ENDED` events — jeśli dotyczy składnika bundlu → alert badge w `/admin/allegro/bundles`

**Caching w KV:**

| Klucz | TTL | Zawartość |
|-------|-----|-----------|
| `allegro:bundles:list` | 1h | `[{ bundleId, title, status }]` |
| `allegro:bundles:{bundleId}` | 24h | Szczegóły z listą składników |

Inwalidacja klucza po każdej admin-akcji POST/PATCH/DELETE.

**Worker requests:** ~0 automatycznych + admin on-demand (~10-30/dzień przy aktywnym zarządzaniu)

---

## 9. Wysyłka i tracking

### 9.1 Przepływ

```
Admin oznacza zamówienie jako "wysłane" w panelu
  │
  ├─ 1. Jeśli zamówienie.source = 'allegro':
  │     │
  │     ├─ POST /order/checkout-forms/{id}/shipments
  │     │   body: { carrierId: "INPOST", waybill: "000000000000000001" }
  │     │
  │     └─ PUT /order/checkout-forms/{id}/fulfillment
  │         body: { status: "SENT", shipmentSummary: { lineItemsSent: "ALL" } }
  │
  ├─ 2. UPDATE orders SET status='shipped', trackingNumber=?
  │
  └─ 3. Email do klienta (jeśli zamówienie ze strony)
```

### 9.2 Endpointy wysyłkowe

| Endpoint | Metoda | Kiedy |
|----------|--------|-------|
| `/order/carriers` | GET | Jednorazowo (cache w KV, TTL 24h) |
| `/order/checkout-forms/{id}/shipments` | POST | Po nadaniu paczki |
| `/order/checkout-forms/{id}/shipments` | GET | Podgląd numerów tracking |
| `/order/checkout-forms/{id}/fulfillment` | PUT | Zmiana statusu realizacji |
| `/order/carriers/{carrierId}/tracking` | GET | Podgląd historii przesyłki |

### 9.3 Gdzie obliczane

| Operacja | Gdzie |
|----------|-------|
| Wybór kuriera | Admin client (dropdown z KV cache) |
| Wysłanie trackingu do Allegro | Server (Worker) |
| Zmiana statusu zamówienia | Server (Worker → DB + Allegro) |
| Podgląd trackingu | Admin client (fetch z Allegro API via nasz Worker) |

---

## 10. Wiadomości i spory posprzedażowe

### 10.1 Wiadomości od kupujących

| Parametr | Wartość |
|----------|---------|
| **Endpoint (lista)** | `GET /messaging/threads` |
| **Endpoint (wiadomości)** | `GET /messaging/threads/{threadId}/messages` |
| **Endpoint (odpowiedź)** | `POST /messaging/threads/{threadId}/messages` |
| **Polling** | Co 5 minut (Cron Worker) |
| **Powiadomienie admina** | Push notification w admin panel + email (Resend) |
| **Przechowywanie** | NIE w DB — tylko w KV cache (TTL 7d) jako preview |

### 10.2 Spory / reklamacje

| Endpoint | Metoda | Kiedy |
|----------|--------|-------|
| `/sale/disputes` | GET | Co 15 min (Cron) + na żądanie |
| `/sale/disputes/{id}` | GET | Na żądanie (admin) |
| `/sale/disputes/{id}/messages` | GET/POST | Na żądanie (admin) |

### 10.3 Gdzie obliczane

| Operacja | Gdzie |
|----------|-------|
| Polling nowych wiadomości | Cron Worker (server) |
| Cache wiadomości (preview) | KV (TTL 7d) — NIE w DB! |
| Wyświetlenie wiadomości | Admin client |
| Wysłanie odpowiedzi | Server (Worker → Allegro API) |

> **Optymalizacja DB:** Wiadomości Allegro **nie są zapisywane** w naszej bazie. Są cachowane w KV jedynie jako podgląd. Pełne dane zawsze z Allegro API na żądanie.

---

## 11. Rozliczenia i prowizje

### 11.1 Endpointy finansowe

| Endpoint | Metoda | Częstotliwość | Przechowywanie |
|----------|--------|---------------|----------------|
| `/me/payments/payment-operations` | GET | Co 24h (3:00 AM) | KV snapshot (TTL 30d) |
| `/pricing/offer-fee-preview` | POST | Na żądanie admina | Brak (przelotowe) |
| `/pricing/offer-quotes` | GET | Na żądanie admina | Brak (przelotowe) |
| `/billing/billing-entries` | GET | Co 24h (3:00 AM) | KV snapshot (TTL 30d) |

### 11.2 Strategia przechowywania

> **Optymalizacja DB:** Rozliczenia Allegro **nie tworzą nowych tabel** w bazie.  
> Dane rozliczeniowe przechowywane wyłącznie w **Cloudflare KV** jako JSON snapshoty z kluczami:
> - `allegro:billing:{YYYY-MM-DD}` → JSON z rozliczeniami dnia
> - `allegro:payments:{YYYY-MM}` → JSON z operacjami płatniczymi miesiąca
> - TTL: 365 dni

### 11.3 Gdzie obliczane

| Operacja | Gdzie |
|----------|-------|
| Pobranie rozliczeń z Allegro | Cron Worker (3:00 AM) |
| Zapis snapshotów | KV (nie DB!) |
| Kalkulacja prowizji/marży | Admin client (JS w przeglądarce) |
| Raport miesięczny | Admin client (czyta z KV via Worker) |
| Export CSV | Admin client (generowanie w przeglądarce) |

---

## 12. Harmonogram zadań automatycznych (CRON)

### Architektura: jeden Worker, dispatcher w `scheduled()`

> **Ważne:** Cloudflare Workers pozwala na wiele cron expressions w `wrangler.json`,  
> ale wszystkie wywołują **ten sam** handler `scheduled()`. Nie ma osobnych "workerów" per cron.  
> Rozróżnienie logiki następuje przez `event.cron` w dispatcherze.

**Aktualny stan (`wrangler.json`):** jeden cron `0 * * * *` (co godzinę) — token refresh.

**Docelowa konfiguracja** (po implementacji pełnej integracji):

```typescript
// apps/api/src/index.ts — handler scheduled()
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  switch (event.cron) {
    case '* * * * *':
      ctx.waitUntil(handleOrderPoll(env))
      break
    case '*/5 * * * *':
      ctx.waitUntil(Promise.all([
        handleOfferMonitor(env),
        handleMessagePoll(env),
      ]))
      break
    case '*/15 * * * *':
      ctx.waitUntil(handleDisputeChecker(env))
      break
    case '0 * * * *':
      ctx.waitUntil(autoRefreshAllegroToken(env))
      break
    case '0 3 * * *':
      ctx.waitUntil(handleBillingSync(env))
      break
    case '0 4 * * *':
      ctx.waitUntil(handleHealthCheck(env))
      break
    case '0 2 * * 1':
      ctx.waitUntil(handleFullStockAudit(env))
      break
  }
}
```

### Master scheduler (docelowy)

| Cron Expression | Częstotliwość | Handler | Opis | DB hit? |
|-----------------|---------------|---------|------|---------|
| `* * * * *` | Co 60 sekund | `handleOrderPoll` | Poll zamówień (order events) | TAK (write jeśli nowe) |
| `*/5 * * * *` | Co 5 minut | `handleOfferMonitor` + `handleMessagePoll` | Poll zmian ofert + wiadomości | NIE (log do KV) |
| `*/15 * * * *` | Co 15 minut | `handleDisputeChecker` | Sprawdzenie nowych sporów | NIE (KV + alert) |
| `0 * * * *` | Co 1 godzinę | `autoRefreshAllegroToken` | Odświeżanie access tokena (jeśli <2h) | TAK (update token) |
| `0 3 * * *` | Codziennie 3:00 | `handleBillingSync` | Pobranie rozliczeń dnia | NIE (KV only) |
| `0 4 * * *` | Codziennie 4:00 | `handleHealthCheck` | Weryfikacja konta + alertów | NIE (KV status) |
| `0 2 * * 1` | Pon 2:00 AM | `handleFullStockAudit` | Pełne porównanie stocków | TAK (read all SKUs) |

> **Token refresh:** Nigdy nie odświeżaj tokena z handlera zamówień czy ofert!  
> Jeśli handler napotka 401 → retry 1x z tokenem z KV. Jeśli nadal 401 → log + alert.

### Podział obciążenia bazy danych

| Godzina | Operacje na DB | Opis |
|---------|----------------|------|
| 0:00-6:00 | Minimalne | Głównie KV: billing, health check |
| 6:00-8:00 | Niskie | Token refresh (1 UPDATE/INSERT) |
| 8:00-22:00 | Normalne | Order polling (INSERT przy nowych zamówieniach) |
| 22:00-0:00 | Niskie | Jak wyżej, mniej zamówień |

### Neon cold start — uwaga

> Neon free tier ma scale-to-zero z cold startem **1-3 sekund** (via Hyperdrive: ~500ms).  
> Przy nocnych godzinach bez zamówień DB zasypia. Pierwszy request po przebudzeniu  
> może trwać dłużej. Nie wpływa to na poprawność, ale w order pollerze warto  
> uwzględnić timeout ≥ 5 sekund na połączenie DB.

### Nocne zadania (przegląd)

```
02:00 ─── Full Stock Audit ──▶ Porównaj stock w DB vs Allegro, log rozbieżności
03:00 ─── Billing Sync ──────▶ Pobierz prowizje z wczoraj → KV
04:00 ─── Health Check ──────▶ Sprawdź token, konto, status ofert → KV/Alert
05:00 ─── (cisza) ───────────▶ DB scale-to-zero (Neon sleep)
```

---

## 13. Strategia cache i odciążenie bazy danych

### 13.1 Cloudflare KV — jeden namespace `ALLEGRO_KV`

> **Rzeczywistość:** W `wrangler.json` mamy **jeden** KV namespace `ALLEGRO_KV` (binding).  
> Wszystkie klucze Allegro to wzorce kluczy wewnątrz tego namespace (nie osobne namespace'y).  
> Drugi namespace `AUTH_RATE_LIMIT` służy limitom auth — nie mieszamy.

| Prefiks klucza | Przykładowe klucze | TTL | Opis |
|----------------|-------------------|-----|------|
| `allegro:` (tokeny) | `allegro:access_token`, `allegro:refresh_token`, `allegro:environment` | 12h / ∞ | Tokeny OAuth (szybki dostęp) |
| `allegro:status` | `allegro:status` | 5min | JSON: connected, expiresAt, environment |
| `allegro:state:` | `allegro:state:{uuid}` | 10min | CSRF state dla OAuth flow (one-time use) |
| `allegro:mapping:` | `allegro:mapping:sku:{sku}`, `allegro:mapping:offer:{id}` | 1h | Bidirectional SKU↔offerId cache |
| `allegro:cursor:` | `allegro:cursor:order_events`, `allegro:cursor:offer_events` | ∞ | Kursory pollerów |
| `allegro:sync:` | `allegro:sync:last_run`, `allegro:sync:circuit_breaker` | 5min | Status synchronizacji |
| `allegro:msg:` | `allegro:msg:thread:{id}` | 7d | Cache wiadomości (preview) |
| `allegro:billing:` | `allegro:billing:{YYYY-MM-DD}` | 365d | Dzienne rozliczenia |
| `allegro:carriers` | `allegro:carriers` | 24h | Lista kurierów |
| `allegro:categories:` | `allegro:categories:{parentId}` | 7d | Drzewo kategorii |
| `allegro:products:` | `allegro:products:all`, `allegro:products:{sku}` | 1h | Snapshot produktów |

### 13.2 Strategia "DB-last"

Zasada: **Czytaj z KV najpierw. DB dopiero gdy KV miss.**

```
Request → KV get → HIT? → Return cached
                     │
                     └ MISS → DB query → KV set (TTL) → Return fresh
```

### 13.3 Co NIE trafia do bazy (oszczędność)

| Dane | Zamiast DB → | Powód |
|------|-------------|-------|
| Wiadomości Allegro | KV (TTL 7d) | Tymczasowe, źródło = Allegro |
| Rozliczenia/billing | KV (TTL 365d) | Read-only snapshoty |
| Drzewo kategorii Allegro | KV (TTL 7d) | Statyczne, zmienia się rzadko |
| Lista kurierów | KV (TTL 24h) | Statyczne |
| Rate limit counters | KV (TTL 1min) | Ephemeral |
| Circuit breaker state | KV (TTL 5min) | Ephemeral |
| Token cache | KV (TTL 12h) | Szybki odczyt, DB = backup |
| Mapping SKU↔offerId (cache) | KV (TTL 1h) | DB = source of truth, KV = fast path |

### 13.4 Co MUSI trafić do bazy (source of truth)

| Dane | Tabela | Powód |
|------|--------|-------|
| Zamówienia z Allegro | `orders` + `order_items` | Finansowe, prawne |
| Zmiany stocku | `products` + `stock_changes` | Audit trail |
| Mapping SKU↔offerId | `products.allegroOfferId` | Master data |
| Tokeny OAuth2 | `allegro_credentials` | Backup (KV primary) |
| Logi synchronizacji | `allegro_sync_log` | Debugging |
| Stan kursora | `allegro_state` | Backup (KV primary) |

### 13.5 Nowe możliwości odciążenia DB

| Technika | Opis | Oszczędność |
|----------|------|-------------|
| **KV-first tokens** | Token OAuth2 w KV, DB tylko backup | -2 queries/req |
| **Edge-computed billing** | Kalkulacje prowizji w przeglądarce admina (JS) | 0 DB queries |
| **KV snapshoty produktów** | `products:all` JSON w KV (refresh co 1h) | -90% product reads |
| **Queue deduplication** | Wiele zmian stocku tego samego SKU → 1 API call | -N API calls |
| **Conditional DB wake** | Neon scale-to-zero nocą; cron czyta z KV; DB budzi się tylko na write | -8h compute |
| **Stale-while-revalidate** | Admin widzi dane z KV od razu, fresh fetch w tle | Instant UX |

---

## 14. Gdzie obliczane: klient vs serwer vs edge

### 14.1 Matryca decyzyjna

| Operacja | Client (Admin) | Server (Worker) | Cron (Worker) | Edge (KV) |
|----------|:--------------:|:---------------:|:-------------:|:---------:|
| OAuth redirect | | ● | | |
| Token refresh | | | ● | cache: ● |
| Order event polling | | | ● | cursor: ● |
| Order details fetch | display | proxy | | |
| Stock calculation | display | ● (transaction) | | |
| Stock → Allegro push | | ● (queue) | | |
| Price → Allegro push | | ● (queue) | | |
| Offer creation | form + validation | ● (API call) | | |
| SKU↔offerId mapping | UI | ● (DB write) | | cache: ● |
| Message polling | | | ● | cache: ● |
| Message display | ● (render) | proxy | | |
| Message reply | compose | ● (API call) | | |
| Billing aggregation | ● (charts, sums) | | fetch: ● | store: ● |
| CSV export | ● (generate) | | | |
| Circuit breaker | status display | | check: ● | state: ● |
| Tracking info display | ● (render) | proxy | | |
| Fee calculator | ● (form) | ● (API proxy) | | |

Legenda: ● = główna odpowiedzialność, *kursywa* = wspomaganie

### 14.2 Dlaczego NIE liczyć na serwerze tego co może klient

| Co | Klient robi | Serwer NIE robi | Powód |
|----|-------------|-----------------|-------|
| Sortowanie tabeli zamówień | JS `sort()` | nie sortuje | Dane już w pamięci klienta |
| Filtrowanie po statusie | JS `filter()` | nie filtruje | Dane załadowane (max 50 SKU) |
| Sumowanie wartości zamówień | JS `reduce()` | nie sumuje | Admin widzi 1 stronę naraz |
| Generowanie CSV | JS Blob/download | nie generuje pliku | Oszczędność CPU Workera |
| Wykresy/charting | Chart.js/Recharts | nie renderuje | Client-side rendering |

---

## 15. Circuit breaker i obsługa błędów

### 15.1 Circuit breaker

| Parametr | Wartość |
|----------|---------|
| **Przechowywanie** | KV klucz: `sync:circuit_breaker` |
| **Otwarcie (OPEN)** | Po 3 kolejnych 5xx z Allegro API |
| **Pół-otwarcie (HALF_OPEN)** | Po 5 minutach od otwarcia |
| **Zamknięcie (CLOSED)** | Po 1 udanym request w stanie HALF_OPEN |
| **Alert** | Email do admina (Resend) przy OPEN |
| **Widoczność** | Admin panel → Allegro → Status synchronizacji |

> **Uwaga: atomiczność licznika w KV.**  
> KV nie obsługuje atomic increment — przy równoległych workerach dwa handlery mogą odczytać  
> `failures=2`, oba zapisać `failures=3`, choć wynik powinien być `4`.  
> Przy ~50 SKU i niskim ruchu ryzyko jest marginalne. Gdyby rosło — przenieść  
> circuit breaker state do Durable Object (atomic operations).

### 15.2 Obsługa kodów HTTP z Allegro

| Kod | Reakcja | Retry? |
|-----|---------|--------|
| 200-201 | Sukces | — |
| 400 | Log błędu, alert admin | NIE |
| 401 | Pobierz świeży token z KV → retry 1x. **NIE odświeżaj tokena sam** — to robi cron | TAK (1x) |
| 403 | Log + alert (uprawnienia) | NIE |
| 404 | Log (oferta usunięta?) | NIE |
| 409 | Conflict — retry z nowym commandId | TAK (1x) |
| 422 | Walidacja — log + alert | NIE |
| 429 | Rate limit — exponential backoff | TAK (backoff: 1s→2s→4s→8s→16s→32s→60s max) |
| 500-503 | Circuit breaker counter++ | TAK (3x, potem OPEN) |

### 15.3 Exponential backoff (429)

```
Request → 429 → wait 1s → retry
                        → 429 → wait 2s → retry
                                        → 429 → wait 4s → retry
                                                        → ... max 60s
                                                        → po 7 retry → skip + log
```

### 15.4 Dead letter queue

Jeśli message z CF Queue nie może być przetworzony po 3 próbach:
1. Zapisz do `allegro_sync_log` ze statusem `FAILED`
2. Alert email do admina
3. Widoczne w admin panel → Allegro → Logi → Failed

---

## 16. Panel Admin — widoki Allegro

### 16.1 Planowane trasy (routes)

> **Prefix:** Wszystkie trasy admin panelu zgodne z [WEBADMIN_MENU.md](WEBADMIN_MENU.md) pod `/admin/allegro/*`.  
> Zamówienia Allegro nie mają osobnej trasy — filtry na `/admin/orders?source=allegro`.

| Route | Widok | Dane | Źródło danych |
|-------|-------|------|---------------|
| `/admin/allegro` | Dashboard Allegro | Status połączenia, ostatni sync, circuit breaker | KV |
| `/admin/allegro/connect` | OAuth flow | Formularz + redirect | Server |
| `/admin/allegro/mapping` | Mapowanie SKU | Tabela: SKU / nazwa / allegroOfferId / status | DB + KV |
| `/admin/allegro/mapping/new` | Nowa oferta | Wizard: kategoria → parametry → zdjęcia → wystawienie | Allegro API |
| `/admin/orders?source=allegro` | Zamówienia Allegro | Filtrowana lista (source='allegro') | DB |
| `/admin/orders/:id` | Szczegóły zamówienia | Dane zamówienia + buyer + items | DB + Allegro API |
| `/admin/allegro/stock` | Porównanie stocków | Tabela: SKU / stock DB / stock Allegro / diff | DB + Allegro API |
| `/admin/allegro/sync` | Status synchronizacji | Ostatni run, circuit breaker, kolejka, błędy | KV |
| `/admin/allegro/logs` | Logi synchronizacji | Tabela: timestamp / action / SKU / status / error | DB (allegro_sync_log) |
| `/admin/allegro/messages` | Wiadomości | Lista wątków + podgląd | Allegro API (KV cache) |
| `/admin/allegro/disputes` | Spory | Lista sporów/reklamacji | Allegro API (KV cache) |
| `/admin/allegro/billing` | Rozliczenia | Tabela prowizji, wykres | KV snapshoty |
| `/admin/allegro/settings` | Ustawienia | Environment (sandbox/prod), token status, price rules alert | DB + KV |
| `/admin/allegro/bundles` | Zestawy produktów | Lista bundli, wizard tworzenia, składniki | Allegro API (KV cache) |
| `/admin/allegro/prices` | Allegro Ceny & Price Rules | Eligibility, ceny Smart, reguły automatyzacji | Allegro API (KV cache) |

### 16.2 Kiedy żąda danych strona, a kiedy system automatycznie

| Widok admina | Skąd dane? | Czy admin musi coś kliknąć? |
|--------------|-----------|---------------------------|
| Dashboard Allegro | KV (pre-fetched by cron) | NIE — dane gotowe |
| Lista zamówień Allegro | DB (filtr `source=allegro`) | NIE — dane gotowe |
| Szczegóły zamówienia | DB + Allegro API (lazy fetch) | TAK — klik na zamówienie |
| Mapowanie SKU | DB | NIE — dane gotowe |
| Nowa oferta | Allegro API (categories, params) | TAK — wizard wystawienia |
| Porównanie stocków | DB (local) + Allegro API (live) | TAK — klik "Porównaj" |
| Status sync | KV | NIE — dane gotowe |
| Logi sync | DB (paginated) | NIE — dane gotowe |
| Wiadomości | KV cache (poller) + Allegro API (szczegóły) | TAK — klik na wątek |
| Zestawy (bundles) | KV cache + Allegro API (wizard) | TAK — klik / wizard tworzenia |
| Allegro Ceny & reguły | KV (cron pre-fetched) + Allegro API (set) | NIE/TAK — dane gotowe; action na żądanie |
| Rozliczenia | KV snapshoty | NIE — dane gotowe |
| Ustawienia | DB + KV | NIE — dane gotowe |

---

## 17. Rate limits Allegro API

### 17.1 Znane limity

| Zasób / Endpoint | Limit | Okno |
|------------------|-------|------|
| Batch price change | 150 000 zmian | 1 godzina |
| Batch price change | 9 000 zmian | 1 minuta |
| Batch quantity change | 250 000 zmian | 1 godzina |
| Batch quantity change | 9 000 zmian | 1 minuta |
| Publication report | 270 000 zmian | 1 minuta |
| Category suggestions | 5 requests | 1 sekunda |
| Fee calculator | 25 requests | 1 sekunda |
| Tag modification | 1 000 000 zmian | 1 godzina |
| General API | ~9 000 req | 1 minuta (per app) |
| Auth token | Bez jawnego limitu | — |

### 17.2 Nasze zużycie (szacunkowe)

| Operacja | Requests/min | Requests/h | % limitu |
|----------|-------------|------------|----------|
| Order event poll | 1 | 60 | <1% |
| Offer event poll | 0.2 | 12 | <1% |
| Stock sync (avg) | 0-2 | 0-20 | <1% |
| Price sync (avg) | 0-1 | 0-5 | <1% |
| Message poll | 0.2 | 12 | <1% |
| Admin manual ops | 0-5 | 0-30 | <1% |
| **TOTAL** | **~5** | **~140** | **<2%** |

> Przy ~50 SKU i ~10-50 zamówień/dzień jesteśmy **daleko poniżej** limitów Allegro.

---

## 18. Schemat bazy danych — tabele Allegro

### 18.1 Istniejące tabele (gotowe w schemacie — `packages/db/schema/index.ts`)

#### `allegro_credentials`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | SERIAL PK | — |
| access_token | TEXT (encrypted) | AES-256-GCM |
| refresh_token | TEXT (encrypted) | AES-256-GCM |
| expires_at | TIMESTAMP | Wygaśnięcie access tokena |
| token_type | VARCHAR(20) | Domyślnie 'Bearer' |
| scope | TEXT | OAuth scopes |
| is_active | BOOLEAN | Czy aktywne credentials |
| environment | VARCHAR(20) | `'sandbox'` \| `'production'` |
| created_at | TIMESTAMP | — |
| updated_at | TIMESTAMP | — |

#### `allegro_sync_log`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | SERIAL PK | — |
| product_sku | VARCHAR(50) FK → products | Powiązanie z produktem |
| offer_id | VARCHAR(50) | Allegro offer ID |
| action | VARCHAR(50) | `'stock_update'`, `'price_update'`, `'order_sync'`, `'map'`, `'unmap'`, `'error'` |
| status | VARCHAR(20) | `'success'`, `'error'`, `'pending'`, `'retry'` |
| request_payload | JSONB | Request do Allegro (debug) |
| response_payload | JSONB | Response z Allegro (debug) |
| error_message | TEXT | Błąd (jeśli error) |
| error_code | VARCHAR(50) | HTTP code lub Allegro error code |
| retry_count | INTEGER | Ilość prób (default: 0) |
| created_at | TIMESTAMP | — |

> **Indeksy:** `sku`, `action`, `status`, `created_at` — wszystkie zdefiniowane w schemacie.

#### `allegro_state`
| Kolumna | Typ | Opis |
|---------|-----|------|
| key | VARCHAR(50) PK | Klucz stanu (z CHECK constraint) |
| value | TEXT | Wartość (JSON lub plain) |
| updated_at | TIMESTAMP | Ostatnia aktualizacja |

**Dozwolone klucze (CHECK constraint w schemacie):**

| Klucz | Wartość | Opis |
|-------|---------|------|
| `order_events_cursor` | Event ID string | Ostatni przetworzony event zamówienia |
| `last_stock_sync` | ISO timestamp | Ostatni sync stocków |
| `circuit_breaker_status` | `'CLOSED'`/`'OPEN'`/`'HALF_OPEN'` | Stan circuit breakera |
| `circuit_breaker_expires` | ISO timestamp | Kiedy CB powinien przejść do HALF_OPEN |

> **Uwaga:** Dodany niestandardowy klucz `last_oauth_connect` (przez callback endpoint) nie jest  
> objęty CHECK constraint. Rozważyć dodanie do listy dozwolonych kluczy lub użycie osobnego mechanizmu.
>
> **Docelowe rozszerzenie CHECK:** Do listy dodać: `'offer_events_cursor'`, `'last_full_stock_audit'`,  
> `'last_oauth_connect'`.

### 18.2 Istniejące kolumny Allegro w tabeli `products`

> ✅ Te kolumny **już istnieją** w schemacie (`packages/db/schema/index.ts`):

| Kolumna | Typ | Opis | Status |
|---------|-----|------|--------|
| `allegro_offer_id` | VARCHAR(50) UNIQUE NULLABLE | Mapping 1:1 z ofertą Allegro | ✅ Istnieje |
| `allegro_status` | ENUM(`active`/`ended`/`error`/`unmapped`) | Status oferty na Allegro | ✅ Istnieje (domyślnie: `unmapped`) |

#### Kolumny do dodania w przyszłości (nie istnieją jeszcze)

| Kolumna | Typ | Opis | Domyślna |
|---------|-----|------|----------|
| `allegro_price_override` | DECIMAL(10,2) NULLABLE | Cena na Allegro (jeśli inna niż `price`) | NULL (= `price`) |
| `allegro_sync_enabled` | BOOLEAN | Czy sync stocku/ceny aktywny | TRUE |
| `allegro_category_id` | VARCHAR NULLABLE | ID kategorii Allegro | NULL |
| `allegro_last_sync_at` | TIMESTAMP NULLABLE | Ostatnia udana synchronizacja | NULL |

> **Migracja:** Dodanie tych kolumn wymaga nowej migracji Drizzle (`pnpm db:generate` + `pnpm db:push`).

### 18.3 Istniejące pola w tabeli `orders` (wykorzystanie dla Allegro)

| Pole | Użycie dla Allegro |
|------|-------------------|
| `source` | `'allegro'` (enum `order_source`) |
| `external_id` | Allegro checkoutForm UUID (UNIQUE index) |
| `customer_data` | JSONB z danymi buyera z Allegro |
| `idempotency_key` | `'allegro-{checkoutFormId}'` — deduplikacja |
| `allegro_buyer_login` | Login kupującego na Allegro *(pole w SQL DDL, nie w Drizzle schema — do weryfikacji)* |

### 18.4 Tabele CELOWO nie tworzone (optymalizacja)

| Co | Dlaczego nie tabela DB | Gdzie zamiast tego |
|----|----------------------|-------------------|
| `allegro_messages` | Tymczasowe, źródło = Allegro | KV (TTL 7d) |
| `allegro_billing` | Read-only snapshoty | KV (TTL 365d) |
| `allegro_categories` | Statyczne dane Allegro | KV (TTL 7d) |
| `allegro_carriers` | Statyczne dane Allegro | KV (TTL 24h) |
| `allegro_disputes` | Zarządzane przez Allegro | KV (TTL 1h) |

---

## 19. Diagram przepływu danych

### 19.1 Stock sync (DB → Allegro)

```
[Admin zmienia stock]   [Zakup na stronie]   [Zakup z Allegro]
        │                      │                     │
        └──────────┬───────────┘                     │
                   ▼                                 │
           DB Transaction:                   Cron Worker:
           UPDATE stock                      GET /order/events
           INSERT stock_changes              INSERT order + UPDATE stock
                   │                                 │
                   └──────────┬──────────────────────┘
                              ▼
                     CF Queue: { sku, newStock, priority }
                              │
                   ┌──────────┴──────────┐
                   │                     │
             priority=URGENT       priority=NORMAL
             (stock=0)             (stock>0)
                   │                     │
                   ▼                     ▼
             Natychmiast          Batch window (30s)
                   │                     │
                   └──────────┬──────────┘
                              ▼
                   PUT /sale/offer-quantity-change-commands
                              │
                              ▼
                   allegro_sync_log (audit)
```

### 19.2 Order import (Allegro → DB)

```
Allegro                    Cron Worker                    DB/KV
  │                            │                            │
  │  ◀── GET /order/events ────│                            │
  │  ──── events[] ──────────▶ │                            │
  │                            │── KV get cursor ──────────▶│
  │                            │◀─ cursor ─────────────────│
  │                            │                            │
  │  ◀─ GET /checkout-forms/X ─│                            │
  │  ──── order details ─────▶ │                            │
  │                            │── INSERT order ───────────▶│
  │                            │── UPDATE product stock ──▶│
  │                            │── INSERT stock_changes ──▶│
  │                            │── KV set cursor ─────────▶│
  │                            │── Queue: stock sync ─────▶│
  │                            │                            │
```

---

## 20. Fazy wdrożenia

### Faza 1 — Fundament (tydzień 1-2)

| Zadanie | Endpoint Allegro | Admin UI |
|---------|-----------------|----------|
| OAuth2 flow | `/auth/oauth/*` | `/admin/allegro/connect` |
| Token management | `/auth/oauth/token` | `/admin/allegro/settings` |
| Kategorie (cache) | `GET /sale/categories` | Lookup w mapping |
| Parametry kategorii | `GET /sale/categories/{id}/parameters` | Lookup w mapping |
| Health check | `GET /me` | `/admin/allegro` dashboard |

### Faza 2 — Core: Stock & Orders (tydzień 3-4)

| Zadanie | Endpoint Allegro | Admin UI |
|---------|-----------------|----------|
| Order event poller | `GET /order/events` | `/admin/orders?source=allegro` |
| Order details fetch | `GET /order/checkout-forms/{id}` | `/admin/orders/:id` |
| Stock push to Allegro | `PUT /sale/offer-quantity-change-commands` | `/admin/allegro/stock` |
| SKU↔offerId mapping UI | *(nie Allegro – local DB)* | `/admin/allegro/mapping` |
| Circuit breaker | *(internal)* | `/admin/allegro/sync` |
| Sync logs viewer | *(internal)* | `/admin/allegro/logs` |

### Faza 3 — Offer Management (tydzień 5-6)

| Zadanie | Endpoint Allegro | Admin UI |
|---------|-----------------|----------|
| Tworzenie oferty | `POST /sale/product-offers` | `/admin/allegro/mapping/new` |
| Edycja oferty | `PATCH /sale/product-offers/{id}` | `/admin/allegro/mapping/:sku/edit` |
| Upload zdjęć | `POST /sale/images` | Upload w wizardzie |
| Zmiana ceny | `PUT /sale/offer-price-change-commands` | `/admin/allegro/mapping` (inline) |
| Publikacja/wycofanie | `PUT /sale/offer-publication-commands` | Bulk actions w tabeli |
| Offer events monitor | `GET /sale/offer-events` | Alert badge |

### Faza 4 — Shipping & Communication (tydzień 7-8)

| Zadanie | Endpoint Allegro | Admin UI |
|---------|-----------------|----------|
| Tracking numbers | `POST /order/checkout-forms/{id}/shipments` | W szczegółach zamówienia |
| Status realizacji | `PUT /order/checkout-forms/{id}/fulfillment` | Dropdown w zamówieniu |
| Wiadomości | `GET/POST /messaging/threads/*` | `/admin/allegro/messages` |
| Spory | `GET /sale/disputes` | `/admin/allegro/disputes` |

### Faza 5 — Analytics & Polish (tydzień 9-10)

| Zadanie | Endpoint Allegro | Admin UI |
|---------|-----------------|----------|
| Rozliczenia | `GET /billing/billing-entries` | `/admin/allegro/billing` |
| Prowizje | `GET /me/payments/payment-operations` | `/admin/allegro/billing` |
| Kalkulator opłat | `POST /pricing/offer-fee-preview` | Preview w offer creation |
| Full stock audit | `GET /sale/product-offers/{id}` (per offer) | `/admin/allegro/stock` (compare) |
| After-sale policies | `GET /after-sales-service-conditions/*` | `/admin/allegro/settings` |

---

## 21. Bezpieczeństwo i RODO

### 21.1 Przechowywanie danych z Allegro

| Dane | Przechowywanie | RODO |
|------|---------------|------|
| Allegro access_token | DB (encrypted) + KV | Nie dotyczy (api credentials) |
| Allegro refresh_token | DB (encrypted) | Nie dotyczy |
| Dane kupującego z Allegro | `orders.customerData` (JSONB) | Art. 6 ust. 1 lit. b (umowa) |
| Email kupującego | W JSONB zamówienia | Usuwane z `orders.customerData` po 5 latach |
| Adres dostawy | W JSONB zamówienia | Usuwane z `orders.customerData` po 5 latach |
| Wiadomości Allegro | KV (TTL 7d) → auto-usuwane | Minimalizacja danych |
| Logi synchronizacji | DB (allegro_sync_log) | Brak danych osobowych |

### 21.2 Szyfrowanie tokenów

| Element | Metoda | Klucz |
|---------|--------|-------|
| Access token (DB) | AES-256-GCM | CF Worker secret: `ALLEGRO_TOKEN_ENCRYPTION_KEY` |
| Access token (KV) | **plaintext** (brak szyfrowania) | n/d — KV odczyt w hot-path, szyfrowanie zbędne |
| Refresh token (DB) | AES-256-GCM | CF Worker secret: `ALLEGRO_TOKEN_ENCRYPTION_KEY` |
| Refresh token (KV) | **plaintext**, bez TTL | n/d — overwrite przy każdym refresh; usuwany przy disconnect |

> ⚠️ **Wymagane w produkcji:** `ALLEGRO_TOKEN_ENCRYPTION_KEY` musi być ustawiony jako CF Secret — jeśli brakuje, tokeny lądują w DB jako plaintext. Klucz: 32-bajtowy hex (AES-256).

### 21.3 Audit trail

Zdarzenia OAuth zapisywane w tabeli `allegro_state` (klucz-wartość, upsert):

| Klucz | Opis | Gdzie zapisywany |
|-------|------|-----------------|
| `last_oauth_connect` | ISO timestamp ostatniego połączenia | `/callback` (sukces) |

> **Nie zaimplementowano** dedykowanej tabeli `audit_log` — pełen audit trail (disconnect, order import, stock sync, offer create) to zadanie przyszłe.

---

## Dodatek A: Cloudflare Workers Cron — konfiguracja

> **Format:** Projekt używa `wrangler.json` (nie `wrangler.toml`).

**Aktualny stan (`apps/api/wrangler.json`):**
```json
{
  "triggers": {
    "crons": ["0 * * * *"]
  }
}
```
Jeden cron co godzinę — obsługuje token refresh.

**Konfiguracja docelowa (po wdrożeniu pełnej integracji):**
```json
{
  "triggers": {
    "crons": [
      "0 * * * *",
      "* * * * *",
      "*/5 * * * *",
      "0 3 * * *",
      "0 2 * * 1"
    ]
  },
  "kv_namespaces": [
    { "binding": "ALLEGRO_KV", "id": "..." },
    { "binding": "AUTH_RATE_LIMIT", "id": "..." }
  ],
  "r2_buckets": [
    { "binding": "PRODUCT_IMAGES", "bucket_name": "il-buon-caffe-images" }
  ],
  "queues": {
    "producers": [
      { "queue": "allegro-stock-sync", "binding": "STOCK_QUEUE" }
    ],
    "consumers": [
      {
        "queue": "allegro-stock-sync",
        "max_batch_size": 10,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "allegro-dlq"
      }
    ]
  }
}
```

**Dispatcher w `scheduled()` routuje po cron expression:**
| Cron | Zadanie |
|------|---------|
| `0 * * * *` | Token refresh (istniejący) |
| `* * * * *` | Order events polling |
| `*/5 * * * *` | Offer events + stock delta check |
| `0 3 * * *` | Billing sync + health check |
| `0 2 * * 1` | Full stock audit (weekly) |

---

## Dodatek B: Endpointy naszego API (proxy do Allegro)

| Nasz endpoint | Metoda | Co robi | Auth |
|---------------|--------|---------|------|
| `/api/admin/allegro/connect` | GET | Redirect do OAuth Allegro | Admin JWT |
| `/api/admin/allegro/callback` | GET | OAuth callback → zapis tokenów | Public (OAuth flow) |
| `/api/admin/allegro/status` | GET | Status połączenia | Admin JWT |
| `/api/admin/allegro/disconnect` | POST | Usunięcie tokenów | Admin JWT |
| `/api/admin/allegro/mapping` | GET | Lista SKU↔offerId | Admin JWT |
| `/api/admin/allegro/mapping` | PUT | Ustaw mapping (sku, offerId) | Admin JWT |
| `/api/admin/allegro/offers` | POST | Utwórz ofertę → Allegro | Admin JWT |
| `/api/admin/allegro/offers/:id` | PATCH | Edytuj ofertę → Allegro | Admin JWT |
| `/api/admin/allegro/offers/:id` | GET | Pobierz ofertę z Allegro | Admin JWT |
| `/api/admin/allegro/offers/:id/publish` | PUT | Publikuj/wycofaj ofertę | Admin JWT |
| `/api/admin/allegro/sync-status` | GET | Status sync (circuit breaker, last run) | Admin JWT |
| `/api/admin/allegro/sync/force` | POST | Wymuś natychmiastowy sync | Admin JWT |
| `/api/admin/allegro/logs` | GET | Logi synchronizacji (paginated) | Admin JWT |
| `/api/admin/allegro/stock/compare` | GET | Porównaj stany shop vs Allegro | Admin JWT |
| `/api/admin/allegro/stock/sync` | POST | Force stock sync (all SKU) | Admin JWT |
| `/api/admin/allegro/orders` | GET | Zamówienia Allegro (z naszej DB) | Admin JWT |
| `/api/admin/allegro/orders/:id` | GET | Szczegóły zamówienia | Admin JWT |
| `/api/admin/allegro/orders/:id/ship` | POST | Dodaj tracking + zmień status | Admin JWT |
| `/api/admin/allegro/messages` | GET | Wątki wiadomości (z KV/Allegro) | Admin JWT |
| `/api/admin/allegro/messages/:threadId` | GET/POST | Odczyt/wysyłka wiadomości | Admin JWT |
| `/api/admin/allegro/disputes` | GET | Spory (z KV/Allegro) | Admin JWT |
| `/api/admin/allegro/billing` | GET | Rozliczenia (z KV) | Admin JWT |
| `/api/admin/allegro/categories` | GET | Drzewo kategorii (KV cached) | Admin JWT |
| `/api/admin/allegro/categories/:id/params` | GET | Parametry kategorii (KV cached) | Admin JWT |
| `/api/admin/allegro/carriers` | GET | Lista kurierów (KV cached) | Admin JWT |
| `/api/admin/allegro/settings` | GET/PUT | Konfiguracja (env, toggles) | Admin JWT |

---

## Dodatek C: Mapowanie statusów zamówień

| Status Allegro | Event type | Nasz status (`order_status`) | Akcja |
|---------------|------------|------------------------------|-------|
| BOUGHT | `BOUGHT` | `pending` | Tylko log (czekamy na płatność) |
| FILLED_IN | `FILLED_IN` | `pending` | Zapis adresu dostawy (dane mogą się zmienić) |
| READY_FOR_PROCESSING | `READY_FOR_PROCESSING` | `paid` | ★ Import zamówienia do DB |
| — | (admin action) | `processing` | Admin zaczyna pakowanie |
| — | (admin action) | `shipped` | Admin nadaje paczkę → POST shipment |
| — | (buyer delivery) | `delivered` | Automatycznie (jeśli tracking potwierdzi) |
| — | `BUYER_CANCELLED` | `cancelled` | Zwrot stocku |
| — | `AUTO_CANCELLED` | `cancelled` | Zwrot stocku |

---

## Dodatek D: Estimated Costs (Cloudflare Free Tier)

| Zasób | Zużycie dzienne | Free tier | Czy wystarczy? |
|-------|-----------------|-----------|----------------|
| Worker requests | ~1 500 (cron) + ~500 (admin) | 100 000/day | ✅ Tak |
| KV reads | ~2 000 | 100 000/day | ✅ Tak |
| KV writes | ~200–500 | 1 000/day | ✅ Tak (z conditional writes) |
| Queue messages | ~200 | 1 000 000/month | ✅ Tak |
| DB queries (Neon) | ~100-300 | 3M rows read/month | ✅ Tak |

> **⚠️ Uwaga o KV writes:**  
> Jeśli `order_events_cursor` jest zapisywany przy **każdym** cron run (co 60s) — to **1 440 writes/day**  
> na sam cursor, co **przekracza** free tier (1 000/day).  
>  
> **Wymagane podejście (conditional writes):** Kursor zapisywać do KV **tylko gdy** pojawiły się nowe eventy  
> (tj. cursor faktycznie zmienił wartość). Przy ~10-50 zamówieniach/dzień = ~10-50 writes na cursor.  
>  
> **Szacunkowy rozkład writes z conditional approach:**  
> | Klucz | Writes/day | Warunek |
> |-------|-----------|---------|
> | `allegro:cursor:orders` | ~10-50 | Tylko gdy nowe eventy |  
> | `allegro:tokens:*` | ~2 | Token refresh 1×/12h |
> | `allegro:status` | ~24 | Status update co godzinę |
> | `allegro:state:*` (CSRF etc.) | ~5 | Na OAuth flow |
> | `allegro:cache:*` | ~50-100 | Kategorie, carriers, etc. |
> | **RAZEM** | **~100-200** | **Bezpiecznie w free tier** |

---

## Dodatek E: Allegro API Base URLs

| Środowisko | Base URL | OAuth URL |
|------------|----------|-----------|
| **Sandbox** | `https://api.allegro.pl.allegrosandbox.pl` | `https://allegro.pl.allegrosandbox.pl` |
| **Production** | `https://api.allegro.pl` | `https://allegro.pl` |

---

---

## 22. Statystyki, projekcje i szybkość panelu admina

### 22.1 Jakie statystyki liczymy

| Kategoria | Metryki | Granularność |
|-----------|---------|-------------|
| **Sprzedaż** | Przychód brutto, liczba zamówień, średnia wartość koszyka | Dzień / tydzień / miesiąc |
| **Kanały** | Porównanie: sklep własny vs Allegro (GMV, ilość) | Dzień / miesiąc |
| **Produkty** | Top 10 produktów by przychód / ilość; produkty bez sprzedaży | Miesiąc / YTD |
| **Allegro prowizje** | Prowizja zapłacona, marża netto, średnia prowizja % | Dzień / miesiąc |
| **Stock alerts** | Produkty z stock < 5; produkty bez stock na Allegro (ended) | Real-time (cron) |
| **Projekcje** | Przychód miesiąc na podstawie trendów z pierwszych dni | Dynamicznie w JS |

### 22.2 Gdzie obliczane — matryca

| Metryka | Obliczona gdzie | Kiedy | Czas odpowiedzi |
|---------|----------------|-------|----------------|
| Przychód dnia (zamknięty dzień) | **Cron 3:00** → agregacja SQL → KV `stats:daily:{date}` | Raz na dobę | ⚡ <100ms (z KV) |
| Przychód bieżącego dnia (live) | **DB query** przy otwarciu dashboardu | Na żądanie admina | 200-500ms |
| Przychód miesiąca i poprzedniego | **Cron 3:00** → KV `stats:monthly:{YYYY-MM}` | Raz na dobę | ⚡ <100ms (z KV) |
| Top produkty (miesiąc) | **Cron 3:00** → KV `stats:top-products:{YYYY-MM}` | Raz na dobę | ⚡ <100ms (z KV) |
| Porównanie kanałów | **Cron 3:00** → KV (część `stats:monthly`) | Raz na dobę | ⚡ <100ms (z KV) |
| Prowizje Allegro | **Cron 3:00** `handleBillingSync` → KV `allegro:billing:{date}` | Raz na dobę | ⚡ <100ms (z KV) |
| Stock alerts (< 5) | **Cron `*/5 * * * *`** → KV `stats:stock-alerts` | Co 5 min | ⚡ <100ms (z KV) |
| Projekcja przychodu miesiąca | **Klient (JS)**: `(przychód do dziś / dzień_miesiąca) × dni_w_miesiącu` | Na żądanie, w client | ~0ms (kalkulacja JS) |
| Wykresy (Line, Bar, Pie) | **Klient (Recharts/Chart.js)**: dane z KV via Worker | Na żądanie | <100ms render |
| Filtrowanie/ sortowanie tabel | **Klient (JS sort/filter)** | Na żądanie | ~0ms |

> **Zasada:** Cokolwiek można policzyć raz na dobę — liczymy w cron o 3:00 i wkładamy do KV.  
> Dashboard admin otwiera się błyskawicznie — Zero DB hit dla historycznych danych.

### 22.3 Zapytania do bazy (SQL) dla statystyk

Jedyne zapytanie SQL na dashboardzie to **przychód bieżącego dnia** (nie można go pre-computować w nocy, bo dzień się nie skończył):

```sql
-- Uruchamiane tylko raz przy otwarciu dashboardu, wynik cachowany w KV na 5 min
SELECT
  COUNT(*)                                        AS order_count,
  SUM(total_amount)                               AS revenue_today,
  AVG(total_amount)                               AS avg_order_value,
  COUNT(*) FILTER (WHERE source = 'allegro')      AS allegro_orders,
  SUM(total_amount) FILTER (WHERE source = 'allegro') AS allegro_revenue
FROM orders
WHERE
  created_at >= CURRENT_DATE
  AND status NOT IN ('cancelled', 'refunded');
```

**Wynik cachowany:** KV `stats:today` TTL 5 minut.  
Druga wizyta admina w ciągu 5 minut: bez DB hit.

### 22.4 Nocny stats cron (w `handleBillingSync` lub osobny)

```typescript
// Uruchamiane o 3:00 AM — po handleBillingSync
async function handleStatsComputation(env: Env) {
  const yesterday = getYesterdayDateString() // '2026-03-05'
  const monthKey = yesterday.slice(0, 7)      // '2026-03'

  // 1. Dzienny snapshot ze zwykłej bazy
  const daily = await db.execute(`
    SELECT
      source,
      COUNT(*)            AS order_count,
      SUM(total_amount)   AS revenue,
      AVG(total_amount)   AS avg_value
    FROM orders
    WHERE DATE(created_at) = $1
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY source
  `, [yesterday])

  await env.ALLEGRO_KV.put(
    `stats:daily:${yesterday}`,
    JSON.stringify(daily),
    { expirationTtl: 365 * 86400 }
  )

  // 2. Miesięczna agregacja (rolling update)
  const monthly = await db.execute(`
    SELECT
      source,
      COUNT(*)            AS order_count,
      SUM(total_amount)   AS revenue
    FROM orders
    WHERE TO_CHAR(created_at, 'YYYY-MM') = $1
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY source
  `, [monthKey])

  await env.ALLEGRO_KV.put(
    `stats:monthly:${monthKey}`,
    JSON.stringify(monthly),
    { expirationTtl: 365 * 86400 }
  )

  // 3. Top produkty (miesiąc bieżący)
  const topProducts = await db.execute(`
    SELECT
      oi.product_sku,
      p.name,
      SUM(oi.quantity)    AS units_sold,
      SUM(oi.unit_price * oi.quantity) AS revenue
    FROM order_items oi
    JOIN products p ON p.sku = oi.product_sku
    JOIN orders o ON o.id = oi.order_id
    WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1
      AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY oi.product_sku, p.name
    ORDER BY revenue DESC
    LIMIT 10
  `, [monthKey])

  await env.ALLEGRO_KV.put(
    `stats:top-products:${monthKey}`,
    JSON.stringify(topProducts),
    { expirationTtl: 365 * 86400 }
  )
}
```

> **DB hit przy tym cron:** ~3 zapytania × ~1ms każde (indeksowane `created_at`, małe dane).  
> Neon nie zdążył usnąć między `handleBillingSync` a `handleStatsComputation` → cold start tylko 1×.

### 22.5 Oczekiwane czasy wczytywania

| Widok admina | Co pobiera | Czas odpowiedzi | Neon hit? |
|-------------|-----------|----------------|----------|
| **Dashboard (pierwsza wizyta dnia)** | KV: stats wczoraj/miesiąc + 1× DB: stats dzisiaj | 200-500ms | TAK (1× po cold start) |
| **Dashboard (kolejna wizyta, <5min)** | KV: wszystko z cache | ⚡ <100ms | NIE |
| **Lista zamówień** | DB (paginated: 20 rows, indexed) | 150-350ms | TAK |
| **Szczegóły zamówienia** | DB (single row) | 100-200ms | TAK |
| **Finanse/billing** | KV: snapshoty z 3:00 | ⚡ <100ms | NIE |
| **Projekcja miesiąca** | JS (przychód z KV / dni bieżące × dni w mies.) | ⚡ ~0ms | NIE |
| **Wykresy 30 dni** | KV: 30× `stats:daily:{date}` (batch get) | 100-200ms | NIE |
| **Porównanie stocków (Allegro vs DB)** | DB + live Allegro API subrequest | 500-1500ms | TAK |
| **Stock alerts badge** | KV: `stats:stock-alerts` | ⚡ <100ms | NIE |
| **Allegro sync status** | KV | ⚡ <100ms | NIE |

### 22.6 Główne ryzyka wydajności i mitygacje

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Neon cold start** | Pierwsza wizyta po uśpieniu bazy (>5 min bez zapytań) = cold start 1-3s (via Hyperdrive ~500ms) | Pre-warm DB w cron `0 6 * * *` (prosta `SELECT 1` budzi bazę przed godzinami pracy) |
| **KV eventual consistency** | Zapis do KV widoczny po ~500ms globalnie — edycja przez admina może nie być widoczna chwilowo | Aktualizacja lokalna w UI (optimistic update) + auto-refresh po 1s |
| **Wolne KV batch reads** | 30 kluczy `stats:daily:*` to 30 oddzielnych KV reads — każdy ~20ms | Skonsoldować: 1 klucz `stats:daily-range:{YYYY-MM}` z 30 wpisami w JSON |
| **Duże listy zamówień bez paginacji** | Brak LIMIT → pełny table scan | Zawsze `LIMIT 20 OFFSET n`, zawsze index na `orders.created_at` i `orders.source` |
| **Allegro API latency** | Live API call (porównanie stocków) może trwać 500-2000ms | Zawsze on-demand (klik admina), nigdy blokuj ładowanie strony |
| **Stats stale po północy** | Cron 3:00 — między 0:00 a 3:00 stats dzień poprzedni nie są jeszcze w KV | Fallback: live DB query jeśli KV miss + TZ: cron o 3:00 UTC = 4:00 CET/5:00 CEST |

### 22.7 KV klucze statystyk (uzupełnienie tabeli z sekcji 13.1)

| Klucz | TTL | Zawartość |
|-------|-----|-----------|
| `stats:today` | 5 min | Przychód + ilość zamówień bieżącego dnia (per source) |
| `stats:daily:{YYYY-MM-DD}` | 365 dni | Zamknięty dzień: przychód, ilość, avg (per source) |
| `stats:monthly:{YYYY-MM}` | 365 dni | Miesiąc: przychód, ilość (per source) |
| `stats:top-products:{YYYY-MM}` | 365 dni | Top 10 produktów by revenue |
| `stats:stock-alerts` | 5 min | Lista SKU z stock < 5 lub allegro_status = 'ended' |

---

> **Ten dokument jest źródłem prawdy dla strategii integracji Allegro w projekcie Il Buon Caffè.**  
> Wszelkie zmiany w architekturze synchronizacji powinny być najpierw odzwierciedlone tutaj.
