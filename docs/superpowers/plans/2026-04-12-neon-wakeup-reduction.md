# Neon Wake-up Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zredukować liczbę wake-upów Neon PostgreSQL z ~372/dobę do ~99/dobę przez zmianę interwału cron pollingu Allegro i rozszerzenie okna nocnego thinning.

**Architecture:** Dwie zmiany w dwóch plikach. `wrangler.json` — cron expression. `apps/api/src/index.ts` — stałe night-thinning, logika `isPolandNightHour` (naprawa midnight crossing), dopasowanie stringa crona, guard dla stanu disconnected.

**Tech Stack:** Cloudflare Workers cron triggers, Cloudflare KV, Hono.js 4.11, TypeScript

---

## Pliki do modyfikacji

| Plik | Co się zmienia |
|---|---|
| `apps/api/wrangler.json` | Cron expression `*/3` → `*/10` |
| `apps/api/src/index.ts` | Stałe thinning, `isPolandNightHour`, match string crona, log, guard B |

---

### Task 1: Zmiana cron expression w wrangler.json

**Files:**
- Modify: `apps/api/wrangler.json`

- [ ] **Krok 1: Zmień cron expression**

W `apps/api/wrangler.json`, sekcja `triggers.crons`, zmień:

```json
"triggers": {
  "crons": [
    "*/10 * * * *",
    "0 * * * *",
    "0 3 * * *"
  ]
}
```

(było `"*/3 * * * *"`, teraz `"*/10 * * * *"`)

- [ ] **Krok 2: Zweryfikuj JSON**

```bash
cd apps/api && node -e "JSON.parse(require('fs').readFileSync('wrangler.json','utf8')); console.log('OK')"
```

Oczekiwane: `OK`

- [ ] **Krok 3: Commit**

```bash
git add apps/api/wrangler.json
git commit -m "chore(infra): slow allegro cron from 3min to 10min intervals"
```

---

### Task 2: Aktualizacja stałych night-thinning w index.ts

**Files:**
- Modify: `apps/api/src/index.ts`

Obecne wartości (znajdź po nazwie stałej):
```ts
const NIGHT_THINNING_START_HOUR = 0
const NIGHT_THINNING_END_HOUR = 6
const NIGHT_SYNC_INTERVAL_MINUTES = 15
```

- [ ] **Krok 1: Zaktualizuj stałe**

Zamień na:
```ts
const NIGHT_THINNING_START_HOUR = 22
const NIGHT_THINNING_END_HOUR = 7
const NIGHT_SYNC_INTERVAL_MINUTES = 60
```

- [ ] **Krok 2: Napraw logikę isPolandNightHour (midnight crossing)**

Znajdź funkcję:
```ts
function isPolandNightHour(hour: number): boolean {
  return hour >= NIGHT_THINNING_START_HOUR && hour < NIGHT_THINNING_END_HOUR
}
```

Zamień na:
```ts
function isPolandNightHour(hour: number): boolean {
  // Range crosses midnight (22:00–07:00), so OR instead of AND
  return hour >= NIGHT_THINNING_START_HOUR || hour < NIGHT_THINNING_END_HOUR
}
```

**Dlaczego:** `&&` działa dla zakresu w obrębie jednej doby (np. 0–6). Dla zakresu przekraczającego północ (22–7) — `hour >= 22 && hour < 7` jest zawsze `false` dla każdej liczby całkowitej. `||` poprawnie pokrywa godziny 22, 23, 0, 1, 2, 3, 4, 5, 6.

- [ ] **Krok 3: Zaktualizuj cron match string w scheduled handlerze**

Znajdź:
```ts
if (event.cron === '*/3 * * * *') {
```

Zamień na:
```ts
if (event.cron === '*/10 * * * *') {
```

- [ ] **Krok 4: Zaktualizuj log message night thinning**

Znajdź:
```ts
console.log(`[Cron] Poland night thinning (${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}) — skip 3-min cycle`)
```

Zamień na:
```ts
console.log(`[Cron] Poland night thinning (${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}) — skip 10-min cycle`)
```

- [ ] **Krok 5: Zaktualizuj komentarz w scheduled handlerze**

Znajdź:
```ts
// "*/3 * * * *" — every 3 min Allegro order polling; in Poland night (00:00-05:59) thinned to every 15 min
```

Zamień na:
```ts
// "*/10 * * * *" — every 10 min Allegro order polling; in Poland night (22:00-06:59) thinned to every 60 min
```

- [ ] **Krok 6: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: brak błędów (puste wyjście lub tylko ostrzeżenia, zero `error TS`)

- [ ] **Krok 7: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "fix(infra): expand night thinning to 22:00-07:00 with 60min interval, fix midnight crossing"
```

---

### Task 3: Guard Allegro-disconnected w scheduled handlerze

**Files:**
- Modify: `apps/api/src/index.ts`

Gdy Allegro jest rozłączone (KV status `connected: false`), pominięcie 4 funkcji cron oszczędza 4–8 KV reads + potencjalne DB fallbacki.

- [ ] **Krok 1: Dodaj guard na początku bloku cron `*/10`**

Znajdź w `scheduled` handlerze blok:
```ts
if (event.cron === '*/10 * * * *') {
  const { hour, minute } = getPolandClock()
  if (isPolandNightHour(hour) && minute % NIGHT_SYNC_INTERVAL_MINUTES !== 0) {
    console.log(`[Cron] Poland night thinning ...`)
    return
  }

  ctx.waitUntil(syncAllegroOrders(env))
```

Zamień na:
```ts
if (event.cron === '*/10 * * * *') {
  const { hour, minute } = getPolandClock()
  if (isPolandNightHour(hour) && minute % NIGHT_SYNC_INTERVAL_MINUTES !== 0) {
    console.log(`[Cron] Poland night thinning (${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}) — skip 10-min cycle`)
    return
  }

  // Guard: skip all sync if Allegro is known-disconnected (saves KV reads + potential DB fallbacks)
  if (env.ALLEGRO_KV) {
    const allegroStatus = await env.ALLEGRO_KV.get<{ connected: boolean }>(KV_KEYS.STATUS, 'json')
    if (allegroStatus?.connected === false) {
      console.log('[Cron] Allegro disconnected (KV status) — skip sync')
      return
    }
  }

  ctx.waitUntil(syncAllegroOrders(env))
```

**Uwaga:** `KV_KEYS.STATUS` jest już importowany z `'./lib/allegro'` — nie trzeba nic dodawać do importów.

- [ ] **Krok 2: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: brak błędów

- [ ] **Krok 3: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "fix(allegro): skip cron sync when Allegro known-disconnected via KV status"
```

---

### Task 4: Deploy i weryfikacja

- [ ] **Krok 1: Zbuduj i deployuj API**

```bash
cd apps/api && wrangler deploy
```

Oczekiwane: `Deployed il-buon-caffe-api ... (xx KB)` bez błędów

- [ ] **Krok 2: Sprawdź cron triggers w Cloudflare dashboard**

Wejdź w CF Dashboard → Workers → `il-buon-caffe-api` → Triggers → Cron Triggers. Powinien być trigger `*/10 * * * *` (nie `*/3`).

- [ ] **Krok 3: Sprawdź logi po 10 minutach**

```bash
wrangler tail il-buon-caffe-api --format json 2>/dev/null | grep -E "Cron|AllegroOrders|night"
```

Oczekiwane logi w dzień (07:00–22:00):
- `[AllegroOrders] Sync zakończony` lub `[AllegroOrders] Brak ...` — co 10 min

Oczekiwane logi w nocy (22:00–07:00):
- `[Cron] Poland night thinning ... — skip 10-min cycle` — dla runs na :10, :20, :30, :40, :50
- Tylko run na :00 wywołuje faktyczny sync

- [ ] **Krok 4: Sprawdź wykres Neon Rows po 24h**

W Neon Console → projekt → monitoring → Rows Read/Written. Porównaj z poprzednią dobą — powinien być wyraźny spadek regularnych spikeów.

---

## Oczekiwane rezultaty

| Metryka | Przed | Po |
|---|---|---|
| Cykli pollingu/dobę | ~372 | ~99 |
| Neon wake-upy/dobę (przy brak eventów) | ~372 | ~99 |
| Neon wake-upy/dobę (przy aktywnych zamówieniach) | każdy cykl z eventem | każdy cykl z eventem (ale ~99 max) |
| Opóźnienie nowego zamówienia Allegro | maks. 3 min | maks. 10 min |
| Opóźnienie nocne | maks. 15 min | maks. 60 min |
