import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/jwt';
import { AdminLoginForm } from '@/components/Admin/AdminLoginForm';

export const metadata: Metadata = {
  title: 'Logowanie | Admin — Il Buon Caffe',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Already logged in? Redirect to dashboard
  const session = await getAdminSession();
  if (session) {
    redirect('/admin');
  }

  return (
    <main className="min-h-dvh bg-brand-950 grid place-items-center px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}
