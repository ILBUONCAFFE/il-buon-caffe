'use client'

import {
  DollarSign, UserPlus, Receipt, PackageCheck, CheckCircle2, Clock, ShoppingBag,
} from 'lucide-react'
import { useActivityFeed } from '../../../hooks/useDashboard'

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  sale:     { icon: DollarSign,   color: 'text-[#059669]' },
  register: { icon: UserPlus,     color: 'text-[#0066CC]' },
  invoice:  { icon: Receipt,      color: 'text-[#D97706]' },
  shipment: { icon: PackageCheck, color: 'text-[#0284C7]' },
  payment:  { icon: CheckCircle2, color: 'text-[#059669]' },
  allegro:  { icon: ShoppingBag,  color: 'text-[#EA580C]' },
}

const DEFAULT_ICON = { icon: Clock, color: 'text-[#A3A3A3]' }

export const ActivityFeed = () => {
  const { activities, loading, error } = useActivityFeed(8)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Aktywność</h2>
        <a
          href="/admin/activity"
          className="text-sm text-[#737373] hover:text-[#0066CC] transition-colors"
        >
          Historia →
        </a>
      </div>

      <div className="space-y-0.5">
        {error ? (
          <p className="text-sm text-[#DC2626] py-4 text-center">{error}</p>
        ) : loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
              <div className="w-4 h-4 rounded bg-[#E5E4E1] shrink-0" />
              <div className="h-3.5 bg-[#E5E4E1] rounded flex-1" />
              <div className="h-3 bg-[#E5E4E1] rounded w-10" />
            </div>
          ))
        ) : (activities ?? []).length === 0 ? (
          <p className="text-sm text-[#737373] py-4 text-center">Brak aktywności</p>
        ) : (
          (activities ?? []).map((activity) => {
            const { icon: Icon, color } = ACTIVITY_ICONS[activity.type] ?? DEFAULT_ICON
            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 py-2.5 group"
              >
                <Icon size={14} className={`shrink-0 ${color}`} />
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span className="text-sm text-[#1A1A1A] truncate">
                    {activity.text}
                  </span>
                  {activity.amount && (
                    <span className="text-xs font-mono font-medium text-[#059669] shrink-0">
                      {activity.amount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#A3A3A3] tabular-nums shrink-0">
                  {activity.time}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
