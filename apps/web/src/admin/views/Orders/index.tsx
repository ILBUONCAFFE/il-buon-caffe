'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, MoreHorizontal, Search, X, RefreshCw, Loader2,
  Package, ShoppingBag, AlertTriangle, Filter,
} from 'lucide-react'
import { adminApi, type AdminOrder, type OrdersQueryParams } from '../../lib/adminApiClient'
import { OrderContextMenu } from '../../components/OrderContextMenu'
import { OrderDetailModal } from '../../components/OrderDetailModal'
import { ShipmentModal } from '../../components/ShipmentModal'
import { ShipmentLabelPickerModal } from '../../components/ShipmentLabelPickerModal'
import { BulkActionBar } from '../../components/BulkActionBar'
import { Dropdown } from '../../components/ui/Dropdown'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { resolveShipmentStatus } from '../../lib/shipmentStatus'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { AllegroLogoBadge } from '../../components/AllegroLogoBadge'

// ── helpers ────────────────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })

function fmtDate(iso?: string | null) { return iso ? dateFmt.format(new Date(iso)) : '—' }
function fmtTime(iso?: string | null) { return iso ? timeFmt.format(new Date(iso)) : '' }

const SYM: Record<string, string> = { PLN: 'zł', EUR: '€', CZK: 'Kč', HUF: 'Ft' }
function fmtAmount(v?: number | null, c = 'PLN') {
  if (v == null) return '—'
  return `${Number(v).toFixed(2)} ${SYM[c] ?? c}`
}

function shipmentTone(step: number, isIssue: boolean, isCancelled: boolean) {
  if (isCancelled) return 'bg-red-50 text-red-800 border-red-200'
  if (isIssue) return 'bg-amber-50 text-amber-800 border-amber-200'
  if (step >= 3) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (step === 2) return 'bg-sky-50 text-sky-800 border-sky-200'
  if (step === 1) return 'bg-indigo-50 text-indigo-800 border-indigo-200'
  return 'bg-stone-100 text-stone-700 border-stone-200'
}

const STATUS_TABS: Array<{ key: string; label: string }> = [
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
const AUTO_REFRESH_MS = 2 * 60 * 1000

function ChannelMark({ source }: { source: AdminOrder['source'] }) {
  if (source === 'allegro') {
    return <AllegroLogoBadge />
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-stone-200 text-stone-700 text-[10px] font-bold flex-shrink-0" title="Sklep">S</span>
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

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void fetchOrders()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchOrders])

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key); setPage(1); setSelectedIds(new Set())
  }

  const refreshOrderSnapshot = useCallback(async (orderId: number) => {
    try {
      const res = await adminApi.getOrder(orderId)
      const fresh = res.data
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...fresh } : o)))
      setDetailOrder((prev) => (prev?.id === orderId ? fresh : prev))
    } catch {}
  }, [])

  const openOrderDetails = useCallback((order: AdminOrder) => {
    setDetailOrder(order)
    void refreshOrderSnapshot(order.id)
  }, [refreshOrderSnapshot])

  const handleContextMenu = (e: React.MouseEvent, order: AdminOrder) => {
    e.preventDefault()
    setContextMenu({ order, x: e.clientX, y: e.clientY })
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === orders.length) { setSelectedIds(new Set()); return }
    setSelectedIds(new Set(orders.map((o) => o.id)))
  }

  const handleDownloadLabel = async (order: AdminOrder) => {
    if (order.allShipments && order.allShipments.length > 1) { setLabelPickerOrder(order); return }
    try {
      const blob = await adminApi.getShipmentLabel(order.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch {}
  }

  const handleBulkStatusChange = async (status: string) => {
    const selected = orders.filter((o) => selectedIds.has(o.id))
    await Promise.allSettled(selected.map((o) => adminApi.updateOrderStatus(o.id, status)))
    setSelectedIds(new Set())
    await fetchOrders()
  }

  const handleBulkDownloadLabels = async () => {
    const selected = orders.filter((o) => selectedIds.has(o.id) && o.allegroShipmentId)
    for (const o of selected) await handleDownloadLabel(o)
  }

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id))
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const stats = useMemo(() => {
    const sumPln = orders.reduce((s, o) => s + Number(o.totalPln ?? o.total ?? 0), 0)
    const allegro = orders.filter((o) => o.source === 'allegro').length
    const shop = orders.filter((o) => o.source !== 'allegro').length
    const unpaid = orders.filter((o) => !o.paidAt).length
    return { sumPln, allegro, shop, unpaid }
  }, [orders])

  const hasFilters = !!(search || sourceFilter || dateFrom || dateTo || statusFilter !== 'all')

  return (
    <div className="space-y-3">
      {/* Title bar */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight text-stone-900 m-0">Zamówienia</h1>
          <span className="text-[13px] text-stone-500 tabular-nums">{total.toLocaleString('pl-PL')} łącznie</span>
        </div>
        <button
          type="button"
          onClick={() => void fetchOrders()}
          className="inline-flex items-center gap-1.5 px-2.5 h-8 text-[12.5px] font-medium border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 rounded-sm transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Odśwież
        </button>
      </div>

      {/* KPI strip */}
      <div className="bg-white border border-stone-200 rounded-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-stone-200">
          <Stat label="Suma na stronie" value={<>{stats.sumPln.toFixed(2)} <span className="text-stone-500 text-[12px] font-normal">PLN</span></>} />
          <Stat label="Allegro" value={stats.allegro} sub={`z ${orders.length}`} />
          <Stat label="Sklep" value={stats.shop} sub={`z ${orders.length}`} />
          <Stat label="Nieopłacone" value={stats.unpaid} tone={stats.unpaid > 0 ? 'warn' : undefined} />
        </div>
      </div>

      {/* Status tabs */}
      <div className="bg-white border border-stone-200 rounded-sm">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {STATUS_TABS.map(({ key, label }) => {
            const isActive = statusFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusFilter(key)}
                className={`relative px-3.5 h-9 text-[13px] inline-flex items-center transition whitespace-nowrap border-r border-stone-100 last:border-0 ${
                  isActive ? 'text-stone-900 font-semibold bg-stone-50/60' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50/40'
                }`}
              >
                {label}
                {isActive && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-stone-900" />}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-stone-200 rounded-sm p-2 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Szukaj: numer, e-mail, NIP, telefon, login Allegro…"
            className="w-full h-8 pl-8 pr-8 text-[13px] bg-stone-50 border border-stone-200 hover:border-stone-300 focus:border-stone-400 focus:bg-white rounded-sm outline-none transition"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Dropdown
            label="Źródło"
            value={sourceFilter}
            onChange={(v) => { setSourceFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'Wszystkie' },
              { value: 'shop', label: 'Sklep' },
              { value: 'allegro', label: 'Allegro' },
            ]}
          />
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchInput(''); setSearch(''); setSourceFilter(''); setDateFrom(''); setDateTo('')
                setStatusFilter('all'); setPage(1)
              }}
              className="inline-flex items-center gap-1 px-2 h-8 text-[12px] text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-sm transition"
            >
              <Filter className="w-3 h-3" /> Wyczyść filtry
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-sm p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
          <p className="text-[13px] text-red-700 mb-3">{error}</p>
          <button className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm" onClick={fetchOrders}>Ponów</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-stone-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: '36px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '24%' }} />
                  <col />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '40px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200 text-[10.5px] uppercase tracking-[0.1em] text-stone-500 font-semibold">
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && selectedIds.size === orders.length}
                        onChange={handleSelectAll}
                        className="rounded-sm border-stone-300 focus:ring-1 focus:ring-stone-900 w-3.5 h-3.5"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Numer</th>
                    <th className="px-3 py-2 text-left">Klient</th>
                    <th className="px-3 py-2 text-left">Pozycje</th>
                    <th className="px-3 py-2 text-left">Wysyłka</th>
                    <th className="px-3 py-2 text-right">Kwota</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0">
                        <td colSpan={7} className="px-3 py-3">
                          <div className="h-4 bg-stone-100 rounded-sm animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-16 text-center">
                        <ShoppingBag className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                        <div className="text-[13px] text-stone-700 font-medium">Brak zamówień</div>
                        <div className="text-[11.5px] text-stone-500 mt-1">{hasFilters ? 'Spróbuj zmienić filtry.' : 'Nowe zamówienia pojawią się tutaj.'}</div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const items = order.items ?? []
                      const firstItem = items[0]
                      const extraCount = items.length - 1
                      const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0)
                      const shipment = resolveShipmentStatus({
                        status: order.status,
                        shipmentDisplayStatus: order.shipmentDisplayStatus,
                        allegroFulfillmentStatus: order.allegroFulfillmentStatus,
                      })
                      const stale = order.shipmentFreshness === 'stale'
                      const isSelected = selectedIds.has(order.id)

                      return (
                        <tr
                          key={order.id}
                          className={`border-b border-stone-100 last:border-0 cursor-pointer group transition-colors ${
                            isSelected ? 'bg-sky-50/40' : 'hover:bg-stone-50/60'
                          }`}
                          onClick={() => openOrderDetails(order)}
                          onContextMenu={(e) => handleContextMenu(e, order)}
                        >
                          <td className="px-3 py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(order.id)}
                              className={`rounded-sm border-stone-300 focus:ring-1 focus:ring-stone-900 w-3.5 h-3.5 transition ${
                                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            />
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2">
                              <ChannelMark source={order.source} />
                              <div className="min-w-0">
                                <div className="font-mono tabular-nums text-[13px] font-semibold text-stone-900 truncate">
                                  {order.orderNumber}
                                </div>
                                <div className="text-[11px] text-stone-500 tabular-nums flex items-center gap-1">
                                  <span>{fmtDate(order.createdAt)}</span>
                                  <span className="text-stone-300">·</span>
                                  <span>{fmtTime(order.createdAt)}</span>
                                  {order.invoiceRequired && (
                                    <span className="ml-0.5 inline-flex items-center px-1 rounded-sm bg-sky-50 text-sky-800 border border-sky-200 text-[9.5px] font-bold leading-none py-px">FV</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="text-[13px] text-stone-900 truncate font-medium">{order.customerData?.name ?? '—'}</div>
                            <div className="text-[11.5px] text-stone-500 truncate">
                              {order.customerData?.email ?? order.customerData?.allegroLogin ?? ''}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <span className="font-mono tabular-nums text-[11px] text-stone-500 flex-shrink-0">{totalQty}×</span>
                              <span className="text-[13px] text-stone-800 truncate">{firstItem?.productName ?? '—'}</span>
                              {extraCount > 0 && (
                                <span className="ml-auto text-[10.5px] font-mono text-stone-500 bg-stone-100 px-1.5 py-px rounded-sm flex-shrink-0">
                                  +{extraCount}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[11px] font-medium ${shipmentTone(shipment.step, shipment.isIssue, shipment.isCancelled)}`}>
                                {shipment.label}
                              </span>
                              {stale && (
                                <span title="Tracking nie był odświeżany niedawno" className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium">
                                  stary
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-right align-middle">
                            <div className="font-mono tabular-nums text-[13px] font-semibold text-stone-900">
                              {fmtAmount(order.total, order.currency)}
                            </div>
                            {order.totalPln != null && order.currency !== 'PLN' && (
                              <div className="text-[10.5px] text-stone-500 tabular-nums">≈ {Number(order.totalPln).toFixed(2)} PLN</div>
                            )}
                          </td>

                          <td className="px-1 py-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="p-1 rounded-sm text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 opacity-0 group-hover:opacity-100 transition"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setContextMenu({ order, x: rect.left, y: rect.bottom + 4 })
                              }}
                              title="Akcje"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-sm p-3">
                  <div className="space-y-2 animate-pulse">
                    <div className="flex justify-between"><div className="h-4 bg-stone-100 w-32 rounded-sm" /><div className="h-4 bg-stone-100 w-20 rounded-sm" /></div>
                    <div className="h-3 bg-stone-100 w-full rounded-sm" />
                    <div className="h-3 bg-stone-100 w-3/4 rounded-sm" />
                  </div>
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-sm py-12 text-center">
                <ShoppingBag className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                <div className="text-[13px] text-stone-700 font-medium">Brak zamówień</div>
              </div>
            ) : (
              orders.map((order) => (
                <MobileOrderCard
                  key={order.id}
                  order={order}
                  selected={selectedIds.has(order.id)}
                  onSelect={() => handleToggleSelect(order.id)}
                  onClick={() => openOrderDetails(order)}
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
      {(totalPages > 1 || page > 1) && (
        <div className="flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-sm px-3 py-2">
          <div className="text-[12px] text-stone-600 tabular-nums">
            Strona <span className="font-semibold text-stone-900">{page}</span> z <span className="font-semibold text-stone-900">{totalPages}</span>
            <span className="text-stone-400 mx-1.5">·</span>
            {orders.length > 0 ? `${(page - 1) * LIMIT + 1}–${(page - 1) * LIMIT + orders.length}` : '0'} z {total.toLocaleString('pl-PL')}
          </div>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-2.5 h-7 text-[12px] border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 rounded-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Poprzednia
            </button>
            <button
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 h-7 text-[12px] border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 rounded-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => p + 1)}
            >
              Następna <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <OrderContextMenu
          order={contextMenu.order}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onOpenDetails={openOrderDetails}
          onCreateShipment={(order) => setShipmentOrder(order)}
          onDownloadLabel={handleDownloadLabel}
        />
      )}

      <OrderDetailModal
        order={detailOrder}
        isOpen={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onCreateShipment={(order) => { setDetailOrder(null); setShipmentOrder(order) }}
        onDownloadLabel={handleDownloadLabel}
        onShipmentRefreshed={(orderId) => { void refreshOrderSnapshot(orderId) }}
      />

      {shipmentOrder && (
        <ShipmentModal
          order={shipmentOrder}
          isOpen={!!shipmentOrder}
          onClose={() => setShipmentOrder(null)}
          onSuccess={() => { setShipmentOrder(null); fetchOrders() }}
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

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'warn' | 'ok' }) {
  const toneCls = tone === 'warn' ? 'text-amber-700' : tone === 'ok' ? 'text-emerald-700' : 'text-stone-900'
  return (
    <div className="px-3.5 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold mb-0.5">{label}</div>
      <div className={`text-[15px] font-semibold tabular-nums truncate ${toneCls}`}>{value}</div>
      {sub != null && <div className="text-[10.5px] text-stone-500 truncate mt-0.5">{sub}</div>}
    </div>
  )
}

function MobileOrderCard({
  order, selected, onSelect, onClick, onContextMenu,
}: {
  order: AdminOrder
  selected: boolean
  onSelect: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const items = order.items ?? []
  const firstItem = items[0]
  const extra = items.length - 1
  const shipment = resolveShipmentStatus({
    status: order.status,
    shipmentDisplayStatus: order.shipmentDisplayStatus,
    allegroFulfillmentStatus: order.allegroFulfillmentStatus,
  })
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-sm transition active:bg-stone-50 ${
        selected ? 'border-sky-400 ring-1 ring-sky-200' : 'border-stone-200'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="pt-0.5" onClick={(e) => { e.stopPropagation(); onSelect() }}>
              <input type="checkbox" checked={selected} onChange={onSelect} onClick={(e) => e.stopPropagation()}
                     className="rounded-sm border-stone-300 focus:ring-1 focus:ring-stone-900 w-4 h-4" />
            </div>
            <ChannelMark source={order.source} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono tabular-nums text-[14px] font-semibold text-stone-900">{order.orderNumber}</span>
                {order.invoiceRequired && <span className="px-1 rounded-sm bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold leading-none py-px">FV</span>}
              </div>
              <div className="text-[11.5px] text-stone-500 tabular-nums">{fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</div>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <div className="text-right">
              <div className="font-mono tabular-nums text-[14px] font-semibold text-stone-900">{fmtAmount(order.total, order.currency)}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onContextMenu(e) }} className="p-1.5 -mr-1 rounded-sm text-stone-400 hover:text-stone-900 hover:bg-stone-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-stone-100">
          <div className="text-[13px] text-stone-900 truncate font-medium">{order.customerData?.name ?? '—'}</div>
          <div className="text-[11.5px] text-stone-500 truncate">{order.customerData?.email ?? order.customerData?.allegroLogin ?? ''}</div>
        </div>

        {firstItem && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-stone-700">
            <Package className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="truncate">{firstItem.productName}</span>
            {extra > 0 && <span className="ml-auto text-[10.5px] font-mono text-stone-500 bg-stone-100 px-1.5 py-px rounded-sm flex-shrink-0">+{extra}</span>}
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <OrderStatusBadge status={order.status} source={order.source} allegroFulfillmentStatus={order.allegroFulfillmentStatus} paymentMethod={order.paymentMethod} paidAt={order.paidAt} />
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[11px] font-medium ${shipmentTone(shipment.step, shipment.isIssue, shipment.isCancelled)}`}>
            {shipment.label}
          </span>
        </div>
      </div>
    </div>
  )
}
