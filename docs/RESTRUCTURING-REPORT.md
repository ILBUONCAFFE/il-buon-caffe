# Il Buon Caffe — Raport z analizy, czyszczenia i restrukturyzacji projektu

**Data:** 2026-03-16
**Model:** Claude Opus 4.6 (`claude-opus-4-6`)

---

## Spis treści

1. [Cel i zakres prac](#1-cel-i-zakres-prac)
2. [Faza 1 — Analiza projektu](#2-faza-1--analiza-projektu)
3. [Faza 2 — Czyszczenie](#3-faza-2--czyszczenie)
4. [Faza 3 — Restrukturyzacja](#4-faza-3--restrukturyzacja)
5. [Naprawione bugi pre-existing](#5-naprawione-bugi-pre-existing)
6. [Weryfikacja końcowa](#6-weryfikacja-końcowa)
7. [Finalna struktura projektu](#7-finalna-struktura-projektu)
8. [Rekomendacje na przyszłość](#8-rekomendacje-na-przyszłość)

---

## 1. Cel i zakres prac

Przeprowadzono trzyfazową analizę i restrukturyzację monorepo **Il Buon Caffe** — platformy e-commerce dla luksusowych produktów spożywczych (kawa, wino, włoskie delikatesy), targetowanej na rynek polski.

| Faza | Cel | Status |
|------|-----|--------|
| Faza 1 | Pełna analiza struktury, plików, zależności, obserwacje | Ukończona |
| Faza 2 | Usunięcie martwego kodu, duplikatów, zbędnych zależności | Ukończona |
| Faza 3 | Reorganizacja struktury katalogów, aktualizacja importów | Ukończona |

---

## 2. Faza 1 — Analiza projektu

### 2.1 Architektura monorepo

```
il-buon-caffe-monorepo/
├── apps/web/      → Next.js 16.1.6 (App Router, React 19, Tailwind CSS 4)
├── apps/api/      → Cloudflare Workers (Hono.js, Drizzle ORM)
├── apps/admin/    → Pusty katalog (nigdy nie zaimplementowany)
├── packages/db/   → Drizzle ORM schema + client (Neon PostgreSQL)
├── packages/types/→ Współdzielone typy TypeScript
├── packages/ui/   → Współdzielone komponenty React (0 importów)
└── docs/          → Dokumentacja architektoniczna
```

### 2.2 Kluczowe odkrycia

#### Krytyczny problem: Zduplikowany schemat bazy danych
Wykryto **dwa rozbieżne schematy** bazy danych:
- `packages/db/schema/index.ts` — wersja 2.0 (624 linie) — starszy, niekompletny
- `apps/web/src/db/schema.ts` — wersja 2.1 (539 linii) — nowszy, z dodatkowymi polami

Schematy różniły się w:
- Enum `stockChangeReasonEnum` i `retentionStatusEnum` (tylko web)
- Pola `originCountry`, `originRegion`, `grapeVariety`, `wineDetails` w tabeli `products` (tylko web)
- Pola `taxAmount`, `deliveredAt`, `p24MerchantId`, `retentionStatus` w tabeli `orders` (tylko web)
- Kolumna `anonymized` w tabeli `users` (tylko web)
- 4 indeksy filtrów winnych (tylko web)

#### Martwe pliki i katalogi
- 6 katalogów narzędzi IDE/AI: `.VSCodeCounter/`, `.cursor/`, `.zencoder/`, `.zenflow/`, `.agent/`, `agent-skill-library/`
- 4 jednorazowe skrypty naprawcze: `apply-owner-required-fixes.cjs`, `verify-*.cjs`
- 3 skrypty analizy dostępności: `contrast.js`, `find_a11y.cjs`, `a11y_issues.txt`
- 2 skrypty zamiany kolorów: `replace-colors.mjs`, `replace_colors.py`
- 2 nieużywane komponenty: `PageTransition.tsx`, `Magnetic.tsx`
- 1 plik diagnostyczny w kodzie: `## Chat Customization Diagnostics.md`
- Zduplikowane lock-files: `apps/web/pnpm-lock.yaml`, `apps/web/package-lock.json`, `apps/api/package-lock.json`

#### Zbędne zależności
- `geist` — zainstalowany, nigdzie nie importowany
- `react-toastify` — zastąpiony własnym NotificationProvider
- `autoprefixer` — zbędny z Tailwind CSS 4
- `prettier` (root) — brak konfiguracji, nie używany
- `@types/bcryptjs` w dependencies zamiast devDependencies (root)

#### Puste katalogi
- `apps/admin/` — zaplanowany ale nigdy nie zaimplementowany
- `packages/ui/` — zero importów w całym monorepo
- `apps/web/src/lib/data/encyclopedia/{grapes,producers,regions}/`
- `apps/web/src/lib/data/encyclopedia/pairings/`

---

## 3. Faza 2 — Czyszczenie

### 3.1 Konsolidacja schematu bazy danych

**Najważniejsza zmiana projektu.** Scalenie dwóch rozbieżnych schematów w jedną kanoniczną wersję 3.0:

**Plik:** `packages/db/schema/index.ts`

Dodane z web do kanonicznego schematu:
- Enumy: `stockChangeReasonEnum`, `retentionStatusEnum`, `allegroEnvEnum`
- Akcje audytu: `'update_stock'`, `'password_reset'`
- `users.anonymized: boolean`
- `categories.metaTitle`, `categories.metaDescription`, indeks `activeIdx`
- `products.currency`, `.originCountry`, `.originRegion`, `.grapeVariety`, `.wineDetails`, `.coffeeDetails`, `.metaTitle`, `.metaDescription`, 4 indeksy filtrów winnych
- `orders.taxAmount`, `.deliveredAt`, `.p24MerchantId`, `.p24TransactionId`, `.p24Status`, `.retentionStatus`, indeks `retentionIdx`
- `orderItems.imageUrl`
- Eksportowane typy inferencji: `DbUser`, `NewDbUser`, `DbCategory`, `NewDbCategory`, `DbProduct`, `NewDbProduct`, `DbOrder`, `NewDbOrder`, `DbOrderItem`, `NewDbOrderItem`

**Plik:** `apps/web/src/db/schema.ts` — zredukowany z 539 linii do 1-linijkowego re-exportu:
```typescript
export * from '@repo/db';
```

**Plik:** `apps/web/src/db/index.ts` — zredukowany do cienkiego wrappera z lazy-init Proxy:
```typescript
import * as schema from '@repo/db';
// ... Proxy-based lazy accessor
export const db = new Proxy({} as DbClient, { ... });
```

### 3.2 Usunięte pliki i katalogi (28 elementów)

| Kategoria | Usunięte elementy |
|-----------|-------------------|
| **IDE/AI configs** | `.VSCodeCounter/`, `.cursor/`, `.zencoder/`, `.zenflow/`, `.agent/`, `agent-skill-library/` |
| **Build artifacts** | `apps/web/tsconfig.tsbuildinfo`, `.vite/` |
| **Skrypty jednorazowe** | `apply-owner-required-fixes.cjs`, `verify-advisor-security.cjs`, `verify-owner-required-fixes.cjs` |
| **Skrypty analizy** | `contrast.js`, `find_a11y.cjs`, `a11y_issues.txt`, `replace-colors.mjs`, `replace_colors.py` |
| **Nieużywane komponenty** | `PageTransition.tsx`, `Magnetic.tsx` |
| **Plik diagnostyczny** | `## Chat Customization Diagnostics.md` (w katalogu Shop) |
| **Zduplikowane konfigi** | `apps/web/drizzle.config.ts`, `apps/web/pnpm-lock.yaml`, `apps/web/package-lock.json`, `apps/api/package-lock.json` |
| **Puste pakiety/aplikacje** | `packages/ui/` (cały), `apps/admin/` (pusty) |
| **Puste katalogi danych** | `lib/data/encyclopedia/{grapes,producers,regions}/`, `lib/data/encyclopedia/pairings/` |
| **Windows artifacts** | `desktop.ini` |

### 3.3 Usunięte zależności

| Plik | Usunięte |
|------|----------|
| `apps/web/package.json` | `geist`, `react-toastify`, `autoprefixer` |
| `package.json` (root) | `prettier` z devDependencies |

### 3.4 Przeniesione zależności

| Plik | Zmiana |
|------|--------|
| `package.json` (root) | `@types/bcryptjs` z dependencies → devDependencies |

### 3.5 Dodane zależności

| Plik | Dodane |
|------|--------|
| `apps/web/package.json` | `"@repo/db": "*"` (workspace dependency) |

### 3.6 Usunięte skrypty

| Plik | Usunięte skrypty |
|------|------------------|
| `apps/web/package.json` | `db:generate`, `db:push`, `db:studio` (skonsolidowane do packages/db) |

### 3.7 Oczyszczenie typów

**Plik:** `apps/web/src/types.ts` — usunięto ~90 linii martwych typów:
- `Variant`, `AllegroLink` — nigdy nie importowane
- `Order`, `OrderItem` — zastąpione przez `admin-api.ts` typy
- `DashboardStats`, `RecentActivity`, `OrderSummary` — zduplikowane z admin-api
- `ApiResponse` — zastąpiony przez dedykowane response types

Zachowano: `Product`, `CartItem`, `CafeMenuItem`, `Article`, `Category`/`ProductCategory`

### 3.8 Oczyszczenie komponentów

**Plik:** `apps/web/src/components/Shell.tsx`
- Usunięto import i wrapper `PageTransition` (komponent usunięty)

### 3.9 Aktualizacja .gitignore

Dodano brakujące wpisy:
```
desktop.ini, Thumbs.db, *.tsbuildinfo, .turbo, .next,
.wrangler, .vite, .cursor, .zencoder, .zenflow, .VSCodeCounter
```

### 3.10 Konfiguracja TypeScript

**Plik:** `apps/web/tsconfig.json` — dodano path mappings dla pakietów monorepo:
```json
"paths": {
  "@/*": ["./src/*"],
  "@repo/db": ["../../packages/db/schema/index.ts"],
  "@repo/db/*": ["../../packages/db/*"],
  "@repo/types": ["../../packages/types/index.ts"]
}
```

---

## 4. Faza 3 — Restrukturyzacja

### 4.1 Nowy katalog `src/content/` — separacja danych statycznych od logiki

Dane statyczne (opisy win, regionów, szczepów, kaw) nie są logiką aplikacji. Przeniesienie ich z `lib/` do dedykowanego `content/` jasno komunikuje granicę: "tu są dane, nie kod."

| Poprzednia ścieżka | Nowa ścieżka | Pliki |
|---------------------|--------------|-------|
| `lib/data/products/coffeeData.ts` | `content/products/coffeeData.ts` | 1 |
| `lib/data/products/wineData.ts` | `content/products/wineData.ts` | 1 |
| `lib/wineEncyclopedia/*.ts` | `content/wineEncyclopedia/*.ts` | 14 |
| **Razem** | | **16 plików** |

**Zaktualizowane importy (9 plików):**
- `components/WineEncyclopedia/GrapeDetailClient.tsx`
- `components/WineEncyclopedia/RegionDetailClient.tsx`
- `components/WineEncyclopedia/GrapeVarietiesSection.tsx`
- `components/WineEncyclopedia/WineRegionsSection.tsx`
- `components/WineEncyclopedia/WineEncyclopediaClient.tsx`
- `components/Product/WineProductView.tsx`
- `app/encyklopedia/wino/regiony/[slug]/page.tsx`
- `app/encyklopedia/wino/szczepy/[slug]/page.tsx`
- `app/sklep/[category]/[slug]/opengraph-image.tsx`

### 4.2 Nowy katalog `components/layout/` — grupowanie komponentów layoutowych

Navbar, Footer, Shell i CartSidebar to szkielet strony — nie należą do żadnej feature-sekcji.

| Poprzednia ścieżka | Nowa ścieżka |
|---------------------|--------------|
| `components/Navbar.tsx` | `components/layout/Navbar.tsx` |
| `components/Footer.tsx` | `components/layout/Footer.tsx` |
| `components/Shell.tsx` | `components/layout/Shell.tsx` |
| `components/CartSidebar.tsx` | `components/layout/CartSidebar.tsx` |

**Zaktualizowany import:** `app/layout.tsx` — `@/components/Shell` → `@/components/layout/Shell`

### 4.3 Przeniesienie `AgeVerificationModal` do `components/ui/`

Modal weryfikacji wieku to komponent wielokrotnego użytku, nie feature-component.

| Poprzednia ścieżka | Nowa ścieżka |
|---------------------|--------------|
| `components/AgeVerificationModal.tsx` | `components/ui/AgeVerificationModal.tsx` |

**Zaktualizowany import w:** `components/layout/Shell.tsx`

### 4.4 Nowe pliki

| Plik | Cel |
|------|-----|
| `components/layout/index.ts` | Barrel export: Navbar, Footer, Shell, CartSidebar |

### 4.5 Pominięte z planu (celowo)

**Route groups `(shop)` / `(auth)`** — przeniesienie routes do grup Next.js wymaga ręcznego testowania layoutów i potencjalnie wpływa na middleware. Rekomendacja: zrobić to osobno z weryfikacją wizualną w przeglądarce.

---

## 5. Naprawione bugi pre-existing

Dwa pre-existing problemy blokowały produkcyjny build. Zostały naprawione przy okazji restrukturyzacji:

### 5.1 Martwy kod `useAnalytics` w `useDashboard.ts`

**Problem:** Hook `useAnalytics()` importował nieistniejący typ `AnalyticsResponse` i wywoływał nieistniejącą metodę `adminApi.getAnalytics()`.

**Przyczyna:** Funkcjonalność zaplanowana ale nigdy nie zaimplementowana — ani typ, ani metoda API nie istniały.

**Rozwiązanie:** Usunięto import `AnalyticsResponse` i cały hook `useAnalytics()` (linie 107–114).

### 5.2 Brakujące pole `emoji` w `WineFoodPairing`

**Problem:** Interfejs `WineFoodPairing` wymagał pola `emoji: string`, ale 15 z 17 obiektów w katalogu win nie miało tego pola. Dodatkowo używane były kategorie `'wędliny'` i `'dziczyzna'`, których nie było w union type.

**Rozwiązanie:**
- `emoji: string` → `emoji?: string` (opcjonalne)
- Dodano `'wędliny' | 'dziczyzna'` do union type `category`

---

## 6. Weryfikacja końcowa

### 6.1 TypeScript

| Metryka | Przed | Po |
|---------|-------|----|
| Błędy TS w `apps/web` | 22 | **0** |
| Błędy TS w `apps/api` | 70 | 70 (pre-existing, nie związane z restrukturyzacją) |
| Nowe błędy wprowadzone przez zmiany | — | **0** |

Błędy w `apps/api` są pre-existing i wynikają z braku tsconfig path mappings — wrangler bundler rozwiązuje je w runtime przez npm workspaces.

### 6.2 Build produkcyjny

```
Next.js 16.1.6 (Turbopack)
Compiled successfully in 5.1s
Running TypeScript ... ✓

Routes:
  ○ Static:    strona główna, sklep, kawiarnia, checkout, encyklopedia
  ● SSG:       kategorie, produkty, regiony, szczepy
  ƒ Dynamic:   produkty, opengraph, encyklopedia
```

**Wynik: BUILD SUCCESSFUL**

### 6.3 Integralność importów

| Sprawdzenie | Wynik |
|-------------|-------|
| Stale importy `@/lib/data/products/` | 0 |
| Stale importy `@/lib/wineEncyclopedia` | 0 |
| Stale importy `@/components/Shell` (bez layout/) | 0 |
| Stale importy `@/components/Navbar` (bez layout/) | 0 |
| Stale importy `@/components/AgeVerificationModal` | 0 |

---

## 7. Finalna struktura projektu

### 7.1 Statystyki

| Metryka | Przed | Po | Zmiana |
|---------|-------|----|--------|
| Pliki TS/TSX w monorepo | ~250 | 190 | -60 (-24%) |
| Katalogi/pliki IDE/AI | 6 katalogów | 0 | -100% |
| Schematy bazy danych | 2 (rozbieżne) | 1 (kanoniczny) | Konsolidacja |
| Zbędne zależności npm | 5 | 0 | -100% |
| Błędy TypeScript (web) | 22 | 0 | -100% |
| Martwe typy w types.ts | ~90 linii | 0 | Usunięte |
| Puste katalogi | 7 | 0 | -100% |

### 7.2 Drzewo katalogów `apps/web/src/`

```
src/
├── actions/                    # Server Actions (3 pliki)
│   ├── admin-auth.ts           # Admin login/logout
│   ├── auth.ts                 # User auth
│   └── products.ts             # Product queries
│
├── admin/                      # Admin panel (33 pliki)
│   ├── components/
│   │   ├── layout/             # AdminLayoutClient, Header, Sidebar, UserMenu, NotificationsPanel
│   │   ├── ui/                 # Dropdown, GlassModal, OrganicIcon
│   │   ├── CommandPalette.tsx
│   │   └── OrderDetailModal.tsx
│   ├── views/                  # Feature views
│   │   ├── Dashboard/          # Dashboard + 10 sub-components
│   │   ├── Orders/             # Orders + SortableKanbanItem
│   │   ├── Allegro/
│   │   ├── Cms/
│   │   ├── Customers/
│   │   └── Promotions/
│   ├── hooks/                  # useAnimatedCounter, useDashboard
│   ├── data/                   # adminMockData
│   ├── lib/                    # adminApiClient
│   ├── types/                  # admin-api types
│   └── utils/                  # getStatusBadge
│
├── app/                        # Next.js App Router routes (48 plików)
│   ├── layout.tsx, page.tsx, not-found.tsx, globals.css
│   ├── admin/                  # 17 route plików
│   ├── api/                    # 3 proxy routes
│   ├── account/                # 4 pliki (layout, page, orders, data-export)
│   ├── auth/                   # 1 plik
│   ├── checkout/               # 3 pliki (layout, page, payment)
│   ├── encyklopedia/           # 9 plików (main, wine, regions, grapes)
│   ├── kawiarnia/              # 1 plik
│   ├── order/                  # 2 pliki (layout, confirmation)
│   └── sklep/                  # 4 pliki (main, category, product, opengraph)
│
├── components/                 # Komponenty publicznego frontu (31 plików)
│   ├── layout/                 # [NOWY] Navbar, Footer, Shell, CartSidebar + barrel index
│   ├── ui/                     # AnimatedText, AgeVerificationModal
│   ├── Home/                   # 9 komponentów (Hero, CategoriesGrid, Featured, etc.)
│   ├── Shop/                   # ShopClient
│   ├── Product/                # ProductClient, WineProductView
│   ├── Cafe/                   # CafeClient
│   ├── Account/                # AccountClient
│   ├── Auth/                   # AuthForms
│   ├── Encyclopedia/           # EncyclopediaClient, UnderConstruction
│   ├── WineEncyclopedia/       # 5 komponentów (regions, grapes, detail views)
│   ├── Notification/           # NotificationProvider
│   └── SmoothScroll.tsx
│
├── content/                    # [NOWY] Dane statyczne (16 plików)
│   ├── products/               # coffeeData, wineData
│   └── wineEncyclopedia/       # 14 plików (basics, regions, grapes, tasting, etc.)
│
├── context/                    # React Context (1 plik)
│   └── CartContext.tsx
│
├── db/                         # Thin re-export z @repo/db (2 pliki)
│   ├── index.ts                # Lazy-init Proxy wrapper
│   └── schema.ts               # Re-export: export * from '@repo/db'
│
├── hooks/                      # Custom hooks (2 pliki)
│   ├── useFocusTrap.ts
│   └── useUxSound.ts
│
├── lib/                        # Utilities i logika (8 plików)
│   ├── api.ts                  # API client
│   ├── constants.ts
│   ├── utils.ts
│   ├── auth/                   # jwt, password, rate-limit
│   └── security/               # alerts, nonce
│
├── services/                   # Service layer (1 plik)
│   └── productService.ts
│
├── types/                      # Dodatkowe typy (2 pliki)
│   ├── filters.ts
│   └── wineEncyclopedia.ts
│
├── proxy.ts                    # API proxy config
└── types.ts                    # Product, CartItem, CafeMenuItem, Article
```

### 7.3 Drzewo katalogów `apps/api/src/`

```
src/                            # Cloudflare Workers API (30 plików)
├── index.ts                    # Hono app entry point
├── routes/                     # Route handlers
│   ├── allegro.ts, auth.ts, categories.ts, legal.ts
│   ├── orders.ts, payments.ts, products.ts, uploads.ts
│   ├── user.ts, webhooks.ts
│   └── admin/                  # Admin routes
│       ├── index.ts, audit.ts, categories.ts
│       ├── customers.ts, orders.ts, products.ts
├── middleware/                  # Middleware
│   ├── auditLog.ts, auth.ts, db.ts
│   ├── rateLimit.ts, security.ts
└── lib/                         # Shared utilities
    ├── allegro.ts, allegro-orders.ts
    ├── common-passwords.json
    ├── cookies.ts, crypto.ts
    ├── jwt.ts, password.ts, token.ts
```

### 7.4 Drzewo katalogów `packages/`

```
packages/
├── db/                          # Canonical database package (9 plików)
│   ├── schema/index.ts          # Schema v3.0 — single source of truth
│   ├── client.ts                # DB connection factory
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── migrations/              # SQL migration files
│   └── scripts/                 # DB maintenance scripts
└── types/                       # Shared TypeScript types (2 pliki)
    ├── index.ts
    └── package.json
```

---

## 8. Rekomendacje na przyszłość

### 8.1 Do rozważenia w kolejnej iteracji

| Rekomendacja | Priorytet | Opis |
|--------------|-----------|------|
| **Route groups `(shop)` / `(auth)`** | Średni | Wspólne layouty bez zmiany URL-ów. Wymaga testowania wizualnego. |
| **Naprawienie błędów TS w apps/api** | Średni | 70 pre-existing błędów — dodanie tsconfig path mappings lub refactor importów. |
| **Package-lock.json** | Niski | Brak w repozytorium — `npm install` generuje go. Warto dodać do git. |
| **Lint configuration** | Niski | Brak współdzielonej konfiguracji ESLint w packages/. |

### 8.2 Czego NIE ruszać

- **Admin panel (`src/admin/`)** — dobrze zorganizowany feature-based z views/, components/, hooks/
- **API (`apps/api/src/`)** — czysta, płaska struktura. 30 plików nie wymaga głębszego nestingu
- **Flat product model** — kluczowa decyzja architektoniczna (1:1 z Allegro). Nie tworzyć wariantów.
- **KV-first tokens** — zaszyfrowane tokeny w Cloudflare KV, backup do DB

---

*Raport wygenerowany automatycznie na podstawie trzyfazowej analizy projektu.*
*Co-authored by Claude Opus 4.6 (claude-opus-4-6)*
