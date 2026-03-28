'use client'

import { useState } from 'react'
import { Store, ShoppingBag } from 'lucide-react'
import { Dropdown } from '../../../components/ui/Dropdown'
import { OrderDetailModal } from '../../../components/OrderDetailModal'
import { getStatusBadge } from '../../../utils/getStatusBadge'
import { useOrders } from '../../../hooks/useDashboard'
import type { AdminOrder } from '../../../types/admin-api'

function formatAmount(amount: string | number, currency = 'PLN'): string {
  return `${Number(amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} ${currency}`
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const SourceTag = ({ source }: { source: AdminOrder['source'] }) =>
  source === 'allegro' ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#EA580C] font-medium">
      <ShoppingBag size={10} />A
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#0066CC] font-medium">
      <Store size={10} />S
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
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Ostatnie zamówienia</h2>
        <div className="flex items-center gap-3">
          <Dropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            label="Status"
          />
          <a
            href="/admin/orders"
            className="text-sm text-[#737373] hover:text-[#0066CC] transition-colors"
          >
            Wszystkie →
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E5E4E1]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAFAF9]">
              <th className="text-left font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                Zamówienie
              </th>
              <th className="text-left font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                Produkty
              </th>
              <th className="text-right font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                Kwota
              </th>
              <th className="text-center font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                Status
              </th>
              <th className="text-right font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4 w-16">
                Czas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F4F1]">
            {error ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#DC2626] text-sm">
                  {error}
                </td>
              </tr>
            ) : loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4">
                    <div className="h-4 bg-[#E5E4E1] rounded w-32" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 bg-[#E5E4E1] rounded w-24" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 bg-[#E5E4E1] rounded w-16 ml-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-5 bg-[#E5E4E1] rounded-full w-20 mx-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 bg-[#E5E4E1] rounded w-8 ml-auto" />
                  </td>
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
                    className="cursor-pointer hover:bg-[#FAFAF9] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium text-[#1A1A1A]">
                          {order.customerData.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-[#A3A3A3] font-mono">
                            {order.orderNumber}
                          </span>
                          <SourceTag source={order.source} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#525252]">{itemLabel}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-semibold text-[#1A1A1A]">
                        {formatAmount(order.total, order.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-[#A3A3A3]">
                      {relativeTime(order.paidAt ?? order.createdAt)}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#737373]">
                  Brak zamówień
                </td>
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
    </section>
  )
}
