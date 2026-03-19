'use client'

import {
  DollarSign, UserPlus, Receipt, PackageCheck, CheckCircle2, Clock, ShoppingBag
} from 'lucide-react'
import { OrganicIcon } from '../../../components/ui/OrganicIcon'
import { useActivityFeed } from '../../../hooks/useDashboard'

const getActivityStyle = (type: string) => {
  switch (type) {
    case 'sale':     return { icon: DollarSign,   bgColor: 'bg-[#ECFDF5]', iconColor: 'text-[#059669]' }
    case 'register': return { icon: UserPlus,     bgColor: 'bg-[#EFF6FF]', iconColor: 'text-[#0066CC]' }
    case 'invoice':  return { icon: Receipt,      bgColor: 'bg-[#FFFBEB]', iconColor: 'text-[#D97706]' }
    case 'shipment': return { icon: PackageCheck, bgColor: 'bg-[#F0F9FF]', iconColor: 'text-[#0284C7]' }
    case 'payment':  return { icon: CheckCircle2, bgColor: 'bg-[#ECFDF5]', iconColor: 'text-[#059669]' }
    case 'allegro':  return { icon: ShoppingBag,  bgColor: 'bg-[#FFF7ED]', iconColor: 'text-[#EA580C]' }
    default:         return { icon: Clock,        bgColor: 'bg-[#F5F5F5]', iconColor: 'text-[#737373]' }
  }
}

export const ActivityFeed = () => {
  const { activities, loading, error } = useActivityFeed(10)

  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-h3 text-[#1A1A1A]">Aktywność</h3>
        <button className="btn-ghost">Historia →</button>
      </div>

      <div className="space-y-3">
        {error ? (
          <p className="text-sm text-[#DC2626] py-4 text-center">{error}</p>
        ) : loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-start gap-4 p-3 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-[#E5E4E1] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#E5E4E1] rounded w-1/2" />
                <div className="h-3 bg-[#E5E4E1] rounded w-3/4" />
              </div>
            </div>
          ))
        ) : (activities ?? []).length === 0 ? (
          <p className="text-sm text-[#737373] py-4 text-center">Brak aktywności</p>
        ) : (
          (activities ?? []).map((activity) => {
            const { icon: Icon, bgColor, iconColor } = getActivityStyle(activity.type)
            return (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-[#F5F4F1] transition-colors">
                <OrganicIcon icon={Icon} bgColor={bgColor} iconColor={iconColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1A1A1A]">{activity.text}</p>
                  <p className="text-sm text-[#737373]">{activity.subtext}</p>
                </div>
                <div className="text-right">
                  {activity.amount && (
                    <p className="font-mono font-semibold text-[#059669] text-sm">{activity.amount}</p>
                  )}
                  <p className="text-xs text-[#737373]">{activity.time}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
