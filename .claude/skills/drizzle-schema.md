---
name: drizzle-schema
description: >
  Manage the Drizzle ORM database schema for Il Buon Caffè on Neon PostgreSQL.
  Use this skill whenever the user wants to add a table, modify columns, create indexes, write migrations,
  add relations, or change the database schema in any way. Triggers on: "add table", "new column", "migration",
  "schema change", "database", "drizzle", "add field", "add index", "foreign key", "relation",
  or any work involving the packages/db/ directory. Also use when discussing data modeling decisions
  or when creating new features that require database changes.
---

# Drizzle Schema Skill — Il Buon Caffè

Manage the PostgreSQL database schema via Drizzle ORM, with Neon serverless Postgres.

## Project Context

- Schema lives in `packages/db/src/schema/`
- Drizzle config at `packages/db/drizzle.config.ts`
- Migrations in `packages/db/drizzle/`
- Shared across `apps/api` and any other consumer via `@packages/db`

## Schema File Organization

```
packages/db/src/schema/
├── index.ts          # Re-exports all tables and relations
├── users.ts          # users, sessions
├── products.ts       # products, categories
├── orders.ts         # orders, order_items
├── cart.ts           # cart, cart_items
├── allegro.ts        # allegro_credentials, allegro_sync_log, allegro_state
├── compliance.ts     # user_consents, audit_log
└── stock.ts          # stock_changes
```

Each file exports its tables and their relations. The `index.ts` barrel file re-exports everything.

## Table Definition Pattern

Every table follows this pattern:

```typescript
import { pgTable, uuid, varchar, timestamp, boolean, decimal, integer, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  isActive: boolean('is_active').notNull().default(true),

  // Soft delete + timestamps — include on EVERY table
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));
```

## Key Conventions

### Every table MUST have:
- `id` — UUID primary key with `defaultRandom()`
- `createdAt` — timestamp with timezone, `defaultNow()`
- `updatedAt` — timestamp with timezone, `defaultNow()`
- `deletedAt` — nullable timestamp for soft deletes (GDPR/RODO requirement)

### Column naming:
- Use `camelCase` in TypeScript, Drizzle maps to `snake_case` in Postgres
- Foreign keys: `entityId` pattern (e.g., `categoryId`, `userId`, `orderId`)
- Boolean fields: `is` prefix (e.g., `isActive`, `isVerified`)

### Flat product model:
This project uses a flat product model — each SKU is a standalone row in `products`. There are NO variant tables. This simplifies the 1:1 mapping to Allegro offers. If the user asks about "variants" or "options", redirect them to creating separate product entries.

## Existing Tables Overview

**Core:**
- `users` — email, passwordHash, role (customer/admin), isVerified
- `sessions` — userId, refreshToken, tokenFamily (for rotation detection), expiresAt
- `products` — name, slug, description, price, stock, sku, origin, year, imageUrl, categoryId
- `categories` — name, slug, parentId (self-referencing for subcategories)

**Orders:**
- `orders` — userId (nullable for guests), status, totalAmount, shippingAddress (jsonb), paymentMethod, paymentId
- `order_items` — orderId, productId, quantity, unitPrice, totalPrice

**Allegro:**
- `allegro_credentials` — encryptedAccessToken, encryptedRefreshToken, iv, tag (AES-256-GCM)
- `allegro_sync_log` — type, status, details, retryCount. Auto-purge after 90 days.
- `allegro_state` — key/value store for sync state (last poll timestamp, etc.)

**Compliance (GDPR/RODO):**
- `user_consents` — userId, consentType, granted, grantedAt, revokedAt, ipAddress
- `audit_log` — userId, action, entityType, entityId, oldValue, newValue, ipAddress. Auto-purge after 1 year.
- `stock_changes` — productId, changeType, quantity, reason, orderId

## Migration Workflow

After modifying any schema file:

```bash
# Generate migration
cd packages/db
npx drizzle-kit generate

# Review the generated SQL in drizzle/ directory before applying

# Push to database (dev)
npx drizzle-kit push

# Or apply migration (production)
npx drizzle-kit migrate
```

Always review generated SQL. Drizzle sometimes generates destructive migrations for column renames — check before applying.

## Indexes

Add indexes for frequently queried columns:

```typescript
import { pgTable, index } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  // ... columns
}, (table) => [
  index('products_category_id_idx').on(table.categoryId),
  index('products_slug_idx').on(table.slug),
  index('products_is_active_idx').on(table.isActive),
]);
```

Standard indexes to consider for new tables: foreign keys, slug/lookup fields, status fields, `deletedAt` (for soft-delete filtering).

## Enums

Define PostgreSQL enums for fixed value sets:

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
]);

// Use in table:
status: orderStatusEnum('status').notNull().default('pending'),
```

## JSON Columns

Use `jsonb` for flexible structured data (shipping addresses, metadata):

```typescript
import { jsonb } from 'drizzle-orm/pg-core';

shippingAddress: jsonb('shipping_address').$type<{
  street: string;
  city: string;
  postalCode: string;
  country: string;
}>(),
```
