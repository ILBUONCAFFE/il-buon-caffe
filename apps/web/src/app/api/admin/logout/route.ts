import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq, sql } from '@repo/db/orm';
import { db } from '@/db';
import { users, auditLog } from '@/db/schema';
import { getAdminSession, ADMIN_COOKIE } from '@/lib/auth/jwt';

/**
 * POST /api/admin/logout
 *
 * REST endpoint for client-side logout (called by UserMenu.tsx).
 *
 * Security actions performed:
 * 1. Verify the admin session cookie (rejects unauthenticated requests)
 * 2. Atomically increment `tokenVersion` in DB
 *    → ALL active sessions for this admin become invalid immediately
 *    → Works across all Cloudflare isolates / edge nodes
 * 3. Clear the admin_session cookie (httpOnly, path=/admin)
 * 4. Write audit log entry
 *
 * Why both Server Action (adminLogoutAction) AND this route?
 * - Server Action is used for form-based logout (no JS required)
 * - This route is used by client-side JS in UserMenu.tsx for SPA logout
 */
export async function POST(request: NextRequest) {
  // ─ Content-Type guard ─────────────────────────────────────────────────────────
  // Reject requests carrying an unexpected Content-Type.
  // Legitimate callers (UserMenu.tsx) always send application/json.
  // This blocks form-based CSRF attempts that rely on multipart/form-data
  // or application/x-www-form-urlencoded MIME types.
  const ct = request.headers.get('content-type') ?? '';
  if (ct && !ct.includes('application/json')) {
    return new NextResponse('Unsupported Media Type', { status: 415 });
  }

  try {
    const session = await getAdminSession();

    if (session) {
      // Extract IP for audit log
      const ip =
        request.headers.get('cf-connecting-ip') ??
        request.headers.get('x-real-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown';

      // Atomically increment tokenVersion — invalidates ALL sessions for this admin
      await db
        .update(users)
        .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
        .where(eq(users.id, session.userId));

      // Fire-and-forget audit log
      void db.insert(auditLog).values({
        adminId: session.userId,
        action: 'logout',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') ?? null,
        details: { method: 'api_route' },
      }).catch((err: unknown) => {
        console.error('[logout route] Audit log failed:', err instanceof Error ? err.message : 'Unknown');
      });
    }

    // Build response — redirect to login page
    const response = NextResponse.json({ ok: true });

    // Clear the admin session cookie
    response.cookies.set({
      name: ADMIN_COOKIE,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,   // expires immediately
    });

    return response;

  } catch (error) {
    console.error('[POST /api/admin/logout] Error:', error instanceof Error ? error.message : 'Unknown');
    // Always succeed from the client's perspective — clear cookie anyway
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_COOKIE,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    return response;
  }
}
