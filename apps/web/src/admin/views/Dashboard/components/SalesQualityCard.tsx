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

  // SVG ring parameters
  const R  = 32
  const cx = 44
  const cy = 44
  const circumference = 2 * Math.PI * R
  const dashOffset    = circumference * (1 - pct)

  const color =
    pct >= 0.9 ? '#059669' :
    pct >= 0.7 ? '#0066CC' :
    pct >= 0.5 ? '#F59E0B' :
    '#DC2626'

  const bgColor =
    pct >= 0.9 ? 'bg-[#ECFDF5]' :
    pct >= 0.7 ? 'bg-[#EFF6FF]' :
    pct >= 0.5 ? 'bg-[#FFFBEB]' :
    'bg-[#FEF2F2]'

  const label =
    pct >= 0.9 ? 'Doskonała' :
    pct >= 0.7 ? 'Dobra' :
    pct >= 0.5 ? 'Średnia' :
    'Wymaga uwagi'

  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-h3 text-[#1A1A1A]">Jakość sprzedaży</h3>
          <p className="text-sm text-[#737373] mt-0.5">Ocena łączna</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${bgColor}`}
          style={{ color }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          {loading ? (
            <div className="w-[88px] h-[88px] rounded-full bg-[#E5E4E1] animate-pulse" />
          ) : (
            <svg width={88} height={88} viewBox="0 0 88 88">
              {/* Track */}
              <circle
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke="#E5E4E1"
                strokeWidth={8}
              />
              {/* Progress */}
              <circle
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke={color}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
          )}
          {/* Center text */}
          {!loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-mono font-bold leading-none" style={{ color }}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Score details */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <>
              <div className="h-7 w-24 bg-[#E5E4E1] rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-[#E5E4E1] rounded animate-pulse" />
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold text-[#1A1A1A]">{score}</span>
                <span className="text-sm text-[#737373]">/ {maxScore} pkt</span>
              </div>
              {/* Mini progress bar */}
              <div className="mt-3 h-1.5 bg-[#E5E4E1] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct * 100}%`, backgroundColor: color }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
