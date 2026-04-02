'use client'

import { useState } from 'react'
import { Search, Bell, Command, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { NotificationsPanel } from './NotificationsPanel'
import { UserMenu } from './UserMenu'
import { useClickOutside } from '../../hooks/useClickOutside'

type HeaderProps = {
  onOpenCommandPalette: () => void
}

const getRouteDetails = (pathname: string) => {
  if (pathname.includes('/admin/orders')) return { title: 'Zamówienia', subtitle: 'Zarządzanie zamówieniami' }
  if (pathname.includes('/admin/products')) return { title: 'Produkty', subtitle: 'Katalog produktów' }
  if (pathname.includes('/admin/customers')) return { title: 'Klienci', subtitle: 'Zarządzanie bazą klientów' }
  if (pathname.includes('/admin/promotions')) return { title: 'Promocje', subtitle: 'Kody rabatowe i zniżki' }
  if (pathname.includes('/admin/cms')) return { title: 'Cms', subtitle: 'Zarządzanie treścią' }
  if (pathname.includes('/admin/allegro')) return { title: 'Allegro', subtitle: 'Integracja z marketplace' }
  if (pathname.includes('/admin/settings')) return { title: 'Ustawienia', subtitle: 'Konfiguracja sklepu' }
  
  return { title: 'Pulpit', subtitle: 'Podsumowanie najważniejszych danych' }
}

export const Header = ({ onOpenCommandPalette }: HeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()

  const routeDetails = getRouteDetails(pathname || '')

  // Close notifications when clicking outside
  const notificationsRef = useClickOutside<HTMLDivElement>(() => {
    if (notificationsOpen) setNotificationsOpen(false)
  })

  // Close user menu when clicking outside
  const userMenuRef = useClickOutside<HTMLDivElement>(() => {
    if (userMenuOpen) setUserMenuOpen(false)
  })

  return (
    <header className="flex items-center justify-between px-8 h-20 border-b border-[#E5E4E1] bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div>
        <h1 className="text-h1 text-[#1A1A1A]">{routeDetails.title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm font-medium text-[#A3A3A3]">Il Buon Caffe</p>
          <span className="text-sm text-[#D4D3D0]">/</span>
          <p className="text-sm text-[#737373]">{routeDetails.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          aria-label="Szukaj w panelu"
          className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
        >
          <Search size={16} className="text-[#A3A3A3]" />
          <span className="text-sm text-[#A3A3A3]">Szukaj...</span>
          <kbd className="flex items-center gap-0.5 text-xs font-medium text-[#A3A3A3] bg-[#F5F4F1] px-2 py-1 rounded">
            <Command size={10} />K
          </kbd>
        </button>

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false) }}
            aria-label="Powiadomienia"
            aria-expanded={notificationsOpen}
            className="relative p-3 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
          >
            <Bell size={20} className="text-[#525252]" />
            {/* Mock condition - later driven by real data state */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#DC2626] rounded-full ring-2 ring-white" />
          </button>
          <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false) }}
            aria-label="Menu profilu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0066CC] to-[#0088FF] flex items-center justify-center text-white font-semibold text-sm">
              A
            </div>
            <ChevronDown size={14} className={`text-[#737373] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          <UserMenu isOpen={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
        </div>
      </div>
    </header>
  )
}
