# Neon DB — CU Hours Optimization

**Data:** 2025-03-08  
**Projekt Neon:** `weathered-dew-80509711` (PostgreSQL 17, `aws-eu-central-1`)  
**Branch aktywny:** `br-lucky-forest-agp8bfwo` (dev) — cały ruch tutaj  
**Autoscaling:** 0.25–2 CU | `suspend_timeout_seconds: 0` (instant suspend ✅)

---

## Podsumowanie zmian

### 1. DB Middleware — jedno połączenie per request
**Plik:** `apps/api/src/middleware/db.ts` (NOWY)  
**Problem:** 57 wywołań `createDb()` rozproszonych po 15 plikach routów — wiele routów tworzyło kilka instancji na żądanie.  
**Rozwiązanie:** Hono middleware `dbMiddleware()` tworzy JEDNĄ instancję Drizzle per request i udostępnia przez `c.get('db')`.  
**Oszczędność:** Eliminacja duplikowanych handshake'ów HTTP do Neon na każdym żądaniu.

### 2. Cache health check (30s TTL)
**Plik:** `apps/api/src/index.ts`  
**Problem:** Każdy ping `/` budził compute Neon (uptime monitoring).  
**Rozwiązanie:** Cache odpowiedzi na 30s + `SELECT 1` zamiast `SELECT NOW()`.  
**Oszczędność:** ~2880 → ~48 wake-upów/dzień z monitoringu co 30s.

### 3. Cron co 5 minut (zamiast co minutę)
**Plik:** `apps/api/wrangler.json`  
**Problem:** Cron `* * * * *` budził Neon 1440x/dzień, nawet gdy brak eventów.  
**Rozwiązanie:** `*/5 * * * *` — 5× rzadziej.  
**Oszczędność:** Max 288 invokacji/dzień zamiast 1440.

### 4. Lazy DB w syncAllegroOrders
**Plik:** `apps/api/src/lib/allegro-orders.ts`  
**Problem:** `createDb()` wywoływane natychmiast, nawet gdy brak eventów do przetworzenia.  
**Rozwiązanie:** Lazy pattern — DB tworzone TYLKO gdy są eventy do zapisu lub KV miss.  
**Oszczędność:** Przy braku zamówień (typowy stan) — 0 CU zużycia na cron.

### 5. KV-first token refresh
**Plik:** `apps/api/src/index.ts`  
**Problem:** Hourly cron `autoRefreshAllegroToken()` zawsze czytał DB by sprawdzić expiry tokena.  
**Rozwiązanie:** Cache `allegro:token_expires_at` w KV — DB odpytywane tylko gdy token bliski wygaśnięcia.  
**Oszczędność:** ~23/24 godzin dziennie bez zapytań DB w hourly cron.

### 6. Audit middleware — reuse DB
**Plik:** `apps/api/src/middleware/auditLog.ts`  
**Problem:** Tworzenie drugiego klienta DB per request admin.  
**Rozwiązanie:** `c.get('db')` z middleware zamiast `createDb()`.  
**Oszczędność:** 1 mniej DB client per request admin.

### 7. Data retention cleanup
**Plik:** `apps/api/src/index.ts` — `dataRetentionCleanup()`  
**Problem:** Logi rosły bez ograniczeń, zwiększając storage i czas skanowania.  
**Rozwiązanie:** Codzienny cleanup (raz/dzień przy cron):
- `allegro_sync_log` > 90 dni → DELETE
- `audit_log` > 1 rok → DELETE
- Stare `allegro_credentials` (inactive, > 30 dni) → DELETE  
**Oszczędność:** Mniejsze tabele = szybsze zapytania = mniej CU.

### 8. Usunięcie duplikatów indeksów (4 szt.)
**Pliki:** `packages/db/schema/index.ts`, `apps/web/src/db/schema.ts`  
**Problem:** Constraint `.unique()` w Drizzle automatycznie tworzy indeks (np. `users_email_unique`). Dodatkowy `uniqueIndex('users_email_idx')` tworzył DUPLIKAT.  
**Usunięte duplikaty:**

| Usunięty indeks | Pokryty przez constraint |
|---|---|
| `users_email_idx` | `users_email_unique` |
| `categories_slug_idx` | `categories_slug_unique` |
| `products_slug_idx` | `products_slug_unique` |
| `orders_number_idx` | `orders_order_number_unique` |

**Oszczędność:** 4 mniej indeksów do utrzymania przy INSERT/UPDATE. Mniejszy storage.

### 9. pg_stat_statements
**Rozszerzenie zainstalowane** na branchu dev — pozwala monitorować najwolniejsze/najczęstsze zapytania w przyszłości.

---

## Stan infrastruktury Neon (już optymalny)

| Parametr | Wartość | Komentarz |
|---|---|---|
| `suspend_timeout_seconds` | 0 | ✅ Natychmiastowe usypianie |
| Autoscaling | 0.25–2 CU | OK dla obecnego obciążenia |
| Pooler endpoint | Używany | ✅ `-pooler` w connection string |
| `fetchConnectionCache` | `true` | ✅ W `packages/db/client.ts` |
| Singleton DB (Next.js) | Proxy pattern | ✅ W `apps/web/src/db/index.ts` |

---

## Szacowane oszczędności CU

| Optymalizacja | Redukcja wake-upów/dzień |
|---|---|
| Health cache 30s | ~2832 mniej |
| Cron 5min zamiast 1min | ~1152 mniej |
| Lazy DB (idle crons) | ~280 mniej |
| KV-first token refresh | ~23 mniej |
| **Łącznie** | **~4287 mniej wake-upów/dzień** |

> Przy autoscaling 0.25 CU i instant suspend, każdy wake-up zużywa minimum ~5s CU. Redukcja ~4000 wake-upów = **~5.5h CU/dzień mniej**.

---

## Rekomendacje na przyszłość

1. **Obniżenie max CU z 2 → 0.5** — obecne obciążenie (10 produktów, 1 user) nie wymaga 2 CU; pozwoli uniknąć kosztownych skoków
2. **Monitorowanie pg_stat_statements** — po kilku dniach sprawdzić najcięższe zapytania
3. **Konsolidacja schematów** — `packages/db/schema` i `apps/web/src/db/schema.ts` mają dryft kolumn (np. `p24Status` vs brak, różne pola w orders) — warto ujednolicić
