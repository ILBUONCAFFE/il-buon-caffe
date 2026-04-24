# Il Buon Caffe

Luxury e-commerce platform for coffee, wine, and Italian delicacies. Turborepo monorepo targeting the Polish market.

## Architecture

```
apps/web/          → Next.js 16 storefront + admin panel (App Router, React 19, Tailwind CSS 4, Framer Motion)
apps/web/src/app/  → Pages: /, /sklep, /kawiarnia, /encyklopedia, /checkout, /account, /auth, /admin
apps/api/          → Cloudflare Workers backend (Hono.js 4.11, Drizzle ORM)
packages/db/       → Drizzle ORM schema + client (Neon PostgreSQL) — schema at packages/db/schema/index.ts
packages/types/    → Shared TypeScript types + Zod schemas — main file packages/types/index.ts (536 lines)
docs/              → Architecture, API, security, Allegro strategy docs
```

No `packages/ui` exists — shared UI components live in `apps/web/src/components/ui/`.

## Tech Stack

- **Frontend**: Next.js 16.1.6 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lenis
- **Backend**: Hono.js 4.11 on Cloudflare Workers (edge runtime — no Node.js APIs)
- **Database**: Neon PostgreSQL (serverless) via Drizzle ORM 0.45 + Cloudflare Hyperdrive (production)
- **Infra**: Cloudflare KV (rate limiting, Allegro tokens), R2 (file storage), Workers cron triggers
- **Payments**: Przelewy24 (card, BLIK, bank transfer) — all prices in PLN
- **Auth**: JWT (jose 6.1) — access + refresh tokens, httpOnly cookies, rotation detection
- **Marketplace**: Allegro.pl integration (OAuth2, AES-256-GCM encrypted tokens, order polling)
- **Deployment**: `@opennextjs/cloudflare` for web app (open-next.config.ts), `wrangler` for API
- **Package manager**: npm with workspaces (package.json `workspaces` field)

## Commands

```bash
# Development
turbo dev                              # Dev all apps
turbo dev --filter=web                 # Dev storefront only
turbo dev --filter=api                 # Dev API only

# Build
turbo build                            # Build everything
turbo build --filter=web               # Build single app + deps
turbo lint                             # Lint all
turbo type-check                       # Type-check all

# API (Cloudflare Workers)
cd apps/api && wrangler dev            # Local Workers dev
cd apps/api && wrangler deploy                    # Deploy API

# Web (OpenNext + Cloudflare)
cd apps/web && npm run cf:build        # Build for CF Workers
cd apps/web && npm run cf:deploy       # Deploy web app

# Database (Drizzle)
cd packages/db && npx drizzle-kit generate  # Generate migration SQL
cd packages/db && npx drizzle-kit push      # Push schema (dev only)
cd packages/db && npx drizzle-kit migrate   # Apply migrations (prod)
cd packages/db && npx drizzle-kit studio    # Open Drizzle Studio

# Dependencies
npm install <pkg> --workspace=apps/api            # Add dep to specific workspace
npm install @repo/db --workspace=apps/web         # Add workspace dep
```

## Key Design Decisions

- **Flat product model**: SKU is the primary key (`varchar` PK, not serial id). No variants table. Direct 1:1 Allegro offer mapping. Never add variant/option tables.
- **KV-first Allegro tokens**: encrypted tokens live in Cloudflare KV (fast, avoids Neon wakeup), backed up to `allegroCredentials` table.
- **GDPR via anonymization, not deletion**: users table has `anonymized`, `anonymizedAt`, `dataRetentionUntil` columns. Never hard-delete users — anonymize via GDPR flow.
- **Edge-first**: all API runs on Cloudflare Workers. No `setTimeout`, `setInterval`, `fs`, `path`, `process`. Use `c.executionCtx.waitUntil()` for background work.
- **Admin proxy**: Next.js server actions call the Hono API using `X-Admin-Internal-Secret` header for internal auth, bypassing user JWT requirement.
- **DB client per request**: `dbMiddleware` creates a new Drizzle client per request — Neon HTTP driver in local dev, WebSocket Pool + Hyperdrive in production.
- **Polish-language UI**: all user-facing text in Polish. Admin panel also in Polish. Routes use Polish slugs (`/sklep`, `/kawiarnia`, `/encyklopedia`).

## Database Schema Overview

Schema lives in `packages/db/schema/index.ts`. Key tables:

| Table | PK type | Notes |
|---|---|---|
| `users` | serial | Includes GDPR fields: `anonymized`, `anonymizedAt`, `dataRetentionUntil`, `tokenVersion` |
| `sessions` | uuid | `refreshTokenHash`, `isActive`, `expiresAt` — refresh token rotation |
| `products` | varchar (sku) | Flat model, `allegroOfferId`, `wineDetails`/`coffeeDetails` JSONB |
| `categories` | serial | `layoutConfig` JSONB for per-category display settings |
| `orders` | serial | `customerData` JSONB, `p24*` payment fields, `idempotencyKey` |
| `orderItems` | serial | `productSku` without FK — allows Allegro orders with unmapped products |
| `allegroCredentials` | serial | Encrypted token storage backup |
| `allegroState` | varchar (key) | KV-style state table for Allegro OAuth state |
| `allegroSyncLog` | serial | Full request/response payloads for sync debugging |
| `stockChanges` | serial | Full audit trail for inventory changes |
| `auditLog` | serial | Admin actions log for GDPR compliance |
| `userConsents` | serial | `consentType` enum: terms, privacy, marketing, analytics |
| `legalDocuments` | serial | Versioned legal docs (unique: type + version) |

**Enums**: `userRoleEnum`, `orderStatusEnum`, `orderSourceEnum`, `consentTypeEnum`, `auditActionEnum`, `stockChangeReasonEnum`, `retentionStatusEnum`, `allegroEnvEnum`

## Coding Conventions

- Import shared packages by alias: `import { products } from '@repo/db'`, `import type { Product } from '@repo/types'` — never relative paths across apps
- Schema is one file: `packages/db/schema/index.ts` — add new tables there
- New Drizzle tables: include `id` (serial or uuid), `createdAt`, `updatedAt`. Add `deletedAt` only where soft-delete is needed.
- Column naming: camelCase in TS → snake_case in Postgres (Drizzle `snake_case()` mapper handles this)
- API responses: `{ data: result }` for success, `{ error: { code, message } }` for errors
- Validate with Zod + `@hono/zod-validator` on every mutating endpoint
- Commit format: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Commit scopes: `web`, `api`, `db`, `types`, `allegro`, `infra`

## Middleware Stack (API)

Applied in order per route as needed:

```
rateLimitMiddleware  → Cloudflare KV, 100 req/min per IP
dbMiddleware         → Drizzle client bound to c.var.db
authMiddleware       → JWT Bearer or cookie → c.var.user
adminMiddleware      → role === 'admin' check
auditLogMiddleware   → logs admin actions to audit_log table
```

Security middleware (`securityMiddleware`) is global — applies CORS, security headers, Sec-Fetch CSRF guard.

## Workflows

### New API endpoint
1. Define Zod schema for request body / query params
2. Add route in `apps/api/src/routes/<domain>.ts` or `routes/admin/<domain>.ts`
3. Apply middleware chain: `rateLimitMiddleware` → `dbMiddleware` → `authMiddleware` → `adminMiddleware` (as needed)
4. Return `{ data: result }` or `{ error: { code, message } }`
5. Add types to `packages/types/index.ts` if shared with frontend

### New database table
1. Add table definition in `packages/db/schema/index.ts`
2. Include `id`, `createdAt`, `updatedAt` (add `deletedAt` only if soft-delete needed)
3. Define Drizzle relations in the same file
4. Run `drizzle-kit generate` → review the generated SQL → `drizzle-kit push` (dev) or `migrate` (prod)

### New storefront page
1. Decide Server vs Client Component (default: Server)
2. Create in `apps/web/src/app/<route>/page.tsx`
3. Add `export const metadata` or `generateMetadata` for SEO
4. Polish route slugs: use `/sklep`, `/kawiarnia`, `/encyklopedia` pattern
5. Page-specific components in `apps/web/src/components/<Feature>/`

### New admin feature
1. Page in `apps/web/src/app/admin/<section>/page.tsx`
2. Logic/components in `apps/web/src/admin/views/<section>/`
3. Use DataTable pattern for lists, react-hook-form + Zod for forms
4. All admin routes require admin role check
5. Log significant data mutations to `audit_log` via API

## Important Warnings

- **Allegro tokens are AES-256-GCM encrypted** — never log or expose decrypted values. Encryption in `apps/api/src/lib/crypto.ts`
- **Przelewy24 amounts in grosze** — multiply PLN × 100 before sending to P24
- **Review generated Drizzle migrations** — column renames generate destructive DROP + ADD statements
- **Workers limits**: 128MB memory, 30s CPU, 1000 subrequests per invocation
- **No Node.js APIs in Workers** — no `fs`, `path`, `process.env` (use `c.env`), no `setTimeout`/`setInterval`
- **GDPR/RODO**: audit all user data mutations, maintain consent records in `userConsents`, support data export + anonymization (never hard delete)
- **`products.sku` is the PK** — it's a varchar, not a serial id. All FK references use `productSku` varchar column

## Context Window Management

Używaj context-mode MCP tools zamiast czytać duże pliki bezpośrednio — zachowuje możliwości, nie marnuje okna:

- **Eksploracja / analiza**: `ctx_batch_execute` lub `ctx_execute_file` — wyniki trafiają do sandboxa, nie do kontekstu
- **Wiele zapytań naraz**: `ctx_search(queries: ["q1", "q2"])` — jedna wywołanie zamiast wielu Grep
- **Read** używaj TYLKO gdy zamierzasz edytować plik (Edit wymaga treści w kontekście)
- **Bash** tylko do git/mkdir/rm/mv i komend z krótkim outputem (<20 linii)

Zasada: pełne możliwości diagnostyczne — ale wyniki trzymaj w sandboxie, nie w kontekście.

## Skills

Project-specific skills are in `.claude/skills/`. Consult them for detailed patterns:

- `hono-api` — endpoint structure, middleware, Drizzle queries, error handling
- `drizzle-schema` — table patterns, existing schema overview, migration workflow
- `nextjs-storefront` — pages, components, data fetching, design language, Framer Motion
- `admin-panel` — dashboard, DataTable, forms, command palette, CRUD patterns
- `allegro-integration` — OAuth2, token encryption, cron jobs, product-offer mapping, sync logging
- `checkout-payments` — order flow, P24 registration, webhooks, idempotency, stock reservation
- `gdpr-compliance` — consent tracking, audit logging, data retention, anonymization, export
- `cloudflare-deploy` — wrangler.json, secrets, KV/R2/Hyperdrive setup, deploy checklist
- `turborepo-conventions` — monorepo structure, shared packages, turbo.json pipelines, npm workspaces

## Automation & Lazy Workflow

### Committing
- **Po każdej skończonej zmianie commituj automatycznie** bez pytania — użyj Conventional Commits z odpowiednim scope (`web`, `api`, `db`, `types`, `allegro`, `infra`)
- Jeśli zmiany dotyczą kilku obszarów — jeden commit z wszystkimi plikami
- Nie pytaj o treść commita — sam dobierz sensowną wiadomość na podstawie zmian

### GitHub Actions / Deploy
- **Push = deploy** — po commicie automatycznie pushuj na `main`, CI/CD robi resztę
- Nie pytaj o potwierdzenie push — rób to z automatu po każdym commicie
- Wyjątek: jeśli zmiany są destrukcyjne (DROP tabeli, force-push) — wtedy poczekaj na potwierdzenie

### Neon MCP (baza danych)
- **Do operacji na bazie używaj Neon MCP** zamiast każe użytkownikowi wpisywać komendy w terminalu
- Migracje: użyj `mcp__Neon__run_sql` do wykonania SQL bezpośrednio
- Podgląd schematu: `mcp__Neon__describe_table_schema` / `mcp__Neon__get_database_tables`
- Nigdy nie każ użytkownikowi ręcznie wchodzić do terminala po operacje DB — rób to sam przez MCP

## Neon / Cloudflare Workers — Lessons Learned

### Dlaczego Neon nie zasypia (pułapki)
Neon zawiesza endpoint po **5 min bezczynności**. Każdy z poniższych wzorców to potencjalny killer:

- **`/health` z `SELECT 1`** — monitoring co 30–60s = Neon nigdy nie śpi. Health endpoint nie powinien dotykać DB.
- **In-memory cache w Workers** — module-level variables (`let cache = null`) NIE są współdzielone między invocations. Każde wywołanie crona to fresh isolate = cache zawsze pusty = query za każdym razem.
- **Plaintext tokeny w KV** — jeśli kod zapisuje token bez szyfrowania, a odczytuje z `decryptText()`, każdy odczyt rzuca błąd → fallback do DB → wake-up. Zawsze szyfruj symetrycznie przy zapisie i odczycie.
- **Schema check przez `information_schema`** — `hasTrackingSchema()` odpytywał `information_schema.columns` co 5 min. To query do DB, nie do metadanych Workers. Weryfikuj schemat tylko podczas migracji, nie runtime.
- **Brak KV guard przed "idle" DB query** — cron wywołujący `SELECT ... FROM orders WHERE ...` co 5 min, nawet gdy nie ma zamówień, budzi Neon. Wzorzec: sprawdź KV flag najpierw, uderz w DB tylko gdy jest co robić.

### Wzorzec KV idle guard
```ts
// Na początku funkcji cron:
const flag = await kv.get('feature:has_active_work')
if (flag === '0') return // DB nie budzone

// Gdy brak pracy:
await kv.put('feature:has_active_work', '0', { expirationTtl: 60 * 60 })

// Gdy pojawia się nowa praca (np. nowe zamówienie):
await kv.delete('feature:has_active_work')
```

### Diagnoza "baza aktywna cały dzień"
Patrzeć na wykres Neon Rows → jeśli regularne spiki bez realnego ruchu → cron job. Sprawdź:
1. `wrangler.json` → `triggers.crons` — jakie interwały
2. Każda funkcja crona — czy uderza w DB bezwarunkowo czy ma guard
3. `/health` endpoint — czy ma `dbMiddleware` (nie powinien)
4. KV token flow — czy zapis i odczyt używają tego samego szyfrowania

### Incydent 500 na stronie produktu (2026-04)
- **`workers.dev` bywa mylący**: domena workers.dev jest za Cloudflare Access (302 do logowania), więc do smoke-testów publicznych używaj zawsze `https://ilbuoncaffe.pl`.
- **500 w App Router może nie mieć stack trace**: dla produkcyjnych błędów RSC używaj `wrangler tail il-buon-caffe-web --format json`, bo przeglądarka często pokazuje tylko generyczny 500.
- **To nie był globalny problem R2**: strona produktu zwracała 500 przez ścieżkę renderu RSC, podczas gdy główny obraz produktu z `media.ilbuoncaffe.pl` działał poprawnie.
- **`generateMetadata` musi być odporne**: dla dynamicznych stron produktu unikaj kruchej logiki (runtime DB fetch + złożone OG zależne od danych), bo wyjątek w metadata potrafi wywalić cały request.
- **Ścieżki uploadów wymagają pełnego klucza R2**: `/api/uploads/image/:key` oczekuje realnego key (z prefiksem folderu). URL-e typu `/api/uploads/image/Birria.png` często kończą się 404/522, jeśli obiekt jest zapisany pod inną ścieżką albo nie istnieje.
- **Uważaj na env leakage przy deployu weba**: build OpenNext uruchomiony z lokalnymi wartościami (`NEXT_PUBLIC_API_URL=http://127.0.0.1:8787`) może wypchnąć localhost do bundle i generować błędy CSP/assetów na produkcji.
- **Praktyka deployowa**: dla `apps/web` upewnij się, że podczas `cf:build` używane są produkcyjne API/site URL (`https://api.ilbuoncaffe.pl`, `https://ilbuoncaffe.pl`) albo buduj w czystym środowisku CI.

## Project Status

- Phase 1 (Foundation, DB, Auth, Products, Admin): complete
- Phase 2 (Orders, Payments, Checkout): partially complete
- Phase 3 (Allegro integration): in progress
- Phase 4 (Electron admin app): not started
