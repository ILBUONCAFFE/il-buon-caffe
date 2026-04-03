# Infrastructure & Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the production environment fully configured and both apps deployed to Cloudflare Workers with a custom domain.

**Architecture:** API (Hono on CF Workers) and Web (Next.js on OpenNext + CF Workers) are deployed separately via `wrangler deploy`. Secrets are injected via `wrangler secret put`. DB migrations run from `packages/db` against the Neon production database.

**Tech Stack:** Cloudflare Workers, Wrangler CLI, Neon PostgreSQL, Drizzle Kit, npm workspaces

---

## Pre-requisites

- Wrangler installed and authenticated: `wrangler whoami` shows your CF account
- Neon production database exists and `DATABASE_URL` is known
- All secrets from `.env.example` are at hand

---

### Task 1: Audit current secrets in Cloudflare Workers

**Files:**
- Read: `apps/api/wrangler.json` (reference for binding names)
- Read: `.env.example` (master list of required secrets)

- [ ] **Step 1: List currently set secrets for API worker**

```bash
cd apps/api && npx wrangler secret list
```

Expected output: JSON array listing secret names (not values). Note which ones are missing.

- [ ] **Step 2: List currently set secrets for Web worker**

```bash
cd apps/web && npx wrangler secret list
```

- [ ] **Step 3: Cross-reference against required secrets**

Required secrets for API worker (from `.env.example`):
```
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
INTERNAL_API_SECRET
ALLEGRO_CLIENT_ID
ALLEGRO_CLIENT_SECRET
ALLEGRO_TOKEN_ENCRYPTION_KEY
P24_MERCHANT_ID
P24_API_KEY
P24_CRC_KEY
AWS_SES_ACCESS_KEY_ID       ← added in Email plan
AWS_SES_SECRET_ACCESS_KEY   ← added in Email plan
INPOST_API_TOKEN            ← added in InPost plan
```

Required secrets for Web worker:
```
INTERNAL_API_SECRET   ← must match API worker value exactly
```

Mark which are missing — set them in Task 2.

---

### Task 2: Set all missing secrets

**Files:** None (wrangler CLI only)

- [ ] **Step 1: Set each missing API secret interactively**

For each secret that was missing in Task 1, run:
```bash
cd apps/api && npx wrangler secret put SECRET_NAME
```
Wrangler will prompt for the value. Paste it and press Enter.

Example sequence for a fresh setup:
```bash
cd apps/api
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_ACCESS_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
npx wrangler secret put INTERNAL_API_SECRET
npx wrangler secret put ALLEGRO_CLIENT_ID
npx wrangler secret put ALLEGRO_CLIENT_SECRET
npx wrangler secret put ALLEGRO_TOKEN_ENCRYPTION_KEY
npx wrangler secret put P24_MERCHANT_ID
npx wrangler secret put P24_API_KEY
npx wrangler secret put P24_CRC_KEY
```

`ALLEGRO_TOKEN_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — generate strong random values:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

- [ ] **Step 2: Set INTERNAL_API_SECRET for Web worker**

Must be the same value used for API worker:
```bash
cd apps/web && npx wrangler secret put INTERNAL_API_SECRET
```

- [ ] **Step 3: Verify all secrets are now set**

```bash
cd apps/api && npx wrangler secret list
```

Expected: all secrets from Step 1 checklist are present.

- [ ] **Step 4: Commit nothing** — secrets never go in git. This task has no file changes.

---

### Task 3: Run database migrations on production

**Files:**
- Read: `packages/db/migrations/` (verify migration files exist)
- Read: `packages/db/drizzle.config.ts` (verify config points to correct DB)

- [ ] **Step 1: Set DATABASE_URL in local environment for migration**

Migrations run from your local machine against Neon production. Export the production URL:
```bash
export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```
(Use the actual Neon production connection string — not the Hyperdrive pooler URL)

- [ ] **Step 2: Check pending migrations**

```bash
cd packages/db && npx drizzle-kit migrate --dry-run
```

Review the output. It should list all unapplied migration files. Expected migrations to apply if fresh DB:
```
0000_faulty_maximus.sql
0001_even_captain_marvel.sql
...
0007_melted_loki.sql
20260315_advisor_security_hardening.sql
20260315_owner_required_fixes.sql
20260316_allegro_order_columns.sql
```

- [ ] **Step 3: Apply migrations**

```bash
cd packages/db && npx drizzle-kit migrate
```

Expected output: each migration file listed with "✓ applied" status. No errors.

- [ ] **Step 4: Verify schema with a quick connection test**

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT COUNT(*) FROM users\`.then(r => console.log('DB OK, users count:', r[0].count)).catch(console.error);
"
```

Expected: `DB OK, users count: 0` (or whatever the actual count is)

- [ ] **Step 5: Commit nothing** — migrations are already committed to git. This task has no file changes.

---

### Task 4: Deploy API worker to production

**Files:**
- Read: `apps/api/wrangler.json` (verify name, routes, bindings)

- [ ] **Step 1: Build check — ensure no TypeScript errors**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no output (zero errors). If there are errors, fix them before deploying.

- [ ] **Step 2: Deploy API worker**

```bash
cd apps/api && npx wrangler deploy
```

Expected output:
```
Total Upload: ~XXX KiB / gzip: ~XX KiB
Worker Startup Time: XX ms
Deployed il-buon-caffe-api triggers:
  https://il-buon-caffe-api.ilbuoncaffe19.workers.dev
  schedule: 0 * * * *
  schedule: */5 * * * *
  schedule: 0 5 * * *
  schedule: 0 3 * * *
```

- [ ] **Step 3: Smoke test API health**

```bash
curl -s https://il-buon-caffe-api.ilbuoncaffe19.workers.dev/api/products | head -c 200
```

Expected: JSON response starting with `{"data":` or similar. Not an error page.

- [ ] **Step 4: Commit nothing** — this task has no file changes.

---

### Task 5: Deploy Web app to production

**Files:**
- Read: `apps/web/wrangler.json`
- Read: `apps/web/open-next.config.ts`

- [ ] **Step 1: Build Next.js app for Cloudflare**

```bash
cd apps/web && npm run cf:build
```

Expected: build completes without errors. Output in `.open-next/` directory.

- [ ] **Step 2: Deploy Web worker**

```bash
cd apps/web && npm run cf:deploy
```

Expected output: deployment URL printed. Worker deployed.

- [ ] **Step 3: Smoke test storefront**

Open the deployment URL in browser. Verify:
- Home page loads
- `/sklep` loads (may show empty product list — that's OK, no products yet)
- `/admin` redirects to `/admin/login`

- [ ] **Step 4: Commit nothing** — this task has no file changes.

---

### Task 6: Configure custom domain (if not yet done)

- [ ] **Step 1: Add custom domain in Cloudflare dashboard**

1. Go to Cloudflare Dashboard → Workers & Pages → `il-buon-caffe-api`
2. Settings → Triggers → Custom Domains → Add `api.ilbuoncaffe.pl`
3. Repeat for web worker → Add `ilbuoncaffe.pl` and `www.ilbuoncaffe.pl`

DNS records are created automatically if domain is on Cloudflare.

- [ ] **Step 2: Update PUBLIC_URL and FRONTEND_URL vars in wrangler.json**

These are non-secret vars already in `apps/api/wrangler.json`. Verify they match the custom domain:

```json
"vars": {
  "PUBLIC_URL": "https://api.ilbuoncaffe.pl",
  "FRONTEND_URL": "https://ilbuoncaffe.pl"
}
```

If they need updating, edit `apps/api/wrangler.json` and redeploy (`wrangler deploy`).

- [ ] **Step 3: Verify custom domain after DNS propagation**

```bash
curl -s https://api.ilbuoncaffe.pl/api/products | head -c 100
```

Expected: valid JSON response.

- [ ] **Step 4: Commit any wrangler.json changes**

```bash
git add apps/api/wrangler.json
git commit -m "chore(infra): update production URLs in wrangler.json"
```

---

## Done Criteria

- [ ] `wrangler secret list` shows all required secrets for both workers
- [ ] All DB migrations applied with no errors
- [ ] API returns valid JSON at production URL
- [ ] Web app loads at production URL
- [ ] Admin login page accessible at `/admin/login`
