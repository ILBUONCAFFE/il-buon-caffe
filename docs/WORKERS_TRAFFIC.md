# Cloudflare Workers — Mapa ruchu i budżet 100 000 req/dzień

> **Wersja:** 1.0  
> **Data:** 2026-03-06  
> **Dotyczy:** `apps/api` (Cloudflare Worker + Hono.js)  
> **Cel:** Zinwentaryzowanie wszystkich źródeł requestów Workera i potwierdzenie, że mieścimy się w free tier.

---

## Free tier Cloudflare Workers

| Limit | Wartość | Uwagi |
|-------|---------|-------|
| **Requests/dzień** | **100 000** | ~1.16 req/s średnio |
| Subrequests per invocation | 50 | Wywołania `fetch()` wychodzące Z Workera |
| CPU time per request | 10 ms (standard) | Burst do 30s dozwolony |
| Memory per invocation | 128 MB | |
| KV reads/dzień | 100 000 | Osobny limit |
| KV writes/dzień | 1 000 | Osobny limit — patrz [ALLEGRO_API_STRATEGY.md](ALLEGRO_API_STRATEGY.md#dodatek-d-estimated-costs-cloudflare-free-tier) |

---

## Co liczy się jako „request Workers" (a co nie)

### Liczy się → wchodzi w 100 000/dzień

| Typ | Opis |
|-----|------|
| **HTTP request** | Każde wywołanie `fetch()` przychodzące DO naszego Workera (przeglądarka, Next.js, webhook) |
| **Cron trigger** | Każde odpalenie `scheduled()` — jedno odpalenie = 1 request |
| **Queue event** | Każde dostarczenie batcha przez CF Queue do konsumenta = 1 request |

### **NIE** liczy się → subrequests (bezpłatne)

| Typ | Opis |
|-----|------|
| Wywołania `fetch()` z Workera do **Allegro API** | Subrequest — nie wchodzi w 100k |
| Odczyty/zapisy **Cloudflare KV** | Osobny limit, nie 100k |
| Zapytania do **Neon PostgreSQL** (via Hyperdrive) | Nie liczy się |
| Dostęp do **Cloudflare R2** | Nie liczy się |
| Wysyłanie do **CF Queue** (producer) | Osobny limit kolejek |

> **Kluczowy wniosek:** Nawet jeśli jeden cron handler robi 10 wywołań do Allegro API,  
> do limitu 100k liczy się tylko **1 request** (samo odpalenie crona).

---

## Szczegółowa mapa requestów

### 1. Cron triggers — `scheduled()` handler

| Cron expression | Częstotliwość | req/dzień | Handler | Działanie |
|-----------------|---------------|-----------|---------|-----------|
| `* * * * *` | Co 60s | 1 440 | `handleOrderPoll` | Polling order events |
| `*/5 * * * *` | Co 5 min | 288 | `handleOfferMonitor` + `handleMessagePoll` | Events ofert + wiadomości |
| `*/15 * * * *` | Co 15 min | 96 | `handleDisputeChecker` | Sprawdzenie sporów |
| `0 * * * *` | Co 1h | 24 | `autoRefreshAllegroToken` + `GET price-automation/rules` | Token + cache reguł cenowych |
| `0 3 * * *` | Codziennie 3:00 | 1 | `handleBillingSync` + `GET allegro-prices/consent` | Billing + status programu Ceny |
| `0 4 * * *` | Codziennie 4:00 | 1 | `handleHealthCheck` | Weryfikacja konta |
| `0 2 * * 1` | Pon 2:00 | 0,14 | `handleFullStockAudit` | Pełny audit stocków |
| **RAZEM cron** | | **≈ 1 850** | | |

> **Obecny stan:** Wdrożony jest tylko `0 * * * *` (token refresh) = **24 req/dzień**.  
> Docelowo po pełnej implementacji: **≈ 1 850 req/dzień** (1,85% budżetu).

### 2. HTTP requests — Admin panel (`/api/admin/*`)

Szacunek: 1 admin, aktywna sesja ~4-8h dziennie.

| Kategoria | Opis | req/dzień (est.) |
|-----------|------|-----------------|
| Dashboard + status | Auto-polling co 30s gdy strona otwarta (2h/dzień) | ~240 |
| Lista zamówień | Refresh + filtry | ~40 |
| Szczegóły zamówień | Kliknięcia w zamówienia | ~30 |
| Mapping/oferty | Zarządzanie SKU↔offerId | ~20 |
| Zestawy (bundles) | Tworzenie/edycja zestawów | ~15 |
| Ceny (price + Allegro Ceny) | Aktualizacje cen | ~15 |
| Logi sync, status | Przeglądanie | ~20 |
| Wiadomości/spory | Na żądanie | ~15 |
| Ustawienia, billing | Okazjonalnie | ~5 |
| **RAZEM admin HTTP** | | **≈ 400 req/dzień** |

> **Uwaga:** Admin dashboard jeśli otwarty przez całą dobę z auto-refresh co 30s =  
> 2880 req/dzień (tylko polling). Nie zakładamy tak intensywnego użycia,  
> ale warto dodać `stale-while-revalidate` lub zwiększyć interwał do 60s.

### 3. HTTP requests — Strona publiczna (`/api/*`)

Ruch z Next.js (apps/web) do naszego API.

| Kategoria | Opis | req/dzień (est.) |
|-----------|------|-----------------|
| Koszyk (add/remove/update) | ~10-50 zamówień/dzień × ~5 operacji | ~150 |
| Checkout (create order) | ~10-50 zamówień/dzień | ~50 |
| Płatności (webhook Przelewy24) | ~10-50 potwierdzeń | ~50 |
| Produkty (API, jeśli SSR nie cachuje) | Niskoruch, Next cache | ~30 |
| Auth (login/sesja) | ~10-30 adminów dziennie | ~30 |
| **RAZEM web HTTP** | | **≈ 310 req/dzień** |

> Większość stron publicznych to SSG/ISR w Next.js na Cloudflare Pages — **nie dotykają Workers**.

### 4. CF Queue consumer invocations

| Kolejka | Trigger | Typowy batch | req/dzień (est.) |
|---------|---------|--------------|-----------------|
| `allegro-stock-sync` | Zmiana stocku po zakupie/update admina | 1-10 wiadomości/batch | ~50 |
| `allegro-dlq` (dead letter) | Nieudane retries | Rzadkie | ~2 |
| **RAZEM queue** | | | **≈ 52 req/dzień** |

---

## Podsumowanie dzienne

| Źródło | req/dzień (typowy) | req/dzień (peak) | % z 100k |
|--------|-------------------|-----------------|---------|
| Cron triggers | 1 850 | 1 850 | 1,85% |
| HTTP admin | 400 | 800 | 0,40–0,80% |
| HTTP web (public) | 310 | 600 | 0,31–0,60% |
| CF Queue consumers | 52 | 150 | 0,05–0,15% |
| **RAZEM** | **≈ 2 612** | **≈ 3 400** | **≈ 2,6–3,4%** |

### Margines bezpieczeństwa

```
Budżet:              100 000 req/dzień
Typowe zużycie:       ~2 600 req/dzień  (2,6%)
Peak zużycie:         ~3 400 req/dzień  (3,4%)
─────────────────────────────────────────
Dostępny margines:   ~96 600–97 400 req/dzień
Mnożnik do limitu:     ~29× (typowy) — ~30× zapasu
```

> **Wniosek:** Przy aktualnej architekturze jesteśmy daleko od limitu.  
> Nowe endpointy (`offer-bundles`, `price-automation/rules`, `allegro-prices/*`) dodają  
> **+0 automatycznych** (mieszczą się w istniejących cronach) + **~30-50 admin on-demand** req/dzień.  
> Łączny wpływ: **+30-50 req/dzień** (0,03–0,05% budżetu) — pomijalny.

---

## Subrequests per invocation (limit: 50)

Limitu 50 subrequestów na invocation przy naszych handlerach nie przekroczymy:

| Handler | Typowe subrequesty | Max subrequesty |
|---------|-------------------|-----------------|
| `handleOrderPoll` (`* * * * *`) | 1 (GET events) + N×2 (form fetch + DB) | ~1-11 |
| `handleOfferMonitor` (`*/5 * * * *`) | 2 (offer events + msg poll) | 4 |
| `handleDisputeChecker` (`*/15 * * * *`) | 1 (GET disputes) | 2 |
| `autoRefreshAllegroToken` (`0 * * * *`) | 1-3 (check + conditional refresh + price-rules GET) | 3 |
| Stock sync (queue consumer) | 1 per item × max 10 items/batch | 10 |
| Admin HTTP request | 1 (Allegro API) + 1 (DB) | 5 |

---

## Analiza scenariuszy ryzyka

### Kiedy **nie** przekroczymy 100k/dzień (nasze realistyczne scenariusze)

| Scenariusz | Req/dzień | % budżetu |
|------------|-----------|-----------|
| Tylko cron bez admina | 1 850 | 1,85% |
| Cron + normalny dzień admina | ~2 600 | 2,6% |
| Cron + intensywny admin (8h bez przerwy) | ~5 000 | 5% |
| Cron + admin + duży ruch web (200 zamówień/dzień) | ~8 000 | 8% |

### Kiedy mogłoby się zbliżyć do 100k (tylko hipotetycznie)

| Scenariusz | Co powoduje | Mitygacja |
|------------|-------------|-----------|
| Admin dashboard open 24/7 z refresh co 5s | ~17 000 HTTP req/dzień samo refreshowanie | Zwiększ interwał do ≥60s |
| Bug: infinite webhook loop | Nieograniczone HTTP | Rate limiting na `/api/*` |
| DDoS na publiczne API | Masowe HTTP requests | Cloudflare WAF / rate limit |
| 10+ adminów jednocześnie | Multiplikacja HTTP | Wtedy jesteśmy dużym sklepem → Workers Paid ($5/mo) |

> **Próg decyzji o Workers Paid:** Jeśli regularnie przekraczamy **50 000 req/dzień** (50% budżetu),  
> czas na Workers Paid ($5/miesiąc = 10 mln req/miesiąc = ~333k req/dzień).

---

## Strategie optymalizacji (gdyby było potrzebne)

| Strategia | Oszczędność req/dzień | Koszt implementacji | Kiedy stosować |
|-----------|-----------------------|--------------------|----|
| Zwiększ interwał order poll: `* * * * *` → `*/2 * * * *` | -720 | Minimalna zmiana wranglera | Gdy opóźnienie 2 min akceptowalne |
| Zwiększ interwał order poll do `*/5 * * * *` | -1 152 | Minimalna zmiana | Gdy opóźnienie 5 min akceptowalne |
| Admin status polling: 30s → 60s | -120 | 1 linia JS w kliencie | Quick win |
| Deduplicate admin requests (SWR cache) | -100 | Refaktor frontu | Dobra praktyka |
| Lazy load dispute/message checker | -96 | Przesuń cron na niższy priorytet | Jeśli spory rzadkie |
| SSR na Next.js dla danych admina (nie API calls) | -200 | Większy refaktor | Przy >50k req/dzień |
| **Workers Paid ($5/mo)** | +9 900 000/miesiąc | Zmiana planu | Przy stałym > 80k req/dzień |

---

## Monitoring zużycia

### Cloudflare Dashboard
1. Zaloguj się → **Workers & Pages** → **Il Buon Caffe API** → zakładka **Metrics**
2. Widok: `Requests`, `Errors`, `CPU Time` — wykresy 24h / 7d / 30d
3. Free tier wysyła **email alert** przy 80% zużycia (~80k req/dzień)

### Własne logi (zalecane)
Dodaj do health check crona log statystyk do KV:
```typescript
// W handleHealthCheck (0 4 * * *)
const stats = {
  date: new Date().toISOString().split('T')[0],
  // CF nie udostępnia usage przez API, ale możemy liczyć własne operacje
  dbQueriesYesterday: await getStatFromDB('query_count'),
  tokenRefreshCount: await env.ALLEGRO_KV.get('stats:token_refresh_count'),
}
await env.ALLEGRO_KV.put('stats:daily:' + stats.date, JSON.stringify(stats), { expirationTtl: 90 * 86400 })
```

---

## Powiązane dokumenty

- [ALLEGRO_API_STRATEGY.md](ALLEGRO_API_STRATEGY.md) — strategia integracji, szczegóły KV writes
- [ARCHITECTURE.md](ARCHITECTURE.md) — ogólna architektura projektu
- [API.md](API.md) — dokumentacja endpointów naszego API
