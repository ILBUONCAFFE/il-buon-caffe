# Admin Panel — Product Management, Warehouse & Allegro Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild admin product management with tabbed editor, Allegro-offer linking UI, stock history/corrections, and warehouse connections page.

**Architecture:** Add 3 new API endpoints to `apps/api/src/routes/admin/products.ts` and a new `allegro-products.ts` admin router for Allegro offer management. Redesign `ProductsView` (add Allegro status column + quick stock adjust) and `ProductEditorView` (tabbed layout). Add 3 modals (StockAdjust, StockHistory, AllegroLink). Create new `/admin/inventory/connections` page.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Hono.js 4.11, Drizzle ORM 0.45, Neon PostgreSQL, Allegro REST API v2, Cloudflare KV (token storage), Lucide React icons.

---

## Design tokens (use these everywhere — no hardcoded colors)

```
bg:        #FAF9F7   (page bg)
surface:   #FFFFFF   (card/panel)
border:    #E5E4E1
hover:     #F5F4F1
text:      #1A1A1A
secondary: #525252
muted:     #737373
placeholder: #A3A3A3
accent:    #0066CC
accent-bg: #EEF4FF
success:   #047857 / #ECFDF5
warning:   #D97706 / #FEF3C7
danger:    #B91C1C / #FEE2E2
```

---

## File Map

| Action | Path |
|--------|------|
| Modify | `apps/api/src/routes/admin/products.ts` — add stock-history + low-stock endpoints |
| Create | `apps/api/src/routes/admin/allegro-products.ts` — offers list, link, unlink, push-stock |
| Modify | `apps/api/src/routes/admin/index.ts` — register allegro-products router |
| Modify | `apps/web/src/admin/types/admin-api.ts` — add AllegroOffer, StockHistoryEntry, ConnectionsItem types |
| Modify | `apps/web/src/admin/lib/adminApiClient.ts` — add 6 new methods |
| Modify | `apps/web/src/admin/views/Products/index.tsx` — Allegro column, low-stock highlight, quick-adjust button |
| Create | `apps/web/src/admin/views/Products/StockAdjustModal.tsx` |
| Create | `apps/web/src/admin/views/Products/StockHistoryModal.tsx` |
| Modify | `apps/web/src/admin/views/Products/ProductEditorView.tsx` — tabbed layout |
| Create | `apps/web/src/admin/views/Products/AllegroLinkModal.tsx` |
| Create | `apps/web/src/app/admin/inventory/connections/page.tsx` |
| Create | `apps/web/src/admin/views/Inventory/ConnectionsView.tsx` |
| Modify | `apps/web/src/admin/components/layout/Sidebar.tsx` — rename "Połączenia" item |

---

## Task 1: API — Stock History Endpoint

**Files:**
- Modify: `apps/api/src/routes/admin/products.ts`

Add `GET /admin/products/:sku/stock-history` returning paginated rows from `stockChanges` table.

- [ ] **Step 1: Verify current endpoint list**

```bash
grep -n "adminProductsRouter\." apps/api/src/routes/admin/products.ts | head -20
```
Expected: see GET /, GET /:sku, POST /, PUT /:sku, PUT /:sku/stock, POST /:sku/images — no stock-history.

- [ ] **Step 2: Add endpoint**

Find the block after `PUT /:sku/stock` (around line 330) and add:

```typescript
// ============================================
// GET /admin/products/:sku/stock-history  🛡️
// ============================================
adminProductsRouter.get('/:sku/stock-history', async (c) => {
  try {
    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50)
    const { page, limit } = parsePagination(c, { maxLimit: 100 })

    const [countResult, rows] = await Promise.all([
      db.select({ count: count() }).from(stockChanges).where(eq(stockChanges.productSku, sku)),
      db.select().from(stockChanges)
        .where(eq(stockChanges.productSku, sku))
        .orderBy(desc(stockChanges.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ])

    const total = Number(countResult[0]?.count ?? 0)
    return c.json({
      success: true,
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/products/:sku/stock-history', err)
  }
})
```

- [ ] **Step 3: Verify it compiles**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Smoke test**

```bash
cd apps/api && wrangler dev --port 8787 &
sleep 3
curl -s http://localhost:8787/admin/products/TEST-SKU/stock-history \
  -H "X-Admin-Internal-Secret: test" | jq .
```
Expected: `{ "success": true, "data": [], "meta": { "total": 0 ... } }`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/products.ts
git commit -m "feat(api): add GET /admin/products/:sku/stock-history endpoint"
```

---

## Task 2: API — Low-Stock Endpoint

**Files:**
- Modify: `apps/api/src/routes/admin/products.ts`

Add `GET /admin/products/low-stock?threshold=5` — **must be registered BEFORE `/:sku` route** to avoid path conflict.

- [ ] **Step 1: Find insertion point**

The route must go before `adminProductsRouter.get('/:sku', ...)`. Open file, locate line with `GET /admin/products/:sku` (around line 77). Insert new route above it.

- [ ] **Step 2: Add endpoint**

```typescript
// ============================================
// GET /admin/products/low-stock  🛡️
// Produkty z niskim stanem (stock - reserved <= threshold)
// ============================================
adminProductsRouter.get('/low-stock', async (c) => {
  try {
    const db        = createDb(c.env.DATABASE_URL)
    const threshold = Math.max(0, Math.min(100, Number(c.req.query('threshold') ?? '5')))

    const rows = await db.query.products.findMany({
      columns: { sku: true, name: true, stock: true, reserved: true, isActive: true, allegroOfferId: true },
      with: { category: { columns: { name: true } } },
      where: and(
        eq(products.isActive, true),
        sql`${products.stock} - ${products.reserved} <= ${threshold}`,
      ),
      orderBy: asc(sql`${products.stock} - ${products.reserved}`),
      limit: 200,
    })

    return c.json({
      success: true,
      data: rows.map(p => ({
        ...p,
        available: Math.max(0, p.stock - p.reserved),
      })),
      meta: { threshold, total: rows.length },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/products/low-stock', err)
  }
})
```

Also add `asc` to the drizzle imports at top of file (already has `desc`, add `asc` if missing).

- [ ] **Step 3: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/admin/products.ts
git commit -m "feat(api): add GET /admin/products/low-stock endpoint"
```

---

## Task 3: API — Allegro Products Admin Router

**Files:**
- Create: `apps/api/src/routes/admin/allegro-products.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

Endpoints:
- `GET  /admin/allegro-products/offers` — list seller's Allegro offers (from Allegro API)
- `POST /admin/allegro-products/link` — `{ sku, offerId }` → set `products.allegroOfferId`
- `DELETE /admin/allegro-products/link/:sku` — clear `allegroOfferId`
- `POST /admin/allegro-products/:sku/push-stock` — push current stock to Allegro offer

- [ ] **Step 1: Check how existing routes read Allegro token from KV**

```bash
grep -n "KV_KEYS\|decryptText\|ALLEGRO_KV\|getToken" apps/api/src/lib/allegro.ts | head -20
grep -n "KV_KEYS\|decryptText\|ALLEGRO_KV" apps/api/src/routes/admin/index.ts | head -10
```
Note the KV key pattern and token decryption call — copy the same pattern.

- [ ] **Step 2: Create the file**

```typescript
// apps/api/src/routes/admin/allegro-products.ts
import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { products } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import type { Env } from '../../index'
import { sanitize } from '../../lib/sanitize'
import { KV_KEYS, getAllegroApiBase, decryptAllegroToken } from '../../lib/allegro'
import { serverError } from '../../lib/request'

export const adminAllegroProductsRouter = new Hono<{ Bindings: Env }>()
adminAllegroProductsRouter.use('*', requireAdminOrProxy())

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getActiveAllegroToken(env: Env): Promise<{ token: string; apiBase: string } | null> {
  const kv = env.ALLEGRO_KV
  if (!kv) return null

  const allegroEnv = (env.ALLEGRO_ENVIRONMENT ?? 'production') as 'sandbox' | 'production'
  const key        = allegroEnv === 'sandbox' ? KV_KEYS.TOKEN_SANDBOX : KV_KEYS.TOKEN_PRODUCTION
  const raw        = await kv.get(key)
  if (!raw) return null

  const stored = JSON.parse(raw) as { accessToken: string }
  const token  = await decryptAllegroToken(stored.accessToken, env.ALLEGRO_TOKEN_ENCRYPTION_KEY)
  return { token, apiBase: getAllegroApiBase(allegroEnv) }
}

// ============================================
// GET /admin/allegro-products/offers
// Lista ofert sprzedawcy z Allegro API
// ============================================
adminAllegroProductsRouter.get('/offers', async (c) => {
  try {
    const auth = await getActiveAllegroToken(c.env)
    if (!auth) return c.json({ error: { code: 'NOT_CONNECTED', message: 'Brak połączenia z Allegro' } }, 400)

    const search = sanitize(c.req.query('search') ?? '', 100)
    const limit  = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '50')))
    const offset = Math.max(0, Number(c.req.query('offset') ?? '0'))

    const qs = new URLSearchParams({
      limit:  String(limit),
      offset: String(offset),
      ...(search ? { searchMode: 'TITLE', phrase: search } : {}),
    })

    const res = await fetch(`${auth.apiBase}/sale/offers?${qs}`, {
      headers: {
        Authorization:  `Bearer ${auth.token}`,
        Accept:         'application/vnd.allegro.public.v1+json',
      },
    })

    if (!res.ok) {
      const body = await res.text()
      return c.json({ error: { code: 'ALLEGRO_API_ERROR', message: body } }, 502)
    }

    const body = await res.json() as {
      offers: Array<{
        id: string
        name: string
        publication: { status: string }
        stock: { available: number; sold: number } | null
        sellingMode: { price: { amount: string; currency: string } | null }
      }>
      totalCount: number
    }

    // Also fetch which SKUs are already linked so the UI can show that
    const db    = createDb(c.env.DATABASE_URL)
    const linked = await db
      .select({ sku: products.sku, offerId: products.allegroOfferId })
      .from(products)
      .where(eq(products.isActive, true))

    const linkedMap = new Map(linked.map(r => [r.offerId, r.sku]))

    return c.json({
      success: true,
      data: body.offers.map(o => ({
        id:            o.id,
        name:          o.name,
        status:        o.publication.status,
        stock:         o.stock?.available ?? null,
        price:         o.sellingMode.price ? Number(o.sellingMode.price.amount) : null,
        linkedSku:     linkedMap.get(o.id) ?? null,
      })),
      meta: { total: body.totalCount, limit, offset },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/allegro-products/offers', err)
  }
})

// ============================================
// POST /admin/allegro-products/link
// Połącz ofertę Allegro z SKU produktu
// Body: { sku: string, offerId: string }
// ============================================
adminAllegroProductsRouter.post('/link', async (c) => {
  try {
    const db   = createDb(c.env.DATABASE_URL)
    const body = await c.req.json<{ sku: string; offerId: string }>()

    const sku     = sanitize(body.sku ?? '', 50)
    const offerId = sanitize(body.offerId ?? '', 50)

    if (!sku || !offerId) {
      return c.json({ error: { code: 'INVALID_BODY', message: 'sku i offerId są wymagane' } }, 400)
    }

    // Unlink any product that currently has this offerId
    await db.update(products)
      .set({ allegroOfferId: null, updatedAt: new Date() })
      .where(eq(products.allegroOfferId, offerId))

    // Link to new SKU
    const updated = await db.update(products)
      .set({ allegroOfferId: offerId, updatedAt: new Date() })
      .where(eq(products.sku, sku))
      .returning({ sku: products.sku, allegroOfferId: products.allegroOfferId })

    if (updated.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: `Produkt ${sku} nie istnieje` } }, 404)
    }

    return c.json({ success: true, data: updated[0] })
  } catch (err) {
    return serverError(c, 'POST /admin/allegro-products/link', err)
  }
})

// ============================================
// DELETE /admin/allegro-products/link/:sku
// Odłącz SKU od oferty Allegro
// ============================================
adminAllegroProductsRouter.delete('/link/:sku', async (c) => {
  try {
    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50)

    await db.update(products)
      .set({ allegroOfferId: null, updatedAt: new Date() })
      .where(eq(products.sku, sku))

    return c.json({ success: true })
  } catch (err) {
    return serverError(c, 'DELETE /admin/allegro-products/link/:sku', err)
  }
})

// ============================================
// POST /admin/allegro-products/:sku/push-stock
// Wypchnij aktualny stan magazynowy na Allegro
// ============================================
adminAllegroProductsRouter.post('/:sku/push-stock', async (c) => {
  try {
    const auth = await getActiveAllegroToken(c.env)
    if (!auth) return c.json({ error: { code: 'NOT_CONNECTED', message: 'Brak połączenia z Allegro' } }, 400)

    const db  = createDb(c.env.DATABASE_URL)
    const sku = sanitize(c.req.param('sku'), 50)

    const product = await db.query.products.findFirst({
      columns: { sku: true, stock: true, reserved: true, allegroOfferId: true },
      where: eq(products.sku, sku),
    })

    if (!product) return c.json({ error: { code: 'NOT_FOUND', message: `Produkt ${sku} nie istnieje` } }, 404)
    if (!product.allegroOfferId) return c.json({ error: { code: 'NOT_LINKED', message: 'Produkt nie ma powiązanej oferty Allegro' } }, 400)

    const available = Math.max(0, product.stock - product.reserved)

    const res = await fetch(`${auth.apiBase}/sale/product-offers/${product.allegroOfferId}`, {
      method:  'PATCH',
      headers: {
        Authorization:  `Bearer ${auth.token}`,
        'Content-Type': 'application/vnd.allegro.public.v1+json',
        Accept:         'application/vnd.allegro.public.v1+json',
      },
      body: JSON.stringify({ stock: { available } }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return c.json({ error: { code: 'ALLEGRO_PUSH_FAILED', message: errBody } }, 502)
    }

    return c.json({ success: true, data: { sku, allegroOfferId: product.allegroOfferId, pushed: available } })
  } catch (err) {
    return serverError(c, 'POST /admin/allegro-products/:sku/push-stock', err)
  }
})
```

- [ ] **Step 3: Register in admin/index.ts**

Open `apps/api/src/routes/admin/index.ts`. Add import and route:

```typescript
// Add to imports at top:
import { adminAllegroProductsRouter } from './allegro-products'

// Add to route registrations (after existing routes):
adminRouter.route('/allegro-products', adminAllegroProductsRouter)
```

- [ ] **Step 4: Check decryptAllegroToken export**

```bash
grep -n "export.*decryptAllegroToken\|export.*decryptText" apps/api/src/lib/allegro.ts apps/api/src/lib/crypto.ts
```

If `decryptAllegroToken` doesn't exist, the push-stock endpoint should use `decryptText` from `lib/crypto.ts` instead. Adjust import accordingly:

```typescript
// If decryptAllegroToken not exported from allegro.ts, use:
import { decryptText } from '../../lib/crypto'
// then:
const token = await decryptText(stored.accessToken, env.ALLEGRO_TOKEN_ENCRYPTION_KEY)
```

- [ ] **Step 5: Type-check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -30
```
Fix any errors. Common: wrong import path, missing `asc` import, wrong KV_KEYS name.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin/allegro-products.ts apps/api/src/routes/admin/index.ts
git commit -m "feat(api,allegro): admin allegro-products router — offers list, link, push-stock"
```

---

## Task 4: Types — New Admin API Types

**Files:**
- Modify: `apps/web/src/admin/types/admin-api.ts`

- [ ] **Step 1: Open types file**

```bash
grep -n "export interface\|export type" apps/web/src/admin/types/admin-api.ts | tail -30
```
Find the last exported type to know where to append.

- [ ] **Step 2: Add new types at the end of the file**

```typescript
// ── Allegro Products ──────────────────────────────────────────────────────────

export interface AllegroOffer {
  id: string
  name: string
  status: string       // ACTIVE | INACTIVE | ENDED | etc.
  stock: number | null
  price: number | null
  linkedSku: string | null
}

export interface AllegroOffersResponse {
  success: boolean
  data: AllegroOffer[]
  meta: { total: number; limit: number; offset: number }
}

export interface LinkAllegroOfferPayload {
  sku: string
  offerId: string
}

export interface PushStockResponse {
  success: boolean
  data: { sku: string; allegroOfferId: string; pushed: number }
}

// ── Stock History ─────────────────────────────────────────────────────────────

export interface StockHistoryEntry {
  id: number
  productSku: string
  previousStock: number
  newStock: number
  change: number
  reason: string
  orderId: number | null
  adminId: number | null
  notes: string | null
  createdAt: string
}

export interface StockHistoryResponse {
  success: boolean
  data: StockHistoryEntry[]
  meta: PaginationMeta
}

// ── Low Stock ─────────────────────────────────────────────────────────────────

export interface LowStockProduct {
  sku: string
  name: string
  stock: number
  reserved: number
  available: number
  isActive: boolean
  allegroOfferId: string | null
  category: { name: string } | null
}

export interface LowStockResponse {
  success: boolean
  data: LowStockProduct[]
  meta: { threshold: number; total: number }
}

// ── Connections (Inventory page) ───────────────────────────────────────────────

export interface ConnectionsItem {
  sku: string
  name: string
  stock: number
  reserved: number
  available: number
  allegroOfferId: string | null
  isActive: boolean
  category: { name: string } | null
}

export interface ConnectionsResponse {
  success: boolean
  data: ConnectionsItem[]
  meta: PaginationMeta
}
```

- [ ] **Step 3: Verify `PaginationMeta` is already defined in this file**

```bash
grep -n "PaginationMeta" apps/web/src/admin/types/admin-api.ts | head -5
```
If not, add `export interface PaginationMeta { total: number; page: number; limit: number; totalPages: number }`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/types/admin-api.ts
git commit -m "feat(types): add AllegroOffer, StockHistory, LowStock, Connections admin types"
```

---

## Task 5: adminApiClient — New Methods

**Files:**
- Modify: `apps/web/src/admin/lib/adminApiClient.ts`

- [ ] **Step 1: Add imports at top of file (types)**

Add to the existing type imports block:
```typescript
import type {
  AllegroOffersResponse,
  LinkAllegroOfferPayload,
  PushStockResponse,
  StockHistoryResponse,
  LowStockResponse,
} from '../types/admin-api'
```

- [ ] **Step 2: Add 6 new methods to `adminApi` object**

Find the products section inside `adminApi = { ... }` and append after existing product methods:

```typescript
  // ── Products: stock history & low-stock ───────────────────────────────────
  getProductStockHistory: (sku: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page)  qs.set('page',  String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    return request<StockHistoryResponse>(
      `/api/admin/products/${encodeURIComponent(sku)}/stock-history?${qs}`
    )
  },

  getLowStockProducts: (threshold = 5) =>
    request<LowStockResponse>(`/api/admin/products/low-stock?threshold=${threshold}`),

  // ── Allegro Products ──────────────────────────────────────────────────────
  getAllegroOffers: (params?: { search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.limit)  qs.set('limit',  String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    return request<AllegroOffersResponse>(`/api/admin/allegro-products/offers?${qs}`)
  },

  linkAllegroOffer: (payload: LinkAllegroOfferPayload) =>
    request<{ success: boolean; data: { sku: string; allegroOfferId: string } }>(
      '/api/admin/allegro-products/link',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  unlinkAllegroOffer: (sku: string) =>
    request<{ success: boolean }>(
      `/api/admin/allegro-products/link/${encodeURIComponent(sku)}`,
      { method: 'DELETE' }
    ),

  pushStockToAllegro: (sku: string) =>
    request<PushStockResponse>(
      `/api/admin/allegro-products/${encodeURIComponent(sku)}/push-stock`,
      { method: 'POST' }
    ),
```

- [ ] **Step 3: Type-check frontend**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/lib/adminApiClient.ts apps/web/src/admin/types/admin-api.ts
git commit -m "feat(web): adminApiClient — stock history, low-stock, allegro offers/link/push methods"
```

---

## Task 6: Products List Redesign

**Files:**
- Modify: `apps/web/src/admin/views/Products/index.tsx`

Changes:
1. Add Allegro status column (shows offer ID badge or "–")
2. Low-stock rows highlighted in amber
3. Quick stock-adjust button per row (opens StockAdjustModal)
4. Low-stock filter tab

- [ ] **Step 1: Add state for modal**

Inside `ProductsView` component, after existing state declarations, add:

```typescript
const [adjustTarget, setAdjustTarget] = useState<AdminProduct | null>(null)
```

- [ ] **Step 2: Add Allegro column to table header**

Find the `<thead>` block. Current headers: SKU | Nazwa | Kategoria | Cena | Dostępne | Status | Akcje.

Replace the header row with:

```tsx
<tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
  <th className="text-left px-4 py-3 font-medium">SKU</th>
  <th className="text-left px-4 py-3 font-medium">Nazwa</th>
  <th className="text-left px-4 py-3 font-medium">Kategoria</th>
  <th className="text-right px-4 py-3 font-medium">Cena</th>
  <th className="text-right px-4 py-3 font-medium">Dostępne</th>
  <th className="text-left px-4 py-3 font-medium">Allegro</th>
  <th className="text-left px-4 py-3 font-medium">Status</th>
  <th className="px-4 py-3" />
</tr>
```

- [ ] **Step 3: Add Allegro column + low-stock highlight to each row**

Find the `products.map((product) => ...)` block. Replace the `<tr>` opening tag and add new cell:

```tsx
<tr
  key={product.sku}
  className={`border-b border-[#F0EFEC] last:border-0 cursor-pointer transition-colors ${
    product.available <= 2
      ? 'bg-[#FFFBEB] hover:bg-[#FEF9C3]'
      : 'hover:bg-[#FAFAF9]'
  }`}
  onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
>
  <td className="px-4 py-3 font-mono text-xs text-[#525252]">{product.sku}</td>
  <td className="px-4 py-3 text-[#1A1A1A] font-medium">{product.name}</td>
  <td className="px-4 py-3 text-[#525252] text-sm">{product.category?.name || '–'}</td>
  <td className="px-4 py-3 text-right tabular-nums text-[#1A1A1A]">{formatPrice(product.price)}</td>
  <td className={`px-4 py-3 text-right tabular-nums font-medium ${
    product.available <= 2 ? 'text-[#D97706]' : 'text-[#1A1A1A]'
  }`}>
    {product.available}
    {product.available <= 2 && <span className="ml-1 text-xs">⚠</span>}
  </td>
  <td className="px-4 py-3">
    {product.allegroOfferId ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF4FF] text-[#0066CC] text-xs font-mono">
        {product.allegroOfferId.slice(0, 8)}…
      </span>
    ) : (
      <span className="text-[#A3A3A3] text-xs">–</span>
    )}
  </td>
  <td className="px-4 py-3">
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      product.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#B91C1C]'
    }`}>
      {product.isActive ? 'Aktywny' : 'Nieaktywny'}
    </span>
  </td>
  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
    <button
      onClick={() => setAdjustTarget(product)}
      className="px-2 py-1 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
      title="Koryguj stan"
    >
      Stan
    </button>
  </td>
</tr>
```

- [ ] **Step 4: Add modal render + import**

At top of file add:
```typescript
import { StockAdjustModal } from './StockAdjustModal'
```

At the end of component JSX, before closing `</div>`, add:
```tsx
{adjustTarget && (
  <StockAdjustModal
    product={adjustTarget}
    onClose={() => setAdjustTarget(null)}
    onSaved={() => { setAdjustTarget(null); void fetchProducts() }}
  />
)}
```

- [ ] **Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "Products/index" | head -10
```
StockAdjustModal import will fail until Task 7 — that's expected. Fix after Task 7.

- [ ] **Step 6: Commit (partial — StockAdjustModal import will be resolved in Task 7)**

```bash
git add apps/web/src/admin/views/Products/index.tsx
git commit -m "feat(web): products list — allegro column, low-stock highlight, quick-adjust button"
```

---

## Task 7: StockAdjustModal

**Files:**
- Create: `apps/web/src/admin/views/Products/StockAdjustModal.tsx`

Modal: select reason from enum, enter new stock number, save via `PUT /admin/products/:sku/stock`.

- [ ] **Step 1: Create file**

```tsx
// apps/web/src/admin/views/Products/StockAdjustModal.tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { AdminProduct } from '../../types/admin-api'

const REASONS: { value: string; label: string }[] = [
  { value: 'manual',    label: 'Ręczna korekta' },
  { value: 'inventory', label: 'Inwentaryzacja' },
  { value: 'damage',    label: 'Uszkodzenie/strata' },
  { value: 'return',    label: 'Zwrot do magazynu' },
]

type Props = {
  product: AdminProduct
  onClose: () => void
  onSaved: () => void
}

export function StockAdjustModal({ product, onClose, onSaved }: Props) {
  const available = Math.max(0, product.stock - product.reserved)
  const [newStock, setNewStock] = useState(String(product.stock))
  const [reason,   setReason]   = useState('manual')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const parsed = Number(newStock)
  const isValid = Number.isInteger(parsed) && parsed >= 0

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      await adminApi.updateProductStock(product.sku, { stock: parsed, reason, notes: notes.trim() || undefined })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E4E1]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1]">
          <div>
            <p className="text-xs text-[#737373] font-mono">{product.sku}</p>
            <h2 className="text-base font-semibold text-[#1A1A1A]">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#737373] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Current state info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'W systemie', value: product.stock },
              { label: 'Zarezerwowane', value: product.reserved },
              { label: 'Dostępne', value: available },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
                <p className="text-xl font-semibold text-[#1A1A1A] tabular-nums">{value}</p>
                <p className="text-xs text-[#737373] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* New stock input */}
          <div>
            <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Nowy stan magazynowy
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={newStock}
              onChange={e => setNewStock(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1A1A1A] text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
              placeholder="0"
            />
            {isValid && parsed !== product.stock && (
              <p className={`text-xs mt-1 ${parsed > product.stock ? 'text-[#047857]' : 'text-[#D97706]'}`}>
                Zmiana: {parsed > product.stock ? '+' : ''}{parsed - product.stock} szt.
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Powód korekty
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
            >
              {REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Notatka <span className="font-normal text-[#A3A3A3]">(opcjonalna)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1A1A1A] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
              placeholder="Np. Znaleziono nadwyżkę podczas liczenia…"
            />
          </div>

          {error && (
            <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E4E1] flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[#E5E4E1] text-[#525252] text-sm hover:bg-[#F5F4F1] transition-colors disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid || parsed === product.stock}
            className="px-5 py-2 rounded-xl bg-[#0066CC] text-white text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-50"
          >
            {saving ? 'Zapisuję…' : 'Zapisz korektę'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify `adminApi.updateProductStock` matches signature**

```bash
grep -n "updateProductStock" apps/web/src/admin/lib/adminApiClient.ts
```
Expected: `updateProductStock: (sku, payload) => request(...)` accepting `{ stock: number; reason: string; notes?: string }`. If the existing method has different param names, adjust the modal call to match.

- [ ] **Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "StockAdjustModal" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/views/Products/StockAdjustModal.tsx
git commit -m "feat(web): StockAdjustModal — manual stock correction with reason + notes"
```

---

## Task 8: StockHistoryModal

**Files:**
- Create: `apps/web/src/admin/views/Products/StockHistoryModal.tsx`

- [ ] **Step 1: Create file**

```tsx
// apps/web/src/admin/views/Products/StockHistoryModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { StockHistoryEntry } from '../../types/admin-api'

const REASON_LABELS: Record<string, string> = {
  order:        'Zamówienie',
  manual:       'Ręczna korekta',
  inventory:    'Inwentaryzacja',
  damage:       'Uszkodzenie',
  allegro_sync: 'Sync Allegro',
  cancellation: 'Anulowanie',
  return:       'Zwrot',
}

type Props = {
  sku: string
  productName: string
  onClose: () => void
}

export function StockHistoryModal({ sku, productName, onClose }: Props) {
  const [entries, setEntries]   = useState<StockHistoryEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)
  const [page,    setPage]      = useState(1)
  const [total,   setTotal]     = useState(0)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    setError(null)
    adminApi.getProductStockHistory(sku, { page, limit: LIMIT })
      .then(res => { setEntries(res.data); setTotal(res.meta.total) })
      .catch(err => setError(err instanceof Error ? err.message : 'Błąd'))
      .finally(() => setLoading(false))
  }, [sku, page])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#E5E4E1] flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1] flex-shrink-0">
          <div>
            <p className="text-xs text-[#737373]">Historia stanu — <span className="font-mono">{sku}</span></p>
            <h2 className="text-base font-semibold text-[#1A1A1A]">{productName}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#737373] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-[#737373] text-sm">Ładowanie…</div>
          ) : error ? (
            <div className="p-6 text-sm text-[#B91C1C] bg-[#FEE2E2] m-4 rounded-xl">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-[#A3A3A3] text-sm">Brak historii zmian</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#FAFAF9]">
                <tr className="text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-right px-4 py-3 font-medium">Poprzednio</th>
                  <th className="text-right px-4 py-3 font-medium">Zmiana</th>
                  <th className="text-right px-4 py-3 font-medium">Po zmianie</th>
                  <th className="text-left px-4 py-3 font-medium">Powód</th>
                  <th className="text-left px-4 py-3 font-medium">Notatka</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3 text-[#525252] tabular-nums text-xs">
                      {new Date(entry.createdAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#737373]">{entry.previousStock}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${
                      entry.change > 0 ? 'text-[#047857]' : entry.change < 0 ? 'text-[#B91C1C]' : 'text-[#737373]'
                    }`}>
                      <span className="inline-flex items-center gap-1">
                        {entry.change > 0 ? <TrendingUp size={12} /> : entry.change < 0 ? <TrendingDown size={12} /> : null}
                        {entry.change > 0 ? '+' : ''}{entry.change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#1A1A1A]">{entry.newStock}</td>
                    <td className="px-4 py-3 text-[#525252] text-xs">
                      {REASON_LABELS[entry.reason] ?? entry.reason}
                    </td>
                    <td className="px-4 py-3 text-[#737373] text-xs max-w-[180px] truncate" title={entry.notes ?? ''}>
                      {entry.notes || '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#E5E4E1] text-sm text-[#737373] flex-shrink-0">
            <span>{total} wpisów</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                ←
              </button>
              <span className="px-2 py-1">{page} / {Math.ceil(total / LIMIT)}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="px-3 py-1 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "StockHistoryModal" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/views/Products/StockHistoryModal.tsx
git commit -m "feat(web): StockHistoryModal — paginated stock change audit trail"
```

---

## Task 9: Product Editor — Tabbed Layout

**Files:**
- Modify: `apps/web/src/admin/views/Products/ProductEditorView.tsx`

Replace single-page form with 4 tabs: **Podstawowe** | **Ceny & Magazyn** | **Allegro** | **Media & SEO**.

- [ ] **Step 1: Add tab state + imports**

At top of `ProductEditorView`, add import:
```typescript
import { StockHistoryModal } from './StockHistoryModal'
import { AllegroLinkModal }  from './AllegroLinkModal'
```

Inside component, add state:
```typescript
type Tab = 'basic' | 'pricing' | 'allegro' | 'media'
const [activeTab,        setActiveTab]        = useState<Tab>('basic')
const [showStockHistory, setShowStockHistory] = useState(false)
const [showAllegroLink,  setShowAllegroLink]  = useState(false)
```

- [ ] **Step 2: Add tab navigation bar**

Find the section where the form title/header is rendered. After the `<h1>` / title block, add the tab bar:

```tsx
{/* Tab navigation */}
<div className="flex gap-1 border-b border-[#E5E4E1] mb-6">
  {([
    { id: 'basic',   label: 'Podstawowe' },
    { id: 'pricing', label: 'Ceny & Magazyn' },
    { id: 'allegro', label: 'Allegro' },
    { id: 'media',   label: 'Media & SEO' },
  ] as const).map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        activeTab === tab.id
          ? 'border-[#0066CC] text-[#0066CC]'
          : 'border-transparent text-[#737373] hover:text-[#1A1A1A]'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Wrap existing fields in tab conditionals**

The existing form has fields: name, sku, categoryId, description, longDescription (→ **basic** tab), price, compareAtPrice, stock, weight (→ **pricing** tab), allegroOfferId (→ **allegro** tab), imageUrl + images (→ **media** tab), origin, year, isActive, isNew, isFeatured, metaTitle, metaDescription.

Wrap field groups:

```tsx
{/* BASIC TAB */}
{activeTab === 'basic' && (
  <div className="space-y-5">
    {/* sku, name, categoryId, description, longDescription, origin, year */}
    {/* Copy existing JSX for these fields here */}
    {/* isActive, isNew, isFeatured toggles */}
  </div>
)}

{/* PRICING & STOCK TAB */}
{activeTab === 'pricing' && (
  <div className="space-y-5">
    {/* price, compareAtPrice, weight fields */}

    {/* Stock section — enhanced */}
    <div className="rounded-xl border border-[#E5E4E1] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Stan magazynowy</h3>
        {!isCreateMode && (
          <button
            type="button"
            onClick={() => setShowStockHistory(true)}
            className="text-xs text-[#0066CC] hover:underline"
          >
            Historia zmian
          </button>
        )}
      </div>

      {/* stock input — read-only in edit mode with note */}
      {isCreateMode ? (
        <div>
          <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
            Stan początkowy
          </label>
          {/* existing stock input */}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'W systemie', value: product?.stock ?? 0 },
            { label: 'Zarezerwowane', value: product?.reserved ?? 0 },
            { label: 'Dostępne', value: Math.max(0, (product?.stock ?? 0) - (product?.reserved ?? 0)) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
              <p className="text-xl font-semibold text-[#1A1A1A] tabular-nums">{value}</p>
              <p className="text-xs text-[#737373] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
      {!isCreateMode && (
        <p className="text-xs text-[#737373]">
          Zmień stan magazynowy przez przycisk "Stan" na liście produktów lub w sekcji Magazyn.
        </p>
      )}
    </div>
  </div>
)}

{/* ALLEGRO TAB */}
{activeTab === 'allegro' && (
  <div className="space-y-5">
    <div className="rounded-xl border border-[#E5E4E1] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Powiązana oferta Allegro</h3>
          <p className="text-xs text-[#737373] mt-0.5">1:1 — jeden SKU = jedna oferta</p>
        </div>
        {!isCreateMode && (
          <button
            type="button"
            onClick={() => setShowAllegroLink(true)}
            className="px-3 py-1.5 rounded-lg bg-[#EEF4FF] text-[#0066CC] text-xs font-medium hover:bg-[#DBEAFE] transition-colors"
          >
            Przeglądaj oferty
          </button>
        )}
      </div>

      {form.allegroOfferId ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#EEF4FF] border border-[#BFDBFE]">
          <div className="flex-1">
            <p className="text-xs text-[#737373]">ID oferty</p>
            <p className="font-mono text-sm font-semibold text-[#0066CC]">{form.allegroOfferId}</p>
          </div>
          <button
            type="button"
            onClick={() => handleFieldChange('allegroOfferId', '')}
            className="text-xs text-[#737373] hover:text-[#B91C1C] transition-colors"
          >
            Odłącz
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#FAF9F7] border border-dashed border-[#E5E4E1] text-center">
          <p className="text-sm text-[#737373]">Brak powiązanej oferty</p>
          {!isCreateMode && (
            <button
              type="button"
              onClick={() => setShowAllegroLink(true)}
              className="mt-2 text-sm text-[#0066CC] hover:underline"
            >
              Połącz z ofertą Allegro →
            </button>
          )}
        </div>
      )}

      {/* Manual offerId input as fallback */}
      <div>
        <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
          Lub wpisz ID ręcznie
        </label>
        <input
          type="text"
          value={form.allegroOfferId}
          onChange={e => handleFieldChange('allegroOfferId', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] font-mono text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
          placeholder="np. 12345678901"
        />
      </div>
    </div>
  </div>
)}

{/* MEDIA & SEO TAB */}
{activeTab === 'media' && (
  <div className="space-y-5">
    {/* existing imageUrl upload + images gallery + metaTitle + metaDescription */}
  </div>
)}
```

- [ ] **Step 4: Add modals at bottom of component JSX**

```tsx
{showStockHistory && product && (
  <StockHistoryModal
    sku={product.sku}
    productName={product.name}
    onClose={() => setShowStockHistory(false)}
  />
)}

{showAllegroLink && (
  <AllegroLinkModal
    currentSku={form.sku}
    currentOfferId={form.allegroOfferId || null}
    onLinked={(offerId) => {
      handleFieldChange('allegroOfferId', offerId)
      setShowAllegroLink(false)
    }}
    onClose={() => setShowAllegroLink(false)}
  />
)}
```

- [ ] **Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "ProductEditorView" | head -15
```
AllegroLinkModal import will error until Task 10. Acceptable — fix in Task 10.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/admin/views/Products/ProductEditorView.tsx
git commit -m "feat(web): product editor — tabbed layout (Podstawowe/Ceny/Allegro/Media)"
```

---

## Task 10: AllegroLinkModal

**Files:**
- Create: `apps/web/src/admin/views/Products/AllegroLinkModal.tsx`

Browse Allegro offers, show which are linked, click to link to current product.

- [ ] **Step 1: Create file**

```tsx
// apps/web/src/admin/views/Products/AllegroLinkModal.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Search, Link, Link2Off, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { AllegroOffer } from '../../types/admin-api'

type Props = {
  currentSku: string
  currentOfferId: string | null
  onLinked: (offerId: string) => void
  onClose: () => void
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE:   { label: 'Aktywna',    cls: 'bg-[#ECFDF5] text-[#047857]' },
  INACTIVE: { label: 'Nieaktywna', cls: 'bg-[#F5F4F1] text-[#737373]' },
  ENDED:    { label: 'Zakończona', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
}

export function AllegroLinkModal({ currentSku, currentOfferId, onLinked, onClose }: Props) {
  const [offers,   setOffers]   = useState<AllegroOffer[]>([])
  const [total,    setTotal]    = useState(0)
  const [search,   setSearch]   = useState('')
  const [offset,   setOffset]   = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [linking,  setLinking]  = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const LIMIT = 20
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOffers = (q: string, off: number) => {
    setLoading(true)
    setError(null)
    adminApi.getAllegroOffers({ search: q, limit: LIMIT, offset: off })
      .then(res => { setOffers(res.data); setTotal(res.meta.total) })
      .catch(err => setError(err instanceof Error ? err.message : 'Błąd'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOffers('', 0)
  }, [])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setOffset(0)
      fetchOffers(val, 0)
    }, 400)
  }

  const handleLink = async (offer: AllegroOffer) => {
    setLinking(offer.id)
    setError(null)
    try {
      await adminApi.linkAllegroOffer({ sku: currentSku, offerId: offer.id })
      onLinked(offer.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd łączenia')
    } finally {
      setLinking(null)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#E5E4E1] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Połącz z ofertą Allegro</h2>
            <p className="text-xs text-[#737373]">SKU: <span className="font-mono">{currentSku}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#737373] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[#E5E4E1] flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Szukaj oferty po tytule…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E4E1] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 rounded-xl bg-[#FEE2E2] text-sm text-[#B91C1C]">{error}</div>
          )}
          {loading ? (
            <div className="p-8 text-center text-[#737373] text-sm">Ładowanie ofert…</div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center text-[#A3A3A3] text-sm">Brak ofert</div>
          ) : (
            <div className="divide-y divide-[#F0EFEC]">
              {offers.map(offer => {
                const isCurrentlyLinked = offer.id === currentOfferId
                const isLinkedElsewhere = offer.linkedSku !== null && offer.linkedSku !== currentSku
                const statusInfo = STATUS_LABEL[offer.status] ?? { label: offer.status, cls: 'bg-[#F5F4F1] text-[#737373]' }

                return (
                  <div
                    key={offer.id}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAF9] transition-colors ${
                      isCurrentlyLinked ? 'bg-[#EEF4FF]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{offer.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-[#737373]">{offer.id}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                        {offer.stock !== null && (
                          <span className="text-xs text-[#737373]">Stan: {offer.stock}</span>
                        )}
                        {offer.price !== null && (
                          <span className="text-xs text-[#737373]">{offer.price.toFixed(2)} PLN</span>
                        )}
                      </div>
                      {isLinkedElsewhere && (
                        <p className="text-xs text-[#D97706] mt-0.5">
                          Połączone z: <span className="font-mono">{offer.linkedSku}</span>
                        </p>
                      )}
                      {isCurrentlyLinked && (
                        <p className="text-xs text-[#0066CC] mt-0.5">✓ Aktualnie powiązane</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleLink(offer)}
                      disabled={linking !== null || isCurrentlyLinked}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isCurrentlyLinked
                          ? 'bg-[#EEF4FF] text-[#0066CC] cursor-default'
                          : 'bg-[#F5F4F1] text-[#525252] hover:bg-[#EEF4FF] hover:text-[#0066CC] disabled:opacity-50'
                      }`}
                    >
                      {linking === offer.id ? (
                        'Łączę…'
                      ) : isCurrentlyLinked ? (
                        <><Link size={12} /> Połączone</>
                      ) : (
                        <><Link size={12} /> Połącz</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#E5E4E1] text-sm text-[#737373] flex-shrink-0">
            <span>{total} ofert</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const newOffset = Math.max(0, offset - LIMIT); setOffset(newOffset); fetchOffers(search, newOffset) }}
                disabled={offset === 0}
                className="p-1.5 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                onClick={() => { const newOffset = offset + LIMIT; setOffset(newOffset); fetchOffers(search, newOffset) }}
                disabled={offset + LIMIT >= total}
                className="p-1.5 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check full**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```
All previous import errors should now be resolved.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/views/Products/AllegroLinkModal.tsx
git commit -m "feat(web): AllegroLinkModal — browse Allegro offers, link to product SKU"
```

---

## Task 11: Inventory Connections Page

**Files:**
- Create: `apps/web/src/app/admin/inventory/connections/page.tsx`
- Create: `apps/web/src/admin/views/Inventory/ConnectionsView.tsx`

Shows all products with Allegro offer ID, bulk push-stock action, unlink action.

- [ ] **Step 1: Create page route**

```typescript
// apps/web/src/app/admin/inventory/connections/page.tsx
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'
import { ConnectionsView } from '@/admin/views/Inventory/ConnectionsView'

export const metadata = { title: 'Połączenia Allegro | Admin' }

export default async function ConnectionsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return <ConnectionsView />
}
```

- [ ] **Step 2: Create view**

```tsx
// apps/web/src/admin/views/Inventory/ConnectionsView.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Link2Off, ArrowUpFromLine, ExternalLink } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import type { AdminProduct } from '../types/admin-api'

export function ConnectionsView() {
  const router = useRouter()
  const [products, setProducts]   = useState<AdminProduct[]>([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState<string | null>(null)
  const [pushing,  setPushing]    = useState<string | null>(null)
  const [pushMsg,  setPushMsg]    = useState<{ sku: string; msg: string } | null>(null)
  const [filter,   setFilter]     = useState<'all' | 'linked' | 'unlinked'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getProducts({ limit: 200 })
      setProducts(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handlePushStock = async (sku: string) => {
    setPushing(sku)
    setPushMsg(null)
    try {
      const res = await adminApi.pushStockToAllegro(sku)
      setPushMsg({ sku, msg: `✓ Wysłano stan ${res.data.pushed} szt.` })
    } catch (err) {
      setPushMsg({ sku, msg: `✗ ${err instanceof Error ? err.message : 'Błąd'}` })
    } finally {
      setPushing(null)
    }
  }

  const handleUnlink = async (sku: string) => {
    try {
      await adminApi.unlinkAllegroOffer(sku)
      setProducts(prev => prev.map(p => p.sku === sku ? { ...p, allegroOfferId: null } : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd odłączania')
    }
  }

  const filtered = products.filter(p => {
    if (filter === 'linked')   return !!p.allegroOfferId
    if (filter === 'unlinked') return !p.allegroOfferId
    return true
  })

  const linkedCount   = products.filter(p => !!p.allegroOfferId).length
  const unlinkedCount = products.filter(p => !p.allegroOfferId).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Połączenia Allegro</h1>
          <p className="text-sm text-[#737373] mt-1">Zarządzaj mapowaniem SKU → oferta Allegro</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Wszystkich produktów', value: products.length, icon: null },
          { label: 'Połączonych z Allegro', value: linkedCount,   icon: Link2,    color: '#047857' },
          { label: 'Bez połączenia',        value: unlinkedCount, icon: Link2Off, color: '#D97706' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E4E1] p-5 shadow-sm">
            <p className="text-2xl font-semibold text-[#1A1A1A] tabular-nums">{value}</p>
            <p className="text-xs text-[#737373] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {([
          { id: 'all',      label: `Wszystkie (${products.length})` },
          { id: 'linked',   label: `Połączone (${linkedCount})` },
          { id: 'unlinked', label: `Bez połączenia (${unlinkedCount})` },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-[#EEF4FF] text-[#0066CC]'
                : 'text-[#737373] hover:bg-[#F5F4F1] hover:text-[#1A1A1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Nazwa</th>
              <th className="text-right px-4 py-3 font-medium">Dostępne</th>
              <th className="text-left px-4 py-3 font-medium">Oferta Allegro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F0EFEC]">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.map(product => {
              const available = Math.max(0, product.stock - product.reserved)
              const msg = pushMsg?.sku === product.sku ? pushMsg.msg : null

              return (
                <tr key={product.sku} className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9]">
                  <td
                    className="px-4 py-3 font-mono text-xs text-[#525252] cursor-pointer hover:text-[#0066CC]"
                    onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
                  >
                    {product.sku}
                  </td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{product.name}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                    available <= 2 ? 'text-[#D97706]' : 'text-[#1A1A1A]'
                  }`}>
                    {available}
                  </td>
                  <td className="px-4 py-3">
                    {product.allegroOfferId ? (
                      <div>
                        <span className="font-mono text-xs text-[#0066CC] bg-[#EEF4FF] px-2 py-0.5 rounded-md">
                          {product.allegroOfferId}
                        </span>
                        {msg && (
                          <p className={`text-xs mt-1 ${msg.startsWith('✓') ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                            {msg}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#A3A3A3] text-xs">Nie połączono</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {product.allegroOfferId && (
                        <>
                          <button
                            onClick={() => handlePushStock(product.sku)}
                            disabled={pushing === product.sku}
                            title="Wypchnij stan na Allegro"
                            className="p-1.5 rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#EEF4FF] hover:text-[#0066CC] hover:border-[#BFDBFE] disabled:opacity-40 transition-colors"
                          >
                            <ArrowUpFromLine size={14} />
                          </button>
                          <button
                            onClick={() => handleUnlink(product.sku)}
                            title="Odłącz od Allegro"
                            className="p-1.5 rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#FEE2E2] hover:text-[#B91C1C] hover:border-red-200 transition-colors"
                          >
                            <Link2Off size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}#allegro`)}
                        title="Edytuj produkt"
                        className="p-1.5 rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "ConnectionsView|connections/page" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/inventory/connections/page.tsx \
        apps/web/src/admin/views/Inventory/ConnectionsView.tsx
git commit -m "feat(web): /admin/inventory/connections — Allegro connections overview page"
```

---

## Task 12: Sidebar Navigation Update

**Files:**
- Modify: `apps/web/src/admin/components/layout/Sidebar.tsx`

Changes:
1. Rename "Połączenia" → "Połączenia Allegro" (path stays `/admin/inventory/connections`)
2. Add "Allegro" section with link to `/admin/settings` (OAuth) — currently Allegro page just redirects to settings
3. Add "Niski stan" sub-item under Magazyn pointing to `/admin/products?active=true&lowStock=true`

- [ ] **Step 1: Locate the inventory section**

Find the `navItems` array. The inventory block is:
```typescript
{
  id: 'inventory', icon: Package, label: 'Magazyn', destination: 'Stan magazynowy',
  children: [
    { id: 'inventory-products',    path: '/admin/products',               label: 'Produkty',    icon: Archive },
    { id: 'inventory-connections', path: '/admin/inventory/connections',  label: 'Połączenia',  icon: Link }
  ]
},
```

- [ ] **Step 2: Update inventory section + add Allegro item**

Replace the inventory block with:

```typescript
{
  id: 'inventory', icon: Package, label: 'Magazyn', destination: 'Stan magazynowy',
  children: [
    { id: 'inventory-products',    path: '/admin/products',              label: 'Produkty',          icon: Archive },
    { id: 'inventory-connections', path: '/admin/inventory/connections', label: 'Połączenia Allegro', icon: Link },
  ]
},
```

And add to the imports at top (if `Settings2` not already imported):
```typescript
import { ..., Settings2 } from 'lucide-react'
```

- [ ] **Step 3: Type-check + visual verify**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "Sidebar" | head -5
turbo dev --filter=web
```
Navigate to `/admin` — verify sidebar shows "Połączenia Allegro". Click it → `/admin/inventory/connections` loads.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/components/layout/Sidebar.tsx
git commit -m "feat(web): sidebar — rename Połączenia → Połączenia Allegro"
```

---

## Task 13: End-to-End Verification

- [ ] **Step 1: Start dev servers**

```bash
# Terminal 1
cd apps/api && wrangler dev --port 8787

# Terminal 2  
turbo dev --filter=web
```

- [ ] **Step 2: Verify products list**

Open `http://localhost:3000/admin/products`.
- Allegro column visible
- Low-stock products (available ≤ 2) show amber row + ⚠ icon
- "Stan" button per row opens StockAdjustModal

- [ ] **Step 3: Verify stock adjustment**

Click "Stan" on any product → StockAdjustModal opens. Change stock, select reason, save. List refreshes with new value.

- [ ] **Step 4: Verify product editor tabs**

Click any product → editor opens. Verify 4 tabs: Podstawowe / Ceny & Magazyn / Allegro / Media & SEO. All fields present. "Historia zmian" button on pricing tab opens StockHistoryModal.

- [ ] **Step 5: Verify Allegro linking (if Allegro connected)**

On Allegro tab → "Przeglądaj oferty" → AllegroLinkModal opens with offer list. Click "Połącz" on an offer. `allegroOfferId` field updates. Save product.

- [ ] **Step 6: Verify connections page**

Navigate to `/admin/inventory/connections`. Stats cards show correct counts. Table shows linked/unlinked products. Push-stock button calls API. Unlink button clears connection.

- [ ] **Step 7: Final type-check**

```bash
cd apps/web && npx tsc --noEmit && echo "OK"
cd apps/api && npx tsc --noEmit && echo "OK"
```

Both must output `OK`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: final type-check pass — admin products/warehouse/allegro feature"
```

---

## Self-Review

**Spec coverage:**
- ✅ Product management (own store) — list redesign (Task 6), editor tabbed (Task 9), stock adjust (Task 7)
- ✅ Allegro product management — offers list API (Task 3), link/unlink API (Task 3), AllegroLinkModal (Task 10), push-stock (Task 3)
- ✅ Warehouse / stock management — stock history API (Task 1), StockHistoryModal (Task 8), low-stock endpoint (Task 2), low-stock highlight (Task 6), connections page (Task 11)
- ✅ Admin panel redesign — tabbed editor (Task 9), improved list with Allegro column (Task 6), new connections page (Task 11), sidebar update (Task 12)

**Placeholder scan:** None — all code blocks contain working implementations.

**Type consistency:**
- `adminApi.updateProductStock(sku, { stock, reason, notes })` — must match existing signature in adminApiClient. If signature differs, StockAdjustModal (Task 7 Step 2) must be adjusted.
- `adminApi.getProducts({ limit: 200 })` in ConnectionsView — `getProducts` accepts `AdminProductsQueryParams` which has `limit`. Verify existing type includes `limit`.
- `AllegroOffer.linkedSku` — returned by API (Task 3) and consumed in AllegroLinkModal (Task 10). Consistent.
- `StockHistoryEntry` shape matches what `GET /admin/products/:sku/stock-history` returns (Task 1 columns = Task 4 type fields). Consistent.

**Potential blockers:**
1. `decryptAllegroToken` may not be exported from `lib/allegro.ts` — Task 3 Step 4 covers the fallback to `decryptText`.
2. Allegro `PATCH /sale/product-offers/{offerId}` requires Accept header `application/vnd.allegro.public.v1+json` — included in Task 3.
3. `getProducts` in adminApiClient — verify it accepts `limit` param as query string (it likely does since the API supports `limit`).
