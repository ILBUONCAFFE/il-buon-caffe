'use client'

interface SalesQualityCardProps {
  score?: number
  maxScore?: number
  loading?: boolean
}

export const SalesQualityCard = ({
  score = 450,
  maxScore = 500,
  loading = false,
}: SalesQualityCardProps) => {
  const pct = maxScore > 0 ? score / maxScore : 0

  const color =
    pct >= 0.9 ? '#059669' :
    pct >= 0.7 ? '#1A1A1A' :
    pct >= 0.5 ? '#D97706' :
    '#DC2626'

  const label =
    pct >= 0.9 ? 'Doskonała' :
    pct >= 0.7 ? 'Dobra' :
    pct >= 0.5 ? 'Średnia' :
    'Wymaga uwagi'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Jakość sprzedaży</h2>
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-6 w-20 rounded bg-[#E5E4E1] animate-pulse" />
          <div className="h-1.5 rounded-full bg-[#E5E4E1] animate-pulse" />
        </div>
      ) : (
        <>
          {/* Score display */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span
              className="text-3xl font-bold tabular-nums tracking-tight"
              style={{ color }}
            >
              {score}
            </span>
            <span className="text-sm text-[#A3A3A3]">/ {maxScore}</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-[#E5E4E1] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct * 100}%`, backgroundColor: color }}
            />
          </div>

          {/* Breakdown hints */}
          <div className="flex justify-between mt-3 text-[11px] text-[#A3A3A3]">
            <span>Czas realizacji</span>
            <span>Zwroty</span>
            <span>Oceny</span>
          </div>
        </>
      )}
    </div>
  )
}
