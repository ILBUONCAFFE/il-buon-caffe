'use client'

import type { AdminOrder } from '../types/admin-api'

interface BulkActionBarProps {
  selectedOrders: AdminOrder[]
  onChangeStatus: (status: string) => void
  onDownloadLabels: () => void
  onClearSelection: () => void
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Oplacone',
  processing: 'W realizacji',
  shipped: 'Wyslane',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
}

export function BulkActionBar({
  selectedOrders,
  onChangeStatus,
  onDownloadLabels,
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedOrders.length === 0) return null

  const hasLabels = selectedOrders.some((order) => !!order.allegroShipmentId)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-3 fade-in duration-200">
      <span className="text-sm font-medium tabular-nums">{selectedOrders.length} zaznaczonych</span>

      <div className="h-4 w-px bg-white/20" />

      <div className="relative group">
        <button className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
          Zmien status v
        </button>
        <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 min-w-[160px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1 text-[#1A1A1A]">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <button
              key={status}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-[#F5F4F1]"
              onClick={() => onChangeStatus(status)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!hasLabels}
        className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${hasLabels ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'}`}
        onClick={onDownloadLabels}
      >
        Pobierz etykiety ZIP
      </button>

      <div className="h-4 w-px bg-white/20" />

      <button
        className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
        onClick={onClearSelection}
      >
        Anuluj zaznaczenie
      </button>
    </div>
  )
}
