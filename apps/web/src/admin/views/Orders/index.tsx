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
  Search, LayoutList, LayoutGrid, Package,
  Truck, RefreshCw, Loader2, AlertTriangle, Store, ShoppingBag,
  ChevronLeft, ChevronRight, Clock,
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
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#EA580C]">
        <ShoppingBag size={10} /> Allegro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0066CC]">
      <Store size={10} /> Sklep
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    revenue: orders
      .filter(o => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status))
      .reduce((s, o) => s + Number(o.totalPln ?? (o.currency === 'PLN' ? o.total : 0)), 0),
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

  // ── Build subtitle parts ──────────────────────────────────────────────────

  const subtitleParts: string[] = []
  if (meta.total > 0) subtitleParts.push(`${meta.total} zamówień`)
  if (stats.pending > 0) subtitleParts.push(`${stats.pending} oczekujące`)
  if (stats.processing > 0) subtitleParts.push(`${stats.processing} w realizacji`)
  if (stats.revenue > 0) subtitleParts.push(`${stats.revenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł przychodu na tej stronie`)

  return (
    <div className="animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-[1.75rem] font-semibold tracking-tight text-[#1A1A1A]">
            Zamówienia
          </h2>
          <p className="text-sm text-[#737373] mt-1">
            {loading && orders.length === 0
              ? 'Ładowanie…'
              : subtitleParts.length > 0
                ? subtitleParts.map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mx-1.5 text-[#D4D3D0]">·</span>}
                      <span className="tabular-nums">{part.replace(/^\d[\d\s]*/, (m) => m)}</span>
                    </span>
                  ))
                : 'Brak zamówień'
            }
          </p>
        </div>
        <button
          onClick={() => fetchOrders(meta.page)}
          disabled={loading}
          className="btn-ghost"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Odśwież
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-[#FFF7ED] border-[#F97316]/20 text-[#9A3412] mb-8">
          <AlertTriangle size={16} className="shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => fetchOrders(1)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F97316]/10 hover:bg-[#F97316]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 shrink-0">
            Ponów
          </button>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 pb-6 mb-6 border-b border-[#E5E4E1]">
        {/* Status tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 overflow-x-auto">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'text-[#1A1A1A] bg-[#F5F4F1]'
                    : 'text-[#A3A3A3] hover:text-[#737373]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex p-0.5 rounded-lg border border-[#E5E4E1] shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all duration-300 hover:scale-105 active:scale-95 ${
                viewMode === 'list' ? 'bg-[#F5F4F1] text-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#525252]'
              }`}
              title="Lista"
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all duration-300 hover:scale-105 active:scale-95 ${
                viewMode === 'kanban' ? 'bg-[#F5F4F1] text-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#525252]'
              }`}
              title="Kanban"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Search + date + source */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              type="text"
              placeholder="Szukaj po nr zamówienia lub kliencie…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="admin-input w-full pl-9"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="admin-input w-36"
            title="Od"
          />
          <span className="text-[#D4D3D0] text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="admin-input w-36"
            title="Do"
          />
          <Dropdown
            options={sourceOptions}
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as '' | 'shop' | 'allegro')}
            label="Źródło"
          />
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && orders.length === 0 && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="text-[#A3A3A3] animate-spin" />
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────────── */}
      {!loading && viewMode === 'list' && (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#E5E4E1]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9]">
                  <th className="text-left font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4 pl-5">
                    Zamówienie
                  </th>
                  <th className="text-left font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                    Klient
                  </th>
                  <th className="text-left font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                    Produkty
                  </th>
                  <th className="text-left font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                    Data
                  </th>
                  <th className="text-center font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4">
                    Status
                  </th>
                  <th className="text-right font-medium text-[#737373] text-xs uppercase tracking-wider py-3 px-4 pr-5">
                    Kwota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F4F1]">
                {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => { play('modal-open'); setSelectedOrder(order) }}
                    className={`transition-colors cursor-pointer group ${
                      order.status === 'pending'
                        ? 'border-l-2 border-amber-400 bg-amber-50/30 hover:bg-amber-50/50'
                        : 'hover:bg-[#FAFAF9]'
                    }`}
                  >
                    <td className="px-4 py-3.5 pl-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-[#1A1A1A] group-hover:text-[#0066CC] transition-colors">
                          {order.orderNumber}
                        </span>
                        <SourceBadge source={order.source} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[#1A1A1A] text-sm leading-tight">{getCustomerName(order)}</div>
                      <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[160px]">{getCustomerEmail(order)}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <span className="text-[#525252] text-sm truncate block">{getItemsSummary(order)}</span>
                      {order.items?.length > 1 && (
                        <span className="text-xs text-[#A3A3A3]">{order.items.length} pozycje</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm text-[#525252]">{formatDateShort(order.paidAt ?? order.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(order.status, order.paymentMethod, order.paidAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === 'pending' && (
                          <Clock size={12} className="text-amber-500 shrink-0" />
                        )}
                        <span className="font-semibold text-[#1A1A1A] font-mono text-sm tabular-nums">
                          {formatAmount(order.total, order.currency)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-[#A3A3A3]">
                        <Package size={32} strokeWidth={1.5} />
                        <div>
                          <p className="font-medium text-[#525252]">Brak zamówień</p>
                          <p className="text-sm mt-0.5">Nie znaleziono zamówień dla podanych kryteriów</p>
                        </div>
                        {(statusFilter !== 'all' || sourceFilter || searchQuery || dateFrom || dateTo) && (
                          <button
                            onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setStatusFilter('all'); setSourceFilter(''); setDateFrom(''); setDateTo('') }}
                            className="text-[#0066CC] hover:underline text-sm font-medium mt-1"
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
          {meta.totalPages > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[#A3A3A3]">
                <span className="text-[#525252]">{filteredOrders.length}</span> z <span className="text-[#525252]">{meta.total}</span>
              </p>
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchOrders(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 text-[#737373] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center gap-1"
                  >
                    <ChevronLeft size={13} /> Poprzednia
                  </button>
                  <span className="px-3 text-xs text-[#A3A3A3] tabular-nums">{meta.page} / {meta.totalPages}</span>
                  <button
                    onClick={() => fetchOrders(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 text-[#737373] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center gap-1"
                  >
                    Następna <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Kanban view ────────────────────────────────────────────────── */}
      {!loading && viewMode === 'kanban' && (
        <div className="p-5 bg-[#FAF9F7] rounded-xl overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex gap-5 min-w-max">
              {['pending', 'paid', 'processing', 'shipped'].map(kanbanStatus => {
                const columnOrders = filteredOrders.filter(o => o.status === kanbanStatus)
                const statusLabels: Record<string, string> = {
                  pending: 'Oczekujące', paid: 'Opłacone', processing: 'W realizacji', shipped: 'Wysłane'
                }
                return (
                  <div key={kanbanStatus} className="w-72 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium text-[#1A1A1A]">{statusLabels[kanbanStatus]}</h3>
                      <span className="text-xs text-[#A3A3A3] tabular-nums">{columnOrders.length}</span>
                    </div>
                    <SortableContext id={kanbanStatus} items={columnOrders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex-1 min-h-[200px] space-y-2">
                        {columnOrders.map(order => (
                          <SortableKanbanItem key={order.id} order={order} onClick={() => { play('modal-open'); setSelectedOrder(order) }} />
                        ))}
                        {columnOrders.length === 0 && (
                          <div className="flex items-center justify-center border border-dashed border-[#E5E4E1] rounded-xl py-12 text-xs text-[#A3A3A3]">
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

      {/* ── Order detail modal ─────────────────────────────────────────── */}
      <OrderDetailModal order={selectedOrder} isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  )
}
