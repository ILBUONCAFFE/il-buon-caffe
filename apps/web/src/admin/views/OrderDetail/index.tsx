'use client'

import { useMemo, useState } from 'react'
import {
  RefreshCw, MessageSquare, FileText, Truck, Undo2, XCircle, Printer, Download,
  Package, CreditCard, Receipt, AlertTriangle, ShieldAlert, Star, ClipboardList,
  StickyNote, History, Copy, ExternalLink, User as UserIcon, MapPin, ChevronDown,
  ChevronRight, Check, Mail, Phone,
} from 'lucide-react'
import { OrderStatusBadge } from '@/admin/components/OrderStatusBadge'
import { getMockOrder, type OrderDetailMock, type TimelineCategory } from './mockData'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'przed chwila'
  if (min < 60) return `${min} min temu`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} godz. temu`
  const d = Math.floor(h / 24)
  return `${d} dni temu`
}

function fmtMoney(amount: string, currency = 'PLN') {
  return `${amount} ${currency}`
}

function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(text)
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-[#E5E1DA] shadow-sm ${className}`}>{children}</div>
}

function CardHeader({ icon: Icon, title, action }: { icon: React.ComponentType<{ className?: string }>; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E1DA]">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#7C7466]" />
        <h3 className="text-sm font-semibold text-[#3A332A] tracking-tight">{title}</h3>
      </div>
      {action}
    </div>
  )
}

function CopyChip({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { copyToClipboard(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5C5345] hover:text-[#3A332A] hover:bg-[#F5F1EA] rounded px-1.5 py-0.5 transition"
      title="Skopiuj"
    >
      <span>{label ?? value}</span>
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 opacity-50" />}
    </button>
  )
}

function StatRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-[#7C7466] text-xs uppercase tracking-wide">{label}</span>
      <span className={`text-[#3A332A] ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
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

const TABS = [
  { id: 'timeline', label: 'Os czasu', icon: History },
  { id: 'items', label: 'Pozycje', icon: Package },
  { id: 'payment', label: 'Platnosc', icon: CreditCard },
  { id: 'invoice', label: 'Faktura', icon: Receipt },
  { id: 'shipping', label: 'Wysylka', icon: Truck },
  { id: 'messages', label: 'Wiadomosci', icon: MessageSquare, badge: 'unread' },
  { id: 'returns', label: 'Zwroty', icon: Undo2, badge: 'returns' },
  { id: 'complaints', label: 'Reklamacje', icon: ShieldAlert, badge: 'complaints' },
  { id: 'disputes', label: 'Dyskusje', icon: AlertTriangle, badge: 'disputes' },
  { id: 'feedback', label: 'Oceny', icon: Star },
  { id: 'notes', label: 'Notatki', icon: StickyNote },
  { id: 'audit', label: 'Audyt', icon: ClipboardList },
] as const

type TabId = typeof TABS[number]['id']

export function OrderDetailView({ id }: { id: string }) {
  const order = useMemo(() => getMockOrder(id), [id])
  const [tab, setTab] = useState<TabId>('timeline')

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header order={order} />
      <div className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-[160px] lg:self-start">
          <StatusCard order={order} />
          <MoneyCard order={order} />
          <CustomerCard order={order} />
          {order.source === 'allegro' && <AllegroMetaCard order={order} />}
        </aside>
        <main className="col-span-12 lg:col-span-8 xl:col-span-9">
          <Card>
            <div className="border-b border-[#E5E1DA] px-2 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {TABS.map((t) => {
                  const Icon = t.icon
                  const count = badgeCount(order, t)
                  const active = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-3.5 py-3 text-sm border-b-2 transition whitespace-nowrap ${active ? 'border-[#3A332A] text-[#3A332A] font-medium' : 'border-transparent text-[#7C7466] hover:text-[#3A332A]'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                      {count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${active ? 'bg-[#3A332A] text-white' : 'bg-[#F5F1EA] text-[#5C5345]'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-6">
              {tab === 'timeline' && <TimelineSection order={order} />}
              {tab === 'items' && <ItemsSection order={order} />}
              {tab === 'payment' && <PaymentSection order={order} />}
              {tab === 'invoice' && <InvoiceSection order={order} />}
              {tab === 'shipping' && <ShippingSection order={order} />}
              {tab === 'messages' && <MessagesSection order={order} />}
              {tab === 'returns' && <ReturnsSection order={order} />}
              {tab === 'complaints' && <ComplaintsSection order={order} />}
              {tab === 'disputes' && <DisputesSection order={order} />}
              {tab === 'feedback' && <FeedbackSection order={order} />}
              {tab === 'notes' && <NotesSection order={order} />}
              {tab === 'audit' && <AuditSection order={order} />}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}

function badgeCount(order: OrderDetailMock, t: typeof TABS[number]): number {
  if (!('badge' in t)) return 0
  if (t.badge === 'unread') return order.messages.filter((m) => !m.read && m.direction === 'in').length
  if (t.badge === 'returns') return order.returns.length
  if (t.badge === 'complaints') return order.complaints.length
  if (t.badge === 'disputes') return order.disputes.length
  return 0
}

function Header({ order }: { order: OrderDetailMock }) {
  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#E5E1DA]">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-[#3A332A] tracking-tight">Zamowienie #{order.orderNumber}</h1>
              <Pill tone={order.source === 'allegro' ? 'info' : 'neutral'}>
                {order.source === 'allegro' ? 'Allegro' : 'Sklep'}
                {order.allegroEnv === 'sandbox' && <span className="ml-1 text-amber-600">SANDBOX</span>}
              </Pill>
              <OrderStatusBadge status={order.status} source={order.source} allegroFulfillmentStatus={order.allegroFulfillmentStatus} paymentMethod={order.paymentMethod} paidAt={order.paidAt} />
              {order.smart && <Pill tone="success">Smart!</Pill>}
            </div>
            <div className="text-xs text-[#7C7466] flex items-center gap-3 flex-wrap">
              <span>Utworzono {fmtDate(order.createdAt)}</span>
              <span className="text-[#C9C0B0]">•</span>
              <span>{relativeTime(order.createdAt)}</span>
              {order.externalId && (<>
                <span className="text-[#C9C0B0]">•</span>
                <span className="inline-flex items-center gap-1">Allegro ID: <CopyChip value={order.externalId} /></span>
              </>)}
            </div>
            {order.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {order.warnings.map((w, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs px-2.5 py-1 rounded-md ${w.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {w.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ActionBar />
        </div>
      </div>
    </div>
  )
}

function ActionBar() {
  const buttons = [
    { icon: RefreshCw, label: 'Odswiez' },
    { icon: MessageSquare, label: 'Wiadomosc' },
    { icon: FileText, label: 'Faktura' },
    { icon: Truck, label: 'Etykieta' },
    { icon: Undo2, label: 'Zwrot' },
    { icon: XCircle, label: 'Anuluj' },
    { icon: Printer, label: 'Drukuj' },
    { icon: Download, label: 'PDF' },
  ]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {buttons.map((b) => {
        const Icon = b.icon
        return (
          <button key={b.label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#5C5345] bg-white border border-[#E5E1DA] rounded-lg hover:bg-[#F5F1EA] transition">
            <Icon className="w-3.5 h-3.5" />
            {b.label}
          </button>
        )
      })}
    </div>
  )
}

function StatusCard({ order }: { order: OrderDetailMock }) {
  return (
    <Card>
      <CardHeader icon={Package} title="Status" />
      <div className="px-5 py-4 space-y-2.5">
        <StatRow label="Wewnetrzny" value={<OrderStatusBadge status={order.status} source={order.source} paymentMethod={order.paymentMethod} paidAt={order.paidAt} />} />
        {order.allegroFulfillmentStatus && <StatRow label="Allegro fulfillment" value={<Pill tone="info">{order.allegroFulfillmentStatus}</Pill>} />}
        {order.shippedAt && <StatRow label="Wyslano" value={fmtDate(order.shippedAt)} />}
        {order.deliveredAt && <StatRow label="Dostarczono" value={fmtDate(order.deliveredAt)} />}
        <StatRow label="Retencja" value={<Pill>{order.retentionStatus}</Pill>} />
      </div>
    </Card>
  )
}

function MoneyCard({ order }: { order: OrderDetailMock }) {
  const refunded = parseFloat(order.refundedTotal) > 0
  const balance = (parseFloat(order.total) - parseFloat(order.refundedTotal)).toFixed(2)
  return (
    <Card>
      <CardHeader icon={CreditCard} title="Kwoty" />
      <div className="px-5 py-4 space-y-2">
        <StatRow label="Wartosc" value={fmtMoney(order.subtotal, order.currency)} />
        <StatRow label="Wysylka" value={fmtMoney(order.shippingCost, order.currency)} />
        {order.taxAmount && <StatRow label="VAT" value={fmtMoney(order.taxAmount, order.currency)} />}
        <div className="border-t border-[#E5E1DA] my-2" />
        <div className="flex items-baseline justify-between py-1">
          <span className="text-xs uppercase tracking-wide text-[#7C7466]">Suma</span>
          <span className="text-lg font-semibold text-[#3A332A]">{fmtMoney(order.total, order.currency)}</span>
        </div>
        {order.totalPln && <div className="text-xs text-[#7C7466] text-right">~ {order.totalPln} PLN ({order.exchangeRate} z {order.rateDate})</div>}
        {refunded && (
          <div className="mt-3 p-3 bg-purple-50 rounded-lg space-y-1">
            <StatRow label="Zwrocono" value={<span className="text-purple-700">{fmtMoney(order.refundedTotal, order.currency)}</span>} />
            <StatRow label="Saldo" value={<span className="text-[#3A332A] font-semibold">{fmtMoney(balance, order.currency)}</span>} />
          </div>
        )}
      </div>
    </Card>
  )
}

function CustomerCard({ order }: { order: OrderDetailMock }) {
  const c = order.customer
  return (
    <Card>
      <CardHeader icon={UserIcon} title="Klient" />
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3A332A] text-white flex items-center justify-center text-sm font-semibold">
            {c.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-[#3A332A] truncate">{c.name}</div>
            <div className="flex gap-1.5 mt-0.5">
              {c.isFirstTime ? <Pill tone="info">Nowy</Pill> : <Pill tone="success">Staly</Pill>}
              {c.isCompany && <Pill>Firma</Pill>}
            </div>
          </div>
        </div>
        <div className="space-y-1.5 pt-1">
          <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-[#5C5345] hover:text-[#3A332A]"><Mail className="w-3.5 h-3.5" /> {c.email}</a>
          <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-[#5C5345] hover:text-[#3A332A]"><Phone className="w-3.5 h-3.5" /> {c.phone}</a>
          {c.allegroLogin && <div className="flex items-center gap-2 text-xs text-[#5C5345]"><span className="text-[#7C7466]">Allegro:</span> {c.allegroLogin}</div>}
        </div>
        <div className="border-t border-[#E5E1DA] pt-3 space-y-1">
          <StatRow label="Zamowien" value={c.totalOrders} />
          <StatRow label="LTV" value={`${c.ltvPln} PLN`} />
          <StatRow label="Sredni koszyk" value={`${c.avgOrderPln} PLN`} />
        </div>
        <div className="border-t border-[#E5E1DA] pt-3">
          <div className="text-[11px] uppercase tracking-wide text-[#7C7466] mb-1.5">Zgody RODO</div>
          <div className="flex flex-wrap gap-1.5">
            {c.consents.map((cc) => <Pill key={cc.type} tone={cc.granted ? 'success' : 'neutral'}>{cc.type} {cc.granted ? '✓' : '✗'}</Pill>)}
          </div>
        </div>
      </div>
    </Card>
  )
}

function AllegroMetaCard({ order }: { order: OrderDetailMock }) {
  return (
    <Card>
      <CardHeader icon={ExternalLink} title="Allegro" action={
        <button className="text-xs text-[#5C5345] hover:text-[#3A332A] inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Odswiez</button>
      } />
      <div className="px-5 py-4 space-y-2">
        <StatRow label="Order ID" value={<CopyChip value={order.externalId ?? '-'} />} />
        <StatRow label="Rewizja" value={<CopyChip value={order.allegroRevision ?? '-'} />} />
        <StatRow label="Srodowisko" value={<Pill tone={order.allegroEnv === 'sandbox' ? 'warn' : 'success'}>{order.allegroEnv}</Pill>} />
        <StatRow label="Smart!" value={order.smart ? '✓' : '—'} />
        <div className="border-t border-[#E5E1DA] pt-3 space-y-1.5">
          <a href="#" className="flex items-center justify-between text-xs text-[#5C5345] hover:text-[#3A332A]"><span>Otworz w panelu Allegro</span><ExternalLink className="w-3 h-3" /></a>
          <a href="#" className="flex items-center justify-between text-xs text-[#5C5345] hover:text-[#3A332A]"><span>Profil kupujacego</span><ExternalLink className="w-3 h-3" /></a>
        </div>
      </div>
    </Card>
  )
}

const CATEGORY_STYLE: Record<TimelineCategory, { color: string; label: string }> = {
  status: { color: 'bg-[#3A332A]', label: 'Status' },
  tracking: { color: 'bg-blue-600', label: 'Wysylka' },
  payment: { color: 'bg-emerald-600', label: 'Platnosc' },
  allegro: { color: 'bg-orange-500', label: 'Allegro' },
  admin: { color: 'bg-purple-600', label: 'Admin' },
  system: { color: 'bg-[#7C7466]', label: 'System' },
}

function TimelineSection({ order }: { order: OrderDetailMock }) {
  const [filter, setFilter] = useState<TimelineCategory | 'all'>('all')
  const sorted = [...order.timeline].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  const filtered = filter === 'all' ? sorted : sorted.filter((e) => e.category === filter)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Wszystko</FilterChip>
        {(Object.keys(CATEGORY_STYLE) as TimelineCategory[]).map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>{CATEGORY_STYLE[c].label}</FilterChip>
        ))}
      </div>
      <ol className="relative border-l-2 border-[#E5E1DA] ml-3 space-y-4">
        {filtered.map((ev) => {
          const style = CATEGORY_STYLE[ev.category]
          return (
            <li key={ev.id} className="ml-6 relative">
              <span className={`absolute -left-[34px] top-1 w-4 h-4 rounded-full ${style.color} ring-4 ring-white`} />
              <div className="bg-[#FAF7F2] rounded-lg p-3.5 border border-[#E5E1DA]">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Pill>{style.label}</Pill>
                    <span className="text-sm font-medium text-[#3A332A]">{ev.label}</span>
                  </div>
                  <div className="text-xs text-[#7C7466]" title={fmtDate(ev.occurredAt)}>{relativeTime(ev.occurredAt)}</div>
                </div>
                <div className="mt-2 text-xs text-[#7C7466] flex flex-wrap gap-x-3 gap-y-1">
                  <span>Zrodlo: <span className="text-[#5C5345]">{ev.source}</span></span>
                  {ev.sourceRef && <span className="inline-flex items-center gap-1">Ref: <CopyChip value={ev.sourceRef} /></span>}
                  {ev.previousValue !== undefined && ev.newValue && <span>{ev.previousValue ?? '—'} → <strong className="text-[#3A332A]">{ev.newValue}</strong></span>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? 'bg-[#3A332A] text-white' : 'bg-[#F5F1EA] text-[#5C5345] hover:bg-[#E5E1DA]'}`}>{children}</button>
  )
}

function ItemsSection({ order }: { order: OrderDetailMock }) {
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
              <th className="py-2 px-3 font-medium text-right">Suma</th>
              <th className="py-2 pl-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-[#E5E1DA] last:border-0">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#F5F1EA] flex items-center justify-center text-[#7C7466]"><Package className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <div className="font-medium text-[#3A332A] truncate max-w-[280px]">{item.name}</div>
                      {!item.mapped && <Pill tone="warn">Niezmapowana oferta</Pill>}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3"><CopyChip value={item.sku} /></td>
                <td className="py-3 px-3 text-right">{item.quantity}</td>
                <td className="py-3 px-3 text-right">{fmtMoney(item.unitPrice, order.currency)}</td>
                <td className="py-3 px-3 text-right font-medium">{fmtMoney(item.totalPrice, order.currency)}</td>
                <td className="py-3 pl-3">
                  <div className="flex flex-col gap-1">
                    {item.returnedQty > 0 && <Pill tone="warn">Zwrot {item.returnedQty}</Pill>}
                    {item.complainedQty > 0 && <Pill tone="error">Reklamacja {item.complainedQty}</Pill>}
                    {item.returnedQty === 0 && item.complainedQty === 0 && <Pill tone="success">OK</Pill>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#E5E1DA]">
        <SummaryBox label="Wartosc" value={fmtMoney(order.subtotal, order.currency)} />
        <SummaryBox label="Wysylka" value={fmtMoney(order.shippingCost, order.currency)} />
        <SummaryBox label="VAT" value={fmtMoney(order.taxAmount, order.currency)} />
        <SummaryBox label="Suma" value={fmtMoney(order.total, order.currency)} highlight />
      </div>
      <AddressBlock order={order} />
    </div>
  )
}

function AddressBlock({ order }: { order: OrderDetailMock }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
      <div className="bg-[#FAF7F2] rounded-lg p-4 border border-[#E5E1DA]">
        <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-[#7C7466]" /><span className="text-xs uppercase tracking-wide text-[#7C7466] font-medium">Adres dostawy</span></div>
        <div className="text-sm text-[#3A332A] space-y-0.5">
          <div>{order.customer.name}</div>
          <div>{order.shippingAddress.street}</div>
          <div>{order.shippingAddress.postalCode} {order.shippingAddress.city}</div>
          <div className="text-[#7C7466] text-xs">{order.shippingAddress.country}</div>
        </div>
      </div>
      {order.billingAddress && (
        <div className="bg-[#FAF7F2] rounded-lg p-4 border border-[#E5E1DA]">
          <div className="flex items-center gap-2 mb-2"><Receipt className="w-4 h-4 text-[#7C7466]" /><span className="text-xs uppercase tracking-wide text-[#7C7466] font-medium">Adres do faktury</span></div>
          <div className="text-sm text-[#3A332A] space-y-0.5">
            {order.customer.companyName && <div className="font-medium">{order.customer.companyName}</div>}
            {order.customer.nip && <div className="text-xs text-[#7C7466]">NIP: {order.customer.nip}</div>}
            <div>{order.billingAddress.street}</div>
            <div>{order.billingAddress.postalCode} {order.billingAddress.city}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-[#3A332A] text-white' : 'bg-[#FAF7F2] border border-[#E5E1DA]'}`}>
      <div className={`text-[11px] uppercase tracking-wide ${highlight ? 'text-white/60' : 'text-[#7C7466]'}`}>{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${highlight ? 'text-white' : 'text-[#3A332A]'}`}>{value}</div>
    </div>
  )
}

function PaymentSection({ order }: { order: OrderDetailMock }) {
  const refunded = parseFloat(order.refundedTotal)
  const balance = (parseFloat(order.total) - refunded).toFixed(2)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryBox label="Zaplacono" value={fmtMoney(order.total, order.currency)} />
        <SummaryBox label="Zwrocono" value={fmtMoney(order.refundedTotal, order.currency)} />
        <SummaryBox label="Do zwrotu" value={fmtMoney(balance, order.currency)} highlight />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <StatRow label="Metoda" value={<Pill>{order.paymentMethod}</Pill>} />
        <StatRow label="Status P24" value={<Pill tone="success">{order.p24Status}</Pill>} />
        <StatRow label="Oplacono" value={fmtDate(order.paidAt)} />
        <StatRow label="ID transakcji" value={<CopyChip value={order.p24TransactionId} />} mono />
        <StatRow label="ID sesji" value={<CopyChip value={order.p24SessionId} />} mono />
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-wide text-[#7C7466] font-medium mb-2">Historia obciazen i zwrotow</h4>
        <div className="space-y-2">
          {order.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg border border-[#E5E1DA]">
              <div className="flex items-center gap-3">
                <Pill tone={p.type === 'charge' ? 'success' : 'warn'}>{p.type === 'charge' ? 'Obciazenie' : 'Zwrot'}</Pill>
                <div>
                  <div className="text-sm font-medium text-[#3A332A]">{fmtMoney(p.amount, order.currency)}</div>
                  <div className="text-xs text-[#7C7466]">{fmtDate(p.date)} • {p.initiatedBy}</div>
                </div>
              </div>
              <CopyChip value={p.reference} />
            </div>
          ))}
        </div>
      </div>
      <div className="pt-3 border-t border-[#E5E1DA] flex gap-2 flex-wrap">
        <button className="px-4 py-2 text-sm bg-[#3A332A] text-white rounded-lg hover:bg-[#5C5345]">Zwroc kwote</button>
        <button className="px-4 py-2 text-sm border border-[#E5E1DA] rounded-lg hover:bg-[#F5F1EA]">Zwrot czesciowy</button>
      </div>
    </div>
  )
}

function InvoiceSection({ order }: { order: OrderDetailMock }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatRow label="Wymagana" value={<Pill tone={order.invoiceRequired ? 'info' : 'neutral'}>{order.invoiceRequired ? 'Tak' : 'Nie'}</Pill>} />
        <StatRow label="Status" value={<Pill tone={order.invoiceStatus === 'issued' ? 'success' : 'neutral'}>{order.invoiceStatus}</Pill>} />
        {order.invoiceNumber && <StatRow label="Numer" value={<CopyChip value={order.invoiceNumber} />} mono />}
        {order.customer.nip && <StatRow label="NIP" value={<CopyChip value={order.customer.nip} />} mono />}
      </div>
      {order.customer.companyName && (
        <div className="bg-[#FAF7F2] rounded-lg p-4 border border-[#E5E1DA]">
          <div className="text-xs uppercase tracking-wide text-[#7C7466] font-medium mb-2">Dane do faktury</div>
          <div className="text-sm space-y-0.5">
            <div className="font-medium">{order.customer.companyName}</div>
            <div>NIP: {order.customer.nip}</div>
            {order.billingAddress && (<><div>{order.billingAddress.street}</div><div>{order.billingAddress.postalCode} {order.billingAddress.city}</div></>)}
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button className="px-4 py-2 text-sm bg-[#3A332A] text-white rounded-lg hover:bg-[#5C5345] inline-flex items-center gap-2"><Download className="w-4 h-4" /> Pobierz PDF</button>
        <button className="px-4 py-2 text-sm border border-[#E5E1DA] rounded-lg hover:bg-[#F5F1EA]">Wyslij ponownie</button>
        <button className="px-4 py-2 text-sm border border-[#E5E1DA] rounded-lg hover:bg-[#F5F1EA]">Wystaw korekte</button>
      </div>
    </div>
  )
}

function ShippingSection({ order }: { order: OrderDetailMock }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <StatRow label="Metoda" value={order.shippingMethod} />
        {order.trackingNumber && <StatRow label="Nr przesylki" value={<CopyChip value={order.trackingNumber} />} mono />}
        {order.shippedAt && <StatRow label="Wyslano" value={fmtDate(order.shippedAt)} />}
        {order.deliveredAt && <StatRow label="Dostarczono" value={fmtDate(order.deliveredAt)} />}
      </div>
      {order.pickupPoint && (
        <div className="bg-[#FAF7F2] rounded-lg p-4 border border-[#E5E1DA]">
          <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-[#7C7466]" /><span className="text-xs uppercase tracking-wide text-[#7C7466] font-medium">Punkt odbioru</span><Pill>{order.pickupPoint.id}</Pill></div>
          <div className="text-sm text-[#3A332A]">{order.pickupPoint.address}</div>
        </div>
      )}
      <div>
        <h4 className="text-xs uppercase tracking-wide text-[#7C7466] font-medium mb-2">Paczki ({order.parcels.length})</h4>
        <div className="space-y-3">{order.parcels.map((p) => <ParcelCard key={p.waybill} parcel={p} />)}</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="px-4 py-2 text-sm bg-[#3A332A] text-white rounded-lg hover:bg-[#5C5345] inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Odswiez status</button>
        <button className="px-4 py-2 text-sm border border-[#E5E1DA] rounded-lg hover:bg-[#F5F1EA]">Generuj etykiete</button>
        <button className="px-4 py-2 text-sm border border-[#E5E1DA] rounded-lg hover:bg-[#F5F1EA]">Oznacz jako wyslane</button>
      </div>
    </div>
  )
}

function ParcelCard({ parcel }: { parcel: OrderDetailMock['parcels'][0] }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-[#E5E1DA] rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 hover:bg-[#FAF7F2] transition">
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Truck className="w-4 h-4 text-[#7C7466]" />
          <div className="text-left">
            <div className="font-mono text-sm text-[#3A332A]">{parcel.waybill}</div>
            <div className="text-xs text-[#7C7466]">{parcel.carrier} • {parcel.statusLabel}</div>
          </div>
        </div>
        <Pill tone="info">{parcel.statusCode}</Pill>
      </button>
      {expanded && (
        <ol className="border-t border-[#E5E1DA] bg-[#FAF7F2] p-3 space-y-2">
          {parcel.events.map((e, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium text-[#3A332A]">{e.label}</span>
              <span className="text-xs text-[#7C7466] ml-auto">{fmtDate(e.occurredAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function MessagesSection({ order }: { order: OrderDetailMock }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {order.messages.map((m) => {
          const out = m.direction === 'out'
          return (
            <div key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${out ? 'bg-[#3A332A] text-white' : 'bg-[#F5F1EA] text-[#3A332A]'} rounded-2xl px-4 py-2.5`}>
                <div className="text-sm">{m.body}</div>
                <div className={`text-[10px] mt-1 flex items-center gap-2 ${out ? 'text-white/60' : 'text-[#7C7466]'}`}>
                  <Pill tone={out ? 'neutral' : 'info'}>{m.channel}</Pill>
                  <span>{fmtDate(m.sentAt)}</span>
                  {!m.read && !out && <span className="text-amber-600">●</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-[#E5E1DA] pt-4">
        <textarea placeholder="Napisz wiadomosc..." rows={3} className="w-full p-3 text-sm border border-[#E5E1DA] rounded-lg focus:outline-none focus:border-[#3A332A] resize-none" />
        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <Pill>Szablon: Wyslano</Pill>
            <Pill>Szablon: Brak na stanie</Pill>
            <Pill>Szablon: Opoznienie</Pill>
          </div>
          <button className="px-4 py-2 text-sm bg-[#3A332A] text-white rounded-lg hover:bg-[#5C5345]">Wyslij</button>
        </div>
      </div>
    </div>
  )
}

function ReturnsSection({ order }: { order: OrderDetailMock }) {
  if (order.returns.length === 0) return <EmptyState icon={Undo2} title="Brak zwrotow" />
  return (
    <div className="space-y-3">
      {order.returns.map((r) => (
        <div key={r.id} className="border border-[#E5E1DA] rounded-lg overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-medium">{r.id}</span>
                <Pill tone={r.status === 'reported' ? 'warn' : r.status === 'settled' ? 'success' : 'info'}>{r.status}</Pill>
              </div>
              <div className="text-sm text-[#3A332A] font-medium">{r.reason}</div>
              <div className="text-xs text-[#7C7466] mt-1">{r.comment}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold text-[#3A332A]">{fmtMoney(r.refundAmount, order.currency)}</div>
              <div className="text-xs text-[#7C7466]">+ wysylka {fmtMoney(r.shippingRefund, order.currency)}</div>
            </div>
          </div>
          <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[#7C7466] uppercase tracking-wide mb-1">Pozycje</div>
              {r.items.map((it) => <div key={it.sku} className="text-[#3A332A]">{it.quantity}× {it.name}</div>)}
            </div>
            <div>
              <div className="text-[#7C7466] uppercase tracking-wide mb-1">Sposob zwrotu</div>
              <div className="text-[#3A332A]">{r.returnMethod}</div>
              {r.slaDeadline && <div className="text-amber-700 mt-1">Termin: {fmtDate(r.slaDeadline)}</div>}
            </div>
          </div>
          <div className="px-4 py-3 bg-[#FAF7F2] border-t border-[#E5E1DA] flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Akceptuj</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-white">Odrzuc</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-white">Zwrot czesciowy</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-white">Zatwierdz odbior</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-white">Zwroc pieniadze</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ComplaintsSection({ order }: { order: OrderDetailMock }) {
  if (order.complaints.length === 0) return <EmptyState icon={ShieldAlert} title="Brak reklamacji" />
  return (
    <div className="space-y-3">
      {order.complaints.map((c) => (
        <div key={c.id} className="border border-[#E5E1DA] rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-sm font-medium">{c.id}</span>
                <Pill tone="warn">{c.type}</Pill>
                <Pill tone={c.status === 'resolved' ? 'success' : c.status === 'open' ? 'warn' : 'info'}>{c.status}</Pill>
                {c.escalated && <Pill tone="error">Eskalacja Allegro</Pill>}
              </div>
              <div className="text-xs text-[#7C7466]">Otwarta {fmtDate(c.openedAt)} • Pochodzenie: {c.origin}</div>
            </div>
            <Pill>{c.messageCount} wiadomosci</Pill>
          </div>
          {c.proposedResolution && <div className="text-sm text-[#3A332A] bg-[#FAF7F2] rounded-md p-2 mb-2">Proponowane: {c.proposedResolution}</div>}
          {c.attachments.length > 0 && <div className="flex gap-1.5 mb-2 flex-wrap">{c.attachments.map((a) => <Pill key={a}>📎 {a}</Pill>)}</div>}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-[#E5E1DA]">
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-[#F5F1EA]">Odpowiedz</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-[#F5F1EA]">Zaakceptuj</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-[#F5F1EA]">Odrzuc</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-[#F5F1EA]">Eskaluj</button>
            <button className="px-3 py-1.5 text-xs border border-[#E5E1DA] rounded-md hover:bg-[#F5F1EA]">Zamknij</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function DisputesSection({ order }: { order: OrderDetailMock }) {
  if (order.disputes.length === 0) return <EmptyState icon={AlertTriangle} title="Brak dyskusji Allegro" hint="Dyskusje pojawia sie tu, gdy kupujacy zglosi problem." />
  return (
    <div className="space-y-3">
      {order.disputes.map((d) => (
        <div key={d.id} className="border border-[#E5E1DA] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><span className="font-mono text-sm">{d.id}</span><Pill tone="warn">{d.status}</Pill></div>
          <div className="text-sm">{d.topic}</div>
          {d.slaDeadline && <div className="text-xs text-amber-700 mt-1">Termin: {fmtDate(d.slaDeadline)}</div>}
        </div>
      ))}
    </div>
  )
}

function FeedbackSection({ order }: { order: OrderDetailMock }) {
  if (!order.feedback) return <EmptyState icon={Star} title="Brak oceny" hint="Klient nie wystawil jeszcze oceny." />
  return (
    <div className="border border-[#E5E1DA] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-5 h-5 ${i < order.feedback!.rating ? 'fill-amber-400 text-amber-400' : 'text-[#E5E1DA]'}`} />)}
        <span className="text-xs text-[#7C7466] ml-2">{fmtDate(order.feedback.at)}</span>
      </div>
      <div className="text-sm text-[#3A332A]">{order.feedback.body}</div>
      {order.feedback.reply && (
        <div className="mt-3 pt-3 border-t border-[#E5E1DA]">
          <div className="text-xs uppercase tracking-wide text-[#7C7466] mb-1">Odpowiedz sprzedawcy</div>
          <div className="text-sm">{order.feedback.reply}</div>
        </div>
      )}
    </div>
  )
}

function NotesSection({ order }: { order: OrderDetailMock }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2"><span className="text-xs uppercase tracking-wide text-[#7C7466] font-medium">Publiczne</span><Pill tone="info">widoczne dla klienta</Pill></div>
        <textarea defaultValue={order.notes} rows={3} className="w-full p-3 text-sm border border-[#E5E1DA] rounded-lg focus:outline-none focus:border-[#3A332A] resize-none" />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2"><span className="text-xs uppercase tracking-wide text-[#7C7466] font-medium">Wewnetrzne</span><Pill tone="error">tylko admin</Pill></div>
        <textarea defaultValue={order.internalNotes} rows={3} className="w-full p-3 text-sm border-2 border-red-200 bg-red-50/30 rounded-lg focus:outline-none focus:border-red-400 resize-none" />
      </div>
      <button className="px-4 py-2 text-sm bg-[#3A332A] text-white rounded-lg hover:bg-[#5C5345]">Zapisz notatki</button>
    </div>
  )
}

function AuditSection({ order }: { order: OrderDetailMock }) {
  return (
    <div className="space-y-2">
      {order.audit.map((a) => (
        <div key={a.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-lg border border-[#E5E1DA] text-sm">
          <UserIcon className="w-4 h-4 text-[#7C7466]" />
          <div className="flex-1 min-w-0">
            <div className="text-[#3A332A]"><strong>{a.actor}</strong> — {a.action}</div>
            <div className="text-xs text-[#7C7466] truncate">{a.target}</div>
          </div>
          <div className="text-xs text-[#7C7466] whitespace-nowrap">{fmtDate(a.at)}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-[#F5F1EA] flex items-center justify-center mb-3"><Icon className="w-6 h-6 text-[#7C7466]" /></div>
      <div className="text-sm font-medium text-[#3A332A]">{title}</div>
      {hint && <div className="text-xs text-[#7C7466] mt-1">{hint}</div>}
    </div>
  )
}
