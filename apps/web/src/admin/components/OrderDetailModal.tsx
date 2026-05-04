'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  X, RefreshCw, Package, Truck, CheckCircle2, AlertTriangle, XCircle, Clock,
  Maximize2, Copy, Check, Mail, Phone, MapPin, AtSign, ExternalLink, ChevronRight,
  Building2, FileText, Loader2,
} from 'lucide-react'
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

const dateFmt = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
function fmtDate(iso?: string | null) { return iso ? dateFmt.format(new Date(iso)) : '—' }

const SYM: Record<string, string> = { PLN: 'zł', EUR: '€', CZK: 'Kč', HUF: 'Ft' }
function fmtAmount(v?: number | null, c = 'PLN') {
  if (v == null) return '—'
  return `${Number(v).toFixed(2)} ${SYM[c] ?? c}`
}

const SHIPMENT_STEPS = [
  { key: 'accepted',  label: 'Przyjęte' },
  { key: 'preparing', label: 'Przygotowanie' },
  { key: 'shipped',   label: 'Wysłane' },
  { key: 'delivered', label: 'Doręczone' },
] as const

function shipmentVisual(args: { isCancelled: boolean; isIssue: boolean; step: number }) {
  if (args.isCancelled) return { Icon: XCircle, tone: 'cancelled' as const }
  if (args.isIssue) return { Icon: AlertTriangle, tone: 'issue' as const }
  if (args.step >= 3) return { Icon: CheckCircle2, tone: 'done' as const }
  if (args.step === 2) return { Icon: Truck, tone: 'transit' as const }
  if (args.step === 1) return { Icon: Package, tone: 'preparing' as const }
  return { Icon: Clock, tone: 'pending' as const }
}

const TONE_CLS: Record<string, { bar: string; iconBg: string; iconFg: string; text: string }> = {
  cancelled: { bar: 'bg-stone-400', iconBg: 'bg-stone-200', iconFg: 'text-stone-700', text: 'text-stone-700' },
  issue:     { bar: 'bg-red-600',   iconBg: 'bg-red-100',   iconFg: 'text-red-700',   text: 'text-red-900' },
  done:      { bar: 'bg-emerald-600', iconBg: 'bg-emerald-100', iconFg: 'text-emerald-700', text: 'text-emerald-900' },
  transit:   { bar: 'bg-sky-600',   iconBg: 'bg-sky-100',   iconFg: 'text-sky-700',   text: 'text-sky-900' },
  preparing: { bar: 'bg-amber-500', iconBg: 'bg-amber-100', iconFg: 'text-amber-700', text: 'text-amber-900' },
  pending:   { bar: 'bg-stone-400', iconBg: 'bg-stone-200', iconFg: 'text-stone-700', text: 'text-stone-800' },
}

const STATUS_CODE_LABELS: Record<string, string> = {
  DELIVERED: 'Doręczono', PARCEL_LOCKER_DELIVERED: 'Dostarczone do paczkomatu',
  OUT_FOR_DELIVERY: 'W doręczeniu', RELEASED_FOR_DELIVERY: 'W doręczeniu',
  IN_TRANSIT: 'W transporcie', PENDING: 'Oczekuje na nadanie',
  ARRIVED_AT_SORTING_CENTER: 'W centrum sortowania', ARRIVED: 'Dotarła do oddziału',
  DEPARTED: 'Wyjechała z oddziału', LABEL_CREATED: 'Etykieta wygenerowana',
  CREATED: 'Przesyłka utworzona', READY_FOR_PICKUP: 'Gotowa do odbioru',
  AVAILABLE_FOR_PICKUP: 'Czeka w punkcie odbioru', NOTICE_LEFT: 'Awizowana',
  PICKUP_READY: 'Gotowa do odbioru', PICKUP_ATTEMPTED: 'Próba doręczenia nieudana',
  ISSUE: 'Problem z doręczeniem', RETURNED: 'Zwrócona',
  RETURN_TO_SENDER: 'Zwrot do nadawcy', LOST: 'Zagubiona',
  EXCEPTION: 'Problem z doręczeniem', CANCELLED: 'Anulowana', CUSTOMS: 'Kontrola celna',
}
function resolveStatusLabel(code: string | null | undefined): string {
  if (!code) return '—'
  const u = code.trim().toUpperCase()
  return STATUS_CODE_LABELS[u] ?? u.replace(/_/g, ' ')
}

function CopyChip({ value, label, mono = true }: { value?: string | number | null; label?: string; mono?: boolean }) {
  const text = value == null || value === '' ? '' : String(value)
  const [copied, setCopied] = useState(false)
  if (!text) return <span className="text-stone-400">—</span>
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1100) }}
      className={`group inline-flex items-center gap-1 px-1 -mx-1 py-0.5 rounded-sm transition ${
        copied ? 'bg-emerald-700 text-white' : 'hover:bg-stone-200/70 text-stone-800'
      }`}
      title="Kopiuj"
    >
      <span className={mono ? 'font-mono tabular-nums text-[13px]' : 'text-[13px]'}>{label ?? text}</span>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 transition" />}
    </button>
  )
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{children}</h3>
      {action}
    </div>
  )
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white border border-stone-200 rounded-sm ${className}`}>{children}</section>
}

function InfoRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-2 border-b border-stone-100 last:border-0 text-[13px] hover:bg-stone-50/50">
      <div className="text-[11px] uppercase tracking-[0.06em] text-stone-500 w-[100px] flex-shrink-0">{label}</div>
      <div className={`flex-1 min-w-0 break-words text-stone-900 ${mono ? 'font-mono tabular-nums text-[13px]' : ''}`}>{value}</div>
    </div>
  )
}

function ShipmentTrack({ activeStep, isIssue, isCancelled }: { activeStep: number; isIssue: boolean; isCancelled: boolean }) {
  const fillPct = isCancelled ? 0 : (Math.min(activeStep, SHIPMENT_STEPS.length - 1) / (SHIPMENT_STEPS.length - 1)) * 100
  return (
    <div className="px-3 py-3 bg-stone-50/60 border-t border-stone-100">
      <div className="relative px-1">
        <div className="absolute left-1 right-1 top-1.5 h-px bg-stone-300" />
        <div
          className={`absolute left-1 top-1.5 h-px transition-all ${isIssue ? 'bg-red-600' : isCancelled ? 'bg-stone-400' : 'bg-stone-900'}`}
          style={{ width: `calc((100% - 8px) * ${fillPct / 100})` }}
        />
        <div className="relative flex justify-between">
          {SHIPMENT_STEPS.map((s, i) => {
            const done = !isCancelled && i <= activeStep
            const current = !isCancelled && i === activeStep
            return (
              <div key={s.key} className="flex flex-col items-center gap-1.5 z-10">
                <span className={`w-3 h-3 rounded-full border-2 bg-white ${
                  isCancelled ? 'border-stone-300' :
                  isIssue && current ? 'border-red-600 bg-red-600' :
                  done ? 'border-stone-900 bg-stone-900' : 'border-stone-300'
                }`} />
                <span className={`text-[10.5px] whitespace-nowrap ${done ? 'text-stone-900 font-medium' : 'text-stone-500'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ShipmentSummary({
  resolved, detail, updatedAt, trackingNumber, carrier,
}: {
  resolved: { label: string; detail: string | null; step: number; isIssue: boolean; isCancelled: boolean }
  detail: string | null
  updatedAt: string | null
  trackingNumber: string | null
  carrier: string | null
}) {
  const v = shipmentVisual({ isCancelled: resolved.isCancelled, isIssue: resolved.isIssue, step: resolved.step })
  const cls = TONE_CLS[v.tone]
  const Icon = v.Icon
  return (
    <div className="flex items-stretch">
      <span className={`w-1 ${cls.bar} flex-shrink-0`} />
      <div className="flex-1 p-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-sm ${cls.iconBg} ${cls.iconFg} grid place-items-center flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[14px] font-semibold ${cls.text}`}>{resolved.label}</div>
            {detail && detail !== resolved.label && (
              <div className="text-[12px] text-stone-600 leading-snug mt-0.5">{detail}</div>
            )}
          </div>
        </div>
        {(trackingNumber || carrier || updatedAt) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-stone-100 text-[11.5px]">
            {trackingNumber && (
              <span className="inline-flex items-center gap-1">
                <span className="text-stone-500">Numer:</span>
                <CopyChip value={trackingNumber} />
              </span>
            )}
            {carrier && <span className="text-stone-600"><span className="text-stone-500">Kurier:</span> {carrier}</span>}
            {updatedAt && <span className="text-stone-500 ml-auto tabular-nums">Aktualizacja: {fmtDate(updatedAt)}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function ParcelCard({ parcel, index }: { parcel: AllegroShipmentEntry; index: number }) {
  const [open, setOpen] = useState(false)
  const events = parcel.events ?? []
  const carrierLabel = parcel.carrierName ?? (parcel.carrierId && parcel.carrierId !== 'UNKNOWN' ? parcel.carrierId : null)
  return (
    <div className={`border rounded-sm overflow-hidden ${parcel.isSelected ? 'border-stone-400 bg-white' : 'border-stone-200 bg-stone-50/30'}`}>
      <button
        type="button"
        onClick={() => events.length > 0 && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${events.length > 0 ? 'hover:bg-stone-50' : ''}`}
      >
        {events.length > 0 && <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition flex-shrink-0 ${open ? 'rotate-90' : ''}`} />}
        <span className="font-mono tabular-nums text-[10.5px] text-stone-500 flex-shrink-0">#{index + 1}</span>
        <span className="font-mono tabular-nums text-[13px] text-stone-900 truncate">{parcel.waybill}</span>
        {parcel.isSelected && (
          <span className="text-[9.5px] font-bold bg-stone-900 text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wide flex-shrink-0">Główna</span>
        )}
        <span className="ml-auto inline-flex items-center text-[10.5px] font-medium text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-sm flex-shrink-0">
          {parcel.statusLabel ?? parcel.statusCode}
        </span>
      </button>
      {(carrierLabel || parcel.occurredAt) && (
        <div className="px-3 pb-2 -mt-1 text-[11px] text-stone-500 flex items-center gap-2">
          {carrierLabel && <span>{carrierLabel}</span>}
          {carrierLabel && parcel.occurredAt && <span className="text-stone-300">·</span>}
          {parcel.occurredAt && <span className="tabular-nums">{fmtDate(parcel.occurredAt)}</span>}
        </div>
      )}
      {open && events.length > 0 && (
        <ol className="border-t border-stone-100 m-0 p-0 list-none bg-white">
          {events.slice().reverse().map((e, i) => (
            <li key={`${e.code}-${e.occurredAt ?? i}`} className="flex items-center gap-2 px-3 py-1.5 border-b border-stone-100 last:border-0 text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-700 flex-shrink-0" />
              <span className="font-mono text-[10.5px] text-stone-500 flex-shrink-0">{e.code}</span>
              <span className="text-stone-900 truncate flex-1">{e.label ?? e.code}</span>
              {e.occurredAt && <span className="text-[11px] text-stone-500 tabular-nums whitespace-nowrap">{fmtDate(e.occurredAt)}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function TrackingHistoryList({ statuses }: { statuses: AllegroTrackingStatusEntry[] }) {
  if (statuses.length === 0) return null
  return (
    <Panel>
      <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Historia przesyłki</span>
        <span className="ml-auto text-[10.5px] font-mono text-stone-400">{statuses.length}</span>
      </div>
      <ol className="m-0 p-0 list-none">
        {statuses.map((entry, i) => {
          const isFirst = i === 0
          return (
            <li key={`${entry.status}-${entry.occurredAt ?? i}`} className="flex items-start gap-3 px-3 py-2 border-b border-stone-100 last:border-0">
              <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 border-2 ${isFirst ? 'border-stone-900 bg-stone-900' : 'border-stone-300 bg-white'}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-[12.5px] leading-snug ${isFirst ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>
                  {resolveStatusLabel(entry.status)}
                </div>
                {entry.description && entry.description !== entry.status && (
                  <div className="text-[11.5px] text-stone-500 mt-0.5 leading-snug">{entry.description}</div>
                )}
              </div>
              {entry.occurredAt && (
                <div className="text-[10.5px] text-stone-500 tabular-nums whitespace-nowrap mt-0.5">{fmtDate(entry.occurredAt)}</div>
              )}
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function KpiCell({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' }) {
  const cls = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-stone-900'
  return (
    <div className="px-4 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold mb-0.5">{label}</div>
      <div className={`text-[14px] font-semibold tabular-nums truncate ${cls}`}>{value}</div>
      {sub != null && <div className="text-[10.5px] text-stone-500 truncate mt-0.5">{sub}</div>}
    </div>
  )
}

export function OrderDetailModal({
  order, isOpen, onClose, onCreateShipment, onDownloadLabel, onShipmentRefreshed,
}: OrderDetailModalProps) {
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [trackingData, setTrackingData] = useState<AllegroTrackingData | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  const fetchTracking = async (externalId: string) => {
    setTrackingLoading(true)
    try {
      const res = await adminApi.getAllegroOrderTracking(externalId)
      if (res.success) setTrackingData(res.data)
    } catch {} finally { setTrackingLoading(false) }
  }

  const refreshShipment = async (force: boolean) => {
    if (!order || refreshing) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      const res = await adminApi.refreshOrderShipment(order.id, { force })
      onShipmentRefreshed?.(order.id, res.data.snapshot ?? null)
      if (order.externalId) void fetchTracking(order.externalId)
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Błąd odświeżania')
    } finally { setRefreshing(false) }
  }

  useEffect(() => {
    if (!isOpen) {
      setLabelPickerOpen(false)
      setTrackingData(null)
      setRefreshError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !order || order.source !== 'allegro') return
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) return
    void refreshShipment(false)
    if (order.externalId) void fetchTracking(order.externalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', onEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !order) return null

  const customer = order.customerData
  const address = customer?.shippingAddress
  const canShip = ['paid', 'processing'].includes(order.status)
  const canCancel = ['pending', 'paid', 'processing'].includes(order.status)
  const resolved = resolveShipmentStatus({
    status: order.status,
    shipmentDisplayStatus: order.shipmentDisplayStatus ?? 'unknown',
    allegroFulfillmentStatus: order.allegroFulfillmentStatus,
  })
  const shipmentStatusText = order.trackingStatus ?? resolved.detail

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div
          className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={onClose}
        />

        <div className="relative w-full max-w-[1100px] max-h-[92dvh] h-[92dvh] md:h-auto md:max-h-[92dvh] flex flex-col bg-stone-100 rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-stone-300 overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200">

          {/* Header */}
          <div className="bg-white border-b border-stone-200 shrink-0">
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <h2 className="text-[18px] font-semibold tracking-tight text-stone-900 m-0 flex items-baseline gap-2">
                  <span>Zamówienie</span>
                  <span className="font-mono tabular-nums">#{order.orderNumber}</span>
                </h2>
                <span className="h-5 w-px bg-stone-200" />
                <OrderStatusBadge
                  status={order.status}
                  source={order.source}
                  allegroFulfillmentStatus={order.allegroFulfillmentStatus}
                  paymentMethod={order.paymentMethod}
                  paidAt={order.paidAt}
                />
                {order.source === 'allegro' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-[#FF5A00]/30 bg-[#FF5A00]/10 text-[#FF5A00] text-[11px] font-bold uppercase tracking-wide">Allegro</span>
                )}
                {order.invoiceRequired && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-sky-200 bg-sky-50 text-sky-800 text-[11px] font-semibold uppercase tracking-wide"><FileText className="w-3 h-3" /> FV</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[12px] text-stone-500 tabular-nums hidden sm:inline mr-2">{fmtDate(order.createdAt)}</span>
                <Link
                  href={`/admin/orders/${order.id}`}
                  onClick={onClose}
                  title="Otwórz pełny widok"
                  className="inline-flex items-center gap-1.5 px-2.5 h-8 text-[12.5px] font-medium text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 hover:border-stone-400 rounded-sm transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pełny widok</span>
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-sm text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
                  title="Zamknij (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* mini KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-stone-200 border-t border-stone-200">
              <KpiCell
                label="Suma"
                value={<>{Number(order.total).toFixed(2)} <span className="text-stone-500 text-[11px] font-normal">{order.currency}</span></>}
                sub={order.totalPln != null && order.currency !== 'PLN' ? `≈ ${Number(order.totalPln).toFixed(2)} PLN` : null}
              />
              <KpiCell
                label="Pozycje"
                value={`${order.items.reduce((a, i) => a + Number(i.quantity || 0), 0)}`}
                sub={`${order.items.length} sku`}
              />
              <KpiCell
                label="Płatność"
                value={order.paidAt ? 'Opłacone' : 'Nieopłacone'}
                sub={order.paidAt ? fmtDate(order.paidAt) : (order.paymentMethod ?? '—')}
                tone={order.paidAt ? 'ok' : 'warn'}
              />
              <KpiCell
                label="Wysyłka"
                value={resolved.label}
                sub={order.trackingNumber ?? order.shippingMethod ?? '—'}
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 px-4 sm:px-5 py-4">
              {/* Main column */}
              <div className="space-y-4 min-w-0">
                {/* Items */}
                <div>
                  <SectionTitle>Pozycje</SectionTitle>
                  <Panel className="overflow-hidden">
                    <table className="w-full border-collapse">
                      <colgroup>
                        <col />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-stone-50/70 border-b border-stone-200 text-[10.5px] uppercase tracking-[0.1em] text-stone-500 font-semibold">
                          <th className="px-3 py-2 text-left">Produkt</th>
                          <th className="px-3 py-2 text-right">Ilość</th>
                          <th className="px-3 py-2 text-right">Cena jedn.</th>
                          <th className="px-3 py-2 text-right">Wartość</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, i) => (
                          <tr key={`${item.productSku}-${i}`} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                            <td className="px-3 py-2 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] text-stone-500 w-5 text-right tabular-nums flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                <div className="min-w-0">
                                  <div className="text-[13px] text-stone-900 truncate" title={item.productName}>{item.productName}</div>
                                  <div className="text-[11px] text-stone-500"><CopyChip value={item.productSku} /></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right"><span className="font-mono tabular-nums text-[13px] text-stone-900">{item.quantity}</span></td>
                            <td className="px-3 py-2 text-right"><span className="font-mono tabular-nums text-[13px] text-stone-700">{Number(item.unitPrice ?? 0).toFixed(2)}</span></td>
                            <td className="px-3 py-2 text-right"><span className="font-mono tabular-nums text-[13px] text-stone-900 font-medium">{Number(item.totalPrice ?? 0).toFixed(2)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {order.shippingCost != null && Number(order.shippingCost) > 0 && (
                          <tr className="bg-stone-50/70 border-t border-stone-200 text-[12.5px]">
                            <td className="px-3 py-2 text-stone-600">Dostawa <span className="text-stone-400">({order.shippingMethod ?? '—'})</span></td>
                            <td colSpan={2} />
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-stone-700">{Number(order.shippingCost).toFixed(2)}</td>
                          </tr>
                        )}
                        <tr className="bg-stone-900 text-white">
                          <td className="px-3 py-2 uppercase tracking-[0.1em] text-[11px] font-semibold">Suma</td>
                          <td colSpan={2} />
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-[14px] font-semibold">
                            {Number(order.total).toFixed(2)} <span className="text-stone-300 text-[11px] font-normal">{order.currency}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </Panel>
                </div>

                {/* Shipment */}
                <div>
                  <SectionTitle
                    action={order.source === 'allegro' && (
                      <button
                        type="button"
                        onClick={() => void refreshShipment(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1 text-[11.5px] text-stone-600 hover:text-stone-900 disabled:opacity-60 transition"
                      >
                        {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Odśwież z Allegro
                      </button>
                    )}
                  >
                    Wysyłka
                  </SectionTitle>
                  <Panel className="overflow-hidden">
                    <ShipmentSummary
                      resolved={resolved}
                      detail={shipmentStatusText}
                      updatedAt={order.trackingStatusUpdatedAt ?? null}
                      trackingNumber={order.trackingNumber ?? null}
                      carrier={order.shippingMethod ?? null}
                    />
                    <ShipmentTrack activeStep={resolved.step} isIssue={resolved.isIssue} isCancelled={resolved.isCancelled} />
                  </Panel>

                  {refreshError && (
                    <div className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-1.5">
                      {refreshError}
                    </div>
                  )}

                  {order.allShipments && order.allShipments.length > 0 && (
                    <div className="mt-3">
                      <SectionTitle>{order.allShipments.length > 1 ? `Paczki · ${order.allShipments.length}` : 'Paczka'}</SectionTitle>
                      <div className="space-y-2">
                        {order.allShipments.map((s, idx) => (
                          <ParcelCard key={s.waybill || idx} parcel={s} index={idx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {order.source === 'allegro' && order.externalId && (
                    <div className="mt-3">
                      {trackingLoading ? (
                        <Panel className="p-3 space-y-2 animate-pulse">
                          <div className="h-3 bg-stone-100 rounded-sm w-32" />
                          <div className="h-3 bg-stone-100 rounded-sm w-full" />
                          <div className="h-3 bg-stone-100 rounded-sm w-3/4" />
                        </Panel>
                      ) : trackingData && (trackingData.allStatuses?.length ?? 0) > 0 ? (
                        <TrackingHistoryList statuses={trackingData.allStatuses} />
                      ) : trackingData?.waybill ? (
                        <Panel className="px-3 py-2 text-[11.5px] text-stone-500">
                          Brak historii śledzenia dla {trackingData.waybill}
                        </Panel>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Payment */}
                <div>
                  <SectionTitle>Płatność</SectionTitle>
                  <Panel>
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="sm:border-r border-stone-100">
                        <InfoRow label="Metoda" value={order.paymentMethod ?? '—'} />
                        <InfoRow label="Opłacono" value={order.paidAt ? fmtDate(order.paidAt) : <span className="text-stone-400">—</span>} />
                      </div>
                      <div>
                        <InfoRow label="Waluta" mono value={order.currency} />
                        <InfoRow label="Kwota" mono value={fmtAmount(order.total, order.currency)} />
                      </div>
                    </div>
                  </Panel>
                </div>

                {order.notes && (
                  <div>
                    <SectionTitle>Notatka klienta</SectionTitle>
                    <Panel className="p-3 bg-amber-50/40 border-amber-200">
                      <div className="text-[13px] text-amber-900 whitespace-pre-wrap leading-snug">{order.notes}</div>
                    </Panel>
                  </div>
                )}
              </div>

              {/* Side column */}
              <aside className="space-y-3 min-w-0">
                <Panel>
                  <div className="px-3 py-2 border-b border-stone-100">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Klient</div>
                  </div>
                  <div className="px-3 py-2.5 border-b border-stone-100">
                    <div className="text-[14px] font-semibold text-stone-900 truncate">{customer?.name ?? '—'}</div>
                    {customer?.allegroLogin && (
                      <div className="text-[12px] text-stone-500 mt-0.5 inline-flex items-center gap-1 font-mono">
                        <AtSign className="w-3 h-3" /> {customer.allegroLogin}
                      </div>
                    )}
                  </div>
                  <div>
                    {customer?.email && (
                      <InfoRow label="E-mail" value={
                        <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 text-stone-900 hover:underline">
                          <Mail className="w-3 h-3 text-stone-500" /> {customer.email}
                        </a>
                      } />
                    )}
                    {customer?.phone && (
                      <InfoRow label="Telefon" value={
                        <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-stone-900 hover:underline">
                          <Phone className="w-3 h-3 text-stone-500" /> {customer.phone}
                        </a>
                      } />
                    )}
                    <InfoRow label="Numer" mono value={<CopyChip value={order.orderNumber} />} />
                    {order.externalId && <InfoRow label="Allegro ID" mono value={<CopyChip value={order.externalId} />} />}
                  </div>
                </Panel>

                {address && (
                  <Panel>
                    <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Adres dostawy</span>
                    </div>
                    <div className="px-3 py-2.5 text-[13px] text-stone-900 leading-[1.55]">
                      <div className="font-medium">{address.name || customer?.name}</div>
                      <div className="text-stone-700">{address.street}</div>
                      <div className="text-stone-700">{address.postalCode} {address.city}</div>
                      <div className="text-stone-500 text-[11.5px] mt-0.5">{address.country}</div>
                      {address.phone && (
                        <div className="text-[11.5px] text-stone-500 mt-1 inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {address.phone}
                        </div>
                      )}
                    </div>
                  </Panel>
                )}

                {order.invoiceRequired && (
                  <Panel>
                    <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Faktura</span>
                    </div>
                    {customer?.companyName || customer?.taxId ? (
                      <div>
                        {customer?.companyName && <InfoRow label="Firma" value={customer.companyName} />}
                        {customer?.taxId && <InfoRow label="NIP" mono value={<CopyChip value={customer.taxId} />} />}
                      </div>
                    ) : (
                      <div className="px-3 py-2.5 text-[12px] text-stone-500">Faktura dla osoby prywatnej</div>
                    )}
                  </Panel>
                )}

                {order.source === 'allegro' && order.externalId && (
                  <a
                    href={`https://allegro.pl/moje-allegro/sprzedaz/zamowienie/${order.externalId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 h-8 text-[12.5px] font-medium text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 hover:border-stone-400 rounded-sm transition"
                  >
                    Otwórz w Allegro <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </aside>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-stone-200 shrink-0">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 flex-wrap">
              <div>
                {canCancel && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 text-[12.5px] font-medium text-red-700 hover:text-red-900 hover:bg-red-50 rounded-sm transition"
                  >
                    Anuluj zamówienie
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/orders/${order.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 rounded-sm transition"
                >
                  Pełny widok
                </Link>
                {order.allegroShipmentId && onDownloadLabel ? (
                  (order.allShipments?.length ?? 0) > 1 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm transition"
                      onClick={() => setLabelPickerOpen(true)}
                    >
                      <FileText className="w-3.5 h-3.5" /> Pobierz etykiety ({order.allShipments!.length})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm transition"
                      onClick={() => onDownloadLabel(order)}
                    >
                      <FileText className="w-3.5 h-3.5" /> Pobierz etykietę
                    </button>
                  )
                ) : canShip && onCreateShipment ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm transition"
                    onClick={() => onCreateShipment(order)}
                  >
                    <Package className="w-3.5 h-3.5" /> Nadaj paczkę
                  </button>
                ) : null}
              </div>
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
