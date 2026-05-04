'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { AdminOrder } from '../types/admin-api'

interface ContextMenuProps {
  order: AdminOrder
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetails: (order: AdminOrder) => void
  onCreateShipment: (order: AdminOrder) => void
  onDownloadLabel: (order: AdminOrder) => void
}

export function OrderContextMenu({
  order,
  position,
  onClose,
  onOpenDetails,
  onCreateShipment,
  onDownloadLabel,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuRef.current) return

    const rect = menuRef.current.getBoundingClientRect()
    const menu = menuRef.current

    if (rect.right > window.innerWidth) {
      menu.style.left = `${Math.max(8, position.x - rect.width)}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${Math.max(8, position.y - rect.height)}px`
    }
  }, [position])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', onClose)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', onClose)
    }
  }, [handleKeyDown, onClose])

  const canShip = ['paid', 'processing'].includes(order.status)
  const hasLabel = !!order.allegroShipmentId

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    onClose()
  }

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1 text-sm text-[#1A1A1A] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] flex items-center justify-between"
        onClick={() => {
          onOpenDetails(order)
          onClose()
        }}
      >
        Otworz szczegoly
        <span className="text-xs text-[#A3A3A3]">Enter</span>
      </button>

      <div className="h-px bg-[#F0EFEC] my-1" />

      <button
        disabled={!canShip}
        className={`w-full px-3 py-2 text-left ${canShip ? 'hover:bg-[#F5F4F1]' : 'text-[#D4D3D0] cursor-not-allowed'}`}
        onClick={() => {
          if (canShip) {
            onCreateShipment(order)
            onClose()
          }
        }}
      >
        Nadaj przesylke
      </button>

      <button
        disabled={!hasLabel}
        className={`w-full px-3 py-2 text-left ${hasLabel ? 'hover:bg-[#F5F4F1]' : 'text-[#D4D3D0] cursor-not-allowed'}`}
        onClick={() => {
          if (hasLabel) {
            onDownloadLabel(order)
            onClose()
          }
        }}
        title={!hasLabel ? 'Najpierw nadaj przesylke' : undefined}
      >
        Pobierz etykiete
      </button>

      <div className="h-px bg-[#F0EFEC] my-1" />

      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(order.orderNumber)}
      >
        Kopiuj nr zamowienia
      </button>

      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(order.customerData?.email ?? '')}
      >
        Kopiuj email klienta
      </button>

      {order.source === 'allegro' && order.externalId && (
        <>
          <div className="h-px bg-[#F0EFEC] my-1" />
          <a
            href={`https://allegro.pl/moje-allegro/sprzedaz/zamowienia/${order.externalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
            onClick={onClose}
          >
            Otworz na Allegro <span className="text-xs">^</span>
          </a>
        </>
      )}
    </div>
  )

  return createPortal(menuContent, document.body)
}
