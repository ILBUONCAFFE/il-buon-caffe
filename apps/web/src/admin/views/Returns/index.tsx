'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, MoreHorizontal, Search, X, RefreshCw, Loader2,
  Package, AlertTriangle, Filter, Undo2,
} from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import { ReturnStatusBadge } from '../../components/ReturnStatusBadge'
import { ReturnContextMenu } from '../../components/ReturnContextMenu'
import { ReturnDetailModal } from '../../components/ReturnDetailModal'
import { AllegroLogoBadge } from '../../components/AllegroLogoBadge'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { Dropdown } from '../../components/ui/Dropdown'
import type { AdminReturn, ReturnStatus, ReturnsQueryParams } from '../../types/admin-api'

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

const REASON_LABELS: Record<string, string> = {
  damaged:          'Uszkodzony produkt',
  wrong_item:       'Błędny produkt',
  not_as_described: 'Niezgodny z opisem',
  change_of_mind:   'Zmiana decyzji',
  defect:           'Wada produktu',
  mistake:          'Pomyłka kupującego',
  other:            'Inne',
}

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: 'all',       label: 'Wszystkie' },
  { key: 'new',       label: 'Zgłoszone' },
  { key: 'in_review', label: 'W drodze' },
  { key: 'approved',  label: 'Do decyzji' },
  { key: 'rejected',  label: 'Odrzucone' },
  { key: 'refunded',  label: 'Rozliczone' },
  { key: 'closed',    label: 'Zamknięte' },
]

const LIMIT = 50
const AUTO_REFRESH_MS = 2 * 60 * 1000

function ChannelMark({ source }: { source: AdminReturn['source'] }) {
  if (source === 'allegro') return <AllegroLogoBadge />
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-stone-200 text-stone-700 text-[10px] font-bold flex-shrink-0"
      title="Sklep"
    >
      S
    </span>
  )
}

export const ReturnsView = () => {
  const [returns, setReturns] = useState<AdminReturn[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [search, setSearch]             = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [page, setPage]                 = useState(1)

  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu]   = useState<{ ret: AdminReturn; x: number; y: number } | null>(null)
  const [detailReturn, setDetailReturn] = useState<AdminReturn | null>(null)
  const [feedback, setFeedback]         = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 5000)
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: ReturnsQueryParams = { page, limit: LIMIT }
      if (statusFilter !== 'all') params.status = statusFilter
      if (sourceFilter) params.source = sourceFilter as 'shop' | 'allegro'
      if (search)   params.search = search
      if (dateFrom) params.from   = dateFrom
      if (dateTo)   params.to     = dateTo

      const res = await adminApi.getReturns(params)
      setReturns(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania zwrotów')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, sourceFilter, statusFilter])

  useEffect(() => { fetchReturns() }, [fetchReturns])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void fetchReturns()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchReturns])

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key); setPage(1); setSelectedIds(new Set())
  }

  const refreshReturnSnapshot = useCallback(async (returnId: number) => {
    try {
      const res = await adminApi.getReturnDetail(returnId)
      const fresh = res.data
      setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, ...fresh } : r)))
      setDetailReturn((prev) => (prev?.id === returnId ? fresh : prev))
    } catch {}
  }, [])

  const openReturnDetails = useCallback((ret: AdminReturn) => {
    setDetailReturn(ret)
    void refreshReturnSnapshot(ret.id)
  }, [refreshReturnSnapshot])

  const handleChangeStatus = async (ret: AdminReturn, status: ReturnStatus) => {
    try {
      await adminApi.updateReturnStatus(ret.id, status)
      await fetchReturns()
      showFeedback('success', 'Status zwrotu zaktualizowany')
    } catch {
      showFeedback('error', 'Błąd aktualizacji statusu zwrotu')
    }
  }

  const handleApprove = async (ret: AdminReturn) => {
    try {
      await adminApi.approveReturn(ret.id)
      await fetchReturns()
      showFeedback('success', 'Zwrot zatwierdzony')
    } catch {
      showFeedback('error', 'Błąd zatwierdzenia zwrotu')
    }
  }

  const handleReject = async (ret: AdminReturn) => {
    const reason = window.prompt('Uzasadnienie odmowy zwrotu środków:')?.trim()
    if (!reason) {
      showFeedback('error', 'Przy odmowie zwrotu środków podaj uzasadnienie')
      return
    }
    try {
      await adminApi.rejectReturn(ret.id, { code: 'REFUND_REJECTED', reason })
      await fetchReturns()
      showFeedback('success', 'Zwrot odrzucony')
    } catch {
      showFeedback('error', 'Błąd odrzucenia zwrotu')
    }
  }

  const handleRefund = async (ret: AdminReturn) => {
    try {
      await adminApi.refundReturn(ret.id, { amount: ret.totalRefundAmount ?? 0 })
      await fetchReturns()
      showFeedback('success', 'Zwrot pieniędzy potwierdzony')
    } catch {
      showFeedback('error', 'Błąd potwierdzenia zwrotu pieniędzy')
    }
  }

  const handleReopen = async (ret: AdminReturn) => {
    try {
      await adminApi.reopenReturn(ret.id)
      await fetchReturns()
      showFeedback('success', 'Zwrot ponownie otwarty')
    } catch {
      showFeedback('error', 'Błąd ponownego otwarcia zwrotu')
    }
  }

  const handleRestock = async (ret: AdminReturn) => {
    try {
      await adminApi.restockReturn(ret.id)
      await fetchReturns()
      showFeedback('success', 'Produkt przywrócony na stan')
    } catch {
      showFeedback('error', 'Błąd przywracania produktu na stan')
    }
  }

  const handleRefreshReturn = async (ret: AdminReturn) => {
    try {
      await adminApi.refreshReturn(ret.id)
      const fresh = await adminApi.getReturnDetail(ret.id)
      setDetailReturn((current) => (current?.id === ret.id ? fresh.data : current))
      await fetchReturns()
      showFeedback('success', 'Zwrot odświeżony')
    } catch {
      showFeedback('error', 'Błąd odświeżania zwrotu')
    }
  }

  const handleContextMenu = (e: React.MouseEvent, ret: AdminReturn) => {
    e.preventDefault()
    setContextMenu({ ret, x: e.clientX, y: e.clientY })
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === returns.length) { setSelectedIds(new Set()); return }
    setSelectedIds(new Set(returns.map((r) => r.id)))
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const stats = useMemo(() => {
    const sumRefund = returns.reduce((s, r) => s + Number(r.totalRefundAmount ?? 0), 0)
    const allegro   = returns.filter((r) => r.source === 'allegro').length
    const shop      = returns.filter((r) => r.source !== 'allegro').length
    const toAct     = returns.filter((r) => r.status === 'new' || r.status === 'approved').length
    return { sumRefund, allegro, shop, toAct }
  }, [returns])

  const hasFilters = !!(search || sourceFilter || dateFrom || dateTo || statusFilter !== 'all')

  return (
    <div className="space-y-3">
      {/* Title bar */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight text-stone-900 m-0">Zwroty</h1>
          <span className="text-[13px] text-stone-500 tabular-nums">{total.toLocaleString('pl-PL')} łącznie</span>
        </div>
        <button
          type="button"
          onClick={() => void fetchReturns()}
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
          <Stat label="Suma zwrotów" value={<>{stats.sumRefund.toFixed(2)} <span className="text-stone-500 text-[12px] font-normal">PLN</span></>} />
          <Stat label="Allegro" value={stats.allegro} sub={`z ${returns.length}`} />
          <Stat label="Sklep" value={stats.shop} sub={`z ${returns.length}`} />
          <Stat label="Do akcji" value={stats.toAct} tone={stats.toAct > 0 ? 'warn' : undefined} />
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
            placeholder="Szukaj: nr zwrotu, zamówienie, e-mail, klient…"
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
          <button
            className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm"
            onClick={fetchReturns}
          >
            Ponów
          </button>
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
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '22%' }} />
                  <col />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '40px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200 text-[10.5px] uppercase tracking-[0.1em] text-stone-500 font-semibold">
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={returns.length > 0 && selectedIds.size === returns.length}
                        onChange={handleSelectAll}
                        className="rounded-sm border-stone-300 focus:ring-1 focus:ring-stone-900 w-3.5 h-3.5"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Numer</th>
                    <th className="px-3 py-2 text-left">Zamówienie</th>
                    <th className="px-3 py-2 text-left">Klient</th>
                    <th className="px-3 py-2 text-left">Powód / pozycje</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Kwota</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0">
                        <td colSpan={8} className="px-3 py-3">
                          <div className="h-4 bg-stone-100 rounded-sm animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : returns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-16 text-center">
                        <Undo2 className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                        <div className="text-[13px] text-stone-700 font-medium">Brak zwrotów</div>
                        <div className="text-[11.5px] text-stone-500 mt-1">
                          {hasFilters ? 'Spróbuj zmienić filtry.' : 'Nowe zgłoszenia pojawią się tutaj.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    returns.map((ret) => {
                      const items      = ret.items ?? []
                      const firstItem  = items[0]
                      const extraCount = items.length - 1
                      const totalQty   = items.reduce((s, i) => s + Number(i.quantity || 0), 0)
                      const isSelected = selectedIds.has(ret.id)

                      return (
                        <tr
                          key={ret.id}
                          className={`border-b border-stone-100 last:border-0 cursor-pointer group transition-colors ${
                            isSelected ? 'bg-sky-50/40' : 'hover:bg-stone-50/60'
                          }`}
                          onClick={() => openReturnDetails(ret)}
                          onContextMenu={(e) => handleContextMenu(e, ret)}
                        >
                          <td className="px-3 py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(ret.id)}
                              className={`rounded-sm border-stone-300 focus:ring-1 focus:ring-stone-900 w-3.5 h-3.5 transition ${
                                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            />
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2">
                              <ChannelMark source={ret.source} />
                              <div className="min-w-0">
                                <div className="font-mono tabular-nums text-[13px] font-semibold text-stone-900 truncate">
                                  {ret.returnNumber}
                                </div>
                                <div className="text-[11px] text-stone-500 tabular-nums flex items-center gap-1">
                                  <span>{fmtDate(ret.createdAt)}</span>
                                  <span className="text-stone-300">·</span>
                                  <span>{fmtTime(ret.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <span className="font-mono tabular-nums text-[13px] text-stone-700">{ret.orderNumber}</span>
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="text-[13px] text-stone-900 truncate font-medium">{ret.customerData?.name ?? '—'}</div>
                            <div className="text-[11.5px] text-stone-500 truncate">{ret.customerData?.email ?? ''}</div>
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <div className="text-[12.5px] text-stone-800">{REASON_LABELS[ret.reason] ?? ret.reason}</div>
                            {firstItem && (
                              <div className="flex items-baseline gap-1.5 mt-0.5 min-w-0">
                                <span className="font-mono tabular-nums text-[10.5px] text-stone-500 flex-shrink-0">{totalQty}×</span>
                                <span className="text-[11.5px] text-stone-600 truncate">{firstItem.productName}</span>
                                {extraCount > 0 && (
                                  <span className="ml-auto text-[10.5px] font-mono text-stone-500 bg-stone-100 px-1.5 py-px rounded-sm flex-shrink-0">
                                    +{extraCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2.5 align-middle">
                            <ReturnStatusBadge status={ret.status} />
                          </td>

                          <td className="px-3 py-2.5 text-right align-middle">
                            <div className="font-mono tabular-nums text-[13px] font-semibold text-stone-900">
                              {fmtAmount(ret.totalRefundAmount, ret.currency)}
                            </div>
                          </td>

                          <td className="px-1 py-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="p-1 rounded-sm text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 opacity-0 group-hover:opacity-100 transition"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setContextMenu({ ret, x: rect.left, y: rect.bottom + 4 })
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
            ) : returns.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-sm py-12 text-center">
                <Undo2 className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                <div className="text-[13px] text-stone-700 font-medium">Brak zwrotów</div>
              </div>
            ) : (
              returns.map((ret) => (
                <MobileReturnCard
                  key={ret.id}
                  ret={ret}
                  selected={selectedIds.has(ret.id)}
                  onSelect={() => handleToggleSelect(ret.id)}
                  onClick={() => openReturnDetails(ret)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setContextMenu({ ret, x: rect.left, y: rect.bottom + 4 })
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
            {returns.length > 0 ? `${(page - 1) * LIMIT + 1}–${(page - 1) * LIMIT + returns.length}` : '0'} z {total.toLocaleString('pl-PL')}
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-3 fade-in duration-200">
          <span className="text-[13px] font-medium tabular-nums">{selectedIds.size} zaznaczonych</span>
          <div className="h-4 w-px bg-white/20" />
          <button
            type="button"
            className="text-[12.5px] px-2.5 h-7 inline-flex items-center rounded-sm hover:bg-white/10 transition"
            onClick={() => setSelectedIds(new Set())}
          >
            Anuluj zaznaczenie
          </button>
        </div>
      )}

      {contextMenu && (
        <ReturnContextMenu
          ret={contextMenu.ret}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onOpenDetails={(ret) => openReturnDetails(ret)}
          onChangeStatus={handleChangeStatus}
          onApprove={(ret) => { handleApprove(ret); setContextMenu(null) }}
          onReject={(ret) => { handleReject(ret); setContextMenu(null) }}
          onRefund={(ret) => { handleRefund(ret); setContextMenu(null) }}
          onReopen={(ret) => { handleReopen(ret); setContextMenu(null) }}
          onRestock={(ret) => { handleRestock(ret); setContextMenu(null) }}
          onRefreshReturn={(ret) => { handleRefreshReturn(ret); setContextMenu(null) }}
        />
      )}

      <ReturnDetailModal
        ret={detailReturn}
        isOpen={!!detailReturn}
        onClose={() => setDetailReturn(null)}
        onChangeStatus={handleChangeStatus}
        onApprove={handleApprove}
        onReject={handleReject}
        onRefund={handleRefund}
        onRefreshReturn={handleRefreshReturn}
      />

      {feedback && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.18)] text-[13px] font-medium animate-in slide-in-from-bottom-3 fade-in duration-200 ${
          feedback.type === 'success'
            ? 'bg-stone-900 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {feedback.message}
        </div>
      )}
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

function MobileReturnCard({
  ret, selected, onSelect, onClick, onContextMenu,
}: {
  ret: AdminReturn
  selected: boolean
  onSelect: () => void
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const items     = ret.items ?? []
  const firstItem = items[0]
  const extra     = items.length - 1
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
              <input
                type="checkbox"
                checked={selected}
                onChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                className="rounded-sm border-stone-300 focus:ring-1 focus:ring-stone-900 w-4 h-4"
              />
            </div>
            <ChannelMark source={ret.source} />
            <div className="min-w-0 flex-1">
              <span className="font-mono tabular-nums text-[14px] font-semibold text-stone-900">{ret.returnNumber}</span>
              <div className="text-[11.5px] text-stone-500 tabular-nums">
                zam. {ret.orderNumber} · {fmtDate(ret.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <div className="text-right">
              <div className="font-mono tabular-nums text-[14px] font-semibold text-stone-900">
                {fmtAmount(ret.totalRefundAmount, ret.currency)}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onContextMenu(e) }}
              className="p-1.5 -mr-1 rounded-sm text-stone-400 hover:text-stone-900 hover:bg-stone-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-stone-100">
          <div className="text-[13px] text-stone-900 truncate font-medium">{ret.customerData?.name ?? '—'}</div>
          <div className="text-[11.5px] text-stone-500 truncate">{REASON_LABELS[ret.reason] ?? ret.reason}</div>
        </div>

        {firstItem && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-stone-700">
            <Package className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="truncate">{firstItem.productName}</span>
            {extra > 0 && (
              <span className="ml-auto text-[10.5px] font-mono text-stone-500 bg-stone-100 px-1.5 py-px rounded-sm flex-shrink-0">
                +{extra}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <ReturnStatusBadge status={ret.status} />
        </div>
      </div>
    </div>
  )
}
