# 🚀 Il Buon Caffè - Deployment Guide (v2.0)

> Instrukcja wdrożenia aplikacji na środowisko produkcyjne.  
> **Wersja:** 2.0 (RODO-Compliant, Security Hardened)

---

## 📋 Wymagania

- Node.js 20+
- pnpm 8+
- Konto Cloudflare (Workers, Pages, R2, KV, Queues)
- Konto Neon (PostgreSQL)
- Konto Stripe (Payments)
- Konto Allegro Developer (opcjonalnie)

---

## 🔧 1. Setup Infrastruktury

### 1.1 Neon PostgreSQL

```bash
# 1. Utwórz projekt w Neon Console (https://console.neon.tech)
# 2. Utwórz 3 branche: main (prod), staging, dev
# 3. Włącz Point-in-Time Recovery (PITR)
# 4. Skopiuj connection string

# Format (NIE REST API URL!):
DATABASE_URL="postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

### 1.2 Cloudflare KV Namespaces

```bash
cd apps/api

# Utwórz namespaces
wrangler kv:namespace create "SESSION_STORE"
wrangler kv:namespace create "CATALOG_CACHE"
wrangler kv:namespace create "RATE_LIMIT"

# Zapisz ID z outputu do wrangler.toml
```

### 1.3 Cloudflare R2 (Secure Setup)

```bash
# Utwórz bucket
wrangler r2 bucket create il-buon-caffe-images

# ⚠️ WAŻNE: Bucket jest PRYWATNY (nie publiczny!)
# Dostęp tylko przez Signed URLs generowane przez Worker
```

**CORS Configuration (w Cloudflare Dashboard):**

```json
{
  "AllowedOrigins": [
    "https://ilbuoncaffe.pl",
    "https://staging.ilbuoncaffe.pl"
  ],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedHeaders": ["Content-Type", "Content-Length"],
  "MaxAgeSeconds": 3600
}
```

### 1.4 Cloudflare Hyperdrive

```bash
# Utwórz połączenie (connection pooling)
wrangler hyperdrive create il-buon-caffe-db \
  --connection-string="$DATABASE_URL"

# Zapisz ID do wrangler.toml
```

### 1.5 Cloudflare Queues

```bash
# Queue dla synchronizacji Allegro
wrangler queues create allegro-orders
wrangler queues create stock-sync
```

---

## 🔐 2. Security Configuration

### 2.1 Secrets (NIGDY nie commituj!)

```bash
cd apps/api

# Database
wrangler secret put DATABASE_URL

# JWT
wrangler secret put JWT_SECRET
# Generuj: openssl rand -base64 32

# ================================
# PRZELEWY24
# ================================
P24_MERCHANT_ID=12345
P24_POS_ID=12345
P24_CRC_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
P24_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ⚠️ KRYTYCZNE!
P24_ENVIRONMENT=sandbox  # lub production: Do weryfikacji CRC!
# Dla sandbox: oddzielne klucze testowe

# Allegro (opcjonalnie)
wrangler secret put ALLEGRO_CLIENT_ID
wrangler secret put ALLEGRO_CLIENT_SECRET
```

### 2.2 IP Whitelist dla Admin

W `wrangler.toml` dodaj allowed IPs:

```toml
[vars]
# Cloudflare IP ranges + Twoje office IP
ADMIN_ALLOWED_IPS = "103.21.244.0/22,103.22.200.0/22,192.168.1.100"
```

**Middleware (apps/api/src/middleware/ipWhitelist.ts):**

```typescript
export function ipWhitelistMiddleware(c: Context, next: Next) {
  const clientIP = c.req.header("CF-Connecting-IP");
  const allowedIPs = c.env.ADMIN_ALLOWED_IPS.split(",");

  if (!allowedIPs.some((ip) => isIpInRange(clientIP, ip))) {
    return c.json({ error: "Forbidden - IP not whitelisted" }, 403);
  }

  return next();
}
```

### 2.3 Przelewy24 Webhook Verification

```typescript
// apps/api/src/routes/webhooks/przelewy24.ts
import crypto from "crypto";

export async function handlePrzelewy24Webhook(c: Context) {
  const body = await c.req.json();

  // ⚠️ KRYTYCZNE: Weryfikacja CRC
  const sign = body.sign;
  const expectedSign = crypto
    .createHash("sha384")
    .update(
      JSON.stringify({
        sessionId: body.sessionId,
        orderId: body.orderId,
        amount: body.amount,
        currency: body.currency,
        crc: c.env.P24_CRC_KEY,
      }),
    )
    .digest("hex");

  if (sign !== expectedSign) {
    console.error("P24 webhook CRC verification failed");
    return c.json({ error: "Invalid CRC signature" }, 400);
  }

  // Verify transaction status via API
  const verified = await verifyP24Transaction(body.sessionId, c.env);

  if (verified) {
    // Update order status to 'paid'
    await updateOrderStatus(body.orderId, "paid");
  }

  return c.json({ success: true });
}

async function verifyP24Transaction(sessionId: string, env: Env) {
  const response = await fetch(
    "https://secure.przelewy24.pl/api/v1/transaction/verify",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${env.P24_POS_ID}:${env.P24_WEBHOOK_SECRET}`)}`,
      },
      body: JSON.stringify({ sessionId }),
    },
  );

  return response.ok;
}
```

### 2.4 R2 Signed URLs

```typescript
// apps/api/src/routes/upload.ts
export async function generateUploadUrl(c: Context) {
  const { filename, contentType } = await c.req.json();
  const userId = c.get("user").sub;

  const key = `products/${Date.now()}-${filename}`;

  // Presigned URL z 5-minutowym TTL
  const signedUrl = await c.env.IMAGES.createSignedUrl(key, {
    method: "PUT",
    expirySeconds: 300, // 5 minut
    customMetadata: {
      "user-id": userId,
      "content-type": contentType,
    },
  });

  return c.json({
    uploadUrl: signedUrl,
    publicUrl: `https://r2.ilbuoncaffe.pl/${key}`,
    expiresIn: 300,
  });
}
```

---

## 📋 3. GDPR/RODO Setup (KRYTYCZNE!)

### 3.1 Data Retention Policies

```sql
-- Uruchom raz w Neon Console (main branch)

-- Automatyczna anonimizacja po 7 latach (wymagane VAT)
-- Zamówienia pozostają, dane osobowe anonimizowane
CREATE OR REPLACE FUNCTION anonymize_old_users()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    email = 'anonymized_' || id || '@deleted.local',
    name = 'Użytkownik usunięty',
    password_hash = 'ANONYMIZED',
    consent_ip_address = NULL,
    consent_user_agent = NULL,
    anonymized_at = NOW()
  WHERE
    data_retention_until < NOW()
    AND anonymized_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Cron w Cloudflare Workers (co tydzień)
-- wrangler triggers crons "0 3 * * 0"
```

### 3.2 Audit Logging Middleware

```typescript
// apps/api/src/middleware/auditLog.ts
export async function auditLogMiddleware(
  action: AuditAction,
  targetUserId?: number,
) {
  return async (c: Context, next: Next) => {
    const result = await next();

    // Log po wykonaniu akcji
    await c.env.DB.insert(auditLog).values({
      adminId: c.get("user")?.sub,
      action,
      targetUserId,
      ipAddress: c.req.header("CF-Connecting-IP"),
      userAgent: c.req.header("User-Agent"),
      details: { path: c.req.path, method: c.req.method },
    });

    return result;
  };
}
```

### 3.3 Consent Tracking w Frontend

```tsx
// apps/web/src/components/RegisterForm.tsx
<form>
  {/* ⚠️ RODO: Osobne checkboxy, nie "Akceptuję wszystko" */}
  <Checkbox
    name="terms"
    required
    label={
      <>
        Akceptuję <Link href="/regulamin">Regulamin</Link> *
      </>
    }
  />
  <Checkbox
    name="privacy"
    required
    label={
      <>
        Akceptuję <Link href="/polityka-prywatnosci">Politykę Prywatności</Link>{" "}
        *
      </>
    }
  />
  <Checkbox name="marketing" label="Chcę otrzymywać newsletter (opcjonalne)" />
  <Checkbox
    name="analytics"
    label="Zgadzam się na cookies analityczne (opcjonalne)"
  />
</form>
```

---

## 🌍 4. Environments

### 4.1 Allegro Sandbox vs Production

```bash
# .env.local (development)
ALLEGRO_ENV=sandbox
ALLEGRO_AUTH_URL=https://allegro.pl.allegrosandbox.pl/auth/oauth/

# .env.production
ALLEGRO_ENV=production
ALLEGRO_AUTH_URL=https://allegro.pl/auth/oauth/
```

**W kodzie:**

```typescript
const ALLEGRO_BASE_URL =
  env.ALLEGRO_ENV === "sandbox"
    ? "https://api.allegro.pl.allegrosandbox.pl"
    : "https://api.allegro.pl";
```

### 4.2 Wrangler.toml (Complete Example)

```toml
name = "il-buon-caffe-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
ALLEGRO_ENV = "production"
ADMIN_ALLOWED_IPS = "103.21.244.0/22,192.168.1.100"

[[kv_namespaces]]
binding = "SESSION_STORE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[[kv_namespaces]]
binding = "CATALOG_CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "il-buon-caffe-images"

[[queues.producers]]
queue = "allegro-orders"
binding = "ALLEGRO_ORDERS_QUEUE"

[[queues.producers]]
queue = "stock-sync"
binding = "STOCK_SYNC_QUEUE"

[[queues.consumers]]
queue = "allegro-orders"
max_batch_size = 10
max_batch_timeout = 30

[[queues.consumers]]
queue = "stock-sync"
max_batch_size = 100
max_batch_timeout = 10

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Cron triggers
[triggers]
crons = [
  "*/1 * * * *",    # Allegro polling (co 1 min)
  "*/5 * * * *",    # Stock reservation cleanup
  "0 3 * * 0"       # GDPR anonymization (niedziela 3:00)
]
```

---

## 📦 5. Deploy

### 5.1 Database Migration

```bash
cd packages/db

# Sprawdź zmiany
pnpm drizzle-kit generate

# Push do dev
DATABASE_URL="..." pnpm drizzle-kit push

# Push do prod (OSTROŻNIE!)
DATABASE_URL="$PROD_DATABASE_URL" pnpm drizzle-kit push
```

### 5.2 API (Cloudflare Workers)

```bash
cd apps/api

# Development
pnpm dev

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

### 5.3 Web (Cloudflare Pages)

```bash
cd apps/web

# Build
npm run pages:build

# Uwaga (Windows): ten skrypt uruchamia lokalnie `vercel build`,
# a nastepnie `next-on-pages --skip-build` (workaround na blad spawn npx ENOENT).

# Deploy via Cloudflare Pages (GitHub integration recommended)
# Lub manualnie:
npx --yes wrangler pages deploy .cloudflare/pages --project-name il-buon-caffe
```

### 5.4 Admin (Electron)

```bash
cd apps/admin

# Development
pnpm dev

# Build for Windows
pnpm build --win

# Build for Mac (wymaga macOS)
pnpm build --mac

# Output: dist/Il Buon Caffe Admin Setup.exe
```

---

## 🔍 6. Health Check & Monitoring

### 6.1 Health Check Endpoint

```typescript
// apps/api/src/routes/health.ts
app.get("/health", async (c) => {
  const checks = {
    database: "unknown",
    allegroAuth: "unknown",
    kv: "unknown",
    r2: "unknown",
  };

  // Database
  try {
    await c.env.DB.execute(sql`SELECT 1`);
    checks.database = "connected";
  } catch {
    checks.database = "error";
  }

  // Allegro
  try {
    const creds = await c.env.DB.select().from(allegroCredentials).limit(1);
    if (creds[0]?.expiresAt > new Date()) {
      checks.allegroAuth = "valid";
    } else {
      checks.allegroAuth = "expired";
    }
  } catch {
    checks.allegroAuth = "not_configured";
  }

  // KV
  try {
    await c.env.RATE_LIMIT.get("health_check");
    checks.kv = "connected";
  } catch {
    checks.kv = "error";
  }

  // R2
  try {
    await c.env.IMAGES.head("health_check.txt");
    checks.r2 = "connected";
  } catch {
    checks.r2 = "connected";
  } // 404 is OK

  const allOk = Object.values(checks).every((v) => v !== "error");

  return c.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: checks,
      version: "2.0.0",
    },
    allOk ? 200 : 503,
  );
});
```

### 6.2 Monitoring Setup

| Usługa                   | Cel            | Setup                   |
| ------------------------ | -------------- | ----------------------- |
| **Sentry**               | Error tracking | `SENTRY_DSN` w env      |
| **Cloudflare Analytics** | Traffic, cache | Automatyczne            |
| **Better Uptime**        | Health check   | Ping `/health` co 1 min |
| **Neon Dashboard**       | Slow queries   | Wbudowane               |

```bash
# Sentry setup
cd apps/api
pnpm add @sentry/node

# .env
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 💾 7. Backup Strategy

### 7.1 Database (Neon PITR)

- **Point-in-Time Recovery** włączone domyślnie
- Retention: 7 dni (Free) / 30 dni (Pro)
- Restore: Neon Console → Branch → Restore to point in time

### 7.2 Allegro Mappings Backup

```typescript
// Worker Cron: co 24h o 2:00
// Eksport allegro_offer_id mappings do R2

export async function backupAllegroMappings(env: Env) {
  const products = await env.DB.select({
    sku: products.sku,
    offerId: products.allegroOfferId,
  })
    .from(products)
    .where(isNotNull(products.allegroOfferId));

  const csv = [
    "sku,allegro_offer_id",
    ...products.map((p) => `${p.sku},${p.offerId}`),
  ].join("\n");

  const key = `backups/allegro-mappings-${new Date().toISOString().split("T")[0]}.csv`;
  await env.IMAGES.put(key, csv, {
    customMetadata: { "content-type": "text/csv" },
  });
}
```

### 7.3 Legal Documents Versioning

- Każda zmiana Regulaminu/Polityki → nowy rekord w `legal_documents`
- **Nigdy nie edytuj** historycznych wersji
- Użytkownik przy logowaniu widzi "Regulamin się zmienił" jeśli `termsVersion` nie pasuje

---

## ✅ 8. Pre-Launch Checklist

### Security

- [ ] Wszystkie secrets ustawione (`wrangler secret list`)
- [ ] `P24_WEBHOOK_SECRET` i `P24_CRC_KEY` skonfigurowane
- [ ] IP Whitelist dla admin endpoints
- [ ] R2 bucket **nie jest** publiczny
- [ ] CORS tylko dla produkcyjnych domen
- [ ] `npm audit` bez critical vulnerabilities

### GDPR/RODO

- [ ] Checkboxy zgód przy rejestracji (osobne!)
- [ ] Endpoint `/api/user/export` działa
- [ ] Endpoint `/api/user/anonymize` działa
- [ ] Audit logging włączony
- [ ] Polityka Prywatności wersjonowana
- [ ] Data Retention Policy skonfigurowana (7 lat)

### Funkcjonalność

- [ ] Health check zwraca `status: ok`
- [ ] Płatność testowa przechodzi (Przelewy24 sandbox)
- [ ] Allegro Sandbox połączony (jeśli używane)
- [ ] Email transakcyjne wysyłają się
- [ ] Stock reservation wygasa po 30 min

### Monitoring

- [ ] Sentry skonfigurowany
- [ ] Uptime monitoring aktywny
- [ ] Alerty dla `status: degraded`

---

## 🔄 9. Rollback Procedures

### Workers

```bash
# Lista deployments
wrangler deployments list

# Rollback do poprzedniej wersji
wrangler rollback
```

### Pages

1. Cloudflare Dashboard → Pages → Deployments
2. Znajdź poprzedni working deployment
3. Kliknij "Rollback to this deployment"

### Database

```bash
# Neon Console → Branch → Actions → Restore
# Wybierz point-in-time przed problemem
# Tworzy nowy branch, przetestuj, potem merge
```

---

## 📊 10. Estimated Costs

| Usługa             | Plan                   | Szacunkowy koszt/mies. |
| ------------------ | ---------------------- | ---------------------- |
| Neon PostgreSQL    | Launch (0.25-2 CU)     | $5-25                  |
| Cloudflare Workers | Free (100k req/day)    | $0                     |
| Cloudflare KV      | Free (100k reads/day)  | $0                     |
| Cloudflare R2      | Free (10GB storage)    | $0                     |
| Cloudflare Pages   | Free                   | $0                     |
| Cloudflare Queues  | Free (100k msg/day)    | $0                     |
| Przelewy24         | 1.49% PLN / 2.49% EUR  | ~$100-120              |
| Sentry             | Free (5k events/mies.) | $0                     |
| Better Uptime      | Free (5 monitors)      | $0                     |
| **TOTAL**          |                        | **~$105-145/mies.**    |

---

> **Ostatnia aktualizacja:** 2026-01-29  
> **Wersja dokumentu:** 2.0
