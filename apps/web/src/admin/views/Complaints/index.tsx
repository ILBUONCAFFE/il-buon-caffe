'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import { ComplaintStatusBadge } from '../../components/ComplaintStatusBadge'
import { ComplaintDetailModal } from '../../components/ComplaintDetailModal'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import type { AdminComplaint, ComplaintsQueryParams } from '../../types/admin-api'

const DATE_FMT = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})
const DATETIME_FMT = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit',
})

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return DATE_FMT.format(new Date(iso))
}
function formatRecent(iso: string | null | undefined): string {
  if (!iso) return '-'
  return DATETIME_FMT.format(new Date(iso))
}

const STATUS_TABS = [
  { key: 'all',                label: 'Wszystkie' },
  { key: 'DISPUTE_ONGOING',    label: 'W toku' },
  { key: 'CLAIM_SUBMITTED',    label: 'Zgłoszone' },
  { key: 'CLAIM_ACCEPTED',     label: 'Uznane' },
  { key: 'CLAIM_REJECTED',     label: 'Odrzucone' },
  { key: 'DISPUTE_UNRESOLVED', label: 'Nierozwiązane' },
  { key: 'DISPUTE_CLOSED',     label: 'Zamknięte' },
]

const LIMIT = 50

function roleLabel(role: string): string {
  if (role === 'SELLER')  return 'My'
  if (role === 'ALLEGRO') return 'Allegro'
  if (role === 'BUYER')   return 'Kupujący'
  return role
}

export const ComplaintsView = () => {
  const [items, setItems]       = useState<AdminComplaint[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [searchInput, setSearchInput]   = useState('')
  const [search, setSearch]             = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [page, setPage]                 = useState(1)

  const [detail, setDetail] = useState<AdminComplaint | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: ComplaintsQueryParams = { page, limit: LIMIT }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search)   params.search = search
      if (dateFrom) params.from   = dateFrom
      if (dateTo)   params.to     = dateTo

      const res = await adminApi.getComplaints(params)
      setItems(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania reklamacji')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

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
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">Reklamacje</h1>
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
          placeholder="Szukaj: ID Allegro, temat, zamówienie, email..."
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
          <button className="btn-primary text-sm" onClick={fetchData}>Ponów</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
                  <th className="text-left px-4 py-3 font-medium">Reklamacja</th>
                  <th className="text-left px-4 py-3 font-medium">Zamówienie</th>
                  <th className="text-left px-4 py-3 font-medium">Klient</th>
                  <th className="text-left px-4 py-3 font-medium">Ostatnia wiadomość</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F0EFEC] last:border-0">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#A3A3A3]">
                      Brak reklamacji
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9] cursor-pointer"
                      onClick={() => setDetail(it)}
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-start gap-2">
                          <MessageSquare size={14} className="text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-[#1A1A1A] truncate max-w-[220px]">
                              {it.subject || `#${it.allegroIssueId}`}
                            </div>
                            <div className="text-xs text-[#A3A3A3] mt-0.5">
                              {formatDate(it.createdAt)} · ID {it.allegroIssueId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-[#1A1A1A]">{it.orderNumber ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="text-[#1A1A1A] font-medium truncate max-w-[160px]">
                          {it.customerData?.name ?? '-'}
                        </div>
                        <div className="text-xs text-[#A3A3A3] truncate max-w-[160px]">
                          {it.customerData?.email ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="text-xs text-[#A3A3A3]">{formatRecent(it.lastMessageAt)}</div>
                        {it.lastMessage?.text && (
                          <div className="text-xs text-[#525252] truncate max-w-[240px] mt-0.5">
                            <span className="text-[#A3A3A3]">{roleLabel(it.lastMessage.authorRole)}:</span>{' '}
                            {it.lastMessage.text}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <ComplaintStatusBadge status={it.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E4E1] p-4 animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#F5F4F1] rounded w-32" />
                    <div className="h-4 bg-[#F5F4F1] rounded w-20" />
                  </div>
                  <div className="h-3 bg-[#F5F4F1] rounded w-full" />
                  <div className="h-3 bg-[#F5F4F1] rounded w-3/4" />
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E4E1] py-16 text-center text-[#A3A3A3]">
                Brak reklamacji
              </div>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  className="bg-white rounded-xl border border-[#E5E4E1] p-4 cursor-pointer active:scale-[0.99] transition-all"
                  onClick={() => setDetail(it)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-[#1A1A1A] truncate">
                        {it.subject || `#${it.allegroIssueId}`}
                      </div>
                      <div className="text-xs text-[#A3A3A3] mt-0.5">
                        {it.orderNumber ? `zm. ${it.orderNumber} · ` : ''}{formatDate(it.createdAt)}
                      </div>
                    </div>
                    <ComplaintStatusBadge status={it.status} />
                  </div>
                  <div className="border-t border-[#F0EFEC] my-3" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1A1A1A] truncate">
                        {it.customerData?.name ?? '-'}
                      </div>
                      <div className="text-xs text-[#A3A3A3] truncate">
                        {formatRecent(it.lastMessageAt)}
                      </div>
                    </div>
                  </div>
                  {it.lastMessage?.text && (
                    <div className="mt-2 text-xs text-[#525252] line-clamp-2">
                      <span className="text-[#A3A3A3]">{roleLabel(it.lastMessage.authorRole)}:</span>{' '}
                      {it.lastMessage.text}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-[#A3A3A3]">Strona {page} z {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Poprzednia</span>
            </button>
            <button
              disabled={page >= totalPages}
              className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage(p => p + 1)}
            >
              <span className="hidden sm:inline">Następna</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <ComplaintDetailModal
        complaint={detail}
        isOpen={!!detail}
        onClose={() => setDetail(null)}
      />
    </div>
  )
}
