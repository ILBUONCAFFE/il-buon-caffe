'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import type { AdminProduct } from '../../types/admin-api'

type Props = {
  product: AdminProduct
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function PermanentDeleteProductModal({ product, busy = false, onClose, onConfirm }: Props) {
  const [accepted, setAccepted] = useState(false)
  const canDelete = accepted && !busy && !product.isActive

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [busy, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-red-100 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#F0EFEC]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 id="delete-product-title" className="text-base font-semibold text-[#1A1A1A]">
                Trwale usunąć produkt?
              </h2>
              <p className="mt-1 text-sm text-[#737373]">
                Ta operacja usuwa rekord produktu oraz powiązane zdjęcia i historię stanów magazynowych.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors disabled:opacity-40"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] p-4">
            <p className="font-mono text-xs text-[#737373]">{product.sku}</p>
            <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{product.name}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[#A3A3A3]">Status</p>
                <p className={product.isActive ? 'font-medium text-red-600' : 'font-medium text-emerald-700'}>
                  {product.isActive ? 'Aktywny' : 'Nieaktywny'}
                </p>
              </div>
              <div>
                <p className="text-[#A3A3A3]">Stan</p>
                <p className="font-medium text-[#1A1A1A] tabular-nums">{product.stock}</p>
              </div>
              <div>
                <p className="text-[#A3A3A3]">Dostępne</p>
                <p className="font-medium text-[#1A1A1A] tabular-nums">{product.available}</p>
              </div>
            </div>
          </div>

          {product.isActive ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Najpierw zdezaktywuj produkt. Trwałe usunięcie aktywnego produktu jest zablokowane.
            </div>
          ) : (
            <label className="flex items-start gap-3 rounded-xl border border-[#E5E4E1] bg-white p-4 cursor-pointer hover:border-[#D4D3D0] transition-colors">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#B91C1C]"
              />
              <span className="text-sm text-[#525252]">
                Rozumiem, że nie przywrócę produktu z panelu. Zamówienia zachowają swoje dane historyczne.
              </span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#F0EFEC] bg-[#FAFAF9]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-[#E5E4E1] text-[#525252] text-sm hover:bg-white transition-colors disabled:opacity-40"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            <Trash2 size={15} />
            {busy ? 'Usuwanie...' : 'Usuń trwale'}
          </button>
        </div>
      </div>
    </div>
  )
}
