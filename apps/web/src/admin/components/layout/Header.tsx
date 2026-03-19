'use client'

import { useState } from 'react'
import { Search, Bell, Command, ChevronDown } from 'lucide-react'
import { NotificationsPanel } from './NotificationsPanel'
import { UserMenu } from './UserMenu'

type HeaderProps = {
  onOpenCommandPalette: () => void
}

export const Header = ({ onOpenCommandPalette }: HeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-[#E5E4E1] bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div>
        <h1 className="text-h1 text-[#1A1A1A]">Pulpit</h1>
        <p className="text-sm text-[#737373] mt-1">Il Buon Caffe &mdash; Panel administracyjny</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors"
        >
          <Search size={16} className="text-[#A3A3A3]" />
          <span className="text-sm text-[#A3A3A3]">Szukaj...</span>
          <kbd className="flex items-center gap-0.5 text-xs text-[#A3A3A3] bg-[#F5F4F1] px-2 py-1 rounded">
            <Command size={10} />K
          </kbd>
        </button>

        <div className="relative">
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false) }}
            className="relative p-3 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors"
          >
            <Bell size={20} className="text-[#525252]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#DC2626] rounded-full" />
          </button>
          <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        </div>

        <div className="relative">
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false) }}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-xl bg-white border border-[#E5E4E1] hover:border-[#D4D3D0] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0066CC] to-[#0088FF] flex items-center justify-center text-white font-semibold text-sm">
              A
            </div>
            <ChevronDown size={14} className="text-[#737373]" />
          </button>
          <UserMenu isOpen={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
        </div>
      </div>
    </header>
  )
}
