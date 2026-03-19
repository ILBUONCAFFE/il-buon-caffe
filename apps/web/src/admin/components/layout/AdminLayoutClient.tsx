'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CommandPalette } from '../CommandPalette'

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['orders', 'website'])
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <Sidebar expandedMenus={expandedMenus} setExpandedMenus={setExpandedMenus} />

      <div className="ml-72">
        <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        <main className="px-8 pt-6">
          {children}
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
