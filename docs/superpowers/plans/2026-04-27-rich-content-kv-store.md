# Rich Content Store — Wine/Winery Editable Content

**Data:** 2026-04-27
**Cel:** Edytowalna "quasi-statyczna" treść (profil smaku %, nuty oko/nos/podniebienie, nagrody, food pairing, rytuał podania, opisy winnic) bez odczytu z Neon w runtime.

---

## Problem

DB (Neon) ma trzymać tylko dane dynamiczne: cena, stock, nazwa, krótki opis, rocznik, SKU. Reszta treści produktowej zmienia się rzadko (raz na miesiące/lata) — odczyt z Postgresa to niepotrzebny budzik Neona + opóźnienie. Treść winnic dodatkowo współdzielona między `encyklopedia/wino/regiony` a stroną produktu.

## Architektura — KV-first content store

```
Edytor (admin)  →  POST /api/admin/content/*  →  R2 (źródło prawdy, JSON)  +  KV (cache edge)
                                                          ↓
                                       Storefront → GET /api/content/* (KV first, R2 fallback)
                                                          ↓
                                                  Next.js Server Component
                                                  (ISR + KV TTL — bez DB)
```

**Klucz:** treść NIGDY nie ląduje w tabelach Postgresa. R2 = źródło prawdy (wersjonowanie, backup), KV = szybki odczyt edge'owy. Neon nieruszany.

## Zakres treści

### A. Wine Content (per-SKU)
Plik: `wine-content/<sku>.json` w R2 + klucz KV `wine_content:<sku>`

```ts
interface WineRichContent {
  sku: string
  // Profil smaku w %
  flavorProfile?: {
    body: number       // 0-100
    sweetness: number
    acidity: number
    tannin: number
    alcohol: number
  }
  // Nuty degustacyjne (markdown)
  tastingNotes?: {
    eye?: string       // "Głęboka rubinowa barwa..."
    nose?: string      // "Aromat czarnej wiśni..."
    palate?: string    // "Pełne ciało, miękkie taniny..."
  }
  awards?: { name: string; year?: number; rank?: string }[]
  pairing?: { dish: string; note?: string }[]
  ritual?: string                  // Markdown — rytuał podania
  servingTemp?: string
  decanting?: string
  wineryRef?: string               // FK → winery slug
  updatedAt: string
  version: number                  // optimistic concurrency
}
```

### B. Winery Content (shared)
Plik: `wineries/<slug>.json` w R2 + klucz KV `winery:<slug>`

```ts
interface WineryContent {
  slug: string
  name: string
  region: string
  country: string
  founded?: number
  story?: string                   // Markdown — pełny opis (encyklopedia)
  shortStory?: string              // Skrót (strona produktu)
  philosophy?: string
  vineyards?: { name: string; hectares?: number; soil?: string }[]
  images?: { url: string; caption?: string }[]
  website?: string
  updatedAt: string
  version: number
}
```

Strona produktu: `wineRichContent.wineryRef` → fetch winery JSON → render skrót.
Encyklopedia: ten sam plik → render pełny.

## Implementacja — kroki

### 1. Infra (wrangler.json — apps/api)
- Dodaj namespace KV: `CONTENT_KV` (binding)
- R2 bucket `il-buon-caffe-content` (binding `CONTENT_R2`) — może współdzielić z istniejącym media bucket pod prefiksem `content/`

### 2. Lib `apps/api/src/lib/content-store.ts`
```ts
export async function getWineContent(env, sku): Promise<WineRichContent | null>
export async function putWineContent(env, sku, data): Promise<void>  // R2 + KV invalidate
export async function getWinery(env, slug): Promise<WineryContent | null>
export async function putWinery(env, slug, data): Promise<void>
```
Wzorzec: `KV.get` → hit zwróć; miss → `R2.get` → set KV (TTL 1h) → return. Mutacja: `R2.put` (źródło prawdy) → `KV.delete` (cache invalidate, TTL na nowy odczyt).

### 3. Schema typów (`packages/types/index.ts`)
Dodaj `WineRichContent`, `WineryContent`, `FlavorProfile`, `TastingNotes`. **Usuń duplikaty** z `WineDetails` (awards, pairing, servingTemp, aging) — te idą do RichContent. `WineDetails` w DB zostaje minimalny (grape, vintage, region, alcohol) jako część filtrów.

### 4. API public (`apps/api/src/routes/content.ts`)
- `GET /api/content/wine/:sku` — KV first, public, cache-control: `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`
- `GET /api/content/winery/:slug` — j.w.
- `GET /api/content/wineries` — lista (osobny KV key `wineries:index`)

### 5. API admin (`apps/api/src/routes/admin/content.ts`)
- `PUT /api/admin/content/wine/:sku` — Zod walidacja → `putWineContent`
- `PUT /api/admin/content/winery/:slug`
- `DELETE /api/admin/content/wine/:sku`
- `POST /api/admin/content/wine/:sku/version/restore` — z R2 versioning
- `GET /api/admin/content/wine/:sku/history` — listing wersji R2

R2 versioning: każdy `putObject` zachowuje wersję (włącz na bucketcie). Plik aktualny = `wine-content/<sku>.json`, archiwum = automatyczne wersje R2 + `wine-content/_archive/<sku>/<timestamp>.json` jeśli chcesz pełną kontrolę.

### 6. Admin UI (`apps/web/src/admin/views/products/`)
W `ProductEditorView` dodaj zakładkę **"Treść premium"**:
- Komponenty: `FlavorProfileSliders` (5 suwaków 0-100), `TastingNotesEditor` (3 textarea + markdown preview), `AwardsEditor` (lista), `PairingEditor` (lista), `RitualEditor` (markdown), `WinerySelector` (combobox z `wineries:index`)
- Submit: `adminApiClient.updateWineContent(sku, payload)` → API admin
- Auto-save lub explicit "Zapisz treść" — odseparowane od zapisu produktu (oddzielne mutacje)

Osobna sekcja `apps/web/src/admin/views/wineries/`:
- `WineryListView` (DataTable, lista z `wineries:index`)
- `WineryEditorView` (formularz: name, region, story markdown, philosophy, vineyards array, images upload R2)

### 7. Storefront — strona produktu
`apps/web/src/app/sklep/[slug]/page.tsx`:
- Server Component fetchuje równolegle: `getProduct(slug)` (DB — cena/stock/nazwa) + `fetch(/api/content/wine/<sku>)` (KV — treść)
- Jeśli `wineryRef` → kolejny `fetch(/api/content/winery/<slug>)` 
- Cache: `next: { revalidate: 600, tags: ['wine-content', sku] }` — invalidacja przez `revalidateTag` po edycji w adminie

### 8. Storefront — encyklopedia winnic
- `/encyklopedia/wino/winiarnie` (nowa) — lista `wineries:index`
- `/encyklopedia/wino/winiarnie/[slug]` — pełna treść z `winery:<slug>`
- `/encyklopedia/wino/regiony/[slug]` — może agregować winnice z regionu (z indexu)

### 9. Migracja istniejących danych
Skrypt `apps/api/scripts/migrate-wine-content-to-kv.ts`:
- Czytaj `products` z DB gdzie `categoryId = wino`
- Wyciągnij `wineDetails.{awards, pairing, servingTemp, aging}` + parsuj `description` jeśli ma sekcje degustacyjne
- Zapisz jako `WineRichContent` do R2/KV
- Po weryfikacji — wyczyść te pola w `wineDetails` (osobna migracja schematu)

### 10. Cache invalidation
- Po `PUT /api/admin/content/...`: KV delete + `await fetch(WEB_URL + '/api/revalidate?tag=wine-content&sku=' + sku, {headers: {Authorization}})` 
- Endpoint `apps/web/src/app/api/revalidate/route.ts` woła `revalidateTag()`

## Korzyści

- **Neon nieruszany** dla treści — tylko cena/stock/nazwa/SKU
- **Edge speed** — KV ~5ms vs Neon cold ~500ms
- **Wersjonowanie za darmo** — R2 object versioning
- **Współdzielenie** winery między encyklopedią a stroną produktu — jeden plik
- **Atomic editing** — admin edytuje treść bez locka na produkcie

## Pułapki

- KV eventual consistency (60s globalnie) — ale edytor admina po PUT robi explicit invalidate, więc OK
- R2 versioning — uważaj na koszty storage (cleanup retention np. 90 dni)
- `wineries:index` — trzymaj jako osobny KV key, aktualizuj przy każdym PUT/DELETE winery
- Markdown sanitization — render przez `react-markdown` z whitelistą (bez raw HTML)
- Zod walidacja po stronie API — limit długości pól (np. ritual ≤ 5000 znaków)

## Kolejność prac

1. Typy + lib content-store + wrangler binding (foundation)
2. API public + admin endpoints + Zod schemas
3. Admin UI: WineRichContentEditor (zakładka w produkcie)
4. Admin UI: Wineries CRUD
5. Storefront: produkt page integration + revalidate hook
6. Storefront: encyklopedia winiarnie
7. Migracja danych
8. Cleanup `WineDetails` w DB schema (drop nieużywanych pól)
