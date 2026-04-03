# Order Management Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign admin order management — new operational table, context menu, redesigned detail modal, and full bidirectional Allegro Shipment Management integration (create shipments, generate PDF labels, update fulfillment status).

**Architecture:** Backend-first approach. Start with DB schema change and new API endpoints (shipments router, delivery services proxy, label generation). Then rewrite frontend — new table with bulk select, context menu, status badges, detail modal, and shipment modal with 3-step stepper. Remove Kanban completely.

**Tech Stack:** Next.js 16 (React 19), Hono.js (Cloudflare Workers), Drizzle ORM (Neon PostgreSQL), Tailwind CSS 4, Lucide icons, React portals for context menu.

**Spec:** `docs/superpowers/specs/2026-04-03-order-management-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/db/schema/index.ts` | Modify | Add `allegroShipmentId` column to orders table |
| `packages/types/index.ts` | Modify | Add `CreateShipmentRequest`, `CreateShipmentResponse`, `AllegroDeliveryService` types |
| `apps/api/src/lib/allegro-orders/helpers.ts` | Modify | Add `User-Agent` to `allegroHeaders()` |
| `apps/api/src/routes/admin/shipments.ts` | Create | New Hono router: create shipment, get label, delivery services, manual fulfillment |
| `apps/api/src/routes/admin/index.ts` | Modify | Register `adminShipmentsRouter` |
| `apps/web/src/admin/types/admin-api.ts` | Modify | Add `allegroShipmentId` to `AdminOrder`, shipment types |
| `apps/web/src/admin/lib/adminApiClient.ts` | Modify | Add shipment API methods |
| `apps/web/src/admin/components/OrderStatusBadge.tsx` | Create | New badge component with Allegro fulfillment sync indicator |
| `apps/web/src/admin/components/OrderContextMenu.tsx` | Create | Right-click context menu via React portal |
| `apps/web/src/admin/components/BulkActionBar.tsx` | Create | Floating action bar for bulk operations |
| `apps/web/src/admin/components/ShipmentModal.tsx` | Create | 3-step stepper modal for creating shipments |
| `apps/web/src/admin/components/OrderDetailModal.tsx` | Rewrite | Redesigned two-column modal |
| `apps/web/src/admin/views/Orders/index.tsx` | Rewrite | New operational table with all integrations |

---

## Task 1: DB Schema — Add `allegroShipmentId` Column

**Files:**
- Modify: `packages/db/schema/index.ts:394-462` (orders table)

- [ ] **Step 1: Add column to orders table**

In `packages/db/schema/index.ts`, find the shipping section of the orders table (after `trackingStatus` on line ~432) and add the new column:

```typescript
// Find this line:
  trackingStatus: varchar('tracking_status', { length: 255 }),

// Add after it:
  allegroShipmentId: varchar('allegro_shipment_id', { length: 36 }),
```

- [ ] **Step 2: Generate migration**

Run:
```bash
cd packages/db && npx drizzle-kit generate
```

Expected: A new SQL migration file in `packages/db/drizzle/` containing `ALTER TABLE orders ADD COLUMN allegro_shipment_id varchar(36)`.

**Review the generated SQL** — ensure it's a simple ADD COLUMN, not a destructive DROP+ADD.

- [ ] **Step 3: Push schema (dev)**

Run:
```bash
cd packages/db && npx drizzle-kit push
```

Expected: Schema applied successfully.

- [ ] **Step 4: Commit**

```bash
git add packages/db/schema/index.ts packages/db/drizzle/
git commit -m "feat(db): add allegroShipmentId column to orders table"
```

---

## Task 2: Shared Types — Add Shipment Types

**Files:**
- Modify: `packages/types/index.ts`
- Modify: `apps/web/src/admin/types/admin-api.ts`

- [ ] **Step 1: Add types to packages/types/index.ts**

Add at the end of the file, before the final closing (if any), or after the last export:

```typescript
// ── Allegro Shipment Management ──────────────────────────────────────────────

export interface CreateShipmentRequest {
  carrierId: string
  deliveryMethodId: string
  weight: number
  length: number
  width: number
  height: number
  referenceNumber?: string
}

export interface CreateShipmentResponse {
  shipmentId: string
  trackingNumber: string
  status: 'shipped'
}

export interface AllegroDeliveryService {
  id: string
  name: string
  carrierId: string
  maxWeight: number
  maxLength: number
  maxWidth: number
  maxHeight: number
  volumetricDivisor: number | null
}
```

- [ ] **Step 2: Update AdminOrder type in admin-api.ts**

In `apps/web/src/admin/types/admin-api.ts`, add `allegroShipmentId` and `allegroFulfillmentStatus` to the `AdminOrder` interface (after `trackingStatus` on line ~115):

```typescript
// Find:
  trackingStatus?: string | null

// Add after:
  allegroShipmentId?: string | null
  allegroFulfillmentStatus?: string | null
```

- [ ] **Step 3: Add shipment-related types to admin-api.ts**

Add after the `AllegroTrackingData` interface (after line ~177):

```typescript
// ── Shipment Management ──────────────────────────────────────────────────────
export interface DeliveryServiceInfo {
  id: string
  name: string
  carrierId: string
  maxWeight: number
  maxLength: number
  maxWidth: number
  maxHeight: number
  volumetricDivisor: number | null
}

export interface DeliveryServicesResponse {
  success: boolean
  data: DeliveryServiceInfo[]
}

export interface CreateShipmentPayload {
  carrierId: string
  deliveryMethodId: string
  weight: number
  length: number
  width: number
  height: number
  referenceNumber?: string
}

export interface ShipmentCreatedResponse {
  success: boolean
  data: {
    shipmentId: string
    trackingNumber: string
    status: 'shipped'
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/types/index.ts apps/web/src/admin/types/admin-api.ts
git commit -m "feat(types): add Allegro shipment management types"
```

---

## Task 3: Backend — User-Agent Header in Allegro Helpers

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/helpers.ts:76-81`

- [ ] **Step 1: Update allegroHeaders function**

Replace the existing `allegroHeaders` function:

```typescript
// Find:
export function allegroHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept:        'application/vnd.allegro.public.v1+json',
  }
}

// Replace with:
const ALLEGRO_USER_AGENT = 'IlBuonCaffe/1.0 (+https://ilbuoncaffe.pl/api-info)'

export function allegroHeaders(accessToken: string, contentType = false) {
  const headers: Record<string, string> = {
    Authorization:  `Bearer ${accessToken}`,
    Accept:         'application/vnd.allegro.public.v1+json',
    'User-Agent':   ALLEGRO_USER_AGENT,
  }
  if (contentType) {
    headers['Content-Type'] = 'application/vnd.allegro.public.v1+json'
  }
  return headers
}
```

- [ ] **Step 2: Update fetchCheckoutForm to use allegroHeaders**

Replace the headers object in `fetchCheckoutForm`:

```typescript
// Find (inside fetchCheckoutForm):
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept:        'application/vnd.allegro.public.v1+json',
    },

// Replace with:
    headers: allegroHeaders(accessToken),
```

- [ ] **Step 3: Verify no other direct header objects exist**

Run:
```bash
cd apps/api && grep -rn "application/vnd.allegro" src/lib/allegro-orders/ --include="*.ts" | grep -v "allegroHeaders"
```

Expected: No results (all Allegro calls should use `allegroHeaders()`). If any remain, update them to use the helper.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/allegro-orders/helpers.ts
git commit -m "feat(api): add User-Agent header to all Allegro API calls"
```

---

## Task 4: Backend — Shipments Router

**Files:**
- Create: `apps/api/src/routes/admin/shipments.ts`
- Modify: `apps/api/src/routes/admin/index.ts:7,66` (register router)
- Modify: `apps/api/src/routes/admin/orders.ts` (add `allegroShipmentId` to GET response)

- [ ] **Step 1: Create the shipments router file**

Create `apps/api/src/routes/admin/shipments.ts`:

```typescript
import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { logAdminAction } from '../../lib/audit'
import { allegroHeaders, sleep } from '../../lib/allegro-orders/helpers'
import { getActiveAllegroToken } from '../../lib/allegro-tokens'
import type { Env } from '../../index'
import { serverError, getClientIp } from '../../lib/request'

export const adminShipmentsRouter = new Hono<{ Bindings: Env }>()

adminShipmentsRouter.use('*', requireAdminOrProxy())

// ── GET /admin/shipment/delivery-services ─────────────────────────────────────
// Proxy + KV cache (1h TTL) to Allegro's delivery services endpoint
adminShipmentsRouter.get('/delivery-services', async (c) => {
  try {
    const cacheKey = 'allegro:delivery-services'
    const cached = await c.env.ALLEGRO_KV.get(cacheKey)
    if (cached) {
      return c.json({ success: true, data: JSON.parse(cached) })
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const resp = await fetch(`${token.apiBase}/shipment-management/delivery-services`, {
      headers: allegroHeaders(token.accessToken),
      signal: AbortSignal.timeout(10_000),
    })

    if (!resp.ok) {
      return c.json({ error: { code: 'ALLEGRO_ERROR', message: `Allegro API error: ${resp.status}` } }, 502)
    }

    const raw = await resp.json() as { deliveryServices: Array<Record<string, unknown>> }
    const services = (raw.deliveryServices ?? []).map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      carrierId: s.carrierId,
      maxWeight: s.maxWeight ?? null,
      maxLength: s.maxLength ?? null,
      maxWidth: s.maxWidth ?? null,
      maxHeight: s.maxHeight ?? null,
      volumetricDivisor: s.volumetricDivisor ?? null,
    }))

    await c.env.ALLEGRO_KV.put(cacheKey, JSON.stringify(services), { expirationTtl: 3600 })

    return c.json({ success: true, data: services })
  } catch (err) {
    return serverError(c, 'GET /admin/shipment/delivery-services', err)
  }
})

// ── POST /admin/orders/:id/shipment ───────────────────────────────────────────
// Create shipment via Allegro Shipment Management API (async command pattern)
adminShipmentsRouter.post('/orders/:id/shipment', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id'), 10)

    // 1. Validate request body
    const body = await c.req.json<{
      carrierId: string
      deliveryMethodId: string
      weight: number
      length: number
      width: number
      height: number
      referenceNumber?: string
    }>()

    if (!body.carrierId || !body.deliveryMethodId || !body.weight || !body.length || !body.width || !body.height) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Brakujace pola: carrierId, deliveryMethodId, weight, length, width, height' } }, 400)
    }

    if (body.referenceNumber && body.referenceNumber.length > 35) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'referenceNumber max 35 znakow (limit ORLEN Paczka)' } }, 400)
    }

    // 2. Fetch the order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zamowienie nie znalezione' } }, 404)
    }
    if (!order.externalId) {
      return c.json({ error: { code: 'NOT_ALLEGRO', message: 'Zamowienie nie pochodzi z Allegro — brak externalId' } }, 400)
    }
    if (!['paid', 'processing'].includes(order.status)) {
      return c.json({ error: { code: 'INVALID_STATUS', message: `Nie mozna nadac przesylki dla statusu: ${order.status}` } }, 400)
    }
    if (order.allegroShipmentId) {
      return c.json({ error: { code: 'ALREADY_SHIPPED', message: 'Przesylka juz zostala nadana' } }, 409)
    }

    // 3. Get Allegro token
    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const apiBase = token.apiBase

    // 4. Generate commandId (UUID v4)
    const commandId = crypto.randomUUID()

    // 5. POST create-commands (async command pattern)
    const createResp = await fetch(`${apiBase}/shipment-management/shipments/create-commands`, {
      method: 'POST',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({
        commandId,
        input: {
          deliveryMethodId: body.deliveryMethodId,
          checkoutFormId: order.externalId,
          packages: [{
            weight: { value: String(body.weight), unit: 'KILOGRAM' },
            dimensions: {
              length: { value: String(body.length), unit: 'CENTIMETER' },
              width: { value: String(body.width), unit: 'CENTIMETER' },
              height: { value: String(body.height), unit: 'CENTIMETER' },
            },
          }],
          ...(body.referenceNumber ? { referenceNumber: body.referenceNumber } : {}),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!createResp.ok) {
      const errBody = await createResp.json().catch(() => ({})) as Record<string, unknown>
      const errMsg = (errBody as { errors?: Array<{ message?: string }> }).errors?.[0]?.message ?? `Allegro error ${createResp.status}`
      return c.json({ error: { code: 'SHIPMENT_CREATE_FAILED', message: errMsg } }, 502)
    }

    // 6. Poll for command completion (respect Retry-After header)
    let shipmentId: string | null = null
    for (let attempt = 0; attempt < 10; attempt++) {
      const pollResp = await fetch(`${apiBase}/shipment-management/shipments/create-commands/${commandId}`, {
        headers: allegroHeaders(token.accessToken),
        signal: AbortSignal.timeout(10_000),
      })

      if (!pollResp.ok) {
        return c.json({ error: { code: 'POLL_FAILED', message: `Polling status failed: ${pollResp.status}` } }, 502)
      }

      const pollData = await pollResp.json() as { status: string; shipmentId?: string; errors?: Array<{ message?: string }> }

      if (pollData.status === 'SUCCESS' && pollData.shipmentId) {
        shipmentId = pollData.shipmentId
        break
      }

      if (pollData.status === 'FAILURE') {
        const errMsg = pollData.errors?.[0]?.message ?? 'Allegro shipment creation failed'
        return c.json({ error: { code: 'SHIPMENT_FAILED', message: errMsg } }, 502)
      }

      // IN_PROGRESS — respect Retry-After header
      const retryAfter = parseInt(pollResp.headers.get('Retry-After') ?? '2', 10)
      await sleep(retryAfter * 1000)
    }

    if (!shipmentId) {
      return c.json({ error: { code: 'TIMEOUT', message: 'Tworzenie przesylki trwa zbyt dlugo — sprobuj ponownie' } }, 504)
    }

    // 7. GET shipment details to extract waybill (tracking number)
    const shipmentResp = await fetch(`${apiBase}/shipment-management/shipments/${shipmentId}`, {
      headers: allegroHeaders(token.accessToken),
      signal: AbortSignal.timeout(10_000),
    })

    let trackingNumber = ''
    if (shipmentResp.ok) {
      const shipmentData = await shipmentResp.json() as { packages?: Array<{ waybill?: string }> }
      trackingNumber = shipmentData.packages?.[0]?.waybill ?? ''
    }

    // 8. PUT fulfillment status → SENT on Allegro
    await fetch(`${apiBase}/order/checkout-forms/${order.externalId}/fulfillment`, {
      method: 'PUT',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({ status: 'SENT' }),
      signal: AbortSignal.timeout(10_000),
    })

    // 9. Update local order
    const now = new Date()
    await db.update(orders).set({
      status: 'shipped',
      shippedAt: now,
      trackingNumber: trackingNumber || null,
      allegroShipmentId: shipmentId,
      allegroFulfillmentStatus: 'SENT',
      updatedAt: now,
    }).where(eq(orders.id, orderId))

    // 10. Audit log
    const adminUser = c.get('adminUser' as never) as { sub?: number } | undefined
    await logAdminAction(db, {
      userId: adminUser?.sub ?? 0,
      action: 'update_order',
      resource: 'order',
      resourceId: String(orderId),
      ipAddress: getClientIp(c),
      details: {
        action: 'shipment_created',
        orderId,
        orderNumber: order.orderNumber,
        shipmentId,
        trackingNumber,
        carrierId: body.carrierId,
      },
    })

    return c.json({
      success: true,
      data: { shipmentId, trackingNumber, status: 'shipped' as const },
    })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/shipment', err)
  }
})

// ── GET /admin/orders/:id/label ───────────────────────────────────────────────
// Fetch shipping label PDF from Allegro
adminShipmentsRouter.get('/orders/:id/label', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id'), 10)

    const [order] = await db.select({
      allegroShipmentId: orders.allegroShipmentId,
      orderNumber: orders.orderNumber,
    }).from(orders).where(eq(orders.id, orderId)).limit(1)

    if (!order) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Zamowienie nie znalezione' } }, 404)
    }
    if (!order.allegroShipmentId) {
      return c.json({ error: { code: 'NO_SHIPMENT', message: 'Przesylka nie zostala jeszcze nadana' } }, 400)
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const labelResp = await fetch(`${token.apiBase}/shipment-management/label`, {
      method: 'POST',
      headers: {
        ...allegroHeaders(token.accessToken, true),
        Accept: 'application/octet-stream',
      },
      body: JSON.stringify({
        shipmentIds: [order.allegroShipmentId],
        pageSize: 'A4',
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!labelResp.ok) {
      return c.json({ error: { code: 'LABEL_FAILED', message: `Nie udalo sie pobrac etykiety: ${labelResp.status}` } }, 502)
    }

    const pdfBuffer = await labelResp.arrayBuffer()
    const filename = `etykieta-${order.orderNumber}.pdf`

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/orders/:id/label', err)
  }
})

// ── POST /admin/orders/:id/fulfillment ────────────────────────────────────────
// Manual fulfillment status update fallback
adminShipmentsRouter.post('/orders/:id/fulfillment', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const orderId = parseInt(c.req.param('id'), 10)
    const body = await c.req.json<{ status: string }>()

    const validStatuses = ['NEW', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SENT', 'PICKED_UP', 'CANCELLED', 'SUSPENDED']
    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: `Nieprawidlowy status: ${body.status}` } }, 400)
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order?.externalId) {
      return c.json({ error: { code: 'NOT_ALLEGRO', message: 'Zamowienie nie pochodzi z Allegro' } }, 400)
    }

    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podlaczone' } }, 401)
    }

    const resp = await fetch(`${token.apiBase}/order/checkout-forms/${order.externalId}/fulfillment`, {
      method: 'PUT',
      headers: allegroHeaders(token.accessToken, true),
      body: JSON.stringify({ status: body.status }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!resp.ok) {
      return c.json({ error: { code: 'FULFILLMENT_FAILED', message: `Allegro error: ${resp.status}` } }, 502)
    }

    await db.update(orders).set({
      allegroFulfillmentStatus: body.status,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId))

    return c.json({ success: true })
  } catch (err) {
    return serverError(c, 'POST /admin/orders/:id/fulfillment', err)
  }
})
```

- [ ] **Step 2: Register shipments router in admin index**

In `apps/api/src/routes/admin/index.ts`, add the import and route:

```typescript
// Add import (after line 11, after adminCategoriesRouter import):
import { adminShipmentsRouter } from './shipments'

// Add route (after line 70, after categories route):
adminRouter.route('/shipment', adminShipmentsRouter)
```

- [ ] **Step 3: Add allegroShipmentId and allegroFulfillmentStatus to GET /admin/orders response**

In `apps/api/src/routes/admin/orders.ts`, find the select columns in the GET `/` handler and add the two new fields. Locate where `trackingStatus` is selected and add after it:

```typescript
// Find in the column list:
        trackingStatus: orders.trackingStatus,

// Add after:
        allegroShipmentId: orders.allegroShipmentId,
        allegroFulfillmentStatus: orders.allegroFulfillmentStatus,
```

Do the same for the GET `/:id` handler if it uses explicit select columns (check if it uses `db.query.orders.findFirst` with columns).

- [ ] **Step 4: Verify getActiveAllegroToken exists and understand its signature**

Run:
```bash
cd apps/api && grep -rn "export.*getActiveAllegroToken" src/ --include="*.ts"
```

Expected: A function that returns `{ accessToken: string, apiBase: string } | null`. If the function name or return shape differs, adjust the import in `shipments.ts` accordingly.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin/shipments.ts apps/api/src/routes/admin/index.ts apps/api/src/routes/admin/orders.ts
git commit -m "feat(api): add Allegro shipment management endpoints

- POST /admin/orders/:id/shipment — create shipment via async command pattern
- GET /admin/orders/:id/label — fetch PDF label from Allegro
- GET /admin/shipment/delivery-services — cached proxy to Allegro
- POST /admin/orders/:id/fulfillment — manual fulfillment fallback"
```

---

## Task 5: Frontend — Admin API Client Updates

**Files:**
- Modify: `apps/web/src/admin/lib/adminApiClient.ts`

- [ ] **Step 1: Add shipment API methods**

In `apps/web/src/admin/lib/adminApiClient.ts`, add the new imports to the type import block at the top (line 1-16):

```typescript
// Add to the import list:
import type {
  // ... existing imports ...
  DeliveryServicesResponse,
  CreateShipmentPayload,
  ShipmentCreatedResponse,
} from '../types/admin-api'
```

Then add the new methods to the `adminApi` object, after the `updateOrderStatus` method (after line ~103):

```typescript
  // ── Shipment Management ────────────────────────────────────────────────────
  getDeliveryServices: () =>
    request<DeliveryServicesResponse>('/api/admin/shipment/delivery-services'),

  createShipment: (orderId: number, payload: CreateShipmentPayload) =>
    request<ShipmentCreatedResponse>(`/api/admin/orders/${orderId}/shipment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getShipmentLabel: async (orderId: number): Promise<Blob> => {
    const res = await fetch(`/api/admin/orders/${orderId}/label`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, (body as { error?: { code?: string } }).error?.code ?? 'LABEL_ERROR', (body as { error?: { message?: string } }).error?.message ?? 'Nie udalo sie pobrac etykiety')
    }
    return res.blob()
  },

  updateFulfillmentStatus: (orderId: number, status: string) =>
    request<{ success: boolean }>(`/api/admin/orders/${orderId}/fulfillment`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
```

- [ ] **Step 2: Add new types to the re-export block**

In the re-export block at the bottom (line ~159-181), add the new types:

```typescript
// Add to the existing re-export:
export type {
  // ... existing exports ...
  DeliveryServicesResponse,
  DeliveryServiceInfo,
  CreateShipmentPayload,
  ShipmentCreatedResponse,
} from '../types/admin-api'
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/lib/adminApiClient.ts
git commit -m "feat(web): add shipment management methods to admin API client"
```

---

## Task 6: Frontend — OrderStatusBadge Component

**Files:**
- Create: `apps/web/src/admin/components/OrderStatusBadge.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/admin/components/OrderStatusBadge.tsx`:

```tsx
'use client'

interface OrderStatusBadgeProps {
  status: string
  source?: string
  allegroFulfillmentStatus?: string | null
  paymentMethod?: string | null
  paidAt?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Oczekujace',   className: 'badge-warning' },
  paid:       { label: 'Oplacone',     className: 'badge-success' },
  processing: { label: 'W realizacji', className: 'badge-info' },
  shipped:    { label: 'Wyslane',      className: 'badge-neutral' },
  delivered:  { label: 'Dostarczone',  className: 'badge-success' },
  cancelled:  { label: 'Anulowane',    className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
}

// Map of Allegro fulfillment statuses that are "in sync" with local status
const ALLEGRO_SYNC_MAP: Record<string, string[]> = {
  pending:    ['NEW'],
  paid:       ['NEW', 'PROCESSING'],
  processing: ['PROCESSING', 'READY_FOR_SHIPMENT'],
  shipped:    ['SENT', 'PICKED_UP'],
  delivered:  ['SENT', 'PICKED_UP'],
  cancelled:  ['CANCELLED'],
}

export function OrderStatusBadge({
  status,
  source,
  allegroFulfillmentStatus,
  paymentMethod,
  paidAt,
}: OrderStatusBadgeProps) {
  // COD handling
  const isCod = paymentMethod === 'CASH_ON_DELIVERY'
  if (isCod && status !== 'cancelled') {
    const isPaid = status === 'delivered' || !!paidAt
    if (status === 'shipped') {
      return <span className="badge-neutral">Wyslane</span>
    }
    if (status === 'delivered') {
      return <span className="badge-success">Dostarczone</span>
    }
    return (
      <span className="badge-success">
        {isPaid ? 'Oplacone' : 'Platnosc przy odbiorze'}
      </span>
    )
  }

  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-neutral' }

  // Check Allegro sync status
  const isAllegro = source === 'allegro'
  const hasAllegroStatus = isAllegro && allegroFulfillmentStatus
  const isSynced = hasAllegroStatus
    ? (ALLEGRO_SYNC_MAP[status] ?? []).includes(allegroFulfillmentStatus!)
    : true

  if (!isAllegro || !hasAllegroStatus) {
    return <span className={config.className}>{config.label}</span>
  }

  // Allegro order with fulfillment status
  return (
    <span className={`${config.className} inline-flex items-center gap-1.5`}>
      {config.label}
      {isSynced ? (
        <span className="text-[10px] opacity-60" title={`Allegro: ${allegroFulfillmentStatus}`}>
          {allegroFulfillmentStatus}
        </span>
      ) : (
        <span
          className="text-[10px] text-amber-600 font-medium"
          title={`Rozbieznosc: lokalny=${status}, Allegro=${allegroFulfillmentStatus}`}
        >
          ⚠ {allegroFulfillmentStatus}
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/components/OrderStatusBadge.tsx
git commit -m "feat(web): add OrderStatusBadge with Allegro fulfillment sync indicator"
```

---

## Task 7: Frontend — OrderContextMenu Component

**Files:**
- Create: `apps/web/src/admin/components/OrderContextMenu.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/admin/components/OrderContextMenu.tsx`:

```tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { AdminOrder } from '../types/admin-api'

interface ContextMenuProps {
  order: AdminOrder
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetails: (order: AdminOrder) => void
  onChangeStatus: (order: AdminOrder, status: string) => void
  onCreateShipment: (order: AdminOrder) => void
  onDownloadLabel: (order: AdminOrder) => void
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:    ['paid', 'cancelled'],
  paid:       ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  [],
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Oczekujace',
  paid:       'Oplacone',
  processing: 'W realizacji',
  shipped:    'Wyslane',
  delivered:  'Dostarczone',
  cancelled:  'Anulowane',
}

export function OrderContextMenu({
  order,
  position,
  onClose,
  onOpenDetails,
  onChangeStatus,
  onCreateShipment,
  onDownloadLabel,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Position adjustment to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const menu = menuRef.current

    if (rect.right > window.innerWidth) {
      menu.style.left = `${position.x - rect.width}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${position.y - rect.height}px`
    }
  }, [position])

  // Close on Escape or click outside
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', onClose)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', onClose)
    }
  }, [handleKeyDown, onClose])

  const allowed = STATUS_TRANSITIONS[order.status] ?? []
  const canShip = ['paid', 'processing'].includes(order.status)
  const hasLabel = !!order.allegroShipmentId

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    onClose()
  }

  const allStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1 text-sm text-[#1A1A1A] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Open details */}
      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] flex items-center justify-between"
        onClick={() => { onOpenDetails(order); onClose() }}
      >
        Otworz szczegoly
        <span className="text-xs text-[#A3A3A3]">↵</span>
      </button>

      <div className="h-px bg-[#F0EFEC] my-1" />

      {/* Change status — submenu */}
      <div className="group relative">
        <button className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] flex items-center justify-between">
          Zmien status
          <span className="text-xs text-[#A3A3A3]">›</span>
        </button>
        <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-[180px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1">
          {allStatuses.map((s) => {
            const isAllowed = allowed.includes(s)
            const isCurrent = s === order.status
            return (
              <button
                key={s}
                disabled={!isAllowed}
                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 ${
                  isCurrent
                    ? 'text-[#1A1A1A] font-medium'
                    : isAllowed
                      ? 'hover:bg-[#F5F4F1] text-[#1A1A1A]'
                      : 'text-[#D4D3D0] cursor-not-allowed'
                }`}
                onClick={() => {
                  if (isAllowed) {
                    onChangeStatus(order, s)
                    onClose()
                  }
                }}
              >
                {isCurrent && <span className="text-xs">✓</span>}
                {STATUS_LABELS[s] ?? s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-[#F0EFEC] my-1" />

      {/* Ship */}
      <button
        disabled={!canShip}
        className={`w-full px-3 py-2 text-left ${canShip ? 'hover:bg-[#F5F4F1]' : 'text-[#D4D3D0] cursor-not-allowed'}`}
        onClick={() => { if (canShip) { onCreateShipment(order); onClose() } }}
      >
        Nadaj przesylke
      </button>

      {/* Download label */}
      <button
        disabled={!hasLabel}
        className={`w-full px-3 py-2 text-left ${hasLabel ? 'hover:bg-[#F5F4F1]' : 'text-[#D4D3D0] cursor-not-allowed'}`}
        onClick={() => { if (hasLabel) { onDownloadLabel(order); onClose() } }}
        title={!hasLabel ? 'Najpierw nadaj przesylke' : undefined}
      >
        Pobierz etykiete
      </button>

      <div className="h-px bg-[#F0EFEC] my-1" />

      {/* Copy actions */}
      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(order.orderNumber)}
      >
        Kopiuj nr zamowienia
      </button>
      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(order.customerData?.email ?? '')}
      >
        Kopiuj email klienta
      </button>

      {/* Allegro link */}
      {order.source === 'allegro' && order.externalId && (
        <>
          <div className="h-px bg-[#F0EFEC] my-1" />
          <a
            href={`https://allegro.pl/moje-allegro/sprzedaz/zamowienia/${order.externalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
            onClick={onClose}
          >
            Otworz na Allegro <span className="text-xs">↗</span>
          </a>
        </>
      )}
    </div>
  )

  return createPortal(menuContent, document.body)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/components/OrderContextMenu.tsx
git commit -m "feat(web): add OrderContextMenu with status changes, shipment, copy actions"
```

---

## Task 8: Frontend — BulkActionBar Component

**Files:**
- Create: `apps/web/src/admin/components/BulkActionBar.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/admin/components/BulkActionBar.tsx`:

```tsx
'use client'

import type { AdminOrder } from '../types/admin-api'

interface BulkActionBarProps {
  selectedOrders: AdminOrder[]
  onChangeStatus: (status: string) => void
  onDownloadLabels: () => void
  onClearSelection: () => void
}

export function BulkActionBar({
  selectedOrders,
  onChangeStatus,
  onDownloadLabels,
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedOrders.length === 0) return null

  const hasLabels = selectedOrders.some((o) => !!o.allegroShipmentId)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-3 fade-in duration-200">
      <span className="text-sm font-medium tabular-nums">
        {selectedOrders.length} zaznaczonych
      </span>

      <div className="h-4 w-px bg-white/20" />

      {/* Status change dropdown */}
      <div className="relative group">
        <button className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
          Zmien status ▾
        </button>
        <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 min-w-[160px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1 text-[#1A1A1A]">
          {['paid', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#F5F4F1]"
              onClick={() => onChangeStatus(s)}
            >
              {{ paid: 'Oplacone', processing: 'W realizacji', shipped: 'Wyslane', delivered: 'Dostarczone', cancelled: 'Anulowane' }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Download labels */}
      <button
        disabled={!hasLabels}
        className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${hasLabels ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'}`}
        onClick={onDownloadLabels}
      >
        Pobierz etykiety ZIP
      </button>

      <div className="h-4 w-px bg-white/20" />

      <button
        className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
        onClick={onClearSelection}
      >
        Anuluj zaznaczenie
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/components/BulkActionBar.tsx
git commit -m "feat(web): add BulkActionBar for bulk status changes and label downloads"
```

---

## Task 9: Frontend — ShipmentModal Component

**Files:**
- Create: `apps/web/src/admin/components/ShipmentModal.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/admin/components/ShipmentModal.tsx`:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import type { AdminOrder, DeliveryServiceInfo, CreateShipmentPayload } from '../types/admin-api'

interface ShipmentModalProps {
  order: AdminOrder
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 1 | 2 | 3

const STEP_LABELS = ['Przewoznik', 'Paczka', 'Potwierdzenie']

export function ShipmentModal({ order, isOpen, onClose, onSuccess }: ShipmentModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [services, setServices] = useState<DeliveryServiceInfo[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  // Step 1 state
  const [selectedService, setSelectedService] = useState<DeliveryServiceInfo | null>(null)

  // Step 2 state
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  // Step 3 state
  const [submitting, setSubmitting] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Fetch delivery services on mount
  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setSelectedService(null)
    setLength('')
    setWidth('')
    setHeight('')
    setWeight('')
    setReferenceNumber(order.orderNumber.slice(0, 35))
    setError(null)
    setSubmitting(false)
    setProgressStep(0)

    adminApi.getDeliveryServices()
      .then((res) => setServices(res.data))
      .catch(() => setError('Nie udalo sie pobrac listy przewoznikow'))
      .finally(() => setLoadingServices(false))
  }, [isOpen, order.orderNumber])

  // Volumetric weight calculation
  const volumetricWeight = useMemo(() => {
    const l = parseFloat(length)
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (!selectedService?.volumetricDivisor || !l || !w || !h) return null
    return (l * w * h) / selectedService.volumetricDivisor
  }, [length, width, height, selectedService])

  const actualWeight = parseFloat(weight) || 0
  const chargeableWeight = Math.max(actualWeight, volumetricWeight ?? 0)

  // Dimension validation
  const dimensionError = useMemo(() => {
    if (!selectedService) return null
    const l = parseFloat(length)
    const w = parseFloat(width)
    const h = parseFloat(height)
    const wt = parseFloat(weight)

    const errors: string[] = []
    if (l && selectedService.maxLength && l > selectedService.maxLength) {
      errors.push(`Dlugosc max ${selectedService.maxLength} cm`)
    }
    if (w && selectedService.maxWidth && w > selectedService.maxWidth) {
      errors.push(`Szerokosc max ${selectedService.maxWidth} cm`)
    }
    if (h && selectedService.maxHeight && h > selectedService.maxHeight) {
      errors.push(`Wysokosc max ${selectedService.maxHeight} cm`)
    }
    if (wt && selectedService.maxWeight && chargeableWeight > selectedService.maxWeight) {
      errors.push(`Waga przeliczeniowa max ${selectedService.maxWeight} kg`)
    }
    return errors.length > 0 ? errors : null
  }, [length, width, height, weight, selectedService, chargeableWeight])

  const canProceedStep2 = length && width && height && weight && !dimensionError

  // Submit shipment
  const handleSubmit = async () => {
    if (!selectedService) return
    setSubmitting(true)
    setError(null)

    try {
      setProgressStep(1)
      const payload: CreateShipmentPayload = {
        carrierId: selectedService.carrierId,
        deliveryMethodId: selectedService.id,
        weight: parseFloat(weight),
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        ...(referenceNumber ? { referenceNumber } : {}),
      }

      const result = await adminApi.createShipment(order.id, payload)
      setProgressStep(2)

      // Download label
      setProgressStep(3)
      const blob = await adminApi.getShipmentLabel(order.id)
      setProgressStep(4)

      // Open PDF in new tab
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally {
      setSubmitting(false)
    }
  }

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, submitting])

  if (!isOpen) return null

  // Group services by carrierId for the cards
  const carrierGroups = services.reduce((acc, s) => {
    if (!acc[s.carrierId]) acc[s.carrierId] = []
    acc[s.carrierId].push(s)
    return acc
  }, {} as Record<string, DeliveryServiceInfo[]>)

  const progressLabels = [
    'Tworzenie przesylki w Allegro...',
    'Aktualizacja statusu fulfillment...',
    'Generowanie etykiety PDF...',
    'Gotowe!',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 pb-4">
      <div
        className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={() => !submitting && onClose()}
      />

      <div className="relative w-full max-w-2xl max-h-[84vh] flex flex-col bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-[#E5E4E1] animate-in slide-in-from-bottom-3 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC] shrink-0">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">
            Nadaj przesylke — {order.orderNumber}
          </h2>
          {!submitting && (
            <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Stepper */}
        <div className="px-6 py-3 border-b border-[#F0EFEC] flex items-center gap-3">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step > i + 1 ? 'bg-[#1A1A1A] text-white' :
                step === i + 1 ? 'bg-[#1A1A1A] text-white' :
                'bg-[#F0EFEC] text-[#A3A3A3]'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${step === i + 1 ? 'text-[#1A1A1A] font-medium' : 'text-[#A3A3A3]'}`}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-[#E5E4E1]" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* Step 1: Carrier selection */}
          {step === 1 && (
            <div>
              {loadingServices ? (
                <div className="text-center py-12 text-[#A3A3A3]">Ladowanie przewoznikow...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(carrierGroups).map(([carrierId, svcList]) => (
                    svcList.map((svc) => (
                      <button
                        key={svc.id}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedService?.id === svc.id
                            ? 'border-[#1A1A1A] bg-[#F5F4F1] shadow-sm'
                            : 'border-[#E5E4E1] hover:border-[#A3A3A3] hover:bg-[#FAFAF9]'
                        }`}
                        onClick={() => setSelectedService(svc)}
                      >
                        <div className="font-medium text-sm text-[#1A1A1A]">{svc.carrierId}</div>
                        <div className="text-xs text-[#A3A3A3] mt-1">{svc.name}</div>
                      </button>
                    ))
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Package dimensions */}
          {step === 2 && selectedService && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-3">Wymiary (cm)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Dlugosc</label>
                    <input type="number" min="1" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} className="admin-input w-full" placeholder="cm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Szerokosc</label>
                    <input type="number" min="1" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} className="admin-input w-full" placeholder="cm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Wysokosc</label>
                    <input type="number" min="1" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} className="admin-input w-full" placeholder="cm" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Waga (kg)</label>
                <input type="number" min="0.01" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} className="admin-input w-48" placeholder="kg" />
              </div>

              {/* Volumetric weight calculator */}
              {(actualWeight > 0 || volumetricWeight) && (
                <div className="bg-[#F5F4F1] rounded-xl p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Waga rzeczywista:</span>
                    <span className="tabular-nums">{actualWeight.toFixed(1)} kg</span>
                  </div>
                  {volumetricWeight !== null && (
                    <div className="flex justify-between">
                      <span className="text-[#666]">Waga gabarytowa:</span>
                      <span className="tabular-nums">{volumetricWeight.toFixed(1)} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-1 border-t border-[#E5E4E1]">
                    <span>Waga przeliczeniowa:</span>
                    <span className="tabular-nums">{chargeableWeight.toFixed(1)} kg</span>
                  </div>
                </div>
              )}

              {/* Dimension errors */}
              {dimensionError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {dimensionError.map((err, i) => <div key={i}>⚠ {err}</div>)}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Numer referencyjny <span className="text-[#A3A3A3] font-normal">(opcjonalnie, max 35 zn.)</span>
                </label>
                <input
                  type="text"
                  maxLength={35}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && selectedService && (
            <div className="space-y-4">
              {!submitting ? (
                <div className="bg-[#F5F4F1] rounded-xl p-5 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Przewoznik:</span>
                    <span className="font-medium">{selectedService.carrierId} — {selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Wymiary:</span>
                    <span className="tabular-nums">{length} x {width} x {height} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Waga przeliczeniowa:</span>
                    <span className="tabular-nums">{chargeableWeight.toFixed(1)} kg</span>
                  </div>
                  {referenceNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#666]">Referencja:</span>
                      <span className="font-mono text-xs">{referenceNumber}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {progressLabels.map((label, i) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      {progressStep > i + 1 ? (
                        <span className="text-green-600">✓</span>
                      ) : progressStep === i + 1 ? (
                        <span className="animate-spin">⟳</span>
                      ) : (
                        <span className="text-[#D4D3D0]">○</span>
                      )}
                      <span className={progressStep >= i + 1 ? 'text-[#1A1A1A]' : 'text-[#D4D3D0]'}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          <div>
            {step > 1 && !submitting && (
              <button
                className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                ← Wstecz
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {!submitting && (
              <button className="btn-secondary text-sm" onClick={onClose}>Anuluj</button>
            )}
            {step === 1 && (
              <button
                disabled={!selectedService}
                className="btn-primary text-sm disabled:opacity-40"
                onClick={() => setStep(2)}
              >
                Dalej →
              </button>
            )}
            {step === 2 && (
              <button
                disabled={!canProceedStep2}
                className="btn-primary text-sm disabled:opacity-40"
                onClick={() => setStep(3)}
              >
                Dalej →
              </button>
            )}
            {step === 3 && !submitting && (
              <button className="btn-primary text-sm" onClick={handleSubmit}>
                Nadaj i pobierz etykiete →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/components/ShipmentModal.tsx
git commit -m "feat(web): add ShipmentModal — 3-step stepper for creating Allegro shipments"
```

---

## Task 10: Frontend — Redesigned OrderDetailModal

**Files:**
- Rewrite: `apps/web/src/admin/components/OrderDetailModal.tsx`

- [ ] **Step 1: Rewrite the modal**

Replace the entire content of `apps/web/src/admin/components/OrderDetailModal.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import { OrderStatusBadge } from './OrderStatusBadge'
import type { AdminOrder, AllegroTrackingData } from '../types/admin-api'

interface OrderDetailModalProps {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onCreateShipment: (order: AdminOrder) => void
  onDownloadLabel: (order: AdminOrder) => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function formatAmount(value: number | undefined | null, currency = 'PLN'): string {
  if (value == null) return '—'
  const sym: Record<string, string> = { PLN: 'zl', EUR: '€', CZK: 'Kc', HUF: 'Ft' }
  return `${Number(value).toFixed(2)} ${sym[currency] ?? currency}`
}

function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[#666] text-sm">{label}</span>
      <span className="text-sm text-[#1A1A1A] text-right max-w-[60%]">{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2 mt-5 first:mt-0">{children}</h3>
}

export function OrderDetailModal({ order, isOpen, onClose, onCreateShipment, onDownloadLabel }: OrderDetailModalProps) {
  const [tracking, setTracking] = useState<AllegroTrackingData | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !order) return
    setTracking(null)

    if (order.source === 'allegro' && order.externalId && order.trackingNumber) {
      setTrackingLoading(true)
      adminApi.getAllegroOrderTracking(order.externalId)
        .then((res) => setTracking(res.data))
        .catch(() => {})
        .finally(() => setTrackingLoading(false))
    }
  }, [isOpen, order])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !order) return null

  const customer = order.customerData
  const address = customer?.shippingAddress
  const hasShipment = !!order.allegroShipmentId
  const canShip = ['paid', 'processing'].includes(order.status)
  const canCancel = ['pending', 'paid', 'processing'].includes(order.status)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4 pb-4">
      <div className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-[#E5E4E1] animate-in slide-in-from-bottom-3 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{order.orderNumber}</h2>
            {order.source === 'allegro' && (
              <span className="text-[10px] font-medium bg-[#FF5A00]/10 text-[#FF5A00] px-2 py-0.5 rounded-full">Allegro</span>
            )}
            {order.invoiceRequired && (
              <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">FV</span>
            )}
            <OrderStatusBadge
              status={order.status}
              source={order.source}
              allegroFulfillmentStatus={order.allegroFulfillmentStatus}
              paymentMethod={order.paymentMethod}
              paidAt={order.paidAt}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A3A3A3]">{formatDate(order.paidAt ?? order.createdAt)}</span>
            <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 gap-8 px-6 py-5">
            {/* Left column (2/5) */}
            <div className="col-span-2 space-y-1">
              <SectionLabel>Klient</SectionLabel>
              <InfoRow label="Imie" value={customer?.name ?? '—'} />
              <InfoRow label="Email" value={customer?.email ?? '—'} />
              {customer?.phone && <InfoRow label="Telefon" value={customer.phone} />}
              {customer?.allegroLogin && <InfoRow label="Allegro" value={customer.allegroLogin} />}

              <SectionLabel>Dostawa</SectionLabel>
              {address ? (
                <>
                  <InfoRow label="Ulica" value={address.street} />
                  <InfoRow label="Miasto" value={`${address.postalCode} ${address.city}`} />
                  <InfoRow label="Kraj" value={address.country} />
                  {address.phone && <InfoRow label="Telefon" value={address.phone} />}
                </>
              ) : (
                <p className="text-sm text-[#A3A3A3]">Brak adresu dostawy</p>
              )}

              {order.invoiceRequired && (
                <>
                  <SectionLabel>Faktura</SectionLabel>
                  {customer?.companyName && <InfoRow label="Firma" value={customer.companyName} />}
                  {customer?.taxId && <InfoRow label="NIP" value={<span className="font-mono">{customer.taxId}</span>} />}
                  {!customer?.companyName && <p className="text-sm text-[#A3A3A3]">Faktura dla osoby prywatnej</p>}
                </>
              )}

              {order.notes && (
                <>
                  <SectionLabel>Notatka klienta</SectionLabel>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                    {order.notes}
                  </div>
                </>
              )}
            </div>

            {/* Right column (3/5) */}
            <div className="col-span-3 space-y-1">
              <SectionLabel>Produkty</SectionLabel>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#A3A3A3] text-xs">
                    <th className="text-left py-1 font-normal">Produkt</th>
                    <th className="text-right py-1 font-normal w-20">Cena</th>
                    <th className="text-right py-1 font-normal w-12">Ilosc</th>
                    <th className="text-right py-1 font-normal w-24">Razem</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-t border-[#F0EFEC]">
                      <td className="py-2">
                        <div className="font-medium text-[#1A1A1A]">{item.productName}</div>
                        <div className="text-xs text-[#A3A3A3]">{item.productSku}</div>
                      </td>
                      <td className="text-right tabular-nums">{formatAmount(item.unitPrice, order.currency)}</td>
                      <td className="text-right tabular-nums">x{item.quantity}</td>
                      <td className="text-right tabular-nums font-medium">{formatAmount(item.totalPrice, order.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {order.shippingCost != null && Number(order.shippingCost) > 0 && (
                    <tr className="border-t border-[#F0EFEC]">
                      <td colSpan={3} className="py-2 text-[#666]">Dostawa ({order.shippingMethod ?? '—'})</td>
                      <td className="text-right tabular-nums">{formatAmount(order.shippingCost, order.currency)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-[#1A1A1A]">
                    <td colSpan={3} className="py-2 font-semibold">Razem</td>
                    <td className="text-right tabular-nums font-semibold">{formatAmount(order.total, order.currency)}</td>
                  </tr>
                </tfoot>
              </table>

              <SectionLabel>Platnosc</SectionLabel>
              <InfoRow label="Metoda" value={order.paymentMethod ?? '—'} />
              <InfoRow label="Oplacono" value={formatDate(order.paidAt)} />

              <SectionLabel>Przesylka</SectionLabel>
              {hasShipment ? (
                <>
                  <InfoRow label="Numer" value={<span className="font-mono text-xs">{order.trackingNumber ?? '—'}</span>} />
                  {order.allegroFulfillmentStatus && (
                    <InfoRow label="Status Allegro" value={order.allegroFulfillmentStatus} />
                  )}
                  {trackingLoading ? (
                    <p className="text-sm text-[#A3A3A3]">Ladowanie statusu...</p>
                  ) : tracking ? (
                    <>
                      {tracking.carrier && <InfoRow label="Przewoznik" value={tracking.carrier} />}
                      {tracking.statusDescription && <InfoRow label="Status" value={tracking.statusDescription} />}
                    </>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[#A3A3A3]">Brak przesylki</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          <div>
            {canCancel && (
              <button className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                Anuluj zamowienie
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {hasShipment ? (
              <button className="btn-primary text-sm" onClick={() => onDownloadLabel(order)}>
                Pobierz etykiete PDF
              </button>
            ) : canShip ? (
              <button className="btn-primary text-sm" onClick={() => onCreateShipment(order)}>
                Nadaj przesylke →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/components/OrderDetailModal.tsx
git commit -m "feat(web): redesign OrderDetailModal — two-column layout, shipment integration"
```

---

## Task 11: Frontend — Rewrite OrdersView (Main Table)

**Files:**
- Rewrite: `apps/web/src/admin/views/Orders/index.tsx`

This is the largest task — the main orders page with new table, bulk select, context menu integration, and all filters.

- [ ] **Step 1: Rewrite the orders view**

Replace the entire content of `apps/web/src/admin/views/Orders/index.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { adminApi, type AdminOrder, type OrdersQueryParams } from '../../lib/adminApiClient'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { OrderContextMenu } from '../../components/OrderContextMenu'
import { OrderDetailModal } from '../../components/OrderDetailModal'
import { ShipmentModal } from '../../components/ShipmentModal'
import { BulkActionBar } from '../../components/BulkActionBar'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

function formatAmount(value: number | undefined | null, currency = 'PLN'): string {
  if (value == null) return '—'
  const sym: Record<string, string> = { PLN: 'zl', EUR: '€', CZK: 'Kc', HUF: 'Ft' }
  return `${Number(value).toFixed(2)} ${sym[currency] ?? currency}`
}

const STATUS_TABS = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'pending', label: 'Oczekujace' },
  { key: 'paid', label: 'Oplacone' },
  { key: 'processing', label: 'W realizacji' },
  { key: 'shipped', label: 'Wyslane' },
  { key: 'delivered', label: 'Dostarczone' },
  { key: 'cancelled', label: 'Anulowane' },
]

const LIMIT = 50

export default function OrdersView() {
  // Data
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ order: AdminOrder; x: number; y: number } | null>(null)

  // Modals
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null)
  const [shipmentOrder, setShipmentOrder] = useState<AdminOrder | null>(null)

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  // ── Fetch orders ────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: OrdersQueryParams = { page, limit: LIMIT }
      if (statusFilter !== 'all') params.status = statusFilter
      if (sourceFilter) params.source = sourceFilter as 'shop' | 'allegro'
      if (search) params.search = search
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo

      const res = await adminApi.getOrders(params)
      setOrders(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad ladowania zamowien')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, sourceFilter, search, dateFrom, dateTo])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSearch = (value: string) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key)
    setPage(1)
    setSelectedIds(new Set())
  }

  const handleStatusChange = async (order: AdminOrder, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(order.id, newStatus)
      fetchOrders()
    } catch (err) {
      console.error('Status change failed:', err)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, order: AdminOrder) => {
    e.preventDefault()
    setContextMenu({ order, x: e.clientX, y: e.clientY })
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)))
    }
  }

  const handleDownloadLabel = async (order: AdminOrder) => {
    try {
      const blob = await adminApi.getShipmentLabel(order.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (err) {
      console.error('Label download failed:', err)
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    const selected = orders.filter((o) => selectedIds.has(o.id))
    await Promise.allSettled(selected.map((o) => adminApi.updateOrderStatus(o.id, status)))
    setSelectedIds(new Set())
    fetchOrders()
  }

  const handleBulkDownloadLabels = async () => {
    const selected = orders.filter((o) => selectedIds.has(o.id) && o.allegroShipmentId)
    for (const order of selected) {
      await handleDownloadLabel(order)
    }
  }

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id))
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Zamowienia</h1>
          <span className="text-sm text-[#A3A3A3] tabular-nums">{total}</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#F0EFEC]">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
              statusFilter === key
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-medium'
                : 'border-transparent text-[#A3A3A3] hover:text-[#666]'
            }`}
            onClick={() => handleStatusFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Szukaj: nr, email, NIP, telefon, produkt..."
          className="admin-input flex-1"
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <select
          className="admin-input w-44"
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
        >
          <option value="">Wszystkie zrodla</option>
          <option value="shop">Sklep</option>
          <option value="allegro">Allegro</option>
        </select>

        <input
          type="date"
          className="admin-input w-36"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
        />
        <span className="text-[#A3A3A3]">—</span>
        <input
          type="date"
          className="admin-input w-36"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <button className="btn-primary text-sm" onClick={fetchOrders}>Ponow</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E4E1] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-xs">
                <th className="w-[40px] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.size === orders.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#D4D3D0]"
                  />
                </th>
                <th className="text-left px-3 py-3 font-normal w-[180px]">Zamowienie</th>
                <th className="text-left px-3 py-3 font-normal w-[220px]">Klient</th>
                <th className="text-left px-3 py-3 font-normal">Produkty</th>
                <th className="text-right px-3 py-3 font-normal w-[110px]">Kwota</th>
                <th className="text-left px-3 py-3 font-normal w-[160px]">Status</th>
                <th className="w-[48px]" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#F0EFEC]">
                    <td colSpan={7} className="px-3 py-4">
                      <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#A3A3A3]">
                    Brak zamowien
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const firstItem = order.items?.[0]
                  const extraCount = (order.items?.length ?? 0) - 1
                  return (
                    <tr
                      key={order.id}
                      className="border-t border-[#F0EFEC] h-14 hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                      onClick={() => setDetailOrder(order)}
                      onContextMenu={(e) => handleContextMenu(e, order)}
                    >
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => handleToggleSelect(order.id)}
                          className="rounded border-[#D4D3D0]"
                        />
                      </td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums text-[#1A1A1A]">{order.orderNumber}</span>
                          {order.source === 'allegro' && (
                            <span className="text-[9px] font-medium bg-[#FF5A00]/10 text-[#FF5A00] px-1.5 py-0.5 rounded-full leading-none">A</span>
                          )}
                          {order.invoiceRequired && (
                            <span className="text-[9px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full leading-none">FV</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3">
                        <div className="text-[#1A1A1A]">{order.customerData?.name ?? '—'}</div>
                        <div className="text-xs text-[#A3A3A3] truncate max-w-[200px]">{order.customerData?.email ?? ''}</div>
                      </td>
                      <td className="px-3">
                        <span className="text-[#1A1A1A] truncate block max-w-[250px]">{firstItem?.productName ?? '—'}</span>
                        {extraCount > 0 && (
                          <span className="text-xs text-[#A3A3A3]">+{extraCount} wiecej</span>
                        )}
                      </td>
                      <td className="px-3 text-right">
                        <span className="font-medium tabular-nums text-[#1A1A1A]">
                          {formatAmount(order.total, order.currency)}
                        </span>
                        {order.status === 'pending' && (
                          <span className="ml-1 text-amber-500 text-xs" title="Oczekuje na platnosc">⏳</span>
                        )}
                      </td>
                      <td className="px-3">
                        <OrderStatusBadge
                          status={order.status}
                          source={order.source}
                          allegroFulfillmentStatus={order.allegroFulfillmentStatus}
                          paymentMethod={order.paymentMethod}
                          paidAt={order.paidAt}
                        />
                      </td>
                      <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors"
                          onClick={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            setContextMenu({ order, x: rect.left, y: rect.bottom + 4 })
                          }}
                        >
                          ···
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#A3A3A3]">
            Strona {page} z {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              className="btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((p) => p - 1)}
            >
              ← Poprzednia
            </button>
            <button
              disabled={page >= totalPages}
              className="btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Nastepna →
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <OrderContextMenu
          order={contextMenu.order}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onOpenDetails={(o) => setDetailOrder(o)}
          onChangeStatus={handleStatusChange}
          onCreateShipment={(o) => setShipmentOrder(o)}
          onDownloadLabel={handleDownloadLabel}
        />
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={detailOrder}
        isOpen={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onCreateShipment={(o) => { setDetailOrder(null); setShipmentOrder(o) }}
        onDownloadLabel={handleDownloadLabel}
      />

      {/* Shipment Modal */}
      {shipmentOrder && (
        <ShipmentModal
          order={shipmentOrder}
          isOpen={!!shipmentOrder}
          onClose={() => setShipmentOrder(null)}
          onSuccess={() => {
            setShipmentOrder(null)
            fetchOrders()
          }}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedOrders={selectedOrders}
        onChangeStatus={handleBulkStatusChange}
        onDownloadLabels={handleBulkDownloadLabels}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/admin/views/Orders/index.tsx
git commit -m "feat(web): rewrite OrdersView — operational table, bulk select, context menu, shipment integration

Removes Kanban view entirely. New features:
- Custom right-click context menu
- Bulk select with floating action bar
- OrderStatusBadge with Allegro fulfillment sync
- ShipmentModal integration (3-step stepper)
- Redesigned OrderDetailModal (two-column layout)"
```

---

## Task 12: Verify and Fix — Integration Testing

**Files:**
- All modified files from previous tasks

- [ ] **Step 1: Type-check the entire project**

Run:
```bash
cd "C:/Users/User/Documents/1PROJEKTY/Il Buon Caffe" && npx turbo type-check
```

Expected: No type errors. If there are errors, fix them — common issues:
- Missing imports (check `getActiveAllegroToken` import path)
- `adminUser` type on Hono context (`c.get('adminUser')` may need type casting)
- `allegroShipmentId` not yet in the orders query response (verify Task 4 Step 3 was applied)

- [ ] **Step 2: Verify the admin API route registration**

Run:
```bash
cd apps/api && grep -n "shipment" src/routes/admin/index.ts
```

Expected: Line showing `adminRouter.route('/shipment', adminShipmentsRouter)`

- [ ] **Step 3: Verify no leftover Kanban imports**

Run:
```bash
cd apps/web && grep -rn "kanban\|Kanban\|dnd-kit\|DndContext\|PointerSensor\|useSensor" src/admin/ --include="*.tsx" --include="*.ts"
```

Expected: No results. If any remain, clean up the imports.

- [ ] **Step 4: Lint check**

Run:
```bash
cd "C:/Users/User/Documents/1PROJEKTY/Il Buon Caffe" && npx turbo lint
```

Fix any lint errors that arise.

- [ ] **Step 5: Build check**

Run:
```bash
cd "C:/Users/User/Documents/1PROJEKTY/Il Buon Caffe" && npx turbo build
```

Expected: Successful build for all packages.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve type and lint errors from order management redesign"
```

---

## Summary

| Task | Component | Est. Complexity |
|------|-----------|----------------|
| 1 | DB Schema — `allegroShipmentId` | Low |
| 2 | Shared Types — shipment interfaces | Low |
| 3 | Backend — User-Agent in `allegroHeaders()` | Low |
| 4 | Backend — Shipments router (4 endpoints) | High |
| 5 | Frontend — Admin API client updates | Low |
| 6 | Frontend — `OrderStatusBadge` | Medium |
| 7 | Frontend — `OrderContextMenu` | Medium |
| 8 | Frontend — `BulkActionBar` | Low |
| 9 | Frontend — `ShipmentModal` (3-step stepper) | High |
| 10 | Frontend — `OrderDetailModal` redesign | High |
| 11 | Frontend — `OrdersView` rewrite | High |
| 12 | Integration testing & fixes | Medium |
