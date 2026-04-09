import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'
import { ProductsView } from '@/admin/views/Products'

/** Admin: Produkty — /admin/products */
export default async function AdminProductsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return <ProductsView />
}
