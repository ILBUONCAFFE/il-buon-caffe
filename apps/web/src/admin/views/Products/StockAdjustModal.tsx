'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { AdminProduct } from '../../types/admin-api'

const REASONS: { value: string; label: string }[] = [
  { value: 'manual',      label: 'Ręczna korekta' },
  { value: 'inventory',   label: 'Inwentaryzacja' },
  { value: 'damage',      label: 'Uszkodzenie/strata' },
  { value: 'cancellation', label: 'Anulowanie zamówienia' },
]

type Props = {
  product: AdminProduct
  onClose: () => void
  onSaved: () => void
}

export function StockAdjustModal({ product, onClose, onSaved }: Props) {
  const [newStock, setNewStock] = useState(String(product.stock))
  const [reason, setReason] = useState('manual')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Number(newStock)
  const isValid = Number.isInteger(parsed) && parsed >= 0

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      await adminApi.updateProductStock(product.sku, {
        stock: parsed,
        reason: reason as 'manual' | 'inventory' | 'damage' | 'cancellation',
        notes: notes.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E4E1]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1]">
          <div>
            <p className="text-xs text-[#737373] font-mono">{product.sku}</p>
            <h2 className="text-base font-semibold text-[#1A1A1A]">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#737373] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Current state info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'W systemie', value: product.stock },
              { label: 'Zarezerwowane', value: product.reserved },
              { label: 'Dostępne', value: product.available },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-[#FAF9F7] border border-[#E5E4E1]">
                <p className="text-xl font-semibold text-[#1A1A1A] tabular-nums">{value}</p>
                <p className="text-xs text-[#737373] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* New stock input */}
          <div>
            <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Nowy stan magazynowy
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={newStock}
              onChange={e => setNewStock(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1A1A1A] text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
              placeholder="0"
            />
            {isValid && parsed !== product.stock && (
              <p className={`text-xs mt-1 ${parsed > product.stock ? 'text-[#047857]' : 'text-[#D97706]'}`}>
                Zmiana: {parsed > product.stock ? '+' : ''}{parsed - product.stock} szt.
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Powód korekty
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
            >
              {REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#525252] uppercase tracking-wider mb-1.5">
              Notatka <span className="font-normal text-[#A3A3A3]">(opcjonalna)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1A1A1A] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
              placeholder="Np. Znaleziono nadwyżkę podczas liczenia…"
            />
          </div>

          {error && (
            <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E4E1] flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-[#E5E4E1] text-[#525252] text-sm hover:bg-[#F5F4F1] transition-colors disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid || parsed === product.stock}
            className="px-5 py-2 rounded-xl bg-[#0066CC] text-white text-sm font-medium hover:bg-[#0052A3] transition-colors disabled:opacity-50"
          >
            {saving ? 'Zapisuję…' : 'Zapisz korektę'}
          </button>
        </div>
      </div>
    </div>
  )
}
