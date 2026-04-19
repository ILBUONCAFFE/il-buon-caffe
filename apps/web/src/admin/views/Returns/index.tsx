'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../../lib/adminApiClient'
import { ReturnStatusBadge } from '../../components/ReturnStatusBadge'
import { ReturnContextMenu } from '../../components/ReturnContextMenu'
import { ReturnDetailModal } from '../../components/ReturnDetailModal'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import type { AdminReturn, ReturnStatus, ReturnsQueryParams } from '../../types/admin-api'
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
  const symbol: Record<string, string> = { PLN: 'zl', EUR: 'EUR' }
  return `${Number(value).toFixed(2)} ${symbol[currency] ?? currency}`
}

const REASON_LABELS: Record<string, string> = {
  damaged:          'Uszkodzony produkt',
  wrong_item:       'Bledny produkt',
  not_as_described: 'Niezgodny z opisem',
  change_of_mind:   'Zmiana decyzji',
  other:            'Inne',
}

const STATUS_TABS = [
  { key: 'all',       label: 'Wszystkie' },
  { key: 'new',       label: 'Nowe' },
  { key: 'in_review', label: 'W rozpatrzeniu' },
  { key: 'approved',  label: 'Zaakceptowane' },
  { key: 'rejected',  label: 'Odrzucone' },
  { key: 'refunded',  label: 'Zwrot wyslany' },
  { key: 'closed',    label: 'Zamkniete' },
]

const LIMIT = 50

export const ReturnsView = () => {
  const [returns, setReturns]   = useState<AdminReturn[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [searchInput, setSearchInput]   = useState('')
  const [search, setSearch]             = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [page, setPage]                 = useState(1)

  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu]     = useState<{ ret: AdminReturn; x: number; y: number } | null>(null)
  const [detailReturn, setDetailReturn]   = useState<AdminReturn | null>(null)
  const [feedback, setFeedback]           = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
      if (search)   params.search = search
      if (dateFrom) params.from   = dateFrom
      if (dateTo)   params.to     = dateTo

      const res = await adminApi.getReturns(params)
      setReturns(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad ladowania zwrotow')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, statusFilter])

  useEffect(() => { fetchReturns() }, [fetchReturns])

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key)
    setPage(1)
    setSelectedIds(new Set())
  }

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
    const reason = window.prompt('Powód odrzucenia (opcjonalnie):') ?? undefined
    try {
      await adminApi.rejectReturn(ret.id, { code: 'REFUND_REJECTED', reason: reason || undefined })
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
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === returns.length) { setSelectedIds(new Set()); return }
    setSelectedIds(new Set(returns.map((r) => r.id)))
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">Zwroty</h1>
        <span className="text-sm text-[#A3A3A3] tabular-nums">{total}</span>
      </div>

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

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Szukaj: nr zwrotu, zamówienie, email..."
          className="admin-input flex-1 min-w-0 sm:min-w-[260px]"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
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

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <button className="btn-primary text-sm" onClick={fetchReturns}>Ponów</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
                  <th className="w-[48px] px-4 py-3 text-left">
                    <input type="checkbox" checked={returns.length > 0 && selectedIds.size === returns.length} onChange={handleSelectAll} className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A]" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Zwrot</th>
                  <th className="text-left px-4 py-3 font-medium">Zamówienie</th>
                  <th className="text-left px-4 py-3 font-medium">Klient</th>
                  <th className="text-left px-4 py-3 font-medium">Powód</th>
                  <th className="text-right px-4 py-3 font-medium">Kwota</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="w-[48px] px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F0EFEC] last:border-0">
                      <td colSpan={8} className="px-4 py-4"><div className="h-4 bg-[#F5F4F1] rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : returns.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-[#A3A3A3]">Brak zwrotów</td></tr>
                ) : (
                  returns.map((ret) => {
                    const firstItem = ret.items?.[0]
                    const extraCount = (ret.items?.length ?? 0) - 1
                    return (
                      <tr key={ret.id} className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9] cursor-pointer group" onClick={() => setDetailReturn(ret)} onContextMenu={(e) => handleContextMenu(e, ret)}>
                        <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(ret.id)} onChange={() => handleToggleSelect(ret.id)} className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A] opacity-0 group-hover:opacity-100 checked:opacity-100" />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="font-semibold text-[#1A1A1A]">{ret.returnNumber}</span>
                          <div className="text-xs text-[#A3A3A3] mt-1">{formatDateShort(ret.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3 align-middle"><span className="text-[#1A1A1A]">{ret.orderNumber}</span></td>
                        <td className="px-4 py-3 align-middle">
                          <div className="text-[#1A1A1A] font-medium">{ret.customerData?.name ?? '-'}</div>
                          <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[180px]">{ret.customerData?.email ?? ''}</div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="text-[#1A1A1A]">{REASON_LABELS[ret.reason] ?? ret.reason}</span>
                          {firstItem && (
                            <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[200px]">
                              {firstItem.productName}
                              {extraCount > 0 && <span className="ml-1 text-[10px] font-medium bg-[#F5F4F1] px-1.5 py-0.5 rounded-full">+{extraCount}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right align-middle"><span className="font-semibold text-[#1A1A1A]">{formatAmount(ret.totalRefundAmount, ret.currency)}</span></td>
                        <td className="px-4 py-3 align-middle"><ReturnStatusBadge status={ret.status} /></td>
                        <td className="px-4 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#E5E4E1] opacity-0 group-hover:opacity-100" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ ret, x: rect.left, y: rect.bottom + 4 }) }}>
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E4E1] p-4 animate-pulse space-y-3">
                  <div className="flex justify-between"><div className="h-4 bg-[#F5F4F1] rounded w-32" /><div className="h-4 bg-[#F5F4F1] rounded w-20" /></div>
                  <div className="h-3 bg-[#F5F4F1] rounded w-full" />
                  <div className="h-3 bg-[#F5F4F1] rounded w-3/4" />
                </div>
              ))
            ) : returns.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E4E1] py-16 text-center text-[#A3A3A3]">Brak zwrotów</div>
            ) : (
              returns.map((ret) => {
                const firstItem = ret.items?.[0]
                const extraCount = (ret.items?.length ?? 0) - 1
                return (
                  <div key={ret.id} className="bg-white rounded-xl border border-[#E5E4E1] p-4 cursor-pointer active:scale-[0.99] transition-all" onClick={() => setDetailReturn(ret)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5" onClick={(e) => { e.stopPropagation(); handleToggleSelect(ret.id) }}>
                          <input type="checkbox" checked={selectedIds.has(ret.id)} onChange={() => handleToggleSelect(ret.id)} onClick={(e) => e.stopPropagation()} className="rounded border-[#D4D3D0] w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-[#1A1A1A]">{ret.returnNumber}</span>
                          <div className="text-xs text-[#A3A3A3] mt-0.5">zm. {ret.orderNumber} · {formatDateShort(ret.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right">
                          <div className="font-semibold text-sm text-[#1A1A1A]">{formatAmount(ret.totalRefundAmount, ret.currency)}</div>
                        </div>
                        <button className="p-1.5 rounded-lg text-[#A3A3A3] hover:bg-[#E5E4E1] transition-colors" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, ret) }}>
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-[#F0EFEC] my-3" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1A1A1A] truncate">{ret.customerData?.name ?? '-'}</div>
                        <div className="text-xs text-[#A3A3A3] truncate">{REASON_LABELS[ret.reason] ?? ret.reason}</div>
                      </div>
                      <ReturnStatusBadge status={ret.status} />
                    </div>
                    {firstItem && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-[#525252] truncate">{firstItem.productName}</span>
                        {extraCount > 0 && <span className="text-[11px] font-medium text-[#A3A3A3] bg-[#F5F4F1] px-2 py-0.5 rounded-full flex-shrink-0">+{extraCount}</span>}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-[#A3A3A3]">Strona {page} z {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40" onClick={() => setPage((prev) => prev - 1)}>
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Poprzednia</span>
            </button>
            <button disabled={page >= totalPages} className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40" onClick={() => setPage((prev) => prev + 1)}>
              <span className="hidden sm:inline">Następna</span>
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-3 fade-in duration-200">
          <span className="text-sm font-medium tabular-nums">{selectedIds.size} zaznaczonych</span>
          <div className="h-4 w-px bg-white/20" />
          <button
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
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
          onOpenDetails={(ret) => setDetailReturn(ret)}
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
      />

      {feedback && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] text-sm font-medium animate-in slide-in-from-bottom-3 fade-in duration-200 ${
          feedback.type === 'success'
            ? 'bg-[#1A1A1A] text-white'
            : 'bg-red-600 text-white'
        }`}>
          {feedback.message}
        </div>
      )}
    </div>
  )
}
