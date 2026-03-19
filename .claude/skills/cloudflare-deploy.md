---
name: cloudflare-deploy
description: >
  Configure and deploy Il Buon Caffè infrastructure on Cloudflare — Workers, KV, R2, Hyperdrive, cron triggers,
  environment variables, secrets, and Wrangler configuration. Use this skill whenever the user works on
  deployment, Wrangler config, environment setup, secrets management, KV namespaces, R2 buckets,
  or Cloudflare-specific infrastructure. Triggers on: "deploy", "wrangler", "cloudflare", "KV", "R2",
  "Hyperdrive", "environment variable", "secret", "cron trigger", "worker config", "binding",
  "production deploy", "staging", or any infrastructure/DevOps task related to Cloudflare.
---

# Cloudflare Deploy Skill — Il Buon Caffè

Deploy and configure the Cloudflare Workers infrastructure: Workers, KV, R2, Hyperdrive, cron triggers.

## Project Context

- API runs on Cloudflare Workers via Hono.js
- Wrangler config at `apps/api/wrangler.toml`
- Environments: `development`, `staging`, `production`
- Database: Neon PostgreSQL accessed through Cloudflare Hyperdrive

## Wrangler Configuration

```toml
# apps/api/wrangler.toml
name = "il-buon-caffe-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV Namespaces
[[kv_namespaces]]
binding = "KV"
id = "<kv-namespace-id>"
preview_id = "<preview-kv-namespace-id>"

# R2 Buckets
[[r2_buckets]]
binding = "R2"
bucket_name = "il-buon-caffe-assets"

# Hyperdrive (Neon connection pooling)
[[hyperdrive]]
binding = "DB"
id = "<hyperdrive-config-id>"

# Cron Triggers
[triggers]
crons = [
  "*/5 * * * *",   # Allegro order polling
  "0 * * * *",     # Allegro token refresh
  "0 3 * * *",     # Data retention cleanup (3 AM Warsaw time)
]

# Environment-specific overrides
[env.staging]
name = "il-buon-caffe-api-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "il-buon-caffe-api-production"
vars = { ENVIRONMENT = "production" }
routes = [
  { pattern = "api.ilbuoncaffe.pl/*", zone_name = "ilbuoncaffe.pl" }
]
```

## Secrets Management

Secrets are set via Wrangler CLI — never in `wrangler.toml`:

```bash
# JWT
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET

# Przelewy24
wrangler secret put P24_MERCHANT_ID
wrangler secret put P24_POS_ID
wrangler secret put P24_API_KEY
wrangler secret put P24_CRC_KEY

# Allegro
wrangler secret put ALLEGRO_CLIENT_ID
wrangler secret put ALLEGRO_CLIENT_SECRET
wrangler secret put ALLEGRO_ENCRYPTION_KEY
wrangler secret put ALLEGRO_REDIRECT_URI

# Database (for direct access, Hyperdrive handles connection string)
wrangler secret put DATABASE_URL
```

For staging/production:
```bash
wrangler secret put JWT_SECRET --env production
```

## KV Namespace Setup

```bash
# Create namespaces
wrangler kv namespace create "KV"
wrangler kv namespace create "KV" --preview

# Usage patterns in the app:
# allegro:access_token     — encrypted Allegro access token
# allegro:refresh_token    — encrypted Allegro refresh token
# allegro:token_expires_at — timestamp
# allegro:last_order_poll  — ISO timestamp of last poll
# idempotency:<key>        — order idempotency cache (24h TTL)
# rate_limit:<ip>:<route>  — rate limiting counters
```

## R2 Bucket Setup

```bash
# Create bucket
wrangler r2 bucket create il-buon-caffe-assets

# Usage:
# products/<product-id>/<filename>  — product images
# uploads/temp/<uuid>               — temporary uploads (cleanup after 24h)
```

Custom domain for public R2 access: `assets.ilbuoncaffe.pl`

## Hyperdrive Setup

```bash
# Create Hyperdrive config pointing to Neon
wrangler hyperdrive create il-buon-caffe-db \
  --connection-string="postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/ilbuoncaffe?sslmode=require"
```

Hyperdrive handles connection pooling, caching, and reduces latency to Neon.

## Deploy Commands

```bash
# Development (local)
cd apps/api
wrangler dev

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production

# Check logs
wrangler tail --env production

# Run via Turborepo (from monorepo root)
turbo run deploy --filter=api
```

## Worker Limits to Remember

| Resource | Limit |
|----------|-------|
| CPU time | 30s (Workers Paid) |
| Memory | 128 MB |
| KV reads | 1000/worker invocation |
| KV writes | 1000/worker invocation |
| R2 operations | 1000/worker invocation |
| Subrequest limit | 1000 fetch() calls |
| Script size | 10 MB (compressed) |

## Environment Variables (non-secret)

Set in `wrangler.toml` under `[vars]`:

```toml
[vars]
ENVIRONMENT = "development"
APP_URL = "http://localhost:3000"
API_URL = "http://localhost:8787"
P24_SANDBOX = "true"
CORS_ORIGIN = "http://localhost:3000"

[env.production.vars]
ENVIRONMENT = "production"
APP_URL = "https://ilbuoncaffe.pl"
API_URL = "https://api.ilbuoncaffe.pl"
P24_SANDBOX = "false"
CORS_ORIGIN = "https://ilbuoncaffe.pl"
```

## Custom Domains

```toml
# API
[env.production]
routes = [
  { pattern = "api.ilbuoncaffe.pl/*", zone_name = "ilbuoncaffe.pl" }
]
```

Next.js app deployed separately (Vercel or Cloudflare Pages) at `ilbuoncaffe.pl`.

## Deployment Checklist

Before deploying to production:
1. All secrets set for production environment
2. KV namespace created and bound
3. R2 bucket created and bound
4. Hyperdrive config created with production Neon connection string
5. Custom domain DNS records configured
6. CORS origin set to production domain
7. P24_SANDBOX set to "false"
8. CSP/HSTS headers configured in middleware
