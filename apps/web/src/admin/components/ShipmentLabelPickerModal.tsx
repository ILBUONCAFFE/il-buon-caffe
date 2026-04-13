'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import type { AdminOrder } from '../types/admin-api'

interface ShipmentLabelPickerModalProps {
  order: AdminOrder
  isOpen: boolean
  onClose: () => void
}

export function ShipmentLabelPickerModal({ order, isOpen, onClose }: ShipmentLabelPickerModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleDownloadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const blob = await adminApi.getShipmentLabel(order.id, 'all')
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie pobrac etykiet')
    } finally {
      setLoading(false)
    }
  }

  const shipments = order.allShipments ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-[#E5E4E1] shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC]">
          <div>
            <h2 className="font-semibold text-[#1A1A1A] text-base">Wybierz etykiety</h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">{order.orderNumber}</p>
          </div>
          <button
            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Shipments list */}
        <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {shipments.map((s, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[#E5E4E1] bg-[#FAFAF9]"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-[#1A1A1A] truncate">{s.waybill}</p>
                <p className="text-xs text-[#A3A3A3] mt-0.5">{s.carrierId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.isSelected && (
                  <span className="text-[10px] font-bold bg-[#1A1A1A]/10 text-[#1A1A1A] px-1.5 py-0.5 rounded-full leading-none">
                    aktywna
                  </span>
                )}
                {s.statusLabel ? (
                  <span className="text-[11px] font-medium bg-[#F0EFEC] text-[#555] px-2 py-0.5 rounded-full">
                    {s.statusLabel}
                  </span>
                ) : s.statusCode ? (
                  <span className="text-[11px] font-medium bg-[#F0EFEC] text-[#555] px-2 py-0.5 rounded-full">
                    {s.statusCode}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#F0EFEC]">
          <button className="btn-secondary text-sm" onClick={onClose} disabled={loading}>
            Anuluj
          </button>
          <button
            className="btn-primary text-sm disabled:opacity-60"
            onClick={handleDownloadAll}
            disabled={loading}
          >
            {loading ? 'Pobieranie...' : `Pobierz wszystkie etykiety (${shipments.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
