'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, ClipboardList, Copy,
  ExternalLink, FileText, History, Loader2, Package, RefreshCw,
  ShieldAlert, Truck, Undo2, User as UserIcon, XCircle,
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

type TabId = 'details' | 'payment' | 'invoice' | 'shipping' | 'returns' | 'complaints' | 'notes' | 'audit'

const TABS: Array<{ id: TabId; label: string; count?: (order: AdminOrderDetail) => number }> = [
  { id: 'details', label: 'Szczegóły' },
  { id: 'payment', label: 'Płatność' },
  { id: 'invoice', label: 'Faktura' },
  { id: 'shipping', label: 'Wysyłka' },
  { id: 'returns', label: 'Zwroty', count: (o) => o.badgeCounts.returns },
  { id: 'complaints', label: 'Dyskusje', count: (o) => o.badgeCounts.complaints },
  { id: 'notes', label: 'Notatki' },
  { id: 'audit', label: 'Audyt', count: (o) => o.badgeCounts.audit },
]

const STATUS_PROGRESS: Array<'placed' | 'paid' | 'shipped' | 'delivered'> = ['placed', 'paid', 'shipped', 'delivered']
const STATUS_LABEL: Record<string, string> = {
  placed: 'Złożone', paid: 'Opłacone', shipped: 'Wysłane', delivered: 'Doręczone',
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
}
function fmtDateShort(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtMoney(amount?: number | null, currency = 'PLN') {
  if (amount == null || Number.isNaN(amount)) return '—'
  return `${amount.toFixed(2)} ${currency}`
}
function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(text)
}

function Card({ children, className = '', noPad }: { children: React.ReactNode; className?: string; noPad?: boolean }) {
  return (
    <section className={`bg-white border border-[#e1dccf] rounded-[10px] shadow-[0_1px_0_rgba(20,18,12,0.04),0_1px_2px_rgba(20,18,12,0.04)] ${noPad ? '' : 'p-5'} ${className}`}>
      {children}
    </section>
  )
}

function SectionLabel({ children, count, action }: { children: React.ReactNode; count?: number | null; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#6b665b] font-semibold">
        {children}
        {count != null && (
          <span className="ml-1.5 inline-block bg-[#efece5] text-[#9a9486] font-mono text-[10px] px-1.5 py-px rounded-full font-normal">{count}</span>
        )}
      </span>
      {action}
    </div>
  )
}

function CardHead({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#ece8dc]">{children}</div>
}

function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[12.5px] text-[#6b665b] hover:text-[#1b1a17] hover:bg-[#efece5] rounded px-2 py-1 transition">
      {children}
    </button>
  )
}

function CopyChip({ value, label, mono = true }: { value?: string | number | null; label?: string; mono?: boolean }) {
  const text = value == null || value === '' ? '' : String(value)
  const [copied, setCopied] = useState(false)
  if (!text) return <span className="text-[#9a9486]">—</span>
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[#3a372f] transition ${copied ? 'bg-[#2f6f3e] text-white' : 'bg-[#efece5] hover:bg-[#1b1a17] hover:text-white'}`}
      title="Kopiuj"
    >
      <span className={mono ? 'font-mono text-[12px] tracking-tight' : ''}>{label ?? text}</span>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-60" />}
    </button>
  )
}

function StatusPill({ status, size = 'md' }: { status: string; size?: 'md' | 'lg' }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    placed:    { bg: '#f0ece4', fg: '#5a5246', label: 'Złożone' },
    pending:   { bg: '#f7ecd2', fg: '#7a5500', label: 'Oczekujące' },
    paid:      { bg: '#e6efe5', fg: '#23552f', label: 'Opłacone' },
    processing:{ bg: '#e3edf6', fg: '#1c4d7c', label: 'Realizacja' },
    shipped:   { bg: '#e3edf6', fg: '#1c4d7c', label: 'Wysłane' },
    delivered: { bg: '#dde9df', fg: '#0f3a26', label: 'Doręczone' },
    cancelled: { bg: '#f6e1e1', fg: '#7a1a1a', label: 'Anulowane' },
    refunded:  { bg: '#f6e1e1', fg: '#7a1a1a', label: 'Zwrócone' },
  }
  const m = map[status] ?? { bg: '#eee', fg: '#333', label: status }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${size === 'lg' ? 'text-[12.5px] px-3 py-1' : 'text-[11px] px-2 py-0.5'}`}
      style={{ background: m.bg, color: m.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.fg }} />
      {m.label}
    </span>
  )
}

function KV({ k, children, mono, dim }: { k: string; children: React.ReactNode; mono?: boolean; dim?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1.5 border-b border-dashed border-[#ece8dc] last:border-0 text-[12.5px]">
      <div className="text-[#9a9486] text-[10.5px] uppercase tracking-[0.1em] flex-shrink-0">{k}</div>
      <div className={`text-right break-all ${dim ? 'text-[#9a9486]' : 'text-[#1b1a17]'} ${mono ? 'font-mono' : ''}`}>{children}</div>
    </div>
  )
}

function MetaRow({ k, v, href }: { k: string; v: React.ReactNode; href?: string }) {
  const Cmp: any = href ? 'a' : 'div'
  return (
    <Cmp href={href} className="group flex justify-between items-baseline gap-3 py-1.5 border-b border-dashed border-[#ece8dc] last:border-0 text-[11px]">
      <span className="uppercase tracking-[0.1em] text-[#9a9486] text-[10px]">{k}</span>
      <span className="text-[#3a372f] group-hover:text-[#1f3a5f] truncate">{v}</span>
    </Cmp>
  )
}

function PageHeader({
  order, loadingKey, onRefresh, onRefreshShipment, onCreateShipment, onDownloadLabel, onFulfillment,
  tab, setTab,
}: {
  order: AdminOrderDetail
  loadingKey: string | null
  onRefresh: () => void
  onRefreshShipment: () => void
  onCreateShipment: () => void
  onDownloadLabel: () => void
  onFulfillment: (status: 'PROCESSING' | 'READY_FOR_SHIPMENT' | 'SENT' | 'PICKED_UP' | 'CANCELLED') => void
  tab: TabId
  setTab: (t: TabId) => void
}) {
  const channel = order.source === 'allegro' ? 'Allegro' : 'Sklep'
  return (
    <div className="border-b border-[#e1dccf] pb-5">
      <div className="text-[12.5px] text-[#6b665b] flex items-center gap-2 mb-3.5">
        <a className="hover:text-[#1b1a17]" href="/admin/orders">Zamówienia</a>
        <span className="text-[#bdb6a6]">/</span>
        <a className="hover:text-[#1b1a17]" href="/admin/orders">{channel}</a>
        <span className="text-[#bdb6a6]">/</span>
        <span className="font-mono">#{order.orderNumber}</span>
      </div>

      <div className="flex justify-between items-start gap-6 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3.5 flex-wrap">
            <h1 className="text-[28px] font-medium tracking-[-0.02em] leading-[1.1] text-[#1b1a17] m-0">
              Zamówienie {order.externalId
                ? <span className="font-mono font-normal text-[#3a372f] text-[0.85em]">#{order.externalId}</span>
                : <span className="font-mono font-normal text-[#3a372f] text-[0.85em]">#{order.orderNumber}</span>}
            </h1>
            <OrderStatusBadge status={order.status} source={order.source} allegroFulfillmentStatus={order.allegroFulfillmentStatus} paymentMethod={order.paymentMethod} paidAt={order.paidAt} />
            {order.shipmentFreshness === 'stale' && <StatusPill status="pending" />}
          </div>
          <div className="mt-2 text-[12.5px] text-[#6b665b] flex gap-2 items-center flex-wrap">
            <span><b className="text-[#3a372f] font-medium">{channel}</b> · {fmtDate(order.createdAt)}</span>
            <span className="text-[#bdb6a6]">·</span>
            <span>{order.items.length} {order.items.length === 1 ? 'pozycja' : 'pozycji'} · {fmtMoney(order.total, order.currency)}</span>
            {order.deliveredAt && (<><span className="text-[#bdb6a6]">·</span><span>Doręczono {fmtDateShort(order.deliveredAt)}</span></>)}
          </div>
          {order.warnings.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3">
              {order.warnings.map((w) => (
                <div key={w.code} className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md ${w.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />{w.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <ActionButton icon={RefreshCw} label="Odśwież" loading={loadingKey === 'refresh'} onClick={onRefresh} />
          {order.actions.canRefreshShipment && <ActionButton icon={Truck} label="Tracking" loading={loadingKey === 'shipment-refresh'} onClick={onRefreshShipment} />}
          {order.actions.canDownloadLabel && <ActionButton icon={FileText} label="Etykieta" loading={loadingKey === 'label'} onClick={onDownloadLabel} />}
          {order.actions.canCreateShipment && <ActionButton icon={Package} label="Nadaj" onClick={onCreateShipment} primary />}
          {order.actions.canSyncFulfillment && (
            <>
              <ActionButton icon={Truck} label="SENT" loading={loadingKey === 'fulfillment-SENT'} onClick={() => onFulfillment('SENT')} />
              <ActionButton icon={Check} label="PICKED_UP" loading={loadingKey === 'fulfillment-PICKED_UP'} onClick={() => onFulfillment('PICKED_UP')} />
              <ActionButton icon={XCircle} label="Anuluj" loading={loadingKey === 'fulfillment-CANCELLED'} onClick={() => onFulfillment('CANCELLED')} />
            </>
          )}
        </div>
      </div>

      <nav className="flex gap-0.5 -mb-[21px] flex-wrap">
        {TABS.map((t) => {
          const c = t.count?.(order) ?? 0
          const active = tab === t.id
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2.5 text-[12.5px] border-b-2 inline-flex items-center gap-1.5 transition ${active ? 'text-[#1b1a17] border-[#1b1a17] font-medium' : 'text-[#6b665b] border-transparent hover:text-[#1b1a17]'}`}
            >
              {t.label}
              {c > 0 && <span className="bg-[#efece5] text-[#6b665b] rounded-full font-mono text-[10px] px-1.5">{c}</span>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function ActionButton({ icon: Icon, label, loading, onClick, primary }: { icon: React.ComponentType<{ className?: string }>; label: string; loading?: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium rounded-md border transition disabled:opacity-60 ${
        primary
          ? 'bg-[#1b1a17] text-white border-[#1b1a17] hover:bg-black'
          : 'bg-transparent text-[#3a372f] border-[#e1dccf] hover:bg-[#efece5] hover:border-[#bdb6a6]'
      }`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

function ItemsCard({ order }: { order: AdminOrderDetail }) {
  return (
    <Card noPad>
      <CardHead>
        <SectionLabel count={order.items.length}>Pozycje</SectionLabel>
        {order.source === 'allegro' && order.externalId && (
          <a href={`https://allegro.pl/moje-allegro/sprzedaz/zamowienie/${order.externalId}`} target="_blank" rel="noreferrer" className="text-[12.5px] text-[#6b665b] hover:text-[#1b1a17] hover:bg-[#efece5] rounded px-2 py-1 inline-flex items-center gap-1">
            Zobacz w Allegro <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </CardHead>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10.5px] uppercase tracking-[0.12em] text-[#9a9486] font-medium px-5 pt-3.5 pb-2.5 bg-white border-b border-[#ece8dc]">Produkt</th>
              <th className="text-left text-[10.5px] uppercase tracking-[0.12em] text-[#9a9486] font-medium px-5 pt-3.5 pb-2.5 bg-white border-b border-[#ece8dc]">SKU</th>
              <th className="text-right text-[10.5px] uppercase tracking-[0.12em] text-[#9a9486] font-medium px-5 pt-3.5 pb-2.5 bg-white border-b border-[#ece8dc]">Ilość</th>
              <th className="text-right text-[10.5px] uppercase tracking-[0.12em] text-[#9a9486] font-medium px-5 pt-3.5 pb-2.5 bg-white border-b border-[#ece8dc]">Cena</th>
              <th className="text-right text-[10.5px] uppercase tracking-[0.12em] text-[#9a9486] font-medium px-5 pt-3.5 pb-2.5 bg-white border-b border-[#ece8dc]">Razem</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const skuTail = (item.productSku || '').split('-').pop() || '—'
              return (
                <tr key={`${item.id ?? item.productSku}`} className="border-b border-[#ece8dc] last:border-0">
                  <td className="px-5 py-3 align-middle">
                    <div className="flex gap-3 items-center">
                      <div className="relative w-11 h-11 rounded-md bg-[#efece5] border border-[#e1dccf] grid place-items-center overflow-hidden flex-shrink-0">
                        <span className="font-mono text-[10px] text-[#6b665b] bg-[#efece5] px-1 relative z-10">{skuTail}</span>
                        <span className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(20,18,12,0.04) 6px 7px)' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[#1b1a17] font-medium text-[13px]">{item.productName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12.5px]"><CopyChip value={item.productSku} /></td>
                  <td className="px-5 py-3 text-right text-[12.5px] font-mono tabular-nums">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-[12.5px] font-mono tabular-nums">{item.unitPrice.toFixed(2)} <span className="text-[#9a9486] text-[0.85em]">{order.currency}</span></td>
                  <td className="px-5 py-3 text-right text-[12.5px] font-mono tabular-nums text-[#1b1a17] font-medium">{item.totalPrice.toFixed(2)} <span className="text-[#9a9486] text-[0.85em]">{order.currency}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const TL_KIND_META: Record<string, { label: string; color: string }> = {
  status:    { label: 'STATUS',    color: '#1c4d7c' },
  payment:   { label: 'PŁATNOŚĆ',  color: '#7a5500' },
  shipping:  { label: 'WYSYŁKA',   color: '#2f6f3e' },
  tracking:  { label: 'TRACKING',  color: '#2f6f3e' },
  fulfillment:{ label: 'REALIZACJA', color: '#1c4d7c' },
  return:    { label: 'ZWROT',     color: '#a8431a' },
  note:      { label: 'NOTATKA',   color: '#5a5246' },
  audit:     { label: 'AUDYT',     color: '#5a5246' },
}

function TimelineCard({ entries }: { entries: AdminOrderTimelineEntry[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const cats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) counts[e.category] = (counts[e.category] ?? 0) + 1
    return counts
  }, [entries])

  const visible = entries.filter((e) => filter === 'all' || e.category === filter)

  if (entries.length === 0) {
    return (
      <Card noPad>
        <CardHead><SectionLabel>Oś czasu</SectionLabel><span /></CardHead>
        <EmptyState icon={History} title="Brak wpisów na osi czasu" />
      </Card>
    )
  }

  return (
    <Card noPad>
      <CardHead>
        <SectionLabel count={entries.length}>Oś czasu</SectionLabel>
        <div className="flex gap-0.5 flex-wrap">
          {[{ id: 'all', label: 'Wszystko', n: entries.length }, ...Object.entries(cats).map(([id, n]) => ({ id, label: TL_KIND_META[id]?.label ?? id.toUpperCase(), n }))].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] tracking-[0.005em] transition ${filter === f.id ? 'bg-[#1b1a17] text-white' : 'text-[#6b665b] hover:bg-[#efece5] hover:text-[#1b1a17]'}`}
            >
              {f.label}
              <span className={`ml-1 font-mono text-[10px] ${filter === f.id ? 'text-white/70' : 'text-[#9a9486]'}`}>{f.n}</span>
            </button>
          ))}
        </div>
      </CardHead>
      <ul className="list-none p-5 m-0">
        {visible.map((ev, i) => {
          const meta = TL_KIND_META[ev.category] ?? TL_KIND_META.note
          const isOpen = !!open[ev.id]
          const isLast = i === visible.length - 1
          return (
            <li key={ev.id} className={`flex gap-3.5 relative ${isLast ? '' : 'pb-3.5'}`}>
              <div className="relative w-3 flex-shrink-0 pt-3.5">
                <div className="w-[11px] h-[11px] rounded-full bg-white border-2 relative z-10" style={{ borderColor: meta.color }} />
                {!isLast && <div className="absolute left-[5px] top-6 -bottom-3.5 w-px bg-[#e1dccf]" />}
              </div>
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [ev.id]: !o[ev.id] }))}
                className={`flex-1 text-left border rounded-md px-3.5 py-3 bg-white transition min-w-0 ${isOpen ? 'border-[#6b665b] shadow-[0_1px_0_rgba(20,18,12,0.05),0_6px_18px_-10px_rgba(20,18,12,0.18)] bg-[#fdfcf8]' : 'border-[#e1dccf] hover:border-[#bdb6a6] hover:bg-[#fdfcf8]'}`}
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-[10px] font-bold tracking-[0.14em] flex-shrink-0 font-mono" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="inline-flex items-baseline gap-1.5 flex-wrap flex-1 min-w-0">
                    {ev.previousValue && <span className="text-[#9a9486] font-mono text-[12px]">{ev.previousValue}</span>}
                    {ev.previousValue && <span className="text-[#bdb6a6] text-[11px]">→</span>}
                    <span className="text-[#1b1a17] font-medium font-mono text-[12px]">{ev.newValue}</span>
                  </span>
                  <span className="text-[11px] text-[#9a9486] tabular-nums whitespace-nowrap ml-auto">{fmtDate(ev.occurredAt)}</span>
                </div>
                <div className="mt-1.5 flex gap-3.5 items-center text-[11px] text-[#9a9486] flex-wrap">
                  <span className="inline-flex items-baseline gap-1">źródło: <span className="font-mono text-[#6b665b]">{ev.source}</span></span>
                  {ev.sourceRef && <span className="inline-flex items-baseline gap-1">ref: <span className="font-mono text-[#6b665b]">{ev.sourceRef}</span></span>}
                  <span className={`ml-auto w-[18px] h-[18px] inline-grid place-items-center rounded text-sm leading-none border ${isOpen ? 'bg-[#1b1a17] text-white border-[#1b1a17]' : 'border-[#e1dccf] text-[#6b665b]'}`}>
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </span>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-[#ece8dc]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center text-[10.5px] text-[#9a9486] uppercase tracking-[0.1em] mb-1.5">
                      <span className="font-mono">payload.json</span>
                      <CopyChip value={JSON.stringify({ category: ev.category, from: ev.previousValue, to: ev.newValue, source: ev.source, ref: ev.sourceRef })} label="kopiuj" />
                    </div>
                    <pre className="bg-[#efece5] border border-[#e1dccf] rounded p-3 text-[11.5px] text-[#3a372f] m-0 whitespace-pre overflow-x-auto leading-[1.55] font-mono">{JSON.stringify({
                      category: ev.category,
                      from: ev.previousValue ?? null,
                      to: ev.newValue,
                      source: ev.source,
                      ref: ev.sourceRef ?? null,
                      occurred_at: ev.occurredAt,
                    }, null, 2)}</pre>
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ProgressCard({ order }: { order: AdminOrderDetail }) {
  const dates: Array<{ k: string; v: string | null | undefined; done: boolean }> = [
    { k: 'Złożono', v: order.createdAt, done: !!order.createdAt },
    { k: 'Płatność', v: order.paidAt, done: !!order.paidAt },
    { k: 'Wysłano', v: order.shippedAt, done: !!order.shippedAt },
    { k: 'Doręczono', v: order.deliveredAt, done: !!order.deliveredAt },
  ]
  return (
    <Card>
      <SectionLabel>Postęp</SectionLabel>
      <ul className="list-none m-0 p-0 relative">
        <span className="absolute left-1 top-3 bottom-3 w-px bg-[#e1dccf]" />
        {dates.map((d) => (
          <li key={d.k} className={`flex justify-between items-baseline pl-[18px] py-1.5 text-[12.5px] relative ${d.done ? 'text-[#1b1a17]' : 'text-[#6b665b]'}`}>
            <span className={`absolute left-px top-3 w-[7px] h-[7px] rounded-full border ${d.done ? 'bg-[#1b1a17] border-[#1b1a17]' : 'bg-white border-[#bdb6a6]'}`} />
            <span>{d.k}</span>
            <span className={`tabular-nums text-[11px] ${d.done ? 'text-[#3a372f]' : 'text-[#6b665b]'}`}>{d.v ? fmtDate(d.v) : '—'}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function AmountsCard({ order }: { order: AdminOrderDetail }) {
  return (
    <Card>
      <SectionLabel>Kwoty</SectionLabel>
      <ul className="list-none m-0 p-0">
        <li className="flex justify-between items-baseline py-1.5 text-[12.5px] text-[#3a372f]"><span>Wartość</span><span className="tabular-nums">{fmtMoney(order.subtotal ?? 0, order.currency)}</span></li>
        <li className="flex justify-between items-baseline py-1.5 text-[12.5px] text-[#3a372f]"><span>Wysyłka</span><span className="tabular-nums">{fmtMoney(order.shippingCost ?? 0, order.currency)}</span></li>
        <li className="flex justify-between items-baseline py-1.5 text-[12.5px] text-[#3a372f]"><span>VAT</span><span className={`tabular-nums ${order.taxAmount == null ? 'text-[#9a9486]' : ''}`}>{order.taxAmount == null ? '—' : fmtMoney(order.taxAmount, order.currency)}</span></li>
        <li className="mt-2 pt-3 border-t border-[#e1dccf] flex justify-between items-baseline text-[14px] text-[#1b1a17]">
          <span>Suma</span>
          <span className="tabular-nums font-semibold text-[18px]">{order.total.toFixed(2)} <span className="text-[#9a9486] text-[0.65em]">{order.currency}</span></span>
        </li>
        {order.totalPln != null && order.currency !== 'PLN' && (
          <li className="flex justify-between items-baseline text-[#6b665b] text-[11px] py-1"><span>~ w PLN</span><span className="tabular-nums">{fmtMoney(order.totalPln, 'PLN')}</span></li>
        )}
      </ul>
    </Card>
  )
}

function CustomerCard({ order }: { order: AdminOrderDetail }) {
  const c = order.customerData
  const s = c.shippingAddress
  const fullName = c.name || order.user?.name || '—'
  const initials = fullName.split(' ').map((p) => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '—'
  return (
    <Card>
      <SectionLabel action={order.user ? <LinkBtn>Profil ↗</LinkBtn> : undefined}>Klient</SectionLabel>
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 rounded-full bg-[#1b1a17] text-white grid place-items-center font-medium text-[13px] tracking-wider">{initials}</div>
        <div className="min-w-0">
          <div className="font-medium text-[#1b1a17] text-[13px] truncate">{fullName}</div>
          {c.allegroLogin && <div className="text-[#6b665b] text-[11px] font-mono truncate">@{c.allegroLogin}</div>}
        </div>
      </div>
      <div className="mt-3">
        {c.email && <MetaRow k="Email" v={c.email} href={`mailto:${c.email}`} />}
        {c.phone && <MetaRow k="Telefon" v={c.phone} href={`tel:${c.phone}`} />}
      </div>
      {c.allegroLogin && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          <span className="inline-block px-2 py-0.5 text-[10.5px] rounded-full bg-[#e3edf6] text-[#1f3a5f] font-medium">Allegro</span>
        </div>
      )}
      {s && (
        <>
          <div className="h-px bg-[#ece8dc] my-3.5" />
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-[#9a9486] font-semibold">Adres dostawy</span>
          </div>
          <div className="text-[12.5px] text-[#3a372f] leading-[1.65]">
            <div>{s.name || c.name}</div>
            <div>{s.street}</div>
            <div>{s.postalCode} {s.city}</div>
            <div className="text-[#9a9486] text-[11px] mt-0.5">{s.country}</div>
          </div>
        </>
      )}
    </Card>
  )
}

function ShipmentCard({ order, onRefresh, loading }: { order: AdminOrderDetail; onRefresh: () => void; loading: boolean }) {
  const idx = STATUS_PROGRESS.indexOf(order.status as typeof STATUS_PROGRESS[number])
  const fillPct = idx >= 0 ? ((idx + 1) / STATUS_PROGRESS.length) * 100 : 25
  return (
    <Card>
      <SectionLabel action={order.trackingNumber ? <LinkBtn>Śledź ↗</LinkBtn> : undefined}>Wysyłka</SectionLabel>
      <KV k="Metoda">{order.shippingMethod ?? '—'}</KV>
      <KV k="Numer paczki" mono>
        {order.trackingNumber ? <CopyChip value={order.trackingNumber} /> : <span className="text-[#9a9486]">—</span>}
      </KV>
      <KV k="Status">{order.trackingStatus ?? order.trackingStatusCode ?? '—'}</KV>
      <KV k="Aktualizacja" dim={!order.trackingStatusUpdatedAt}>
        {order.trackingStatusUpdatedAt ? fmtDate(order.trackingStatusUpdatedAt) : '—'}
      </KV>

      <div className="mt-3.5">
        <div className="h-1 bg-[#e8e3d8] rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-[#1b1a17] rounded-full transition-all" style={{ width: `${fillPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-[#9a9486] tracking-wide uppercase">
          {STATUS_PROGRESS.map((s, i) => (
            <span key={s} className={i === idx ? 'text-[#1b1a17] font-semibold' : ''}>{STATUS_LABEL[s]}</span>
          ))}
        </div>
      </div>

      {order.source === 'allegro' && (
        <div className="mt-3 pt-3 border-t border-[#ece8dc] flex items-center justify-between">
          <span className="text-[11px] text-[#6b665b]">Paczek: <span className="font-mono text-[#3a372f]">{order.allShipments?.length ?? 0}</span></span>
          <button type="button" onClick={onRefresh} disabled={loading} className="text-[11px] text-[#6b665b] hover:text-[#1b1a17] inline-flex items-center gap-1 disabled:opacity-60">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Odśwież tracking
          </button>
        </div>
      )}
    </Card>
  )
}

function AllegroCard({ order, onRefresh, loading }: { order: AdminOrderDetail; onRefresh: () => void; loading: boolean }) {
  return (
    <Card>
      <SectionLabel action={
        <button type="button" onClick={onRefresh} disabled={loading} className="text-[12.5px] text-[#6b665b] hover:text-[#1b1a17] hover:bg-[#efece5] rounded px-2 py-1 transition inline-flex items-center gap-1 disabled:opacity-60">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Odśwież
        </button>
      }>Allegro</SectionLabel>
      <KV k="Order ID" mono>{order.externalId ? <CopyChip value={order.externalId} /> : <span className="text-[#9a9486]">—</span>}</KV>
      <KV k="Rewizja" mono>{order.allegroRevision ? <CopyChip value={order.allegroRevision} /> : <span className="text-[#9a9486]">—</span>}</KV>
      <KV k="Shipment ID" mono dim={!order.allegroShipmentId}>{order.allegroShipmentId ? <CopyChip value={order.allegroShipmentId} /> : '—'}</KV>
      <KV k="Paczki" mono>{order.allShipments?.length ?? 0}</KV>
      {order.trackingStatusUpdatedAt && (
        <div className="mt-3 pt-3 border-t border-[#ece8dc] flex items-center gap-2 text-[11px] text-[#6b665b]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2f6f3e]" style={{ boxShadow: '0 0 0 3px rgba(47,111,62,0.15)' }} />
          <span>Zsynchronizowano <span className="font-mono">{fmtDate(order.trackingStatusUpdatedAt)}</span></span>
        </div>
      )}
    </Card>
  )
}

function PaymentSection({ order }: { order: AdminOrderDetail }) {
  return (
    <Card>
      <SectionLabel>Płatność</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <KV k="Metoda">{order.paymentMethod ?? '—'}</KV>
        <KV k="P24 status">{order.p24Status ?? '—'}</KV>
        <KV k="Opłacono">{fmtDate(order.paidAt)}</KV>
        <KV k="Suma" mono>{fmtMoney(order.total, order.currency)}</KV>
        <KV k="Transakcja" mono>{order.p24TransactionId ? <CopyChip value={order.p24TransactionId} /> : '—'}</KV>
        <KV k="Sesja" mono>{order.p24SessionId ? <CopyChip value={order.p24SessionId} /> : '—'}</KV>
      </div>
    </Card>
  )
}

function InvoiceSection({ order }: { order: AdminOrderDetail }) {
  const billing = order.customerData.billingAddress
  return (
    <Card>
      <SectionLabel>Faktura</SectionLabel>
      <KV k="Wymagana">{order.invoiceRequired ? 'Tak' : 'Nie'}</KV>
      {order.customerData.companyName && <KV k="Firma">{order.customerData.companyName}</KV>}
      {order.customerData.taxId && <KV k="NIP" mono><CopyChip value={order.customerData.taxId} /></KV>}
      {billing && (
        <div className="mt-3 bg-[#efece5] rounded p-3.5 text-[12.5px] text-[#3a372f] leading-[1.65] border border-[#e1dccf]">
          <div>{billing.name}</div>
          <div>{billing.street}</div>
          <div>{billing.postalCode} {billing.city}</div>
        </div>
      )}
    </Card>
  )
}

function ShippingSection({ order, onRefresh, loading }: { order: AdminOrderDetail; onRefresh: () => void; loading: boolean }) {
  const parcels = order.allShipments ?? []
  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>Dostawa</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <KV k="Metoda">{order.shippingMethod ?? '—'}</KV>
          <KV k="Status">{order.trackingStatus ?? order.trackingStatusCode ?? '—'}</KV>
          <KV k="Numer przesyłki" mono>{order.trackingNumber ? <CopyChip value={order.trackingNumber} /> : '—'}</KV>
          <KV k="Aktualizacja">{fmtDate(order.trackingStatusUpdatedAt)}</KV>
        </div>
      </Card>
      <Card>
        <SectionLabel
          count={parcels.length}
          action={<button type="button" onClick={onRefresh} disabled={loading} className="text-[12.5px] text-[#6b665b] hover:text-[#1b1a17] hover:bg-[#efece5] rounded px-2 py-1 inline-flex items-center gap-1 disabled:opacity-60">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Odśwież
          </button>}
        >Paczki</SectionLabel>
        {parcels.length === 0
          ? <EmptyState icon={Truck} title="Brak zapisanych paczek" />
          : <div className="space-y-3">{parcels.map((p) => <ParcelCard key={p.waybill} parcel={p} />)}</div>}
      </Card>
    </div>
  )
}

function ParcelCard({ parcel }: { parcel: AllegroShipmentEntry }) {
  return (
    <div className="border border-[#e1dccf] rounded-md overflow-hidden">
      <div className="p-3 bg-[#efece5] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[13px] text-[#1b1a17] truncate">{parcel.waybill}</div>
          <div className="text-[11px] text-[#6b665b]">{parcel.carrierName ?? parcel.carrierId} · {parcel.statusLabel ?? parcel.statusCode}</div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#e3edf6] text-[#1f3a5f]">{parcel.statusCode}</span>
      </div>
      {(parcel.events?.length ?? 0) > 0 && (
        <ol className="p-3 space-y-2">
          {parcel.events!.map((e, i) => (
            <li key={`${e.code}-${e.occurredAt ?? i}`} className="flex items-center gap-3 text-[12.5px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1f3a5f]" />
              <span className="font-medium text-[#1b1a17]">{e.label ?? e.code}</span>
              <span className="text-[11px] text-[#9a9486] ml-auto">{fmtDate(e.occurredAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ReturnsSection({ returns, currency }: { returns: AdminReturn[]; currency: string }) {
  if (returns.length === 0) return <Card><EmptyState icon={Undo2} title="Brak zwrotów" /></Card>
  return (
    <div className="space-y-3">
      {returns.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <CopyChip value={r.returnNumber} />
                <StatusPill status={r.status} />
              </div>
              <div className="text-[13px] text-[#1b1a17] font-medium">{r.reason}</div>
              {r.reasonNote && <div className="text-[11px] text-[#6b665b] mt-1">{r.reasonNote}</div>}
            </div>
            <div className="text-right text-[14px] font-semibold text-[#1b1a17] tabular-nums">{fmtMoney(r.totalRefundAmount, r.currency || currency)}</div>
          </div>
          <div className="mt-3 text-[11px] text-[#6b665b]">Pozycje: {r.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ') || '—'}</div>
        </Card>
      ))}
    </div>
  )
}

function ComplaintsSection({ complaints }: { complaints: AdminOrderDetailComplaint[] }) {
  if (complaints.length === 0) return <Card><EmptyState icon={ShieldAlert} title="Brak dyskusji i reklamacji Allegro" /></Card>
  return (
    <div className="space-y-3">
      {complaints.map((c) => (
        <Card key={c.id}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CopyChip value={c.allegroIssueId} />
                <StatusPill status={c.status} />
              </div>
              <div className="text-[13px] text-[#1b1a17] font-medium">{c.subject ?? 'Dyskusja Allegro'}</div>
              <div className="text-[11px] text-[#6b665b] mt-1">Ostatnia wiadomość: {fmtDate(c.lastMessageAt)}</div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#efece5] text-[#3a372f]">{c.messages.length} wiad.</span>
          </div>
          {c.messages.slice(-3).map((m) => (
            <div key={m.id} className="mt-2 rounded-md bg-[#efece5] border border-[#e1dccf] p-3 text-[12.5px]">
              <div className="flex items-center justify-between gap-3 text-[10.5px] text-[#6b665b] uppercase tracking-[0.1em] mb-1.5">
                <span>{m.authorRole}</span>
                <span>{fmtDate(m.createdAt)}</span>
              </div>
              <div className="text-[#1b1a17] whitespace-pre-wrap">{m.text ?? '—'}</div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  )
}

function NotesSection({ order }: { order: AdminOrderDetail }) {
  return (
    <Card>
      <SectionLabel>Notatki</SectionLabel>
      <div className="space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.1em] text-[#9a9486] font-semibold mb-2">Publiczne</div>
          <div className="min-h-20 rounded-md border border-[#e1dccf] bg-[#efece5] p-3 text-[12.5px] text-[#1b1a17] whitespace-pre-wrap">{order.notes || 'Brak notatek publicznych.'}</div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.1em] text-[#9a9486] font-semibold mb-2">Wewnętrzne</div>
          <div className="min-h-20 rounded-md border border-red-200 bg-red-50/40 p-3 text-[12.5px] text-[#1b1a17] whitespace-pre-wrap">{order.internalNotes || 'Brak notatek wewnętrznych.'}</div>
        </div>
      </div>
    </Card>
  )
}

function AuditSection({ order }: { order: AdminOrderDetail }) {
  if (order.audit.length === 0) return <Card><EmptyState icon={ClipboardList} title="Brak wpisów audytu" /></Card>
  return (
    <Card noPad>
      <CardHead><SectionLabel count={order.audit.length}>Audyt</SectionLabel><span /></CardHead>
      <ul className="list-none p-0 m-0">
        {order.audit.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#ece8dc] last:border-0 text-[12.5px]">
            <UserIcon className="w-4 h-4 text-[#9a9486]" />
            <div className="flex-1 min-w-0">
              <div className="text-[#1b1a17]"><strong className="font-medium">{a.adminName ?? a.adminEmail ?? `Admin ${a.adminId ?? '—'}`}</strong> · {a.action}</div>
              <div className="text-[11px] text-[#6b665b] truncate">{JSON.stringify(a.details ?? {})}</div>
            </div>
            <div className="text-[11px] text-[#9a9486] whitespace-nowrap tabular-nums">{fmtDate(a.createdAt)}</div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function EmptyState({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-full bg-[#efece5] flex items-center justify-center mb-3"><Icon className="w-6 h-6 text-[#9a9486]" /></div>
      <div className="text-[13px] font-medium text-[#1b1a17]">{title}</div>
    </div>
  )
}

export function OrderDetailView({ id }: { id: string }) {
  const orderId = Number(id)
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [tab, setTab] = useState<TabId>('details')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center text-[#3a372f]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie zamówienia…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-600" />
          <h1 className="font-semibold text-[#1b1a17]">Nie można wyświetlić zamówienia</h1>
          <p className="text-sm text-[#6b665b] mt-2">{error ?? 'Brak danych.'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#1b1a17]">
      <div className="max-w-[1280px] mx-auto px-8 pt-7 pb-20">
        <PageHeader
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
          tab={tab}
          setTab={setTab}
        />

        {error && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-5">
          <main className="flex flex-col gap-5 min-w-0">
            {tab === 'details' && (<><ItemsCard order={order} /><TimelineCard entries={order.statusHistory} /></>)}
            {tab === 'payment' && <PaymentSection order={order} />}
            {tab === 'invoice' && <InvoiceSection order={order} />}
            {tab === 'shipping' && (
              <ShippingSection
                order={order}
                onRefresh={() => runAction('shipping-refresh', () => adminApi.refreshOrderShipment(order.id, { force: true }))}
                loading={actionLoading === 'shipping-refresh'}
              />
            )}
            {tab === 'returns' && <ReturnsSection returns={order.returns} currency={order.currency} />}
            {tab === 'complaints' && <ComplaintsSection complaints={order.complaints} />}
            {tab === 'notes' && <NotesSection order={order} />}
            {tab === 'audit' && <AuditSection order={order} />}
          </main>

          <aside className="flex flex-col gap-3.5 min-w-0">
            <ProgressCard order={order} />
            <AmountsCard order={order} />
            <CustomerCard order={order} />
            <ShipmentCard
              order={order}
              onRefresh={() => runAction('shipment-refresh-card', () => adminApi.refreshOrderShipment(order.id, { force: true }))}
              loading={actionLoading === 'shipment-refresh-card'}
            />
            {order.source === 'allegro' && (
              <AllegroCard
                order={order}
                onRefresh={() => runAction('allegro-refresh', () => adminApi.refreshOrderShipment(order.id, { force: true }))}
                loading={actionLoading === 'allegro-refresh'}
              />
            )}
          </aside>
        </div>
      </div>

      <ShipmentModal order={order} isOpen={shipmentOpen} onClose={() => setShipmentOpen(false)} onSuccess={() => void loadOrder()} />
      <ShipmentLabelPickerModal order={order} isOpen={labelOpen} onClose={() => setLabelOpen(false)} />
    </div>
  )
}
