import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'

/** Legacy route: redirect to the unified premium content tab. */
export default async function AdminWineEditorPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { sku } = await params

  redirect(`/admin/products/${encodeURIComponent(sku)}?tab=tresc`)
}
