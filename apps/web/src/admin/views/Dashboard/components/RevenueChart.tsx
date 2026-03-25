'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useWeeklyRevenue } from '../../../hooks/useDashboard'

const formatPLN = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E5E4E1] rounded-xl shadow-lg px-4 py-3 min-w-[120px]">
      <p className="text-[11px] font-medium text-[#A3A3A3] mb-2 uppercase tracking-wide">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-[13px] font-semibold text-[#1A1A1A] tabular-nums">
            {(entry.value ?? 0).toLocaleString('pl-PL')}
            <span className="text-[#A3A3A3] font-normal ml-1">PLN</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export const RevenueChart = () => {
  const { revenueData, loading, error } = useWeeklyRevenue()

  const totalRevenue = revenueData?.reduce((a, b) => a + b.revenue, 0) ?? 0
  const allegroActive = revenueData?.some(d => d.allegro > 0) ?? false

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-[#1A1A1A]">Przychód</h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">Ostatnie 7 dni</p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="h-7 w-24 rounded-lg bg-[#E5E4E1] animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-[#1A1A1A]">
                {totalRevenue.toLocaleString('pl-PL')}
              </span>
              <span className="text-sm text-[#A3A3A3]">PLN</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[220px] -ml-2">
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-[#DC2626]">
            Nie udało się pobrać danych
          </div>
        ) : loading ? (
          <div className="h-full flex items-end justify-between gap-3 px-4 animate-pulse">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-[#E5E4E1]"
                style={{ height: `${30 + ((i * 17) % 50)}%` }}
              />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradShop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0} />
                </linearGradient>
                {allegroActive && (
                  <linearGradient id="gradAllegro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6200" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#FF6200" stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#F0EFEC"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A3A3A3', fontSize: 11, fontFamily: 'inherit' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#C4C3C0', fontSize: 11 }}
                tickFormatter={formatPLN}
                dx={-4}
                width={42}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#E5E4E1', strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              {allegroActive && (
                <Legend
                  formatter={(v) => (v === 'shop' ? 'Sklep' : 'Allegro')}
                  wrapperStyle={{ fontSize: 11, color: '#A3A3A3', paddingTop: 10 }}
                />
              )}

              <Area
                type="monotone"
                dataKey="shop"
                name="shop"
                stroke="#1A1A1A"
                strokeWidth={2}
                fill="url(#gradShop)"
                dot={false}
                activeDot={{ r: 5, fill: '#1A1A1A', strokeWidth: 2, stroke: '#fff' }}
              />

              {allegroActive && (
                <Area
                  type="monotone"
                  dataKey="allegro"
                  name="allegro"
                  stroke="#FF6200"
                  strokeWidth={2}
                  fill="url(#gradAllegro)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#FF6200', strokeWidth: 2, stroke: '#fff' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
