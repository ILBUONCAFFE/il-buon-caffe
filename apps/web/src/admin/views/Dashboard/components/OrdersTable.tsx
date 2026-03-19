'use client'

import { useState } from 'react'
import { ShoppingCart, Package, Store, ShoppingBag } from 'lucide-react'
import { Dropdown } from '../../../components/ui/Dropdown'
import { OrderDetailModal } from '../../../components/OrderDetailModal'
import { getStatusBadge } from '../../../utils/getStatusBadge'
import { useOrders } from '../../../hooks/useDashboard'
import type { AdminOrder } from '../../../types/admin-api'

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff} s`
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} godz.`
  return `${Math.floor(diff / 86400)} dni`
}

const SourceBadge = ({ source }: { source: AdminOrder['source'] }) =>
  source === 'allegro' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] text-xs font-medium border border-[#FED7AA]">
      <ShoppingBag size={10} />Allegro
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0066CC] text-xs font-medium border border-[#BFDBFE]">
      <Store size={10} />Sklep
    </span>
  )

export const OrdersTable = () => {
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)

  const { orders, loading, error } = useOrders({ limit: 8, status: statusFilter })

  const statusOptions = [
    { value: 'all',        label: 'Wszystkie' },
    { value: 'pending',    label: 'Oczekujące' },
    { value: 'processing', label: 'W realizacji' },
    { value: 'shipped',    label: 'Wysłane' },
    { value: 'completed',  label: 'Zakończone' },
    { value: 'cancelled',  label: 'Anulowane' },
  ]

  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-h3 text-[#1A1A1A]">Ostatnie zamówienia</h3>
        <div className="flex items-center gap-4">
          <Dropdown options={statusOptions} value={statusFilter} onChange={setStatusFilter} label="Status" />
          <button className="btn-ghost">Zobacz wszystkie →</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E4E1]">
              <th className="text-left text-label pb-4 pr-4">Klient</th>
              <th className="text-left text-label pb-4 pr-4">Produkty</th>
              <th className="text-right text-label pb-4 pr-4">Kwota</th>
              <th className="text-center text-label pb-4 pr-4">Status</th>
              <th className="text-right text-label pb-4">Czas</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={5} className="py-8 text-center text-[#DC2626] text-sm">{error}</td></tr>
            ) : loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-[#E5E4E1]/50 animate-pulse">
                  <td className="py-4 pr-4"><div className="h-4 bg-[#E5E4E1] rounded w-32" /></td>
                  <td className="py-4 pr-4"><div className="h-4 bg-[#E5E4E1] rounded w-24" /></td>
                  <td className="py-4 pr-4"><div className="h-4 bg-[#E5E4E1] rounded w-16 ml-auto" /></td>
                  <td className="py-4 pr-4"><div className="h-5 bg-[#E5E4E1] rounded-full w-20 mx-auto" /></td>
                  <td className="py-4"><div className="h-4 bg-[#E5E4E1] rounded w-12 ml-auto" /></td>
                </tr>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const firstItem = order.items?.[0]
                const itemLabel = firstItem
                  ? order.items.length > 1
                    ? `${firstItem.productName} +${order.items.length - 1}`
                    : firstItem.productName
                  : '—'
                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="border-b border-[#E5E4E1]/50 cursor-pointer transition-colors hover:bg-[#F5F4F1]"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F5F4F1] flex items-center justify-center">
                          <ShoppingCart size={14} className="text-[#525252]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{order.customerData.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-[#737373] font-mono">{order.orderNumber}</p>
                            <SourceBadge source={order.source} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-[#525252] text-sm">{itemLabel}</span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className="font-mono font-semibold text-[#1A1A1A]">{Number(order.total).toLocaleString()} PLN</span>
                    </td>
                    <td className="py-4 pr-4 text-center">{getStatusBadge(order.status)}</td>
                    <td className="py-4 text-right">
                      <span className="text-sm text-[#737373]">{relativeTime(order.paidAt ?? order.createdAt)}</span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#737373]">Brak zamówień dla wybranego statusu</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

