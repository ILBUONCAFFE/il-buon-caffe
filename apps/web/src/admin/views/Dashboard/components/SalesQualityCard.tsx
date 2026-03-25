'use client'

import Link from 'next/link'
import { RefreshCw, Loader2, Link2Off, AlertCircle } from 'lucide-react'
import { useSalesQuality } from '../../../hooks/useDashboard'

function formatFetchedAt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  if (diffH < 1) return 'przed chwilą'
  if (diffH < 24) return `${diffH}h temu`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return `wczoraj ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
  return `${diffD} dni temu`
}

function qualityLabel(pct: number): { label: string; color: string } {
  if (pct >= 0.9) return { label: 'Doskonała',     color: '#059669' }
  if (pct >= 0.7) return { label: 'Dobra',         color: '#1A1A1A' }
  if (pct >= 0.5) return { label: 'Średnia',       color: '#D97706' }
  return           { label: 'Wymaga uwagi',         color: '#DC2626' }
}

export const SalesQualityCard = () => {
  const { quality, loading, error, refetch } = useSalesQuality()

  const pct    = quality ? quality.score / quality.maxScore : 0
  const ql     = qualityLabel(pct)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Jakość sprzedaży</h2>
        <div className="flex items-center gap-2">
          {quality && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-medium" style={{ color: ql.color }}>
                {ql.label}
              </span>
              {quality.grade && (
                <span className="text-[10px] text-[#A3A3A3] font-normal leading-none">
                  {quality.grade === 'SUPER_SELLER' ? 'Super Sprzedawca' : quality.grade}
                </span>
              )}
            </div>
          )}
          {loading ? (
            <Loader2 size={14} className="text-[#A3A3A3] animate-spin" />
          ) : (
            <button
              onClick={refetch}
              disabled={loading}
              title="Odśwież"
              className="p-1 rounded hover:bg-[#F5F4F1] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw size={12} className="text-[#A3A3A3]" />
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-8 w-24 rounded bg-[#E5E4E1] animate-pulse" />
          <div className="h-1.5 rounded-full bg-[#E5E4E1] animate-pulse" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-full rounded bg-[#E5E4E1] animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-[#E5E4E1] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not connected */}
      {!loading && !error && !quality && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#737373]">
            <Link2Off size={14} className="text-[#A3A3A3]" />
            <span>Nie połączono z Allegro</span>
          </div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0066CC] transition-colors"
          >
            Zarządzaj połączeniem →
          </Link>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#DC2626]">
            <AlertCircle size={14} />
            <span>Nie udało się pobrać danych</span>
          </div>
          <button
            onClick={refetch}
            className="text-sm text-[#737373] hover:text-[#1A1A1A] transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Data */}
      {!loading && !error && quality && (
        <>
          {/* Score + progress */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: ql.color }}>
              {quality.score}
            </span>
            <span className="text-sm text-[#A3A3A3]">/ {quality.maxScore}</span>
          </div>
          <div className="h-1.5 bg-[#E5E4E1] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct * 100}%`, backgroundColor: ql.color }}
            />
          </div>

          {/* 3-column breakdown */}
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            {/* Fulfillment */}
            <div>
              <p className="text-[#A3A3A3] mb-1">Czas realizacji</p>
              <p className="font-semibold text-[#1A1A1A] tabular-nums">
                {quality.fulfillment.onTimePercent.toFixed(1)}%
              </p>
            </div>
            {/* Returns */}
            <div>
              <p className="text-[#A3A3A3] mb-1">Zwroty</p>
              <p className="font-semibold text-[#1A1A1A] tabular-nums">{quality.returns.count}</p>
              <p className="text-[#A3A3A3] tabular-nums">({quality.returns.ratePercent.toFixed(1)}%)</p>
            </div>
            {/* Ratings */}
            <div>
              <p className="text-[#A3A3A3] mb-1">Oceny</p>
              <p className="font-semibold text-[#059669] tabular-nums">{quality.ratings.positive} ✓</p>
              <p className="font-semibold text-[#DC2626] tabular-nums">{quality.ratings.negative} ✗</p>
              <p className="text-[#A3A3A3] tabular-nums">({quality.ratings.negativePercent.toFixed(1)}%)</p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="mt-3 text-[10px] text-[#A3A3A3]">
            Dane z: {formatFetchedAt(quality.fetchedAt)}
          </p>
        </>
      )}
    </div>
  )
}
