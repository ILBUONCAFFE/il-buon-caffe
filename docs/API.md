# 📡 Il Buon Caffe — API Reference

> **Base URL:** `https://api.ilbuoncaffe.pl`  
> **Wersja:** 3.0  
> **Runtime:** Cloudflare Workers (Hono)  
> **Baza danych:** Neon PostgreSQL (Drizzle ORM)  
> **Format:** JSON  
> **Encoding:** UTF-8

---

## Konwencje dokumentu

| Symbol | Znaczenie |
|--------|-----------|
| ✅ | Zaimplementowane i działające |
| 🚧 | Zaplanowane — schemat DB gotowy, endpoint do napisania |
| 🔒 | Wymaga uwierzytelnienia (JWT) |
| 🛡️ | Wymaga roli `admin` |
| ⚡ | Rate-limited |

---

## 📋 Spis Treści

1. [Architektura & Runtime](#-architektura--runtime)
2. [Uwierzytelnianie (Unified JWT)](#-uwierzytelnianie-unified-jwt)
3. [Auth — Endpointy ✅](#-auth--endpointy-)
4. [Produkty 🚧](#-produkty-)
5. [Kategorie 🚧](#-kategorie-)
6. [Zamówienia 🚧](#-zamówienia-)
7. [Płatności — Przelewy24 🚧](#-płatności--przelewy24-)
8. [RODO / GDPR 🚧](#-rodo--gdpr-)
9. [Admin 🚧](#-admin-)
10. [Allegro Integration 🚧](#-allegro-integration-)
11. [Webhooks 🚧](#-webhooks-)
12. [Health Check ✅](#-health-check-)
13. [Bezpieczeństwo](#-bezpieczeństwo)
14. [Rate Limiting](#-rate-limiting)
15. [Kody Błędów](#-kody-błędów)
16. [Zmienne Środowiskowe](#-zmienne-środowiskowe)

---

## 🏗️ Architektura & Runtime

```
Klient  ─────►  Cloudflare Workers (Hono)
                    │
                    ├── /api/auth/*     ✅ Zaimplementowane
                    ├── /api/products/* 🚧
                    ├── /api/orders/*   🚧
                    ├── /api/user/*     🚧 (RODO)
                    ├── /admin/*        🚧
                    └── /health         ✅
                    │
                    ▼
              Neon PostgreSQL (Drizzle ORM)
              Cloudflare KV (rate limiting, cache)
              Cloudflare R2 (obrazy produktów)
```

**Kluczowe decyzje:**

| Decyzja | Opis |
|---------|------|
| **Model Flat** | Każdy SKU = osobny produkt (bez wariantów). Allegro mapowanie 1:1. |
| **Unified JWT** | Jeden mechanizm auth dla `customer` i `admin` — brak API Keys. |
| **httpOnly Cookies** | Tokeny przechowywane w Secure httpOnly cookies (primary), Bearer header jako fallback. |
| **RODO-First** | Compliance przed pierwszym zamówieniem (zgody, audit log, eksport, anonimizacja). |

---

## 🔐 Uwierzytelnianie (Unified JWT)

### Mechanizm dostarczania tokena

API akceptuje token dostępu z **dwóch źródeł** (w kolejności priorytetu):

| Priorytet | Źródło | Opis |
|-----------|--------|------|
| 1 | `Authorization: Bearer <token>` | Header HTTP — dla klientów API, Postman, integracji |
| 2 | Cookie `access_token` (httpOnly) | Ustawiany automatycznie przez `/api/auth/login` |

> **Domyślny flow:** Przeglądarka używa cookies (ustawianych automatycznie). Dla integracji zewnętrznych — Bearer header.

### Ciasteczka (Cookies)

Po zalogowaniu serwer ustawia dwa ciasteczka:

| Cookie | Typ | HttpOnly | Secure | SameSite | Max-Age |
|--------|-----|----------|--------|----------|---------|
| `access_token` | JWT (HS256) | ✅ | ✅ (prod) | Strict | 2h (domyślnie) / 24h (`rememberMe`) |
| `refresh_token` | JWT (HS256) | ✅ | ✅ (prod) | Strict | 7 dni |

### JWT Payload — Access Token

```json
{
  "sub": "123",
  "email": "kontakt@ilbuoncaffe.pl",
  "role": "customer",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1706540000,
  "exp": 1706547200
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `sub` | string | ID użytkownika (stringified integer) |
| `email` | string | Adres email |
| `role` | `"customer"` \| `"admin"` | Rola w systemie |
| `sessionId` | UUID | Powiązanie z rekordem w tabeli `sessions` |

### JWT Payload — Refresh Token (minimalny)

```json
{
  "sub": "123",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1706540000,
  "exp": 1707144800
}
```

### Czas życia tokenów

| Token | Domyślny | Z `rememberMe: true` |
|-------|----------|----------------------|
| Access (customer) | 24h | 24h |
| Access (admin) | 2h | 24h |
| Refresh | 7 dni | 7 dni |

### Token Rotation & Reuse Detection

System implementuje **rotację refresh tokenów** z **detekcją ponownego użycia**:

1. Każdy `POST /api/auth/refresh` generuje **nową parę** tokenów i dezaktywuje starą sesję
2. Jeśli ktoś użyje **już dezaktywowanego** refresh tokena → **ATAK WYKRYTY**:
   - Wszystkie sesje użytkownika zostają unieważnione
   - Zdarzenie logowane w audit log
   - Odpowiedź: `401 "Wykryto podejrzaną aktywność"`

---

## 🔑 Auth — Endpointy ✅

> Wszystkie endpointy auth są zaimplementowane i działające.  
> Prefix: `/api/auth`

### `POST /api/auth/register` ⚡

Rejestracja nowego użytkownika z wymaganymi zgodami RODO.

**Rate Limit:** 3 rejestracje / godzina / IP

**Request:**

```json
{
  "email": "kontakt@ilbuoncaffe.pl",
  "password": "SecurePass123!",
  "name": "Anna Nowak",
  "consents": {
    "terms": true,
    "privacy": true,
    "marketing": false,
    "analytics": true
  }
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `email` | string | ✅ | Walidowany regex, konwertowany do lowercase |
| `password` | string | ✅ | Musi spełniać wymagania siły hasła |
| `name` | string | ❌ | Nazwa wyświetlana |
| `consents.terms` | boolean | ✅ | Akceptacja regulaminu |
| `consents.privacy` | boolean | ✅ | Akceptacja polityki prywatności |
| `consents.marketing` | boolean | ❌ | Zgoda na newsletter/marketing |
| `consents.analytics` | boolean | ❌ | Zgoda na cookies analityczne |

**Walidacja hasła:**
- Minimum 8 znaków
- Co najmniej 1 wielka litera
- Co najmniej 1 cyfra
- Co najmniej 1 znak specjalny

**Response `201 Created`:**

```json
{
  "success": true,
  "requiresEmailVerification": true,
  "message": "Sprawdź swoją skrzynkę email, aby zweryfikować konto"
}
```

> ⚠️ **Rejestracja NIE zwraca tokenów.** Użytkownik musi najpierw zweryfikować email.

**Błędy:**

| Status | Warunek |
|--------|---------|
| `400` | Nieprawidłowy email, słabe hasło, brak wymaganych zgód |
| `409` | Email już zarejestrowany |
| `429` | Rate limit (3/h) |

---

### `POST /api/auth/login` ⚡

Logowanie — unified dla `customer` i `admin`.

**Rate Limit:** 5 prób / 15 minut / IP

**Request:**

```json
{
  "email": "kontakt@ilbuoncaffe.pl",
  "password": "SecurePass123!",
  "rememberMe": false
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `email` | string | ✅ | |
| `password` | string | ✅ | |
| `rememberMe` | boolean | ❌ | Domyślnie `false`. Jeśli `true` → access token 24h zamiast 2h |

**Zabezpieczenia logowania:**

| Mechanizm | Opis |
|-----------|------|
| Lockout | Po 5 nieudanych próbach → blokada konta na 1 godzinę |
| Weryfikacja email | Logowanie zablokowane jeśli `emailVerified = false` |
| Wersjonowanie zgód | System sprawdza czy użytkownik zaakceptował aktualny regulamin |

**Response `200 OK`:**

Serwer ustawia cookies `access_token` + `refresh_token` i zwraca:

```json
{
  "user": {
    "id": 1,
    "email": "kontakt@ilbuoncaffe.pl",
    "name": "Anna Nowak",
    "role": "customer"
  },
  "requiresNewConsent": false
}
```

> Jeśli `requiresNewConsent: true` → frontend powinien wymusić ponowną akceptację regulaminu.

**Błędy:**

| Status | Warunek |
|--------|---------|
| `400` | Brak email lub hasła |
| `401` | Nieprawidłowy email lub hasło |
| `403` | Konto zablokowane (lockout) — zwraca pole `lockedUntil` |
| `403` | Email niezweryfikowany — zwraca `requiresEmailVerification: true` |
| `429` | Rate limit (5/15min) |

---

### `POST /api/auth/refresh`

Odświeżenie tokena z rotacją. Token refresh pobierany z cookie `refresh_token`.

**Request:** Brak body — refresh token pochodzi z httpOnly cookie.

**Response `200 OK`:**

Serwer ustawia nowe cookies i zwraca:

```json
{
  "success": true
}
```

**Błędy:**

| Status | Warunek |
|--------|---------|
| `401` | Brak refresh tokena w cookie |
| `401` | Token nieprawidłowy lub wygasły |
| `401` | **Token reuse detected** — wszystkie sesje unieważnione (atak!) |

---

### `POST /api/auth/logout`

Wylogowanie — dezaktywuje bieżącą sesję i czyści cookies.

**Response `200 OK`:**

```json
{
  "success": true
}
```

> Zawsze zwraca `200` — nawet jeśli token był już nieważny (graceful logout).

---

### `POST /api/auth/logout-all`

Wylogowanie ze **wszystkich urządzeń** — dezaktywuje wszystkie sesje użytkownika.

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Wylogowano ze wszystkich urządzeń"
}
```

---

### `POST /api/auth/verify-email`

Weryfikacja adresu email za pomocą tokena wysłanego na pocztę.

**Request:**

```json
{
  "token": "abc123def456..."
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Email został zweryfikowany. Możesz się teraz zalogować."
}
```

**Tokeny weryfikacyjne:**
- Ważność: **6 godzin**
- Jednorazowe (po użyciu nie można ponownie)
- Haszowane w bazie (SHA-256)

**Błędy:**

| Status | Warunek |
|--------|---------|
| `400` | Brak tokena, token nieprawidłowy, wygasły, lub już użyty |

---

### `POST /api/auth/forgot-password` ⚡

Żądanie resetu hasła. Wysyła email z linkiem resetowania.

**Rate Limit:** 3 żądania / godzina / email

**Request:**

```json
{
  "email": "kontakt@ilbuoncaffe.pl"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Jeśli podany email istnieje w naszym systemie, wyślemy link do resetowania hasła."
}
```

> ⚠️ **Bezpieczeństwo:** Odpowiedź jest **zawsze** taka sama — nie ujawnia czy email istnieje w systemie.

**Token resetowania:** ważność **15 minut**, jednorazowy, haszowany w bazie.

---

### `POST /api/auth/reset-password`

Zmiana hasła za pomocą tokena z emaila.

**Request:**

```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecurePass123!"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Hasło zostało zmienione. Zaloguj się używając nowego hasła."
}
```

**Efekty uboczne:**
- Resetuje `failedLoginAttempts` do 0
- Usuwa lockout
- **Unieważnia** wszystkie aktywne sesje (wymusza re-login na wszystkich urządzeniach)
- Tworzy wpis w audit log

---

### `POST /api/auth/resend-verification` ⚡

Ponowne wysłanie emaila weryfikacyjnego.

**Request:**

```json
{
  "email": "kontakt@ilbuoncaffe.pl"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Jeśli konto wymaga weryfikacji, wysłaliśmy nowy email."
}
```

> ⚠️ **Bezpieczeństwo:** Odpowiedź nie ujawnia czy email istnieje ani czy jest już zweryfikowany.

---

### `GET /api/auth/me` 🔒

Pobierz dane aktualnie zalogowanego użytkownika.

**Response `200 OK`:**

```json
{
  "user": {
    "id": 1,
    "email": "kontakt@ilbuoncaffe.pl",
    "name": "Anna Nowak",
    "role": "customer",
    "emailVerified": true
  }
}
```

---

## 📦 Produkty 🚧

> **Status:** Schemat DB gotowy, endpoint do zaimplementowania.  
> **Model:** Flat — każdy SKU to osobny produkt (bez wariantów).  
> **Prefix planowany:** `/api/products`

### Schemat bazy — tabela `products`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `sku` | varchar(50) | **Primary Key** — np. `ETH-YRG-250` |
| `slug` | varchar(255) | URL-friendly, unique |
| `name` | varchar(255) | Nazwa produktu |
| `description` | text | Krótki opis |
| `longDescription` | text | Rozszerzony opis (HTML/MD) |
| `categoryId` | FK → categories.id | Kategoria |
| `price` | decimal(10,2) | Cena aktualna |
| `compareAtPrice` | decimal(10,2) | Cena przed promocją (nullable) |
| `stock` | integer | Dostępna ilość |
| `reserved` | integer | Zarezerwowane (w koszykach) |
| `imageUrl` | varchar(500) | Główny obraz |
| `origin` | varchar(255) | Pochodzenie (np. "Etiopia, Region Gedeo") |
| `year` | varchar(10) | Rocznik |
| `weight` | integer | Waga w gramach |
| `isActive` | boolean | Widoczny w sklepie |
| `isNew` | boolean | Badge "Nowość" |
| `isFeatured` | boolean | Wyróżniony |
| `allegroOfferId` | varchar(50) | Mapowanie 1:1 z Allegro (nullable, unique) |

### Planowane endpointy

#### `GET /api/products`

Lista produktów z filtrowaniem i paginacją.

**Query Parameters:**

| Parametr | Typ | Domyślnie | Opis |
|----------|-----|-----------|------|
| `category` | string | — | Filtr po slug kategorii |
| `page` | number | 1 | Numer strony |
| `limit` | number | 20 | Produktów na stronę (max 100) |
| `sort` | string | `newest` | `price-asc`, `price-desc`, `name`, `newest` |
| `inStock` | boolean | — | Tylko produkty z `stock > 0` |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "sku": "ETH-YRG-250",
      "slug": "etiopia-yirgacheffe-250g",
      "name": "Etiopia Yirgacheffe 250g",
      "description": "Ziarnista kawa specialty o nutach jaśminu i bergamotki.",
      "price": 65.00,
      "compareAtPrice": null,
      "stock": 15,
      "imageUrl": "https://r2.ilbuoncaffe.pl/products/eth-yrg-250.webp",
      "category": {
        "id": 1,
        "name": "Kawa",
        "slug": "kawa"
      },
      "origin": "Etiopia, Region Gedeo",
      "year": "2024",
      "isNew": true
    }
  ],
  "meta": {
    "total": 200,
    "page": 1,
    "limit": 20,
    "totalPages": 10
  }
}
```

#### `GET /api/products/:slug`

Szczegóły produktu z obrazami.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "sku": "ETH-YRG-250",
    "slug": "etiopia-yirgacheffe-250g",
    "name": "Etiopia Yirgacheffe 250g",
    "description": "Ziarnista kawa specialty...",
    "longDescription": "<p>Kawa z regionu Gedeo...</p>",
    "price": 65.00,
    "compareAtPrice": 75.00,
    "stock": 15,
    "category": {
      "id": 1,
      "name": "Kawa",
      "slug": "kawa"
    },
    "images": [
      {
        "id": 1,
        "url": "https://r2.ilbuoncaffe.pl/products/eth-yrg-1.webp",
        "altText": "Etiopia Yirgacheffe - opakowanie",
        "sortOrder": 0,
        "isPrimary": true
      }
    ],
    "origin": "Etiopia, Region Gedeo",
    "year": "2024",
    "weight": 250,
    "isNew": true,
    "isFeatured": false
  }
}
```

---

## 📂 Kategorie 🚧

> **Status:** Schemat DB gotowy, endpoint do zaimplementowania.  
> **Prefix planowany:** `/api/categories`

### Schemat bazy — tabela `categories`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | serial | Primary Key |
| `name` | varchar(255) | Nazwa kategorii |
| `slug` | varchar(255) | URL-friendly, unique |
| `description` | text | Opis |
| `layoutConfig` | jsonb | Konfiguracja layoutu (grid/hero/masonry) |
| `imageUrl` | varchar(500) | Obraz kategorii |
| `isActive` | boolean | Widoczna |
| `sortOrder` | integer | Kolejność wyświetlania |

### `layoutConfig` — struktura JSON

```json
{
  "type": "hero-list",
  "hero": {
    "enabled": true,
    "title": "Świat Kawy",
    "subtitle": "Najlepsze ziarna",
    "imageUrl": "...",
    "height": "half"
  },
  "grid": {
    "columns": 3,
    "gap": "md",
    "cardStyle": "hover-zoom"
  },
  "colors": {
    "background": "#f5f0eb",
    "accent": "#8B4513"
  },
  "filters": {
    "enabled": true,
    "position": "sidebar",
    "options": ["price", "origin", "year"]
  }
}
```

### Planowane endpointy

#### `GET /api/categories`

Lista kategorii z liczbą produktów.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Kawa",
      "slug": "kawa",
      "description": "Wyselekcjonowane ziarna z najlepszych plantacji.",
      "imageUrl": "https://r2.ilbuoncaffe.pl/categories/kawa.webp",
      "productCount": 45,
      "layoutConfig": { "..." },
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

---

## 🛒 Zamówienia 🚧

> **Status:** Schemat DB gotowy, endpoint do zaimplementowania.  
> **Model:** Unified — zamówienia ze sklepu i z Allegro w jednej tabeli.  
> **Prefix planowany:** `/api/orders`

### Schemat bazy — tabela `orders`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | serial | Primary Key |
| `orderNumber` | varchar(50) | Format: `IBC-YYYY-NNNNN`, unique |
| `userId` | FK → users.id | Nullable (Allegro/guest) |
| `customerData` | jsonb | `{ email, name, phone, shippingAddress, billingAddress }` |
| `status` | enum | `pending` → `paid` → `processing` → `shipped` → `delivered` \| `cancelled` |
| `source` | enum | `shop` \| `allegro` |
| `externalId` | varchar(100) | Allegro order ID (nullable) |
| `subtotal` | decimal(10,2) | Suma pozycji |
| `shippingCost` | decimal(10,2) | Koszt wysyłki |
| `total` | decimal(10,2) | Łączna kwota |
| `paymentMethod` | varchar(50) | `card` / `blik` / `transfer` |
| `p24SessionId` | varchar(255) | Przelewy24 session ID |
| `p24OrderId` | varchar(255) | P24 order ID (z webhook) |
| `paidAt` | timestamp | Data opłacenia |
| `shippingMethod` | varchar(50) | Metoda wysyłki |
| `trackingNumber` | varchar(100) | Numer śledzenia |
| `shippedAt` | timestamp | Data wysłania |
| `idempotencyKey` | varchar(100) | Ochrona przed double-submit, unique |
| `notes` | text | Notatki klienta |
| `internalNotes` | text | Notatki admina (niewidoczne dla klienta) |
| `reservationExpiresAt` | timestamp | Wygaśnięcie rezerwacji stocku |

### Flow statusów zamówienia

```
                    ┌──────────────┐
                    │   pending    │ ← Zamówienie złożone, stock zarezerwowany
                    └──────┬───────┘
                           │ Płatność potwierdzona
                    ┌──────▼───────┐
                    │     paid     │ ← Opłacone (webhook P24 lub Allegro)
                    └──────┬───────┘
                           │ Admin rozpoczyna realizację
                    ┌──────▼───────┐
                    │  processing  │ ← W przygotowaniu
                    └──────┬───────┘
                           │ Paczka nadana
                    ┌──────▼───────┐
                    │   shipped    │ ← Wysłane (tracking number)
                    └──────┬───────┘
                           │ Dostarczono
                    ┌──────▼───────┐
                    │  delivered   │ ← Zakończone
                    └──────────────┘

            W dowolnym momencie (przed shipped):
                    ┌──────────────┐
                    │  cancelled   │ ← Stock zwrócony
                    └──────────────┘
```

### Planowane endpointy

#### `POST /api/orders` 🔒

Składanie zamówienia z ochroną idempotencji.

**Headers:**

```http
Idempotency-Key: <uuid>    ← Wymagane, generowane przez frontend
```

**Request:**

```json
{
  "items": [
    { "sku": "ETH-YRG-250", "quantity": 2 },
    { "sku": "CHM-2015", "quantity": 1 }
  ],
  "shippingAddress": {
    "name": "Anna Nowak",
    "street": "ul. Słoneczna 15/4",
    "city": "Koszalin",
    "postalCode": "75-001",
    "country": "PL",
    "phone": "+48 664 937 937"
  },
  "paymentMethod": "card",
  "notes": "Proszę o dostawę po 17:00"
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "data": {
    "orderId": 123,
    "orderNumber": "IBC-2026-00123",
    "total": 450.00,
    "status": "pending",
    "reservationExpiresAt": "2026-01-29T20:00:00Z"
  }
}
```

**Error `409 Conflict` (Double Submit):**

```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Order already created with this idempotency key",
    "existingOrderId": 123
  }
}
```

#### `GET /api/orders` 🔒

Historia zamówień użytkownika.

| Parametr | Typ | Opis |
|----------|-----|------|
| `page` | number | Strona |
| `limit` | number | Max 50 |
| `status` | string | Filtr po statusie |

#### `GET /api/orders/:id` 🔒

Szczegóły zamówienia (tylko własne zamówienia).

---

## 💳 Płatności — Przelewy24 🚧

> **Status:** Schemat DB gotowy (pola `p24SessionId`, `p24OrderId`, `paidAt` w orders), endpoint do zaimplementowania.  
> **Prefix planowany:** `/api/payments/p24`

### Flow płatności

```
1. POST /api/orders              → status: "pending", stock zarezerwowany
2. POST /api/payments/p24/initiate → otrzymanie redirectUrl
3. Redirect → secure.przelewy24.pl     → klient płaci
4. P24 → POST /api/webhooks/przelewy24 → weryfikacja CRC + status → "paid"
5. P24 → Redirect na returnUrl         → frontend pokazuje potwierdzenie
```

### Planowane endpointy

#### `POST /api/payments/p24/initiate` 🔒

```json
// Request
{
  "orderId": 123,
  "returnUrl": "https://ilbuoncaffe.pl/order/confirmation",
  "language": "pl"
}

// Response
{
  "success": true,
  "data": {
    "sessionId": "xxx-yyy-zzz",
    "redirectUrl": "https://secure.przelewy24.pl/trnRequest/xxx",
    "expiresAt": "2026-01-29T20:15:00Z"
  }
}
```

#### `POST /api/payments/p24/return`

Return URL wywoływany po powrocie klienta z P24.

```json
{
  "success": true,
  "data": {
    "orderId": 123,
    "status": "paid",
    "verified": true
  }
}
```

#### `GET /api/payments/p24/status/:orderId` 🔒

Fallback — sprawdzenie statusu płatności ręcznie.

---

## 🛡️ RODO / GDPR 🚧

> **Status:** Infrastruktura w schemacie DB (consents, audit log, legal docs, anonymization fields), endpointy do zaimplementowania.  
> **Prefix planowany:** `/api/user` (klient), `/admin/gdpr` (admin)

### Schemat bazy — tabele RODO

**`user_consents`** — Historia zgód (RODO Art. 7):

| Kolumna | Typ | Opis |
|---------|-----|------|
| `userId` | FK → users.id | |
| `consentType` | enum | `terms`, `privacy`, `marketing`, `analytics` |
| `granted` | boolean | Czy zgoda udzielona |
| `version` | varchar(20) | Wersja dokumentu prawnego |
| `ipAddress` | varchar(45) | IP przy udzielaniu zgody |
| `userAgent` | text | Przeglądarka |
| `createdAt` | timestamp | Kiedy udzielono/cofnięto |

**`audit_log`** — Dziennik audytu (RODO Art. 5 — rozliczalność):

| Kolumna | Typ | Opis |
|---------|-----|------|
| `adminId` | FK → users.id | Kto wykonał akcję |
| `action` | enum | `login`, `logout`, `view_customer`, `view_order`, `export_data`, `update_customer`, `anonymize_customer`, `admin_action` |
| `targetUserId` | FK → users.id | Czyje dane przeglądano |
| `targetOrderId` | integer | Które zamówienie |
| `details` | jsonb | Dodatkowe informacje |
| `ipAddress` | varchar(45) | |
| `createdAt` | timestamp | |

**`legal_documents`** — Wersjonowane dokumenty prawne:

| Kolumna | Typ | Opis |
|---------|-----|------|
| `type` | varchar(50) | `privacy_policy`, `terms`, `cookies` |
| `version` | varchar(20) | Numer wersji |
| `content` | text | HTML lub Markdown |
| `effectiveFrom` | timestamp | Od kiedy obowiązuje |

### Planowane endpointy klienta

#### `GET /api/user/consents` 🔒

Aktualny stan zgód użytkownika.

```json
{
  "success": true,
  "data": {
    "terms": { "granted": true, "version": "1.0", "grantedAt": "2026-01-15T10:00:00Z" },
    "privacy": { "granted": true, "version": "1.0", "grantedAt": "2026-01-15T10:00:00Z" },
    "marketing": { "granted": false },
    "analytics": { "granted": true, "version": "1.0", "grantedAt": "2026-01-15T10:00:00Z" }
  }
}
```

#### `POST /api/user/consents` 🔒

Aktualizacja zgód (np. włączenie newslettera).

```json
{ "marketing": true }
```

#### `DELETE /api/user/consents/:type` 🔒

Wycofanie zgody (RODO prawo do sprzeciwu). Np. `DELETE /api/user/consents/marketing`.

#### `GET /api/user/export` 🔒

Eksport danych użytkownika (RODO Art. 20 — prawo do przenoszenia).

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "kontakt@ilbuoncaffe.pl", "name": "Anna Nowak", "createdAt": "..." },
    "consents": [ "..." ],
    "orders": [ "..." ],
    "exportedAt": "2026-01-29T19:00:00Z",
    "format": "GDPR_EXPORT_V1"
  }
}
```

#### `POST /api/user/anonymize` 🔒

Żądanie anonimizacji konta (RODO Art. 17 — prawo do bycia zapomnianym).

> Zamówienia pozostają (wymagane przez prawo VAT), ale dane osobowe są anonimizowane.

```json
// Request
{
  "confirmEmail": "kontakt@ilbuoncaffe.pl",
  "reason": "Nie chcę już korzystać z serwisu"
}

// Response
{
  "success": true,
  "data": {
    "message": "Konto zostanie zanonimizowane w ciągu 30 dni",
    "anonymizationDate": "2026-02-28T00:00:00Z",
    "retainedData": ["orders (required by VAT law)"]
  }
}
```

### Planowane endpointy prawne (publiczne)

#### `GET /api/legal/:type`

Aktualny dokument prawny. `type`: `privacy-policy`, `terms`, `cookies`.

```json
{
  "success": true,
  "data": {
    "type": "privacy_policy",
    "version": "1.0",
    "effectiveFrom": "2026-01-01T00:00:00Z",
    "content": "<h1>Polityka Prywatności...</h1>",
    "contentType": "text/html"
  }
}
```

#### `GET /api/legal/:type/history`

Historia wersji dokumentu.

---

## 🛡️ Admin 🚧

> **Status:** Middleware gotowe (`requireAdmin`, `auditLogMiddleware`), endpointy do zaimplementowania.  
> **Autoryzacja:**  JWT z `role: "admin"`  
> **Prefix planowany:** `/admin`

### Middleware admin (zaimplementowane)

| Middleware | Plik | Opis |
|-----------|------|------|
| `requireAdmin()` | `middleware/auth.ts` | Wymaga JWT z `role: "admin"` |
| `auditLogMiddleware(action)` | `middleware/auditLog.ts` | Loguje dostęp admina do danych sensytywnych (RODO) |

### Planowane endpointy

#### Zamówienia (Unified View)

##### `GET /admin/orders` 🛡️

Wszystkie zamówienia (shop + allegro) z paginacją.

| Parametr | Typ | Opis |
|----------|-----|------|
| `page` | number | Strona (default: 1) |
| `limit` | number | Max 100 (default: 50) |
| `source` | string | `shop`, `allegro`, lub puste |
| `status` | string | Filtr po statusie |
| `from` | date | Data od (ISO 8601) |
| `to` | date | Data do (ISO 8601) |
| `sort` | string | `-createdAt` (najnowsze) |

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "orderNumber": "IBC-2026-00123",
      "source": "shop",
      "externalId": null,
      "status": "processing",
      "total": 89.00,
      "customerData": {
        "name": "Anna Nowak",
        "email": "kontakt@ilbuoncaffe.pl"
      },
      "itemsCount": 3,
      "createdAt": "2026-01-29T10:00:00Z"
    },
    {
      "id": 124,
      "orderNumber": "IBC-2026-00124",
      "source": "allegro",
      "externalId": "a1b2c3d4-5678-90ab-cdef",
      "status": "paid",
      "total": 320.00,
      "customerData": {
        "name": "Jan Kowalski",
        "email": "kontakt@ilbuoncaffe.pl"
      },
      "itemsCount": 1,
      "createdAt": "2026-01-29T11:30:00Z"
    }
  ],
  "meta": { "total": 1523, "page": 1, "limit": 50, "totalPages": 31 }
}
```

##### `PATCH /admin/orders/:id/status` 🛡️

Zmiana statusu zamówienia.

```json
{
  "status": "shipped",
  "trackingNumber": "PL123456789",
  "internalNotes": "Wysłano InPost"
}
```

#### Produkty (CRUD)

##### `POST /admin/products` 🛡️

Tworzenie nowego produktu.

##### `PUT /admin/products/:sku` 🛡️

Aktualizacja produktu.

```json
{
  "name": "Etiopia Yirgacheffe 250g (Nowy zbiór!)",
  "price": 69.00,
  "isNew": true
}
```

##### `PUT /admin/products/:sku/stock` 🛡️

Korekta stocku z pełnym audytem.

```json
{
  "stock": 25,
  "reason": "inventory",
  "notes": "Inwentaryzacja miesięczna",
  "syncToAllegro": true
}
```

Kolumny `stock_changes` (log zmian):

| Kolumna | Opis |
|---------|------|
| `previousStock` | Stan przed zmianą |
| `newStock` | Stan po zmianie |
| `change` | Delta (+/-) |
| `reason` | `order`, `manual`, `inventory`, `damage`, `allegro_sync` |
| `orderId` | Powiązane zamówienie (jeśli `reason=order`) |
| `adminId` | Kto dokonał korekty |
| `notes` | Notatka admina |

#### Audit Log (RODO)

##### `GET /admin/audit` 🛡️

Dziennik audytu — kto przeglądał dane klientów.

```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "adminId": 1,
      "adminEmail": "kontakt@ilbuoncaffe.pl",
      "action": "view_customer",
      "targetUserId": 123,
      "details": { "path": "/admin/customers/123", "method": "GET" },
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-01-29T14:00:00Z"
    }
  ]
}
```

#### GDPR Management

##### `GET /admin/gdpr/anonymize-preview` 🛡️

Podgląd użytkowników kwalifikujących się do anonimizacji.

| Parametr | Typ | Opis |
|----------|-----|------|
| `daysOverdue` | number | Dni po `data_retention_until` |

---

## 🔄 Allegro Integration 🚧

> **Status:** Schemat DB gotowy (allegro_credentials, allegro_sync_log, allegro_state), endpointy do zaimplementowania.  
> **Model:** Mapowanie 1:1 — jeden SKU = jedna oferta Allegro (`products.allegroOfferId`).  
> **Prefix planowany:** `/admin/allegro`

### Schemat bazy

**`allegro_credentials`** — Tokeny OAuth2 Allegro:

| Kolumna | Typ | Opis |
|---------|-----|------|
| `accessToken` | text | Token dostępu Allegro |
| `refreshToken` | text | Token odświeżania |
| `expiresAt` | timestamp | Wygaśnięcie access tokena |
| `environment` | varchar(20) | `sandbox` \| `production` |
| `isActive` | boolean | |

**`allegro_sync_log`** — Log synchronizacji:

| Kolumna | Typ | Opis |
|---------|-----|------|
| `productSku` | varchar(50) | SKU produktu |
| `offerId` | varchar(50) | ID oferty Allegro |
| `action` | varchar(50) | `stock_update`, `price_update`, `order_sync`, `map`, `unmap` |
| `status` | varchar(20) | `success`, `error`, `pending`, `retry` |
| `requestPayload` | jsonb | Dane wysłane |
| `responsePayload` | jsonb | Odpowiedź Allegro |
| `errorMessage` | text | Komunikat błędu |
| `retryCount` | integer | Liczba ponownych prób |

**`allegro_state`** — Stan synchronizacji (key-value):

| Key | Opis |
|-----|------|
| `order_events_cursor` | Cursor do Allegro Order Events API |
| `last_stock_sync` | Timestamp ostatniej synchronizacji stocku |
| `circuit_breaker` | Stan circuit breakera |

### Planowane endpointy

#### `GET /admin/allegro/offers` 🛡️

Pobranie ofert z Allegro REST API z informacją o mapowaniu.

```json
{
  "success": true,
  "data": [
    {
      "offerId": "12345678901",
      "name": "Kawa Etiopia Yirgacheffe 250g",
      "price": 65.00,
      "stock": 15,
      "status": "ACTIVE",
      "mappedSku": "ETH-YRG-250"
    }
  ]
}
```

#### `POST /admin/allegro/map` 🛡️

Mapowanie SKU → oferta Allegro.

```json
{ "sku": "ETH-YRG-250", "offerId": "12345678901" }
```

Możliwe błędy:

| Status | Kod | Opis |
|--------|-----|------|
| `409` | `ALLEGRO_ALREADY_MAPPED` | SKU jest już zmapowane |
| `422` | `ALLEGRO_OFFER_NOT_FOUND` | Oferta nie istnieje |
| `422` | `ALLEGRO_PRICE_MISMATCH` | Niezgodność cen (warunek ostrzegawczy) |

#### `DELETE /admin/allegro/map/:sku` 🛡️

Usunięcie mapowania.

#### `GET /admin/allegro/sync-status` 🛡️

Status synchronizacji.

```json
{
  "success": true,
  "data": {
    "lastOrderSync": "2026-01-29T19:00:00Z",
    "lastStockSync": "2026-01-29T18:55:00Z",
    "orderEventsCursor": "abc123xyz",
    "pendingStockChanges": 3,
    "circuitBreaker": {
      "status": "closed",
      "retriesRemaining": 3
    },
    "errors24h": 2
  }
}
```

---

## 🪝 Webhooks 🚧

> **Status:** Do zaimplementowania.

### `POST /api/webhooks/przelewy24`

Notyfikacja o statusie transakcji z Przelewy24.

**Weryfikacja dwuetapowa:**

1. **CRC Hash Verification** — sprawdzenie `sign` z payloadu
2. **API Status Verification** — dodatkowe `PUT /api/v1/transaction/verify` w P24

**Request Body:**

```json
{
  "sessionId": "xxx-yyy-zzz",
  "orderId": "IBC-2026-00123",
  "amount": 45000,
  "currency": "PLN",
  "sign": "abc123..."
}
```

> `amount` w **groszach** (450.00 PLN = 45000)

**Obsługiwane akcje:**

| Zdarzenie | Efekt |
|-----------|-------|
| Transakcja zakończona sukcesem | Status → `paid`, `paidAt` ustawiane |
| Transakcja anulowana | Zwolnienie rezerwacji stocku |
| Transakcja zwrócona | Status → `cancelled` |

---

## 🏥 Health Check ✅

### `GET /health`

Publiczny endpoint — sprawdzenie stanu systemu.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-29T19:00:00Z",
  "database": "connected"
}
```

**Response `503 Service Unavailable`:**

```json
{
  "status": "degraded",
  "timestamp": "2026-01-29T19:00:00Z",
  "database": "disconnected",
  "error": "Connection refused"
}
```

### `GET /`

Ping — zwraca `text/plain`:

```
Il Buon Caffe API is running!
```

---

## 🔒 Bezpieczeństwo

### Nagłówki bezpieczeństwa (middleware `securityHeaders`)

Każda odpowiedź zawiera:

| Header | Wartość | Cel |
|--------|---------|-----|
| `X-Frame-Options` | `DENY` | Ochrona przed clickjacking |
| `X-Content-Type-Options` | `nosniff` | Blokada MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Kontrola referrera |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blokada API urządzeń |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS (1 rok) |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Content-Security-Policy` | (zobacz niżej) | CSP |

### Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' https://r2.ilbuoncaffe.pl data: blob:;
connect-src 'self' https://api.ilbuoncaffe.pl;
font-src 'self' https://fonts.gstatic.com;
frame-ancestors 'none'
```

### CORS

| Konfiguracja | Wartość |
|-------------|---------|
| Allowed Origins | `http://localhost:3000`, `https://ilbuoncaffe.pl`, `https://www.ilbuoncaffe.pl` |
| Credentials | `true` |
| Methods | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS` |
| Allowed Headers | `Content-Type`, `Authorization`, `X-Requested-With` |
| Exposed Headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Max-Age (preflight cache) | 600s (10 minut) |

### Algorytm hashowania

| Zastosowanie | Algorytm |
|-------------|----------|
| JWT | HS256 (`jose`) |
| Hasła | bcrypt (`bcryptjs`) |
| Tokeny (reset, verification, refresh) | SHA-256 (Web Crypto API) |

### Identyfikacja IP

Kolejność nagłówków:

1. `CF-Connecting-IP` (Cloudflare)
2. `X-Real-IP`
3. `X-Forwarded-For` (pierwszy IP)
4. `'unknown'`

---

## ⏱️ Rate Limiting

### Implementacja

- **Storage:** Cloudflare KV (`AUTH_RATE_LIMIT` namespace) z fallbackiem na in-memory `Map`
- **Klucz:** `ratelimit:{endpoint}:{IP}` (lub `{endpoint}:{email}` dla password reset)

### Presety

| Endpoint | Limit | Okno | Blokada |
|----------|-------|------|---------|
| Login (`/api/auth/login`) | 5 req | 15 min | 1h |
| Rejestracja (`/api/auth/register`) | 3 req | 1h | 1h |
| Reset hasła (`/api/auth/forgot-password`) | 3 req / email | 1h | 1h |
| General API | 100 req | 1 min | 5 min |
| Health check | Unlimited | — | — |

### Nagłówki odpowiedzi

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706540060
```

### Odpowiedź po przekroczeniu limitu

**`429 Too Many Requests`:**

```json
{
  "error": "Zbyt wiele żądań. Spróbuj ponownie później."
}
```

Header `Retry-After` wskazuje czas do odblokowania w sekundach.

---

## ❌ Kody Błędów

### Format odpowiedzi błędu (zaimplementowane endpointy)

Endpointy auth zwracają prosty format:

```json
{
  "error": "Opis błędu po polsku"
}
```

Opcjonalnie z dodatkowymi polami:

```json
{
  "error": "Hasło nie spełnia wymagań",
  "errors": ["Minimum 8 znaków", "Co najmniej 1 wielka litera"]
}
```

### Format odpowiedzi błędu (planowany standard)

Przyszłe endpointy będą używać rozszerzonego formatu:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email",
      "rule": "required"
    }
  }
}
```

### Tabela kodów HTTP

| Status | Nazwa | Opis | Przykład |
|--------|-------|------|----------|
| `400` | Bad Request | Nieprawidłowe dane wejściowe | Brak email, słabe hasło |
| `401` | Unauthorized | Brak lub nieważny token | Token wygasły, brak cookie |
| `403` | Forbidden | Brak uprawnień | Konto zablokowane, zła rola, email niezweryfikowany |
| `404` | Not Found | Zasób nie istnieje | Użytkownik, produkt |
| `409` | Conflict | Duplikat | Email istnieje, idempotency conflict, Allegro already mapped |
| `422` | Unprocessable Entity | Błąd walidacji logicznej | Allegro offer not found, price mismatch |
| `429` | Too Many Requests | Rate limit | Zbyt wiele prób logowania |
| `500` | Internal Server Error | Błąd serwera | Nieoczekiwany wyjątek |
| `503` | Service Unavailable | Usługa niedostępna | DB disconnected, Allegro circuit breaker open |

---

## ⚙️ Zmienne Środowiskowe

### Cloudflare Workers Bindings

| Zmienna | Typ | Opis | Wymagana |
|---------|-----|------|----------|
| `DATABASE_URL` | Secret | Connection string do Neon PostgreSQL | ✅ |
| `JWT_ACCESS_SECRET` | Secret | Klucz podpisu access tokenów (HS256) | ✅ |
| `JWT_REFRESH_SECRET` | Secret | Klucz podpisu refresh tokenów (HS256) | ✅ |
| `NODE_ENV` | Variable | `development` \| `production` | ❌ |
| `AUTH_RATE_LIMIT` | KV Namespace | Cloudflare KV do rate limitingu | ❌ (fallback: in-memory) |

### Konfiguracja Wrangler

```jsonc
// wrangler.json
{
  "name": "il-buon-caffe-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-09-23",
  "kv_namespaces": [
    {
      "binding": "AUTH_RATE_LIMIT",
      "id": "..."
    }
  ]
}
```

---

## 📊 Status implementacji — Podsumowanie

| Komponent | Status | Pliki |
|-----------|--------|-------|
| **Auth (10 endpointów)** | ✅ Gotowe | `routes/auth.ts` (751 linii) |
| **Health check** | ✅ Gotowe | `index.ts` |
| **Auth middleware** | ✅ Gotowe | `middleware/auth.ts` |
| **Rate limiting** | ✅ Gotowe | `middleware/rateLimit.ts` |
| **Security headers** | ✅ Gotowe | `middleware/security.ts` |
| **Audit log middleware** | ✅ Gotowe | `middleware/auditLog.ts` |
| **JWT library** | ✅ Gotowe | `lib/jwt.ts` |
| **Cookie management** | ✅ Gotowe | `lib/cookies.ts` |
| **DB schema (16 tabel)** | ✅ Gotowe | `packages/db/schema/index.ts` |
| **Shared types** | ✅ Gotowe | `packages/types/index.ts` |
| Produkty CRUD | 🚧 Planowane | — |
| Kategorie | 🚧 Planowane | — |
| Zamówienia | 🚧 Planowane | — |
| Przelewy24 | 🚧 Planowane | — |
| RODO endpointy | 🚧 Planowane | — |
| Admin panel API | 🚧 Planowane | — |
| Allegro integration | 🚧 Planowane | — |
| Webhooks | 🚧 Planowane | — |
| Email (AWS SES) | 🚧 Planowane | — |

---

> **Ostatnia aktualizacja:** Lipiec 2025  
> **Wersja dokumentu:** 3.0  
> **Autor:** Il Buon Caffe Team
