'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts'
import { useWeeklyRevenue } from '../../../hooks/useDashboard'

export const RevenueChart = () => {
  const { revenueData, loading, error } = useWeeklyRevenue()

  const totalRevenue  = revenueData?.reduce((a, b) => a + b.revenue, 0) ?? 0
  const allegroActive = revenueData?.some(d => d.allegro > 0) ?? false
  const maxRevenue    = revenueData ? Math.max(...revenueData.map(d => d.revenue), 1) : 1

  const formatPLN = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)

  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-h3 text-[#1A1A1A]">Przychód ze sprzedaży</h3>
          <p className="text-sm text-[#737373] mt-1">Ostatnie 7 dni · według daty płatności</p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="h-8 w-24 rounded bg-[#E5E4E1] animate-pulse" />
          ) : (
            <span className="text-2xl font-mono font-bold text-[#0066CC]">
              {totalRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 0 })}
              <span className="text-sm font-normal text-[#737373] ml-1">PLN</span>
            </span>
          )}
          <p className="text-xs text-[#737373]">łącznie</p>
        </div>
      </div>

      <div className="h-[240px]">
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-[#DC2626]">
            Nie udało się pobrać danych — {error}
          </div>
        ) : loading ? (
          <div className="h-full flex items-end justify-between gap-2 px-2 animate-pulse">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-[#E5E4E1]"
                style={{ height: `${35 + (i % 4) * 15}%` }}
              />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData ?? []} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E1" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
                tickFormatter={formatPLN}
                dx={-6}
              />
              <Tooltip
                cursor={{ fill: '#F5F4F1' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E4E1',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  padding: '10px 14px',
                }}
                formatter={(value, name) => [
                  `${((value as number) ?? 0).toLocaleString('pl-PL')} PLN`,
                  (name as string) === 'shop' ? 'Sklep' : 'Allegro',
                ] as [string, string]}
              />
              {allegroActive && (
                <Legend
                  formatter={(v) => v === 'shop' ? 'Sklep' : 'Allegro'}
                  wrapperStyle={{ fontSize: 12, color: '#737373', paddingTop: 8 }}
                />
              )}

              {/* Sklep — zawsze widoczny */}
              <Bar dataKey="shop" stackId="rev" name="shop" radius={allegroActive ? [0, 0, 0, 0] : [6, 6, 0, 0]}>
                {(revenueData ?? []).map((entry) => (
                  <Cell
                    key={entry.day}
                    fill={!allegroActive && entry.revenue === maxRevenue ? '#0066CC' : '#3385D6'}
                  />
                ))}
              </Bar>

              {/* Allegro — widoczny tylko gdy są dane z Allegro */}
              {allegroActive && (
                <Bar dataKey="allegro" stackId="rev" name="allegro" radius={[6, 6, 0, 0]} fill="#FF6200" />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
