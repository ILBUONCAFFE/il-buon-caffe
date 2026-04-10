---
name: hono-api
description: >
  Create and modify Hono.js API endpoints running on Cloudflare Workers for the Il Buon Caffe e-commerce backend.
  Use this skill whenever the user wants to add a new API route, endpoint, middleware, or modify existing backend logic.
  Triggers on: "new endpoint", "add route", "API for", "backend for", "hono route", "worker endpoint",
  "add middleware", "API validation", "error handling in API", or any request involving the apps/api/ directory.
  Also use when the user asks about request validation, response formats, or Cloudflare Worker bindings (KV, R2, Hyperdrive).
---

# Hono API Skill — Il Buon Caffe

Build API endpoints in Hono.js on Cloudflare Workers, following project conventions.

## Project Context

- Backend lives in `apps/api/`
- Hono.js framework with TypeScript
- Runs on Cloudflare Workers (edge runtime — no Node.js APIs like `fs`, `path`, `crypto` from Node)
- Database access via Drizzle ORM through Cloudflare Hyperdrive binding
- Uses Cloudflare KV for caching and token storage, R2 for file/image storage

## Route Structure

Routes are organized by domain in `apps/api/src/routes/`:

```
routes/
├── auth/        # login, register, refresh, logout
├── products/    # CRUD, filtering, search
├── orders/      # creation, status, history
├── cart/        # add, remove, update, checkout
├── admin/       # dashboard, management endpoints
├── allegro/     # marketplace sync, webhooks
└── health.ts    # healthcheck
```

Each route file exports a Hono app that gets mounted in the main router.

## Endpoint Pattern

Follow this structure for every new endpoint:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// Define validation schema
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
});

app.post(
  '/',
  zValidator('json', createProductSchema),
  async (c) => {
    const data = c.req.valid('json');
    const db = c.get('db');

    // Business logic here
    const product = await db.insert(products).values(data).returning();

    return c.json({ data: product }, 201);
  }
);

export default app;
```

## Key Conventions

### Environment & Bindings (AppEnv type)

The `AppEnv` type defines Cloudflare bindings available in every handler via `c.env`:

- `c.env.DB` — Hyperdrive binding (use to create Drizzle client)
- `c.env.KV` — Cloudflare KV namespace
- `c.env.R2` — Cloudflare R2 bucket
- `c.env.JWT_SECRET` — secret for token signing
- `c.get('db')` — Drizzle client (set by middleware)
- `c.get('user')` — authenticated user (set by auth middleware)

### Response Format

Always return consistent JSON:

```typescript
// Success
return c.json({ data: result }, 200);
return c.json({ data: result, meta: { page, total } }, 200);

// Created
return c.json({ data: created }, 201);

// Error
return c.json({ error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
```

### Middleware

- `authMiddleware` — verifies JWT, sets `c.get('user')`. Apply to protected routes.
- `adminMiddleware` — checks user role after auth. Apply to admin-only routes.
- `dbMiddleware` — initializes Drizzle client from Hyperdrive. Applied globally.
- `rateLimitMiddleware` — rate limiting via KV. Apply to public-facing endpoints.

Apply middleware in this order: `rateLimitMiddleware → dbMiddleware → authMiddleware → adminMiddleware`

### Drizzle Query Patterns

```typescript
// Select with filters
const items = await db
  .select()
  .from(products)
  .where(and(
    eq(products.categoryId, categoryId),
    eq(products.isActive, true),
  ))
  .orderBy(desc(products.createdAt))
  .limit(limit)
  .offset(offset);

// Insert with returning
const [created] = await db.insert(products).values(data).returning();

// Update
const [updated] = await db
  .update(products)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(products.id, id))
  .returning();

// Soft delete
const [deleted] = await db
  .update(products)
  .set({ deletedAt: new Date() })
  .where(eq(products.id, id))
  .returning();
```

### Error Handling

Use a centralized error handler. Throw typed errors:

```typescript
import { HTTPException } from 'hono/http-exception';

// In route handler:
if (!product) {
  throw new HTTPException(404, { message: 'Product not found' });
}
```

### Pagination

For list endpoints, accept `page` and `limit` query params:

```typescript
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

Return pagination metadata in `meta`:

```typescript
return c.json({
  data: items,
  meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
```

### Cloudflare-Specific Notes

- No `setTimeout`, `setInterval` — use `waitUntil()` for background work
- Max 128MB memory, 30s CPU time (Workers limits)
- Use `c.executionCtx.waitUntil()` for fire-and-forget tasks (logging, analytics)
- Import from `@packages/db` for shared schema, not relative paths across apps
