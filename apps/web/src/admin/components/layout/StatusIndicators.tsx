'use client'

import { useState } from 'react'
import { useAllegroStatus, useDashboardOverview } from '../../hooks/useDashboard'

// ── Status dot config ────────────────────────────────────────────────────────

interface IndicatorConfig {
  key: string
  label: string
  dotClass: string
  tooltip: string
}

function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return ''
  try {
    const date = new Date(expiresAt)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `Token ważny do ${day}.${month}`
  } catch {
    return ''
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function StatusIndicators() {
  const { allegroStatus, loading: allegroLoading } = useAllegroStatus()
  const { overview, loading: overviewLoading } = useDashboardOverview()

  const loading = allegroLoading || overviewLoading

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D4D3D0] animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  // Build indicator configs from live data
  const indicators: IndicatorConfig[] = []

  // Allegro
  if (allegroStatus) {
    const connected = allegroStatus.connected && allegroStatus.tokenValid
    indicators.push({
      key: 'allegro',
      label: 'Allegro',
      dotClass: connected ? 'bg-[#059669]' : 'bg-[#DC2626] animate-pulse',
      tooltip: connected
        ? allegroStatus.expiresAt
          ? formatExpiryDate(allegroStatus.expiresAt)
          : 'Allegro: Połączony'
        : 'Allegro: Token wygasł',
    })
  } else {
    indicators.push({
      key: 'allegro',
      label: 'Allegro',
      dotClass: 'bg-[#D4D3D0]',
      tooltip: 'Allegro: Brak połączenia',
    })
  }

  // Sync — static idle for now
  indicators.push({
    key: 'sync',
    label: 'Sync',
    dotClass: 'bg-[#D4D3D0]',
    tooltip: 'Synchronizacja: Nieaktywna',
  })

  // Orders
  const pending = overview?.stats.ordersPending ?? 0
  indicators.push({
    key: 'orders',
    label: 'Zamówienia',
    dotClass: pending > 0 ? 'bg-[#D97706]' : 'bg-[#059669]',
    tooltip: pending > 0
      ? `${pending} ${pending === 1 ? 'zamówienie do realizacji' : pending < 5 ? 'zamówienia do realizacji' : 'zamówień do realizacji'}`
      : 'Brak zamówień do realizacji',
  })

  return (
    <div className="group flex items-center gap-4">
      {indicators.map(({ key, ...rest }) => (
        <StatusDot key={key} {...rest} />
      ))}
    </div>
  )
}

// ── Individual dot with tooltip ──────────────────────────────────────────────

function StatusDot({ label, dotClass, tooltip }: IndicatorConfig) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative flex items-center gap-1.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span className="text-xs text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none">
        {label}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#1A1A1A] text-white text-xs shadow-lg whitespace-nowrap pointer-events-none z-50">
          {tooltip}
        </div>
      )}
    </div>
  )
}
