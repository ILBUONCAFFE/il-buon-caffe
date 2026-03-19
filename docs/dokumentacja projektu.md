# Il Buon Caffè — Dokumentacja Projektu

> **Wersja:** 3.0  
> **Data:** 2026-02-21  
> **Autor:** System  
> **Status:** Produkcja (sklep) + Rozwój (WebAdmin)

---

## Spis treści

1. [Wizja & Cel](#1-wizja--cel)
2. [Stack technologiczny](#2-stack-technologiczny)
3. [Architektura](#3-architektura)
4. [Monorepo — struktura](#4-monorepo--struktura)
5. [Baza danych](#5-baza-danych)
6. [Produkty & dane statyczne](#6-produkty--dane-statyczne)
7. [Sklep WWW](#7-sklep-www)
8. [WebAdmin Panel](#8-webadmin-panel)
9. [API (Hono Workers)](#9-api-hono-workers)
10. [Integracje zewnętrzne](#10-integracje-zewnętrzne)
11. [Bezpieczeństwo](#11-bezpieczeństwo)
12. [RODO / GDPR](#12-rodo--gdpr)
13. [Infrastruktura & Deploy](#13-infrastruktura--deploy)
14. [Konwencje & zasady](#14-konwencje--zasady)
15. [Znane problemy & dług techniczny](#15-znane-problemy--dług-techniczny)
16. [Roadmapa](#16-roadmapa)

---

## 1. Wizja & Cel

**Il Buon Caffè** — sklep internetowy z kawą speciality, winami, słodyczami i delikatesami włoskimi. Projekt łączy sprzedaż przez własną stronę z integracją Allegro, zarządzany przez jedną osobę (właściciel = admin = developer).

### Założenia fundamentalne

| Założenie | Decyzja |
|-----------|---------|
| **Budżet** | $0/mies. w idle, <$5/mies. pod obciążeniem |
| **Skala** | ~50 produktów, ~10-50 zamówień/dzień na start |
| **Zespół** | 1 osoba — zero enterprise overhead |
| **Lokalizacja** | Polska, język polski, waluta PLN |
| **Priorytet** | Szybkość ładowania > bogactwo funkcji |
| **Mobile** | Mobile-first design (sklep + admin) |

### Kanały sprzedaży

1. **Sklep WWW** — `ilbuoncaffe.pl` (primary)
2. **Allegro** — synchronizacja stock/ceny/zamówienia (secondary)
3. **Stacjonarnie** — przyszłościowo (POS integration, nie w v3)

---

## 2. Stack technologiczny

### Zasada: minimalizm + edge

Każde narzędzie musi spełniać min. 2 z 3 kryteriów:
- **Darmowe** na obecną skalę
- **Edge-native** (serverless, scale-to-zero)
- **Type-safe** (TypeScript end-to-end)

### Stos

| Warstwa | Narzędzie | Wersja | Rola | Koszt |
|---------|-----------|--------|------|-------|
| **Język** | TypeScript | 5.8 | Jedyny język w całym projekcie | $0 |
| **Frontend + SSR** | Next.js | 16.1 | Sklep + WebAdmin, App Router | $0 |
| **UI** | React | 19.1 | Komponenty | $0 |
| **Styling** | Tailwind CSS | 4.1 | Utility-first, zero runtime | $0 |
| **Animacje** | Motion (Framer) | 12.x | Scroll, hover, page transitions | $0 |
| **Ikony** | Lucide React | 0.48 | Spójny icon set | $0 |
| **ORM** | Drizzle | 0.44 | Type-safe SQL, zero runtime overhead | $0 |
| **Baza danych** | Neon PostgreSQL | — | Serverless Postgres, scale-to-zero | $0 (Free Tier) |
| **Connection Pool** | Hyperdrive | — | CF connection pooling | $0 |
| **API** | Hono | 4.x | Lightweight Workers framework | $0 |
| **Hosting** | Cloudflare Pages | — | SSR + static, 100k req/day free | $0 |
| **Storage** | Cloudflare R2 | — | Zdjęcia, eksporty. $0 egress | $0 (10GB free) |
| **CDN/Cache** | Cloudflare KV + Cache API | — | Session, catalog cache | $0 (100k reads/day) |
| **Płatności** | Przelewy24 | — | PL payment gateway | % od transakcji |
| **Email** | Resend | — | Transactional (potwierdzenia) | $0 (100/day free) |
| **Marketplace** | Allegro REST API | — | Sync stock, ceny, zamówienia | prowizja Allegro |
| **Monorepo** | Turborepo | 2.5 | Build orchestration, caching | $0 |
| **Package mgr** | npm | 10 | Workspaces | $0 |

### Odrzucone technologie

| Technologia | Powód odrzucenia |
|-------------|-----------------|
| **Electron** | Online-only, 1 developer, duplikacja stacku, build/update overhead |
| **NestJS** | Za ciężki (DI, moduły, dekoratory), nie działa na Workers, always-on server |
| **Prisma** | Cięższy niż Drizzle, wymaga engine binary, gorszy na edge |
| **MongoDB** | Niepotrzebny — dane relacyjne (zamówienia↔produkty↔klienci) |
| **Redis** | Cloudflare KV wystarczy, $0 vs $15+/mies |
| **Vercel** | Droższy niż CF Pages przy większym ruchu, vendor lock-in |
| **Supabase** | Neon daje lepszy serverless PG + branching |

---

## 3. Architektura

### Diagram wysokopoziomowy

```
                    ┌─────────────────────┐
                    │   Cloudflare Edge    │
                    │   ┌───────────────┐  │
  Klient ────────── │ ──│ Next.js 16    │  │ ──── Neon PostgreSQL
  (Browser)         │   │ Pages (SSR)   │  │      (Serverless)
                    │   │               │  │         │
                    │   │ /sklep/*      │  │      Hyperdrive
                    │   │ /admin/*  ◄───┼──┼── Server Actions ─┘
                    │   └───────────────┘  │
                    │                      │
                    │   ┌───────────────┐  │
  Allegro ──────────│──►│ Hono Workers  │──│──── Neon PostgreSQL
  Przelewy24 ──────│──►│ (API + Cron)  │  │
                    │   └───────────────┘  │
                    │                      │
                    │   ┌───────────────┐  │
                    │   │ R2 Storage    │  │
                    │   │ (zdjęcia)     │  │
                    │   └───────────────┘  │
                    └─────────────────────┘
```

### Kluczowe decyzje architektoniczne

#### D1: Jeden deploy — sklep + admin
Sklep (`/*`) i WebAdmin (`/admin/*`) żyją w tym samym Next.js — jeden build, jeden deploy. Edge middleware rozdziela publiczne od chronionych route'ów.

**Uzasadnienie:** 1 developer, shared components (tabele, formularze), zero duplikacji auth, jeden CI/CD pipeline.

#### D2: Server Actions zamiast wewnętrznego API
WebAdmin komunikuje się z bazą przez Next.js Server Actions (bezpośredni SQL przez Drizzle), NIE przez Hono API.

**Uzasadnienie:** Zero HTTP roundtrip, zero serializacji, zero dodatkowego auth layer. Hono obsługuje tylko external traffic (klienci, webhooks, cron).

#### D3: Static-first data z DB override
Dane opisowe produktów (wine_details, terroir, tasting notes) przechowywane w plikach `.ts` jako statyczny katalog. Baza ma kolumnę `wine_details JSONB` (domyślnie NULL = 0 bajtów). WebAdmin zapisuje do JSONB tylko nadpisania (partial merge).

**Uzasadnienie:** Zero obciążenia DB danymi statycznymi. Edycja z WebAdmin nadpisuje tylko zmienione pola. 3-warstwowy resolver: DB override > static catalog > defaults.

```
Odczyt wine_details:
  1. product.wineDetails (DB JSONB) — partial overrides
  2. wineDataCatalog[slug]          — pełny statyczny katalog
  3. defaultWineDetails             — fallback

deepMerge(defaults, catalog, dbOverrides)
```

#### D4: Unified orders (Shop + Allegro)
Jedna tabela `orders` z polem `source: 'shop' | 'allegro'` i `allegro_order_id`. Admin widzi wszystkie zamówienia w jednym widoku z filtrem źródła.

#### D5: SKU jako primary key produktów
Nie auto-increment ID — SKU jest unikalny, czytelny, używany w Allegro mapping i URL (`/sklep/wino/[slug]`).

---

## 4. Monorepo — struktura

```
Il Buon Caffe/
├── apps/
│   ├── web/                          ← Next.js 16 (sklep + WebAdmin)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (shop)/           ← Publiczny sklep
│   │   │   │   │   ├── page.tsx      ← Homepage
│   │   │   │   │   └── sklep/        ← /sklep, /sklep/[category], /sklep/[category]/[slug]
│   │   │   │   ├── admin/            ← WebAdmin (chroniony middleware)
│   │   │   │   │   ├── layout.tsx    ← Admin shell + sidebar
│   │   │   │   │   ├── page.tsx      ← Dashboard
│   │   │   │   │   ├── orders/       ← Zamówienia
│   │   │   │   │   ├── products/     ← Produkty + Wine Editor
│   │   │   │   │   ├── allegro/      ← Integracja Allegro
│   │   │   │   │   ├── finance/      ← Finanse + raporty
│   │   │   │   │   ├── customers/    ← Klienci + RODO
│   │   │   │   │   ├── content/      ← CMS + encyklopedia
│   │   │   │   │   ├── audit/        ← Audyt RODO Art. 30
│   │   │   │   │   └── settings/     ← Konfiguracja
│   │   │   │   └── layout.tsx        ← Root layout
│   │   │   ├── components/
│   │   │   │   ├── Home/             ← Hero, Features, FeaturedProducts
│   │   │   │   ├── Shop/             ← ShopClient (filtry, grid, koszyk)
│   │   │   │   ├── Product/          ← ProductClient, WineProductView
│   │   │   │   └── Admin/            ← (przyszłe komponenty admina)
│   │   │   ├── context/
│   │   │   │   └── CartContext.tsx    ← Koszyk (Context + localStorage)
│   │   │   ├── db/
│   │   │   │   └── schema.ts         ← Drizzle schema (SOURCE OF TRUTH)
│   │   │   ├── lib/
│   │   │   │   └── data/products/
│   │   │   │       └── wineData.ts   ← Statyczny katalog danych winnych
│   │   │   ├── services/
│   │   │   │   └── productService.ts ← Zapytania DB (filtry kaskadowe, paginacja)
│   │   │   ├── actions/
│   │   │   │   └── products.ts       ← Server Actions (getProducts, getBySlug)
│   │   │   └── types/
│   │   │       └── filters.ts        ← Typy filtrów winnych
│   │   ├── public/
│   │   │   └── assets/
│   │   │       ├── flags/            ← Flagi krajów (es.png, it.png, ...)
│   │   │       └── products/         ← Zdjęcia produktów
│   │   ├── middleware.ts             ← Auth guard dla /admin/*
│   │   └── next.config.mjs
│   │
│   └── api/                          ← Hono on Cloudflare Workers
│       ├── src/
│       │   └── index.ts              ← Public REST + Webhooks + Cron
│       └── wrangler.jsonc            ← Workers config
│
├── packages/
│   ├── db/                           ← ⚠️ Legacy — docelowo usunąć
│   ├── types/                        ← ⚠️ Legacy — docelowo usunąć
│   ├── ui/                           ← Shared design system (Button, Card, Table)
│   └── config/                       ← Shared configs (TS, ESLint)
│
├── docs/
│   ├── PROJECT.md                    ← TEN PLIK — master dokumentacja
│   ├── WEBADMIN_MENU.md              ← Specyfikacja menu admina
│   ├── ARCHITECTURE.md               ← Diagram + decyzje (v2.1)
│   ├── API.md                        ← Specyfikacja REST API
│   ├── DEPLOYMENT.md                 ← CI/CD + deploy guide
│   ├── database.md                   ← Schema description
│   ├── DATABASE_SETUP.md             ← Neon setup guide
│   └── diagrams/
│       └── architecture.mermaid      ← Diagram Mermaid
│
├── turbo.json                        ← Turborepo pipeline
├── package.json                      ← Workspace root
└── .gitignore
```

### Konsolidacja packages/ (dług techniczny)

| Package | Status | Plan |
|---------|--------|------|
| `packages/db` | ⚠️ Stara wersja schematu | Usunąć — `apps/web/src/db/schema.ts` jest source of truth |
| `packages/types` | ⚠️ Duplikuje `apps/web/src/types.ts` | Usunąć — typy przy konsumentach |
| `packages/ui` | ✅ Aktywny | Zachować — shared components |
| `packages/config` | ✅ Aktywny | Zachować — shared TS/ESLint config |

---

## 5. Baza danych

### Provider: Neon PostgreSQL (Serverless)

| Parametr | Wartość |
|----------|---------|
| **Plan** | Free Tier (0.5 GB storage, 1 branch, scale-to-zero) |
| **Branching** | `main` (prod), `dev` (active development) |
| **Connection** | Neon serverless driver (`@neondatabase/serverless`) over WebSocket |
| **Pooling** | Cloudflare Hyperdrive (1000 connections) |
| **Migrations** | Drizzle Kit (`npx drizzle-kit push`) |
| **Cold start** | ~500ms po idle (scale-to-zero) |

### Schema (12 tabel)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    categories    │     │     products      │     │  product_images  │
│─────────────────│     │──────────────────│     │─────────────────│
│ id (serial PK)  │◄────│ category_id (FK)  │────►│ product_sku(FK) │
│ name             │     │ sku (text PK)     │     │ url, alt, order │
│ slug             │     │ name, slug        │     └─────────────────┘
│ description      │     │ price, compare_price│
│ layout_type      │     │ stock, weight     │     ┌─────────────────┐
└─────────────────┘     │ origin_country    │     │  stock_changes   │
                         │ origin_region     │     │─────────────────│
                         │ grape_variety     │     │ product_sku(FK) │
                         │ wine_details(JSONB)│────►│ old→new, reason │
                         │ image, imageUrl   │     │ changed_by, ip  │
                         │ year              │     └─────────────────┘
                         │ is_active, is_featured│
                         └──────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│      users       │     │      orders       │     │   order_items    │
│─────────────────│     │──────────────────│     │─────────────────│
│ id (serial PK)  │◄────│ user_id (FK)      │────►│ order_id (FK)   │
│ email (unique)   │     │ order_number      │     │ product_sku(FK) │
│ name, phone      │     │ source: shop|allegro│   │ quantity, price │
│ password_hash    │     │ status (enum)     │     └─────────────────┘
│ role: customer|admin│  │ total, shipping   │
│ gdpr_*           │     │ payment_*         │
│ anonymized_at    │     │ allegro_order_id  │
└─────────────────┘     │ tracking_number   │
                         └──────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ allegro_credentials│  │ allegro_offer_map │     │allegro_sync_log │
│─────────────────│     │──────────────────│     │─────────────────│
│ client_id/secret│     │ sku ↔ offer_id   │     │ action, status  │
│ access/refresh  │     │ last_synced      │     │ error, duration │
│ environment     │     └──────────────────┘     └─────────────────┘
└─────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  user_consents   │     │ legal_documents   │
│─────────────────│     │──────────────────│
│ user_id (FK)    │     │ type, version    │
│ consent_type    │     │ content (text)   │
│ granted, ip     │     │ effective_from   │
│ withdrawn_at    │     │ is_current       │
└─────────────────┘     └──────────────────┘
```

### Kolumna wine_details (JSONB) — architektura danych

**Problem:** Dane opisowe wina (terroir, nuty smakowe, nagrody) nie są dynamiczne — nie powinny obciążać DB przy każdym odczycie, ale muszą być edytowalne z WebAdmin.

**Rozwiązanie:** 3-warstwowy resolver:

```typescript
// Priorytet: DB override > statyczny katalog > defaults
const details = deepMerge(
  defaultWineDetails,                    // Layer 3: generyczne wartości
  wineDataCatalog[product.slug],         // Layer 2: plik .ts z pełnymi danymi
  product.wineDetails                    // Layer 1: partial JSONB z DB (lub NULL)
)
```

| Warstwa | Źródło | Kiedy używane | Obciążenie DB |
|---------|--------|---------------|---------------|
| **DB** (`wine_details` JSONB) | `product.wineDetails` | Po edycji z WebAdmin | Partial JSON (~20-200B), lub NULL (0B) |
| **Katalog** (`wineData.ts`) | Import statyczny | Zawsze (domyślne dane) | Zero — plik w bundlu |
| **Default** | `defaultWineDetails` | Brak wpisu w katalogu | Zero — obiekt w pamięci |

**Efekt:** Produkt bez edycji z WebAdmin → `wine_details = NULL` → zero dodatkowych bajtów w wierszu → dane z pliku `.ts`.

### Aktualne dane w DB (branch: dev)

**Kategorie (4):**
| ID | Nazwa | Slug | Layout |
|----|-------|------|--------|
| 3 | Kawa | kawa | default |
| 4 | Wina | wino | wine |
| 5 | Słodycze | slodycze | default |
| 6 | Delikatesy | delikatesy | default |

**Produkty (11):**
| SKU | Nazwa | Kategoria | Cena | Stock |
|-----|-------|-----------|------|-------|
| COFFEE-001 | Lavazza Qualità Oro | Kawa | 45.99 | 50 |
| COFFEE-002 | Illy Classico | Kawa | 52.99 | 35 |
| COFFEE-003 | Kimbo Napoletano | Kawa | 38.99 | 40 |
| WINE-001 | Barahonda Organic Barrica | Wina | 49.99 | 25 |
| WINE-002 | Nero d'Avola Sicilia DOC | Wina | 39.99 | 30 |
| WINE-003 | Chianti Classico DOCG | Wina | 69.99 | 15 |
| WINE-004 | Vinho Verde DOC | Wina | 29.99 | 40 |
| SWEET-001 | Panettone Classico | Słodycze | 89.99 | 20 |
| SWEET-002 | Amaretti Morbidi | Słodycze | 24.99 | 45 |
| DELI-001 | Olio Extra Vergine Toscano | Delikatesy | 79.99 | 18 |
| DELI-002 | Aceto Balsamico di Modena | Delikatesy | 34.99 | 30 |

---

## 6. Produkty & dane statyczne

### Katalog danych winnych

Plik: `apps/web/src/lib/data/products/wineData.ts`

Zawiera interfejs `WineDetails` z pełną specyfikacją:

```typescript
interface WineDetails {
  // Identyfikacja
  grape: string              // "60% Monastrell (40-letnie) + 40% Syrah (20-letnie)"
  grapeShort: string         // "Monastrell, Syrah"
  alcohol: string            // "14,5%"
  vintage: string            // "2021"
  appellation: string        // "D.O. Yecla"

  // Profil (0-100)
  bodyValue: number          // 80
  tanninsValue: number       // 60
  acidityValue: number       // 58
  sweetnessValue: number     // 15

  // Etykiety
  bodyLabel: string          // "Pełne, aksamitne"
  tanninsLabel: string       // "Miękkie, dojrzałe, jedwabiste"
  acidityLabel: string       // "Żywa, orzeźwiająca"
  sweetnessLabel: string     // "Wytrawne, lekki akcent dębiny"

  // Degustacja
  tasting: {
    eye: string              // Opis wizualny
    nose: string             // Opis aromatyczny
    palate: string           // Opis smakowy
  }

  // Terroir
  winery: string             // "Bodegas Barahonda"
  wineryDescription: string  // Pełna narracja (multi-paragraph)
  established: string        // "1925 / 2006" (kafelki — krótko)
  altitude: string           // "700–800 m n.p.m." (kafelki — krótko)
  soil: string               // "Wapień, piasek, glina" (kafelki — krótko)
  climate: string            // "Kontynentalny" (kafelki — krótko)
  vinification: string       // Opis procesu winifikacji

  // Serwowanie
  servingTemp: string        // "16–18°C"
  decanting: string          // "30–45 min — otwiera dymne nuty"
  agingPotential: string     // "7–8 lat od zbioru"
  glassType: string          // "Bordoski (duży, otwarty)"

  // Nagrody
  awards: Array<{
    year: string
    title: string
    source: string
  }>

  // Food pairing
  foodPairing: Array<{
    emoji: string
    name: string
    description: string
  }>

  // Certyfikaty
  isOrganic: boolean
  isVegan: boolean
  organicCertBody: string    // "CAERM (ES-ECO-024-MU)"
}
```

### Dostępne wpisy w katalogu

| Slug | Wino | Status |
|------|------|--------|
| `barahonda-organic-barrica` | Barahonda Organic Barrica | ✅ Pełne dane (terroir, tasting, awards, pairing) |
| *(inne)* | — | ⬜ Fallback na `defaultWineDetails` |

### Flagi krajów

Folder: `apps/web/public/assets/flags/`

Automatyczne mapowanie przez `countryCodeMap`:
```typescript
"Hiszpania" → "es" → /assets/flags/es.png
"Włochy"    → "it" → /assets/flags/it.png
"Francja"   → "fr" → /assets/flags/fr.png
"Portugalia"→ "pt" → /assets/flags/pt.png
// ... 20+ krajów
```

**Status:** Folder istnieje, pliki PNG do dodania ręcznie.

---

## 7. Sklep WWW

### Routing

| Route | Komponent | Opis |
|-------|-----------|------|
| `/` | `HomePage` | Hero + featured products + sekcje |
| `/sklep` | `ShopClient` | Lista wszystkich produktów |
| `/sklep/[category]` | `ShopClient` | Filtrowanie po kategorii (kawa/wino/slodycze/delikatesy) |
| `/sklep/[category]/[slug]` | `ProductClient` | Strona produktu |

### Strona produktu winnego (WineProductView)

727 linii — premium design z sekcjami:

1. **Hero** — zdjęcie butelki z parallax, dekoracje, badge organic/vegan
2. **Info** — pills (origin + flaga, szczep, alkohol), krótki opis
3. **Koszyk** — quantity selector, CTA "Dodaj do koszyka", cena/porównanie
4. **Profil Wina** — animowane paski (ciało/taniny/kwasowość/słodycz 0-100%)
5. **Degustacja** — zakładki Oko/Nos/Podniebienie z ikonami
6. **Historia & Terroir** — narracja winnicy, flaga, link do encyklopedii
7. **Terroir Grid** — kafelki: wysokość, rok założenia, gleba, klimat
8. **Nagrody** — timeline z ocenami krytyków i medalami
9. **Certyfikaty** — organic/vegan badges z opisem
10. **Food Pairing** — karty z emoji i opisem
11. **Rytuał Podania** — temperatura, dekantacja, potencjał leżakowania

### Koszyk

- **State:** React Context + localStorage (persist across sessions)
- **Lokalizacja:** `CartContext.tsx` — `addToCart`, `removeFromCart`, `updateQuantity`
- **⚠️ Problem:** `WineProductView.handleAddToCart` robi `console.log` zamiast wywoływać `useCart().addToCart`

### Filtry kaskadowe (wina)

```
Kraj (origin_country) → Region (origin_region) → Szczep (grape_variety)
```

Implementacja w `productService.ts` z `unnest()` + `CROSS JOIN` dla wielowartościowych pól (np. "Monastrell, Syrah" → dwa oddzielne filtry).

---

## 8. WebAdmin Panel

### Dostęp

| Parametr | Wartość |
|----------|---------|
| **URL** | `ilbuoncaffe.pl/admin/*` |
| **Auth** | httpOnly JWT cookie + Edge Middleware |
| **Nowa domena?** | NIE — ten sam deploy Next.js |
| **robots.txt** | `Disallow: /admin` |
| **SEO** | `robots: noindex, nofollow` w layout |

### Menu (9 pozycji, ~36 route'ów)

| # | Pozycja | Ikona | Rozwinięcia | Route |
|---|---------|-------|-------------|-------|
| 1 | **Dashboard** | `LayoutDashboard` | — | `/admin` |
| 2 | **Zamówienia** | `ShoppingBag` | Wszystkie, Do realizacji, Allegro, Zwroty | `/admin/orders` |
| 3 | **Produkty** | `Package` | Lista, Dodaj, Kategorie, Stany, Wine Editor | `/admin/products` |
| 4 | **Allegro** | `ShoppingCart` | Mapowanie, Sync, Logi, API settings | `/admin/allegro` |
| 5 | **Finanse** | `Wallet` | Transakcje P24, Raporty, Faktury, Wg kategorii | `/admin/finance` |
| 6 | **Klienci** | `Users` | Lista, RODO panel | `/admin/customers` |
| 7 | **Treści** | `FileText` | Strony, Encyklopedia, Banery, Legal | `/admin/content` |
| 8 | **Audyt & RODO** | `Shield` | Dziennik, Zgody, Retencja, Rejestr | `/admin/audit` |
| 9 | **Ustawienia** | `Settings` | Ogólne, Admini, Bezpieczeństwo, P24, Email, Backup | `/admin/settings` |

Pełna specyfikacja: `docs/WEBADMIN_MENU.md`

### Status implementacji

| Element | Status |
|---------|--------|
| Route skeleton (36 placeholder pages) | ✅ Gotowe |
| Middleware auth (produkcyjny JWT) | ✅ Gotowe |
| Admin layout + sidebar | ⬜ Czeka na UI design |
| Dashboard | ⬜ Czeka na UI design |
| Moduły (zamówienia, produkty, ...) | ⬜ Czeka na UI design |

---

## 9. API (Hono Workers)

### Rola po wdrożeniu WebAdmin

Hono Workers **nie obsługują admina** — admin korzysta z Server Actions (bezpośredni SQL). Workers zajmują się tylko external traffic:

| Rola | Endpointy | Opis |
|------|-----------|------|
| **Public REST** | `GET /products`, `POST /cart`, `POST /orders` | Klient sklepu (browse, checkout) |
| **Webhooks** | `POST /webhooks/p24`, `POST /webhooks/allegro` | Callbacki płatności i marketplace |
| **Cron** | `allegro-poll` (60s), `rodo-cleanup` (weekly) | Polling zamówień Allegro, anonimizacja |

### Konfiguracja

```jsonc
// wrangler.jsonc
{
  "name": "il-buon-caffe-api",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-01",
  "triggers": {
    "crons": ["*/1 * * * *"]  // co minutę (Allegro polling)
  }
}
```

### Bindings

| Binding | Typ | Użycie |
|---------|-----|--------|
| `HYPERDRIVE` | Hyperdrive | Connection pooling → Neon |
| `SESSION_KV` | KV | Cart state, rate limits (TTL: 24h) |
| `CATALOG_KV` | KV | Products JSON cache (TTL: 1h) |
| `IMAGES_R2` | R2 | Zdjęcia produktów |

---

## 10. Integracje zewnętrzne

### Przelewy24

| Parametr | Wartość |
|----------|---------|
| **Flow** | Redirect → P24 hosted page → webhook callback |
| **Weryfikacja** | SHA384 CRC (server-side) |
| **Obsługa** | Hono Worker (`POST /webhooks/p24`) |
| **Statusy** | `pending` → `paid` → (fulfillment) → `completed` |
| **Waluta** | PLN |

### Allegro REST API

| Parametr | Wartość |
|----------|---------|
| **Mapowanie** | 1:1 SKU ↔ Allegro offerId (`allegro_offer_mapping`) |
| **Sync zakres** | Stock (bidirectional), ceny (shop → Allegro), zamówienia (Allegro → shop) |
| **Polling** | Cron Worker co 60s (nowe zamówienia) |
| **Auth** | OAuth2 client credentials → `allegro_credentials` tabela |
| **Circuit breaker** | Po 3 failures → 5 min pause → retry. Zapobiega kaskadowym awariom |
| **Environment** | `sandbox` / `production` (przełączane w settings) |
| **Rate limiting** | Debounce stock updates (batch po 10s), respektuje Allegro rate limits |

### Resend (Email)

| Parametr | Wartość |
|----------|---------|
| **Użycie** | Potwierdzenie zamówienia, wysyłka tracking, reset hasła |
| **Limit** | 100 emaili/dzień (Free Tier) |
| **Trigger** | Hono Worker po webhook P24 → `order.status = paid` |

---

## 11. Bezpieczeństwo

### Model zagrożeń (1-osobowy sklep)

| Zagrożenie | Mitygacja |
|------------|-----------|
| **Brute-force login** | Cloudflare Turnstile (anty-bot) + rate limit (5 prób / 15 min) |
| **Token theft** | httpOnly + Secure + SameSite=Strict cookie, path: /admin |
| **SQL injection** | Drizzle ORM — parametryzowane zapytania, zero raw SQL |
| **XSS** | React auto-escaping + CSP headers |
| **CSRF** | Next.js Server Actions mają wbudowany CSRF token |
| **Unauthorized admin access** | 4 warstwy: Cloudflare WAF → Edge Middleware JWT → Server Action re-verify → DB |
| **Data leak** | RODO: anonimizacja po retencji, szyfrowanie at-rest (Neon), TLS in-transit |
| **Allegro token leak** | Credentials w DB (nie .env), refresh token rotation |
| **R2 unauthorized access** | Signed URLs z 5 min TTL, worker-side auth |

### Warstwy auth (WebAdmin)

```
Żądanie: ilbuoncaffe.pl/admin/*
         │
    ┌─ Warstwa 1: Cloudflare WAF ─────────────────┐
    │  Rate limiting, bot protection, geo-blocking │
    └──────────────────────────────────────────────┘
         │
    ┌─ Warstwa 2: Edge Middleware ─────────────────┐
    │  JWT verify (HS256), role: admin, exp check  │
    │  Sliding window refresh (7d TTL, 1h refresh) │
    │  Brak cookie → redirect /admin/login         │
    └──────────────────────────────────────────────┘
         │
    ┌─ Warstwa 3: Server Action ───────────────────┐
    │  Re-verify JWT (nie ufa middleware)           │
    │  Audit log: admin_id, action, IP, timestamp  │
    │  CSRF token (Next.js built-in)               │
    └──────────────────────────────────────────────┘
         │
    ┌─ Warstwa 4: Database ────────────────────────┐
    │  Drizzle parametrized queries                │
    │  Neon TLS encryption in-transit              │
    └──────────────────────────────────────────────┘
```

### Env variables

| Zmienna | Gdzie | Opis |
|---------|-------|------|
| `DATABASE_URL` | `.env` (web) | Neon connection string (pooled) |
| `DIRECT_URL` | `.env` (web) | Neon direct (migrations only) |
| `ADMIN_JWT_SECRET` | `.env` (web) | HS256 secret for admin sessions |
| `ALLEGRO_*` | DB table | Client ID/Secret, tokens (nie w .env!) |
| `P24_MERCHANT_ID` | `.env` (api) | Przelewy24 merchant |
| `P24_CRC_KEY` | `.env` (api) | SHA384 CRC verification |
| `RESEND_API_KEY` | `.env` (api) | Email API key |
| `R2_*` | Wrangler bindings | Automatyczne przez CF |

---

## 12. RODO / GDPR

### Wymagania prawne (sklep PL)

| Artykuł | Wymaganie | Implementacja |
|---------|-----------|---------------|
| **Art. 6** | Podstawa prawna przetwarzania | `consent_type` enum: marketing, analytics, necessary |
| **Art. 7** | Dowód zgody | `user_consents` tabela: IP, timestamp, granted/withdrawn |
| **Art. 12-14** | Informowanie | Polityka prywatności (wersjonowana w `legal_documents`) |
| **Art. 15** | Prawo dostępu | WebAdmin → eksport danych klienta (JSON) |
| **Art. 17** | Prawo do usunięcia | WebAdmin → anonimizacja (hash email, null name/phone) |
| **Art. 20** | Przenoszenie danych | WebAdmin → eksport CSV/JSON |
| **Art. 25** | Privacy by design | Minimalizacja danych, retencja, pseudonimizacja |
| **Art. 30** | Rejestr czynności | `audit_log` tabela + WebAdmin widok |
| **Art. 33** | Zgłaszanie naruszeń | Audit log z alertami (72h deadline) |

### Schema RODO w bazie

```sql
-- users
gdpr_consents_given_at  TIMESTAMP   -- kiedy zaakceptował
gdpr_data_request_at    TIMESTAMP   -- kiedy poprosił o dane
gdpr_anonymized_at      TIMESTAMP   -- kiedy zanonimizowany
gdpr_retention_days     INTEGER     -- 730 (2 lata default)

-- user_consents
user_id, consent_type, granted_at, ip_address, user_agent, withdrawn_at

-- legal_documents
type (privacy_policy|terms|cookies), version, content, effective_from, is_current
```

### Automatyczna anonimizacja

Cron Worker (weekly):
```sql
UPDATE users
SET name = 'ANONIMIZED', phone = NULL, email = hash(email),
    anonymized_at = NOW()
WHERE gdpr_retention_days IS NOT NULL
  AND created_at + gdpr_retention_days * INTERVAL '1 day' < NOW()
  AND anonymized_at IS NULL
```

---

## 13. Infrastruktura & Deploy

### Środowiska

| Środowisko | Branch | DB | URL |
|------------|--------|-----|-----|
| **Production** | `main` | Neon `main` | `ilbuoncaffe.pl` |
| **Development** | `dev` | Neon `dev` | `localhost:3000` |

### CI/CD Pipeline

```
git push main
    │
    ▼
Turborepo build (parallel)
    ├── apps/web: next build → Cloudflare Pages
    └── apps/api: wrangler deploy → Cloudflare Workers
    │
    ▼
Cloudflare Pages auto-deploy
    ├── SSR routes → Edge Functions
    ├── Static assets → CDN (global)
    └── ISR → Cache API (stale-while-revalidate)
```

### Koszty szacunkowe

| Usługa | Free Tier | Przy 100 zamówień/mies. |
|--------|-----------|------------------------|
| Cloudflare Pages | 100k req/day, unlimited BW | $0 |
| Cloudflare Workers | 100k req/day | $0 |
| Cloudflare KV | 100k reads/day, 1k writes/day | $0 |
| Cloudflare R2 | 10 GB, 1M reads/mies | $0 |
| Neon PostgreSQL | 0.5 GB, 1 branch | $0 |
| Resend | 100 emails/day | $0 |
| **Razem** | | **$0/mies** |

Pierwszy koszt dopiero przy: >100k req/day LUB >0.5 GB DB LUB >100 emails/day.

---

## 14. Konwencje & zasady

### Kod

| Zasada | Szczegół |
|--------|----------|
| **Język** | TypeScript strict (`strict: true`) |
| **Nazewnictwo plików** | `camelCase.ts` (moduły), `PascalCase.tsx` (komponenty) |
| **Nazewnictwo DB** | `snake_case` (tabele, kolumny) |
| **Eksporty** | Named exports (nie default) |
| **Importy** | Absolute paths (`@/components/...`) |
| **Komentarze** | JSDoc dla public API, inline dla „dlaczego" (nie „co") |
| **Commit messages** | Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:` |

### Architektura

| Zasada | Szczegół |
|--------|----------|
| **Source of truth** | `apps/web/src/db/schema.ts` — jedyny schemat DB |
| **Typy** | Przy konsumencie — nie w shared package |
| **Server Actions** | Dla WebAdmin (direct DB), NIE dla public API |
| **Cache** | KV dla hot data (session, catalog), Cache API dla responses |
| **Secrets** | `.env` lokalne, Cloudflare dashboard (prod). Allegro credentials w DB |
| **Images** | R2 + Image Worker (auto WebP/AVIF), signed URLs |

### UI/UX

| Zasada | Szczegół |
|--------|----------|
| **Design** | Mobile-first, warm palette (cream/wine-red/brown) |
| **Fonts** | Playfair Display (headings), system sans (body) |
| **Animacje** | Motion (Framer), scroll-triggered, `prefers-reduced-motion` respected |
| **Ikony** | Lucide React — spójny set |
| **Responsive** | 3 breakpoints: mobile (<768), tablet (768-1024), desktop (>1024) |

---

## 15. Znane problemy & dług techniczny

### Priorytet: Wysoki

| # | Problem | Plik | Opis |
|---|---------|------|------|
| 1 | **Koszyk nie podłączony w WineProductView** | `WineProductView.tsx` | `handleAddToCart` robi `console.log` zamiast `useCart().addToCart()` |
| 2 | **Brak flag w /assets/flags/** | `public/assets/flags/` | Folder pusty — `CountryFlag` zwraca 404 |
| 3 | **Jedyny produkt w wineData** | `wineData.ts` | Tylko Barahonda — inne wina → generyczny fallback |

### Priorytet: Średni

| # | Problem | Plik | Opis |
|---|---------|------|------|
| 4 | **Duplikacja schematu** | `packages/db/` vs `apps/web/src/db/` | Dwa schematy — `apps/web` jest source of truth |
| 5 | **Duplikacja typów** | `packages/types/` vs `apps/web/src/types.ts` | Typy powinny być przy konsumencie |
| 6 | **Folder apps/admin** | `apps/admin/` | Pusty Electron — do usunięcia |
| 7 | **image vs imageUrl** | `types.ts` | Legacy `image` + nowy `imageUrl` — ujednolicić |

### Priorytet: Niski

| # | Problem | Opis |
|---|---------|------|
| 8 | Brak testów | Zero unit/integration tests |
| 9 | Brak CI/CD pipeline | Brak GitHub Actions / CF Pages auto-deploy |
| 10 | Brak error boundary | Brak globalnego error handling w React |
| 11 | Brak SEO meta tags | Brak Open Graph, Twitter Cards |
| 12 | Brak sitemap.xml | Brak auto-generated sitemap |

---

## 16. Roadmapa

### Faza 1: Stabilizacja (obecna)
- [x] Schema DB (12 tabel)
- [x] Sklep WWW (lista, filtry kaskadowe, strona produktu)
- [x] WineProductView (premium design, 11 sekcji)
- [x] Statyczny katalog danych winnych (wineData.ts)
- [x] 3-warstwowy resolver wine_details (DB > catalog > default)
- [x] WebAdmin route skeleton (36 pages)
- [x] Middleware auth (production JWT)
- [x] Dokumentacja (PROJECT.md, ARCHITECTURE.md, WEBADMIN_MENU.md)
- [ ] Flagi krajów (PNG files)
- [ ] Podłączenie koszyka w WineProductView
- [ ] Usunięcie apps/admin (Electron)
- [ ] Konsolidacja packages/db i packages/types

### Faza 2: WebAdmin MVP
- [ ] UI design (user dostarcza)
- [ ] Admin shell + sidebar
- [ ] Dashboard (KPI, alerty)
- [ ] Zarządzanie produktami (CRUD + Wine Editor)
- [ ] Zarządzanie zamówieniami (lista, statusy)
- [ ] Stany magazynowe (podgląd, ręczna korekta)

### Faza 3: Integracje
- [ ] Przelewy24 (checkout flow + webhook)
- [ ] Allegro sync (stock, ceny, zamówienia)
- [ ] Resend (email transaktowe)
- [ ] R2 image upload (admin → signed URL → R2)

### Faza 4: Compliance & Polish
- [ ] RODO panel (eksport, anonimizacja, rejestr)
- [ ] Legal documents (wersjonowane polityki)
- [ ] Audit log (Art. 30)
- [ ] SEO (OG tags, sitemap, structured data)
- [ ] Performance (Lighthouse 95+)
- [ ] Testy (unit + e2e)

### Faza 5: Growth
- [ ] Encyklopedia win (CMS)
- [ ] Program lojalnościowy
- [ ] Rekomendacje AI (wine pairing)
- [ ] POS integration (stacjonarnie)
- [ ] Multi-language (EN)

---

> **Ostatnia aktualizacja:** 2026-02-21  
> **Maintainer:** Single developer  
> **Source of truth:** Ten plik (`docs/PROJECT.md`)