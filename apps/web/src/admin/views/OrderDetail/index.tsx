'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Check, ClipboardList, Copy, CreditCard, ExternalLink,
  FileText, History, Loader2, Package, Receipt, RefreshCw,
  ShieldAlert, StickyNote, Truck, Undo2, User as UserIcon, XCircle,
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

type TabId = 'timeline' | 'items' | 'payment' | 'invoice' | 'shipping' | 'returns' | 'complaints' | 'notes' | 'audit'

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; count?: (order: AdminOrderDetail) => number }> = [
  { id: 'timeline', label: 'Os czasu', icon: History },
  { id: 'items', label: 'Pozycje', icon: Package },
  { id: 'payment', label: 'Platnosc', icon: CreditCard },
  { id: 'invoice', label: 'Faktura', icon: Receipt },
  { id: 'shipping', label: 'Wysylka', icon: Truck },
  { id: 'returns', label: 'Zwroty', icon: Undo2, count: (order) => order.badgeCounts.returns },
  { id: 'complaints', label: 'Dyskusje', icon: ShieldAlert, count: (order) => order.badgeCounts.complaints },
  { id: 'notes', label: 'Notatki', icon: StickyNote },
  { id: 'audit', label: 'Audyt', icon: ClipboardList, count: (order) => order.badgeCounts.audit },
]

function fmtDate(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
}

function fmtMoney(amount?: number | null, currency = 'PLN') {
  if (amount == null || Number.isNaN(amount)) return '-'
  return `${amount.toFixed(2)} ${currency}`
}

function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(text)
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-[#E5E1DA] shadow-sm ${className}`}>{children}</div>
}

function CardHeader({ icon: Icon, title, action }: { icon: React.ComponentType<{ className?: string }>; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E5E1DA]">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#7C7466]" />
        <h3 className="text-sm font-semibold text-[#3A332A]">{title}</h3>
      </div>
      {action}
    </div>
  )
}

function CopyChip({ value, label }: { value?: string | number | null; label?: string }) {
  const text = value == null || value === '' ? '-' : String(value)
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { if (text !== '-') copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5C5345] hover:text-[#3A332A] hover:bg-[#F5F1EA] rounded px-1.5 py-0.5 transition"
      title="Skopiuj"
      type="button"
    >
      <span>{label ?? text}</span>
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 opacity-50" />}
    </button>
  )
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'error' | 'success' | 'info' }) {
  const map = {
    neutral: 'bg-[#F5F1EA] text-[#5C5345]',
    warn: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
  }
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${map[tone]}`}>{children}</span>
}

function StatRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-[#7C7466] text-xs uppercase tracking-wide">{label}</span>
      <span className={`text-[#3A332A] text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

export function OrderDetailView({ id }: { id: string }) {
  const orderId = Number(id)
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [tab, setTab] = useState<TabId>('timeline')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [labelOpen, setLabelOpen] = useState(false)

  const loadOrder = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setError('Nieprawidlowe ID zamowienia')
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Nie udalo sie pobrac zamowienia'))
      .finally(() => setLoading(false))
  }, [loadOrder])

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setActionLoading(key)
    setError(null)
    try {
      await action()
      await loadOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operacja nie powiodla sie')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-[#5C5345]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ladowanie zamowienia...
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-600" />
          <h1 className="font-semibold text-[#3A332A]">Nie mozna wyswietlic zamowienia</h1>
          <p className="text-sm text-[#7C7466] mt-2">{error ?? 'Brak danych.'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header
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
        onFulfillment={(status) => runAction(`fulfillment-${status}`, () => adminApi.setOrderFulfillment(order.id, status))}
      />

      <div className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-[132px] lg:self-start">
          <StatusCard order={order} />
          <MoneyCard order={order} />
          <CustomerCard order={order} />
          {order.source === 'allegro' && <AllegroMetaCard order={order} onRefreshShipment={() => runAction('shipment-refresh-card', () => adminApi.refreshOrderShipment(order.id, { force: true }))} loading={actionLoading === 'shipment-refresh-card'} />}
        </aside>

        <main className="col-span-12 lg:col-span-8 xl:col-span-9">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Card>
            <div className="border-b border-[#E5E1DA] px-2 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {TABS.map((t) => {
                  const Icon = t.icon
                  const count = t.count?.(order) ?? 0
                  const active = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-3.5 py-3 text-sm border-b-2 transition whitespace-nowrap ${active ? 'border-[#3A332A] text-[#3A332A] font-medium' : 'border-transparent text-[#7C7466] hover:text-[#3A332A]'}`}
                      type="button"
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                      {count > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F1EA] text-[#5C5345]">{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-6">
              {tab === 'timeline' && <TimelineSection entries={order.statusHistory} />}
              {tab === 'items' && <ItemsSection order={order} />}
              {tab === 'payment' && <PaymentSection order={order} />}
              {tab === 'invoice' && <InvoiceSection order={order} />}
              {tab === 'shipping' && <ShippingSection order={order} onRefresh={() => runAction('shipping-refresh', () => adminApi.refreshOrderShipment(order.id, { force: true }))} />}
              {tab === 'returns' && <ReturnsSection returns={order.returns} currency={order.currency} />}
              {tab === 'complaints' && <ComplaintsSection complaints={order.complaints} />}
              {tab === 'notes' && <NotesSection order={order} />}
              {tab === 'audit' && <AuditSection order={order} />}
            </div>
          </Card>
        </main>
      </div>

      <ShipmentModal order={order} isOpen={shipmentOpen} onClose={() => setShipmentOpen(false)} onSuccess={() => void loadOrder()} />
      <ShipmentLabelPickerModal order={order} isOpen={labelOpen} onClose={() => setLabelOpen(false)} />
    </div>
  )
}

function Header({
  order,
  loadingKey,
  onRefresh,
  onRefreshShipment,
  onCreateShipment,
  onDownloadLabel,
  onFulfillment,
}: {
  order: AdminOrderDetail
  loadingKey: string | null
  onRefresh: () => void
  onRefreshShipment: () => void
  onCreateShipment: () => void
  onDownloadLabel: () => void
  onFulfillment: (status: 'PROCESSING' | 'READY_FOR_SHIPMENT' | 'SENT' | 'PICKED_UP' | 'CANCELLED') => void
}) {
  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#E5E1DA]">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-[#3A332A]">Zamowienie #{order.orderNumber}</h1>
              <Pill tone={order.source === 'allegro' ? 'info' : 'neutral'}>{order.source === 'allegro' ? 'Allegro' : 'Sklep'}</Pill>
              <OrderStatusBadge status={order.status} source={order.source} allegroFulfillmentStatus={order.allegroFulfillmentStatus} paymentMethod={order.paymentMethod} paidAt={order.paidAt} />
              {order.shipmentFreshness === 'stale' && <Pill tone="warn">Tracking nieaktualny</Pill>}
            </div>
            <div className="text-xs text-[#7C7466] flex items-center gap-3 flex-wrap">
              <span>Utworzono {fmtDate(order.createdAt)}</span>
              {order.externalId && <span className="inline-flex items-center gap-1">Allegro ID: <CopyChip value={order.externalId} /></span>}
            </div>
            {order.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {order.warnings.map((warning) => (
                  <div key={warning.code} className={`flex items-center gap-2 text-xs px-2.5 py-1 rounded-md ${warning.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <ActionButton icon={RefreshCw} label="Odswiez" loading={loadingKey === 'refresh'} onClick={onRefresh} />
            {order.actions.canRefreshShipment && <ActionButton icon={Truck} label="Tracking" loading={loadingKey === 'shipment-refresh'} onClick={onRefreshShipment} />}
            {order.actions.canCreateShipment && <ActionButton icon={Package} label="Nadaj" onClick={onCreateShipment} primary />}
            {order.actions.canDownloadLabel && <ActionButton icon={FileText} label="Etykieta" loading={loadingKey === 'label'} onClick={onDownloadLabel} />}
            {order.actions.canSyncFulfillment && (
              <>
                <ActionButton icon={Truck} label="SENT" loading={loadingKey === 'fulfillment-SENT'} onClick={() => onFulfillment('SENT')} />
                <ActionButton icon={Check} label="PICKED_UP" loading={loadingKey === 'fulfillment-PICKED_UP'} onClick={() => onFulfillment('PICKED_UP')} />
              </>
            )}
            {order.actions.canSyncFulfillment && <ActionButton icon={XCircle} label="Anuluj Allegro" loading={loadingKey === 'fulfillment-CANCELLED'} onClick={() => onFulfillment('CANCELLED')} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({ icon: Icon, label, loading, onClick, primary }: { icon: React.ComponentType<{ className?: string }>; label: string; loading?: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition disabled:opacity-60 ${primary ? 'bg-[#3A332A] text-white border-[#3A332A] hover:bg-[#5C5345]' : 'text-[#5C5345] bg-white border-[#E5E1DA] hover:bg-[#F5F1EA]'}`}
      onClick={onClick}
      disabled={loading}
      type="button"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

function StatusCard({ order }: { order: AdminOrderDetail }) {
  return (
    <Card>
      <CardHeader icon={Package} title="Status" />
      <div className="px-5 py-4 space-y-2.5">
        <StatRow label="Wewnetrzny" value={<OrderStatusBadge status={order.status} source={order.source} paymentMethod={order.paymentMethod} paidAt={order.paidAt} />} />
        {order.allegroFulfillmentStatus && <StatRow label="Allegro" value={<Pill tone="info">{order.allegroFulfillmentStatus}</Pill>} />}
        <StatRow label="Platnosc" value={order.paidAt ? fmtDate(order.paidAt) : <Pill tone="warn">Brak</Pill>} />
        <StatRow label="Wyslano" value={fmtDate(order.shippedAt)} />
        <StatRow label="Dostarczono" value={fmtDate(order.deliveredAt)} />
      </div>
    </Card>
  )
}

function MoneyCard({ order }: { order: AdminOrderDetail }) {
  return (
    <Card>
      <CardHeader icon={CreditCard} title="Kwoty" />
      <div className="px-5 py-4 space-y-2">
        <StatRow label="Wartosc" value={fmtMoney(order.subtotal ?? 0, order.currency)} />
        <StatRow label="Wysylka" value={fmtMoney(order.shippingCost ?? 0, order.currency)} />
        <StatRow label="VAT" value={fmtMoney(order.taxAmount, order.currency)} />
        <div className="border-t border-[#E5E1DA] my-2" />
        <div className="flex items-baseline justify-between py-1">
          <span className="text-xs uppercase tracking-wide text-[#7C7466]">Suma</span>
          <span className="text-lg font-semibold text-[#3A332A]">{fmtMoney(order.total, order.currency)}</span>
        </div>
        {order.totalPln && <div className="text-xs text-[#7C7466] text-right">~ {fmtMoney(order.totalPln, 'PLN')}</div>}
      </div>
    </Card>
  )
}

function CustomerCard({ order }: { order: AdminOrderDetail }) {
  const customer = order.customerData
  const shipping = customer.shippingAddress
  return (
    <Card>
      <CardHeader icon={UserIcon} title="Klient" />
      <div className="px-5 py-4 space-y-3">
        <div>
          <div className="font-medium text-[#3A332A]">{customer.name || order.user?.name || '-'}</div>
          <div className="text-xs text-[#7C7466]">{customer.email || order.user?.email || '-'}</div>
          {customer.phone && <div className="text-xs text-[#7C7466]">{customer.phone}</div>}
          {customer.allegroLogin && <div className="mt-1"><Pill tone="info">Allegro: {customer.allegroLogin}</Pill></div>}
        </div>
        {shipping && (
          <div className="border-t border-[#E5E1DA] pt-3 text-sm text-[#3A332A] space-y-0.5">
            <div className="text-[11px] uppercase tracking-wide text-[#7C7466] mb-1">Adres dostawy</div>
            <div>{shipping.name || customer.name}</div>
            <div>{shipping.street}</div>
            <div>{shipping.postalCode} {shipping.city}</div>
            <div className="text-[#7C7466] text-xs">{shipping.country}</div>
          </div>
        )}
      </div>
    </Card>
  )
}

function AllegroMetaCard({ order, onRefreshShipment, loading }: { order: AdminOrderDetail; onRefreshShipment: () => void; loading: boolean }) {
  return (
    <Card>
      <CardHeader icon={ExternalLink} title="Allegro" action={<ActionButton icon={RefreshCw} label="Odswiez" loading={loading} onClick={onRefreshShipment} />} />
      <div className="px-5 py-4 space-y-2">
        <StatRow label="Order ID" value={<CopyChip value={order.externalId} />} />
        <StatRow label="Rewizja" value={<CopyChip value={order.allegroRevision} />} />
        <StatRow label="Shipment ID" value={<CopyChip value={order.allegroShipmentId} />} />
        <StatRow label="Paczki" value={order.allShipments?.length ?? 0} />
      </div>
    </Card>
  )
}

function TimelineSection({ entries }: { entries: AdminOrderTimelineEntry[] }) {
  if (entries.length === 0) return <EmptyState icon={History} title="Brak historii statusow" />
  return (
    <ol className="relative border-l-2 border-[#E5E1DA] ml-3 space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="ml-6 relative">
          <span className="absolute -left-[34px] top-1 w-4 h-4 rounded-full bg-[#3A332A] ring-4 ring-white" />
          <div className="bg-[#FAF7F2] rounded-lg p-3.5 border border-[#E5E1DA]">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Pill>{entry.category}</Pill>
                <span className="text-sm font-medium text-[#3A332A]">{entry.previousValue ?? '-'} -&gt; {entry.newValue}</span>
              </div>
              <div className="text-xs text-[#7C7466]">{fmtDate(entry.occurredAt)}</div>
            </div>
            <div className="mt-2 text-xs text-[#7C7466] flex flex-wrap gap-x-3 gap-y-1">
              <span>Zrodlo: <span className="text-[#5C5345]">{entry.source}</span></span>
              {entry.sourceRef && <span>Ref: <CopyChip value={entry.sourceRef} /></span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ItemsSection({ order }: { order: AdminOrderDetail }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#7C7466] border-b border-[#E5E1DA]">
              <th className="py-2 pr-3 font-medium">Produkt</th>
              <th className="py-2 px-3 font-medium">SKU</th>
              <th className="py-2 px-3 font-medium text-right">Ilosc</th>
              <th className="py-2 px-3 font-medium text-right">Cena</th>
              <th className="py-2 pl-3 font-medium text-right">Suma</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.id ?? item.productSku}`} className="border-b border-[#E5E1DA] last:border-0">
                <td className="py-3 pr-3 font-medium text-[#3A332A]">{item.productName}</td>
                <td className="py-3 px-3"><CopyChip value={item.productSku} /></td>
                <td className="py-3 px-3 text-right">{item.quantity}</td>
                <td className="py-3 px-3 text-right">{fmtMoney(item.unitPrice, order.currency)}</td>
                <td className="py-3 pl-3 text-right font-medium">{fmtMoney(item.totalPrice, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentSection({ order }: { order: AdminOrderDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <StatRow label="Metoda" value={order.paymentMethod ? <Pill>{order.paymentMethod}</Pill> : '-'} />
      <StatRow label="P24 status" value={order.p24Status ? <Pill tone="success">{order.p24Status}</Pill> : '-'} />
      <StatRow label="Oplacono" value={fmtDate(order.paidAt)} />
      <StatRow label="Transakcja" value={<CopyChip value={order.p24TransactionId} />} mono />
      <StatRow label="Sesja" value={<CopyChip value={order.p24SessionId} />} mono />
      <StatRow label="Suma" value={fmtMoney(order.total, order.currency)} />
    </div>
  )
}

function InvoiceSection({ order }: { order: AdminOrderDetail }) {
  const billing = order.customerData.billingAddress
  return (
    <div className="space-y-4">
      <StatRow label="Wymagana" value={<Pill tone={order.invoiceRequired ? 'info' : 'neutral'}>{order.invoiceRequired ? 'Tak' : 'Nie'}</Pill>} />
      {order.customerData.companyName && <StatRow label="Firma" value={order.customerData.companyName} />}
      {order.customerData.taxId && <StatRow label="NIP" value={<CopyChip value={order.customerData.taxId} />} mono />}
      {billing && (
        <div className="bg-[#FAF7F2] rounded-lg p-4 border border-[#E5E1DA] text-sm">
          <div>{billing.name}</div>
          <div>{billing.street}</div>
          <div>{billing.postalCode} {billing.city}</div>
        </div>
      )}
    </div>
  )
}

function ShippingSection({ order, onRefresh }: { order: AdminOrderDetail; onRefresh: () => void }) {
  const parcels = order.allShipments ?? []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <StatRow label="Metoda" value={order.shippingMethod ?? '-'} />
        <StatRow label="Nr przesylki" value={<CopyChip value={order.trackingNumber} />} mono />
        <StatRow label="Status" value={order.trackingStatus ?? order.trackingStatusCode ?? '-'} />
        <StatRow label="Aktualizacja" value={fmtDate(order.trackingStatusUpdatedAt)} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs uppercase tracking-wide text-[#7C7466] font-medium">Paczki ({parcels.length})</h4>
          <ActionButton icon={RefreshCw} label="Odswiez status" onClick={onRefresh} />
        </div>
        {parcels.length === 0 ? <EmptyState icon={Truck} title="Brak zapisanych paczek" /> : <div className="space-y-3">{parcels.map((parcel) => <ParcelCard key={parcel.waybill} parcel={parcel} />)}</div>}
      </div>
    </div>
  )
}

function ParcelCard({ parcel }: { parcel: AllegroShipmentEntry }) {
  return (
    <div className="border border-[#E5E1DA] rounded-lg overflow-hidden">
      <div className="p-3 bg-[#FAF7F2] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-sm text-[#3A332A] truncate">{parcel.waybill}</div>
          <div className="text-xs text-[#7C7466]">{parcel.carrierName ?? parcel.carrierId} - {parcel.statusLabel ?? parcel.statusCode}</div>
        </div>
        <Pill tone={parcel.isSelected ? 'info' : 'neutral'}>{parcel.statusCode}</Pill>
      </div>
      {(parcel.events?.length ?? 0) > 0 && (
        <ol className="p-3 space-y-2">
          {parcel.events!.map((event, index) => (
            <li key={`${event.code}-${event.occurredAt ?? index}`} className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium text-[#3A332A]">{event.label ?? event.code}</span>
              <span className="text-xs text-[#7C7466] ml-auto">{fmtDate(event.occurredAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ReturnsSection({ returns, currency }: { returns: AdminReturn[]; currency: string }) {
  if (returns.length === 0) return <EmptyState icon={Undo2} title="Brak zwrotow" />
  return (
    <div className="space-y-3">
      {returns.map((ret) => (
        <div key={ret.id} className="border border-[#E5E1DA] rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CopyChip value={ret.returnNumber} />
                <Pill tone={ret.source === 'allegro' ? 'info' : 'neutral'}>{ret.source}</Pill>
                <Pill tone={ret.status === 'rejected' ? 'error' : ret.status === 'refunded' || ret.status === 'closed' ? 'success' : 'warn'}>{ret.status}</Pill>
              </div>
              <div className="text-sm text-[#3A332A]">{ret.reason}</div>
              {ret.reasonNote && <div className="text-xs text-[#7C7466] mt-1">{ret.reasonNote}</div>}
            </div>
            <div className="text-right text-sm font-semibold text-[#3A332A]">{fmtMoney(ret.totalRefundAmount, ret.currency || currency)}</div>
          </div>
          <div className="mt-3 text-xs text-[#7C7466]">Pozycje: {ret.items.map((item) => `${item.quantity}x ${item.productName}`).join(', ') || '-'}</div>
        </div>
      ))}
    </div>
  )
}

function ComplaintsSection({ complaints }: { complaints: AdminOrderDetailComplaint[] }) {
  if (complaints.length === 0) return <EmptyState icon={ShieldAlert} title="Brak dyskusji i reklamacji Allegro" />
  return (
    <div className="space-y-3">
      {complaints.map((complaint) => (
        <div key={complaint.id} className="border border-[#E5E1DA] rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CopyChip value={complaint.allegroIssueId} />
                <Pill tone="warn">{complaint.status}</Pill>
              </div>
              <div className="text-sm text-[#3A332A] font-medium">{complaint.subject ?? 'Dyskusja Allegro'}</div>
              <div className="text-xs text-[#7C7466] mt-1">Ostatnia wiadomosc: {fmtDate(complaint.lastMessageAt)}</div>
            </div>
            <Pill>{complaint.messages.length} wiad.</Pill>
          </div>
          {complaint.messages.slice(-3).map((message) => (
            <div key={message.id} className="mt-2 rounded-lg bg-[#FAF7F2] border border-[#E5E1DA] p-3 text-sm">
              <div className="flex items-center justify-between gap-3 text-xs text-[#7C7466] mb-1">
                <span>{message.authorRole}</span>
                <span>{fmtDate(message.createdAt)}</span>
              </div>
              <div className="text-[#3A332A] whitespace-pre-wrap">{message.text ?? '-'}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function NotesSection({ order }: { order: AdminOrderDetail }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-[#7C7466] font-medium mb-2">Publiczne</div>
        <div className="min-h-20 rounded-lg border border-[#E5E1DA] bg-[#FAF7F2] p-3 text-sm text-[#3A332A] whitespace-pre-wrap">{order.notes || 'Brak notatek publicznych.'}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-[#7C7466] font-medium mb-2">Wewnetrzne</div>
        <div className="min-h-20 rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-[#3A332A] whitespace-pre-wrap">{order.internalNotes || 'Brak notatek wewnetrznych.'}</div>
      </div>
    </div>
  )
}

function AuditSection({ order }: { order: AdminOrderDetail }) {
  if (order.audit.length === 0) return <EmptyState icon={ClipboardList} title="Brak wpisow audytu" />
  return (
    <div className="space-y-2">
      {order.audit.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-lg border border-[#E5E1DA] text-sm">
          <UserIcon className="w-4 h-4 text-[#7C7466]" />
          <div className="flex-1 min-w-0">
            <div className="text-[#3A332A]"><strong>{entry.adminName ?? entry.adminEmail ?? `Admin ${entry.adminId ?? '-'}`}</strong> - {entry.action}</div>
            <div className="text-xs text-[#7C7466] truncate">{JSON.stringify(entry.details ?? {})}</div>
          </div>
          <div className="text-xs text-[#7C7466] whitespace-nowrap">{fmtDate(entry.createdAt)}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-full bg-[#F5F1EA] flex items-center justify-center mb-3"><Icon className="w-6 h-6 text-[#7C7466]" /></div>
      <div className="text-sm font-medium text-[#3A332A]">{title}</div>
    </div>
  )
}
