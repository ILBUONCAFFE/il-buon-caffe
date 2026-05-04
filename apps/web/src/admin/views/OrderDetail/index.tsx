'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowUpRight, Check, ChevronRight, ClipboardList, Copy,
  ExternalLink, FileText, Flag, History, Loader2, MapPin, Package, Phone, Receipt,
  RefreshCw, ShieldAlert, Truck, Undo2, User as UserIcon, XCircle, AtSign, CreditCard,
} from 'lucide-react'
import { OrderStatusBadge } from '@/admin/components/OrderStatusBadge'
import { ShipmentLabelPickerModal } from '@/admin/components/ShipmentLabelPickerModal'
import { ShipmentModal } from '@/admin/components/ShipmentModal'
import { adminApi } from '@/admin/lib/adminApiClient'
import type {
  AdminOrderDetail,
  AdminOrderDetailComplaint,
  AdminOrderTimelineEntry,
  AdminReturn,
  AllegroShipmentEntry,
} from '@/admin/types/admin-api'

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const fmtDateShort = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }) : '—'
const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : ''
const fmtMoney = (n?: number | string | null, c = 'PLN') => {
  const v = Number(n)
  if (n == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(2)} ${c}`
}
const num = (n?: number | string | null) => {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}
const daysSince = (iso?: string | null) => {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}
const copy = (t: string) => { if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(t) }

// ─── primitives ─────────────────────────────────────────────────────────────

function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>
}

function CopyChip({ value, label, mono = true }: { value?: string | number | null; label?: string; mono?: boolean }) {
  const text = value == null || value === '' ? '' : String(value)
  const [copied, setCopied] = useState(false)
  if (!text) return <span className="text-stone-400">—</span>
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copy(text); setCopied(true); setTimeout(() => setCopied(false), 1100) }}
      className={`group inline-flex items-center gap-1 px-1 py-0.5 -mx-1 rounded-sm transition ${
        copied ? 'bg-emerald-700 text-white' : 'hover:bg-stone-200/70 text-stone-800'
      }`}
      title="Kopiuj"
    >
      <span className={mono ? 'font-mono tabular-nums text-[12px]' : 'text-[12px]'}>{label ?? text}</span>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 transition" />}
    </button>
  )
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'err' | 'info' }) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    err: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1 border rounded-sm px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] ${tones}`}>
      {children}
    </span>
  )
}

function SectionHead({ id, title, count, action }: { id: string; title: string; count?: number | null; action?: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-[112px] flex items-center justify-between gap-3 mb-2 pt-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {title}
        {count != null && count > 0 && <span className="ml-2 font-mono text-[10px] text-stone-400">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-stone-200 rounded-sm ${className}`}>
      {children}
    </section>
  )
}

function Row({ label, children, mono, dim }: { label: string; children: React.ReactNode; mono?: boolean; dim?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-1.5 border-b border-stone-100 last:border-0 text-[12.5px] hover:bg-stone-50/50">
      <div className="text-[10.5px] uppercase tracking-[0.08em] text-stone-500 w-[110px] flex-shrink-0">{label}</div>
      <div className={`flex-1 min-w-0 break-words ${dim ? 'text-stone-400' : 'text-stone-900'} ${mono ? 'font-mono tabular-nums text-[12px]' : ''}`}>
        {children}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'ok' | 'warn' | 'err' }) {
  const toneCls = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'err' ? 'text-red-700' : 'text-stone-900'
  return (
    <div className="px-4 py-2.5 flex flex-col justify-center min-w-0 first:pl-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-medium mb-0.5">{label}</div>
      <div className={`text-[15px] font-medium tabular-nums truncate ${toneCls}`}>{value}</div>
      {sub != null && <div className="text-[10.5px] text-stone-500 truncate mt-0.5">{sub}</div>}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-stone-200 my-5" />
}

// ─── top bar / KPI / sub-nav ────────────────────────────────────────────────

const SECTIONS = [
  { id: 'items', label: 'Pozycje' },
  { id: 'payment', label: 'Płatność' },
  { id: 'shipping', label: 'Wysyłka' },
  { id: 'returns', label: 'Zwroty' },
  { id: 'complaints', label: 'Dyskusje' },
  { id: 'notes', label: 'Notatki' },
  { id: 'timeline', label: 'Aktywność' },
  { id: 'audit', label: 'Audyt' },
] as const

type SectionId = typeof SECTIONS[number]['id']

function CommandBar({
  order, loadingKey, onRefresh, onRefreshShipment, onCreateShipment, onDownloadLabel, onFulfillment,
}: {
  order: AdminOrderDetail
  loadingKey: string | null
  onRefresh: () => void
  onRefreshShipment: () => void
  onCreateShipment: () => void
  onDownloadLabel: () => void
  onFulfillment: (s: 'PROCESSING' | 'READY_FOR_SHIPMENT' | 'SENT' | 'PICKED_UP' | 'CANCELLED') => void
}) {
  const channel = order.source === 'allegro' ? 'Allegro' : 'Sklep'
  const headlineId = order.externalId ?? order.orderNumber
  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-[1480px] mx-auto px-6 pt-3 pb-2.5">
        <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-2">
          <a className="hover:text-stone-900" href="/admin/orders">Zamówienia</a>
          <ChevronRight className="w-3 h-3 text-stone-300" />
          <a className="hover:text-stone-900" href={`/admin/orders?source=${order.source}`}>{channel}</a>
          <ChevronRight className="w-3 h-3 text-stone-300" />
          <Mono className="text-stone-700">#{order.orderNumber}</Mono>
          <span className="text-stone-300">·</span>
          <span>{fmtDate(order.createdAt)}</span>
          {order.warnings.length > 0 && (
            <>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="w-3 h-3" /> {order.warnings.length} {order.warnings.length === 1 ? 'ostrzeżenie' : 'ostrzeżeń'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h1 className="text-[20px] font-semibold tracking-tight text-stone-900 m-0 flex items-center gap-2">
              <span>Zamówienie</span>
              <Mono className="font-medium text-stone-900">#{headlineId}</Mono>
            </h1>
            <span className="h-5 w-px bg-stone-200" />
            <OrderStatusBadge
              status={order.status}
              source={order.source}
              allegroFulfillmentStatus={order.allegroFulfillmentStatus}
              paymentMethod={order.paymentMethod}
              paidAt={order.paidAt}
            />
            {order.shipmentFreshness === 'stale' && <Pill tone="warn">Stary tracking</Pill>}
            {order.source === 'allegro' && <Pill tone="info">Allegro</Pill>}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <BtnGhost icon={RefreshCw} loading={loadingKey === 'refresh'} onClick={onRefresh}>Odśwież</BtnGhost>
            {order.actions.canRefreshShipment && (
              <BtnGhost icon={Truck} loading={loadingKey === 'shipment-refresh'} onClick={onRefreshShipment}>Tracking</BtnGhost>
            )}
            {order.actions.canDownloadLabel && (
              <BtnGhost icon={FileText} loading={loadingKey === 'label'} onClick={onDownloadLabel}>Etykieta</BtnGhost>
            )}
            {order.actions.canSyncFulfillment && (
              <>
                <BtnGhost icon={Truck} loading={loadingKey === 'fulfillment-SENT'} onClick={() => onFulfillment('SENT')}>SENT</BtnGhost>
                <BtnGhost icon={Check} loading={loadingKey === 'fulfillment-PICKED_UP'} onClick={() => onFulfillment('PICKED_UP')}>PICKED_UP</BtnGhost>
                <BtnGhost icon={XCircle} loading={loadingKey === 'fulfillment-CANCELLED'} onClick={() => onFulfillment('CANCELLED')}>Anuluj</BtnGhost>
              </>
            )}
            {order.actions.canCreateShipment && (
              <BtnPrimary icon={Package} onClick={onCreateShipment}>Nadaj paczkę</BtnPrimary>
            )}
          </div>
        </div>

        {order.warnings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {order.warnings.map((w) => (
              <span
                key={w.code}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm border ${
                  w.level === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />{w.message}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BtnGhost({ icon: Icon, loading, onClick, children }: { icon?: React.ComponentType<{ className?: string }>; loading?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[12px] font-medium border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 hover:border-stone-400 rounded-sm transition disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {children}
    </button>
  )
}

function BtnPrimary({ icon: Icon, loading, onClick, children }: { icon?: React.ComponentType<{ className?: string }>; loading?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm transition disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {children}
    </button>
  )
}

function KpiStrip({ order }: { order: AdminOrderDetail }) {
  const age = daysSince(order.createdAt)
  const itemsCount = order.items.reduce((acc, i) => acc + Number(i.quantity || 0), 0)
  const paidTone: 'ok' | 'warn' = order.paidAt ? 'ok' : 'warn'
  const shipTone: 'ok' | 'warn' | undefined = order.shippedAt ? 'ok' : undefined
  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-[1480px] mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 divide-x divide-stone-200">
          <Stat label="Suma" value={<>{num(order.total).toFixed(2)} <span className="text-stone-500 text-[11px] font-normal">{order.currency}</span></>}
                sub={order.totalPln && order.currency !== 'PLN' ? `≈ ${num(order.totalPln).toFixed(2)} PLN` : null} />
          <Stat label="Pozycje" value={<>{itemsCount}<span className="text-stone-400 text-[11px] font-normal"> / {order.items.length} sku</span></>} />
          <Stat label="Wysyłka" value={fmtMoney(order.shippingCost ?? 0, order.currency)} />
          <Stat label="VAT" value={order.taxAmount == null ? '—' : fmtMoney(order.taxAmount, order.currency)} />
          <Stat label="Opłacono" value={order.paidAt ? fmtDateShort(order.paidAt) : 'Nie'} sub={order.paidAt ? fmtTime(order.paidAt) : null} tone={paidTone} />
          <Stat label="Wysłane" value={order.shippedAt ? fmtDateShort(order.shippedAt) : '—'} sub={order.shippedAt ? fmtTime(order.shippedAt) : null} tone={shipTone} />
          <Stat label="Wiek" value={age == null ? '—' : <>{age}<span className="text-stone-500 text-[11px] font-normal"> dni</span></>} sub={order.deliveredAt ? `Dostarczono ${fmtDateShort(order.deliveredAt)}` : null} />
        </div>
      </div>
    </div>
  )
}

function SubNav({ order, active, onPick }: { order: AdminOrderDetail; active: SectionId; onPick: (s: SectionId) => void }) {
  const counts: Partial<Record<SectionId, number>> = {
    items: order.items.length,
    returns: order.badgeCounts.returns,
    complaints: order.badgeCounts.complaints,
    timeline: order.statusHistory.length,
    audit: order.badgeCounts.audit,
  }
  return (
    <div className="bg-stone-50/80 backdrop-blur supports-[backdrop-filter]:bg-stone-50/70 border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-[1480px] mx-auto px-6">
        <nav className="flex gap-0 overflow-x-auto -mx-1">
          {SECTIONS.map((s) => {
            const c = counts[s.id]
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(s.id)}
                className={`relative px-3 h-9 text-[12px] inline-flex items-center gap-1.5 transition whitespace-nowrap ${
                  isActive ? 'text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {s.label}
                {c != null && c > 0 && (
                  <span className={`font-mono text-[10px] px-1 py-px rounded-sm ${isActive ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'}`}>{c}</span>
                )}
                {isActive && <span className="absolute left-0 right-0 -bottom-px h-px bg-stone-900" />}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

// ─── items ──────────────────────────────────────────────────────────────────

function ItemsBlock({ order }: { order: AdminOrderDetail }) {
  return (
    <div>
      <SectionHead id="items" title="Pozycje zamówienia" count={order.items.length}
        action={order.source === 'allegro' && order.externalId
          ? <a href={`https://allegro.pl/moje-allegro/sprzedaz/zamowienie/${order.externalId}`} target="_blank" rel="noreferrer"
               className="text-[11.5px] text-stone-600 hover:text-stone-900 inline-flex items-center gap-1">
              Otwórz w Allegro <ArrowUpRight className="w-3 h-3" />
            </a>
          : null} />
      <Panel className="overflow-hidden">
        <table className="w-full border-collapse">
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '130px' }} />
          </colgroup>
          <thead>
            <tr className="bg-stone-50/70 border-b border-stone-200">
              <th className="text-left text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold px-3 py-2">Produkt</th>
              <th className="text-left text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold px-3 py-2">SKU</th>
              <th className="text-right text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold px-3 py-2">Ilość</th>
              <th className="text-right text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold px-3 py-2">Cena jedn.</th>
              <th className="text-right text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold px-3 py-2">Wartość</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={`${item.id ?? item.productSku}-${i}`} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 group">
                <td className="px-3 py-2 align-middle">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] text-stone-500 w-5 text-right tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[12.5px] text-stone-900 truncate" title={item.productName}>{item.productName}</span>
                  </div>
                </td>
                <td className="px-3 py-2"><CopyChip value={item.productSku} /></td>
                <td className="px-3 py-2 text-right"><Mono className="text-[12.5px]">{item.quantity}</Mono></td>
                <td className="px-3 py-2 text-right"><Mono className="text-[12.5px] text-stone-700">{num(item.unitPrice).toFixed(2)}</Mono></td>
                <td className="px-3 py-2 text-right"><Mono className="text-[12.5px] text-stone-900 font-medium">{num(item.totalPrice).toFixed(2)}</Mono></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-stone-50/70 border-t border-stone-200 text-[12px]">
              <td className="px-3 py-1.5 text-stone-500 uppercase tracking-[0.08em] text-[10.5px]">Wartość pozycji</td>
              <td colSpan={3} />
              <td className="px-3 py-1.5 text-right"><Mono className="text-stone-700">{num(order.subtotal ?? 0).toFixed(2)}</Mono></td>
            </tr>
            <tr className="text-[12px] border-t border-stone-100">
              <td className="px-3 py-1.5 text-stone-500 uppercase tracking-[0.08em] text-[10.5px]">Wysyłka</td>
              <td colSpan={3} className="px-3 py-1.5 text-stone-500 text-[11px]">{order.shippingMethod ?? '—'}</td>
              <td className="px-3 py-1.5 text-right"><Mono className="text-stone-700">{num(order.shippingCost ?? 0).toFixed(2)}</Mono></td>
            </tr>
            {order.taxAmount != null && (
              <tr className="text-[12px] border-t border-stone-100">
                <td className="px-3 py-1.5 text-stone-500 uppercase tracking-[0.08em] text-[10.5px]">VAT</td>
                <td colSpan={3} />
                <td className="px-3 py-1.5 text-right"><Mono className="text-stone-700">{num(order.taxAmount).toFixed(2)}</Mono></td>
              </tr>
            )}
            <tr className="bg-stone-900 text-white">
              <td className="px-3 py-2 uppercase tracking-[0.1em] text-[11px] font-semibold">Suma</td>
              <td colSpan={3} />
              <td className="px-3 py-2 text-right"><Mono className="text-[14px] font-semibold">{num(order.total).toFixed(2)} <span className="text-stone-300 text-[11px] font-normal">{order.currency}</span></Mono></td>
            </tr>
          </tfoot>
        </table>
      </Panel>
    </div>
  )
}

// ─── payment ────────────────────────────────────────────────────────────────

function PaymentBlock({ order }: { order: AdminOrderDetail }) {
  return (
    <div>
      <SectionHead id="payment" title="Płatność" />
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="md:border-r border-stone-100">
            <Row label="Metoda">{order.paymentMethod ?? '—'}</Row>
            <Row label="P24 status">
              {order.p24Status
                ? <Pill tone={order.p24Status.toLowerCase().includes('success') ? 'ok' : 'neutral'}>{order.p24Status}</Pill>
                : <span className="text-stone-400">—</span>}
            </Row>
            <Row label="Opłacono" dim={!order.paidAt}>{order.paidAt ? fmtDate(order.paidAt) : 'Nieopłacone'}</Row>
            <Row label="Kwota" mono>{fmtMoney(order.total, order.currency)}</Row>
          </div>
          <div>
            <Row label="Transakcja" mono>{order.p24TransactionId ? <CopyChip value={order.p24TransactionId} /> : <span className="text-stone-400">—</span>}</Row>
            <Row label="Sesja P24" mono>{order.p24SessionId ? <CopyChip value={order.p24SessionId} /> : <span className="text-stone-400">—</span>}</Row>
            <Row label="Waluta" mono>{order.currency}</Row>
            {order.exchangeRate != null && (
              <Row label="Kurs" mono>{order.exchangeRate} <span className="text-stone-400">({order.rateDate ?? '—'})</span></Row>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}

// ─── shipping ───────────────────────────────────────────────────────────────

function ShippingBlock({ order, onRefresh, loading }: { order: AdminOrderDetail; onRefresh: () => void; loading: boolean }) {
  const parcels = order.allShipments ?? []
  return (
    <div>
      <SectionHead
        id="shipping"
        title="Wysyłka"
        count={parcels.length}
        action={
          <button type="button" onClick={onRefresh} disabled={loading}
            className="text-[11.5px] text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 disabled:opacity-60">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Odśwież tracking
          </button>
        }
      />
      <Panel className="mb-3">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="md:border-r border-stone-100">
            <Row label="Metoda">{order.shippingMethod ?? '—'}</Row>
            <Row label="Status">{order.trackingStatus ?? order.trackingStatusCode ?? '—'}</Row>
            <Row label="Aktualizacja" dim={!order.trackingStatusUpdatedAt}>{fmtDate(order.trackingStatusUpdatedAt)}</Row>
          </div>
          <div>
            <Row label="Numer paczki" mono>
              {order.trackingNumber ? <CopyChip value={order.trackingNumber} /> : <span className="text-stone-400">—</span>}
            </Row>
            <Row label="Allegro shipment" mono>
              {order.allegroShipmentId ? <CopyChip value={order.allegroShipmentId} /> : <span className="text-stone-400">—</span>}
            </Row>
            <Row label="Wysłano" dim={!order.shippedAt}>{fmtDate(order.shippedAt)}</Row>
            <Row label="Doręczono" dim={!order.deliveredAt}>{fmtDate(order.deliveredAt)}</Row>
          </div>
        </div>
      </Panel>

      {parcels.length === 0 ? (
        <Empty icon={Truck} title="Brak zapisanych paczek" hint="Po nadaniu paczki pojawi się tutaj historia tracking." />
      ) : (
        <div className="space-y-2">
          {parcels.map((p) => <ParcelRow key={p.waybill} parcel={p} />)}
        </div>
      )}
    </div>
  )
}

function ParcelRow({ parcel }: { parcel: AllegroShipmentEntry }) {
  const [open, setOpen] = useState(false)
  const events = parcel.events ?? []
  return (
    <Panel className="overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-stone-50">
        <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition ${open ? 'rotate-90' : ''}`} />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Mono className="text-[12.5px] text-stone-900">{parcel.waybill}</Mono>
          {parcel.isSelected && <Pill tone="info">aktywna</Pill>}
        </div>
        <span className="text-[11.5px] text-stone-500 truncate">{parcel.carrierName ?? parcel.carrierId}</span>
        <Pill tone="neutral">{parcel.statusCode}</Pill>
        <span className="text-[11px] text-stone-500 tabular-nums whitespace-nowrap">{fmtDate(parcel.occurredAt)}</span>
      </button>
      {open && events.length > 0 && (
        <ol className="border-t border-stone-100 m-0 p-0 list-none">
          {events.map((e, i) => (
            <li key={`${e.code}-${e.occurredAt ?? i}`} className="flex items-center gap-3 px-3 py-1.5 border-b border-stone-100 last:border-0 text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-700 flex-shrink-0" />
              <span className="font-mono text-[10.5px] text-stone-500">{e.code}</span>
              <span className="text-stone-900 truncate flex-1">{e.label ?? e.code}</span>
              <span className="text-[11px] text-stone-500 tabular-nums whitespace-nowrap">{fmtDate(e.occurredAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

// ─── returns / complaints / notes ───────────────────────────────────────────

function ReturnsBlock({ returns, currency }: { returns: AdminReturn[]; currency: string }) {
  return (
    <div>
      <SectionHead id="returns" title="Zwroty" count={returns.length} />
      {returns.length === 0
        ? <Empty icon={Undo2} title="Brak zwrotów" />
        : (
          <Panel>
            {returns.map((r, i) => (
              <div key={r.id} className={`px-3 py-2.5 ${i > 0 ? 'border-t border-stone-100' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <CopyChip value={r.returnNumber} />
                  <Pill tone="warn">{r.status}</Pill>
                  <span className="ml-auto"><Mono className="text-[13px] font-semibold text-stone-900">{fmtMoney(r.totalRefundAmount, r.currency || currency)}</Mono></span>
                </div>
                <div className="text-[12.5px] text-stone-900">{r.reason}</div>
                {r.reasonNote && <div className="text-[11.5px] text-stone-500 mt-0.5">{r.reasonNote}</div>}
                <div className="text-[11px] text-stone-500 mt-1">{r.items.map((it) => `${it.quantity}× ${it.productName}`).join(' · ') || '—'}</div>
              </div>
            ))}
          </Panel>
        )}
    </div>
  )
}

function ComplaintsBlock({ complaints }: { complaints: AdminOrderDetailComplaint[] }) {
  return (
    <div>
      <SectionHead id="complaints" title="Dyskusje i reklamacje" count={complaints.length} />
      {complaints.length === 0
        ? <Empty icon={ShieldAlert} title="Brak dyskusji ani reklamacji" />
        : (
          <div className="space-y-2">
            {complaints.map((c) => (
              <Panel key={c.id} className="overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-100 bg-stone-50/50">
                  <CopyChip value={c.allegroIssueId} />
                  <Pill tone="warn">{c.status}</Pill>
                  <span className="text-[12px] text-stone-700 truncate">{c.subject ?? 'Dyskusja Allegro'}</span>
                  <span className="ml-auto text-[11px] text-stone-500 tabular-nums whitespace-nowrap">{fmtDate(c.lastMessageAt)} · {c.messages.length} wiad.</span>
                </div>
                <div className="px-3 py-2 space-y-2">
                  {c.messages.slice(-3).map((m) => (
                    <div key={m.id} className="text-[12px]">
                      <div className="flex items-center gap-2 text-[10.5px] text-stone-500 uppercase tracking-[0.06em] mb-0.5">
                        <span className="font-medium text-stone-700">{m.authorRole}</span>
                        <span className="text-stone-400">·</span>
                        <span>{fmtDate(m.createdAt)}</span>
                      </div>
                      <div className="text-stone-900 whitespace-pre-wrap">{m.text ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        )}
    </div>
  )
}

function NotesBlock({ order }: { order: AdminOrderDetail }) {
  return (
    <div>
      <SectionHead id="notes" title="Notatki" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Panel className="p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold mb-1.5">Publiczne (widoczne dla klienta)</div>
          <div className="text-[12.5px] text-stone-900 whitespace-pre-wrap min-h-[3rem]">
            {order.notes || <span className="text-stone-400">Brak notatek publicznych.</span>}
          </div>
        </Panel>
        <Panel className="p-3 bg-amber-50/30">
          <div className="text-[10px] uppercase tracking-[0.12em] text-amber-700 font-semibold mb-1.5 flex items-center gap-1">
            <Flag className="w-3 h-3" /> Wewnętrzne (tylko admin)
          </div>
          <div className="text-[12.5px] text-stone-900 whitespace-pre-wrap min-h-[3rem]">
            {order.internalNotes || <span className="text-stone-400">Brak notatek wewnętrznych.</span>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ─── timeline ───────────────────────────────────────────────────────────────

const TL_META: Record<string, { label: string; color: string; tone: 'ok' | 'warn' | 'err' | 'info' | 'neutral' }> = {
  status:      { label: 'STATUS',      color: '#1c4d7c', tone: 'info' },
  payment:     { label: 'PŁATNOŚĆ',    color: '#7a5500', tone: 'warn' },
  shipping:    { label: 'WYSYŁKA',     color: '#0f3a26', tone: 'ok' },
  tracking:    { label: 'TRACKING',    color: '#0f3a26', tone: 'ok' },
  fulfillment: { label: 'REALIZACJA',  color: '#1c4d7c', tone: 'info' },
  return:      { label: 'ZWROT',       color: '#a8431a', tone: 'err' },
  note:        { label: 'NOTATKA',     color: '#5a5246', tone: 'neutral' },
  audit:       { label: 'AUDYT',       color: '#5a5246', tone: 'neutral' },
}

function TimelineBlock({ entries }: { entries: AdminOrderTimelineEntry[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const cats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) counts[e.category] = (counts[e.category] ?? 0) + 1
    return counts
  }, [entries])
  const visible = entries.filter((e) => filter === 'all' || e.category === filter)
  return (
    <div>
      <SectionHead
        id="timeline"
        title="Aktywność"
        count={entries.length}
        action={
          <div className="flex gap-0.5 flex-wrap">
            {[
              { id: 'all', label: 'Wszystko', n: entries.length },
              ...Object.entries(cats).map(([id, n]) => ({ id, label: TL_META[id]?.label ?? id.toUpperCase(), n })),
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-2 h-6 text-[10.5px] rounded-sm font-medium uppercase tracking-[0.08em] transition ${
                  filter === f.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                {f.label} <span className={`font-mono ml-1 ${filter === f.id ? 'text-stone-300' : 'text-stone-400'}`}>{f.n}</span>
              </button>
            ))}
          </div>
        }
      />
      {entries.length === 0 ? (
        <Empty icon={History} title="Brak wpisów na osi czasu" />
      ) : (
        <Panel>
          <ul className="m-0 p-0 list-none">
            {visible.map((ev) => {
              const meta = TL_META[ev.category] ?? TL_META.note
              const isOpen = openId === ev.id
              return (
                <li key={ev.id} className="border-b border-stone-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpenId((id) => (id === ev.id ? null : ev.id))}
                    className="w-full flex items-center gap-3 px-3 py-1.5 text-left text-[12px] hover:bg-stone-50"
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <span className="font-mono text-[10px] font-semibold tracking-[0.08em] w-[72px] flex-shrink-0" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="flex-1 min-w-0 inline-flex items-baseline gap-1.5 flex-wrap">
                      {ev.previousValue && (
                        <>
                          <Mono className="text-stone-400 text-[11.5px]">{ev.previousValue}</Mono>
                          <span className="text-stone-300">→</span>
                        </>
                      )}
                      <Mono className="text-stone-900 font-medium text-[11.5px]">{ev.newValue}</Mono>
                    </span>
                    <span className="text-[10.5px] text-stone-500 truncate hidden md:inline-flex items-center gap-1">
                      <span className="font-mono">{ev.source}</span>
                      {ev.sourceRef && <span className="font-mono text-stone-400">· {ev.sourceRef}</span>}
                    </span>
                    <span className="text-[10.5px] text-stone-500 tabular-nums whitespace-nowrap w-[120px] text-right flex-shrink-0">
                      {fmtDate(ev.occurredAt)}
                    </span>
                    <ChevronRight className={`w-3 h-3 text-stone-400 transition ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-2 bg-stone-50">
                      <pre className="m-0 p-2 text-[11px] font-mono text-stone-800 leading-snug bg-white border border-stone-200 rounded-sm overflow-x-auto">
{JSON.stringify({
  category: ev.category,
  from: ev.previousValue ?? null,
  to: ev.newValue,
  source: ev.source,
  ref: ev.sourceRef ?? null,
  metadata: ev.metadata ?? null,
  occurred_at: ev.occurredAt,
}, null, 2)}
                      </pre>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </div>
  )
}

// ─── audit ──────────────────────────────────────────────────────────────────

function AuditBlock({ order }: { order: AdminOrderDetail }) {
  return (
    <div>
      <SectionHead id="audit" title="Audyt admina" count={order.audit.length} />
      {order.audit.length === 0
        ? <Empty icon={ClipboardList} title="Brak wpisów audytu" />
        : (
          <Panel>
            <ul className="m-0 p-0 list-none">
              {order.audit.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-1.5 border-b border-stone-100 last:border-0 text-[12px]">
                  <UserIcon className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span className="font-medium text-stone-900 truncate w-[180px]">{a.adminName ?? a.adminEmail ?? `Admin ${a.adminId ?? '—'}`}</span>
                  <Mono className="text-[11px] text-stone-700 px-1.5 py-px bg-stone-100 rounded-sm">{a.action}</Mono>
                  <span className="text-[11px] text-stone-500 truncate flex-1">{JSON.stringify(a.details ?? {})}</span>
                  {a.ipAddress && <Mono className="text-[10.5px] text-stone-400 hidden md:inline">{a.ipAddress}</Mono>}
                  <span className="text-[10.5px] text-stone-500 tabular-nums whitespace-nowrap">{fmtDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
    </div>
  )
}

function Empty({ icon: Icon, title, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; hint?: string }) {
  return (
    <Panel className="py-8 px-4 flex flex-col items-center text-center">
      <Icon className="w-5 h-5 text-stone-400 mb-2" />
      <div className="text-[12.5px] text-stone-700 font-medium">{title}</div>
      {hint && <div className="text-[11.5px] text-stone-500 mt-1 max-w-[28rem]">{hint}</div>}
    </Panel>
  )
}

// ─── side column ────────────────────────────────────────────────────────────

function ProgressRail({ order }: { order: AdminOrderDetail }) {
  const steps = [
    { k: 'Złożono',   v: order.createdAt,   icon: Receipt },
    { k: 'Płatność',  v: order.paidAt,      icon: CreditCard },
    { k: 'Wysłano',   v: order.shippedAt,   icon: Truck },
    { k: 'Doręczono', v: order.deliveredAt, icon: Check },
  ]
  return (
    <Panel>
      <div className="px-3 py-2 border-b border-stone-100">
        <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Postęp</div>
      </div>
      <ol className="m-0 p-2 list-none relative">
        <span className="absolute left-[18px] top-3 bottom-3 w-px bg-stone-200" />
        {steps.map((s) => {
          const done = !!s.v
          const Icon = s.icon
          return (
            <li key={s.k} className="relative flex items-center gap-2.5 pl-7 py-1 text-[12px]">
              <span className={`absolute left-[10px] w-4 h-4 grid place-items-center rounded-full border ${done ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-400'}`}>
                <Icon className="w-2.5 h-2.5" />
              </span>
              <span className={`flex-1 ${done ? 'text-stone-900 font-medium' : 'text-stone-500'}`}>{s.k}</span>
              <span className="text-[10.5px] text-stone-500 tabular-nums">{s.v ? fmtDateShort(s.v) : '—'}</span>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function CustomerCard({ order }: { order: AdminOrderDetail }) {
  const c = order.customerData
  const s = c.shippingAddress
  const name = c.name || order.user?.name || '—'
  const initials = name.split(' ').map((p) => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '—'
  return (
    <Panel>
      <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Klient</div>
        {order.user && (
          <a href={`/admin/users/${order.user.id}`} className="text-[11px] text-stone-600 hover:text-stone-900 inline-flex items-center gap-1">
            Profil <ArrowUpRight className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-stone-100">
        <div className="w-8 h-8 rounded-sm bg-stone-900 text-white grid place-items-center font-semibold text-[11px] tracking-wider">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-stone-900 font-medium truncate">{name}</div>
          {c.allegroLogin && <div className="text-[11px] text-stone-500 font-mono truncate flex items-center gap-1"><AtSign className="w-3 h-3" />{c.allegroLogin}</div>}
        </div>
      </div>
      <div>
        {c.email && <Row label="Email"><a href={`mailto:${c.email}`} className="text-stone-900 hover:underline">{c.email}</a></Row>}
        {c.phone && (
          <Row label="Telefon">
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-stone-900 hover:underline">
              <Phone className="w-3 h-3 text-stone-500" /> {c.phone}
            </a>
          </Row>
        )}
        <Row label="Numer zam." mono><CopyChip value={order.orderNumber} /></Row>
        {order.externalId && <Row label="Allegro ID" mono><CopyChip value={order.externalId} /></Row>}
      </div>
      {s && (
        <div className="border-t border-stone-100">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-stone-500 font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Adres dostawy
          </div>
          <div className="px-3 pb-2.5 text-[12.5px] text-stone-900 leading-[1.55]">
            <div>{s.name || c.name}</div>
            <div className="text-stone-700">{s.street}</div>
            <div className="text-stone-700">{s.postalCode} {s.city}</div>
            <div className="text-stone-500 text-[11px] mt-0.5">{s.country}</div>
          </div>
        </div>
      )}
    </Panel>
  )
}

function InvoiceCard({ order }: { order: AdminOrderDetail }) {
  const c = order.customerData
  const billing = c.billingAddress
  if (!order.invoiceRequired && !billing && !c.companyName && !c.taxId) return null
  return (
    <Panel>
      <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Faktura</div>
        {order.invoiceRequired ? <Pill tone="info">Wymagana</Pill> : <Pill tone="neutral">Paragon</Pill>}
      </div>
      <div>
        {c.companyName && <Row label="Firma">{c.companyName}</Row>}
        {c.taxId && <Row label="NIP" mono><CopyChip value={c.taxId} /></Row>}
        {billing && (
          <div className="px-3 py-2 text-[12.5px] text-stone-900 leading-[1.55] border-t border-stone-100 bg-stone-50/40">
            <div>{billing.name}</div>
            <div className="text-stone-700">{billing.street}</div>
            <div className="text-stone-700">{billing.postalCode} {billing.city}</div>
          </div>
        )}
      </div>
    </Panel>
  )
}

function AllegroCard({ order, onRefresh, loading }: { order: AdminOrderDetail; onRefresh: () => void; loading: boolean }) {
  if (order.source !== 'allegro') return null
  return (
    <Panel>
      <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold">Allegro</div>
        <button type="button" onClick={onRefresh} disabled={loading}
          className="text-[11px] text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 disabled:opacity-60">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync
        </button>
      </div>
      <div>
        <Row label="Order ID" mono>{order.externalId ? <CopyChip value={order.externalId} /> : <span className="text-stone-400">—</span>}</Row>
        <Row label="Rewizja" mono>{order.allegroRevision ? <CopyChip value={order.allegroRevision} /> : <span className="text-stone-400">—</span>}</Row>
        <Row label="Shipment" mono dim={!order.allegroShipmentId}>{order.allegroShipmentId ? <CopyChip value={order.allegroShipmentId} /> : '—'}</Row>
        <Row label="Fulfillment">{order.allegroFulfillmentStatus ?? <span className="text-stone-400">—</span>}</Row>
        <Row label="Paczek" mono>{order.allShipments?.length ?? 0}</Row>
      </div>
      {order.externalId && (
        <a href={`https://allegro.pl/moje-allegro/sprzedaz/zamowienie/${order.externalId}`} target="_blank" rel="noreferrer"
           className="block px-3 py-2 border-t border-stone-100 text-[11.5px] text-stone-600 hover:text-stone-900 hover:bg-stone-50 inline-flex items-center gap-1">
          Otwórz zamówienie w Allegro <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </Panel>
  )
}

// ─── view ───────────────────────────────────────────────────────────────────

export function OrderDetailView({ id }: { id: string }) {
  const orderId = Number(id)
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('items')
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const loadOrder = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setError('Nieprawidłowe ID zamówienia')
      setLoading(false)
      return
    }
    setError(null)
    const res = await adminApi.getOrderDetail(orderId)
    setOrder(res.data)
  }, [orderId])

  useEffect(() => {
    setLoading(true)
    loadOrder()
      .catch((err) => setError(err instanceof Error ? err.message : 'Nie udało się pobrać zamówienia'))
      .finally(() => setLoading(false))
  }, [loadOrder])

  // observe sections to update active sub-nav
  useEffect(() => {
    if (!order) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id as SectionId)
        }
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: [0, 0.1, 0.5] },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [order])

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setActionLoading(key)
    setError(null)
    try {
      await action()
      await loadOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operacja nie powiodła się')
    } finally {
      setActionLoading(null)
    }
  }

  const scrollTo = (id: SectionId) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-700 text-[13px]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ładowanie zamówienia…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-6">
        <Panel className="max-w-md w-full p-5 text-center">
          <AlertTriangle className="w-7 h-7 mx-auto mb-2.5 text-amber-600" />
          <h1 className="text-[14px] font-semibold text-stone-900">Nie można wyświetlić zamówienia</h1>
          <p className="text-[12px] text-stone-600 mt-1.5">{error ?? 'Brak danych.'}</p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900" ref={scrollerRef}>
      <CommandBar
        order={order}
        loadingKey={actionLoading}
        onRefresh={() => runAction('refresh', loadOrder)}
        onRefreshShipment={() => runAction('shipment-refresh', () => adminApi.refreshOrderShipment(order.id, { force: true }))}
        onCreateShipment={() => setShipmentOpen(true)}
        onDownloadLabel={() => {
          if ((order.allShipments?.length ?? 0) > 1) setLabelOpen(true)
          else void runAction('label', async () => {
            const blob = await adminApi.getShipmentLabel(order.id)
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 30_000)
          })
        }}
        onFulfillment={(s) => runAction(`fulfillment-${s}`, () => adminApi.setOrderFulfillment(order.id, s))}
      />
      <KpiStrip order={order} />
      <SubNav order={order} active={activeSection} onPick={scrollTo} />

      {error && (
        <div className="max-w-[1480px] mx-auto px-6 pt-3">
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800 rounded-sm">{error}</div>
        </div>
      )}

      <div className="max-w-[1480px] mx-auto px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <main className="min-w-0 space-y-6">
            <ItemsBlock order={order} />
            <PaymentBlock order={order} />
            <ShippingBlock
              order={order}
              onRefresh={() => runAction('shipping-refresh', () => adminApi.refreshOrderShipment(order.id, { force: true }))}
              loading={actionLoading === 'shipping-refresh'}
            />
            <ReturnsBlock returns={order.returns} currency={order.currency} />
            <ComplaintsBlock complaints={order.complaints} />
            <NotesBlock order={order} />
            <TimelineBlock entries={order.statusHistory} />
            <AuditBlock order={order} />
          </main>

          <aside className="min-w-0">
            <div className="sticky top-[52px] space-y-2.5">
              <ProgressRail order={order} />
              <CustomerCard order={order} />
              <InvoiceCard order={order} />
              <AllegroCard
                order={order}
                onRefresh={() => runAction('allegro-refresh', () => adminApi.refreshOrderShipment(order.id, { force: true }))}
                loading={actionLoading === 'allegro-refresh'}
              />
            </div>
          </aside>
        </div>
      </div>

      <ShipmentModal order={order} isOpen={shipmentOpen} onClose={() => setShipmentOpen(false)} onSuccess={() => void loadOrder()} />
      <ShipmentLabelPickerModal order={order} isOpen={labelOpen} onClose={() => setLabelOpen(false)} />
    </div>
  )
}
