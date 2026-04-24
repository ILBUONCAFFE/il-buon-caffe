'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { resolveShipmentStatus } from '../lib/shipmentStatus'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ShipmentLabelPickerModal } from './ShipmentLabelPickerModal'
import { OrderTimeline } from './OrderTimeline'
import type { AdminOrder, AllegroShipmentEntry } from '../types/admin-api'

interface OrderDetailModalProps {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onCreateShipment?: (order: AdminOrder) => void
  onDownloadLabel?: (order: AdminOrder) => void
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
  const symbol: Record<string, string> = {
    PLN: 'zl',
    EUR: 'EUR',
    CZK: 'CZK',
    HUF: 'HUF',
  }
  return `${Number(value).toFixed(2)} ${symbol[currency] ?? currency}`
}


const SHIPMENT_STEPS = [
  { key: 'accepted', label: 'Przyjete' },
  { key: 'preparing', label: 'Przygotowanie' },
  { key: 'shipped', label: 'Wyslane' },
  { key: 'delivered', label: 'Dostarczone' },
] as const

function ShipmentTimeline({
  activeStep,
  isIssue,
  isCancelled,
  trackingStatus,
  updatedAt,
}: {
  activeStep: number
  isIssue: boolean
  isCancelled: boolean
  trackingStatus: string | null
  updatedAt: string | null
}) {
  return (
    <div className="mt-4 mb-2">
      <div className="relative flex justify-between items-center z-0 px-2">
        {/* Background line */}
        <div className="absolute left-0 top-1.5 w-full h-[2px] bg-[#E5E4E1] -z-10" />
        
        {/* Active line */}
        <div
          className={`absolute left-0 top-1.5 h-[2px] transition-all duration-300 -z-10 ${isCancelled ? 'bg-[#D4D3D0]' : 'bg-[#1A1A1A]'}`}
          style={{ width: `${(Math.min(activeStep, SHIPMENT_STEPS.length - 1) / (SHIPMENT_STEPS.length - 1)) * 100}%` }}
        />
        
        {SHIPMENT_STEPS.map((step, i) => {
          const isActive = !isCancelled && i <= activeStep
          const isCurrent = !isCancelled && i === activeStep
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 bg-white px-2 cursor-default" title={step.label}>
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                  isCancelled
                    ? 'border-[#D4D3D0] bg-white'
                    : isIssue && isCurrent
                      ? 'border-red-500 bg-red-500'
                      : isActive
                        ? 'border-[#1A1A1A] bg-[#1A1A1A]'
                        : 'border-[#D4D3D0] bg-white'
                }`}
              />
              <span
                className={`text-[10px] leading-tight text-center whitespace-nowrap ${
                  isCancelled ? 'text-[#A3A3A3]' : isActive ? 'text-[#1A1A1A] font-medium' : 'text-[#A3A3A3]'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-1">
        {isCancelled && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Przesyłka została anulowana.
          </div>
        )}
        {isIssue && !isCancelled && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 font-medium">
            Problem: {trackingStatus ?? 'Wystąpił problem z doręczeniem.'}
          </div>
        )}
        {!isIssue && !isCancelled && trackingStatus && (
          <p className="text-xs text-[#666] leading-relaxed">{trackingStatus}</p>
        )}
        {updatedAt && (
          <div className="text-[11px] text-[#A3A3A3] pt-1">
            Zaktualizowano: {formatDate(updatedAt)}
          </div>
        )}
      </div>
    </div>
  )
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

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onCreateShipment,
  onDownloadLabel,
}: OrderDetailModalProps) {
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) setLabelPickerOpen(false)
  }, [isOpen])

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

  if (!isOpen || !order) return null

  const customer = order.customerData
  const address = customer?.shippingAddress
  const canShip = ['paid', 'processing'].includes(order.status)
  const canCancel = ['pending', 'paid', 'processing'].includes(order.status)
  const shipmentTrackingExpected =
    order.source === 'allegro' && ['paid', 'processing', 'shipped'].includes(order.status)
  const effectiveTrackingNumber = order.trackingNumber ?? null
  const effectiveTrackingStatus = order.trackingStatus ?? null
  const effectiveTrackingStatusUpdatedAt = order.trackingStatusUpdatedAt ?? null
  const effectiveShipmentDisplayStatus = order.shipmentDisplayStatus ?? 'unknown'
  const resolvedShipmentStatus = resolveShipmentStatus({
    status: order.status,
    shipmentDisplayStatus: effectiveShipmentDisplayStatus,
    allegroFulfillmentStatus: order.allegroFulfillmentStatus,
  })
  const shipmentStatusText = effectiveTrackingStatus ?? resolvedShipmentStatus.detail

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl max-h-[90dvh] h-[90dvh] md:h-auto flex flex-col bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-[#E5E4E1] animate-in slide-in-from-bottom-3 fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC] shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{order.orderNumber}</h2>
            {order.source === 'allegro' && (
              <span className="text-[10px] font-medium bg-[#FF5A00]/10 text-[#FF5A00] px-2 py-0.5 rounded-full">
                Allegro
              </span>
            )}
            {order.invoiceRequired && (
              <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">FV</span>
            )}
            <OrderStatusBadge
              status={order.status}
              source={order.source}
              allegroFulfillmentStatus={order.allegroFulfillmentStatus}
              paymentMethod={order.paymentMethod}
              paidAt={order.paidAt}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A3A3A3]">{formatDate(order.paidAt ?? order.createdAt)}</span>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8 px-4 md:px-6 py-4 md:py-5">
            <div className="col-span-1 md:col-span-2 space-y-1">
              <SectionLabel>Klient</SectionLabel>
              <InfoRow label="Imie" value={customer?.name ?? '-'} />
              <InfoRow label="Email" value={customer?.email ?? '-'} />
              {customer?.phone && <InfoRow label="Telefon" value={customer.phone} />}
              {customer?.allegroLogin && <InfoRow label="Allegro" value={customer.allegroLogin} />}

              <SectionLabel>Dostawa</SectionLabel>
              {address ? (
                <>
                  <InfoRow label="Ulica" value={address.street} />
                  <InfoRow label="Miasto" value={`${address.postalCode} ${address.city}`} />
                  <InfoRow label="Kraj" value={address.country} />
                  {address.phone && <InfoRow label="Telefon" value={address.phone} />}
                </>
              ) : (
                <p className="text-sm text-[#A3A3A3]">Brak adresu dostawy</p>
              )}

              {order.invoiceRequired && (
                <>
                  <SectionLabel>Faktura</SectionLabel>
                  {customer?.companyName && <InfoRow label="Firma" value={customer.companyName} />}
                  {customer?.taxId && <InfoRow label="NIP" value={<span className="font-mono">{customer.taxId}</span>} />}
                  {!customer?.companyName && <p className="text-sm text-[#A3A3A3]">Faktura dla osoby prywatnej</p>}
                </>
              )}

              {order.notes && (
                <>
                  <SectionLabel>Notatka klienta</SectionLabel>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                    {order.notes}
                  </div>
                </>
              )}
            </div>

            <div className="col-span-1 md:col-span-3 space-y-1">
              <SectionLabel>Produkty</SectionLabel>
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
                  {order.items.map((item, i) => (
                    <tr key={`${item.productSku}-${i}`} className="border-t border-[#F0EFEC]">
                      <td className="py-2">
                        <div className="font-medium text-[#1A1A1A]">{item.productName}</div>
                        <div className="text-xs text-[#A3A3A3]">{item.productSku}</div>
                      </td>
                      <td className="text-right tabular-nums">{formatAmount(item.unitPrice, order.currency)}</td>
                      <td className="text-right tabular-nums">x{item.quantity}</td>
                      <td className="text-right tabular-nums font-medium">{formatAmount(item.totalPrice, order.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {order.shippingCost != null && Number(order.shippingCost) > 0 && (
                    <tr className="border-t border-[#F0EFEC]">
                      <td colSpan={3} className="py-2 text-[#666]">Dostawa ({order.shippingMethod ?? '-'})</td>
                      <td className="text-right tabular-nums">{formatAmount(order.shippingCost, order.currency)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-[#1A1A1A]">
                    <td colSpan={3} className="py-2 font-semibold">Razem</td>
                    <td className="text-right tabular-nums font-semibold">{formatAmount(order.total, order.currency)}</td>
                  </tr>
                </tfoot>
              </table>

              <SectionLabel>Platnosc</SectionLabel>
              <InfoRow label="Metoda" value={order.paymentMethod ?? '-'} />
              <InfoRow label="Oplacono" value={formatDate(order.paidAt)} />

              <SectionLabel>Przesylka</SectionLabel>
              <div className="space-y-3">                <div className="bg-white rounded-lg space-y-1">
                  <InfoRow label="Status" value={resolvedShipmentStatus.label} />
                  {effectiveTrackingNumber && (
                    <InfoRow label="Numer listu" value={<span className="font-mono text-xs font-medium tracking-wide">{effectiveTrackingNumber}</span>} />
                  )}
                  {order.shippingMethod && (
                    <InfoRow label="Przewoźnik" value={order.shippingMethod} />
                  )}
                </div>

                <ShipmentTimeline
                  activeStep={resolvedShipmentStatus.step}
                  isIssue={resolvedShipmentStatus.isIssue}
                  isCancelled={resolvedShipmentStatus.isCancelled}
                  trackingStatus={shipmentStatusText}
                  updatedAt={effectiveTrackingStatusUpdatedAt}
                />

                {/* Multi-shipment list — shown when order has >1 parcel or duplicate labels */}
                {order.allShipments && order.allShipments.length > 1 && (
                  <div className="pt-2 mt-4 border-t border-[#E5E4E1]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#1A1A1A]">Paczki w zamówieniu</span>
                      <span className="text-[10px] bg-[#E5E4E1] text-[#666] px-1.5 py-0.5 rounded font-medium">{order.allShipments.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {order.allShipments.map((s) => (
                        <div
                          key={s.waybill}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-xs transition-colors ${
                            s.isSelected
                              ? 'bg-blue-50 border border-blue-100'
                              : 'bg-[#F9F9F9] border border-transparent'
                          }`}
                        >
                          <span className={`font-mono text-xs truncate ${s.isSelected ? 'text-blue-900 font-medium' : 'text-[#666]'}`}>
                            {s.waybill}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] ${s.isSelected ? 'text-blue-800' : 'text-[#A3A3A3]'}`}>
                              {s.statusLabel ?? s.statusCode}
                            </span>
                            {s.isSelected && (
                              <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                                Główna
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Historia zmian statusów */}
        <div className="px-4 md:px-6 pb-4">
          <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3 mt-2">
            Historia zmian
          </h3>
          <OrderTimeline orderId={order.id} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 md:px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          <div>
            {canCancel && (
              <button className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                Anuluj zamowienie
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {order.allegroShipmentId && onDownloadLabel ? (
              (order.allShipments?.length ?? 0) > 1 ? (
                <button className="btn-primary text-sm" onClick={() => setLabelPickerOpen(true)}>
                  Pobierz etykiety PDF ({order.allShipments!.length})
                </button>
              ) : (
                <button className="btn-primary text-sm" onClick={() => onDownloadLabel(order)}>
                  Pobierz etykiete PDF
                </button>
              )
            ) : canShip && onCreateShipment ? (
              <button className="btn-primary text-sm" onClick={() => onCreateShipment(order)}>
                Nadaj przesylke
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
      {labelPickerOpen && (
        <ShipmentLabelPickerModal
          order={order}
          isOpen={labelPickerOpen}
          onClose={() => setLabelPickerOpen(false)}
        />
      )}
    </>
  )
}
