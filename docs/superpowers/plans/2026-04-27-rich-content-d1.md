# Rich Content Store — D1 Edge Database

**Data:** 2026-04-27
**Cel:** Edytowalna treść premium (profil smaku %, nuty sensoryczne, nagrody, pairing, rytuał, opisy producentów) w D1 (Cloudflare SQLite edge), bez ruszania Neon w runtime. Model generyczny — obsługuje wino, kawę, delikatesy i każdą przyszłą kategorię bez nowych tabel.

---

## Architektura

```
Neon (Postgres):    cena, stock, SKU, nazwa, krótki opis, rocznik
D1 (SQLite edge):   product_content, producers, product_content_history (versioning)
KV:                 cache list endpoints (TTL 5min)
R2:                 obrazy producentów (jpg/webp)
```

D1 binding `CONTENT_DB` w `apps/api/wrangler.json`. Drugi Drizzle client (drizzle-orm/d1) — osobny schema file `packages/content-db/`.

## Schema D1

> **Zasada:** jedna tabela per encja, niezależna od kategorii produktu. Dodanie kawy/delikatesów/herbaty = zero nowych tabel — tylko nowy config kategorii w kodzie.

```sql
-- producers (winnice, plantacje kawy, producenci delikatesów…)
CREATE TABLE producers (
  slug TEXT PRIMARY KEY,
  category TEXT NOT NULL,     -- 'wine' | 'coffee' | 'delicacies' | ...
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  founded INTEGER,
  short_story TEXT,           -- skrót na stronie produktu
  story TEXT,                 -- pełny markdown encyklopedia
  philosophy TEXT,
  estate_info TEXT,           -- JSON: [{name, hectares, soil}] (winnice) lub [{name, altitude, variety}] (kawa)
  images TEXT,                -- JSON: [{url, caption}]
  website TEXT,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX producers_category ON producers(category);
CREATE INDEX producers_region ON producers(region);
CREATE INDEX producers_country ON producers(country);

-- product_content (per-SKU, generyczna dla każdej kategorii)
CREATE TABLE product_content (
  sku TEXT PRIMARY KEY,
  category TEXT NOT NULL,             -- 'wine' | 'coffee' | 'delicacies' | ...
  producer_slug TEXT REFERENCES producers(slug),

  -- Wspólne dla każdej kategorii
  awards TEXT,                        -- JSON: [{name, year, rank}]
  pairing TEXT,                       -- JSON: [{dish, note}]
  ritual TEXT,                        -- markdown (serwowanie / parzenie / podanie)
  serving_temp TEXT,

  -- Profil sensoryczny (0-100) — wymiary zależne od kategorii, JSON blob
  -- wine:       {body, sweetness, acidity, tannin, alcohol}
  -- coffee:     {acidity, body, sweetness, roast, bitterness}
  -- delicacies: {intensity, saltiness, sweetness, umami}
  profile TEXT,

  -- Nuty sensoryczne (markdown per wymiar) — etykiety zależne od kategorii
  -- wine:       {eye, nose, palate}
  -- coffee:     {aroma, taste, aftertaste}
  -- delicacies: {aroma, taste, texture}
  sensory TEXT,

  -- Dowolne dane specyficzne dla kategorii (JSON blob)
  -- wine:       {decanting, color, style}
  -- coffee:     {processing, variety, brew_methods}
  -- delicacies: {ingredients, storage, origin_story}
  extended TEXT,

  -- Flagi do filtrowania (denormalizacja dla szybkich query)
  has_awards INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,

  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX pc_category ON product_content(category);
CREATE INDEX pc_producer ON product_content(producer_slug);
CREATE INDEX pc_published ON product_content(is_published);
CREATE INDEX pc_category_published ON product_content(category, is_published);

-- Historia zmian produktu (snapshot per update)
CREATE TABLE product_content_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  payload TEXT NOT NULL,      -- pełny snapshot JSON
  changed_by INTEGER,         -- admin user_id
  created_at INTEGER NOT NULL
);
CREATE INDEX pch_sku_created ON product_content_history(sku, created_at DESC);

-- Historia zmian producenta
CREATE TABLE producers_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  payload TEXT NOT NULL,
  changed_by INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX prh_slug_created ON producers_history(slug, created_at DESC);

-- FTS5 dla wyszukiwania po treści (opcjonalne, can add later)
CREATE VIRTUAL TABLE product_content_fts USING fts5(
  sku UNINDEXED, category UNINDEXED, sensory, ritual, extended,
  content='product_content', content_rowid='rowid'
);
```

### Config kategorii (kod, nie DB)

```ts
// apps/api/src/lib/category-config.ts
export const CATEGORY_CONTENT_CONFIG = {
  wine: {
    profileDimensions: ['body', 'sweetness', 'acidity', 'tannin', 'alcohol'],
    sensoryDimensions: ['eye', 'nose', 'palate'],
    producerLabel: 'Winnica',
    producerSlug: 'winiarnie',
  },
  coffee: {
    profileDimensions: ['acidity', 'body', 'sweetness', 'roast', 'bitterness'],
    sensoryDimensions: ['aroma', 'taste', 'aftertaste'],
    producerLabel: 'Plantacja',
    producerSlug: 'plantacje',
  },
  delicacies: {
    profileDimensions: ['intensity', 'saltiness', 'sweetness', 'umami'],
    sensoryDimensions: ['aroma', 'taste', 'texture'],
    producerLabel: 'Producent',
    producerSlug: 'producenci',
  },
} as const
```

## Implementacja — kroki

### 1. Setup D1
```bash
cd apps/api
wrangler d1 create il-buon-caffe-content
# wpisz database_id do wrangler.json bindings.d1_databases
wrangler d1 migrations create CONTENT_DB initial_schema
# wklej SQL powyżej do migrations/0001_initial_schema.sql
wrangler d1 migrations apply CONTENT_DB --local      # dev
wrangler d1 migrations apply CONTENT_DB --remote     # prod
```

`wrangler.json`:
```json
"d1_databases": [{
  "binding": "CONTENT_DB",
  "database_name": "il-buon-caffe-content",
  "database_id": "<from-create-output>"
}]
```

### 2. Drizzle setup `packages/content-db/`
- Osobny package (NIE mieszaj z `@repo/db` — Postgres vs SQLite to różne dialekty)
- `schema.ts`: tabele D1 w drizzle-orm/sqlite-core
- `client.ts`: `drizzle(env.CONTENT_DB)` — SYNC, brak Pool
- `package.json` z drizzle-kit configured for SQLite
- `migrations/` — generowane przez `drizzle-kit generate --dialect=sqlite`

### 3. Lib `apps/api/src/lib/content-store.ts`
```ts
export async function getProductContent(db, sku): Promise<ProductRichContent | null>
export async function getProductContentBatch(db, skus): Promise<Map<string, ProductRichContent>>
export async function putProductContent(db, sku, category, payload, adminId): Promise<void>
  // 1. INSERT history snapshot
  // 2. UPSERT product_content
  // 3. UPDATE FTS index
  // — w jednej transakcji: db.batch([...])
export async function getProducer(db, slug): Promise<ProducerContent | null>
export async function listProducers(db, filters: { category?: string, region?: string, country?: string }): Promise<ProducerContent[]>
export async function putProducer(db, slug, payload, adminId): Promise<void>
export async function getProductContentHistory(db, sku, limit): Promise<HistoryEntry[]>
export async function restoreProductContent(db, sku, historyId): Promise<void>
```

### 4. Typy `packages/types/index.ts`
Dodaj:
- `ProductRichContent` — generyczny (profile, sensory jako `Record<string, number>` / `Record<string, string>`)
- `ProducerContent` — generyczny (category field)
- `FlavorProfile = Record<string, number>` — wymiary 0-100, etykiety per kategoria w config
- `SensoryNotes = Record<string, string>` — markdown per wymiar
- `Award`, `Pairing` — niezmienne
- `CategoryContentConfig` — typ dla CATEGORY_CONTENT_CONFIG

**Usuń z `WineDetails`**: awards, pairing, servingTemp, aging (idą do product_content). Zostaje: grape, vintage, region, alcohol, color, style (filtrowalne w Postgresie).

### 5. API public (`apps/api/src/routes/content.ts`)
- `GET /api/content/product/:sku` → D1 select. Cache: `s-maxage=300, stale-while-revalidate=86400`. KV cache key `content:product:<sku>` TTL 5min.
- `GET /api/content/producer/:slug` → j.w.
- `GET /api/content/producers?category=wine&region=Toscana&country=IT` → SQL filter. KV cache na bazie query stringa.
- `GET /api/content/producers/:slug/products` → SELECT FROM product_content WHERE producer_slug → lista SKU + nazwy z Postgres (batch).

### 6. API admin (`apps/api/src/routes/admin/content.ts`)
- `PUT /api/admin/content/product/:sku` — Zod walidacja, putProductContent (transakcja: history + upsert + KV invalidate)
- `PUT /api/admin/content/producer/:slug`
- `DELETE /api/admin/content/product/:sku`
- `GET /api/admin/content/product/:sku/history` — lista snapshotów
- `POST /api/admin/content/product/:sku/restore/:historyId` — restore z history

Cache invalidation: po PUT → `KV.delete('content:product:'+sku)` + `fetch(WEB_URL + '/api/revalidate?tag=product-content&sku=' + sku)`.

### 7. Admin UI
Nowa zakładka w `ProductEditorView` → **"Treść premium"** (renderowana na podstawie `CATEGORY_CONTENT_CONFIG[product.category]`):
- `FlavorProfileSliders` — suwaki 0-100, etykiety z config kategorii (wine: body/sweetness/…, coffee: acidity/roast/…)
- `SensoryNotesEditor` — markdown textarea per wymiar z config (wine: eye/nose/palate, coffee: aroma/taste/aftertaste)
- `AwardsEditor` — list builder (name, year, rank) — wspólny
- `PairingEditor` — list builder (dish, note) — wspólny
- `RitualEditor` — markdown — wspólny (label: "Serwowanie" / "Parzenie" / "Podanie" z config)
- `ProducerSelector` — combobox (autocomplete via `/api/content/producers?category=<cat>&q=`)
- Przycisk "Historia zmian" → modal z `product_content_history`, każdy wpis z "Przywróć"

Nowa sekcja `apps/web/src/admin/views/producers/`:
- `ProducerListView` — DataTable (filtry: category, region, country)
- `ProducerEditorView` — form + image upload do R2 (pola estate_info per kategoria)
- `ProducersNewView`

### 8. Storefront — strona produktu
`apps/web/src/app/sklep/[slug]/page.tsx`:
```ts
const [product, content] = await Promise.all([
  fetchProduct(slug),                                    // Postgres: cena/stock
  fetch(`${API}/api/content/product/${sku}`, {
    next: { revalidate: 600, tags: [`product-content:${sku}`] }
  })
])
const producer = content?.producerSlug
  ? await fetch(`${API}/api/content/producer/${content.producerSlug}`,
      { next: { revalidate: 3600, tags: [`producer:${content.producerSlug}`] } })
  : null
```

Renderowanie profilu/sensoryki oparte na `CATEGORY_CONTENT_CONFIG[product.category]` — ten sam komponent dla wina i kawy, różne etykiety.

### 9. Storefront — encyklopedia producentów
Pattern URL per kategoria na bazie config (`producerSlug`):
- `/encyklopedia/wino/winiarnie` + `/encyklopedia/wino/winiarnie/[slug]`
- `/encyklopedia/kawa/plantacje` + `/encyklopedia/kawa/plantacje/[slug]`
- `/encyklopedia/delikatesy/producenci` + `/encyklopedia/delikatesy/producenci/[slug]`

Jeden shared layout `ProducerDetailPage` + dane z D1 `?category=wine|coffee|delicacies`.

### 10. Migracja danych
Skrypt `apps/api/scripts/migrate-content-to-d1.ts`:
- Czytaj `products` z Postgresa, dla każdego sprawdź kategorię
- Wine: z `wineDetails` weź `awards`, `pairing`, `servingTemp`, `aging` → `product_content` (category='wine')
- Coffee: z `coffeeDetails` weź odpowiedniki → `product_content` (category='coffee')
- Z `description` heurystycznie wyciągnij nuty sensoryczne
- INSERT do D1 `product_content`
- Po weryfikacji → migracja Postgres dropuje stare pola z `*Details` JSONB

### 11. Cleanup Postgres
Migracja Drizzle:
- W `wineDetails` JSONB usuń klucze: `awards`, `pairing`, `servingTemp`, `aging`
- Update `WineDetails` interface w `packages/types`

## Skala 400+ produktów, N kategorii

- D1 storage: 400 SKU × ~10KB = 4MB. Limit 10GB → 0.04% wykorzystane. Przy 10 kategoriach × 400 = 4000 SKU → 40MB. Wciąż trywialne.
- D1 reads: 5M rows/dzień darmowe. Strona produktu = 1 read. 100k odsłon dziennie = darmowe.
- D1 writes: 100k/dzień darmowe. Edycje admina = kilka dziennie. Trywialne.
- Nowa kategoria: zero nowych tabel — tylko wpis w `CATEGORY_CONTENT_CONFIG`.
- Versioning: 400 SKU × 100 edycji × 10KB = 400MB w `product_content_history`. Dodaj retention cron (kasuj history > 1 rok).

## Plusy D1 vs KV+R2

- SQL filtry: "wina z nagrodą + region Toscana"
- Atomic transactions: history + update w jednym
- FTS5 search po treści degustacyjnej
- Joiny: winery → wines (count, list)
- Drizzle = znajomy stack
- Migrations versioned

## Pułapki D1

- D1 dialect = SQLite (różny od Postgres) — JSON jako TEXT, brak `jsonb` operators (użyj JSON1 functions: `json_extract`, `json_array_length`)
- Brak `serial` — używaj `INTEGER PRIMARY KEY AUTOINCREMENT`
- Daty: store jako Unix timestamp `INTEGER` (nie string)
- D1 nie replikuje synchronicznie — write na 1 region, read może chwilę widzieć stary stan (sekundy). Dla content edycji OK, dla finansów NIE.
- Limit per query: 100MB result set, 1000 bound params, 30s CPU
- Brak `RETURNING *` w starszych D1 — sprawdź wersję

## Kolejność prac

1. D1 create + wrangler binding + first migration (`producers`, `product_content`, history tables)
2. `packages/content-db/` — Drizzle schema + client
3. `category-config.ts` — CATEGORY_CONTENT_CONFIG (wine, coffee, delicacies)
4. Lib `content-store.ts` — getProductContent, putProductContent, getProducer, putProducer, history/restore
5. API public endpoints + KV cache layer
6. API admin endpoints + Zod schemas + history/restore
7. Admin UI: `RichContentEditor` (zakładka w produkcie, category-aware)
8. Admin UI: Producers CRUD + image upload R2
9. Storefront: produkt page integration + revalidate
10. Storefront: encyklopedia producentów (lista + detail, per kategoria)
11. Migracja danych z Postgres
12. Cleanup Postgres schema (drop pól z `wineDetails`/`coffeeDetails`)
13. (Opcjonalnie) FTS5 search w encyklopedii

## Decyzje otwarte

- KV cache przed D1 — TAK czy NIE? (D1 ~30ms vs KV ~5ms, ale jedna warstwa cache mniej do invalidacji). Rekomenduję NIE dla startu, dodaj jeśli p95 latency boli.
- Image storage winnic: R2 czy istniejący media bucket? Rekomenduję istniejący pod prefixem `wineries/`.
- FTS5: dorzuć od razu czy później? Później — tylko jeśli encyklopedia będzie miała search.
