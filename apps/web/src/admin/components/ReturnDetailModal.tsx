'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import type { AdminReturn, ReturnStatus } from '../types/admin-api'

interface ReturnDetailModalProps {
  ret: AdminReturn | null
  isOpen: boolean
  onClose: () => void
  onChangeStatus?: (ret: AdminReturn, status: ReturnStatus) => void
  onApprove?: (ret: AdminReturn) => void
  onReject?: (ret: AdminReturn) => void
  onRefund?: (ret: AdminReturn) => void
}

const REASON_LABELS: Record<string, string> = {
  damaged:          'Uszkodzony produkt',
  wrong_item:       'Bledny produkt',
  not_as_described: 'Niezgodny z opisem',
  change_of_mind:   'Zmiana decyzji',
  other:            'Inne',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatAmount(value: number | undefined | null, currency = 'PLN'): string {
  if (value == null) return '-'
  const symbol: Record<string, string> = { PLN: 'zl', EUR: 'EUR' }
  return `${Number(value).toFixed(2)} ${symbol[currency] ?? currency}`
}

function InfoRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex justify-between py-1 gap-4">
      <span className="text-[#666] text-sm shrink-0">{label}</span>
      <span className="text-sm text-[#1A1A1A] text-right max-w-[65%] break-words">{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

export function ReturnDetailModal({ ret, isOpen, onClose, onChangeStatus, onApprove, onReject, onRefund }: ReturnDetailModalProps) {
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

  if (!isOpen || !ret) return null

  const canApprove = ret.status === 'in_review'
  const canReject  = ret.status === 'new' || ret.status === 'in_review'
  const canRefund  = ret.status === 'approved'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-[#E5E4E1] animate-in slide-in-from-bottom-3 fade-in duration-200">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC] shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{ret.returnNumber}</h2>
            <ReturnStatusBadge status={ret.status} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A3A3A3]">{formatDate(ret.createdAt)}</span>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 gap-8 px-6 py-5">

            <div className="col-span-2 space-y-1">
              <SectionLabel>Klient</SectionLabel>
              <InfoRow label="Imie" value={ret.customerData?.name ?? '-'} />
              <InfoRow label="Email" value={ret.customerData?.email ?? '-'} />
              {ret.customerData?.phone && <InfoRow label="Telefon" value={ret.customerData.phone} />}

              <SectionLabel>Zamowienie</SectionLabel>
              <InfoRow label="Nr zamowienia" value={ret.orderNumber} />
              <InfoRow label="Data zgłoszenia" value={formatDate(ret.createdAt)} />
              <InfoRow label="Ostatnia zmiana" value={formatDate(ret.updatedAt)} />

              <SectionLabel>Powod zwrotu</SectionLabel>
              <InfoRow label="Kategoria" value={REASON_LABELS[ret.reason] ?? ret.reason} />
              {ret.reasonNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mt-2">
                  {ret.reasonNote}
                </div>
              )}
            </div>

            <div className="col-span-3 space-y-1">
              <SectionLabel>Produkty do zwrotu</SectionLabel>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#A3A3A3] text-xs">
                    <th className="text-left py-1 font-normal">Produkt</th>
                    <th className="text-right py-1 font-normal w-20">Cena</th>
                    <th className="text-right py-1 font-normal w-12">Ilosc</th>
                    <th className="text-right py-1 font-normal w-24">Razem</th>
                  </tr>
                </thead>
                <tbody>
                  {ret.items.map((item, i) => (
                    <tr key={`${item.productSku}-${i}`} className="border-t border-[#F0EFEC]">
                      <td className="py-2">
                        <div className="font-medium text-[#1A1A1A]">{item.productName}</div>
                        <div className="text-xs text-[#A3A3A3]">{item.productSku}</div>
                      </td>
                      <td className="text-right tabular-nums">{formatAmount(item.unitPrice, ret.currency)}</td>
                      <td className="text-right tabular-nums">x{item.quantity}</td>
                      <td className="text-right tabular-nums font-medium">{formatAmount(item.totalPrice, ret.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                {ret.totalRefundAmount != null && (
                  <tfoot>
                    <tr className="border-t-2 border-[#1A1A1A]">
                      <td colSpan={3} className="py-2 font-semibold">Kwota zwrotu</td>
                      <td className="text-right tabular-nums font-semibold">
                        {formatAmount(ret.totalRefundAmount, ret.currency)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              <SectionLabel>Historia statusow</SectionLabel>
              <p className="text-sm text-[#A3A3A3]">
                Historia statusow bedzie dostepna po podlaczeniu API.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          {canReject && (onReject || onChangeStatus) && (
            <button
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => {
                if (onReject) { onReject(ret); onClose() }
                else if (onChangeStatus) { onChangeStatus(ret, 'rejected'); onClose() }
              }}
            >
              Odrzuc zwrot
            </button>
          )}
          {canApprove && (onApprove || onChangeStatus) && (
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                if (onApprove) { onApprove(ret); onClose() }
                else if (onChangeStatus) { onChangeStatus(ret, 'approved'); onClose() }
              }}
            >
              Zaakceptuj
            </button>
          )}
          {canRefund && (onRefund || onChangeStatus) && (
            <button
              className="btn-primary text-sm"
              onClick={() => {
                if (onRefund) { onRefund(ret); onClose() }
                else if (onChangeStatus) { onChangeStatus(ret, 'refunded'); onClose() }
              }}
            >
              Potwierdz wyslanie zwrotu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
