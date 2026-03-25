'use client'

import { DashboardGreeting } from './components/DashboardGreeting'
import { HeroMetrics } from './components/HeroMetrics'
import { AlertStrip } from './components/AlertStrip'
import { RevenueChart } from './components/RevenueChart'
import { OrdersTable } from './components/OrdersTable'
import { ActivityFeed } from './components/ActivityFeed'
import { AllegroStatusCard } from './components/AllegroStatusCard'
import { SalesQualityCard } from './components/SalesQualityCard'

export const DashboardView = () => {
  return (
    <>
      <DashboardGreeting />
      <HeroMetrics />
      <AlertStrip />
      <RevenueChart />
      <OrdersTable />

      {/* Bottom row: secondary info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 pt-8 border-t border-[#E5E4E1]">
        <ActivityFeed />
        <AllegroStatusCard />
        <SalesQualityCard />
      </div>
    </>
  )
}
