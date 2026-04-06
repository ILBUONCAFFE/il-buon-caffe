# 🏛️ Il Buon Caffè - Architektura Systemu (v2.1)

> **Wersja:** 2.1.0 (RODO-Compliant, Flat Structure, WebAdmin)  
> **Data:** Lipiec 2025  
> **Status:** W rozwoju (Faza 1)

---

## 📋 Spis Treści

1. [Przegląd Systemu](#-przegląd-systemu)
2. [Kluczowe Decyzje Architektoniczne](#-kluczowe-decyzje-architektoniczne)
3. [Stack Technologiczny](#-stack-technologiczny)
4. [Struktura Monorepo](#-struktura-monorepo)
5. [Architektura Warstw](#-architektura-warstw)
6. [Schemat Bazy Danych](#-schemat-bazy-danych)
7. [Bezpieczeństwo & Auth](#-bezpieczeństwo--auth)
8. [RODO/GDPR Compliance](#-rodogdpr-compliance)
9. [Integracja Allegro](#-integracja-allegro)
10. [Strategia Cache'owania](#-strategia-cacheowania)
11. [Zmienne Środowiskowe](#-zmienne-środowiskowe)

---

## 🎯 Przegląd Systemu

**Il Buon Caffè** to platforma e-commerce dla luksusowych delikatesów:

| Komponent       | Opis                          | Technologia                   |
| --------------- | ----------------------------- | ----------------------------- |
| **Sklep WWW**   | Strona klienta z płatnościami | Next.js 16 (Cloudflare Pages) |
| **Admin Panel** | WebAdmin (`/admin/*` routes)  | Next.js 16 (Server Actions)   |
| **API**         | Serverless backend            | Cloudflare Workers + Hono     |
| **Baza Danych** | Persystencja danych           | Neon PostgreSQL + Drizzle     |
| **Cache**       | Szybki cache edge             | Cloudflare KV                 |
| **Storage**     | Przechowywanie obrazów        | Cloudflare R2 (Signed URLs)   |
| **Kolejki**     | Asynchroniczne zadania        | Cloudflare Queues             |
| **Płatności**   | Bramka płatności              | Przelewy24 (польская)         |

---

## ⚠️ Kluczowe Decyzje Architektoniczne

### 1. Model Flat (Bez Wariantów)

```
✅ PRZYJĘTE: Każdy SKU to osobny produkt

Przykład:
- "Etiopia Yirgacheffe 250g" → SKU: ETH-YRG-250 (osobny produkt)
- "Etiopia Yirgacheffe 1kg"  → SKU: ETH-YRG-1000 (osobny produkt)

Powód: Allegro nie obsługuje wariantów, mapowanie 1:1 (SKU ↔ offerId)
```

### 2. Unified JWT Auth (Bez API Keys)

```
✅ PRZYJĘTE: Wszystko przez JWT (klienci + admini)

Admin: JWT z role: "admin" + IP Whitelist + httpOnly cookie
Customer: JWT z role: "customer"

Powód: Jeden mechanizm auth, zero dodatkowych sekretów
```

### 3. WebAdmin zamiast Electron (v2.1)

```
✅ PRZYJĘTE: Panel admina jako route group /admin/* w Next.js

Powód:
- Ten sam stack (Next.js + React + Tailwind) = zero dodatkowego kodu
- Server Actions → bezpośredni dostęp do DB (bez API roundtrip)
- Brak buildu desktopowego (.exe, auto-update, code signing)
- Edge middleware chroni /admin/* (JWT + rola + IP whitelist)
- Działa z każdego urządzenia z przeglądarką

Electron ODRZUCONY: dodatkowa złożoność bez korzyści
```

### 4. RODO-First

```
✅ PRZYJĘTE: GDPR compliance przed pierwszym zamówieniem

- Osobne checkboxy zgód przy rejestracji
- Endpoint /user/export (Art. 20)
- Endpoint /user/anonymize (Art. 17)
- Audit logging (Art. 5)
- Wersjonowanie dokumentów prawnych
```

---

## 🛠 Stack Technologiczny

### Frontend (Sklep WWW + WebAdmin)

```
Next.js 16.1 (App Router)
├── TypeScript 5.x
├── Tailwind CSS 4
├── React 19.2
├── motion 12 (animacje)
├── Lucide Icons
└── /admin/* routes (WebAdmin)
```

### Backend (API)

```
Cloudflare Workers
├── Hono.js (routing + middleware)
├── Drizzle ORM
├── Zod (walidacja)
├── jose (JWT)
└── przelewy24-node
```

### Baza Danych

```
Neon PostgreSQL (Serverless)
├── Drizzle ORM (schema + queries)
├── Hyperdrive (connection pooling)
└── Scale-to-Zero (oszczędność)
```

### Infrastruktura Cloudflare

```
├── Pages (hosting Next.js)
├── Workers (API serverless)
├── KV (session cache, rate limiting)
├── R2 (object storage - signed URLs only!)
├── Queues (Allegro sync, stock sync)
├── Hyperdrive (DB pooling)
└── Cron Triggers
```

---

## 📁 Struktura Monorepo

```
il-buon-caffe/
│
├── 📂 apps/
│   ├── 📂 web/                    # Next.js 16 (sklep + WebAdmin)
│   │   ├── src/
│   │   │   ├── app/               # App Router pages
│   │   │   │   ├── admin/         # 🔒 WebAdmin routes
│   │   │   │   │   ├── layout.tsx # Auth guard + admin shell
│   │   │   │   │   ├── orders/    # Zarządzanie zamówieniami
│   │   │   │   │   ├── products/  # Produkty + edytor win
│   │   │   │   │   ├── allegro/   # Integracja Allegro
│   │   │   │   │   ├── finance/   # Raporty finansowe
│   │   │   │   │   ├── customers/ # Klienci (RODO)
│   │   │   │   │   ├── content/   # CMS (treści statyczne)
│   │   │   │   │   ├── audit/     # Dziennik audytu (Art. 30)
│   │   │   │   │   └── settings/  # Konfiguracja
│   │   │   ├── components/        # React components
│   │   │   ├── context/           # React Context (Cart)
│   │   │   ├── middleware.ts      # Edge: /admin/* auth guard
│   │   │   └── lib/               # Utils, API client
│   │   └── next.config.mjs
│   │
│   └── 📂 api/                    # Cloudflare Workers (Hono)
│       ├── src/
│       │   ├── index.ts           # Entry point
│       │   ├── routes/            # API routes
│       │   │   ├── products.ts
│       │   │   ├── orders.ts
│       │   │   ├── auth.ts
│       │   │   ├── user.ts        # GDPR endpoints
│       │   │   ├── legal.ts       # Polityka prywatności
│       │   │   ├── admin/
│       │   │   └── webhooks/
│       │   └── middleware/
│       │       ├── auth.ts        # JWT validation
│       │       ├── ipWhitelist.ts # Admin IP check
│       │       ├── rateLimit.ts
│       │       └── auditLog.ts    # GDPR audit
│       └── wrangler.toml
│
├── 📂 packages/
│   ├── 📂 db/                     # Drizzle schema (shared)
│   │   ├── schema/
│   │   │   └── index.ts           # All tables (RODO-compliant)
│   │   ├── drizzle.config.ts
│   │   └── client.ts
│   │
│   ├── 📂 types/                  # Shared TypeScript types
│   │   └── index.ts
│   │
│   └── 📂 ui/                     # Shared UI components
│
├── 📂 docs/
│   ├── ARCHITECTURE.md            # Ten plik
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── Plan działania.md
│
└── 📜 turbo.json
```

---

## 🏗 Architektura Warstw

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        👤 KLIENT (Browser/Mobile)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    🌐 CLOUDFLARE EDGE NETWORK (300+ POPs)                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     ⚡ COMPUTE LAYER                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  Pages (Next.js) │  │  API Worker     │  │  Cron Workers   │   │  │
│  │  │  SSR/SSG/ISR    │  │  (Hono.js)      │  │  (Allegro Sync) │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │  │
│  └───────────│────────────────────│────────────────────│────────────┘  │
│              │                    │                    │                │
│  ┌───────────│────────────────────│────────────────────│────────────┐  │
│  │           ▼                    ▼                    ▼             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  KV Store       │  │  Queues         │  │  R2 Storage     │   │  │
│  │  │  (Sessions/Rate)│  │  (Stock/Allegro)│  │  (Signed URLs!) │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  │                        💾 STORAGE LAYER                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      🔄 HYPERDRIVE (Connection Pool)                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      🐘 NEON POSTGRESQL (Serverless)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  PROD Branch    │  │  STAGING Branch │  │  DEV Branch     │         │
│  │  (Scale-to-Zero)│  │  (On-demand)    │  │  (Ephemeral)    │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                      ▼
┌─────────────────┐                                    ┌─────────────────┐
│  Przelewy24     │                                    │  Allegro API    │
│  (Webhooks!)    │                                    │  (Polling)      │
└─────────────────┘                                    └─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  👨‍💻 WEBADMIN (/admin/* routes w Next.js)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  React UI       │  │  Edge Middleware │  │  Server Actions │         │
│  │  (Tailwind 4)   │  │  (JWT + IP)     │  │  (Direct DB)    │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗃 Schemat Bazy Danych

### Diagram ERD (Flat Structure)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USERS & AUTH                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐          ┌─────────────────┐                       │
│  │     USERS       │          │  USER_CONSENTS  │                       │
│  ├─────────────────┤          ├─────────────────┤                       │
│  │ id (PK)         │──────────│ user_id (FK)    │                       │
│  │ email (UNIQUE)  │          │ consent_type    │                       │
│  │ password_hash   │          │ granted         │                       │
│  │ name            │          │ version         │                       │
│  │ role            │          │ ip_address      │                       │
│  │ ──── GDPR ────  │          │ created_at      │                       │
│  │ gdpr_consent_date│         └─────────────────┘                       │
│  │ marketing_consent│                                                   │
│  │ analytics_consent│         ┌─────────────────┐                       │
│  │ terms_version   │          │   AUDIT_LOG     │                       │
│  │ consent_ip      │          ├─────────────────┤                       │
│  │ anonymized_at   │──────────│ admin_id (FK)   │                       │
│  │ data_retention  │          │ target_user (FK)│                       │
│  └─────────────────┘          │ action          │                       │
│                               │ details (JSONB) │                       │
│                               │ ip_address      │                       │
│                               └─────────────────┘                       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTS (FLAT STRUCTURE)                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐          ┌─────────────────┐                       │
│  │   CATEGORIES    │          │    PRODUCTS     │                       │
│  ├─────────────────┤          ├─────────────────┤                       │
│  │ id (PK)         │──────────│ sku (PK) ⭐     │ ← SKU jako Primary Key│
│  │ name            │          │ slug (UNIQUE)   │                       │
│  │ slug (UNIQUE)   │          │ category_id(FK) │                       │
│  │ layout_config   │          │ name            │                       │
│  │ image_url       │          │ description     │                       │
│  │ sort_order      │          │ price           │                       │
│  └─────────────────┘          │ stock           │                       │
│                               │ reserved        │                       │
│                               │ image_url       │                       │
│                               │ origin          │                       │
│                               │ year            │                       │
│                               │ is_active       │                       │
│                               │ allegro_offer_id│ ← Allegro 1:1 mapping │
│                               └────────┬────────┘                       │
│                                        │                                │
│                               ┌────────┴────────┐                       │
│                               │ PRODUCT_IMAGES  │                       │
│                               ├─────────────────┤                       │
│                               │ product_sku(FK) │                       │
│                               │ url             │                       │
│                               │ is_primary      │                       │
│                               └─────────────────┘                       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         ORDERS (UNIFIED VIEW)                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐          ┌─────────────────┐                       │
│  │     ORDERS      │          │   ORDER_ITEMS   │                       │
│  ├─────────────────┤          ├─────────────────┤                       │
│  │ id (PK)         │──────────│ order_id (FK)   │                       │
│  │ order_number    │          │ product_sku(FK) │                       │
│  │ user_id (FK)    │          │ product_name    │                       │
│  │ customer_data   │ (JSONB)  │ quantity        │                       │
│  │ status          │          │ unit_price      │                       │
│  │ source          │ (shop/allegro)             │                       │
│  │ external_id     │ (Allegro ID)               │                       │
│  │ total           │          └─────────────────┘                       │
│  │ payment_intent  │                                                    │
│  │ idempotency_key │ ← Double-submit protection                         │
│  │ reservation_exp │ ← Stock reservation expiry                         │
│  └─────────────────┘                                                    │
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │  STOCK_CHANGES  │ ← Audit trail dla magazynu                         │
│  ├─────────────────┤                                                    │
│  │ product_sku(FK) │                                                    │
│  │ previous_stock  │                                                    │
│  │ new_stock       │                                                    │
│  │ reason          │ (order/manual/inventory/damage)                    │
│  │ admin_id (FK)   │                                                    │
│  └─────────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                           ALLEGRO INTEGRATION                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐          ┌─────────────────┐                       │
│  │ALLEGRO_CREDENTIALS│        │ ALLEGRO_SYNC_LOG│                       │
│  ├─────────────────┤          ├─────────────────┤                       │
│  │ access_token    │          │ product_sku     │                       │
│  │ refresh_token   │          │ offer_id        │                       │
│  │ expires_at      │          │ action          │                       │
│  │ environment     │ (sandbox/prod)             │                       │
│  └─────────────────┘          │ status          │                       │
│                               │ error_code      │ (422, 429, etc.)      │
│  ┌─────────────────┐          │ retry_count     │                       │
│  │  ALLEGRO_STATE  │          └─────────────────┘                       │
│  ├─────────────────┤                                                    │
│  │ key (PK)        │ (order_events_cursor, circuit_breaker)             │
│  │ value           │                                                    │
│  └─────────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                           LEGAL DOCUMENTS                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │ LEGAL_DOCUMENTS │ ← Wersjonowanie polityki (RODO wymaga!)            │
│  ├─────────────────┤                                                    │
│  │ type            │ (privacy_policy, terms, cookies)                   │
│  │ version         │                                                    │
│  │ content         │                                                    │
│  │ effective_from  │                                                    │
│  └─────────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Bezpieczeństwo & Auth

### Unified JWT (Bez API Keys)

```typescript
// JWT Payload
{
  "sub": "user_123",
  "email": "kontakt@ilbuoncaffe.pl",
  "role": "customer",    // lub "admin"
  "iat": 1706540000,
  "exp": 1706626400      // 24h dla customer, 2h dla admin
}
```

### Warstwy Zabezpieczeń

| Warstwa          | Mechanizm                 | Implementacja                                               |
| ---------------- | ------------------------- | ----------------------------------------------------------- |
| **Transport**    | TLS 1.3                   | Cloudflare (automatic)                                      |
| **Edge**         | WAF + DDoS                | Cloudflare (managed)                                        |
| **API (public)** | JWT + Rate Limit          | Hono middleware                                             |
| **API (admin)**  | JWT + IP Whitelist        | Custom middleware                                           |
| **Webhooks**     | CRC Hash Verification     | Przelewy24: `sha384(sessionId+orderId+amount+currency+crc)` |
| **Database**     | SSL + IP Whitelist        | Neon config                                                 |
| **R2 Storage**   | Signed URLs (5min TTL)    | Worker generates                                            |
| **WebAdmin**     | httpOnly cookie + Edge MW | JWT w cookie, middleware.ts sprawdza role + IP               |

### IP Whitelist dla Admin

```typescript
// middleware/ipWhitelist.ts
const ALLOWED_IPS = [
  "103.21.244.0/22", // Cloudflare
  "103.22.200.0/22", // Cloudflare
  "192.168.1.100", // Office IP
];

export function ipWhitelistMiddleware(c: Context, next: Next) {
  const clientIP = c.req.header("CF-Connecting-IP");

  if (!isAllowedIP(clientIP, ALLOWED_IPS)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return next();
}
```

---

## 🛡️ RODO/GDPR Compliance

### Wymagane Mechanizmy

| Wymóg RODO                          | Implementacja                           |
| ----------------------------------- | --------------------------------------- |
| **Art. 6** (Zgoda)                  | Osobne checkboxy przy rejestracji       |
| **Art. 7** (Dowód zgody)            | Tabela `user_consents` z IP i timestamp |
| **Art. 13/14** (Informowanie)       | Wersjonowana polityka prywatności       |
| **Art. 17** (Prawo do usunięcia)    | Endpoint `/user/anonymize`              |
| **Art. 20** (Przenoszenie danych)   | Endpoint `/user/export`                 |
| **Art. 30** (Rejestr przetwarzania) | Tabela `audit_log`                      |

### Consent Tracking

```typescript
// Przy rejestracji zapisujemy:
await db.insert(userConsents).values([
  {
    userId: newUser.id,
    consentType: "terms",
    granted: true,
    version: "2026-01-01",
    ipAddress: c.req.header("CF-Connecting-IP"),
    userAgent: c.req.header("User-Agent"),
  },
  // ... marketing, analytics (opcjonalne)
]);
```

### Anonymization Worker

```typescript
// Cron: co tydzień (niedziela 3:00)
export async function anonymizeExpiredUsers(env: Env) {
  const expiredUsers = await env.DB.select()
    .from(users)
    .where(
      and(lt(users.dataRetentionUntil, new Date()), isNull(users.anonymizedAt)),
    );

  for (const user of expiredUsers) {
    await env.DB.update(users)
      .set({
        email: `anonymized_${user.id}@deleted.local`,
        name: "Użytkownik usunięty",
        passwordHash: "ANONYMIZED",
        consentIpAddress: null,
        consentUserAgent: null,
        anonymizedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }
}
```

---

## 🛒 Integracja Allegro

### Flat 1:1 Mapping

```
┌─────────────────┐         ┌─────────────────┐
│    PRODUCTS     │         │  ALLEGRO OFFER  │
├─────────────────┤         ├─────────────────┤
│ sku: ETH-YRG-250│ ←──────→│ offerId: 12345  │
│ allegro_offer_id│         │ name: Etiopia...│
│ price: 65.00    │  sync   │ price: 65.00    │
│ stock: 15       │ ──────→ │ stock: 15       │
└─────────────────┘         └─────────────────┘
```

### Polling Strategy (Order Events)

```typescript
// Cron: co 60 sekund
export async function pollAllegroOrders(env: Env) {
  const cursor = await env.KV.get("allegro:cursor");

  // Check circuit breaker
  const breakerState = await env.KV.get("allegro:circuit_breaker");
  if (breakerState === "open") {
    console.log("Circuit breaker open, skipping poll");
    return;
  }

  try {
    const response = await fetch(`${ALLEGRO_API}/order/events?from=${cursor}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    // ⚠️ Exponential Backoff dla Rate Limiting (429)
    if (response.status === 429) {
      const retryCount = parseInt(
        (await env.KV.get("allegro:retry_count")) || "0",
      );
      const backoffMs = Math.min(2000 * Math.pow(2, retryCount), 60000); // max 60s

      console.log(
        `Rate limited, retry in ${backoffMs}ms (attempt ${retryCount + 1})`,
      );
      await env.KV.put("allegro:retry_count", String(retryCount + 1), {
        expirationTtl: 300,
      });

      // Schedule retry (nie blokuj cron)
      return;
    }

    // ⚠️ Circuit Breaker dla Server Errors (5xx)
    if (response.status >= 500) {
      const errorCount = parseInt(
        (await env.KV.get("allegro:error_count")) || "0",
      );

      if (errorCount >= 3) {
        // Open circuit breaker for 5 minutes
        await env.KV.put("allegro:circuit_breaker", "open", {
          expirationTtl: 300,
        });
        console.error("Circuit breaker OPENED after 3 consecutive 5xx errors");
      } else {
        await env.KV.put("allegro:error_count", String(errorCount + 1), {
          expirationTtl: 60,
        });
      }
      return;
    }

    // Success - reset counters
    await env.KV.delete("allegro:retry_count");
    await env.KV.delete("allegro:error_count");

    const { events } = await response.json();

    for (const event of events) {
      if (event.type === "BOUGHT") {
        await env.ALLEGRO_ORDERS_QUEUE.send({
          type: "new_order",
          orderId: event.order.id,
        });
      }
    }

    // Update cursor
    if (events.length > 0) {
      await env.KV.put("allegro:cursor", events[events.length - 1].id);
    }
  } catch (error) {
    // Timeout or network error → Circuit Breaker
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      console.error("Allegro API timeout, opening circuit breaker");
      await env.KV.put("allegro:circuit_breaker", "open", {
        expirationTtl: 300,
      });
    }
  }
}
```

### Stock Sync (Debounce + Batch)

```typescript
// Queue consumer
export async function processStockSync(
  batch: MessageBatch<StockChange>,
  env: Env,
) {
  const changes = batch.messages.map((m) => m.body);

  // Group by urgency
  const urgent = changes.filter((c) => c.newStock === 0);
  const normal = changes.filter((c) => c.newStock > 0);

  // Urgent: immediate single update
  for (const change of urgent) {
    await updateSingleOffer(change, env);
  }

  // Normal: batch update (max 1000)
  if (normal.length > 0) {
    await batchUpdateOffers(normal.slice(0, 1000), env);
  }
}
```

---

## 💾 Strategia Cache'owania

### KV Namespaces

| Namespace       | TTL  | Zawartość                 |
| --------------- | ---- | ------------------------- |
| `SESSION_STORE` | 24h  | Cart state, user sessions |
| `CATALOG_CACHE` | 1h   | Products JSON, categories |
| `RATE_LIMIT`    | 1min | Sliding window counters   |

### Cache Invalidation

```typescript
async function updateProduct(sku: string, data: ProductUpdate, env: Env) {
  // 1. Update DB
  await env.DB.update(products).set(data).where(eq(products.sku, sku));

  // 2. Invalidate caches
  await Promise.all([
    env.CATALOG_CACHE.delete(`product:${sku}`),
    env.CATALOG_CACHE.delete(`products:all`),
  ]);

  // 3. Revalidate Next.js (ISR)
  await fetch(`${NEXTJS_URL}/api/revalidate?path=/shop`);

  // 4. Queue Allegro sync if needed
  if (data.stock !== undefined && product.allegroOfferId) {
    await env.STOCK_SYNC_QUEUE.send({ sku, newStock: data.stock });
  }
}
```

---

## 🔧 Zmienne Środowiskowe

### Root `.env` (NIGDY nie commituj!)

```bash
# ================================
# DATABASE
# ================================
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require

# ================================
# JWT
# ================================
JWT_SECRET=your-super-secret-key-256-bit-minimum

# ================================
# PRZELEWY24
# ================================
P24_MERCHANT_ID=12345
P24_POS_ID=12345
P24_CRC_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
P24_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ⚠️ KRYTYCZNE!
P24_ENVIRONMENT=sandbox  # lub production

# ================================
# ALLEGRO
# ================================
ALLEGRO_CLIENT_ID=xxxxxxxx
ALLEGRO_CLIENT_SECRET=xxxxxxxx
ALLEGRO_ENV=sandbox  # lub production

# ================================
# EMAIL
# ================================
RESEND_API_KEY=re_xxxxxxxx
```

### `apps/api/wrangler.toml`

```toml
[vars]
ENVIRONMENT = "production"
ALLEGRO_ENV = "production"
ADMIN_ALLOWED_IPS = "103.21.244.0/22,192.168.1.100"

[[kv_namespaces]]
binding = "SESSION_STORE"
id = "xxx"

[[kv_namespaces]]
binding = "CATALOG_CACHE"
id = "xxx"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "xxx"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "il-buon-caffe-images"

[[queues.producers]]
queue = "allegro-orders"
binding = "ALLEGRO_ORDERS_QUEUE"

[[queues.producers]]
queue = "stock-sync"
binding = "STOCK_SYNC_QUEUE"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "xxx"

[triggers]
crons = ["*/1 * * * *", "*/5 * * * *", "0 3 * * 0"]
```

---

## 📚 Powiązane Dokumenty

- [Plan Działania](./Plan%20działania.md) - 16-tygodniowy roadmap
- [API Reference](./API.md) - Pełna dokumentacja API v2.0
- [Deployment Guide](./DEPLOYMENT.md) - Instrukcja wdrożenia

---

> **Autor:** System Documentation  
> **Ostatnia aktualizacja:** 2025-07-11  
> **Wersja:** 2.1.0 (WebAdmin, aktualne wersje frameworków)
