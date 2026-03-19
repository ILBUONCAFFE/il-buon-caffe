'use client'

import { useRef, useEffect } from 'react'
import { notifications } from '../../data/adminMockData'

type NotificationsPanelProps = {
  isOpen: boolean
  onClose: () => void
}

export const NotificationsPanel = ({ isOpen, onClose }: NotificationsPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => n.unread).length

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Powiadomienia</h3>
        {unreadCount > 0 && (
          <span className="bg-[#0066CC] text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} nowe</span>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${notification.unread ? 'bg-blue-50/50' : ''}`}
          >
            <div className="flex items-start gap-3">
              {notification.unread && <span className="w-2 h-2 mt-2 bg-[#0066CC] rounded-full flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                <p className="text-gray-500 text-sm truncate">{notification.message}</p>
                <p className="text-gray-400 text-xs mt-1">{notification.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-gray-100">
        <button className="w-full text-center text-sm text-[#0066CC] hover:text-[#0052A3] font-medium">
          Zobacz wszystkie powiadomienia
        </button>
      </div>
    </div>
  )
}
