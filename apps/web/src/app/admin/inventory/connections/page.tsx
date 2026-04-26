import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'
import { ConnectionsView } from '@/admin/views/Inventory/ConnectionsView'

export const metadata = { title: 'Połączenia Allegro | Admin' }

export default async function ConnectionsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return <ConnectionsView />
}
