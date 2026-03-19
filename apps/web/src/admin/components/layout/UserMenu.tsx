'use client'

import { useRef, useEffect } from 'react'
import { User, Settings, HelpCircle, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

type UserMenuProps = {
  isOpen: boolean
  onClose: () => void
}

export const UserMenu = ({ isOpen, onClose }: UserMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

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
    { icon: Settings, label: 'Ustawienia', action: onClose },
    { icon: HelpCircle, label: 'Pomoc', action: onClose },
    { icon: LogOut, label: 'Wyloguj się', danger: true, action: handleLogout }
  ]

  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900">Administrator</p>
        <p className="text-sm text-gray-500">admin@ilbuoncaffe.pl</p>
      </div>
      <div className="py-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={index}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
