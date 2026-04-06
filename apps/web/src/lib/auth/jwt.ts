import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { eq } from '@repo/db/orm';
import { db } from '@/db';
import { users } from '@/db/schema';

const ADMIN_COOKIE = 'admin_session';
const ALGORITHM = 'HS256';

/**
 * Admin JWT TTL: 4 hours.
 * Sliding window: the token is silently re-issued in the admin layout
 * whenever less than REFRESH_THRESHOLD_SECONDS remain, so an active
 * admin is never logged out mid-session.
 */
const ADMIN_TTL = '4h';
const ADMIN_COOKIE_MAX_AGE = 4 * 60 * 60; // 4 hours in seconds

/**
 * Refresh the token when fewer than this many seconds remain.
 * 1 hour — enough buffer for long-running tasks.
 */
const REFRESH_THRESHOLD_SECONDS = 60 * 60;

export interface AdminTokenPayload extends JWTPayload {
  userId: number;
  email: string;
  role: 'admin';
  tokenVersion: number;
  /** Unique token ID — allows per-token tracking and future fine-grained revocation */
  jti: string;
}

/**
 * Returns [currentSecret, ...oldSecrets] as Uint8Array[].
 *
 * Rotation procedure (zero-downtime):
 * 1. Set ADMIN_JWT_SECRET_OLD = current ADMIN_JWT_SECRET value
 * 2. Set ADMIN_JWT_SECRET = new secret
 * 3. Deploy — existing sessions verify against the old secret and are
 *    automatically re-issued with the new secret on next request
 * 4. After all sessions expire (≤4h), remove ADMIN_JWT_SECRET_OLD
 */
function getSecrets(): Uint8Array[] {
  const current = process.env.ADMIN_JWT_SECRET;
  if (!current) throw new Error('ADMIN_JWT_SECRET is not set');
  if (current.length < 32) throw new Error('ADMIN_JWT_SECRET must be at least 32 characters');

  const enc = new TextEncoder();
  const secrets: Uint8Array[] = [enc.encode(current)];

  const old = process.env.ADMIN_JWT_SECRET_OLD;
  if (old && old.length >= 32) {
    secrets.push(enc.encode(old));
  }
  return secrets;
}

/** Convenience — signing always uses the current (first) secret. */
function getSecret(): Uint8Array {
  return getSecrets()[0];
}

/**
 * Sign a JWT for an admin user.
 *
 * Includes:
 * - `jti`: unique token ID (UUID v4) for per-token tracing
 * - `iat`: issued-at timestamp
 * - `exp`: expiry (4 hours from now)
 * - `iss`: issuer claim for validation
 * - `tokenVersion`: DB column — allows instant ALL-device session revocation
 */
export async function signAdminToken(payload: {
  userId: number;
  email: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: 'admin' as const,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setJti(crypto.randomUUID())   // unique per-token ID
    .setIssuedAt()
    .setExpirationTime(ADMIN_TTL)
    .setIssuer('ilbuoncaffe:admin')
    .sign(getSecret());
}

type VerifyResult = { payload: AdminTokenPayload; rotated: boolean };

/**
 * Internal: try each secret in order; return which one succeeded.
 * `rotated = true` means the token was signed with an old secret and should
 * be re-issued transparently so the user stays logged in after rotation.
 */
async function verifyAdminTokenInternal(token: string): Promise<VerifyResult | null> {
  const secrets = getSecrets();
  for (let i = 0; i < secrets.length; i++) {
    try {
      const { payload } = await jwtVerify(token, secrets[i], {
        issuer: 'ilbuoncaffe:admin',
        algorithms: [ALGORITHM],
      });
      if (payload.role !== 'admin') return null;
      return { payload: payload as AdminTokenPayload, rotated: i > 0 };
    } catch {
      // Try next secret
    }
  }
  return null;
}

/**
 * Verify and decode an admin JWT (signature + issuer + role only).
 * Tries current secret first, then ADMIN_JWT_SECRET_OLD (rotation grace period).
 * Does NOT check tokenVersion against DB — use getAdminSession() for that.
 * Returns null if invalid / expired / wrong role.
 */
export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  const result = await verifyAdminTokenInternal(token);
  return result?.payload ?? null;
}

/**
 * Get the current admin session from cookies.
 *
 * Full verification chain:
 * 1. Read httpOnly `admin_session` cookie
 * 2. Verify JWT signature + issuer + role claim
 * 3. Cross-check `tokenVersion` against DB row
 *    → incremented on logout/password-change → instant ALL-device revocation
 * 4. Verify the user still has the 'admin' role
 *
 * Use in Server Components and Server Actions — NOT in Edge Middleware
 * (Edge only does step 1–2 for performance).
 */
export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const result = await verifyAdminTokenInternal(token);
  if (!result) return null;

  const { payload, rotated } = result;

  // Full DB check — catches revoked sessions (logout, password change, role change)
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
    columns: { tokenVersion: true, role: true },
  });

  // Treat missing tokenVersion in old JWTs as 0 (backwards-compat for tokens
  // issued before the tokenVersion field was introduced).
  const jwtVersion = payload.tokenVersion ?? 0;

  if (!user || user.role !== 'admin' || user.tokenVersion !== jwtVersion) {
    return null;
  }

  // Auto-reissue with current secret (seamless rotation / sliding window)
  // Also reissue if tokenVersion was missing from old JWT (one-time migration).
  if (rotated || shouldRefresh(payload) || payload.tokenVersion === undefined) {
    const newToken = await signAdminToken({
      userId: payload.userId,
      email: payload.email,
      tokenVersion: user.tokenVersion,
    });
    try {
      cookieStore.set(getAdminCookieConfig(newToken));
    } catch {
      // Cookies can only be set in Route Handlers and Server Actions.
      // When called from a Server Component (e.g. AdminLayout), the set is
      // silently skipped — the refresh will happen on the next API request
      // that passes through the proxy Route Handler.
    }
  }

  return payload;
}

/** True when the token has less than REFRESH_THRESHOLD_SECONDS remaining. */
function shouldRefresh(payload: AdminTokenPayload): boolean {
  if (!payload.exp) return false;
  return payload.exp - Math.floor(Date.now() / 1000) < REFRESH_THRESHOLD_SECONDS;
}

/**
 * Cookie configuration for admin session.
 *
 * Security properties:
 * - httpOnly: JS cannot access the cookie (XSS protection)
 * - secure: HTTPS only in production
 * - sameSite: strict — no cross-site request sending (CSRF protection)
 * - path: / — must be '/' because admin API routes are served at /api/admin/*,
 *             not under /admin/*, so a narrower path would break those endpoints.
 *             sameSite=strict provides equivalent CSRF protection in modern browsers.
 * - maxAge: 4 hours (short-lived window)
 */
export function getAdminCookieConfig(token: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction,
    // 'lax' (not 'strict') so the cookie is sent on top-level cross-site redirects
    // e.g. after Allegro OAuth redirects back to /admin/settings.
    // 'lax' still blocks cross-site POST/AJAX (CSRF protection intact).
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}

export { ADMIN_COOKIE };
