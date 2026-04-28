import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/jwt'
import { getProductBySku } from '@/lib/productFetchers'
import { getWineDetailsForProduct } from '@/content/products/wineData'
import { WineDetailsEditor } from '@/admin/views/Products/WineDetailsEditor'

/** Admin: Edytor wine_details (wizualny CMS) — /admin/products/[sku]/wine */
export default async function AdminWineEditorPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { sku } = await params
  const product = await getProductBySku(decodeURIComponent(sku))
  if (!product) notFound()

  const categorySlug = typeof product.category === 'string' ? product.category : ''
  if (categorySlug !== 'wino' && categorySlug !== 'alcohol') {
    redirect(`/admin/products/${encodeURIComponent(product.sku)}`)
  }

  const initialWineDetails = getWineDetailsForProduct(product)

  return <WineDetailsEditor sku={decodeURIComponent(sku)} product={product} initialWineDetails={initialWineDetails} />
}
