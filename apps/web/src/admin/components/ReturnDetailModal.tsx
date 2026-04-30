'use client'

import { useEffect, type ReactNode } from 'react'
import { X, RefreshCw } from 'lucide-react'
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
  onRefreshReturn?: (ret: AdminReturn) => void
}

const REASON_LABELS: Record<string, string> = {
  damaged:          'Uszkodzony produkt',
  wrong_item:       'Błędny produkt',
  not_as_described: 'Niezgodny z opisem',
  change_of_mind:   'Zmiana decyzji',
  defect:           'Wada produktu',
  mistake:          'Pomyłka kupującego',
  other:            'Inne',
}

const ALLEGRO_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Zgłoszony',
  DISPATCHED: 'Nadany przez kupującego',
  IN_TRANSIT: 'W drodze do sprzedawcy',
  DELIVERED: 'Dostarczony do sprzedawcy',
  FINISHED: 'Zakończony',
  FINISHED_APT: 'Zakończony automatycznie',
  REJECTED: 'Odrzucony',
  COMMISSION_REFUND_CLAIMED: 'Wniosek o zwrot prowizji',
  COMMISSION_REFUNDED: 'Prowizja zwrócona',
  WAREHOUSE_DELIVERED: 'Dostarczony do magazynu',
  WAREHOUSE_VERIFICATION: 'Weryfikacja w magazynie',
}

const REJECTION_LABELS: Record<string, string> = {
  REFUND_REJECTED: 'Zwrot środków odrzucony',
  NEW_ITEM_SENT: 'Wysłano nowy towar',
  ITEM_FIXED: 'Towar naprawiony',
  MISSING_PART_SENT: 'Wysłano brakującą część',
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

export function ReturnDetailModal({ ret, isOpen, onClose, onChangeStatus, onApprove, onReject, onRefund, onRefreshReturn }: ReturnDetailModalProps) {
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

  const isAllegro = ret.source === 'allegro'
  const allegroStatus = ret.allegro?.status
  const canApprove = isAllegro ? ret.status === 'approved' : ret.status === 'new' || ret.status === 'in_review'
  const canReject  = ret.status === 'new' || ret.status === 'in_review' || ret.status === 'approved'
  const canRefund  = !isAllegro && ret.status === 'approved'
  const bankAccount = ret.customerData?.bankAccount
  const parcels = ret.allegro?.parcels ?? []

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
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              isAllegro ? 'bg-[#FF5A00]/10 text-[#FF5A00]' : 'bg-[#F5F4F1] text-[#666]'
            }`}>
              {isAllegro ? 'Allegro' : 'Sklep'}
            </span>
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

              <SectionLabel>Zamówienie</SectionLabel>
              <InfoRow label="Nr zamówienia" value={ret.orderNumber} />
              <InfoRow label="Data zgłoszenia" value={formatDate(ret.createdAt)} />
              <InfoRow label="Ostatnia zmiana" value={formatDate(ret.updatedAt)} />
              {isAllegro && (
                <>
                  <InfoRow label="Zwrot Allegro" value={ret.allegro?.referenceNumber ?? ret.allegro?.customerReturnId ?? '-'} />
                  <InfoRow label="Status Allegro" value={allegroStatus ? (ALLEGRO_STATUS_LABELS[allegroStatus] ?? allegroStatus) : '-'} />
                </>
              )}

              <SectionLabel>Powód zwrotu</SectionLabel>
              <InfoRow label="Kategoria" value={REASON_LABELS[ret.reason] ?? ret.reason} />
              {ret.reasonNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mt-2">
                  {ret.reasonNote}
                </div>
              )}

              {bankAccount && (
                <>
                  <SectionLabel>Dane do zwrotu wpłaty</SectionLabel>
                  {bankAccount.owner && <InfoRow label="Odbiorca" value={bankAccount.owner} />}
                  {(bankAccount.iban || bankAccount.accountNumber) && (
                    <InfoRow label="Rachunek" value={<span className="font-mono">{bankAccount.iban ?? bankAccount.accountNumber}</span>} />
                  )}
                  {bankAccount.swift && <InfoRow label="SWIFT" value={bankAccount.swift} />}
                </>
              )}

              {ret.allegro?.rejection && (
                <>
                  <SectionLabel>Odmowa zwrotu</SectionLabel>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-900">
                    <div className="font-medium">{REJECTION_LABELS[ret.allegro.rejection.code] ?? ret.allegro.rejection.code}</div>
                    {ret.allegro.rejection.reason && <div className="mt-1">{ret.allegro.rejection.reason}</div>}
                    <div className="text-xs text-red-700 mt-1">{formatDate(ret.allegro.rejection.createdAt)}</div>
                  </div>
                </>
              )}
            </div>

            <div className="col-span-3 space-y-1">
              <SectionLabel>Produkty do zwrotu</SectionLabel>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#A3A3A3] text-xs">
                    <th className="text-left py-1 font-normal">Produkt</th>
                    <th className="text-right py-1 font-normal w-20">Cena</th>
                    <th className="text-right py-1 font-normal w-12">Ilość</th>
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

              {parcels.length > 0 && (
                <>
                  <SectionLabel>Przesyłka zwrotna</SectionLabel>
                  <div className="space-y-2">
                    {parcels.map((parcel, index) => (
                      <div key={`${parcel.trackingNumber ?? index}`} className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] px-3 py-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-[#1A1A1A]">
                            {parcel.trackingNumber || parcel.waybill || 'Brak numeru listu'}
                          </span>
                          <span className="text-[#666]">{parcel.carrierId ?? parcel.transportingCarrierId ?? '-'}</span>
                        </div>
                        {(parcel.transportingWaybill || parcel.sender || parcel.createdAt) && (
                          <div className="text-xs text-[#A3A3A3] mt-1">
                            {parcel.transportingWaybill && <>Przewoźnik fizyczny: {parcel.transportingWaybill} · </>}
                            {parcel.sender && <>Tel. nadawcy: {parcel.sender} · </>}
                            {parcel.createdAt && <>Utworzono: {formatDate(parcel.createdAt)}</>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {ret.refunds && ret.refunds.length > 0 && (
                <>
                  <SectionLabel>Zwroty płatności</SectionLabel>
                  <div className="space-y-2">
                    {ret.refunds.map((refund) => (
                      <div key={refund.id} className="rounded-lg border border-[#E5E4E1] px-3 py-2 text-sm flex justify-between gap-3">
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{formatAmount(refund.amount, ret.currency)}</div>
                          <div className="text-xs text-[#A3A3A3]">{refund.method} · {formatDate(refund.createdAt)}</div>
                        </div>
                        <span className="text-xs text-[#666] bg-[#F5F4F1] px-2 py-1 rounded self-start">{refund.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          <div>
            {isAllegro && onRefreshReturn && (
              <button className="btn-secondary text-sm inline-flex items-center gap-2" onClick={() => onRefreshReturn(ret)}>
                <RefreshCw size={14} />
                Odśwież z Allegro
              </button>
            )}
          </div>
          <div className="flex items-center justify-end gap-3">
          {canReject && (onReject || onChangeStatus) && (
            <button
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => {
                if (onReject) { onReject(ret); onClose() }
                else if (onChangeStatus) { onChangeStatus(ret, 'rejected'); onClose() }
              }}
            >
              Odrzuć zwrot
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
              {isAllegro ? 'Zleć zwrot środków' : 'Zaakceptuj'}
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
              Potwierdź wysłanie zwrotu
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
