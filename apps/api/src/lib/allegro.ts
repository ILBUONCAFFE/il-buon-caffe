/**
 * Allegro REST API — OAuth2 helpers & token management
 * Based on docs/ALLEGRO_API_STRATEGY.md §3
 *
 * Environments:
 *  - Sandbox:    allegro.pl.allegrosandbox.pl
 *  - Production: allegro.pl
 */

export type AllegroEnvironment = 'sandbox' | 'production'

// ── URL helpers ──────────────────────────────────────────────────────────────

const OAUTH_BASE: Record<AllegroEnvironment, string> = {
  production: 'https://allegro.pl',
  sandbox:    'https://allegro.pl.allegrosandbox.pl',
}

const API_BASE: Record<AllegroEnvironment, string> = {
  production: 'https://api.allegro.pl',
  sandbox:    'https://api.allegro.pl.allegrosandbox.pl',
}

export function getAllegroApiBase(env: AllegroEnvironment) {
  return API_BASE[env]
}

type AllegroOAuthConfigEnv = {
  ALLEGRO_CLIENT_ID?: string
  ALLEGRO_CLIENT_SECRET?: string
  ALLEGRO_REDIRECT_URI?: string
  ALLEGRO_CLIENT_ID_SANDBOX?: string
  ALLEGRO_CLIENT_SECRET_SANDBOX?: string
  ALLEGRO_REDIRECT_URI_SANDBOX?: string
  ALLEGRO_CLIENT_ID_PRODUCTION?: string
  ALLEGRO_CLIENT_SECRET_PRODUCTION?: string
  ALLEGRO_REDIRECT_URI_PRODUCTION?: string
}

export function getAllegroOAuthConfig(
  env: AllegroOAuthConfigEnv,
  environment: AllegroEnvironment,
): { clientId: string; clientSecret: string; redirectUri: string } {
  const isSandbox = environment === 'sandbox'

  const clientId = isSandbox
    ? (env.ALLEGRO_CLIENT_ID_SANDBOX ?? env.ALLEGRO_CLIENT_ID)
    : (env.ALLEGRO_CLIENT_ID_PRODUCTION ?? env.ALLEGRO_CLIENT_ID)

  const clientSecret = isSandbox
    ? (env.ALLEGRO_CLIENT_SECRET_SANDBOX ?? env.ALLEGRO_CLIENT_SECRET)
    : (env.ALLEGRO_CLIENT_SECRET_PRODUCTION ?? env.ALLEGRO_CLIENT_SECRET)

  const redirectUri = isSandbox
    ? (env.ALLEGRO_REDIRECT_URI_SANDBOX ?? env.ALLEGRO_REDIRECT_URI)
    : (env.ALLEGRO_REDIRECT_URI_PRODUCTION ?? env.ALLEGRO_REDIRECT_URI)

  const missing: string[] = []
  if (!clientId) missing.push(isSandbox ? 'ALLEGRO_CLIENT_ID_SANDBOX|ALLEGRO_CLIENT_ID' : 'ALLEGRO_CLIENT_ID_PRODUCTION|ALLEGRO_CLIENT_ID')
  if (!clientSecret) missing.push(isSandbox ? 'ALLEGRO_CLIENT_SECRET_SANDBOX|ALLEGRO_CLIENT_SECRET' : 'ALLEGRO_CLIENT_SECRET_PRODUCTION|ALLEGRO_CLIENT_SECRET')
  if (!redirectUri) missing.push(isSandbox ? 'ALLEGRO_REDIRECT_URI_SANDBOX|ALLEGRO_REDIRECT_URI' : 'ALLEGRO_REDIRECT_URI_PRODUCTION|ALLEGRO_REDIRECT_URI')

  if (missing.length > 0) {
    throw new Error(`[Allegro] Missing OAuth config for ${environment}: ${missing.join(', ')}`)
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri: redirectUri!,
  }
}

// ── Authorization URL (step 1 of OAuth flow) ─────────────────────────────────

export function buildAuthorizationUrl(opts: {
  clientId:    string
  redirectUri: string
  environment: AllegroEnvironment
  state:       string
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     opts.clientId,
    redirect_uri:  opts.redirectUri,
    state:         opts.state,
    prompt:        'confirm', // always show consent screen
  })
  return `${OAUTH_BASE[opts.environment]}/auth/oauth/authorize?${params}`
}

// ── Token exchange (step 2 — code → tokens) ──────────────────────────────────

export interface AllegroTokenResponse {
  access_token:  string
  refresh_token: string
  token_type:    string
  expires_in:    number   // seconds (typically 43200 = 12h)
  scope?:        string
}

/** Thrown when Allegro rejects the refresh token (invalid_grant / 400).
 *  Caller should clear stored credentials and prompt the user to reconnect. */
export class AllegroInvalidGrantError extends Error {
  constructor(description?: string) {
    super(description ?? 'Invalid refresh token — reconnect required')
    this.name = 'AllegroInvalidGrantError'
  }
}

async function callTokenEndpoint(
  url: string,
  clientId: string,
  clientSecret: string,
  body: URLSearchParams,
): Promise<AllegroTokenResponse> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const resp = await fetch(url, {
    signal:  AbortSignal.timeout(10_000),
    method:  'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'unknown' })) as Record<string, string>
    // 400 invalid_grant means the refresh token is dead — throw a typed error
    if (resp.status === 400 && (err.error === 'invalid_grant' || (err.error_description ?? '').toLowerCase().includes('invalid refresh token'))) {
      throw new AllegroInvalidGrantError(err.error_description)
    }
    throw new Error(`Allegro token error ${resp.status}: ${JSON.stringify(err)}`)
  }
  return resp.json() as Promise<AllegroTokenResponse>
}

export async function exchangeCodeForTokens(opts: {
  code:        string
  clientId:    string
  clientSecret:string
  redirectUri: string
  environment: AllegroEnvironment
}): Promise<AllegroTokenResponse> {
  const url = `${OAUTH_BASE[opts.environment]}/auth/oauth/token`
  return callTokenEndpoint(
    url,
    opts.clientId,
    opts.clientSecret,
    new URLSearchParams({
      grant_type:   'authorization_code',
      code:          opts.code,
      redirect_uri:  opts.redirectUri,
    }),
  )
}

export async function refreshAllegroToken(opts: {
  refreshToken: string
  clientId:     string
  clientSecret: string
  environment:  AllegroEnvironment
}): Promise<AllegroTokenResponse> {
  const url = `${OAUTH_BASE[opts.environment]}/auth/oauth/token`
  return callTokenEndpoint(
    url,
    opts.clientId,
    opts.clientSecret,
    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token:  opts.refreshToken,
    }),
  )
}

// ── Stateless CSRF state (HMAC-signed, no KV required) ───────────────────────
//
// Format: <nonce>.<environment>.<timestamp>.<hmac>
//   nonce       — 16 random bytes, hex
//   environment — "production" | "sandbox"
//   timestamp   — ms since epoch (used to enforce 10-min TTL)
//   hmac        — HMAC-SHA256 of "nonce.environment.timestamp" using JWT_ACCESS_SECRET
//
// This replaces KV-stored state so local wrangler dev works without remote KV.

export async function generateSignedState(
  environment: AllegroEnvironment,
  secret: string,
): Promise<string> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  const timestamp = Date.now().toString()
  const payload   = `${nonce}.${environment}.${timestamp}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  return `${payload}.${sigHex}`
}

export async function verifySignedState(
  state: string,
  secret: string,
): Promise<{ environment: AllegroEnvironment }> {
  const parts = state.split('.')
  if (parts.length !== 4) throw new Error('Invalid state format')

  const [nonce, environment, timestamp, sigHex] = parts
  const payload = `${nonce}.${environment}.${timestamp}`

  // Enforce 10-minute TTL
  const age = Date.now() - parseInt(timestamp, 10)
  if (isNaN(age) || age > 600_000 || age < 0) throw new Error('State expired')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const sigBytes = new Uint8Array((sigHex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)))
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
  if (!valid) throw new Error('Invalid state signature')

  return { environment: environment as AllegroEnvironment }
}

// ── KV key constants ──────────────────────────────────────────────────────────

export const KV_KEYS = {
  ACCESS_TOKEN:   'allegro:access_token',
  REFRESH_TOKEN:  'allegro:refresh_token',
  ENVIRONMENT:    'allegro:environment',
  STATUS:         'allegro:status',       // { connected, expiresAt, environment }
  STATE_PREFIX:   'allegro:state:',       // + uuid → CSRF state (TTL 10 min)
  QUALITY_CACHE:  'allegro:quality:cache', // AllegroSalesQuality — refreshed daily
} as const

// ── Status object ─────────────────────────────────────────────────────────────

export interface AllegroConnectionStatus {
  connected:     boolean
  environment:   AllegroEnvironment | null
  expiresAt:     string | null      // ISO
  tokenValid:    boolean
  accountId?:    string
  accountLogin?: string
}
