'use client'

import { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { StockHistoryEntry } from '../../types/admin-api'

const REASON_LABELS: Record<string, string> = {
  order:        'Zamówienie',
  manual:       'Ręczna korekta',
  inventory:    'Inwentaryzacja',
  damage:       'Uszkodzenie',
  allegro_sync: 'Sync Allegro',
  cancellation: 'Anulowanie',
  return:       'Zwrot',
}

type Props = {
  sku: string
  productName: string
  onClose: () => void
}

export function StockHistoryModal({ sku, productName, onClose }: Props) {
  const [entries, setEntries] = useState<StockHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    setError(null)
    adminApi.getProductStockHistory(sku, { page, limit: LIMIT })
      .then(res => { setEntries(res.data); setTotal(res.meta.total) })
      .catch(err => setError(err instanceof Error ? err.message : 'Błąd'))
      .finally(() => setLoading(false))
  }, [sku, page])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#E5E4E1] flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1] flex-shrink-0">
          <div>
            <p className="text-xs text-[#737373]">Historia stanu — <span className="font-mono">{sku}</span></p>
            <h2 className="text-base font-semibold text-[#1A1A1A]">{productName}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#737373] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-[#737373] text-sm">Ładowanie…</div>
          ) : error ? (
            <div className="p-6 text-sm text-[#B91C1C] bg-[#FEE2E2] m-4 rounded-xl">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-[#A3A3A3] text-sm">Brak historii zmian</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#FAFAF9]">
                <tr className="text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-right px-4 py-3 font-medium">Poprzednio</th>
                  <th className="text-right px-4 py-3 font-medium">Zmiana</th>
                  <th className="text-right px-4 py-3 font-medium">Po zmianie</th>
                  <th className="text-left px-4 py-3 font-medium">Powód</th>
                  <th className="text-left px-4 py-3 font-medium">Notatka</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3 text-[#525252] tabular-nums text-xs">
                      {new Date(entry.createdAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#737373]">{entry.previousStock}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${
                      entry.change > 0 ? 'text-[#047857]' : entry.change < 0 ? 'text-[#B91C1C]' : 'text-[#737373]'
                    }`}>
                      <span className="inline-flex items-center gap-1">
                        {entry.change > 0 ? <TrendingUp size={12} /> : entry.change < 0 ? <TrendingDown size={12} /> : null}
                        {entry.change > 0 ? '+' : ''}{entry.change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#1A1A1A]">{entry.newStock}</td>
                    <td className="px-4 py-3 text-[#525252] text-xs">
                      {REASON_LABELS[entry.reason] ?? entry.reason}
                    </td>
                    <td className="px-4 py-3 text-[#737373] text-xs max-w-[180px] truncate" title={entry.notes ?? ''}>
                      {entry.notes || '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#E5E4E1] text-sm text-[#737373] flex-shrink-0">
            <span>{total} wpisów</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                ←
              </button>
              <span className="px-2 py-1">{page} / {Math.ceil(total / LIMIT)}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="px-3 py-1 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
