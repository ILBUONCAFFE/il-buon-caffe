import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Logowanie | Admin — Il Buon Caffe',
  robots: { index: false, follow: false },
};

/**
 * Layout for /admin/login — NO auth guard, NO sidebar.
 * This is separate from the main admin layout to avoid
 * redirect loops.
 */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
