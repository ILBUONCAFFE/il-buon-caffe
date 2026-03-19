'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type GlassModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const GlassModal = ({ isOpen, onClose, title, children }: GlassModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <div className="absolute inset-0 rounded-3xl border border-white/40 pointer-events-none" />
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100/50">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100/50 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  )
}
