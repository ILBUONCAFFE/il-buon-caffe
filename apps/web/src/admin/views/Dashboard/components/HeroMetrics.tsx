'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { useAnimatedCounter } from '../../../hooks/useAnimatedCounter'
import { useDashboardStats } from '../../../hooks/useDashboard'

const formatChange = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

const Metric = ({
  label,
  value,
  suffix,
  change,
  isLoading,
  accent = false,
}: {
  label: string
  value: number
  suffix?: string
  change?: number
  isLoading: boolean
  accent?: boolean
}) => {
  const animated = useAnimatedCounter(value)
  const display = isLoading ? 0 : animated
  const isUp = (change ?? 0) >= 0

  return (
    <div className="min-w-0">
      {isLoading ? (
        <>
          <div className="h-10 w-28 rounded bg-[#E5E4E1] animate-pulse mb-2" />
          <div className="h-4 w-20 rounded bg-[#E5E4E1] animate-pulse" />
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-[2.5rem] leading-none font-bold tracking-tight tabular-nums ${
                accent ? 'text-[#0066CC]' : 'text-[#1A1A1A]'
              }`}
            >
              {display.toLocaleString('pl-PL')}
            </span>
            {suffix && (
              <span className="text-lg text-[#737373] font-normal">{suffix}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-[#737373]">{label}</span>
            {change !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  isUp ? 'text-[#059669]' : 'text-[#DC2626]'
                }`}
              >
                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatChange(change)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export const HeroMetrics = () => {
  const { stats, loading } = useDashboardStats()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 mb-8 pb-8 border-b border-[#E5E4E1]">
      <Metric
        label="przychód dziś"
        value={Math.round(stats?.todayRevenue ?? 0)}
        suffix="zł"
        change={stats?.revenueChange}
        isLoading={loading}
        accent
      />
      <Metric
        label="zamówienia dziś"
        value={stats?.todayOrders ?? 0}
        change={stats?.ordersChange}
        isLoading={loading}
      />
      <Metric
        label="średnia wartość"
        value={Math.round(stats?.avgOrderValue ?? 0)}
        suffix="zł"
        change={stats?.avgOrderValueChange}
        isLoading={loading}
      />
    </div>
  )
}
