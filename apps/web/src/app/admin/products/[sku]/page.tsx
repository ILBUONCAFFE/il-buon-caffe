import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'
import { ProductEditorView } from '@/admin/views/Products/ProductEditorView'

/** Admin: Edycja produktu — /admin/products/[sku] */
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { sku } = await params
  return <ProductEditorView sku={decodeURIComponent(sku)} />
}
