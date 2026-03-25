'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, sql } from '@repo/db/orm';
import { db } from '@/db';
import { users, auditLog } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { signAdminToken, getAdminCookieConfig, getAdminSession, ADMIN_COOKIE } from '@/lib/auth/jwt';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { alertSuspiciousActivity } from '@/lib/security/alerts';

// Constants
const MAX_FAILED_ATTEMPTS = 5;                   // lock after 5 wrong passwords
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;     // 30 minutes
const GENERIC_ERROR = 'Nieprawidłowy email lub hasło';

async function getExpectedOrigin(): Promise<string[]> {
  let url = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const cfCtx = await getCloudflareContext({ async: true });
    if (cfCtx?.env?.NEXT_PUBLIC_SITE_URL) {
      url = cfCtx.env.NEXT_PUBLIC_SITE_URL;
    }
  } catch (e) {
    // Local dev or setup issue
  }
  
  const expectedUrls = [(url ?? 'http://localhost:3000').replace(/\/$/, '')];
  
  if (process.env.NODE_ENV !== 'production' && !expectedUrls.includes('http://localhost:3000')) {
    expectedUrls.push('http://localhost:3000');
  }
  
  return expectedUrls;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

/**
 * Write an audit log entry (fire-and-forget, never throws).
 */
async function writeAuditLog(params: {
  adminId?: number;
  action: 'login' | 'logout';
  ip: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      adminId: params.adminId ?? null,
      action: params.action,
      ipAddress: params.ip,
      userAgent: params.userAgent ?? null,
      details: params.details ?? null,
    });
  } catch (err) {
    console.error('[writeAuditLog] Failed:', err instanceof Error ? err.message : 'Unknown');
  }
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

/**
 * Admin login Server Action.
 *
 * Security layers:
 * 1. CSRF — Origin header must match expected site URL
 * 2. Input sanitisation — length limits, email format
 * 3. Rate limiting by IP (in-memory; primary serverless defense is DB lockout)
 * 4. Account lockout — 5 failed attempts → 30 min DB lock (persists across isolates)
 * 5. Timing-safe comparison — bcrypt.compare prevents timing oracle
 * 6. Generic error messages — no email enumeration
 * 7. HttpOnly + Secure + SameSite=Strict cookie (4h TTL)
 * 8. JWT with issuer + tokenVersion; jti for per-token tracing
 * 9. Full audit log on every attempt (success and failure)
 */
export async function adminLoginAction(formData: FormData): Promise<LoginResult> {
  try {
    // ── 1. CSRF — fail-closed Origin/Referer check ───────────────────────────────
    const headerStore = await headers();
    const origin = headerStore.get('origin');
    const referer = headerStore.get('referer');
    const expectedOrigin = await getExpectedOrigin();

    // Fail CLOSED: a legitimate browser form submission always includes
    // Origin or Referer. If both are absent (e.g., stripped by a rogue proxy),
    // we deny — this is more secure than trusting the unknown request.
    // Some privacy-preserving proxies strip Origin but leave Referer intact,
    // so we accept Referer as a fallback by extracting its origin part.
    let effectiveOrigin: string | null = origin;
    if (!effectiveOrigin && referer) {
      try { effectiveOrigin = new URL(referer).origin; } catch { effectiveOrigin = null; }
    }

    if (!effectiveOrigin || !expectedOrigin.includes(effectiveOrigin)) {
      console.warn(`[adminLoginAction] CSRF block: origin=${origin ?? 'null'} referer=${referer ?? 'null'} expected=${expectedOrigin.join(', ')}`);
      return { success: false, error: GENERIC_ERROR };
    }

    // ── 2. Extract & validate input ───────────────────────────────────────
    const email = (formData.get('email') as string)?.trim()?.toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { success: false, error: 'Podaj email i hasło' };
    }

    if (!email.includes('@') || email.length > 255) {
      return { success: false, error: GENERIC_ERROR };
    }

    if (password.length > 128) {  // MAX_PASSWORD_LENGTH in password.ts
      return { success: false, error: GENERIC_ERROR };
    }

    // ── 3. IP extraction ──────────────────────────────────────────────────
    const ip =
      headerStore.get('cf-connecting-ip') ??
      headerStore.get('x-real-ip') ??
      headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    const userAgent = headerStore.get('user-agent') ?? undefined;

    // ── 4. In-memory rate limiting (best-effort in serverless) ────────────
    const rateCheck = checkRateLimit(`admin-login:${ip}`);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Zbyt wiele prób logowania. Spróbuj ponownie za ${Math.ceil((rateCheck.retryAfterSeconds || 3600) / 60)} minut.`,
        retryAfter: rateCheck.retryAfterSeconds,
      };
    }

    // ── 5. Find user ──────────────────────────────────────────────────────
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        tokenVersion: true,
      },
    });

    // Always verify a dummy hash to prevent timing attacks on user enumeration
    if (!user || user.role !== 'admin') {
      await verifyPassword(password, '$2b$12$0000000000000000000000000000000000000000000000000000');
      void writeAuditLog({ action: 'login', ip, userAgent, details: { result: 'failed', reason: 'user_not_found' } });
      return { success: false, error: GENERIC_ERROR };
    }

    // ── 6. DB-level account lockout (persists across Cloudflare isolates) ─
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      void writeAuditLog({ adminId: user.id, action: 'login', ip, userAgent, details: { result: 'failed', reason: 'account_locked' } });
      return {
        success: false,
        error: `Konto tymczasowo zablokowane. Spróbuj za ${minutesLeft} minut.`,
      };
    }

    // ── 7. Verify password (bcrypt, timing-safe) ──────────────────────────
    const passwordValid = await verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: newAttempts };

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        // Fire active alert — someone is brute-forcing this account
        void alertSuspiciousActivity({
          event: 'Account locked after repeated login failures',
          ip,
          email: user.email,
          details: { attempts: newAttempts, lockedUntilMinutes: LOCKOUT_DURATION_MS / 60000 },
        });
      }

      await db.update(users).set(updateData).where(eq(users.id, user.id));

      void writeAuditLog({
        adminId: user.id, action: 'login', ip, userAgent,
        details: { result: 'failed', reason: 'bad_password', attempts: newAttempts },
      });

      return { success: false, error: GENERIC_ERROR };
    }

    // ── 8. Success — reset counters, sign JWT, set cookie ─────────────────
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    }).where(eq(users.id, user.id));

    resetRateLimit(`admin-login:${ip}`);

    const token = await signAdminToken({
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    });
    const cookieStore = await cookies();
    cookieStore.set(getAdminCookieConfig(token));

    void writeAuditLog({
      adminId: user.id, action: 'login', ip, userAgent,
      details: { result: 'success' },
    });

    return { success: true };

  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'Wystąpił błąd serwera. Spróbuj ponownie.' };
  }
}

// ─── Admin Logout ─────────────────────────────────────────────────────────────

/**
 * Admin logout Server Action.
 *
 * Critical: increments `tokenVersion` in the DB so any cloned/stolen cookies
 * instantly become invalid on the next `getAdminSession()` call (even before TTL).
 */
export async function adminLogoutAction(): Promise<void> {
  const session = await getAdminSession();
  const headerStore = await headers();
  const ip =
    headerStore.get('cf-connecting-ip') ??
    headerStore.get('x-real-ip') ??
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  if (session) {
    // Atomically increment tokenVersion — invalidates ALL active sessions for this admin
    await db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(eq(users.id, session.userId));

    void writeAuditLog({ adminId: session.userId, action: 'logout', ip });
  }

  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE, path: '/' });
  redirect('/admin/login');
}

// ─── Session Info ─────────────────────────────────────────────────────────────

/**
 * Get current admin user info (for Server Components).
 */
export async function getAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user || user.role !== 'admin') return null;
  return user;
}


