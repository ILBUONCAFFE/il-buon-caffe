'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X, RefreshCw, Package, Truck, CheckCircle2, AlertTriangle, XCircle, Clock, MapPin } from 'lucide-react'
import { resolveShipmentStatus } from '../lib/shipmentStatus'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ShipmentLabelPickerModal } from './ShipmentLabelPickerModal'
import { adminApi } from '../lib/adminApiClient'
import type { AdminOrder, AllegroShipmentEntry, AllegroTrackingData, AllegroTrackingStatusEntry } from '../types/admin-api'

interface OrderDetailModalProps {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
  onCreateShipment?: (order: AdminOrder) => void
  onDownloadLabel?: (order: AdminOrder) => void
  onShipmentRefreshed?: (orderId: number, snapshot: AllegroShipmentEntry[] | null) => void
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

type ShipmentVisual = {
  Icon: typeof Package
  bg: string
  ring: string
  iconBg: string
  iconColor: string
  text: string
}

function shipmentVisual(args: {
  isCancelled: boolean
  isIssue: boolean
  step: number
}): ShipmentVisual {
  if (args.isCancelled) {
    return { Icon: XCircle, bg: 'bg-[#F5F4F1]', ring: 'border-[#E5E4E1]', iconBg: 'bg-[#E5E4E1]', iconColor: 'text-[#666]', text: 'text-[#666]' }
  }
  if (args.isIssue) {
    return { Icon: AlertTriangle, bg: 'bg-red-50', ring: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', text: 'text-red-900' }
  }
  if (args.step >= 3) {
    return { Icon: CheckCircle2, bg: 'bg-emerald-50', ring: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', text: 'text-emerald-900' }
  }
  if (args.step === 2) {
    return { Icon: Truck, bg: 'bg-blue-50', ring: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', text: 'text-blue-900' }
  }
  if (args.step === 1) {
    return { Icon: Package, bg: 'bg-amber-50', ring: 'border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-700', text: 'text-amber-900' }
  }
  return { Icon: Clock, bg: 'bg-[#F5F4F1]', ring: 'border-[#E5E4E1]', iconBg: 'bg-white', iconColor: 'text-[#666]', text: 'text-[#1A1A1A]' }
}

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

function ShipmentHeroCard({
  resolved,
  detail,
  updatedAt,
  trackingNumber,
  carrier,
}: {
  resolved: { label: string; detail: string | null; step: number; isIssue: boolean; isCancelled: boolean }
  detail: string | null
  updatedAt: string | null
  trackingNumber: string | null
  carrier: string | null
}) {
  const v = shipmentVisual({ isCancelled: resolved.isCancelled, isIssue: resolved.isIssue, step: resolved.step })
  const Icon = v.Icon
  return (
    <div className={`rounded-xl border ${v.ring} ${v.bg} px-4 py-3.5`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full ${v.iconBg} ${v.iconColor} flex items-center justify-center`}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${v.text}`}>{resolved.label}</div>
          {detail && detail !== resolved.label && (
            <div className={`text-xs mt-0.5 ${v.text} opacity-80 leading-relaxed`}>{detail}</div>
          )}
          {(trackingNumber || carrier || updatedAt) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
              {trackingNumber && (
                <span className={`font-mono tabular-nums ${v.text} opacity-90`}>
                  {trackingNumber}
                </span>
              )}
              {carrier && (
                <span className={`${v.text} opacity-70`}>· {carrier}</span>
              )}
              {updatedAt && (
                <span className={`${v.text} opacity-60 ml-auto tabular-nums`}>{formatDate(updatedAt)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ParcelCard({ parcel, index }: { parcel: AllegroShipmentEntry; index: number }) {
  const [eventsOpen, setEventsOpen] = useState(false)
  const events = parcel.events ?? []
  const carrierLabel = parcel.carrierName ?? (parcel.carrierId && parcel.carrierId !== 'UNKNOWN' ? parcel.carrierId : null)
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        parcel.isSelected ? 'border-[#1A1A1A] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'border-[#E5E4E1] bg-[#FAFAF8]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-[#A3A3A3] tabular-nums">#{index + 1}</span>
          <span className="font-mono text-xs font-medium text-[#1A1A1A] truncate tracking-wide">{parcel.waybill}</span>
          {parcel.isSelected && (
            <span className="text-[9px] font-bold bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
              Główna
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-[#666] bg-[#F0EFEC] px-2 py-0.5 rounded shrink-0">
          {parcel.statusLabel ?? parcel.statusCode}
        </span>
      </div>
      {(carrierLabel || parcel.occurredAt) && (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#A3A3A3]">
          {carrierLabel && <span>{carrierLabel}</span>}
          {carrierLabel && parcel.occurredAt && <span>·</span>}
          {parcel.occurredAt && <span className="tabular-nums">{formatDate(parcel.occurredAt)}</span>}
        </div>
      )}
      {events.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setEventsOpen((v) => !v)}
            className="text-[10px] text-[#666] hover:text-[#1A1A1A] font-medium"
          >
            {eventsOpen ? 'Ukryj zdarzenia' : `Zdarzenia kuriera (${events.length})`}
          </button>
          {eventsOpen && (
            <ul className="mt-1.5 space-y-1 pl-1">
              {events.slice().reverse().map((e, i) => (
                <li key={`${e.code}-${e.occurredAt ?? i}`} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="mt-1 w-1 h-1 rounded-full bg-[#666] shrink-0" />
                  <span className="text-[#1A1A1A]">{e.label ?? e.code}</span>
                  {e.occurredAt && <span className="text-[#A3A3A3] ml-auto tabular-nums">{formatDate(e.occurredAt)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Map well-known carrier status codes → Polish label */
const STATUS_CODE_LABELS: Record<string, string> = {
  DELIVERED:               'Doręczono',
  PARCEL_LOCKER_DELIVERED: 'Dostarczone do paczkomatu',
  OUT_FOR_DELIVERY:        'W doręczeniu',
  IN_TRANSIT:              'W transporcie',
  ARRIVED_AT_SORTING_CENTER: 'W centrum sortowania',
  ARRIVED:                 'Dotarła do oddziału',
  DEPARTED:                'Wyjechała z oddziału',
  LABEL_CREATED:           'Etykieta wygenerowana',
  CREATED:                 'Przesyłka utworzona',
  READY_FOR_PICKUP:        'Gotowa do odbioru',
  PICKUP_READY:            'Gotowa do odbioru',
  PICKUP_ATTEMPTED:        'Próba doręczenia nieudana',
  RETURN_TO_SENDER:        'Zwrot do nadawcy',
  LOST:                    'Zagubiona',
  EXCEPTION:               'Problem z doręczeniem',
  CANCELLED:               'Anulowana',
  CUSTOMS:                 'Kontrola celna',
}

function resolveStatusLabel(code: string | null | undefined): string {
  if (!code) return '—'
  const upper = code.trim().toUpperCase()
  return STATUS_CODE_LABELS[upper] ?? upper.replace(/_/g, ' ')
}

function TrackingHistoryList({ statuses }: { statuses: AllegroTrackingStatusEntry[] }) {
  if (statuses.length === 0) return null
  return (
    <div className="mt-3 border-t border-[#F0EFEC] pt-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <MapPin size={11} className="text-[#A3A3A3]" />
        <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Historia przesyłki</span>
      </div>
      <ol className="relative space-y-0 pl-4 border-l-2 border-[#E5E4E1]">
        {statuses.map((entry, i) => {
          const isFirst = i === 0
          const label = resolveStatusLabel(entry.status)
          return (
            <li key={`${entry.status}-${entry.occurredAt ?? i}`} className="relative pb-3 last:pb-0">
              {/* dot */}
              <span
                className={`absolute -left-[13px] top-0.5 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                  isFirst
                    ? 'border-[#1A1A1A] bg-[#1A1A1A]'
                    : 'border-[#D4D3D0] bg-white'
                }`}
              />
              <div className="pl-2">
                <p className={`text-[12px] leading-snug ${isFirst ? 'font-semibold text-[#1A1A1A]' : 'text-[#525252]'}`}>
                  {label}
                </p>
                {entry.description && entry.description !== entry.status && (
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5 leading-snug">{entry.description}</p>
                )}
                {entry.occurredAt && (
                  <p className="text-[10px] text-[#A3A3A3] mt-0.5 tabular-nums">{formatDate(entry.occurredAt)}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onCreateShipment,
  onDownloadLabel,
  onShipmentRefreshed,
}: OrderDetailModalProps) {
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [markingDelivered, setMarkingDelivered] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)

  // Allegro carrier tracking — fetched from GET /orders/:externalId/tracking
  const [trackingData, setTrackingData] = useState<AllegroTrackingData | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  const fetchTracking = async (externalId: string) => {
    setTrackingLoading(true)
    try {
      const res = await adminApi.getAllegroOrderTracking(externalId)
      if (res.success) setTrackingData(res.data)
    } catch {
      // silent — tracking is supplementary info; don't block UI on failure
    } finally {
      setTrackingLoading(false)
    }
  }

  const markDelivered = async () => {
    if (!order || markingDelivered) return
    if (!confirm('Oznaczyć paczkę jako dostarczoną? Status w Allegro zostanie zmieniony na PICKED_UP.')) return
    setMarkingDelivered(true)
    setMarkError(null)
    try {
      await adminApi.setOrderFulfillment(order.id, 'PICKED_UP')
      await refreshShipment(true)
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : 'Błąd oznaczania')
    } finally {
      setMarkingDelivered(false)
    }
  }

  const refreshShipment = async (force: boolean) => {
    if (!order || refreshing) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      const res = await adminApi.refreshOrderShipment(order.id, { force })
      onShipmentRefreshed?.(order.id, res.data.snapshot ?? null)
      // Also refresh carrier tracking after snapshot update
      if (order.externalId) {
        void fetchTracking(order.externalId)
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Błąd odświeżania')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setLabelPickerOpen(false)
      setTrackingData(null)
    }
  }, [isOpen])

  // Auto-refresh on modal open for Allegro orders that haven't been refreshed yet.
  // KV cache (5min) throttles repeat opens — backend returns snapshot from DB if cached.
  useEffect(() => {
    if (!isOpen || !order || order.source !== 'allegro') return
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) return
    void refreshShipment(false)
    // Also fetch carrier tracking if externalId is available
    if (order.externalId) {
      void fetchTracking(order.externalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id])

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

              <div className="flex items-center justify-between mb-2 mt-5">
                <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                  Przesylka
                </h3>
                {order.source === 'allegro' && (
                  <button
                    type="button"
                    onClick={() => void refreshShipment(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1A1A1A] bg-[#F5F4F1] hover:bg-[#E5E4E1] disabled:opacity-50 px-2.5 py-1 rounded-md border border-[#E5E4E1] transition-colors"
                  >
                    <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Odświeżanie...' : 'Odśwież z Allegro'}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <ShipmentHeroCard
                  resolved={resolvedShipmentStatus}
                  detail={shipmentStatusText}
                  updatedAt={effectiveTrackingStatusUpdatedAt}
                  trackingNumber={effectiveTrackingNumber}
                  carrier={order.shippingMethod ?? null}
                />

                {refreshError && (
                  <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
                    {refreshError}
                  </div>
                )}

                <ShipmentTimeline
                  activeStep={resolvedShipmentStatus.step}
                  isIssue={resolvedShipmentStatus.isIssue}
                  isCancelled={resolvedShipmentStatus.isCancelled}
                  trackingStatus={null}
                  updatedAt={null}
                />

                {/* Per-parcel cards (from Allegro snapshot) */}
                {order.allShipments && order.allShipments.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-[#F0EFEC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                        {order.allShipments.length > 1 ? `Paczki (${order.allShipments.length})` : 'Paczka'}
                      </span>
                    </div>
                    <div className={order.allShipments.length > 1 ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
                      {order.allShipments.map((s, idx) => (
                        <ParcelCard key={s.waybill || idx} parcel={s} index={idx} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Carrier tracking history from Allegro API */}
                {order.source === 'allegro' && order.externalId && (
                  trackingLoading ? (
                    <div className="mt-3 border-t border-[#F0EFEC] pt-3 space-y-2 animate-pulse">
                      <div className="h-3 bg-[#F5F4F1] rounded w-32" />
                      <div className="h-3 bg-[#F5F4F1] rounded w-full" />
                      <div className="h-3 bg-[#F5F4F1] rounded w-3/4" />
                    </div>
                  ) : trackingData && (trackingData.allStatuses?.length ?? 0) > 0 ? (
                    <TrackingHistoryList statuses={trackingData.allStatuses} />
                  ) : trackingData && !trackingData.status ? null : (
                    trackingData?.waybill ? (
                      <div className="mt-3 border-t border-[#F0EFEC] pt-3 text-[11px] text-[#A3A3A3]">
                        Brak historii śledzenia dla {trackingData.waybill}
                      </div>
                    ) : null
                  )
                )}

              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 md:px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          <div>
            {canCancel && (
              <button className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                Anuluj zamowienie
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {order.source === 'allegro' &&
              ['shipped', 'paid', 'processing'].includes(order.status) &&
              (order.trackingNumber || (order.allShipments?.length ?? 0) > 0) && (
              <button
                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                onClick={() => void markDelivered()}
                disabled={markingDelivered}
              >
                {markingDelivered ? 'Zapisywanie...' : 'Oznacz jako dostarczone'}
              </button>
            )}
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
        {markError && (
          <div className="px-4 md:px-6 pb-3 text-[11px] text-red-700">
            {markError}
          </div>
        )}
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
