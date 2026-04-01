# Allegro Invoice Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture Allegro's `invoice` field from checkout forms and surface it as a first-class `invoiceRequired` boolean on the order, with company/NIP data stored in `customerData` JSONB.

**Architecture:** `invoiceRequired` lives as a proper boolean DB column (fast indexed filtering for admin queries); company name, tax ID (NIP), and billing address live in the existing `customerData` JSONB (no new columns). A single `buildCustomerData()` helper replaces three inline duplications in handlers.ts. Zero extra API calls — invoice data is already present in the checkout form.

**Tech Stack:** Drizzle ORM (schema + migration), Hono/Cloudflare Workers (edge), `packages/types` shared types, `drizzle-kit generate` + `push` for migration.

---

## File Map

| File | Change |
|------|--------|
| `apps/api/src/lib/allegro-orders/types.ts` | Add `invoice?` to `AllegroCheckoutForm` |
| `apps/api/src/lib/allegro-orders/helpers.ts` | Add `buildCustomerData(form)` helper |
| `apps/api/src/lib/allegro-orders/handlers.ts` | Use `buildCustomerData`, pass `invoiceRequired` |
| `packages/types/index.ts` | Add `companyName?`, `taxId?`, `invoiceRequired?` to `CustomerData`; add `invoiceRequired?` to `Order` |
| `packages/db/schema/index.ts` | Add `invoiceRequired boolean DEFAULT false` column + partial index |
| Migration | `drizzle-kit generate` → review → `push` (dev) |

---

### Task 1: Extend `AllegroCheckoutForm` with invoice type

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/types.ts`

- [ ] **Step 1: Add invoice interfaces to the types file**

Open `apps/api/src/lib/allegro-orders/types.ts`. After the `AllegroAddress` interface, add:

```typescript
export interface AllegroInvoiceAddress {
  company?: {
    name:  string
    taxId: string
  }
  naturalPerson?: {
    firstName: string
    lastName:  string
  }
  address?: {
    street:      string
    city:        string
    zipCode?:    string
    postCode?:   string
    countryCode: string
  }
}

export interface AllegroInvoice {
  required: boolean
  address?: AllegroInvoiceAddress
}
```

Then add `invoice?: AllegroInvoice` as the last field inside `AllegroCheckoutForm`:

```typescript
export interface AllegroCheckoutForm {
  // ... existing fields unchanged ...
  messageToSeller?: string
  invoice?:         AllegroInvoice   // ← ADD THIS LINE
}
```

- [ ] **Step 2: Type-check**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo type-check --filter=api
```

Expected: passes (no usages of `invoice` yet — no breakage).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/allegro-orders/types.ts
git commit -m "feat(allegro): add AllegroInvoice types to checkout form"
```

---

### Task 2: Add `buildCustomerData` helper

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/helpers.ts`

The `customerData` object is currently built inline in three places in `handlers.ts`. Extract it to a single helper — this is the critical refactor that ensures invoice data is captured consistently without touching handler logic three times.

- [ ] **Step 1: Read the current helpers.ts to understand the file structure**

Open `apps/api/src/lib/allegro-orders/helpers.ts` and note exports: `generateOrderNumber`, `buildShippingAddress`, `fetchCheckoutForm`.

- [ ] **Step 2: Add the helper at the end of helpers.ts**

```typescript
/**
 * Build customerData from an Allegro checkout form.
 * Includes invoice/billing fields when Allegro sends them.
 */
export function buildCustomerData(form: AllegroCheckoutForm): {
  email:           string
  name:            string
  phone?:          string
  shippingAddress: ReturnType<typeof buildShippingAddress> | undefined
  billingAddress?: {
    name:       string
    street:     string
    city:       string
    postalCode: string
    country:    string
  } | undefined
  companyName?:    string
  taxId?:          string
  allegroLogin:    string
} {
  const inv = form.invoice

  const billingAddress = inv?.address?.address
    ? {
        name:       inv.address.company?.name
                    ?? (inv.address.naturalPerson
                      ? `${inv.address.naturalPerson.firstName} ${inv.address.naturalPerson.lastName}`.trim()
                      : form.buyer.firstName && form.buyer.lastName
                        ? `${form.buyer.firstName} ${form.buyer.lastName}`.trim()
                        : form.buyer.login),
        street:     inv.address.address.street,
        city:       inv.address.address.city,
        postalCode: inv.address.address.zipCode ?? inv.address.address.postCode ?? '',
        country:    inv.address.address.countryCode,
      }
    : undefined

  return {
    email:           form.buyer.email,
    name:            `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
    phone:           form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
    shippingAddress: buildShippingAddress(form.delivery.address),
    billingAddress,
    companyName:     inv?.address?.company?.name,
    taxId:           inv?.address?.company?.taxId,
    allegroLogin:    form.buyer.login,
  }
}
```

Also add `AllegroCheckoutForm` to the import at the top of helpers.ts:

```typescript
import type { AllegroCheckoutForm } from './types'
```

- [ ] **Step 3: Type-check**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo type-check --filter=api
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/allegro-orders/helpers.ts
git commit -m "feat(allegro): extract buildCustomerData helper with invoice support"
```

---

### Task 3: Add `invoiceRequired` column to DB schema

**Files:**
- Modify: `packages/db/schema/index.ts`

`invoiceRequired` belongs as a proper column (not in JSONB) so the admin can do `WHERE invoice_required = true` efficiently with an index. The company/NIP data lives in `customerData` JSONB — it's read only when viewing a specific order, not filtered on.

- [ ] **Step 1: Add the column to the orders table in schema/index.ts**

Inside the `orders` table definition, after `internalNotes: text('internal_notes'),` add:

```typescript
  // ===== Faktura =====
  invoiceRequired: boolean('invoice_required').notNull().default(false),
```

- [ ] **Step 2: Add a partial index for the invoice column**

Inside the `orders` table index object (the second argument to `pgTable`), add:

```typescript
  invoiceIdx: index('orders_invoice_idx').on(table.invoiceRequired),
```

- [ ] **Step 3: Add `invoiceRequired` to the `CustomerData` interface in schema/index.ts**

Find the `CustomerData` interface (used by `$type<CustomerData>()`) in schema/index.ts. Add the optional invoice fields:

```typescript
export interface CustomerData {
  email:            string
  name?:            string
  phone?:           string
  shippingAddress?: ShippingAddress
  billingAddress?:  ShippingAddress
  companyName?:     string   // ← ADD
  taxId?:           string   // ← ADD
  allegroLogin?:    string   // ← ADD (was already being stored, just undeclared)
}
```

- [ ] **Step 4: Generate and review the migration**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe/packages/db" && npx drizzle-kit generate
```

Open the generated `.sql` file in `packages/db/migrations/`. Verify it contains:
- `ALTER TABLE "orders" ADD COLUMN "invoice_required" boolean DEFAULT false NOT NULL;`
- `CREATE INDEX "orders_invoice_idx" ON "orders" ("invoice_required");`
- **No DROP statements** — if you see any, stop and investigate before proceeding.

- [ ] **Step 5: Push migration to dev DB**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe/packages/db" && npx drizzle-kit push
```

Expected: "All migrations applied successfully."

- [ ] **Step 6: Type-check**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo type-check --filter=@repo/db
```

- [ ] **Step 7: Commit**

```bash
git add packages/db/schema/index.ts packages/db/migrations/
git commit -m "feat(db): add invoice_required column to orders table"
```

---

### Task 4: Update shared types

**Files:**
- Modify: `packages/types/index.ts`

- [ ] **Step 1: Extend `CustomerData` interface**

Find `CustomerData` at line ~261 of `packages/types/index.ts`. Replace it with:

```typescript
export interface CustomerData {
  email:            string;
  name?:            string;
  phone?:           string;
  shippingAddress?: ShippingAddress;
  billingAddress?:  ShippingAddress;
  companyName?:     string;   // nazwa firmy (z faktury Allegro)
  taxId?:           string;   // NIP (z faktury Allegro)
  allegroLogin?:    string;   // login kupującego na Allegro
}
```

- [ ] **Step 2: Add `invoiceRequired` to `Order` interface**

Find the `Order` interface (line ~224). After `notes?: string;` add:

```typescript
  invoiceRequired?: boolean;  // czy zamówienie wymaga faktury VAT
```

- [ ] **Step 3: Type-check**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo type-check
```

Expected: passes across all packages.

- [ ] **Step 4: Commit**

```bash
git add packages/types/index.ts
git commit -m "feat(types): add invoice fields to CustomerData and Order"
```

---

### Task 5: Update handlers to use `buildCustomerData` and store `invoiceRequired`

**Files:**
- Modify: `apps/api/src/lib/allegro-orders/handlers.ts`

Three handlers (`handleBought`, `handleFilledIn`, `handleReadyForProcessing`) each build `customerData` inline. Replace all three with `buildCustomerData(form)` and pass `invoiceRequired` to the DB.

- [ ] **Step 1: Add `buildCustomerData` to the import line in handlers.ts**

Find the import line:
```typescript
import { generateOrderNumber, buildShippingAddress, fetchCheckoutForm } from './helpers'
```

Replace with:
```typescript
import { generateOrderNumber, buildShippingAddress, buildCustomerData, fetchCheckoutForm } from './helpers'
```

- [ ] **Step 2: Update `handleBought`**

Find the inline `customerData` object in `handleBought` (lines ~72-78):

```typescript
  const customerData = {
    email:        form.buyer.email,
    name:         `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
    phone:        form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
    shippingAddress: buildShippingAddress(form.delivery.address),
    allegroLogin: form.buyer.login,
  }
```

Replace with:

```typescript
  const customerData    = buildCustomerData(form)
  const invoiceRequired = form.invoice?.required === true
```

Then add `invoiceRequired` to the `db.insert(orders).values({...})` call (after `internalNotes`):

```typescript
    invoiceRequired,
```

- [ ] **Step 3: Update `handleFilledIn`**

Find the inline `customerData` object in `handleFilledIn` (lines ~151-157) and replace with:

```typescript
  const customerData    = buildCustomerData(form)
  const invoiceRequired = form.invoice?.required === true
```

Then add `invoiceRequired` to the `.set({ customerData, updatedAt: new Date() })` call:

```typescript
    .set({ customerData, invoiceRequired, updatedAt: new Date() })
```

- [ ] **Step 4: Update `handleReadyForProcessing` — first branch (missed BOUGHT)**

Find the inline `customerData` object inside the `if (!existing)` branch (~lines 204-210):

```typescript
    const customerData = {
      email:           form.buyer.email,
      name:            `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
      phone:           form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
      shippingAddress: buildShippingAddress(form.delivery.address),
      allegroLogin:    form.buyer.login,
    }
```

Replace with:

```typescript
    const customerData    = buildCustomerData(form)
    const invoiceRequired = form.invoice?.required === true
```

Add `invoiceRequired` to the `db.insert(orders).values({...})` call in that branch (after `internalNotes`):

```typescript
      invoiceRequired,
```

Also add `invoiceRequired` to the conflict-resolution `.set(...)` call (the one that updates status after `onConflictDoNothing`):

```typescript
      .set({ status: readyStatus, paidAt, totalPln, exchangeRate, rateDate, invoiceRequired, updatedAt: new Date() })
```

- [ ] **Step 5: Type-check**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo type-check --filter=api
```

Expected: passes. If Drizzle complains about `invoiceRequired` not existing on the insert type, ensure Task 3 (schema change) was applied and the DB package was rebuilt (`turbo build --filter=@repo/db`).

- [ ] **Step 6: Build**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo build --filter=api
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/allegro-orders/handlers.ts
git commit -m "feat(allegro): capture invoice data and invoiceRequired from checkout forms"
```

---

### Task 6: Smoke test via Drizzle Studio

This task verifies the migration and data flow without spinning up a full test environment.

- [ ] **Step 1: Open Drizzle Studio**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe/packages/db" && npx drizzle-kit studio
```

- [ ] **Step 2: Verify schema in Studio**

In the Studio UI, open the `orders` table. Confirm:
- Column `invoice_required` exists with type `boolean`, default `false`
- All existing rows show `invoice_required = false`

- [ ] **Step 3: Manual column check via SQL**

In Drizzle Studio's SQL runner:

```sql
SELECT id, order_number, source,
       invoice_required,
       customer_data->>'companyName' AS company,
       customer_data->>'taxId'       AS nip
FROM orders
WHERE source = 'allegro'
LIMIT 10;
```

Expected: `invoice_required = false` for all existing Allegro orders (correct — they were imported before this feature), `company` and `nip` columns NULL (expected for old orders).

- [ ] **Step 4: Final full type-check**

```bash
cd "C:\Users\User\Documents\1PROJEKTY\Il Buon Caffe" && turbo type-check
```

Expected: 0 errors across all packages.

---

## Self-Review

**Spec coverage:**
- ✅ `AllegroCheckoutForm.invoice` type added
- ✅ `buildCustomerData` extracts `companyName`, `taxId`, `billingAddress`, `invoiceRequired`
- ✅ `invoiceRequired` stored as DB column (indexed)
- ✅ Company/NIP data stored in `customerData` JSONB
- ✅ All three handlers updated (BOUGHT, FILLED_IN, READY_FOR_PROCESSING)
- ✅ Shared types updated (`CustomerData`, `Order`)
- ✅ `allegroLogin` declared in `CustomerData` (was already stored, just undeclared — fixes hidden type inconsistency)

**DB optimization rationale:**
- `invoice_required` as a boolean column → O(1) indexed queries for admin filtering ("pokaż zamówienia na fakturę")
- Company/NIP in JSONB → only read when viewing a specific order, never filtered — no index needed
- Partial index on `invoice_required` kept simple (not `WHERE invoice_required = true`) because Neon + Drizzle works better with simple indexes; the column has very low cardinality anyway

**Workers optimization:**
- Zero extra subrequests — invoice data is in the checkout form already fetched
- `buildCustomerData` is a pure synchronous function — no `await`, no cost
- Three duplicated inline objects replaced with one call
