# Env Vars Cleanup — Single Source of Truth

**Date:** 2026-03-23
**Approach:** A — wrangler.json as sole runtime config source

## Problem

Environment variables are scattered across `.env.production`, `wrangler.json`, GitHub Actions, and hardcoded fallbacks in code. This causes:
- Build bakes stale/wrong `NEXT_PUBLIC_*` values into the bundle
- Proxy routes fall back to wrong URLs (`localhost:8787`, `api.ilbuoncaffe.pl`)
- Allegro status endpoint returns 404 because proxy hits wrong API origin

## Design

### Files to delete

| File | Reason |
|------|--------|
| `apps/web/.env.production` | Bakes `NEXT_PUBLIC_*` into build; CF Workers provides them at runtime |
| `apps/web/.env` | Duplicates `.env.local` and `wrangler.json` |

### Files to keep (unchanged)

| File | Purpose |
|------|---------|
| `apps/web/.env.local` | Local dev only (gitignored) |
| `apps/api/.dev.vars` | Local dev secrets for wrangler (gitignored) |
| `packages/db/.env` | Drizzle CLI `DATABASE_URL` (gitignored) |
| `.env` (root) | Master local dev secrets (gitignored) |

### Source of truth: wrangler.json

**`apps/web/wrangler.json`** (already has these, no change needed):
```json
"vars": {
  "INTERNAL_API_URL": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev",
  "NEXT_PUBLIC_API_URL": "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev",
  "NEXT_PUBLIC_SITE_URL": "https://il-buon-caffe-web.ilbuoncaffe19.workers.dev"
}
```

**`apps/api/wrangler.json`** — no changes needed, already correct.

### Code changes: remove dangerous fallbacks

**General admin proxy** (`apps/web/src/app/api/admin/[...slug]/route.ts`):
- Remove: `process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ilbuoncaffe.pl'` fallback chain
- Replace: `const API_ORIGIN = process.env.INTERNAL_API_URL`; if missing → 503 error

**Allegro admin proxy** (`apps/web/src/app/api/admin/allegro/[...slug]/route.ts`):
- Remove: `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'` fallback chain
- Replace: same pattern — `INTERNAL_API_URL` only, 503 if missing

**Rationale:** Server-side proxy routes must never use `NEXT_PUBLIC_*` vars or hardcoded URLs. Only `INTERNAL_API_URL` (set in wrangler.json vars or .env.local for dev).

### GitHub Actions changes

**`.github/workflows/deploy.yml`**:
- Remove injection of `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` during web build step
- Build should be clean — no production values baked in

### Documentation update

**`.env.example`** — update to clearly document:
- Which vars go in `wrangler.json` (non-sensitive, committed)
- Which vars are CF Worker secrets (`wrangler secret put`)
- Which vars are for local dev only

## Migration path

When custom domain is ready (`ilbuoncaffe.pl` / `api.ilbuoncaffe.pl`):
1. Update URLs in both `wrangler.json` files
2. Deploy both workers
3. Done — no code changes, no rebuild needed

## Success criteria

- `apps/web/.env.production` deleted
- `apps/web/.env` deleted
- No `NEXT_PUBLIC_*` vars read in server-side proxy routes
- No hardcoded URL fallbacks in proxy routes
- GitHub Actions build step has no `NEXT_PUBLIC_*` env injection
- Allegro status endpoint returns 200 after deploy
