import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'
import { DashboardView } from '@/admin/views/Dashboard'

/** Admin Dashboard — /admin */
export default async function AdminDashboardPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return <DashboardView />
}
