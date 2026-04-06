'use client'

import { useState, useEffect } from 'react'
import { Bell, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Breadcrumb } from './Breadcrumb'
import { StatusIndicators } from './StatusIndicators'
import { SearchButton } from './SearchButton'
import { NotificationsPanel } from './NotificationsPanel'
import { UserMenu } from './UserMenu'
import { QuickActions, hasQuickActions } from './QuickActions'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useNotifications } from '../../hooks/useDashboard'

type HeaderProps = {
  onOpenCommandPalette: () => void
}

export const Header = ({ onOpenCommandPalette }: HeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const currentPathname = pathname || '/admin'

  const { notifications } = useNotifications()
  const unreadCount = notifications?.filter(n => n.unread).length ?? 0

  // Scroll shadow detection
  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 0)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const notificationsRef = useClickOutside<HTMLDivElement>(() => {
    if (notificationsOpen) setNotificationsOpen(false)
  })

  const userMenuRef = useClickOutside<HTMLDivElement>(() => {
    if (userMenuOpen) setUserMenuOpen(false)
  })

  const showQuickActions = hasQuickActions(currentPathname)

  return (
    <header
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E5E4E1] transition-shadow duration-300"
      style={isScrolled ? { boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' } : undefined}
    >
      {/* Row 1: Navigation & Controls */}
      <div className="flex items-center justify-between px-8 py-4">
        {/* Left: Breadcrumb */}
        <Breadcrumb />

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <StatusIndicators />

          {/* Separator */}
          <div className="w-px h-6 bg-[#E5E4E1] mx-1" />

          <SearchButton onOpen={onOpenCommandPalette} />

          {/* Notifications bell + dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false) }}
              aria-label="Powiadomienia"
              aria-expanded={notificationsOpen}
              className="relative p-2.5 rounded-xl bg-[#F5F4F1] border border-transparent hover:bg-white hover:border-[#E5E4E1] hover:shadow-sm hover:-translate-y-[0.5px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] focus-visible:ring-2 focus-visible:ring-[#0066CC]/20 focus-visible:outline-none"
            >
              <Bell size={20} className="text-[#525252]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          </div>

          {/* User avatar + dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false) }}
              aria-label="Menu profilu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-3 p-1.5 pr-4 rounded-xl bg-[#F5F4F1] border border-transparent hover:bg-white hover:border-[#E5E4E1] hover:shadow-sm hover:-translate-y-[0.5px] active:translate-y-0 active:shadow-none transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] focus-visible:ring-2 focus-visible:ring-[#0066CC]/20 focus-visible:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0066CC] to-[#004499] flex items-center justify-center text-white font-semibold text-sm shadow-inner">
                A
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-[#1A1A1A]">Admin</span>
                <span className="text-[11px] text-[#A3A3A3]">Administrator</span>
              </div>
              <ChevronDown size={12} className={`text-[#A3A3A3] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <UserMenu isOpen={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
          </div>
        </div>
      </div>

      {/* Row 2: Quick Actions (conditional) */}
      <AnimatePresence>
        {showQuickActions && <QuickActions pathname={currentPathname} />}
      </AnimatePresence>
    </header>
  )
}
