'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  Search, Eye, LayoutList, LayoutGrid, Package,
  Truck, Receipt, RefreshCw, Loader2, AlertTriangle, Store, ShoppingBag,
  ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Banknote
} from 'lucide-react'
import { Dropdown } from '../../components/ui/Dropdown'
import { OrderDetailModal } from '../../components/OrderDetailModal'
import { getStatusBadge } from '../../utils/getStatusBadge'
import { adminApi, ApiError } from '../../lib/adminApiClient'
import type { AdminOrder, OrdersQueryParams, ApiListMeta } from '../../types/admin-api'
import { SortableKanbanItem } from './components/SortableKanbanItem'
import { useUxSound } from '../../../hooks/useUxSound'

// ── Source badge ──────────────────────────────────────────────────────────────

const SourceBadge = ({ source }: { source: string }) => {
  if (source === 'allegro') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#FF5A00]/10 text-[#FF5A00]">
        <ShoppingBag size={10} /> Allegro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#0066CC]/10 text-[#0066CC]">
      <Store size={10} /> Sklep
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const TZ = 'Europe/Warsaw'
  const toDay = (dt: Date) => dt.toLocaleDateString('pl-PL', { timeZone: TZ })
  const isToday = toDay(d) === toDay(today)
  if (isToday) return d.toLocaleTimeString('pl-PL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pl-PL', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getCustomerName(order: AdminOrder): string {
  return order.customerData?.name || '—'
}

function getCustomerEmail(order: AdminOrder): string {
  return order.customerData?.email || '—'
}

function getItemsSummary(order: AdminOrder): string {
  if (!order.items?.length) return '—'
  if (order.items.length === 1) return order.items[0].productName
  return `${order.items[0].productName} +${order.items.length - 1}`
}

function formatAmount(amount: string | number, currency = 'PLN'): string {
  return `${Number(amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} ${currency}`
}

export const OrdersView = () => {
  const { play } = useUxSound()
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<'' | 'shop' | 'allegro'>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [meta, setMeta] = useState<ApiListMeta>({ total: 0, page: 1, limit: 50, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 400)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params: OrdersQueryParams = {
        page,
        limit: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        source: sourceFilter || undefined,
        search: debouncedSearch || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }
      const result = await adminApi.getOrders(params)
      setOrders(result.data)
      setMeta(result.meta)
    } catch (e) {
      play('error')
      if (e instanceof ApiError && (e.status === 502 || e.status === 503)) {
        setError('API niedostępne.')
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Brak autoryzacji.')
      } else {
        setError(e instanceof Error ? e.message : 'Błąd ładowania')
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sourceFilter, debouncedSearch, dateFrom, dateTo])

  useEffect(() => { fetchOrders(1) }, [fetchOrders])

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus)
      play('order-status-changed')
      await fetchOrders(meta.page)
    } catch {
      play('error')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = active.id as number
    const overId = over.id
    const kanbanStatuses = ['pending', 'paid', 'processing', 'shipped']
    if (kanbanStatuses.includes(overId as string)) {
      const order = orders.find(o => o.id === activeId)
      if (order && order.status !== overId) {
        play('kanban-drop')
        handleStatusChange(activeId, overId as string)
      }
    }
  }

  const filteredOrders = orders

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    revenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
  }

  const statusTabs = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'pending', label: 'Oczekujące' },
    { value: 'paid', label: 'Opłacone' },
    { value: 'processing', label: 'W realizacji' },
    { value: 'shipped', label: 'Wysłane' },
    { value: 'delivered', label: 'Dostarczone' },
    { value: 'cancelled', label: 'Anulowane' },
  ]

  const sourceOptions = [
    { value: '', label: 'Wszystkie źródła' },
    { value: 'shop', label: 'Sklep' },
    { value: 'allegro', label: 'Allegro' },
  ]

  return (
    <div className="animate-in fade-in duration-300 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h2 text-[#1A1A1A]">Zamówienia</h2>
          <p className="text-sm text-[#737373] mt-0.5">{meta.total > 0 ? `${meta.total} zamówień łącznie` : 'Zarządzaj zamówieniami'}</p>
        </div>
        <button
          onClick={() => fetchOrders(meta.page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors text-sm font-medium text-[#525252]"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Odśwież
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Opłacone', value: stats.paid, icon: CheckCircle2, color: 'text-[#059669]', bg: 'bg-[#ECFDF5]' },
          { label: 'W realizacji', value: stats.processing, icon: Clock, color: 'text-[#0066CC]', bg: 'bg-[#EFF6FF]' },
          { label: 'Wysłane', value: stats.shipped, icon: Truck, color: 'text-[#7C3AED]', bg: 'bg-[#F5F3FF]' },
          { label: 'Przychód (strona)', value: stats.revenue.toLocaleString('pl-PL', { minimumFractionDigits: 0 }) + ' zł', icon: Banknote, color: 'text-[#1A1A1A]', bg: 'bg-[#F5F4F1]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#E5E4E1] rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">{label}</p>
              <p className="text-lg font-bold text-[#1A1A1A] leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-[#FFF7ED] border-[#F97316]/20 text-[#9A3412]">
          <AlertTriangle size={16} className="shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => fetchOrders(1)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F97316]/10 hover:bg-[#F97316]/20 transition-colors shrink-0">
            Ponów
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E5E4E1] rounded-2xl overflow-hidden">

        {/* Status tabs */}
        <div className="px-4 pt-4 border-b border-[#E5E4E1] overflow-x-auto">
          <div className="flex gap-1 pb-0 min-w-max">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px ${
                  statusFilter === tab.value
                    ? 'text-[#0066CC] border-[#0066CC] bg-[#EFF6FF]/50'
                    : 'text-[#737373] border-transparent hover:text-[#1A1A1A] hover:bg-[#F5F4F1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-[#E5E4E1] flex flex-col sm:flex-row sm:items-center gap-3 bg-[#FAFAF9]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              type="text"
              placeholder="Szukaj po nr zamówienia lub kliencie..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-[#E5E4E1] focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]/30 outline-none text-sm text-[#1A1A1A] placeholder:text-[#A3A3A3] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white border border-[#E5E4E1] text-sm text-[#525252] focus:ring-2 focus:ring-[#0066CC]/20 outline-none" title="Od" />
            <span className="text-[#A3A3A3] text-sm">–</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white border border-[#E5E4E1] text-sm text-[#525252] focus:ring-2 focus:ring-[#0066CC]/20 outline-none" title="Do" />
            <Dropdown options={sourceOptions} value={sourceFilter} onChange={(v) => setSourceFilter(v as '' | 'shop' | 'allegro')} label="Źródło" />
            <div className="flex bg-white p-1 rounded-lg border border-[#E5E4E1]">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#F5F4F1] shadow-sm text-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#525252]'}`} title="Lista"><LayoutList size={15} /></button>
              <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-[#F5F4F1] shadow-sm text-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#525252]'}`} title="Kanban"><LayoutGrid size={15} /></button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && orders.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-[#A3A3A3] animate-spin" />
          </div>
        )}

        {/* List view */}
        {!loading && viewMode === 'list' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E5E4E1] text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                    <th className="px-4 py-3 pl-5">Zamówienie</th>
                    <th className="px-4 py-3">Klient</th>
                    <th className="px-4 py-3">Produkty</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right pr-5">Kwota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFED]">
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => { play('modal-open'); setSelectedOrder(order) }}
                      className="hover:bg-[#FAFAF9] transition-colors cursor-pointer group"
                    >
                      {/* Nr + źródło */}
                      <td className="px-4 py-3.5 pl-5">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-semibold text-[#0066CC] text-xs group-hover:underline">
                            {order.orderNumber}
                          </span>
                          <SourceBadge source={order.source} />
                        </div>
                      </td>
                      {/* Klient */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#1A1A1A] text-sm leading-tight">{getCustomerName(order)}</div>
                        <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[160px]">{getCustomerEmail(order)}</div>
                      </td>
                      {/* Produkty */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <span className="text-[#525252] text-sm truncate block">{getItemsSummary(order)}</span>
                        {order.items?.length > 1 && (
                          <span className="text-xs text-[#A3A3A3]">{order.items.length} pozycje</span>
                        )}
                      </td>
                      {/* Data */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-sm text-[#525252]">{formatDateShort(order.paidAt ?? order.createdAt)}</div>
                        {order.paidAt && (
                          <div className="text-xs text-[#059669] mt-0.5">opłacone</div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">{getStatusBadge(order.status)}</td>
                      {/* Kwota */}
                      <td className="px-4 py-3.5 text-right pr-5">
                        <div className="font-semibold text-[#1A1A1A] font-mono text-sm">
                          {formatAmount(order.total)}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-[#A3A3A3]">
                          <Package size={36} strokeWidth={1.5} />
                          <div>
                            <p className="font-medium text-[#525252]">Brak zamówień</p>
                            <p className="text-sm mt-0.5">Nie znaleziono zamówień dla podanych kryteriów</p>
                          </div>
                          {(statusFilter !== 'all' || sourceFilter || searchQuery || dateFrom || dateTo) && (
                            <button
                              onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setStatusFilter('all'); setSourceFilter(''); setDateFrom(''); setDateTo('') }}
                              className="text-[#0066CC] hover:underline text-sm font-medium"
                            >
                              Wyczyść filtry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-[#E5E4E1] flex items-center justify-between bg-[#FAFAF9]">
              <p className="text-xs text-[#A3A3A3]">
                <span className="font-medium text-[#525252]">{filteredOrders.length}</span> z <span className="font-medium text-[#525252]">{meta.total}</span> zamówień
              </p>
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => fetchOrders(meta.page - 1)} disabled={meta.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E4E1] text-xs font-medium disabled:opacity-40 text-[#525252] hover:bg-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={13} /> Poprzednia
                  </button>
                  <span className="px-3 text-xs text-[#737373]">{meta.page} / {meta.totalPages}</span>
                  <button onClick={() => fetchOrders(meta.page + 1)} disabled={meta.page >= meta.totalPages}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E4E1] text-xs font-medium disabled:opacity-40 text-[#525252] hover:bg-white transition-colors flex items-center gap-1">
                    Następna <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Kanban view */}
        {!loading && viewMode === 'kanban' && (
          <div className="p-5 bg-[#FAF9F7] overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 min-w-max">
                {['pending', 'paid', 'processing', 'shipped'].map(kanbanStatus => {
                  const columnOrders = filteredOrders.filter(o => o.status === kanbanStatus)
                  const statusLabels: Record<string, string> = {
                    pending: 'Oczekujące', paid: 'Opłacone', processing: 'W realizacji', shipped: 'Wysłane'
                  }
                  const statusColors: Record<string, string> = {
                    pending: 'text-[#D97706] bg-[#FEF3C7]',
                    paid: 'text-[#059669] bg-[#ECFDF5]',
                    processing: 'text-[#0066CC] bg-[#EFF6FF]',
                    shipped: 'text-[#7C3AED] bg-[#F5F3FF]',
                  }
                  return (
                    <div key={kanbanStatus} className="w-72 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-[#1A1A1A] text-sm">{statusLabels[kanbanStatus]}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[kanbanStatus]}`}>{columnOrders.length}</span>
                      </div>
                      <SortableContext id={kanbanStatus} items={columnOrders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                        <div className="flex-1 min-h-[200px] bg-white rounded-xl p-2.5 border border-[#E5E4E1] space-y-2">
                          {columnOrders.map(order => (
                            <SortableKanbanItem key={order.id} order={order} onClick={() => { play('modal-open'); setSelectedOrder(order) }} />
                          ))}
                          {columnOrders.length === 0 && (
                            <div className="flex items-center justify-center border-2 border-dashed border-[#E5E4E1] rounded-lg py-10 text-xs text-[#A3A3A3]">
                              Przeciągnij tutaj
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </div>
                  )
                })}
              </div>
            </DndContext>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      <OrderDetailModal order={selectedOrder} isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  )
}
