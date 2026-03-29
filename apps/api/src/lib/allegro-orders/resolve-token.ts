/**
 * Allegro Order Sync — Deduplicated token resolution
 *
 * Used by both syncAllegroOrders and backfillAllegroOrders.
 * Tries KV first, falls back to DB credentials, handles token refresh.
 */

import { createDb } from '@repo/db/client'
import { allegroCredentials } from '@repo/db/schema'
import { eq, desc } from 'drizzle-orm'
import { KV_KEYS, refreshAllegroToken, AllegroInvalidGrantError, type AllegroEnvironment } from '../allegro'
import { decryptText, encryptText } from '../crypto'
import type { Env } from '../../index'

export interface ResolveTokenResult {
  accessToken: string
}

/**
 * Resolve Allegro access token: KV first, then DB fallback with refresh if expired.
 *
 * @param kv - Cloudflare KV namespace for token cache
 * @param db - Drizzle DB instance (can be HTTP or WebSocket pool)
 * @param env - Worker environment bindings
 * @returns access token string, or null if unavailable
 */
export async function resolveAccessToken(
  kv: KVNamespace,
  db: ReturnType<typeof createDb>,
  env: Env,
): Promise<string | null> {
  // Try KV first (fast path)
  let accessToken = await kv.get(KV_KEYS.ACCESS_TOKEN)
  if (accessToken) return accessToken

  // KV TTL may have expired — restore from DB
  let credRows: (typeof allegroCredentials.$inferSelect)[] = []
  try {
    credRows = await db
      .select()
      .from(allegroCredentials)
      .where(eq(allegroCredentials.isActive, true))
      .orderBy(desc(allegroCredentials.updatedAt))
      .limit(1)
  } catch { /* DB unavailable */ }

  const cred = credRows[0]
  if (!cred) return null

  const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
  const allegroEnvCred = cred.environment as AllegroEnvironment

  if (cred.expiresAt <= new Date()) {
    // Token expired — try refresh
    let rawRefresh: string
    try {
      rawRefresh = encKey ? await decryptText(cred.refreshToken, encKey) : cred.refreshToken
    } catch (e) {
      console.error('[AllegroOrders] Błąd odświeżania wygasłego tokenu:', e instanceof Error ? e.message : e)
      console.error('[AllegroOrders] Klucz ALLEGRO_TOKEN_ENCRYPTION_KEY nie pasuje do tokenu w bazie. Wymagana ponowna autoryzacja Allegro OAuth.')
      return null
    }
    const tokens = await refreshAllegroToken({
      refreshToken: rawRefresh,
      clientId:     env.ALLEGRO_CLIENT_ID,
      clientSecret: env.ALLEGRO_CLIENT_SECRET,
      environment:  allegroEnvCred,
    })
    accessToken = tokens.access_token
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    const ttl = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 60)

    // Persist new tokens to DB and KV — prevents hourly cron from using the
    // now-invalidated refresh token (Allegro rotates refresh tokens on every use)
    const encAccess  = encKey ? await encryptText(tokens.access_token,  encKey) : tokens.access_token
    const encRefresh = encKey ? await encryptText(tokens.refresh_token, encKey) : tokens.refresh_token
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
      environment:  allegroEnvCred,
      updatedAt:    new Date(),
    })
    await Promise.all([
      kv.put(KV_KEYS.ACCESS_TOKEN,  tokens.access_token,  { expirationTtl: ttl }),
      kv.put(KV_KEYS.REFRESH_TOKEN, tokens.refresh_token),
      kv.put('allegro:token_expires_at', expiresAt.toISOString()),
    ]).catch(() => {})
  } else {
    // Token still valid in DB — restore to KV
    let rawAccess: string
    try {
      rawAccess = encKey ? await decryptText(cred.accessToken, encKey) : cred.accessToken
    } catch (e) {
      console.error('[AllegroOrders] Błąd odczytu tokenu dostępu:', e instanceof Error ? e.message : e)
      console.error('[AllegroOrders] Klucz ALLEGRO_TOKEN_ENCRYPTION_KEY nie pasuje do tokenu w bazie. Wymagana ponowna autoryzacja Allegro OAuth.')
      return null
    }
    accessToken = rawAccess
    const ttl = Math.max(Math.floor((cred.expiresAt.getTime() - Date.now()) / 1000), 60)
    await kv.put(KV_KEYS.ACCESS_TOKEN, accessToken, { expirationTtl: ttl }).catch(() => {})
  }

  return accessToken
}
