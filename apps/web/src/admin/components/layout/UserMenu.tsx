'use client'

import { User, Settings, HelpCircle, LogOut, Palette, ChevronRight, Store, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

type UserMenuProps = {
  isOpen: boolean
  onClose: () => void
}

export const UserMenu = ({ isOpen, onClose }: UserMenuProps) => {
  const router = useRouter()

  const handleLogout = async () => {
    onClose()
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (response.ok) {
        router.push('/admin/login')
      }
    } catch {
      router.push('/admin/login')
    }
  }

  const menuItems = [
    { icon: User, label: 'Mój profil', action: onClose },
    { icon: Palette, label: 'Wygląd', action: onClose, hasChevron: true },
    {
      icon: Settings,
      label: 'Ustawienia',
      action: () => {
        onClose()
        router.push('/admin/settings')
      },
    },
    { icon: HelpCircle, label: 'Pomoc i wsparcie', action: onClose },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-full mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-[#E5E4E1] overflow-hidden z-50 origin-top-right"
        >
          {/* Profile header */}
          <div className="px-5 py-4 flex items-center gap-3.5 border-b border-[#F5F4F1] bg-[#FAFAF9]">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004499] flex items-center justify-center text-white font-semibold text-base shrink-0">
              A
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#1A1A1A]">Admin</p>
              <p className="text-sm text-[#737373]">kontakt@ilbuoncaffe.pl</p>
              <span className="text-[11px] text-[#0066CC] bg-[#EEF4FF] px-2 py-0.5 rounded-md font-medium mt-1 inline-block">
                Administrator
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2 px-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02, duration: 0.15 }}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-[#525252] transition-all duration-150 hover:bg-[#F5F4F1] hover:text-[#1A1A1A]"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} />
                    {item.label}
                  </span>
                  {item.hasChevron && <ChevronRight size={14} className="text-[#A3A3A3]" />}
                </motion.button>
              )
            })}
          </div>

          {/* Shop link */}
          <a
            href="https://ilbuoncaffe.pl"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-3 my-2 px-3 py-3 rounded-xl bg-[#FAFAF9] border border-[#F5F4F1] flex items-center gap-3 hover:bg-[#F5F4F1] cursor-pointer transition-colors duration-150"
          >
            <Store size={16} className="text-[#737373] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A]">Il Buon Caffe</p>
              <p className="text-xs text-[#A3A3A3]">ilbuoncaffe.pl</p>
            </div>
            <ExternalLink size={12} className="text-[#A3A3A3] shrink-0" />
          </a>

          {/* Logout */}
          <div className="px-2 py-2 border-t border-[#F5F4F1]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors duration-150"
            >
              <LogOut size={16} />
              Wyloguj się
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
