'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Zap, ShoppingCart, UserPlus, Receipt, Package, Users, DollarSign, BarChart3, Settings } from 'lucide-react'

const searchActions = [
  { id: 1, icon: ShoppingCart, label: 'Nowe zamówienie', category: 'Akcje' },
  { id: 2, icon: UserPlus, label: 'Dodaj klienta', category: 'Akcje' },
  { id: 3, icon: Receipt, label: 'Wystaw fakturę', category: 'Akcje' },
  { id: 4, icon: Package, label: 'Stan magazynu', category: 'Nawigacja' },
  { id: 5, icon: Users, label: 'Baza klientów', category: 'Nawigacja' },
  { id: 6, icon: DollarSign, label: 'Transakcje', category: 'Nawigacja' },
  { id: 7, icon: BarChart3, label: 'Raporty sprzedaży', category: 'Raporty' },
  { id: 8, icon: Settings, label: 'Ustawienia', category: 'System' }
]

type CommandPaletteProps = {
  isOpen: boolean
  onClose: () => void
}

export const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredActions = searchActions.filter(action =>
    action.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filteredActions[selectedIndex]) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredActions.length, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIndex(0) }}
            placeholder="Szukaj akcji, klientów, zamówień..."
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredActions.length > 0 ? (
            filteredActions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                    index === selectedIndex ? 'bg-[#0066CC]/10 text-[#0066CC]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={onClose}
                >
                  <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-[#0066CC]/20' : 'bg-gray-100'}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.category}</p>
                  </div>
                  {index === selectedIndex && (
                    <span className="text-xs text-gray-400">Wybierz</span>
                  )}
                </button>
              )
            })
          ) : (
            <div className="px-5 py-8 text-center text-gray-400">
              <Zap size={24} className="mx-auto mb-2" />
              <p>Brak wyników dla &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded">↑↓</kbd> Nawigacja</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded">↵</kbd> Wybierz</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded">esc</kbd> Zamknij</span>
        </div>
      </div>
    </div>
  )
}
