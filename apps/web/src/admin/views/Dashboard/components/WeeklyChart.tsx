'use client'

import { useWeeklyStats } from '../../../hooks/useDashboard'

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

export const WeeklyChart = () => {
  const { weeklyData, loading, error } = useWeeklyStats()
  const maxVal = weeklyData ? Math.max(...weeklyData.map(d => d.value), 1) : 1
  const total = weeklyData?.reduce((a, b) => a + b.value, 0) ?? 0

  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-h3 text-[#1A1A1A]">Ten tydzień</h3>
          <p className="text-sm text-[#737373] mt-1">Sprzedaż dzienna</p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="h-8 w-12 rounded bg-[#E5E4E1] animate-pulse" />
          ) : (
            <span className="text-2xl font-mono font-bold text-[#059669]">{total}</span>
          )}
          <p className="text-xs text-[#737373]">zamówień</p>
        </div>
      </div>

      <div className="h-[200px] flex items-end justify-between gap-2 px-2">
        {error ? (
          <p className="w-full text-center text-sm text-[#DC2626] self-center">{error}</p>
        ) : loading ? (
          DAYS.map((d) => (
            <div key={d} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full rounded-t-lg bg-[#E5E4E1] animate-pulse" style={{ height: '60px' }} />
              <span className="text-xs text-[#737373]">{d}</span>
            </div>
          ))
        ) : (
          (weeklyData ?? []).map((day) => {
            const isMax = day.value === maxVal
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                  style={{
                    height: `${(day.value / maxVal) * 150}px`,
                    backgroundColor: isMax ? '#0066CC' : '#D4D3D0'
                  }}
                />
                <span className="text-xs text-[#737373]">{day.day}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
