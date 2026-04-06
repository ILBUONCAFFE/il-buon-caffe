# Konfiguracja Auth — KV, JWT, Admin

> Przewodnik krok po kroku do uruchomienia systemu autentykacji.

---

## Spis treści

1. [Cloudflare KV — Dashboard](#1-cloudflare-kv--dashboard)
2. [Wrangler — powiązanie KV z Workerem](#2-wrangler--powiązanie-kv-z-workerem)
3. [JWT Secret](#3-jwt-secret)
4. [Zmienne środowiskowe](#4-zmienne-środowiskowe)
5. [Tworzenie konta admina](#5-tworzenie-konta-admina)
6. [Testowanie lokalne](#6-testowanie-lokalne)
7. [Checklist produkcyjny](#7-checklist-produkcyjny)

---

## 1. Cloudflare KV — Dashboard

KV jest potrzebne do **rate limitingu** (blokowanie brute-force na login/register).
Bez KV kod automatycznie przechodzi na in-memory fallback (działa lokalnie, ale NIE w produkcji na Workers — bo Workers są stateless).

### Krok po kroku w Cloudflare Dashboard:

1. **Zaloguj się** → [dash.cloudflare.com](https://dash.cloudflare.com)

2. **Przejdź do KV**:
   - Menu boczne → **Workers & Pages**
   - W podmenu → **KV**
   - Lub bezpośredni URL: `https://dash.cloudflare.com/<ACCOUNT_ID>/workers/kv/namespaces`

3. **Utwórz namespace**:
   - Kliknij **"Create a namespace"**
   - Nazwa: `AUTH_RATE_LIMIT`
   - Kliknij **"Add"**
   - ⚠️ Zapisz sobie **Namespace ID** — będzie potrzebne w wrangler.json

4. **Utwórz drugi namespace dla preview/dev** (opcjonalnie, ale zalecane):
   - Kliknij **"Create a namespace"**
   - Nazwa: `AUTH_RATE_LIMIT_DEV`
   - Kliknij **"Add"**
   - Zapisz **Namespace ID**

5. **Weryfikacja**:
   - Na liście powinny być widoczne oba namespace'y
   - Kliknij w `AUTH_RATE_LIMIT` → zakładka **"Keys"** powinna być pusta (potem wypełni się automatycznie z IP adresami)

### Jak KV wygląda w praktyce:

Po uruchomieniu, KV będzie przechowywać rekordy takie jak:
```
Key: ratelimit:login:185.234.72.50
Value: {"attempts":3,"firstAttempt":1771959969502}
TTL: 960 sekund (15 min + 60s buffer)
```

Po zablokowaniu użytkownika:
```
Key: ratelimit:login:185.234.72.50
Value: {"attempts":6,"firstAttempt":1771959969502,"blockedUntil":1771963569502}
TTL: 3660 sekund (1 godzina + 60s buffer)
```

---

## 2. Wrangler — powiązanie KV z Workerem

### 2a. API Worker (Hono) — `apps/api/wrangler.json`

Utwórz plik `apps/api/wrangler.json`:

```json
{
  "name": "il-buon-caffe-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-09-23",
  "observability": {
    "enabled": true
  },
  "kv_namespaces": [
    {
      "binding": "AUTH_RATE_LIMIT",
      "id": "<WKLEJ_NAMESPACE_ID_Z_DASHBOARDU>",
      "preview_id": "<WKLEJ_NAMESPACE_ID_DEV>"
    }
  ],
  "vars": {
    "NODE_ENV": "production"
  }
}
```

> ⚠️ **WAŻNE:** Zamień `<WKLEJ_NAMESPACE_ID_Z_DASHBOARDU>` na ID skopiowane z dashboardu w kroku 3.
> `preview_id` to namespace używany przy `wrangler dev` (tryb lokalny).

### 2b. Web (Next.js on CF Pages) — `wrangler.json` (root)

Aktualny root `wrangler.json` to konfiguracja dla CF Pages (Next.js).
**Web nie potrzebuje KV** — rate limiting dla Server Actions jest in-memory (jedna instancja)
lub docelowo przez wywołanie API Workera.

### 2c. Weryfikacja bindingu

Po dodaniu do wrangler.json, sprawdź czy Worker widzi KV:

```bash
cd apps/api
npx wrangler dev
```

W logach powinno pojawić się:
```
Your worker has access to the following bindings:
- KV Namespaces:
  - AUTH_RATE_LIMIT: <namespace-id>
```

---

## 3. JWT Secret

### Generowanie:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Wygeneruje 128-znakowy hex string, np.:
```
a3f8b2c1d4e5f6...128 znaków...
```

### Potrzebujesz DWÓCH secretów:

| Secret | Gdzie | Do czego |
|--------|-------|----------|
| `JWT_ACCESS_SECRET` | API Worker | Access tokeny (15 min) |
| `JWT_REFRESH_SECRET` | API Worker | Refresh tokeny (7 dni) |
| `ADMIN_JWT_SECRET` | Web (Next.js) | Sesje admina (Server Actions) |

Wygeneruj osobny secret dla każdego:
```bash
# Access
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Refresh
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Admin
node -e "console.log('ADMIN_JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### Wgranie do Cloudflare (produkcja):

**Dla API Workera:**
```bash
cd apps/api
npx wrangler secret put JWT_ACCESS_SECRET
# Wklej wygenerowany secret i Enter

npx wrangler secret put JWT_REFRESH_SECRET
# Wklej wygenerowany secret i Enter

npx wrangler secret put DATABASE_URL
# Wklej connection string do Neon i Enter
```

**Dla Web (CF Pages)** — w Dashboard:
1. **Workers & Pages** → wybierz projekt `il-buon-caffe`
2. **Settings** → **Environment variables**
3. Dodaj:
   - `ADMIN_JWT_SECRET` = wygenerowany secret
   - `DATABASE_URL` = connection string Neon

---

## 4. Zmienne środowiskowe

### Lokalne (.env)

Plik `apps/web/.env` (NIE commituj!):

```env
# Database
DATABASE_URL=postgresql://...@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Auth
ADMIN_JWT_SECRET=wygenerowany_secret_128_znaków

# App
NEXT_PUBLIC_API_URL=http://localhost:8787
NODE_ENV=development
```

Plik `apps/api/.dev.vars` (konwencja Wrangler, NIE commituj!):

```env
DATABASE_URL=postgresql://...@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=wygenerowany_secret
JWT_REFRESH_SECRET=wygenerowany_secret
NODE_ENV=development
```

### Sprawdź .gitignore:

```bash
# Powinny tam być:
.env
.env.local
.dev.vars
*.vars
```

---

## 5. Tworzenie konta admina

Po skonfigurowaniu env:

```bash
cd apps/web
npx tsx scripts/create-admin.ts
```

Skrypt zapyta o:
- Email (np. `kontakt@ilbuoncaffe.pl`)
- Hasło (min. 10 znaków, wielka litera + cyfra)
- Imię i nazwisko

Sprawdzi:
- ✅ Połączenie z bazą
- ✅ Siła hasła
- ✅ Unikalność emaila
- ✅ Hashowanie bcrypt (12 rounds)

---

## 6. Testowanie lokalne

### 6a. Uruchom dev:

```bash
# Terminal 1 — Web
cd apps/web
npm run dev
# → http://localhost:3000

# Terminal 2 — API (opcjonalnie)
cd apps/api
npx wrangler dev
# → http://localhost:8787
```

### 6b. Test logowania admina:

1. Otwórz `http://localhost:3000/admin/login`
2. Wpisz email i hasło z kroku 5
3. Powinieneś zostać przekierowany do `/admin`
4. Cookie `admin_session` powinno się pojawić (DevTools → Application → Cookies)

### 6c. Test rate limitingu:

```bash
# Wyślij 6 requestów (limit = 5)
for i in {1..6}; do
  curl -X POST http://localhost:8787/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"kontakt@ilbuoncaffe.pl","password":"wrong"}' \
    -w "\nHTTP: %{http_code}\n"
done
# Request 6 powinien zwrócić HTTP 429
```

### 6d. Test KV lokalnie:

Wrangler dev automatycznie symuluje KV lokalnie (persisted w `.wrangler/state/`).
Dane rate limitingu są widoczne w:
```
apps/api/.wrangler/state/kv/AUTH_RATE_LIMIT/
```

---

## 7. Checklist produkcyjny

### Przed deployem:

- [ ] KV namespace `AUTH_RATE_LIMIT` utworzony w CF Dashboard
- [ ] `apps/api/wrangler.json` ma `kv_namespaces` z poprawnym ID
- [ ] `JWT_ACCESS_SECRET` wgrany przez `wrangler secret put`
- [ ] `JWT_REFRESH_SECRET` wgrany przez `wrangler secret put`
- [ ] `DATABASE_URL` wgrany przez `wrangler secret put`
- [ ] `ADMIN_JWT_SECRET` ustawiony w CF Pages env vars
- [ ] `DATABASE_URL` ustawiony w CF Pages env vars
- [ ] Konto admina utworzone w produkcyjnej bazie
- [ ] `.env` i `.dev.vars` w `.gitignore`
- [ ] Rate limiting middleware podpięty w `apps/api/src/index.ts`
- [ ] Security headers middleware podpięty w `apps/api/src/index.ts`

### Po deployu:

- [ ] `https://api.ilbuoncaffe.pl/health` zwraca `{"status":"ok"}`
- [ ] Login admina działa na produkcji
- [ ] KV → w Dashboard widać klucze rate limitingu po próbach logowania
- [ ] Cookie `admin_session` ma flagi: `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] 6+ prób logowania → HTTP 429

---

## Schemat przepływu

```
Klient → Cloudflare CDN
  ↓
  → CF Pages (Next.js)
      ↓ Server Action
      → JWT verify (jose / ADMIN_JWT_SECRET)
      → Drizzle → Neon DB

  → CF Worker (Hono API)
      ↓ Request
      → Rate Limit middleware (KV: AUTH_RATE_LIMIT)
      → Auth middleware (JWT verify)
      → Route handler
      → Drizzle → Neon DB
```
