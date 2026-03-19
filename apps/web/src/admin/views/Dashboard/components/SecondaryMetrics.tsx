'use client'

import { CalendarDays, Clock, Users, AlertTriangle } from 'lucide-react'
import { StatCard } from './StatCard'
import { useDashboardOverview } from '../../../hooks/useDashboard'

export const SecondaryMetrics = () => {
  const { overview, loading } = useDashboardOverview()
  const s = overview?.stats

  const lowStock = s?.lowStockProducts ?? 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '50ms' }}>
        <StatCard
          title="OBRÓT (30 DNI)"
          value={Math.round(s?.revenueMonth ?? 0)}
          suffix=" zł"
          icon={CalendarDays}
          variant="default"
          isLoading={loading}
          note="opłacone zamówienia"
        />
      </div>
      <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '100ms' }}>
        <StatCard
          title="OCZEKUJĄCE"
          value={(s?.ordersPending ?? 0) + (s?.ordersProcessing ?? 0)}
          icon={Clock}
          variant="info"
          isLoading={loading}
          note={s ? `${s.ordersPending} nowych · ${s.ordersProcessing} w realizacji` : undefined}
        />
      </div>
      <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '150ms' }}>
        <StatCard
          title="KLIENCI"
          value={s?.totalCustomers ?? 0}
          icon={Users}
          variant="success"
          isLoading={loading}
          note="zarejestrowanych"
        />
      </div>
      <div className="animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: '200ms' }}>
        <StatCard
          title="NISKI STAN"
          value={lowStock}
          suffix=" prod."
          icon={AlertTriangle}
          variant={lowStock > 0 ? 'warning' : 'success'}
          isLoading={loading}
          note={lowStock > 0 ? 'dostępność ≤ 2 szt.' : 'stan OK'}
        />
      </div>
    </div>
  )
}
