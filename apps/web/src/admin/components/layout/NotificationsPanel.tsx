'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, CreditCard, AlertTriangle, Bell } from 'lucide-react'
import { useNotifications } from '../../hooks/useDashboard'
import type { AdminNotification } from '../../types/admin-api'

type NotificationsPanelProps = {
  isOpen: boolean
  onClose: () => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'przed chwilą'
  if (min < 60) return `${min} min temu`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} godz. temu`
  return `${Math.floor(h / 24)} dni temu`
}

function getDateGroup(iso: string): 'today' | 'yesterday' | 'earlier' {
  const now = new Date()
  const date = new Date(iso)

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)

  if (date >= todayStart) return 'today'
  if (date >= yesterdayStart) return 'yesterday'
  return 'earlier'
}

const dateGroupLabels: Record<ReturnType<typeof getDateGroup>, string> = {
  today: 'Dzisiaj',
  yesterday: 'Wczoraj',
  earlier: 'Wcześniej',
}

const typeConfig: Record<
  AdminNotification['type'],
  { bg: string; color: string; icon: React.ReactNode }
> = {
  order: {
    bg: 'bg-[#EFF6FF]',
    color: 'text-[#0066CC]',
    icon: <ShoppingCart size={16} />,
  },
  payment: {
    bg: 'bg-[#ECFDF5]',
    color: 'text-[#059669]',
    icon: <CreditCard size={16} />,
  },
  stock: {
    bg: 'bg-[#FFFBEB]',
    color: 'text-[#D97706]',
    icon: <AlertTriangle size={16} />,
  },
}

function groupNotifications(notifications: AdminNotification[]) {
  const groups: { key: ReturnType<typeof getDateGroup>; items: AdminNotification[] }[] = []
  const groupMap = new Map<ReturnType<typeof getDateGroup>, AdminNotification[]>()

  for (const n of notifications) {
    const group = getDateGroup(n.createdAt)
    if (!groupMap.has(group)) {
      const items: AdminNotification[] = []
      groupMap.set(group, items)
      groups.push({ key: group, items })
    }
    groupMap.get(group)!.push(n)
  }

  return groups
}

export const NotificationsPanel = ({ isOpen }: NotificationsPanelProps) => {
  const { notifications, loading } = useNotifications()

  const unreadCount = notifications?.filter((n) => n.unread).length ?? 0
  const hasNotifications = notifications && notifications.length > 0
  const groups = hasNotifications ? groupNotifications(notifications) : []

  // Running index for stagger animation across all groups
  let itemIndex = 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-full mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-[#E5E4E1] max-h-[480px] overflow-hidden z-50 origin-top-right"
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#F5F4F1]">
            <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Powiadomienia</h3>
            {unreadCount > 0 && (
              <span className="bg-[#0066CC] text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                {unreadCount} {unreadCount === 1 ? 'nowe' : 'nowych'}
              </span>
            )}
          </div>

          {/* Scrollable content */}
          <div className="max-h-[340px] overflow-y-auto" data-lenis-prevent>
            {/* Loading state */}
            {loading && (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-5 py-4 flex items-start gap-3.5 border-b border-[#F5F4F1] last:border-b-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F4F1] animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="h-3.5 bg-[#F5F4F1] rounded animate-pulse w-2/3" />
                      <div className="h-3.5 bg-[#F5F4F1] rounded animate-pulse w-full" />
                      <div className="h-2.5 bg-[#F5F4F1] rounded animate-pulse w-1/4 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !hasNotifications && (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#F5F4F1] flex items-center justify-center">
                  <Bell size={32} className="text-[#A3A3A3]" />
                </div>
                <p className="text-sm text-[#A3A3A3]">Brak nowych powiadomień</p>
                <p className="text-xs text-[#D4D3D0]">Wszystko pod kontrolą</p>
              </div>
            )}

            {/* Notification groups */}
            {!loading &&
              groups.map((group) => (
                <div key={group.key}>
                  {/* Date group header */}
                  <div className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] bg-[#FAFAF9] sticky top-0 z-10">
                    {dateGroupLabels[group.key]}
                  </div>

                  {/* Notification items */}
                  {group.items.map((n) => {
                    const idx = itemIndex++
                    const config = typeConfig[n.type]

                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className={`px-5 py-4 flex items-start gap-3.5 transition-colors duration-150 hover:bg-[#F5F4F1] cursor-pointer border-b border-[#F5F4F1] last:border-b-0 ${
                          n.unread ? 'bg-[#FAFCFF] border-l-2 border-l-[#0066CC]' : ''
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}
                        >
                          {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A]">{n.title}</p>
                          <p className="text-sm text-[#737373] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-[#A3A3A3] mt-1.5">{relativeTime(n.createdAt)}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#F5F4F1] flex items-center justify-between bg-[#FAFAF9]">
            <span className="text-xs text-[#737373] hover:text-[#1A1A1A] cursor-pointer transition-colors">
              Oznacz wszystkie jako przeczytane
            </span>
            <span className="text-xs font-medium text-[#0066CC] hover:text-[#0052A3] cursor-pointer transition-colors">
              Zobacz wszystkie &rarr;
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
