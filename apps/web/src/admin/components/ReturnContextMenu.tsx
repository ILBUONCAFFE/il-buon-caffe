'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { AdminReturn, ReturnStatus } from '../types/admin-api'

interface ReturnContextMenuProps {
  ret: AdminReturn
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetails: (ret: AdminReturn) => void
  onChangeStatus: (ret: AdminReturn, status: ReturnStatus) => void
  onApprove?: (ret: AdminReturn) => void
  onReject?: (ret: AdminReturn) => void
  onRefund?: (ret: AdminReturn) => void
  onReopen?: (ret: AdminReturn) => void
  onRestock?: (ret: AdminReturn) => void
  onRefreshReturn?: (ret: AdminReturn) => void
}

const STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  new:       ['in_review', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved:  ['refunded'],
  rejected:  ['closed'],
  refunded:  ['closed'],
  closed:    [],
}

const STATUS_LABELS: Record<ReturnStatus, string> = {
  new:       'Nowy',
  in_review: 'W rozpatrzeniu',
  approved:  'Zaakceptowany',
  rejected:  'Odrzucony',
  refunded:  'Zwrot wyslany',
  closed:    'Zamkniety',
}

const ALL_STATUSES: ReturnStatus[] = ['new', 'in_review', 'approved', 'rejected', 'refunded', 'closed']

export function ReturnContextMenu({
  ret,
  position,
  onClose,
  onOpenDetails,
  onChangeStatus,
  onApprove,
  onReject,
  onRefund,
  onReopen,
  onRestock,
  onRefreshReturn,
}: ReturnContextMenuProps) {
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

  const allowed = STATUS_TRANSITIONS[ret.status] ?? []

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
        onClick={() => { onOpenDetails(ret); onClose() }}
      >
        Otworz szczegoly
        <span className="text-xs text-[#A3A3A3]">Enter</span>
      </button>

      <div className="h-px bg-[#F0EFEC] my-1" />

      <div className="group relative">
        <button className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] flex items-center justify-between">
          Zmien status
          <span className="text-xs text-[#A3A3A3]">&gt;</span>
        </button>

        <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-[180px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1">
          {ALL_STATUSES.map((status) => {
            const isAllowed = allowed.includes(status)
            const isCurrent = status === ret.status
            return (
              <button
                key={status}
                disabled={!isAllowed}
                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 ${
                  isCurrent
                    ? 'text-[#1A1A1A] font-medium'
                    : isAllowed
                      ? 'hover:bg-[#F5F4F1] text-[#1A1A1A]'
                      : 'text-[#D4D3D0] cursor-not-allowed'
                }`}
                onClick={() => {
                  if (isAllowed) { onChangeStatus(ret, status); onClose() }
                }}
              >
                {isCurrent && <span className="text-xs">✓</span>}
                {STATUS_LABELS[status]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-[#F0EFEC] my-1" />

      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(ret.returnNumber)}
      >
        Kopiuj nr zwrotu
      </button>

      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(ret.customerData?.email ?? '')}
      >
        Kopiuj email klienta
      </button>

      {(onApprove || onReject || onRefund || onReopen || onRestock || onRefreshReturn) && (
        <div className="h-px bg-[#F0EFEC] my-1" />
      )}

      {onApprove && ret.status === 'in_review' && (
        <button
          className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] text-green-700"
          onClick={() => onApprove(ret)}
        >
          Zatwierdz zwrot
        </button>
      )}

      {onReject && (ret.status === 'new' || ret.status === 'in_review') && (
        <button
          className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] text-red-600"
          onClick={() => onReject(ret)}
        >
          Odrzuc zwrot
        </button>
      )}

      {onRefund && ret.status === 'approved' && (
        <button
          className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] text-blue-700"
          onClick={() => onRefund(ret)}
        >
          Potwierdz zwrot pieniedzy
        </button>
      )}

      {onReopen && ret.status === 'closed' && (
        <button
          className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
          onClick={() => onReopen(ret)}
        >
          Ponownie otworz
        </button>
      )}

      {onRestock && (ret.status === 'approved' || ret.status === 'refunded') && (
        <button
          className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
          onClick={() => onRestock(ret)}
        >
          Przywroc na stan
        </button>
      )}

      {onRefreshReturn && (
        <button
          className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] text-[#A3A3A3]"
          onClick={() => onRefreshReturn(ret)}
        >
          Odswiez dane zwrotu
        </button>
      )}
    </div>
  )

  return createPortal(menuContent, document.body)
}
