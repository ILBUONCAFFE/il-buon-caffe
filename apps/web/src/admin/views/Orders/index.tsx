'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi, type AdminOrder, type OrdersQueryParams } from '../../lib/adminApiClient'

import { OrderContextMenu } from '../../components/OrderContextMenu'
import { OrderDetailModal } from '../../components/OrderDetailModal'
import { ShipmentModal } from '../../components/ShipmentModal'
import { ShipmentLabelPickerModal } from '../../components/ShipmentLabelPickerModal'
import { BulkActionBar } from '../../components/BulkActionBar'
import { Dropdown } from '../../components/ui/Dropdown'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { resolveShipmentStatus } from '../../lib/shipmentStatus'
import { MoreVertical, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'

const DATE_FORMATTER = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '-'
  return DATE_FORMATTER.format(new Date(iso))
}

function formatAmount(value: number | undefined | null, currency = 'PLN'): string {
  if (value == null) return '-'
  const symbol: Record<string, string> = { PLN: 'zł', EUR: 'EUR', CZK: 'CZK', HUF: 'HUF' }
  return `${Number(value).toFixed(2)} ${symbol[currency] ?? currency}`
}

function getShipmentBadgeClass(step: number, isIssue: boolean, isCancelled: boolean): string {
  if (isCancelled) return 'bg-red-50 text-red-700 border-red-200'
  if (isIssue) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (step >= 3) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (step === 2) return 'bg-sky-50 text-sky-700 border-sky-200'
  if (step === 1) return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  return 'bg-[#F5F4F1] text-[#666] border-[#E5E4E1]'
}

const STATUS_TABS = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'fulfillment', label: 'Do realizacji' },
  { key: 'awaiting_payment', label: 'Oczekuje wpłaty' },
  { key: 'pending', label: 'Oczekujące' },
  { key: 'paid', label: 'Opłacone' },
  { key: 'processing', label: 'W realizacji' },
  { key: 'shipped', label: 'Wysłane' },
  { key: 'delivered', label: 'Dostarczone' },
  { key: 'cancelled', label: 'Anulowane' },
]

const LIMIT = 50
const ALLEGRO_QUEUE_REFRESH_MS = 3 * 60 * 1000

// Mobile card for a single order
function OrderCard({
  order,
  selected,
  onSelect,
  onClick,
  onContextMenu,
}: {
  order: AdminOrder
  selected: boolean
  onSelect: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const firstItem = order.items?.[0]
  const extraCount = (order.items?.length ?? 0) - 1
  const shipment = resolveShipmentStatus({
    status: order.status,
    shipmentDisplayStatus: order.shipmentDisplayStatus,
    allegroFulfillmentStatus: order.allegroFulfillmentStatus,
  })
  const shipmentBadgeClass = getShipmentBadgeClass(shipment.step, shipment.isIssue, shipment.isCancelled)
  const showStaleHint = ['shipped', 'delivered'].includes(order.status) && order.shipmentFreshness === 'stale'

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.99] ${
        selected ? 'border-[#0066CC] ring-1 ring-[#0066CC]/20' : 'border-[#E5E4E1]'
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Top row: checkbox + order number + badges + amount */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onSelect() }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={onSelect}
                className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A] w-4 h-4"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#1A1A1A] text-sm">{order.orderNumber}</span>
                {order.source === 'allegro' && (
                  <span className="text-[10px] font-bold bg-[#FF5A00]/10 text-[#FF5A00] px-1.5 py-0.5 rounded-full leading-none">A</span>
                )}
                {order.invoiceRequired && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full leading-none">FV</span>
                )}
              </div>
              <div className="text-xs text-[#A3A3A3] mt-0.5">{formatDateShort(order.paidAt ?? order.createdAt)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="text-right">
              <span className="font-semibold text-[#1A1A1A] text-sm">{formatAmount(order.total, order.currency)}</span>
            </div>
            <button
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#E5E4E1] transition-colors"
              onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F0EFEC] my-3" />

        {/* Customer */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[#1A1A1A] truncate">{order.customerData?.name ?? '-'}</div>
            <div className="text-xs text-[#A3A3A3] truncate">{order.customerData?.email ?? ''}</div>
          </div>

          {/* Shipment badge */}
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${shipmentBadgeClass}`}>
              {shipment.label}
            </span>
            {showStaleHint && (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                nieaktualne
              </span>
            )}
          </div>
        </div>

        {/* Product */}
        {firstItem && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-[#525252] truncate">{firstItem.productName}</span>
            {extraCount > 0 && (
              <span className="text-[11px] font-medium text-[#A3A3A3] bg-[#F5F4F1] px-2 py-0.5 rounded-full flex-shrink-0">
                +{extraCount} więcej
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const OrdersView = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [contextMenu, setContextMenu] = useState<{ order: AdminOrder; x: number; y: number } | null>(null)
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null)
  const [shipmentOrder, setShipmentOrder] = useState<AdminOrder | null>(null)
  const [labelPickerOrder, setLabelPickerOrder] = useState<AdminOrder | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: OrdersQueryParams = { page, limit: LIMIT }
      if (statusFilter === 'fulfillment' || statusFilter === 'awaiting_payment') {
        params.queue = statusFilter
      } else if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (sourceFilter) params.source = sourceFilter as 'shop' | 'allegro'
      if (search) params.search = search
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo

      const res = await adminApi.getOrders(params)
      setOrders(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania zamówień')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, sourceFilter, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    const shouldAutoRefresh = statusFilter === 'fulfillment' || statusFilter === 'awaiting_payment'
    if (!shouldAutoRefresh) return

    const timer = setInterval(() => {
      void fetchOrders()
    }, ALLEGRO_QUEUE_REFRESH_MS)

    return () => clearInterval(timer)
  }, [fetchOrders, statusFilter])

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)

    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key)
    setPage(1)
    setSelectedIds(new Set())
  }

  const handleStatusChange = async (order: AdminOrder, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(order.id, newStatus)
      await fetchOrders()
    } catch {
      // Keep current UX minimal
    }
  }

  const handleContextMenu = (e: React.MouseEvent, order: AdminOrder) => {
    e.preventDefault()
    setContextMenu({ order, x: e.clientX, y: e.clientY })
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(orders.map((order) => order.id)))
  }

  const handleDownloadLabel = async (order: AdminOrder) => {
    if (order.allShipments && order.allShipments.length > 1) {
      setLabelPickerOrder(order)
      return
    }
    try {
      const blob = await adminApi.getShipmentLabel(order.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch {
      // Keep current UX minimal
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    const selected = orders.filter((order) => selectedIds.has(order.id))
    await Promise.allSettled(selected.map((order) => adminApi.updateOrderStatus(order.id, status)))
    setSelectedIds(new Set())
    await fetchOrders()
  }

  const handleBulkDownloadLabels = async () => {
    const selected = orders.filter((order) => selectedIds.has(order.id) && order.allegroShipmentId)
    for (const order of selected) {
      await handleDownloadLabel(order)
    }
  }

  const selectedOrders = orders.filter((order) => selectedIds.has(order.id))
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">Zamówienia</h1>
          <span className="text-sm text-[#A3A3A3] tabular-nums">{total}</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#F0EFEC] overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
              statusFilter === key
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-medium'
                : 'border-transparent text-[#A3A3A3] hover:text-[#666]'
            }`}
            onClick={() => handleStatusFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Szukaj: nr, email, NIP, telefon..."
          className="admin-input flex-1 min-w-0 sm:min-w-[260px]"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <Dropdown
            label="Źródło"
            value={sourceFilter}
            onChange={(v) => {
              setSourceFilter(v)
              setPage(1)
            }}
            options={[
              { value: '', label: 'Wszystkie' },
              { value: 'shop', label: 'Sklep' },
              { value: 'allegro', label: 'Allegro' },
            ]}
          />

          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(newFrom, newTo) => {
              setDateFrom(newFrom)
              setDateTo(newTo)
              setPage(1)
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <button className="btn-primary text-sm" onClick={fetchOrders}>Ponów</button>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
                  <th className="w-[48px] px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedIds.size === orders.length}
                      onChange={handleSelectAll}
                      className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A]"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Zamówienie</th>
                  <th className="text-left px-4 py-3 font-medium">Klient</th>
                  <th className="text-left px-4 py-3 font-medium">Produkty</th>
                  <th className="text-left px-4 py-3 font-medium">Przesyłka</th>
                  <th className="text-right px-4 py-3 font-medium">Kwota</th>
                  <th className="w-[48px] px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F0EFEC] last:border-0">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr className="border-b border-[#F0EFEC] last:border-0">
                    <td colSpan={7} className="text-center py-12 text-[#A3A3A3]">
                      Brak zamówień
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const firstItem = order.items?.[0]
                    const extraCount = (order.items?.length ?? 0) - 1
                    const shipment = resolveShipmentStatus({
                      status: order.status,
                      shipmentDisplayStatus: order.shipmentDisplayStatus,
                      allegroFulfillmentStatus: order.allegroFulfillmentStatus,
                    })
                    const shipmentBadgeClass = getShipmentBadgeClass(
                      shipment.step,
                      shipment.isIssue,
                      shipment.isCancelled,
                    )
                    const showStaleHint =
                      ['shipped', 'delivered'].includes(order.status) &&
                      order.shipmentFreshness === 'stale'

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[#F0EFEC] last:border-0 py-3 hover:bg-[#FAFAF9] cursor-pointer group"
                        onClick={() => setDetailOrder(order)}
                        onContextMenu={(e) => handleContextMenu(e, order)}
                      >
                        <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => handleToggleSelect(order.id)}
                            className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A] opacity-0 group-hover:opacity-100 aria-checked:opacity-100 checked:opacity-100"
                          />
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#1A1A1A]">{order.orderNumber}</span>
                            {order.source === 'allegro' && (
                              <span className="text-[10px] font-bold bg-[#FF5A00]/10 text-[#FF5A00] px-1.5 py-0.5 rounded-full leading-none">A</span>
                            )}
                            {order.invoiceRequired && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full leading-none">FV</span>
                            )}
                          </div>
                          <div className="text-xs text-[#A3A3A3] mt-1">{formatDateShort(order.paidAt ?? order.createdAt)}</div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="text-[#1A1A1A] font-medium">{order.customerData?.name ?? '-'}</div>
                          <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[200px]">{order.customerData?.email ?? ''}</div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <span className="text-[#1A1A1A] truncate block max-w-[250px]">{firstItem?.productName ?? '-'}</span>
                          {extraCount > 0 && <span className="text-[11px] font-medium text-[#A3A3A3] mt-0.5 inline-block bg-[#F5F4F1] px-2 py-0.5 rounded-full">+{extraCount} więcej</span>}
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${shipmentBadgeClass}`}>
                              {shipment.label}
                            </span>
                            {showStaleHint && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                nieaktualne
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle">
                          <span className="font-semibold text-[#1A1A1A]">{formatAmount(order.total, order.currency)}</span>
                        </td>

                        <td className="px-4 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#E5E4E1] opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setContextMenu({ order, x: rect.left, y: rect.bottom + 4 })
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E4E1] p-4">
                  <div className="space-y-3 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-4 bg-[#F5F4F1] rounded w-32" />
                      <div className="h-4 bg-[#F5F4F1] rounded w-20" />
                    </div>
                    <div className="h-3 bg-[#F5F4F1] rounded w-full" />
                    <div className="h-3 bg-[#F5F4F1] rounded w-3/4" />
                  </div>
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E4E1] py-16 text-center text-[#A3A3A3]">
                Brak zamówień
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  selected={selectedIds.has(order.id)}
                  onSelect={() => handleToggleSelect(order.id)}
                  onClick={() => setDetailOrder(order)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setContextMenu({ order, x: rect.left, y: rect.bottom + 4 })
                  }}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-[#A3A3A3]">Strona {page} z {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((prev) => prev - 1)}
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Poprzednia</span>
            </button>
            <button
              disabled={page >= totalPages}
              className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((prev) => prev + 1)}
            >
              <span className="hidden sm:inline">Następna</span>
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <OrderContextMenu
          order={contextMenu.order}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onOpenDetails={(order) => setDetailOrder(order)}
          onChangeStatus={handleStatusChange}
          onCreateShipment={(order) => setShipmentOrder(order)}
          onDownloadLabel={handleDownloadLabel}
        />
      )}

      <OrderDetailModal
        order={detailOrder}
        isOpen={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onCreateShipment={(order) => {
          setDetailOrder(null)
          setShipmentOrder(order)
        }}
        onDownloadLabel={handleDownloadLabel}
      />

      {shipmentOrder && (
        <ShipmentModal
          order={shipmentOrder}
          isOpen={!!shipmentOrder}
          onClose={() => setShipmentOrder(null)}
          onSuccess={() => {
            setShipmentOrder(null)
            fetchOrders()
          }}
        />
      )}

      {labelPickerOrder && (
        <ShipmentLabelPickerModal
          order={labelPickerOrder}
          isOpen={!!labelPickerOrder}
          onClose={() => setLabelPickerOrder(null)}
        />
      )}

      <BulkActionBar
        selectedOrders={selectedOrders}
        onChangeStatus={handleBulkStatusChange}
        onDownloadLabels={handleBulkDownloadLabels}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </div>
  )
}
