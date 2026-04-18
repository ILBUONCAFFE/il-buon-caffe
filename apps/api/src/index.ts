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
import { catalogsRouter } from './routes/catalogs'
import { adminRouter } from './routes/admin/index'
import { createDbWithPool } from '@repo/db/client'
import { allegroCredentials, allegroSyncLog, auditLog } from '@repo/db/schema'
import { eq, desc, lt, sql } from 'drizzle-orm'
import { refreshAllegroToken, getAllegroOAuthConfig, KV_KEYS, type AllegroEnvironment } from './lib/allegro'
import { syncAllegroOrders } from './lib/allegro-orders'
import { preWarmAllegroQualityCache } from './routes/allegro'
import { backfillExchangeRates } from './lib/allegro-orders/backfill-rates'
import { refreshShipments, backfillShipmentEnrollment } from './lib/shipments'
import { encryptText, decryptText } from './lib/crypto'
import { securityHeaders, corsConfig, secFetchGuard } from './middleware/security'
import { apiRateLimiter, adminRateLimiter, healthRateLimiter } from './middleware/rateLimit'
import { dbMiddleware } from './middleware/db'
import { setHttpMode } from '@repo/db/client'

// ── Environment bindings ──────────────────────────────────────────────────
export interface Env {
  DATABASE_URL: string
  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  NODE_ENV?: string
  IMAGES_BUCKET: R2Bucket
  MEDIA_BUCKET: R2Bucket
  CATALOGS_BUCKET: R2Bucket
  MEDIA_PUBLIC_URL?: string
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
  ALLEGRO_CLIENT_ID_SANDBOX?: string
  ALLEGRO_CLIENT_SECRET_SANDBOX?: string
  ALLEGRO_REDIRECT_URI_SANDBOX?: string
  ALLEGRO_CLIENT_ID_PRODUCTION?: string
  ALLEGRO_CLIENT_SECRET_PRODUCTION?: string
  ALLEGRO_REDIRECT_URI_PRODUCTION?: string
  ALLEGRO_ADMIN_REDIRECT_URL: string
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string   // 32-byte hex — AES-256-GCM
  ALLEGRO_KV: KVNamespace

  // Native Workers Rate Limiting API bindings (Paid plan)
  RL_API?:            { limit(opts: { key: string }): Promise<{ success: boolean }> }
  RL_ADMIN?:          { limit(opts: { key: string }): Promise<{ success: boolean }> }
  RL_LOGIN?:          { limit(opts: { key: string }): Promise<{ success: boolean }> }
  RL_REGISTER?:       { limit(opts: { key: string }): Promise<{ success: boolean }> }
  RL_PASSWORD_RESET?: { limit(opts: { key: string }): Promise<{ success: boolean }> }
  RL_HEALTH?:         { limit(opts: { key: string }): Promise<{ success: boolean }> }
  RL_USER_EXPORT?:    { limit(opts: { key: string }): Promise<{ success: boolean }> }
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

// Admin rate limiter — stricter (30 req/min, 15-min block)
app.use('/admin/*', adminRateLimiter)

// Health rate limiter — lenient (20 req/min, 1-min block)
app.use('/health', healthRateLimiter)

// Shared DB client per request — all routes/middleware read c.get('db')
app.use('/api/*', dbMiddleware())
app.use('/admin/*', dbMiddleware())

// ── Health / Ping ─────────────────────────────────────────────────────────
app.get('/', (c) => c.text('Il Buon Caffe API is running!'))

// Health check — lightweight, NO database query (prevents Neon wake-ups from monitoring)
app.get('/health', (c) => {
  return c.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
  })
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

// ── Catalogs (public — secret UUID slug) ──────────────────────────────────
app.route('/api/catalogs', catalogsRouter)

// ── Admin API ─────────────────────────────────────────────────────────────
app.route('/admin',             adminRouter)
app.route('/admin/allegro',     allegroRouter)   // reached via generic /admin/[...slug] Next.js proxy
app.route('/api/admin/allegro', allegroRouter)   // reached via specific allegro Next.js proxy
app.route('/admin/uploads',     uploadsRouter)   // reached via /api/admin/uploads/* proxy (admin_session)

// ── Asset uploads (R2) ───────────────────────────────────────────────────
app.route('/api/uploads', uploadsRouter)

// ── 404 fallback ─────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Endpoint nie znaleziony' }, 404))

// ── Global error handler ─────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[Unhandled error]', err instanceof Error ? err.message : String(err))
  return c.json({ error: 'Wewnętrzny błąd serwera' }, 500)
})

const POLAND_TIME_ZONE = 'Europe/Warsaw'
const NIGHT_THINNING_START_HOUR = 22
const NIGHT_THINNING_END_HOUR = 7
const NIGHT_SYNC_INTERVAL_MINUTES = 60
const ORDER_SYNC_CRON = '*/10 * * * *'
const SHIPMENT_REFRESH_CRON = '*/5 * * * *'
const QUALITY_PREWARM_WINDOW_START_HOUR = 1
const QUALITY_PREWARM_WINDOW_END_HOUR = 5

function getPolandClock(date = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: POLAND_TIME_ZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')

  return { hour, minute }
}

function isPolandNightHour(hour: number): boolean {
  // Range crosses midnight (22:00–07:00), so OR instead of AND
  return hour >= NIGHT_THINNING_START_HOUR || hour < NIGHT_THINNING_END_HOUR
}

function isQualityPrewarmWindowHour(hour: number): boolean {
  return hour >= QUALITY_PREWARM_WINDOW_START_HOUR && hour < QUALITY_PREWARM_WINDOW_END_HOUR
}

function normalizeCronExpression(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function isOrderSyncCronExpression(value: string): boolean {
  const expr = normalizeCronExpression(value)
  return expr === ORDER_SYNC_CRON || expr === '0/10 * * * *'
}

// ── Scheduled handler (Cron Trigger) ────────────────────────────────────────
// Runs every hour — refreshes Allegro access token when it has less than 2h left
async function autoRefreshAllegroToken(env: Env): Promise<void> {
  try {
    // ★ KV-first: if a valid token exists in KV, the order-sync cron already
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
    const oauthConfig = getAllegroOAuthConfig(env, environment)

    console.log(`[Allegro Cron] Odświeżam token (środowisko: ${environment}, wygasa: ${cred.expiresAt.toISOString()})`)

    const tokens = await refreshAllegroToken({
      refreshToken,
      clientId:     oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
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
        env.ALLEGRO_KV.put(KV_KEYS.ACCESS_TOKEN,  encAccess,  { expirationTtl: ttl }),
        env.ALLEGRO_KV.put(KV_KEYS.REFRESH_TOKEN, encRefresh),
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
    setHttpMode(true, env.DATABASE_URL)

    // "0 * * * *"   — hourly token refresh + daily retention cleanup (+ quality prewarm in PL-night window)
    // "*/5 * * * *"  — every 5 min shipment status refresh (KV-guarded, skips when no active shipments)
    // "*/10 * * * *" — every 10 min Allegro order polling; in Poland night (22:00-06:59) thinned to every 60 min
    // "0 3 * * *"   — daily at 04:00 CET / 05:00 CEST (03:00 UTC) — backfill exchange rates + shipment enrollment
    const cronExpr = normalizeCronExpression(event.cron)

    if (normalizeCronExpression(event.cron) === normalizeCronExpression(SHIPMENT_REFRESH_CRON)) {
      ctx.waitUntil(
        refreshShipments(env).catch((err) => {
          console.error('[Shipments] cycle failed', err instanceof Error ? err.message : String(err))
        })
      )
      return
    } else if (isOrderSyncCronExpression(cronExpr)) {
      const { hour, minute } = getPolandClock()
      if (isPolandNightHour(hour) && minute % NIGHT_SYNC_INTERVAL_MINUTES !== 0) {
        console.log(`[Cron] Poland night thinning (${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}) — skip 10-min cycle`)
        return
      }

      // Guard: skip all sync if Allegro is known-disconnected (saves KV reads + potential DB fallbacks)
      if (env.ALLEGRO_KV) {
        const allegroStatus = await env.ALLEGRO_KV.get<{ connected: boolean }>(KV_KEYS.STATUS, 'json')
        if (allegroStatus?.connected === false) {
          console.log('[Cron] Allegro disconnected (KV status) — skip sync')
          return
        }
      }

      ctx.waitUntil(syncAllegroOrders(env))
    } else if (cronExpr === '0 3 * * *') {
      // Daily at 04:00 CET (03:00 UTC) — backfill exchange rates for foreign currency orders
      ctx.waitUntil(backfillExchangeRates(env))
      // Nightly shipment enrollment backfill — enroll orders missing shipment tracking
      ctx.waitUntil(
        (async () => {
          const { db, end } = createDbWithPool(env.DATABASE_URL)
          try {
            const r = await backfillShipmentEnrollment(db, env.ALLEGRO_KV)
            if (r.enrolled > 0) console.log(`[Shipments] nightly backfill enrolled ${r.enrolled} orders`)
          } finally {
            await end()
          }
        })().catch((err) => {
          console.error('[Shipments] nightly backfill failed', err instanceof Error ? err.message : String(err))
        })
      )
    } else if (cronExpr === '0 * * * *') {
      // Hourly: token refresh + data retention (once/day)
      ctx.waitUntil(autoRefreshAllegroToken(env))
      ctx.waitUntil(dataRetentionCleanup(env))

      // Quality prewarm only in Poland night window; internal KV guard ensures one run per PL day.
      const { hour } = getPolandClock()
      if (isQualityPrewarmWindowHour(hour)) {
        ctx.waitUntil(preWarmAllegroQualityCache(env))
      }
    } else {
      console.log(`[Cron] Unsupported expression received: ${cronExpr}`)
    }
  },
}

