import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRouter } from './routes/auth'
import { uploadsRouter } from './routes/uploads'
import { allegroRouter } from './routes/allegro'
import { productsRouter } from './routes/products'
import { categoriesRouter } from './routes/categories'
import { ordersRouter } from './routes/orders'
import { userRouter } from './routes/user'
import { legalRouter } from './routes/legal'
import { paymentsRouter } from './routes/payments'
import { webhooksRouter } from './routes/webhooks'
import { adminRouter } from './routes/admin/index'
import { createDbWithPool } from '@repo/db/client'
import { allegroCredentials, allegroSyncLog, auditLog } from '@repo/db/schema'
import { eq, desc, lt, sql } from 'drizzle-orm'
import { refreshAllegroToken, KV_KEYS, type AllegroEnvironment } from './lib/allegro'
import { syncAllegroOrders } from './lib/allegro-orders'
import { runTrackingStatusSync } from './lib/allegro-orders/tracking-refresh'
import { preWarmAllegroQualityCache } from './routes/allegro'
import { backfillExchangeRates } from './lib/allegro-orders/backfill-rates'
import { encryptText, decryptText } from './lib/crypto'
import { securityHeaders, corsConfig, secFetchGuard } from './middleware/security'
import { apiRateLimiter } from './middleware/rateLimit'
import { dbMiddleware } from './middleware/db'
import { setHttpMode } from '@repo/db/client'

// ── Environment bindings ──────────────────────────────────────────────────
export interface Env {
  DATABASE_URL: string
  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  NODE_ENV?: string
  AUTH_RATE_LIMIT?: KVNamespace
  IMAGES_BUCKET: R2Bucket
  INTERNAL_API_SECRET?: string

  // Public URLs (for building return/webhook URLs)
  PUBLIC_URL: string   // e.g. https://api.ilbuoncaffe.pl
  FRONTEND_URL: string // e.g. https://ilbuoncaffe.pl

  // Przelewy24
  P24_MERCHANT_ID: string
  P24_API_KEY: string
  P24_CRC_KEY: string
  P24_SANDBOX?: string  // 'true' = sandbox mode

  // ── Allegro OAuth ────────────────────────────────────────────────────────
  ALLEGRO_CLIENT_ID: string
  ALLEGRO_CLIENT_SECRET: string
  ALLEGRO_REDIRECT_URI: string
  ALLEGRO_ADMIN_REDIRECT_URL: string
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string   // 32-byte hex — AES-256-GCM
  ALLEGRO_KV: KVNamespace

  // Cloudflare Hyperdrive — connection pool at edge (optional: falls back to DATABASE_URL for local dev)
  HYPERDRIVE?: Hyperdrive
}

// ── App ───────────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>()

// Security headers — every response
app.use('*', securityHeaders())

// CORS — strict allowlist
app.use('*', cors(corsConfig()))

// Sec-Fetch CSRF guard — mutation endpoints only
app.use('/api/*', secFetchGuard())

// Global rate limiter (100 req/min per IP)
app.use('/api/*', apiRateLimiter)

// Shared DB client per request — all routes/middleware read c.get('db')
app.use('/api/*', dbMiddleware())
app.use('/admin/*', dbMiddleware())
app.use('/health', dbMiddleware())

// ── Health / Ping ─────────────────────────────────────────────────────────
app.get('/', (c) => c.text('Il Buon Caffe API is running!'))

// Cache health-check result for 30s to avoid needless Neon wake-ups
let _healthCache: { ts: number; json: Record<string, unknown>; code: number } | null = null
const HEALTH_CACHE_TTL = 30_000

app.get('/health', async (c) => {
  const now = Date.now()
  if (_healthCache && now - _healthCache.ts < HEALTH_CACHE_TTL) {
    return c.json(_healthCache.json, _healthCache.code as 200 | 503)
  }

  const result: { status: string; timestamp: string; database?: string; error?: string } = {
    status:    'ok',
    timestamp: new Date().toISOString(),
  }

  try {
    const db       = c.get('db')
    const dbResult = await db.execute('SELECT 1' as any)
    result.database = dbResult.rows?.length ? 'connected' : 'no response'
  } catch (err) {
    result.status   = 'degraded'
    result.database = 'disconnected'
    result.error    = err instanceof Error ? err.message : 'Unknown DB error'
  }

  const code = result.status === 'ok' ? 200 : 503
  _healthCache = { ts: now, json: result, code }
  return c.json(result, code as 200 | 503)
})

// ── Auth ──────────────────────────────────────────────────────────────────
app.route('/api/auth', authRouter)

// ── Public shop API ───────────────────────────────────────────────────────
app.route('/api/products',   productsRouter)
app.route('/api/categories', categoriesRouter)
app.route('/api/legal',      legalRouter)

// ── Authenticated customer API ────────────────────────────────────────────
app.route('/api/orders',   ordersRouter)
app.route('/api/user',     userRouter)
app.route('/api/payments', paymentsRouter)

// ── Webhooks (no auth — signature-verified internally) ────────────────────
app.route('/api/webhooks', webhooksRouter)

// ── Admin API ─────────────────────────────────────────────────────────────
app.route('/admin',             adminRouter)
app.route('/admin/allegro',     allegroRouter)   // reached via generic /admin/[...slug] Next.js proxy
app.route('/api/admin/allegro', allegroRouter)   // reached via specific allegro Next.js proxy

// ── Asset uploads (R2) ───────────────────────────────────────────────────
app.route('/api/uploads', uploadsRouter)

// ── 404 fallback ─────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Endpoint nie znaleziony' }, 404))

// ── Global error handler ─────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[Unhandled error]', err instanceof Error ? err.message : String(err))
  return c.json({ error: 'Wewnętrzny błąd serwera' }, 500)
})

// ── Scheduled handler (Cron Trigger) ────────────────────────────────────────
// Runs every hour — refreshes Allegro access token when it has less than 2h left
async function autoRefreshAllegroToken(env: Env): Promise<void> {
  try {
    // ★ KV-first: if a valid token exists in KV, the per-minute cron already
    //   restored it, so skip DB entirely. This avoids ~24 DB wake-ups/day.
    if (env.ALLEGRO_KV) {
      const kvToken = await env.ALLEGRO_KV.get(KV_KEYS.ACCESS_TOKEN)
      if (kvToken) {
        // KV tokens are written with expirationTtl, so if it exists, it's valid.
        // Only proceed if token will expire within 2h (KV TTL doesn't tell us exact expiry).
        // Use a KV metadata key to store the expiry timestamp.
        const expiryStr = await env.ALLEGRO_KV.get('allegro:token_expires_at')
        if (expiryStr) {
          const expiresAt = new Date(expiryStr)
          const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
          if (expiresAt > twoHoursFromNow) {
            console.log(`[Allegro Cron] Token ważny do ${expiresAt.toISOString()} (z KV) — pomijam DB`)
            return
          }
        }
      }
    }

    const { db, end } = createDbWithPool(env.DATABASE_URL)
    try {

    const [cred] = await db
      .select()
      .from(allegroCredentials)
      .where(eq(allegroCredentials.isActive, true))
      .orderBy(desc(allegroCredentials.updatedAt))
      .limit(1)

    if (!cred) {
      console.log('[Allegro Cron] Brak aktywnych credentials — pomijam')
      return
    }

    // Skip if token still has more than 2 hours left
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
    if (cred.expiresAt > twoHoursFromNow) {
      // Cache expiry in KV so next hourly run can skip DB
      if (env.ALLEGRO_KV) {
        await env.ALLEGRO_KV.put('allegro:token_expires_at', cred.expiresAt.toISOString()).catch(() => {})
      }
      console.log(`[Allegro Cron] Token ważny do ${cred.expiresAt.toISOString()} — pomijam odświeżanie`)
      return
    }

    const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
    const refreshToken = encKey ? await decryptText(cred.refreshToken, encKey) : cred.refreshToken
    const environment  = cred.environment as AllegroEnvironment

    console.log(`[Allegro Cron] Odświeżam token (środowisko: ${environment}, wygasa: ${cred.expiresAt.toISOString()})`)

    const tokens = await refreshAllegroToken({
      refreshToken,
      clientId:     env.ALLEGRO_CLIENT_ID,
      clientSecret: env.ALLEGRO_CLIENT_SECRET,
      environment,
    })

    const expiresAt  = new Date(Date.now() + tokens.expires_in * 1000)
    const encAccess  = encKey ? await encryptText(tokens.access_token,  encKey) : tokens.access_token
    const encRefresh = encKey ? await encryptText(tokens.refresh_token, encKey) : tokens.refresh_token

    // Deactivate old record, insert fresh one
    await db.update(allegroCredentials)
      .set({ isActive: false })
      .where(eq(allegroCredentials.isActive, true))

    await db.insert(allegroCredentials).values({
      accessToken:  encAccess,
      refreshToken: encRefresh,
      expiresAt,
      tokenType:    'Bearer',
      scope:        cred.scope,
      isActive:     true,
      environment,
      updatedAt:    new Date(),
    })

    // Update KV cache
    if (env.ALLEGRO_KV) {
      const ttl = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 60)
      await Promise.all([
        env.ALLEGRO_KV.put(KV_KEYS.ACCESS_TOKEN,  tokens.access_token,  { expirationTtl: ttl }),
        env.ALLEGRO_KV.put(KV_KEYS.REFRESH_TOKEN, tokens.refresh_token),
        env.ALLEGRO_KV.put(KV_KEYS.ENVIRONMENT,   environment),
        env.ALLEGRO_KV.put('allegro:token_expires_at', expiresAt.toISOString()),
        env.ALLEGRO_KV.delete(KV_KEYS.STATUS),
      ])
    }

    console.log(`[Allegro Cron] Token odświeżony pomyślnie. Nowe wygaśnięcie: ${expiresAt.toISOString()}`)
    } finally {
      await end()
    }
  } catch (err) {
    console.error('[Allegro Cron] Błąd auto-odświeżania:', err instanceof Error ? err.message : String(err))
    if (err != null && typeof err === 'object' && 'sourceError' in err) {
      console.error('[Allegro Cron] Źródłowy błąd DB:', (err as Record<string, unknown>).sourceError)
    }
  }
}

// ── Data retention cleanup — runs once daily (piggybacks on hourly cron) ──
// Removes old sync logs (>90 days) and old audit logs (>365 days)
// to keep table sizes manageable and reduce CU consumed by queries
async function dataRetentionCleanup(env: Env): Promise<void> {
  const kv = env.ALLEGRO_KV
  if (!kv) return

  // Run only once per day — track last cleanup in KV
  const lastCleanup = await kv.get('retention:last_cleanup')
  if (lastCleanup) {
    const lastDate = new Date(lastCleanup)
    const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60)
    if (hoursSince < 23) return   // Already ran today
  }

  const { db, end } = createDbWithPool(env.DATABASE_URL)
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const oneYearAgo    = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

    // Clean old Allegro sync logs (>90 days) — only success entries
    await db.delete(allegroSyncLog)
      .where(sql`${allegroSyncLog.createdAt} < ${ninetyDaysAgo} AND ${allegroSyncLog.status} = 'success'`)

    // Clean old audit logs (>1 year) — RODO requires keeping for min 1 year
    await db.delete(auditLog)
      .where(lt(auditLog.createdAt, oneYearAgo))

    // Deactivate old allegro credentials (>30 days, inactive) — remove expired token data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await db.delete(allegroCredentials)
      .where(sql`${allegroCredentials.isActive} = false AND ${allegroCredentials.updatedAt} < ${thirtyDaysAgo}`)

    await kv.put('retention:last_cleanup', new Date().toISOString())
    console.log(`[Retention] Cleanup done — sync logs, audit logs, old credentials pruned`)
  } catch (err) {
    console.error('[Retention] Cleanup error:', err instanceof Error ? err.message : String(err))
  } finally {
    await end()
  }
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Scheduled/cron events: always use Neon HTTP driver with DATABASE_URL.
    // WebSocket Pool (used with Hyperdrive in fetch handlers) is unreliable in
    // scheduled event contexts — Cloudflare's cron runtime has different WebSocket
    // constraints than the fetch handler runtime.
    setHttpMode(true, env.DATABASE_URL)

    // "0 * * * *"   — hourly token refresh + daily retention cleanup
    // "*/5 * * * *" — every 5 min Allegro order polling (was every 1 min — reduced for CU savings)
    // "0 5 * * *"   — daily at 06:00 CET (05:00 UTC) — pre-warm Allegro sales quality cache
    // "0 3 * * *"   — daily at 04:00 CET (03:00 UTC) — backfill exchange rates (total_pln)
    if (event.cron === '*/5 * * * *') {
      ctx.waitUntil(syncAllegroOrders(env))
      ctx.waitUntil(runTrackingStatusSync(env))
    } else if (event.cron === '0 5 * * *') {
      // Daily at 06:00 CET (05:00 UTC) — pre-warm Allegro sales quality cache
      ctx.waitUntil(preWarmAllegroQualityCache(env))
    } else if (event.cron === '0 3 * * *') {
      // Daily at 04:00 CET (03:00 UTC) — backfill exchange rates for foreign currency orders
      ctx.waitUntil(backfillExchangeRates(env))
    } else {
      // Default: hourly token refresh + data retention (runs once/day)
      ctx.waitUntil(autoRefreshAllegroToken(env))
      ctx.waitUntil(dataRetentionCleanup(env))
    }
  },
}

