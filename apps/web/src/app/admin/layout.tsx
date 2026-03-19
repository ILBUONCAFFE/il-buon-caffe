import { AdminShell } from './AdminShell';
import { getAdminSession } from '@/lib/auth/jwt';

export const metadata = {
  title: 'Admin | Il Buon Caffe',
  robots: { index: false, follow: false },
};

/**
 * Admin root layout.
 *
 * Auth protection is handled by:
 * 1. proxy.ts (edge) — primary guard, redirects unauthenticated to /admin/login
 * 2. Individual pages/actions call getAdminSession() for defense-in-depth
 *
 * getAdminSession() is called here to ensure the sliding-session refresh runs
 * on every admin page load — even on pages that don’t explicitly fetch the
 * current user.  If the token has < 1h remaining it is silently re-issued;
 * if it was signed with ADMIN_JWT_SECRET_OLD it is transparently rotated.
 *
 * AdminShell (client component) conditionally renders the full sidebar+header
 * for authenticated routes, and a plain wrapper for /admin/login.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Triggers sliding-session refresh + secret rotation on every request.
  // Result is intentionally unused here — page components fetch it as needed.
  await getAdminSession().catch(() => null);

  return <AdminShell>{children}</AdminShell>;
}
