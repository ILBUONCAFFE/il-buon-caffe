/**
 * Allegro OAuth2 + API management routes
 *
 * Routes (all under /api/admin/allegro):
 *   GET  /status          — connection status (auth required)
 *   GET  /connect/url     — get Allegro auth URL (auth required)
 *   GET  /callback        — OAuth callback from Allegro (public, state-protected)
 *   POST /disconnect      — revoke connection (auth required)
 *   POST /refresh         — manual token refresh (auth required)
 *   GET  /me              — verify token by calling GET /me on Allegro (auth required)
 */

import type { AllegroSalesQuality } from '@repo/types'
import { Hono } from 'hono'
import { createDb, createDbHttp, type Database } from '@repo/db/client'
import { allegroCredentials, allegroState, orders } from '@repo/db/schema'
import { eq, desc, and, lt, gte, count, sql } from 'drizzle-orm'
import type { Env } from '../index'
import { requireAdminOrProxy } from '../middleware/auth'
import { dbMiddleware } from '../middleware/db'
import {
  buildAuthorizationUrl,
  generateSignedState,
  verifySignedState,
  getAllegroOAuthConfig,
  exchangeCodeForTokens,
  refreshAllegroToken,
  AllegroInvalidGrantError,
  getAllegroApiBase,
  KV_KEYS,
  type AllegroEnvironment,
  type AllegroConnectionStatus,
} from '../lib/allegro'
import { orderStatusNe } from '../lib/order-status'
import { syncAllegroOrders, backfillAllegroOrders } from '../lib/allegro-orders'
import { encryptText, decryptText } from '../lib/crypto'
import { getActiveAllegroToken } from '../lib/allegro-tokens'
import { fetchAllegroShipments } from '../lib/allegro-shipments'

// ── Router ───────────────────────────────────────────────────────────────────
export const allegroRouter = new Hono<{ Bindings: Env }>()

// ── Helpers ───────────────────────────────────────────────────────────────────

type AllegroEnv = Env & {
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
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string
  ALLEGRO_KV: KVNamespace
}

const OAUTH_STATE_TTL_SECONDS = 10 * 60
const OAUTH_STATE_TTL_MS = OAUTH_STATE_TTL_SECONDS * 1000
const QUALITY_PREWARM_LAST_RUN_PL_DATE_KEY = 'allegro:quality:prewarm:last_run_pl_date'
const QUALITY_PREWARM_LOCK_KEY = 'allegro:quality:prewarm:lock'
const QUALITY_PREWARM_LOCK_TTL_SECONDS = 20 * 60
const QUALITY_PREWARM_LAST_RUN_TTL_SECONDS = 3 * 24 * 60 * 60

type OauthStateRecord = {
  environment: AllegroEnvironment
  createdAt: number
}

function parseOauthStateRecord(raw: string | null): OauthStateRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<OauthStateRecord>
    if ((parsed.environment !== 'sandbox' && parsed.environment !== 'production') || typeof parsed.createdAt !== 'number') {
      return null
    }
    return { environment: parsed.environment, createdAt: parsed.createdAt }
  } catch {
    return null
  }
}

function isFreshState(createdAt: number): boolean {
  const age = Date.now() - createdAt
  return age >= 0 && age <= OAUTH_STATE_TTL_MS
}

function getPolandDateStamp(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

async function encrypt(text: string, key?: string): Promise<string> {
  if (!key) {
    throw new Error('[Allegro] ALLEGRO_TOKEN_ENCRYPTION_KEY is not set — refusing to store tokens as plaintext. Configure this Cloudflare Secret.')
  }
  return encryptText(text, key)
}

async function decrypt(text: string, key?: string): Promise<string> {
  if (!key) {
    throw new Error('[Allegro] ALLEGRO_TOKEN_ENCRYPTION_KEY is not set — refusing to read tokens without decryption key. Configure this Cloudflare Secret.')
  }
  try {
    return await decryptText(text, key)
  } catch {
    // Stored token is likely plaintext from before encryption was enforced.
    // Throw a typed sentinel so callers can detect and trigger forced re-auth.
    throw new Error('ALLEGRO_TOKEN_DECRYPT_FAILED')
  }
}

async function saveTokensToDB(db: ReturnType<typeof createDb>, opts: {
  accessToken:  string
  refreshToken: string
  expiresAt:    Date
  scope:        string | null
  environment:  AllegroEnvironment
  encKey?:      string
}) {
  const encAccess  = await encrypt(opts.accessToken,  opts.encKey)
  const encRefresh = await encrypt(opts.refreshToken, opts.encKey)

  // Deactivate old records first
  try {
    await db.update(allegroCredentials)
      .set({ isActive: false })
      .where(eq(allegroCredentials.isActive, true))
  } catch (err) {
    console.error('[Allegro] saveTokensToDB — deactivate error:', err instanceof Error ? err.message : String(err))
    throw err
  }

  // Insert new
  try {
    await db.insert(allegroCredentials).values({
      accessToken:  encAccess,
      refreshToken: encRefresh,
      expiresAt:    opts.expiresAt,
      tokenType:    'Bearer',
      scope:        opts.scope ?? null,
      isActive:     true,
      environment:  opts.environment,
      updatedAt:    new Date(),
    })
  } catch (err) {
    console.error('[Allegro] saveTokensToDB — insert error:', err instanceof Error ? err.message : String(err))
    throw err
  }
}

async function saveTokensToKV(kv: KVNamespace, opts: {
  accessToken:  string
  refreshToken: string
  expiresAt:    Date
  environment:  AllegroEnvironment
  encKey?:      string
}) {
  const ttl = Math.max(Math.floor((opts.expiresAt.getTime() - Date.now()) / 1000), 60)
  const encAccess  = await encrypt(opts.accessToken,  opts.encKey)
  const encRefresh = await encrypt(opts.refreshToken, opts.encKey)
  await Promise.all([
    kv.put(KV_KEYS.ACCESS_TOKEN,  encAccess,  { expirationTtl: ttl }),
    kv.put(KV_KEYS.REFRESH_TOKEN, encRefresh),
    kv.put(KV_KEYS.ENVIRONMENT,   opts.environment),
  ])
}

async function buildStatus(db: ReturnType<typeof createDb>): Promise<AllegroConnectionStatus> {
  try {
    const [cred] = await db
      .select()
      .from(allegroCredentials)
      .where(eq(allegroCredentials.isActive, true))
      .orderBy(desc(allegroCredentials.updatedAt))
      .limit(1)

    if (!cred) {
      return { connected: false, environment: null, expiresAt: null, tokenValid: false }
    }

    const now = new Date()
    const expiresAt  = cred.expiresAt
    const tokenValid = expiresAt > now

    return {
      connected:   true,
      environment: cred.environment as AllegroEnvironment,
      expiresAt:   expiresAt.toISOString(),
      tokenValid,
    }
  } catch {
    // DB unavailable or table not yet migrated — treat as not connected
    return { connected: false, environment: null, expiresAt: null, tokenValid: false }
  }
}

// ── GET /status ───────────────────────────────────────────────────────────────
allegroRouter.get('/status', requireAdminOrProxy(), async (c) => {
  const env = c.env as AllegroEnv

  try {
    // Try KV cache first (TTL 5 min) — guard against unconfigured KV binding
    const kv = env.ALLEGRO_KV
    if (kv) {
      try {
        const cached = await kv.get<AllegroConnectionStatus>(KV_KEYS.STATUS, 'json')
        if (cached) {
          return c.json({ success: true, data: cached })
        }
      } catch {
        // KV unavailable in dev — skip cache, hit DB directly
      }
    }

    const db = c.get('db') as ReturnType<typeof createDb>
    const status = await buildStatus(db)

    if (kv) {
      try {
        await kv.put(KV_KEYS.STATUS, JSON.stringify(status), { expirationTtl: 300 })
      } catch {
        // best-effort cache write
      }
    }

    return c.json({ success: true, data: status })
  } catch (err) {
    console.error('[Allegro] status error:', err instanceof Error ? err.message : String(err))
    return c.json({ success: false, error: { code: 'STATUS_ERROR', message: 'Błąd pobierania statusu' } }, 500)
  }
})

// ── GET /connect/url ──────────────────────────────────────────────────────────
allegroRouter.get('/connect/url', requireAdminOrProxy(), async (c) => {
  const env  = c.env as AllegroEnv
  const environment = (c.req.query('environment') ?? env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment

  try {
    const oauthConfig = getAllegroOAuthConfig(env, environment)

    // Always use HMAC-signed state — self-contained 10-min TTL, no KV dependency.
    // Additionally store in KV for one-time-use guarantee when KV is available.
    const state = await generateSignedState(environment, env.JWT_ACCESS_SECRET)
    const kv = env.ALLEGRO_KV
    if (kv) {
      try {
        await kv.put(
          `${KV_KEYS.STATE_PREFIX}${state}`,
          JSON.stringify({ environment, createdAt: Date.now() }),
          { expirationTtl: OAUTH_STATE_TTL_SECONDS },
        )
      } catch (err) {
        console.warn('[Allegro] connect/url KV state write failed — signed state is sufficient:', err instanceof Error ? err.message : String(err))
      }
    }

    const url = buildAuthorizationUrl({
      clientId:    oauthConfig.clientId,
      redirectUri: oauthConfig.redirectUri,
      environment,
      state,
    })

    return c.json({ success: true, data: { url, state, environment } })
  } catch (err) {
    console.error('[Allegro] connect/url error:', err instanceof Error ? err.message : String(err))
    return c.json({ success: false, error: { code: 'CONNECT_URL_ERROR', message: 'Błąd generowania URL autoryzacji' } }, 500)
  }
})

// ── GET /callback ─────────────────────────────────────────────────────────────
// Public — secured by `state` CSRF token stored in KV
allegroRouter.get('/callback', async (c) => {
  const env  = c.env as AllegroEnv

  const { code, state, error: allegroError } = c.req.query()
  const adminRedirectBase = env.ALLEGRO_ADMIN_REDIRECT_URL ?? 'http://localhost:3000/admin/settings'
  const successUrl = `${adminRedirectBase}?status=success&source=allegro`
  const errorUrl   = (msg: string) => `${adminRedirectBase}?status=error&source=allegro&message=${encodeURIComponent(msg)}`

  // Allegro returned an error
  if (allegroError) {
    console.error('[Allegro] callback error from Allegro:', allegroError)
    return c.redirect(errorUrl('Allegro odmówił dostępu — sprawdź uprawnienia aplikacji'))
  }

  if (!code || !state) {
    return c.redirect(errorUrl('Brakujące parametry w callbacku'))
  }

  // Verify CSRF state:
  // 1) one-time KV state (preferred), 2) signed stateless fallback,
  // 3) legacy DB state for backwards compatibility.
  let environment: AllegroEnvironment | null = null

  const kv = env.ALLEGRO_KV
  if (kv) {
    try {
      const raw = await kv.get(`${KV_KEYS.STATE_PREFIX}${state}`)
      const parsed = parseOauthStateRecord(raw)
      if (parsed) {
        await kv.delete(`${KV_KEYS.STATE_PREFIX}${state}`).catch(() => {})
        if (!isFreshState(parsed.createdAt)) {
          return c.redirect(errorUrl('Wygasły parametr state — spróbuj ponownie'))
        }
        environment = parsed.environment
      }
    } catch (err) {
      console.warn('[Allegro] callback KV state read failed:', err instanceof Error ? err.message : String(err))
    }
  }

  if (!environment) {
    try {
      const verified = await verifySignedState(state, env.JWT_ACCESS_SECRET)
      environment = verified.environment
    } catch {
      // Continue to legacy DB fallback.
    }
  }

  if (!environment) {
    try {
      const dbForState = createDbHttp(env.DATABASE_URL)
      const stateKey = `csrf:state:${state}`
      const [stateRow] = await dbForState.select().from(allegroState).where(eq(allegroState.key, stateKey)).limit(1)

      if (stateRow) {
        await dbForState.delete(allegroState).where(eq(allegroState.key, stateKey)).catch(() => {})
        const parsed = parseOauthStateRecord(stateRow.value)
        if (!parsed) {
          return c.redirect(errorUrl('Nieprawidłowy parametr state (CSRF)'))
        }
        if (!isFreshState(parsed.createdAt)) {
          return c.redirect(errorUrl('Wygasły parametr state — spróbuj ponownie'))
        }
        environment = parsed.environment
      }
    } catch (err) {
      console.error('[Allegro] callback state verification error:', err instanceof Error ? err.message : String(err))
    }
  }

  if (!environment) {
    return c.redirect(errorUrl('Nieprawidłowy lub wygasły parametr state (CSRF)'))
  }

  try {
    const oauthConfig = getAllegroOAuthConfig(env, environment)

    const tokens = await exchangeCodeForTokens({
      code,
      clientId:     oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      redirectUri:  oauthConfig.redirectUri,
      environment,
    })

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // KV is source-of-truth for runtime token usage — persist there first.
    await saveTokensToKV(env.ALLEGRO_KV, {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      environment,
      encKey:       env.ALLEGRO_TOKEN_ENCRYPTION_KEY,
    })

    const db = createDbHttp(env.DATABASE_URL)

    // DB is backup storage — keep OAuth flow alive if DB is transiently unavailable.
    let dbSaved = true
    try {
      await saveTokensToDB(db, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope:        tokens.scope ?? null,
        environment,
        encKey:       env.ALLEGRO_TOKEN_ENCRYPTION_KEY,
      })
    } catch (err) {
      dbSaved = false
      console.warn('[Allegro] callback DB token backup failed — continuing with KV-only tokens:', err instanceof Error ? err.message : String(err))
    }

    // Refresh status cache immediately for admin UI.
    const status: AllegroConnectionStatus = {
      connected: true,
      environment,
      expiresAt: expiresAt.toISOString(),
      tokenValid: true,
    }
    await env.ALLEGRO_KV.put(KV_KEYS.STATUS, JSON.stringify(status), { expirationTtl: 900 }).catch(() => {})

    // Save connection event to allegro_state for audit
    if (dbSaved) {
      await db.insert(allegroState)
        .values({ key: 'last_oauth_connect', value: new Date().toISOString(), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: allegroState.key,
          set: { value: new Date().toISOString(), updatedAt: new Date() },
        })
    }

    console.log(`[Allegro] OAuth connection successful — environment: ${environment}`)
    return c.redirect(successUrl)
  } catch (err) {
    console.error('[Allegro] callback token exchange error:', err instanceof Error ? err.message : String(err))
    return c.redirect(errorUrl('Błąd podczas wymiany tokenu — spróbuj ponownie'))
  }
})

// ── POST /disconnect ──────────────────────────────────────────────────────────
allegroRouter.post('/disconnect', requireAdminOrProxy(), async (c) => {
  const env = c.env as AllegroEnv
  const db  = createDb(env.DATABASE_URL)

  try {
    await db.update(allegroCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(allegroCredentials.isActive, true))

    // Clear KV tokens and mark disconnected status (prevents unnecessary DB polling in cron)
    const disconnectedStatus: AllegroConnectionStatus = {
      connected: false,
      environment: null,
      expiresAt: null,
      tokenValid: false,
    }

    await Promise.all([
      env.ALLEGRO_KV.delete(KV_KEYS.ACCESS_TOKEN),
      env.ALLEGRO_KV.delete(KV_KEYS.REFRESH_TOKEN),
      env.ALLEGRO_KV.delete(KV_KEYS.ENVIRONMENT),
      env.ALLEGRO_KV.delete('allegro:token_expires_at'),
      env.ALLEGRO_KV.put(KV_KEYS.STATUS, JSON.stringify(disconnectedStatus), { expirationTtl: 12 * 60 * 60 }),
    ])

    return c.json({ success: true, message: 'Rozłączono z Allegro' })
  } catch (err) {
    console.error('[Allegro] disconnect error:', err instanceof Error ? err.message : String(err))
    const msg = err instanceof Error ? err.message : 'Błąd rozłączania'
    return c.json({ success: false, error: { code: 'DISCONNECT_ERROR', message: msg } }, 500)
  }
})

// ── POST /refresh ─────────────────────────────────────────────────────────────
allegroRouter.post('/refresh', requireAdminOrProxy(), async (c) => {
  const env    = c.env as AllegroEnv
  const kv     = env.ALLEGRO_KV
  const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
  const db     = createDb(env.DATABASE_URL)

  let refreshToken: string | null = null
  let environment: AllegroEnvironment = 'sandbox'

  // ── KV-first: refresh token has no TTL so it's always present if connection exists ──
  try {
    const rawKvRefresh = await kv.get(KV_KEYS.REFRESH_TOKEN)
    if (rawKvRefresh) {
      refreshToken = await decrypt(rawKvRefresh, encKey)
      environment  = ((await kv.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment
    }
  } catch {
    // KV decrypt failed — fall through to DB
    refreshToken = null
  }

  // ── DB fallback ──────────────────────────────────────────────────────────────
  if (!refreshToken) {
    let cred: typeof allegroCredentials.$inferSelect | undefined
    try {
      const [row] = await db
        .select()
        .from(allegroCredentials)
        .where(eq(allegroCredentials.isActive, true))
        .orderBy(desc(allegroCredentials.updatedAt))
        .limit(1)
      cred = row
    } catch (err) {
      console.warn('[Allegro] refresh: DB query failed:', err instanceof Error ? err.message : String(err))
    }

    if (!cred) {
      return c.json({ success: false, error: 'Brak aktywnych danych uwierzytelniania Allegro' }, 404)
    }

    try {
      refreshToken = await decrypt(cred.refreshToken, encKey)
    } catch (err) {
      if (err instanceof Error && err.message === 'ALLEGRO_TOKEN_DECRYPT_FAILED') {
        await db.update(allegroCredentials).set({ isActive: false }).where(eq(allegroCredentials.isActive, true)).catch(() => {})
        return c.json({ success: false, error: { code: 'REAUTH_REQUIRED', message: 'Tokeny Allegro wymagają ponownego uwierzytelnienia — poprzednie zostały zapisane bez szyfrowania.' } }, 401)
      }
      throw err
    }
    environment = cred.environment as AllegroEnvironment
  }

  if (!refreshToken) {
    return c.json({ success: false, error: 'Brak aktywnych danych uwierzytelniania Allegro' }, 404)
  }

  // ── Call Allegro to exchange refresh token for new tokens ────────────────────
  try {
    const oauthConfig = getAllegroOAuthConfig(env, environment)
    const tokens = await refreshAllegroToken({
      refreshToken,
      clientId:     oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      environment,
    })

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await Promise.all([
      saveTokensToDB(db, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope:        tokens.scope ?? null,
        environment,
        encKey,
      }),
      saveTokensToKV(kv, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        environment,
        encKey,
      }),
    ])

    await kv.delete(KV_KEYS.STATUS)

    return c.json({
      success: true,
      data: {
        expiresAt: expiresAt.toISOString(),
        environment,
      },
    })
  } catch (err) {
    // Refresh token invalidated by Allegro — clear stale credentials
    if (err instanceof AllegroInvalidGrantError) {
      console.warn('[Allegro] Refresh token wygasł/unieważniony — czyszczę dane uwierzytelniania')
      await Promise.allSettled([
        db.update(allegroCredentials).set({ isActive: false, updatedAt: new Date() }).where(eq(allegroCredentials.isActive, true)),
        kv.delete(KV_KEYS.ACCESS_TOKEN),
        kv.delete(KV_KEYS.REFRESH_TOKEN),
        kv.delete(KV_KEYS.ENVIRONMENT),
        kv.delete(KV_KEYS.STATUS),
      ])
      return c.json({ success: false, error: { code: 'RECONNECT_REQUIRED', message: 'Token Allegro wygasł i nie może być odświeżony. Połącz konto ponownie.' } }, 401)
    }
    const msg = err instanceof Error ? err.message : 'Błąd odświeżania'
    console.error('[Allegro] refresh error:', msg)
    return c.json({ success: false, error: { code: 'REFRESH_ERROR', message: msg } }, 500)
  }
})

// ── GET /me ───────────────────────────────────────────────────────────────────
// Verify token by calling Allegro GET /me
allegroRouter.get('/me', requireAdminOrProxy(), async (c) => {
  const env = c.env as AllegroEnv
  const db  = createDb(env.DATABASE_URL)

  try {
    // Get access token (KV first, then DB)
    const rawKvToken = await env.ALLEGRO_KV.get(KV_KEYS.ACCESS_TOKEN)
    let accessToken = rawKvToken ? await decrypt(rawKvToken, env.ALLEGRO_TOKEN_ENCRYPTION_KEY).catch(() => null) : null
    const environment = ((await env.ALLEGRO_KV.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment

    if (!accessToken) {
      // Fallback: decrypt from DB
      const [cred] = await db
        .select()
        .from(allegroCredentials)
        .where(eq(allegroCredentials.isActive, true))
        .orderBy(desc(allegroCredentials.updatedAt))
        .limit(1)

      if (!cred) {
        return c.json({ success: false, error: 'Brak połączenia z Allegro' }, 404)
      }
      try {
        accessToken = await decrypt(cred.accessToken, env.ALLEGRO_TOKEN_ENCRYPTION_KEY)
      } catch (err) {
        if (err instanceof Error && err.message === 'ALLEGRO_TOKEN_DECRYPT_FAILED') {
          await db.update(allegroCredentials).set({ isActive: false }).where(eq(allegroCredentials.isActive, true))
          return c.json({ success: false, error: { code: 'REAUTH_REQUIRED', message: 'Tokeny Allegro wymagają ponownego uwierzytelnienia — poprzednie zostały zapisane bez szyfrowania.' } }, 401)
        }
        throw err
      }
    }

    const apiBase = getAllegroApiBase(environment)
    const resp = await fetch(`${apiBase}/me`, {
      signal:  AbortSignal.timeout(10_000),
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        Accept:         'application/vnd.allegro.public.v1+json',
      },
    })

    if (!resp.ok) {
      return c.json({ success: false, error: `Allegro /me zwróciło ${resp.status}` }, resp.status as 400 | 401 | 403 | 404 | 500)
    }

    const data = await resp.json()
    return c.json({ success: true, data })
  } catch (err) {
    console.error('[Allegro] /me error:', err instanceof Error ? err.message : String(err))
    const msg = err instanceof Error ? err.message : 'Błąd weryfikacji tokenu'
    return c.json({ success: false, error: { code: 'ME_ERROR', message: msg } }, 500)
  }
})

// ── POST /sync/force ──────────────────────────────────────────────────────────
// Manually trigger Allegro order sync (same logic as 3-minute cron)
allegroRouter.post('/sync/force', requireAdminOrProxy(), async (c) => {
  try {
    const resetCursor = c.req.query('reset') === 'true'
    if (resetCursor && c.env.ALLEGRO_KV) {
      await c.env.ALLEGRO_KV.delete('allegro:cursor:orders')
      console.log('[Allegro] Cursor reset before force sync')
    }
    await syncAllegroOrders(c.env)
    return c.json({ success: true, message: 'Synchronizacja zamówień zakończona', cursorReset: resetCursor })
  } catch (err) {
    console.error('[Allegro] sync/force error:', err instanceof Error ? err.message : String(err))
    const msg = err instanceof Error ? err.message : 'Błąd synchronizacji'
    return c.json({ success: false, error: msg }, 500)
  }
})

// ── POST /backfill ────────────────────────────────────────────────────────────
// On-demand order backfill: fetch Allegro orders until the last saved one.
// Idempotent — skips already-imported orders.
// ?full=true — imports ALL orders regardless of what's in DB (full re-import)
allegroRouter.post('/backfill', requireAdminOrProxy(), async (c) => {
  try {
    const full = c.req.query('full') === 'true'
    const result = await backfillAllegroOrders(c.env, full)

    const reasonLabel: Record<string, string> = {
      caught_up:  'Synchronizacja do ostatniego zapisanego zamówienia',
      end_of_data: 'Pobrano wszystkie dostępne zamówienia',
      auth_error:  'Błąd autoryzacji — połącz Allegro ponownie',
      api_error:   'Błąd Allegro API — część zamówień mogła nie zostać pobrana',
    }

    return c.json({
      success: true,
      message: `${reasonLabel[result.stoppedReason] ?? 'Zakończono'} — zaimportowano: ${result.imported}, pominięto (istniały): ${result.skipped}, błędy: ${result.errors}`,
      data: result,
    })
  } catch (err) {
    console.error('[Allegro] backfill error:', err instanceof Error ? err.message : String(err))
    const msg = err instanceof Error ? err.message : 'Błąd backfill'
    return c.json({ success: false, error: { code: 'BACKFILL_ERROR', message: msg } }, 500)
  }
})

// ── PUT /orders/:id/fulfillment ───────────────────────────────────────────────
// Update fulfillment status on Allegro (PROCESSING, READY_FOR_SHIPMENT, SENT…)
// Mirrors Electron app: PUT /order/checkout-forms/{id}/fulfillment
allegroRouter.put('/orders/:id/fulfillment', requireAdminOrProxy(), async (c) => {
  try {
    const checkoutFormId = c.req.param('id')
    const body = await c.req.json<{ status: string }>()
    const { status } = body

    const validStatuses = ['NEW', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SENT', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED']
    if (!status || !validStatuses.includes(status)) {
      return c.json({ success: false, error: `Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}` }, 400)
    }

    const kv = c.env.ALLEGRO_KV
    const accessToken = await kv?.get('allegro:access_token')
    if (!accessToken) return c.json({ success: false, error: 'Brak tokenu Allegro' }, 401)

    const allegroEnv = (c.env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
    const apiBase = getAllegroApiBase(allegroEnv)

    const resp = await fetch(`${apiBase}/order/checkout-forms/${checkoutFormId}/fulfillment`, {
      signal: AbortSignal.timeout(10_000),
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        'application/vnd.allegro.public.v1+json',
        'Content-Type': 'application/vnd.allegro.public.v1+json',
      },
      body: JSON.stringify({ status }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error(`[Allegro] PUT fulfillment ${checkoutFormId} → ${resp.status}:`, errText)
      return c.json({ success: false, error: `Allegro API: ${resp.status}`, details: errText }, resp.status as any)
    }

    // Update local order status based on fulfillment
    const db = createDb(c.env.DATABASE_URL)
    const statusMap: Record<string, string> = {
      PROCESSING:          'processing',
      READY_FOR_SHIPMENT:  'processing',
      SENT:                'shipped',
      READY_FOR_PICKUP:    'shipped',
      PICKED_UP:           'delivered',
      CANCELLED:           'cancelled',
    }
    const localStatus = statusMap[status]
    if (localStatus) {
      const updates: Record<string, any> = { status: localStatus, updatedAt: new Date() }
      if (status === 'SENT' || status === 'READY_FOR_PICKUP') {
        updates.shippedAt = new Date()
      }
      await db.update(orders).set(updates).where(eq(orders.externalId, checkoutFormId!))
    }

    return c.json({ success: true, data: { checkoutFormId, fulfillmentStatus: status, localStatus } })
  } catch (err) {
    console.error('[Allegro] fulfillment error:', err instanceof Error ? err.message : String(err))
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Błąd' }, 500)
  }
})

// ── GET /orders/:id ───────────────────────────────────────────────────────────
// Fetch checkout form details from Allegro (buyer, delivery address, fulfillment)
allegroRouter.get('/orders/:id', requireAdminOrProxy(), async (c) => {
  try {
    const checkoutFormId = c.req.param('id')
    const token = await getActiveAllegroToken(c.env)
    if (!token) {
      return c.json({ error: { code: 'ALLEGRO_NOT_CONNECTED', message: 'Allegro nie jest podłączone' } }, 503)
    }

    const resp = await fetch(`${token.apiBase}/order/checkout-forms/${checkoutFormId}`, {
      signal:  AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: 'application/vnd.allegro.public.v1+json',
      },
    })

    if (!resp.ok) {
      return c.json({ error: { code: 'ALLEGRO_ERROR', message: `Allegro API: ${resp.status}` } }, resp.status as any)
    }

    const form = await resp.json() as Record<string, any>
    const delivAddr = form.delivery?.address
    const buyerName = `${delivAddr?.firstName ?? form.buyer?.firstName ?? ''} ${delivAddr?.lastName ?? form.buyer?.lastName ?? ''}`.trim()

    return c.json({
      success: true,
      data: {
        status: form.status ?? null,
        buyer: {
          login: form.buyer?.login ?? null,
          email: form.buyer?.email ?? null,
          phone: form.buyer?.phoneNumber ?? form.buyer?.address?.phoneNumber ?? delivAddr?.phoneNumber ?? null,
        },
        delivery: {
          address: delivAddr ? {
            name: buyerName || form.buyer?.login || null,
            street: delivAddr.street ?? '',
            city: delivAddr.city ?? '',
            postalCode: delivAddr.zipCode ?? delivAddr.postCode ?? '',
            country: delivAddr.countryCode ?? '',
            phone: delivAddr.phoneNumber ?? null,
          } : null,
          methodName: form.delivery?.method?.name ?? null,
          waybill: form.delivery?.shipmentSummary?.waybill ?? null,
        },
        fulfillment: {
          status: form.fulfillment?.status ?? null,
        },
      },
    })
  } catch (err) {
    console.error('[Allegro] order details error:', err instanceof Error ? err.message : String(err))
    return c.json({ error: { code: 'ALLEGRO_ORDER_DETAILS_ERROR', message: err instanceof Error ? err.message : 'Błąd' } }, 500)
  }
})

// ── GET /orders/:id/tracking ──────────────────────────────────────────────────
// Fetch delivery tracking for an Allegro order
// Flow: GET shipments → extract carrier+waybill → GET carrier tracking
allegroRouter.get('/orders/:id/tracking', requireAdminOrProxy(), async (c) => {
  try {
    const checkoutFormId = c.req.param('id')
    if (!checkoutFormId) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Brak ID zamówienia Allegro' } }, 400)
    }
    const result = await fetchAllegroShipments(c.env, checkoutFormId)
    if (result === null) {
      return c.json({ error: { code: 'ALLEGRO_TRACKING_ERROR', message: 'Nie udało się pobrać tracking z Allegro' } }, 502)
    }

    const selected = result.shipments.find((shipment) => shipment.isSelected) ?? result.shipments[0] ?? null

    return c.json({
      success: true,
      data: {
        carrier: selected?.carrierId ?? null,
        waybill: selected?.waybill ?? null,
        status: selected?.statusCode ?? null,
        statusDescription: selected?.statusLabel ?? null,
        updatedAt: selected?.occurredAt ?? null,
        allStatuses: selected?.events?.map((event) => ({
          status: event.code,
          description: event.label,
          occurredAt: event.occurredAt,
        })) ?? [],
      },
    })
  } catch (err) {
    console.error('[Allegro] tracking error:', err instanceof Error ? err.message : String(err))
    return c.json({ error: { code: 'ALLEGRO_TRACKING_ERROR', message: err instanceof Error ? err.message : 'Błąd' } }, 500)
  }
})

// ── Helpers: quality aggregation ─────────────────────────────────────────────

/**
 * Fetches and aggregates Allegro sales quality data from parallel API calls.
 * Exported for use in cron pre-warm (apps/api/src/index.ts).
 *
 * Data sources:
 * - /me                           → get userId for authenticated seller
 * - /sale/quality                 → score, maxScore, and component percentage rates
 * - /users/{userId}/ratings-summary → per-period rating counts (lastThreeMonths, lastSixMonths, lastTwelveMonths)
 * - /order/customer-returns       → return count
 */
export async function preWarmAllegroQualityCache(env: Env): Promise<void> {
  const kv = env.ALLEGRO_KV
  if (!kv) return

  const plDate = getPolandDateStamp()
  const [lastRunPlDate, prewarmLock, rawKvToken] = await Promise.all([
    kv.get(QUALITY_PREWARM_LAST_RUN_PL_DATE_KEY),
    kv.get(QUALITY_PREWARM_LOCK_KEY),
    kv.get(KV_KEYS.ACCESS_TOKEN),
  ])

  if (lastRunPlDate === plDate) {
    console.log('[Allegro Quality] Prewarm already completed for current PL day — skipping')
    return
  }

  if (prewarmLock) {
    console.log('[Allegro Quality] Prewarm lock active — skipping concurrent run')
    return
  }

  if (!rawKvToken) return

  await kv.put(QUALITY_PREWARM_LOCK_KEY, String(Date.now()), {
    expirationTtl: QUALITY_PREWARM_LOCK_TTL_SECONDS,
  })

  const encKey = (env as AllegroEnv).ALLEGRO_TOKEN_ENCRYPTION_KEY

  try {
    let accessToken: string
    try {
      accessToken = await decrypt(rawKvToken, encKey)
    } catch {
      return // key missing or token corrupt — skip pre-warm, next sync will restore
    }

    const environment = ((await kv.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment
    const db = createDb(env.DATABASE_URL)
    const data = await fetchAllegroQualityData(accessToken, environment, db)
    await Promise.all([
      kv.put(KV_KEYS.QUALITY_CACHE, JSON.stringify(data), { expirationTtl: 86400 }),
      kv.put(QUALITY_PREWARM_LAST_RUN_PL_DATE_KEY, plDate, {
        expirationTtl: QUALITY_PREWARM_LAST_RUN_TTL_SECONDS,
      }),
    ])
    console.log('[Allegro Quality] Cache pre-warmed at', data.fetchedAt)
  } catch (err) {
    console.error('[Allegro Quality] Pre-warm failed:', err instanceof Error ? err.message : String(err))
  } finally {
    await kv.delete(QUALITY_PREWARM_LOCK_KEY).catch(() => {})
  }
}

async function fetchAllegroQualityData(
  accessToken: string,
  environment: AllegroEnvironment,
  db: Database,
): Promise<AllegroSalesQuality> {
  const apiBase = getAllegroApiBase(environment)
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.allegro.public.v1+json',
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [qualityResp, meResp, returnsResp] = await Promise.all([
    fetch(`${apiBase}/sale/quality`,                    { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`${apiBase}/me`,                              { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`${apiBase}/order/customer-returns?status=FINISHED&createdAt.gte=${ninetyDaysAgo.toISOString()}&limit=1`,  { headers, signal: AbortSignal.timeout(10_000) }),
  ])

  // /sale/quality is the primary source — fail hard if unavailable
  if (!qualityResp.ok) {
    throw new Error(`Allegro /sale/quality returned ${qualityResp.status}`)
  }

  // Secondary sources degrade gracefully to 0 on failure
  const quality   = await qualityResp.json() as any
  const returns_  = returnsResp.ok ? await returnsResp.json() as any : { count: 0 }

  // Get userId from /me, then fetch ratings-summary
  if (!meResp.ok) {
    console.warn('[Allegro Quality] /me returned', meResp.status, '— ratings will default to 0')
  }
  const me      = meResp.ok ? await meResp.json() as any : null
  const userId  = (me?.id as string | undefined) ?? null
  if (!meResp.ok) {
    console.warn('[Allegro Quality] /me returned', meResp.status, '— ratings will default to 0')
  }

  let ratingsResp: Response | null = null
  if (userId) {
    ratingsResp = await fetch(
      `${apiBase}/users/${userId}/ratings-summary`,
      { headers, signal: AbortSignal.timeout(10_000) },
    )
    if (!ratingsResp.ok) {
      console.warn('[Allegro Quality] /users/ratings-summary returned', ratingsResp.status, '— ratings will default to 0')
    }
  }

  // Extract latest quality entry (today's date)
  const qualityArr = Array.isArray(quality.quality) ? quality.quality : []
  const latestQuality = qualityArr[0] ?? {}

  const score    = (latestQuality.score    as number) ?? 0
  const maxScore = (latestQuality.maxScore as number) ?? 500
  const metrics: Array<{ code: string; score: number; maxScore: number }> =
    Array.isArray(latestQuality.metrics) ? latestQuality.metrics : []

  // Helpers to get metric values
  const getMetric = (code: string) => metrics.find(x => x.code === code)
  const getMetricPct = (code: string): number => {
    const m = getMetric(code)
    if (!m || !m.maxScore) return 0
    return (m.score / m.maxScore) * 100
  }

  // Indicators mapping
  const onTimePercent = getMetricPct('DISPATCH_IN_TIME')
  
  // Parse ratings-summary — degrade gracefully to zero if unavailable
  // Actual shape: { recommended: { unique, total }, notRecommended: { unique, total }, ... }
  const ratingsSummary = ratingsResp?.ok ? await ratingsResp.json() as any : null

  const posCount        = (ratingsSummary?.recommended?.total    as number) ?? 0
  const negCount        = (ratingsSummary?.notRecommended?.total as number) ?? 0
  const totalRatings    = posCount + negCount
  const negativePercent = totalRatings > 0 ? (negCount / totalRatings) * 100 : 0

  const returnsCount = (returns_.count as number) ??
    (Array.isArray(returns_.customerReturns) ? returns_.customerReturns.length : 0)

  // Count synced Allegro orders in the same 90-day window for the denominator
  let ordersCount = 0
  try {
    const result = await db
      .select({ count: count() })
      .from(orders)
      .where(and(
        eq(orders.source, 'allegro'),
        orderStatusNe(orders.id, 'cancelled'),
        gte(orders.createdAt, ninetyDaysAgo),
      ))
    ordersCount = Number(result[0]?.count ?? 0)
  } catch (err) {
    console.warn('[Allegro Quality] DB orders count failed — ratePercent will be undefined', err)
  }
  const ratePercent = ordersCount > 0 ? (returnsCount / ordersCount) * 100 : undefined

  return {
    score,
    maxScore,
    fetchedAt: new Date().toISOString(),
    fulfillment: {
      onTimePercent,
    },
    returns: {
      count: returnsCount,
      ratePercent,
    },
    ratings: {
      positive: posCount,
      negative: negCount,
      negativePercent,
    },
    // Add grade info if available for extra context
    grade: latestQuality.grade,
  }
}

// ── GET /quality ──────────────────────────────────────────────────────────────

allegroRouter.get('/quality', dbMiddleware(), requireAdminOrProxy(), async (c) => {
  const env   = c.env as Env
  const kv    = env.ALLEGRO_KV
  const force = c.req.query('force') === 'true'

  try {
    // Check connection
    const accessToken = await kv?.get(KV_KEYS.ACCESS_TOKEN)
    if (!accessToken) {
      return c.json({ data: null })
    }

    // KV cache hit (skip if force=true)
    if (!force && kv) {
      const cached = await kv.get<AllegroSalesQuality>(KV_KEYS.QUALITY_CACHE, 'json')
      if (cached) {
        return c.json({ data: cached })
      }
    }

    // Cache miss or forced refresh — fetch live
    const environment = ((await kv?.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment
    const data = await fetchAllegroQualityData(accessToken, environment, c.var.db)

    // Write to KV non-blocking (don't delay the response)
    if (kv) {
      c.executionCtx.waitUntil(
        kv.put(KV_KEYS.QUALITY_CACHE, JSON.stringify(data), { expirationTtl: 86400 })
          .catch(err => console.error('[Allegro Quality] KV write failed:', err))
      )
    }

    return c.json({ data })
  } catch (err) {
    console.error('[Allegro Quality] fetch error:', err instanceof Error ? err.message : String(err))
    return c.json(
      { error: { code: 'ALLEGRO_FETCH_FAILED', message: 'Błąd pobierania danych jakości sprzedaży' } },
      502,
    )
  }
})
