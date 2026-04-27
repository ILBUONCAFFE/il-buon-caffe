# Product KV Cache + Remove longDescription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache static product fields in Cloudflare KV to avoid Neon wake-ups on every product page load, and remove the unused `longDescription` field from the entire stack.

**Architecture:** Public `GET /api/products/:slug` checks `ALLEGRO_KV` for key `product:static:{sku}` before hitting Neon. On cache miss, fetches from DB, splits response into static (name, description, wineDetails, coffeeDetails, images, category, etc.) and dynamic (price, stock, reserved, year), stores static in KV with 24h TTL. PUT `/admin/products/:sku` deletes the KV key after a successful update. Admin editor shows a "Wyczyść cache" button calling `DELETE /admin/products/:sku/cache`.

**Tech Stack:** Hono.js 4.11, Cloudflare KV (`ALLEGRO_KV` binding), Drizzle ORM, Next.js App Router, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/db/schema/index.ts` | Modify | Remove `longDescription` column |
| `packages/types/index.ts` | Modify | Remove `longDescription` from `Product`, add `WineDetails`/`CoffeeDetails` typed interfaces |
| `apps/api/src/routes/products.ts` | Modify | Add KV static cache to `GET /:slug` |
| `apps/api/src/routes/admin/products.ts` | Modify | Remove `longDescription` from POST/PUT, add KV invalidation on PUT, add `DELETE /:sku/cache` endpoint |
| `apps/web/src/admin/views/Products/ProductEditorView.tsx` | Modify | Remove `longDescription` field + state, add "Wyczyść cache" button |
| `apps/web/src/admin/lib/adminApiClient.ts` | Modify | Add `clearProductCache(sku)` method |

---

## Task 1: Remove longDescription from DB schema + migrate

**Files:**
- Modify: `packages/db/schema/index.ts:379`

- [ ] **Step 1: Remove the column from schema**

In `packages/db/schema/index.ts`, delete this line:
```ts
  longDescription: text('long_description'),
```

- [ ] **Step 2: Generate migration**

```bash
cd packages/db && npx drizzle-kit generate
```

Expected: new file in `drizzle/` with `ALTER TABLE "products" DROP COLUMN "long_description";`

Review the generated SQL — confirm it only drops `long_description`, nothing else.

- [ ] **Step 3: Apply migration via Neon MCP**

Use `mcp__Neon__run_sql` to execute the generated migration SQL:
```sql
ALTER TABLE "products" DROP COLUMN IF EXISTS "long_description";
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/schema/index.ts packages/db/drizzle/
git commit -m "feat(db): remove long_description column from products"
```

---

## Task 2: Remove longDescription from types

**Files:**
- Modify: `packages/types/index.ts`

- [ ] **Step 1: Remove `longDescription` from `Product` interface**

In `packages/types/index.ts`, find the `Product` interface (line ~96) and delete:
```ts
  longDescription?: string;
```

- [ ] **Step 2: Add typed WineDetails and CoffeeDetails interfaces**

After the `Product` interface, add:
```ts
export interface WineDetails {
  grape?: string;
  vintage?: number;
  region?: string;
  appellation?: string;
  alcohol?: number;
  style?: string;          // wytrawne | półwytrawne | słodkie | musujące
  color?: string;          // czerwone | białe | różowe
  pairing?: string[];
  producer?: string;
  servingTemp?: string;
  aging?: string;
  awards?: string[];
}

export interface CoffeeDetails {
  origin?: string;
  region?: string;
  process?: string;        // natural | washed | honey
  roast?: string;          // jasna | średnia | ciemna
  variety?: string;
  altitude?: string;
  flavorNotes?: string[];
  brewMethods?: string[];
  producer?: string;
}
```

- [ ] **Step 3: Update `Product` to use typed JSONB fields**

In the `Product` interface, the existing fields don't include `wineDetails`/`coffeeDetails` — add them:
```ts
  wineDetails?: WineDetails;
  coffeeDetails?: CoffeeDetails;
```

- [ ] **Step 4: Update schema type in packages/db/schema/index.ts**

Change the JSONB type annotations:
```ts
// Before:
  wineDetails: jsonb('wine_details').$type<Record<string, unknown>>(),
  coffeeDetails: jsonb('coffee_details').$type<Record<string, unknown>>(),

// After:
  wineDetails: jsonb('wine_details').$type<WineDetails>(),
  coffeeDetails: jsonb('coffee_details').$type<CoffeeDetails>(),
```

Add the import at the top of `packages/db/schema/index.ts`:
```ts
import type { WineDetails, CoffeeDetails } from '@repo/types'
```

- [ ] **Step 5: Type-check**

```bash
turbo type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/index.ts packages/db/schema/index.ts
git commit -m "feat(types): remove longDescription, add typed WineDetails/CoffeeDetails"
```

---

## Task 3: Remove longDescription from API routes

**Files:**
- Modify: `apps/api/src/routes/admin/products.ts`

- [ ] **Step 1: Remove from POST (create) body type and insert**

In `apps/api/src/routes/admin/products.ts`, find the POST handler (around line 147). Remove:
```ts
// In the body type — remove:
longDescription?: string;

// In the insert object — remove:
longDescription: sanitize(body.longDescription || '', 50000) || null,
```

- [ ] **Step 2: Remove from PUT (update) body type and set**

In the PUT handler (around line 230). Remove:
```ts
// In the body type — remove:
longDescription: string;

// In the setCols block — remove:
if (body.longDescription !== undefined) setCols.longDescription = sanitize(body.longDescription, 50000) || null
```

- [ ] **Step 3: Type-check**

```bash
turbo type-check --filter=api
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin/products.ts
git commit -m "feat(api): remove longDescription from product create/update endpoints"
```

---

## Task 4: Add KV static cache to public GET /api/products/:slug

**Files:**
- Modify: `apps/api/src/routes/products.ts`

The static fields to cache: `name`, `slug`, `description`, `imageUrl`, `images`, `category`, `origin`, `weight`, `isNew`, `isFeatured`, `wineDetails`, `coffeeDetails`, `metaDescription`, `createdAt`.

The dynamic fields (never cached, always live): `price`, `compareAtPrice`, `stock`, `reserved`, `year`, `allegroOfferId`, `isActive`, `updatedAt`.

- [ ] **Step 1: Add KV cache lookup at start of GET /:slug**

In `apps/api/src/routes/products.ts`, find the `productsRouter.get('/:slug', ...)` handler (line ~118). Add KV cache logic:

```ts
productsRouter.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const db   = c.get('db')

    // ── KV static cache ──
    const cacheKey = `product:static:${slug}`
    const cached   = c.env.ALLEGRO_KV ? await c.env.ALLEGRO_KV.get(cacheKey, 'json') as Record<string, unknown> | null : null

    let staticData: Record<string, unknown> | null = cached ?? null
    let dynamicData: Record<string, unknown>

    if (staticData) {
      // Cache hit — fetch only dynamic fields from DB
      const row = await db.query.products.findFirst({
        columns: {
          price: true, compareAtPrice: true, stock: true, reserved: true,
          year: true, allegroOfferId: true, isActive: true, updatedAt: true,
        },
        where: and(eq(products.slug, slug), eq(products.isActive, true)),
      })
      if (!row) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Produkt nie istnieje' } }, 404)
      dynamicData = {
        price:          Number(row.price),
        compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
        stock:          row.stock,
        reserved:       row.reserved,
        available:      Math.max(0, row.stock - row.reserved),
        year:           row.year,
        allegroOfferId: row.allegroOfferId,
        isActive:       row.isActive,
        updatedAt:      row.updatedAt,
      }
    } else {
      // Cache miss — full DB fetch
      const product = await db.query.products.findFirst({
        where: and(eq(products.slug, slug), eq(products.isActive, true)),
        with: {
          category: { columns: { id: true, name: true, slug: true } },
          images:   { columns: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true }, orderBy: asc(productImages.sortOrder) },
        },
      })
      if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Produkt nie istnieje' } }, 404)

      staticData = {
        sku:           product.sku,
        slug:          product.slug,
        name:          product.name,
        description:   product.description,
        imageUrl:      product.imageUrl,
        images:        product.images,
        category:      product.category,
        origin:        product.origin,
        weight:        product.weight,
        isNew:         product.isNew,
        isFeatured:    product.isFeatured,
        wineDetails:   product.wineDetails,
        coffeeDetails: product.coffeeDetails,
        metaDescription: product.metaDescription,
        createdAt:     product.createdAt,
      }
      dynamicData = {
        price:          Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        stock:          product.stock,
        reserved:       product.reserved,
        available:      Math.max(0, product.stock - product.reserved),
        year:           product.year,
        allegroOfferId: product.allegroOfferId,
        isActive:       product.isActive,
        updatedAt:      product.updatedAt,
      }

      // Store static data in KV — 24h TTL
      if (c.env.ALLEGRO_KV) {
        c.executionCtx.waitUntil(
          c.env.ALLEGRO_KV.put(cacheKey, JSON.stringify(staticData), { expirationTtl: 86400 })
        )
      }
    }

    return c.json({ success: true, data: { ...staticData, ...dynamicData } })
  } catch (error) {
    console.error('GET /products/:slug error:', error instanceof Error ? error.message : String(error))
    return c.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Błąd serwera' } }, 500)
  }
})
```

> **Note:** The existing `GET /:slug` handler must be replaced entirely with the above. Preserve any existing imports (`asc`, `productImages`, etc.) — they are already imported at the top of the file.

- [ ] **Step 2: Type-check**

```bash
turbo type-check --filter=api
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/products.ts
git commit -m "feat(api): add KV static cache to GET /api/products/:slug"
```

---

## Task 5: Invalidate KV cache on product update + add cache clear endpoint

**Files:**
- Modify: `apps/api/src/routes/admin/products.ts`

- [ ] **Step 1: Invalidate KV after successful PUT**

In the PUT handler (around line 212), after the DB update succeeds and before `return c.json(...)`, add:

```ts
// Invalidate KV static cache
if (c.env.ALLEGRO_KV) {
  const updatedSlug = updated.slug ?? existing.slug
  c.executionCtx.waitUntil(
    Promise.all([
      c.env.ALLEGRO_KV.delete(`product:static:${sku}`),
      c.env.ALLEGRO_KV.delete(`product:static:${updatedSlug}`),
    ])
  )
}
```

- [ ] **Step 2: Add DELETE /:sku/cache endpoint**

After the existing PUT `/:sku/stock` handler, add:

```ts
// ============================================
// DELETE /admin/products/:sku/cache  🛡️
// Czyści KV cache dla produktu
// ============================================
adminProductsRouter.delete('/:sku/cache', async (c) => {
  try {
    const sku = c.req.param('sku')
    if (!c.env.ALLEGRO_KV) return c.json({ success: true, data: { cleared: false, reason: 'no_kv' } })

    const db = createDb(c.env.DATABASE_URL)
    const product = await db.query.products.findFirst({
      columns: { slug: true },
      where: eq(products.sku, sku),
    })

    await Promise.all([
      c.env.ALLEGRO_KV.delete(`product:static:${sku}`),
      product ? c.env.ALLEGRO_KV.delete(`product:static:${product.slug}`) : Promise.resolve(),
    ])

    return c.json({ success: true, data: { cleared: true } })
  } catch (err) {
    return serverError(c, 'DELETE /admin/products/:sku/cache', err)
  }
})
```

- [ ] **Step 3: Type-check**

```bash
turbo type-check --filter=api
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin/products.ts
git commit -m "feat(api): KV cache invalidation on product update + DELETE /cache endpoint"
```

---

## Task 6: Update admin API client

**Files:**
- Modify: `apps/web/src/admin/lib/adminApiClient.ts`

- [ ] **Step 1: Add clearProductCache method**

Find the existing product methods in `adminApiClient.ts`. Add:

```ts
async clearProductCache(sku: string): Promise<{ cleared: boolean }> {
  const res = await this.request<{ cleared: boolean }>(`/admin/products/${sku}/cache`, {
    method: 'DELETE',
  })
  return res
},
```

- [ ] **Step 2: Remove any remaining longDescription usage**

Search for `longDescription` in `adminApiClient.ts` and remove it from any type assertions or payload builders.

- [ ] **Step 3: Type-check**

```bash
turbo type-check --filter=web
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/lib/adminApiClient.ts
git commit -m "feat(web): add clearProductCache to adminApiClient"
```

---

## Task 7: Update ProductEditorView — remove longDescription, add cache button

**Files:**
- Modify: `apps/web/src/admin/views/Products/ProductEditorView.tsx`

- [ ] **Step 1: Remove longDescription from form state type**

Find the form state type (around line 30) and delete:
```ts
  longDescription: string
```

- [ ] **Step 2: Remove longDescription from initial state**

Find the initial state object (around line 49) and delete:
```ts
  longDescription: '',
```

- [ ] **Step 3: Remove longDescription from product load**

Find where product data is loaded into form (around line 97) and delete:
```ts
  longDescription: product.longDescription || '',
```

- [ ] **Step 4: Remove longDescription from save handlers**

Find all places where `form.longDescription` is used (around lines 217-218, 247-248) and remove those lines.

- [ ] **Step 5: Remove longDescription textarea from JSX**

Find the textarea for `longDescription` (around line 428) and delete the entire form group:
```tsx
// Delete this entire block:
<div>
  <label ...>Długi opis</label>
  <textarea
    value={form.longDescription}
    onChange={(e) => handleFieldChange('longDescription', e.target.value)}
    ...
  />
</div>
```

- [ ] **Step 6: Add "Wyczyść cache" button**

Add `isClearingCache` state near other state declarations:
```ts
const [isClearingCache, setIsClearingCache] = useState(false)
```

Add `handleClearCache` function near other handlers:
```ts
const handleClearCache = async () => {
  if (!product?.sku) return
  setIsClearingCache(true)
  try {
    await adminApiClient.clearProductCache(product.sku)
    toast.success('Cache produktu wyczyszczony')
  } catch {
    toast.error('Błąd czyszczenia cache')
  } finally {
    setIsClearingCache(false)
  }
}
```

Add button in the header area (near the Save button, only shown when editing existing product):
```tsx
{product?.sku && (
  <button
    type="button"
    onClick={handleClearCache}
    disabled={isClearingCache}
    className="px-3 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:border-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
  >
    {isClearingCache ? 'Czyszczenie...' : 'Wyczyść cache'}
  </button>
)}
```

- [ ] **Step 7: Type-check**

```bash
turbo type-check --filter=web
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/admin/views/Products/ProductEditorView.tsx
git commit -m "feat(web): remove longDescription field, add cache clear button to ProductEditorView"
```

---

## Task 8: Full build verification

- [ ] **Step 1: Build API**

```bash
turbo build --filter=api
```

Expected: Build succeeded.

- [ ] **Step 2: Build web**

```bash
turbo build --filter=web
```

Expected: Build succeeded, no type errors.

- [ ] **Step 3: Deploy API**

```bash
cd apps/api && wrangler deploy
```

Expected: `✅ Deployed` with URL `https://api.ilbuoncaffe.pl`

- [ ] **Step 4: Smoke test**

Open `https://ilbuoncaffe.pl/sklep` — pick any wine product, open it. First load → cache miss (Neon query). Second load within 24h → no Neon query (KV hit).

Verify in Cloudflare dashboard: KV namespace `ALLEGRO_KV` should have keys like `product:static:barolo-2019`.

- [ ] **Step 5: Test cache clear**

In admin panel, open a product, click "Wyczyść cache" — should show "Cache produktu wyczyszczony" toast. KV key should disappear.

---

## Self-Review

**Spec coverage:**
- ✅ KV cache for static fields (name, description, wineDetails, coffeeDetails, images, category, etc.)
- ✅ Dynamic fields (price, stock, year) always from DB
- ✅ Cache invalidation on product update
- ✅ Manual cache clear in editor
- ✅ Remove longDescription from DB, types, API, editor

**Potential gaps:**
- Product CREATE (POST) does not need cache invalidation (new product, no KV key yet)
- `GET /api/products` list endpoint still uses Cloudflare Cache API (edge cache, not KV) — out of scope
- wrangler.json binding: `ALLEGRO_KV` already exists, no infra changes needed
