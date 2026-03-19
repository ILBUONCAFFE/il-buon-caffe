---
name: allegro-integration
description: >
  Handle all Allegro marketplace integration for Il Buon Caffè — OAuth2 flow, token management,
  product-to-offer mapping, order polling, and sync logic. Use this skill whenever the user works on
  Allegro-related features, API calls, token refresh, cron jobs, or marketplace sync.
  Triggers on: "allegro", "marketplace", "oferta", "sync", "token refresh", "OAuth", "order polling",
  "allegro credentials", "cron worker", or any work involving allegro routes, allegro schema tables,
  or Cloudflare scheduled workers for Allegro. Also use when debugging sync failures or token issues.
---

# Allegro Integration Skill — Il Buon Caffè

Integrate with Allegro.pl marketplace: OAuth2 authentication, product offer management, and automated order sync.

## Project Context

- Allegro API routes in `apps/api/src/routes/allegro/`
- Scheduled Workers (cron) in `apps/api/src/scheduled/`
- Schema tables: `allegro_credentials`, `allegro_sync_log`, `allegro_state` in `packages/db`
- Tokens stored primarily in Cloudflare KV, backed up to DB
- Polish market only — use Allegro.pl (not Allegro sandbox, unless testing)

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Workers                   │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Auth Route   │  │ Cron: Poll   │  │ Cron: Token │ │
│  │ /allegro/    │  │ Orders       │  │ Refresh     │ │
│  │ auth         │  │ (5 min)      │  │ (1 hour)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                  │        │
│         ▼                 ▼                  ▼        │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Cloudflare KV                       │ │
│  │  allegro:access_token, allegro:refresh_token     │ │
│  │  allegro:token_expires_at                        │ │
│  └─────────────────────────────────────────────────┘ │
│         │                                             │
│         ▼                                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Neon PostgreSQL (backup)                  │ │
│  │  allegro_credentials, allegro_sync_log            │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## OAuth2 Flow

Allegro uses Authorization Code flow:

1. **Initiate**: Admin clicks "Połącz z Allegro" → redirect to Allegro auth URL
2. **Callback**: Allegro redirects back with `code` → exchange for access + refresh tokens
3. **Store**: Encrypt tokens with AES-256-GCM, store in KV (primary) and DB (backup)

```typescript
// Route: GET /allegro/auth
app.get('/auth', adminMiddleware, (c) => {
  const authUrl = new URL('https://allegro.pl/auth/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', c.env.ALLEGRO_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', c.env.ALLEGRO_REDIRECT_URI);
  return c.redirect(authUrl.toString());
});

// Route: GET /allegro/callback
app.get('/callback', adminMiddleware, async (c) => {
  const code = c.req.query('code');
  if (!code) throw new HTTPException(400, { message: 'Missing code' });

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, c.env);

  // Encrypt and store
  await storeAllegroTokens(tokens, c.env);

  return c.redirect('/admin/allegro?connected=true');
});
```

## Token Encryption (AES-256-GCM)

All Allegro tokens are encrypted at rest:

```typescript
import { webcrypto } from 'crypto'; // In Workers, use global crypto

async function encryptToken(plaintext: string, key: CryptoKey): Promise<{
  encrypted: string;  // base64
  iv: string;         // base64
  tag: string;        // included in ciphertext with GCM
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    tag: '', // GCM tag is appended to ciphertext automatically
  };
}
```

The encryption key is derived from `c.env.ALLEGRO_ENCRYPTION_KEY` (32 bytes, base64-encoded secret).

## KV-First Token Storage

Tokens live in KV for fast, cheap reads. DB is a backup for disaster recovery.

```typescript
// Store tokens
async function storeAllegroTokens(tokens: AllegroTokens, env: AppEnv['Bindings']) {
  const key = await getEncryptionKey(env.ALLEGRO_ENCRYPTION_KEY);

  const encAccess = await encryptToken(tokens.access_token, key);
  const encRefresh = await encryptToken(tokens.refresh_token, key);

  // KV (primary) — with TTL matching token lifetime
  await env.KV.put('allegro:access_token', JSON.stringify(encAccess), {
    expirationTtl: tokens.expires_in,
  });
  await env.KV.put('allegro:refresh_token', JSON.stringify(encRefresh));
  await env.KV.put('allegro:token_expires_at', String(Date.now() + tokens.expires_in * 1000));

  // DB (backup)
  await db.insert(allegroCredentials).values({
    encryptedAccessToken: encAccess.encrypted,
    encryptedRefreshToken: encRefresh.encrypted,
    iv: encAccess.iv,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  }).onConflictDoUpdate(/* ... */);
}
```

## Scheduled Workers (Cron)

### Token Refresh — Every Hour

```typescript
// apps/api/src/scheduled/allegro-token-refresh.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const expiresAt = await env.KV.get('allegro:token_expires_at');
    if (!expiresAt) return; // No tokens stored

    const timeLeft = Number(expiresAt) - Date.now();
    if (timeLeft > 30 * 60 * 1000) return; // More than 30 min left, skip

    // Refresh
    const refreshToken = await getDecryptedToken('allegro:refresh_token', env);
    const newTokens = await refreshAllegroTokens(refreshToken, env);
    await storeAllegroTokens(newTokens, env);

    // Log
    await logSync(env, 'token_refresh', 'success');
  },
};
```

### Order Polling — Every 5 Minutes

```typescript
// apps/api/src/scheduled/allegro-order-poll.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const lastPoll = await env.KV.get('allegro:last_order_poll');
    const since = lastPoll || new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const accessToken = await getDecryptedToken('allegro:access_token', env);

    // Fetch new orders from Allegro
    const orders = await fetchAllegroOrders(accessToken, since);

    for (const order of orders) {
      await processAllegroOrder(order, env);
    }

    await env.KV.put('allegro:last_order_poll', new Date().toISOString());
    await logSync(env, 'order_poll', 'success', { count: orders.length });
  },
};
```

Wrangler cron config:
```toml
[triggers]
crons = [
  "*/5 * * * *",   # Order polling every 5 min
  "0 * * * *",     # Token refresh every hour
]
```

## Product-to-Offer Mapping

Flat product model = 1 product → 1 Allegro offer. Mapping stored in `products.allegroOfferId`.

```typescript
// Publish product to Allegro
async function publishToAllegro(product: Product, accessToken: string) {
  const offer = mapProductToAllegroOffer(product);

  const response = await fetch('https://api.allegro.pl/sale/product-offers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.allegro.public.v1+json',
      Accept: 'application/vnd.allegro.public.v1+json',
    },
    body: JSON.stringify(offer),
  });

  const result = await response.json();

  // Store mapping
  await db.update(products)
    .set({ allegroOfferId: result.id })
    .where(eq(products.id, product.id));
}
```

## Sync Logging

Every sync operation gets logged to `allegro_sync_log`:

```typescript
async function logSync(
  env: Env,
  type: 'token_refresh' | 'order_poll' | 'offer_sync',
  status: 'success' | 'error',
  details?: Record<string, unknown>
) {
  await db.insert(allegroSyncLog).values({
    type,
    status,
    details: details ? JSON.stringify(details) : null,
    createdAt: new Date(),
  });
}
```

Sync logs are auto-purged after 90 days via a scheduled cleanup job.

## Allegro API Headers

Always include these headers for Allegro REST API calls:

```typescript
const allegroHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/vnd.allegro.public.v1+json',
  Accept: 'application/vnd.allegro.public.v1+json',
});
```

## Error Handling & Retries

- Token refresh failure → retry 3 times with exponential backoff, then alert admin
- Order poll failure → log error, increment `retryCount` in sync_log, continue next poll
- Allegro API 429 (rate limit) → respect `Retry-After` header
- If access token is expired and refresh also fails → mark credentials as invalid, notify admin
