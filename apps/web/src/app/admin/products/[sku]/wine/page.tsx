import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'

/** Admin: Edytor wine_details (wizualny CMS) — /admin/products/[sku]/wine */
export default async function AdminWineEditorPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { sku } = await params

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-[#1A1A1A]">Edytor wine_details</h1>
      <p className="text-sm text-[#737373]">
        Ten widok jest zarezerwowany pod dedykowany edytor atrybutow win (JSONB). Obecnie dane produktu
        edytujesz w formularzu produktu.
      </p>
      <Link href={`/admin/products/${encodeURIComponent(sku)}`} className="btn-secondary text-sm inline-flex">
        Wroc do produktu
      </Link>
    </div>
  )
}
