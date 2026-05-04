'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  X, RefreshCw, Loader2, Copy, Check, Mail, Phone, AtSign,
  ExternalLink, FileText, AlertTriangle, Package, CreditCard, Banknote,
  Building2,
} from 'lucide-react'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import { AllegroLogoBadge } from './AllegroLogoBadge'
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
  REFUND_REJECTED:   'Zwrot środków odrzucony',
  NEW_ITEM_SENT:     'Wysłano nowy towar',
  ITEM_FIXED:        'Towar naprawiony',
  MISSING_PART_SENT: 'Wysłano brakującą część',
}

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
function fmtDate(iso?: string | null) { return iso ? dateFmt.format(new Date(iso)) : '—' }

const SYM: Record<string, string> = { PLN: 'zł', EUR: '€', CZK: 'Kč', HUF: 'Ft' }
function fmtAmount(v?: number | null, c = 'PLN') {
  if (v == null) return '—'
  return `${Number(v).toFixed(2)} ${SYM[c] ?? c}`
}

function CopyChip({ value, label, mono = true }: { value?: string | number | null; label?: string; mono?: boolean }) {
  const text = value == null || value === '' ? '' : String(value)
  const [copied, setCopied] = useState(false)
  if (!text) return <span className="text-stone-400">—</span>
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1100)
      }}
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
      <div className="text-[11px] uppercase tracking-[0.06em] text-stone-500 w-[110px] flex-shrink-0">{label}</div>
      <div className={`flex-1 min-w-0 break-words text-stone-900 ${mono ? 'font-mono tabular-nums text-[13px]' : ''}`}>{value}</div>
    </div>
  )
}

function KpiCell({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  const cls =
    tone === 'ok'     ? 'text-emerald-700' :
    tone === 'warn'   ? 'text-amber-700' :
    tone === 'danger' ? 'text-red-700' :
                        'text-stone-900'
  return (
    <div className="px-4 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-stone-500 font-semibold mb-0.5">{label}</div>
      <div className={`text-[14px] font-semibold tabular-nums truncate ${cls}`}>{value}</div>
      {sub != null && <div className="text-[10.5px] text-stone-500 truncate mt-0.5">{sub}</div>}
    </div>
  )
}

export function ReturnDetailModal({
  ret, isOpen, onClose, onChangeStatus, onApprove, onReject, onRefund, onRefreshReturn,
}: ReturnDetailModalProps) {
  const [refreshing, setRefreshing] = useState(false)

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

  useEffect(() => {
    if (!isOpen) setRefreshing(false)
  }, [isOpen])

  if (!isOpen || !ret) return null

  const isAllegro     = ret.source === 'allegro'
  const allegroStatus = ret.allegro?.status
  const canApprove    = isAllegro ? ret.status === 'approved' : ret.status === 'new' || ret.status === 'in_review'
  const canReject     = ret.status === 'new' || ret.status === 'in_review' || ret.status === 'approved'
  const canRefund     = !isAllegro && ret.status === 'approved'
  const bankAccount   = ret.customerData?.bankAccount
  const parcels       = ret.allegro?.parcels ?? []
  const refunds       = ret.refunds ?? []

  const itemsQty = ret.items.reduce((s, i) => s + Number(i.quantity || 0), 0)

  const handleRefresh = async () => {
    if (!onRefreshReturn || refreshing) return
    setRefreshing(true)
    try {
      await Promise.resolve(onRefreshReturn(ret))
    } finally {
      setRefreshing(false)
    }
  }

  return (
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
                <span>Zwrot</span>
                <span className="font-mono tabular-nums">#{ret.returnNumber}</span>
              </h2>
              <span className="h-5 w-px bg-stone-200" />
              <ReturnStatusBadge status={ret.status} />
              {isAllegro ? (
                <AllegroLogoBadge size="md" />
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-stone-200 bg-stone-50 text-stone-700 text-[11px] font-bold uppercase tracking-wide">
                  Sklep
                </span>
              )}
              {isAllegro && allegroStatus && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-sky-200 bg-sky-50 text-sky-800 text-[11px] font-medium">
                  {ALLEGRO_STATUS_LABELS[allegroStatus] ?? allegroStatus}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[12px] text-stone-500 tabular-nums hidden sm:inline mr-2">{fmtDate(ret.createdAt)}</span>
              {isAllegro && onRefreshReturn && (
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-2.5 h-8 text-[12.5px] font-medium text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 hover:border-stone-400 rounded-sm transition disabled:opacity-60"
                  title="Odśwież z Allegro"
                >
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Odśwież</span>
                </button>
              )}
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
              label="Kwota zwrotu"
              value={
                ret.totalRefundAmount == null ? (
                  <span className="text-stone-400">—</span>
                ) : (
                  <>{Number(ret.totalRefundAmount).toFixed(2)} <span className="text-stone-500 text-[11px] font-normal">{ret.currency}</span></>
                )
              }
              sub={refunds.length > 0 ? `${refunds.length} ${refunds.length === 1 ? 'zwrot' : 'zwroty'}` : null}
              tone={ret.status === 'refunded' ? 'ok' : undefined}
            />
            <KpiCell
              label="Pozycje"
              value={`${itemsQty}`}
              sub={`${ret.items.length} sku`}
            />
            <KpiCell
              label="Powód"
              value={REASON_LABELS[ret.reason] ?? ret.reason}
              sub={ret.reasonNote ? 'z komentarzem' : null}
            />
            <KpiCell
              label="Zamówienie"
              value={ret.orderNumber}
              sub={fmtDate(ret.createdAt)}
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
                <SectionTitle>Pozycje do zwrotu</SectionTitle>
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
                      {ret.items.map((item, i) => (
                        <tr key={`${item.productSku}-${i}`} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                          <td className="px-3 py-2 align-middle">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] text-stone-500 w-5 text-right tabular-nums flex-shrink-0">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <div className="min-w-0">
                                <div className="text-[13px] text-stone-900 truncate" title={item.productName}>{item.productName}</div>
                                <div className="text-[11px] text-stone-500"><CopyChip value={item.productSku} /></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-mono tabular-nums text-[13px] text-stone-900">{item.quantity}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-mono tabular-nums text-[13px] text-stone-700">{Number(item.unitPrice ?? 0).toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-mono tabular-nums text-[13px] text-stone-900 font-medium">{Number(item.totalPrice ?? 0).toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {ret.totalRefundAmount != null && (
                      <tfoot>
                        <tr className="bg-stone-900 text-white">
                          <td className="px-3 py-2 uppercase tracking-[0.1em] text-[11px] font-semibold">Kwota zwrotu</td>
                          <td colSpan={2} />
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-[14px] font-semibold">
                            {Number(ret.totalRefundAmount).toFixed(2)} <span className="text-stone-300 text-[11px] font-normal">{ret.currency}</span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </Panel>
              </div>

              {/* Reason */}
              <div>
                <SectionTitle>Powód zwrotu</SectionTitle>
                <Panel>
                  <InfoRow label="Kategoria" value={REASON_LABELS[ret.reason] ?? ret.reason} />
                  {ret.reasonNote && (
                    <div className="px-3 py-2.5 border-t border-stone-100 bg-amber-50/60">
                      <div className="text-[10.5px] uppercase tracking-[0.14em] text-amber-800 font-semibold mb-1">Komentarz klienta</div>
                      <div className="text-[13px] text-amber-900 whitespace-pre-wrap leading-snug">{ret.reasonNote}</div>
                    </div>
                  )}
                </Panel>
              </div>

              {/* Allegro rejection */}
              {ret.allegro?.rejection && (
                <div>
                  <SectionTitle>Odmowa zwrotu</SectionTitle>
                  <Panel className="border-red-200 bg-red-50/40">
                    <div className="px-3 py-2.5 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-red-900">
                          {REJECTION_LABELS[ret.allegro.rejection.code] ?? ret.allegro.rejection.code}
                        </div>
                        {ret.allegro.rejection.reason && (
                          <div className="text-[12.5px] text-red-800 mt-1 leading-snug">{ret.allegro.rejection.reason}</div>
                        )}
                        <div className="text-[11px] text-red-700 mt-1 tabular-nums">{fmtDate(ret.allegro.rejection.createdAt)}</div>
                      </div>
                    </div>
                  </Panel>
                </div>
              )}

              {/* Parcels */}
              {parcels.length > 0 && (
                <div>
                  <SectionTitle>{parcels.length > 1 ? `Przesyłki zwrotne · ${parcels.length}` : 'Przesyłka zwrotna'}</SectionTitle>
                  <div className="space-y-2">
                    {parcels.map((parcel, index) => {
                      const carrier = parcel.carrierId ?? parcel.transportingCarrierId ?? null
                      const number  = parcel.trackingNumber || parcel.waybill || null
                      return (
                        <Panel key={`${number ?? 'p'}-${index}`} className="overflow-hidden">
                          <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
                            <Package className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                            <span className="font-mono tabular-nums text-[10.5px] text-stone-500 flex-shrink-0">#{index + 1}</span>
                            {number ? (
                              <CopyChip value={number} />
                            ) : (
                              <span className="text-[12px] text-stone-500">Brak numeru listu</span>
                            )}
                            {carrier && (
                              <span className="ml-auto inline-flex items-center text-[10.5px] font-medium text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-sm">
                                {carrier}
                              </span>
                            )}
                          </div>
                          {(parcel.transportingWaybill || parcel.sender || parcel.createdAt) && (
                            <div className="px-3 py-1.5 border-t border-stone-100 bg-stone-50/40 text-[11.5px] text-stone-600 flex flex-wrap gap-x-3 gap-y-0.5">
                              {parcel.transportingWaybill && (
                                <span><span className="text-stone-500">Przewoźnik fizyczny:</span> {parcel.transportingWaybill}</span>
                              )}
                              {parcel.sender && (
                                <span><span className="text-stone-500">Tel. nadawcy:</span> {parcel.sender}</span>
                              )}
                              {parcel.createdAt && (
                                <span className="ml-auto tabular-nums text-stone-500">Utworzono: {fmtDate(parcel.createdAt)}</span>
                              )}
                            </div>
                          )}
                        </Panel>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Refunds */}
              {refunds.length > 0 && (
                <div>
                  <SectionTitle>Zwroty płatności</SectionTitle>
                  <Panel className="overflow-hidden">
                    <table className="w-full border-collapse">
                      <colgroup>
                        <col />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-stone-50/70 border-b border-stone-200 text-[10.5px] uppercase tracking-[0.1em] text-stone-500 font-semibold">
                          <th className="px-3 py-2 text-left">Metoda / data</th>
                          <th className="px-3 py-2 text-right">Kwota</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refunds.map((r) => (
                          <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                            <td className="px-3 py-2 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
                                <CreditCard className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[13px] text-stone-900 truncate">{r.method}</div>
                                  <div className="text-[11px] text-stone-500 tabular-nums">{fmtDate(r.createdAt)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-mono tabular-nums text-[13px] font-semibold text-stone-900">
                                {fmtAmount(r.amount, ret.currency)}
                              </span>
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-stone-200 bg-stone-50 text-stone-700 text-[11px] font-medium">
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <div className="text-[14px] font-semibold text-stone-900 truncate">{ret.customerData?.name ?? '—'}</div>
                  {isAllegro && ret.allegro?.referenceNumber && (
                    <div className="text-[12px] text-stone-500 mt-0.5 inline-flex items-center gap-1 font-mono">
                      <AtSign className="w-3 h-3" /> {ret.allegro.referenceNumber}
                    </div>
                  )}
                </div>
                <div>
                  {ret.customerData?.email && (
                    <InfoRow label="E-mail" value={
                      <a href={`mailto:${ret.customerData.email}`} className="inline-flex items-center gap-1 text-stone-900 hover:underline">
                        <Mail className="w-3 h-3 text-stone-500" /> {ret.customerData.email}
                      </a>
                    } />
                  )}
                  {ret.customerData?.phone && (
                    <InfoRow label="Telefon" value={
                      <a href={`tel:${ret.customerData.phone}`} className="inline-flex items-center gap-1 text-stone-900 hover:underline">
                        <Phone className="w-3 h-3 text-stone-500" /> {ret.customerData.phone}
                      </a>
                    } />
                  )}
                  <InfoRow label="Numer zwrotu" mono value={<CopyChip value={ret.returnNumber} />} />
                  <InfoRow label="Zamówienie" mono value={<CopyChip value={ret.orderNumber} />} />
                  {isAllegro && ret.allegro?.customerReturnId && (
                    <InfoRow label="Allegro ID" mono value={<CopyChip value={ret.allegro.customerReturnId} />} />
                  )}
                  <InfoRow label="Zgłoszono" mono value={fmtDate(ret.createdAt)} />
                  <InfoRow label="Aktualizacja" mono value={fmtDate(ret.updatedAt)} />
                </div>
              </Panel>

              {bankAccount && (bankAccount.iban || bankAccount.accountNumber || bankAccount.owner) && (
                <Panel>
                  <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-stone-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Dane do zwrotu</span>
                  </div>
                  <div>
                    {bankAccount.owner && <InfoRow label="Odbiorca" value={bankAccount.owner} />}
                    {(bankAccount.iban || bankAccount.accountNumber) && (
                      <InfoRow label="Rachunek" mono value={<CopyChip value={bankAccount.iban ?? bankAccount.accountNumber} />} />
                    )}
                    {bankAccount.swift && <InfoRow label="SWIFT" mono value={<CopyChip value={bankAccount.swift} />} />}
                  </div>
                </Panel>
              )}

              {ret.restockApplied && (
                <Panel className="border-emerald-200 bg-emerald-50/40">
                  <div className="px-3 py-2 flex items-center gap-2 text-[12px] text-emerald-900">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    Produkt przywrócony na stan
                  </div>
                </Panel>
              )}

              {isAllegro && ret.allegro?.customerReturnId && (
                <a
                  href={`https://allegro.pl/moje-allegro/sprzedaz/zwroty/${ret.allegro.customerReturnId}`}
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
              {canReject && (onReject || onChangeStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 h-8 text-[12.5px] font-medium text-red-700 hover:text-red-900 hover:bg-red-50 rounded-sm transition"
                  onClick={() => {
                    if (onReject) { onReject(ret); onClose() }
                    else if (onChangeStatus) { onChangeStatus(ret, 'rejected'); onClose() }
                  }}
                >
                  Odrzuć zwrot
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canApprove && (onApprove || onChangeStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 rounded-sm transition"
                  onClick={() => {
                    if (onApprove) { onApprove(ret); onClose() }
                    else if (onChangeStatus) { onChangeStatus(ret, 'approved'); onClose() }
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  {isAllegro ? 'Zleć zwrot środków' : 'Zaakceptuj'}
                </button>
              )}
              {canRefund && (onRefund || onChangeStatus) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium bg-stone-900 text-white hover:bg-black rounded-sm transition"
                  onClick={() => {
                    if (onRefund) { onRefund(ret); onClose() }
                    else if (onChangeStatus) { onChangeStatus(ret, 'refunded'); onClose() }
                  }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Potwierdź zwrot pieniędzy
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
