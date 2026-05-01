import { OrderDetailView } from '@/admin/views/OrderDetail'

/** Admin: Szczegóły zamówienia — /admin/orders/[id] */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OrderDetailView id={id} />
}
