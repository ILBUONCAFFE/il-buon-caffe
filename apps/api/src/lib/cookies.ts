import type { Context } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

// Cookie names — use __Host- prefix in production for strongest protection.
// __Host- requires: Secure=true, Path=/, no Domain attribute — which is exactly what we set.
const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

// We also support the __Host- prefixed variant for reading.
const HOST_ACCESS_TOKEN_COOKIE = '__Host-access_token'
const HOST_REFRESH_TOKEN_COOKIE = '__Host-refresh_token'

// Cookie options
interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
  path: string
  maxAge: number
}

/**
 * Determine if we're in production from the environment or hostname.
 */
function isProduction(c: Context): boolean {
  const env = (c.env as { NODE_ENV?: string }).NODE_ENV
  if (env) return env === 'production'
  // In Cloudflare Workers, there's no NODE_ENV by default.
  // Check the hostname via the request.
  const host = c.req.header('Host') || ''
  return !host.includes('localhost') && !host.includes('127.0.0.1')
}

/**
 * Get the cookie name with optional __Host- prefix.
 */
function cookieName(base: string, prod: boolean): string {
  return prod ? `__Host-${base}` : base
}

// Default secure cookie options
const getSecureCookieOptions = (maxAge: number, prod: boolean): CookieOptions => ({
  httpOnly: true,
  secure: prod,
  sameSite: 'Strict',
  path: '/',
  maxAge
})

// Access token expires in 2 hours (or 24 hours for "remember me")
const ACCESS_TOKEN_MAX_AGE = 2 * 60 * 60 // 2 hours in seconds
const ACCESS_TOKEN_MAX_AGE_REMEMBER = 24 * 60 * 60 // 24 hours in seconds

// Refresh token expires in 7 days
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Set authentication cookies (access and refresh tokens)
 * @param c - Hono context
 * @param accessToken - JWT access token
 * @param refreshToken - JWT refresh token  
 * @param rememberMe - If true, use longer access token expiry (24h instead of 2h)
 */
export function setAuthCookies(
  c: Context,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
): void {
  const prod = isProduction(c)

  // Set access token cookie
  const accessMaxAge = rememberMe ? ACCESS_TOKEN_MAX_AGE_REMEMBER : ACCESS_TOKEN_MAX_AGE
  setCookie(c, cookieName(ACCESS_TOKEN_COOKIE, prod), accessToken, getSecureCookieOptions(accessMaxAge, prod))
  
  // Set refresh token cookie — restrict path to /api/auth for least-privilege
  const refreshOptions = getSecureCookieOptions(REFRESH_TOKEN_MAX_AGE, prod)
  refreshOptions.path = '/api/auth'
  setCookie(c, cookieName(REFRESH_TOKEN_COOKIE, prod), refreshToken, refreshOptions)
}

/**
 * Clear authentication cookies (for logout)
 * @param c - Hono context
 */
export function clearAuthCookies(c: Context): void {
  const prod = isProduction(c)
  
  // Delete both prefixed and non-prefixed cookies for transition safety
  deleteCookie(c, cookieName(ACCESS_TOKEN_COOKIE, prod), { path: '/' })
  deleteCookie(c, cookieName(REFRESH_TOKEN_COOKIE, prod), { path: '/api/auth' })
  
  // Also clear the un-prefixed variants in case of migration
  if (prod) {
    deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' })
    deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' })
  }
}

/**
 * Get access token from cookie (checks both prefixed and non-prefixed)
 * @param c - Hono context
 * @returns Access token string or undefined if not present
 */
export function getAccessTokenFromCookie(c: Context): string | undefined {
  return getCookie(c, HOST_ACCESS_TOKEN_COOKIE) || getCookie(c, ACCESS_TOKEN_COOKIE)
}

/**
 * Get refresh token from cookie (checks both prefixed and non-prefixed)
 * @param c - Hono context
 * @returns Refresh token string or undefined if not present
 */
export function getRefreshTokenFromCookie(c: Context): string | undefined {
  return getCookie(c, HOST_REFRESH_TOKEN_COOKIE) || getCookie(c, REFRESH_TOKEN_COOKIE)
}

/**
 * Check if user has valid auth cookies set
 * @param c - Hono context
 * @returns True if access token cookie exists
 */
export function hasAuthCookies(c: Context): boolean {
  return getAccessTokenFromCookie(c) !== undefined
}
