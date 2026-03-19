'use client'

import { Wallet, ShoppingCart, AlertTriangle } from 'lucide-react'
import { MetricCard } from './components/MetricCard'
import { StatCard } from './components/StatCard'
import { RevenueChart } from './components/RevenueChart'
import { WeeklyChart } from './components/WeeklyChart'
import { OrdersTable } from './components/OrdersTable'
import { ActivityFeed } from './components/ActivityFeed'
import { AllegroStatusCard } from './components/AllegroStatusCard'
import { QuickActions } from './components/QuickActions'
import { SalesQualityCard } from './components/SalesQualityCard'
import { useDashboardStats, useDashboardOverview } from '../../hooks/useDashboard'

const formatChange = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const trendOf = (v: number): 'up' | 'down' => (v >= 0 ? 'up' : 'down')

export const DashboardView = () => {
  const { stats, loading } = useDashboardStats()
  const { overview, loading: overviewLoading } = useDashboardOverview()
  const lowStock = overview?.stats.lowStockProducts ?? 0

  return (
    <>
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '0ms' }}>
          <MetricCard
            title="DZISIEJSZY OBRÓT"
            value={`${Math.round(stats?.todayRevenue ?? 0)} zł`}
            change={stats ? formatChange(stats.revenueChange) : '—'}
            trend={stats ? trendOf(stats.revenueChange) : 'up'}
            icon={Wallet} bgColor="bg-[#EFF6FF]" iconColor="text-[#0066CC]"
            isAnimated={!loading}
          />
        </div>
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '100ms' }}>
          <MetricCard
            title="ZAMÓWIENIA DZISIAJ"
            value={String(stats?.todayOrders ?? 0)}
            change={stats ? formatChange(stats.ordersChange) : '—'}
            trend={stats ? trendOf(stats.ordersChange) : 'up'}
            icon={ShoppingCart} bgColor="bg-[#ECFDF5]" iconColor="text-[#059669]"
            isAnimated={!loading}
          />
        </div>
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '150ms' }}>
          <MetricCard
            title="ŚR. WARTOŚĆ ZAM."
            value={`${Math.round(stats?.avgOrderValue ?? 0)} zł`}
            change={stats ? formatChange(stats.avgOrderValueChange) : '—'}
            trend={stats ? trendOf(stats.avgOrderValueChange) : 'up'}
            icon={ShoppingCart} bgColor="bg-[#F0F9FF]" iconColor="text-[#0284C7]"
            isAnimated={!loading}
          />
        </div>
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '200ms' }}>
          <StatCard
            title="NISKI STAN"
            value={lowStock}
            suffix=" prod."
            icon={AlertTriangle}
            variant={lowStock > 0 ? 'warning' : 'success'}
            isLoading={overviewLoading}
            note={lowStock > 0 ? 'dostępność ≤ 2 szt.' : 'stan OK'}
          />
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2"><RevenueChart /></div>
        <WeeklyChart />
      </div>

      {/* Row 3: Allegro status + Sales quality + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
        <AllegroStatusCard />
        <SalesQualityCard score={450} maxScore={500} />
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
      </div>

      {/* Row 4: Orders + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <OrdersTable />
        <ActivityFeed />
      </div>
    </>
  )
}


