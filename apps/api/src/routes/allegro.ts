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
import { eq, desc, and, lt, ne, gte, count, sql } from 'drizzle-orm'
import type { Env } from '../index'
import { requireAdminOrProxy } from '../middleware/auth'
import { dbMiddleware } from '../middleware/db'
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAllegroToken,
  AllegroInvalidGrantError,
  getAllegroApiBase,
  KV_KEYS,
  type AllegroEnvironment,
  type AllegroConnectionStatus,
} from '../lib/allegro'
import { syncAllegroOrders, backfillAllegroOrders } from '../lib/allegro-orders'
import { encryptText, decryptText } from '../lib/crypto'

// ── Router ───────────────────────────────────────────────────────────────────
export const allegroRouter = new Hono<{ Bindings: Env }>()

// ── Helpers ───────────────────────────────────────────────────────────────────

type AllegroEnv = Env & {
  ALLEGRO_CLIENT_ID: string
  ALLEGRO_CLIENT_SECRET: string
  ALLEGRO_REDIRECT_URI: string
  ALLEGRO_ADMIN_REDIRECT_URL: string
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string
  ALLEGRO_KV: KVNamespace
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
    // Generate CSRF state and store in DB — shared between all worker instances
    // (local dev + production both connect to the same Neon DB, so no secret sharing needed)
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    const stateKey = `csrf:state:${nonce}`

    const db = createDbHttp(env.DATABASE_URL)
    await db.insert(allegroState)
      .values({ key: stateKey, value: JSON.stringify({ environment, createdAt: Date.now() }), updatedAt: new Date() })
      .onConflictDoUpdate({ target: allegroState.key, set: { value: JSON.stringify({ environment, createdAt: Date.now() }), updatedAt: new Date() } })

    const url = buildAuthorizationUrl({
      clientId:    env.ALLEGRO_CLIENT_ID,
      redirectUri: env.ALLEGRO_REDIRECT_URI,
      environment,
      state: nonce,
    })

    return c.json({ success: true, data: { url, state: nonce, environment } })
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
  const db = createDbHttp(env.DATABASE_URL)

  // Allegro returned an error
  if (allegroError) {
    console.error('[Allegro] callback error from Allegro:', allegroError)
    return c.redirect(errorUrl('Allegro odmówił dostępu — sprawdź uprawnienia aplikacji'))
  }

  if (!code || !state) {
    return c.redirect(errorUrl('Brakujące parametry w callbacku'))
  }

  // Verify CSRF state from DB (shared between local dev + production — same Neon DB)
  let environment: AllegroEnvironment
  try {
    const stateKey = `csrf:state:${state}`
    const [stateRow] = await db.select().from(allegroState).where(eq(allegroState.key, stateKey)).limit(1)

    if (!stateRow) {
      return c.redirect(errorUrl('Nieprawidłowy lub wygasły parametr state (CSRF)'))
    }

    // Delete immediately — one-time use
    await db.delete(allegroState).where(eq(allegroState.key, stateKey))

    const parsed = JSON.parse(stateRow.value) as { environment: AllegroEnvironment; createdAt: number }
    if (Date.now() - parsed.createdAt > 600_000) {
      return c.redirect(errorUrl('Wygasły parametr state — spróbuj ponownie'))
    }
    environment = parsed.environment
  } catch (err) {
    console.error('[Allegro] callback state verification error:', err instanceof Error ? err.message : String(err))
    return c.redirect(errorUrl('Błąd weryfikacji sesji — spróbuj ponownie'))
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      clientId:     env.ALLEGRO_CLIENT_ID,
      clientSecret: env.ALLEGRO_CLIENT_SECRET,
      redirectUri:  env.ALLEGRO_REDIRECT_URI,
      environment,
    })

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Save to DB (encrypted) and KV
    await Promise.all([
      saveTokensToDB(db, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope:        tokens.scope ?? null,
        environment,
        encKey:       env.ALLEGRO_TOKEN_ENCRYPTION_KEY,
      }),
      saveTokensToKV(env.ALLEGRO_KV, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        environment,
        encKey:       env.ALLEGRO_TOKEN_ENCRYPTION_KEY,
      }),
    ])

    // Invalidate status cache
    await env.ALLEGRO_KV.delete(KV_KEYS.STATUS)

    // Save connection event to allegro_state for audit
    await db.insert(allegroState)
      .values({ key: 'last_oauth_connect', value: new Date().toISOString(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: allegroState.key,
        set: { value: new Date().toISOString(), updatedAt: new Date() },
      })

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

    // Clear KV tokens and status
    await Promise.all([
      env.ALLEGRO_KV.delete(KV_KEYS.ACCESS_TOKEN),
      env.ALLEGRO_KV.delete(KV_KEYS.REFRESH_TOKEN),
      env.ALLEGRO_KV.delete(KV_KEYS.ENVIRONMENT),
      env.ALLEGRO_KV.delete(KV_KEYS.STATUS),
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
  const env = c.env as AllegroEnv
  const db  = createDb(env.DATABASE_URL)

  try {
    // Get active credentials from DB
    const [cred] = await db
      .select()
      .from(allegroCredentials)
      .where(eq(allegroCredentials.isActive, true))
      .orderBy(desc(allegroCredentials.updatedAt))
      .limit(1)

    if (!cred) {
      return c.json({ success: false, error: 'Brak aktywnych danych uwierzytelniania Allegro' }, 404)
    }

    const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
    let refreshToken: string
    try {
      refreshToken = await decrypt(cred.refreshToken, encKey)
    } catch (err) {
      if (err instanceof Error && err.message === 'ALLEGRO_TOKEN_DECRYPT_FAILED') {
        // Stored token is plaintext (pre-encryption). Deactivate it and force re-auth.
        await db.update(allegroCredentials).set({ isActive: false }).where(eq(allegroCredentials.isActive, true))
        return c.json({ success: false, error: { code: 'REAUTH_REQUIRED', message: 'Tokeny Allegro wymagają ponownego uwierzytelnienia — poprzednie zostały zapisane bez szyfrowania.' } }, 401)
      }
      throw err
    }
    const environment  = cred.environment as AllegroEnvironment

    const tokens = await refreshAllegroToken({
      refreshToken,
      clientId:     env.ALLEGRO_CLIENT_ID,
      clientSecret: env.ALLEGRO_CLIENT_SECRET,
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
      saveTokensToKV(env.ALLEGRO_KV, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        environment,
        encKey,
      }),
    ])

    await env.ALLEGRO_KV.delete(KV_KEYS.STATUS)

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
      const env = c.env as AllegroEnv
      const db2 = createDb(env.DATABASE_URL)
      await Promise.allSettled([
        db2.update(allegroCredentials).set({ isActive: false, updatedAt: new Date() }).where(eq(allegroCredentials.isActive, true)),
        env.ALLEGRO_KV.delete(KV_KEYS.ACCESS_TOKEN),
        env.ALLEGRO_KV.delete(KV_KEYS.REFRESH_TOKEN),
        env.ALLEGRO_KV.delete(KV_KEYS.ENVIRONMENT),
        env.ALLEGRO_KV.delete(KV_KEYS.STATUS),
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
// Manually trigger Allegro order sync (same logic as per-minute cron)
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
    const kv = c.env.ALLEGRO_KV
    const accessToken = await kv?.get('allegro:access_token')
    if (!accessToken) return c.json({ success: false, error: 'Allegro nie podłączone' }, 503)

    const allegroEnv = (c.env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
    const apiBase = getAllegroApiBase(allegroEnv)

    const resp = await fetch(`${apiBase}/order/checkout-forms/${checkoutFormId}`, {
      signal:  AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.allegro.public.v1+json',
      },
    })

    if (!resp.ok) {
      return c.json({ success: false, error: `Allegro API: ${resp.status}` }, resp.status as any)
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
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Błąd' }, 500)
  }
})

// ── GET /orders/:id/tracking ──────────────────────────────────────────────────
// Fetch delivery tracking for an Allegro order
// Flow: GET shipments → extract carrier+waybill → GET carrier tracking
allegroRouter.get('/orders/:id/tracking', requireAdminOrProxy(), async (c) => {
  try {
    const checkoutFormId = c.req.param('id')
    const kv = c.env.ALLEGRO_KV
    const accessToken = await kv?.get('allegro:access_token')
    if (!accessToken) return c.json({ success: false, error: 'Allegro nie podłączone' }, 503)

    const allegroEnv = (c.env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
    const apiBase = getAllegroApiBase(allegroEnv)
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept:        'application/vnd.allegro.public.v1+json',
    }

    // 1. Get shipments for this order
    const shipResp = await fetch(`${apiBase}/order/checkout-forms/${checkoutFormId}/shipments`, { signal: AbortSignal.timeout(10_000), headers })
    if (!shipResp.ok) {
      return c.json({ success: false, error: `Brak przesyłek (${shipResp.status})` }, shipResp.status as any)
    }
    const shipData = await shipResp.json() as { shipments: Array<{ carrierId?: string; waybill?: string; trackingNumber?: string }> }
    const firstShipment = shipData.shipments?.[0]

    const carrierId = firstShipment?.carrierId
    const waybill = firstShipment?.waybill ?? firstShipment?.trackingNumber
    if (!carrierId || !waybill) {
      return c.json({ success: true, data: { carrier: carrierId, waybill, status: null, message: 'Brak danych śledzenia' } })
    }

    // 2. Fetch carrier tracking
    const trackResp = await fetch(
      `${apiBase}/order/carriers/${encodeURIComponent(carrierId)}/tracking?waybill=${encodeURIComponent(waybill)}`,
      { signal: AbortSignal.timeout(10_000), headers: { ...headers, 'Accept-Language': 'pl-PL' } },
    )

    if (!trackResp.ok) {
      return c.json({ success: true, data: { carrier: carrierId, waybill, status: null, error: `Tracking API: ${trackResp.status}` } })
    }

    const trackData = await trackResp.json() as Record<string, any>

    // 3. Extract latest status (like Electron app's extractTrackingEntry)
    const buckets: any[] = []
    for (const key of ['shipments', 'packages', 'items', 'waybills', 'tracking']) {
      if (Array.isArray(trackData[key])) buckets.push(...trackData[key])
    }
    const normWaybill = waybill.toUpperCase()
    const pick = buckets.find(e => String(e?.waybill ?? e?.number ?? e?.id ?? '').toUpperCase() === normWaybill) ?? buckets[0]

    let statuses: any[] = []
    if (pick) {
      statuses = pick.trackingDetails?.statuses ?? pick.statuses ?? pick.events ?? pick.history ?? []
    }
    const sorted = statuses.slice().sort((a: any, b: any) =>
      new Date(b.occurredAt ?? b.time ?? b.date ?? 0).getTime() - new Date(a.occurredAt ?? a.time ?? a.date ?? 0).getTime()
    )
    const latest = sorted[0]

    const latestCodeRaw = (latest?.code ?? latest?.status ?? null)
    const latestCode = latestCodeRaw == null
      ? null
      : String(latestCodeRaw).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null
    const latestOccurredRaw = latest?.occurredAt ?? latest?.time ?? latest?.date ?? null
    const latestOccurredAt = latestOccurredRaw ? new Date(String(latestOccurredRaw)) : null
    const latestOccurredAtSafe = latestOccurredAt && !Number.isNaN(latestOccurredAt.getTime()) ? latestOccurredAt : null

    // 4. Update tracking number in local DB
    if (waybill) {
      const db = createDb(c.env.DATABASE_URL)
      const latestDescription = latest?.description ?? null
      await db.update(orders)
        .set({
          trackingNumber: waybill,
          trackingStatus: latestDescription,
          trackingStatusCode: latestCode,
          trackingStatusUpdatedAt: new Date(),
          trackingLastEventAt: latestOccurredAtSafe,
          updatedAt: new Date(),
        })
        .where(and(
          eq(orders.externalId, checkoutFormId!),
          sql`(
            ${orders.trackingNumber} IS DISTINCT FROM ${waybill}
            OR ${orders.trackingStatus} IS DISTINCT FROM ${latestDescription}
            OR ${orders.trackingStatusCode} IS DISTINCT FROM ${latestCode}
            OR ${orders.trackingLastEventAt} IS DISTINCT FROM ${latestOccurredAtSafe}
            OR ${orders.trackingStatusUpdatedAt} IS NULL
          )`,
        ))
    }

    return c.json({
      success: true,
      data: {
        carrier: carrierId,
        waybill,
        status: (latest?.code ?? latest?.status ?? null)?.toUpperCase(),
        statusDescription: latest?.description ?? null,
        updatedAt: latest?.occurredAt ?? latest?.time ?? null,
        allStatuses: sorted.slice(0, 10).map((s: any) => ({
          status: s.code ?? s.status,
          description: s.description,
          occurredAt: s.occurredAt ?? s.time ?? s.date,
        })),
      },
    })
  } catch (err) {
    console.error('[Allegro] tracking error:', err instanceof Error ? err.message : String(err))
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Błąd' }, 500)
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

  const encKey = (env as AllegroEnv).ALLEGRO_TOKEN_ENCRYPTION_KEY
  const rawKvToken = await kv.get(KV_KEYS.ACCESS_TOKEN)
  if (!rawKvToken) return
  let accessToken: string
  try {
    accessToken = await decrypt(rawKvToken, encKey)
  } catch {
    return // key missing or token corrupt — skip pre-warm, next sync will restore
  }
  const environment = ((await kv.get(KV_KEYS.ENVIRONMENT)) ?? 'sandbox') as AllegroEnvironment

  try {
    const db = createDb(env.DATABASE_URL)
    const data = await fetchAllegroQualityData(accessToken, environment, db)
    await kv.put(KV_KEYS.QUALITY_CACHE, JSON.stringify(data), { expirationTtl: 86400 })
    console.log('[Allegro Quality] Cache pre-warmed at', data.fetchedAt)
  } catch (err) {
    console.error('[Allegro Quality] Pre-warm failed:', err instanceof Error ? err.message : String(err))
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
        ne(orders.status, 'cancelled'),
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
