'use client'

import { useState, useEffect } from 'react'
import {
  Package, User, Mail, Phone, MapPin, Truck, Receipt, Edit,
  ShoppingBag, Store, Loader2,
} from 'lucide-react'
import { CreditCard as CreditCardIcon } from 'lucide-react'
import { GlassModal } from './ui/GlassModal'
import { getStatusBadge } from '../utils/getStatusBadge'
import { adminApi, ApiError } from '../lib/adminApiClient'
import type { AdminOrder, AllegroOrderDetails, AllegroTrackingData } from '../types/admin-api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const SourceBadge = ({ source }: { source: string }) =>
  source === 'allegro' ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#FF5A00]/10 text-[#FF5A00]">
      <ShoppingBag size={10} /> Allegro
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#0066CC]/10 text-[#0066CC]">
      <Store size={10} /> Sklep
    </span>
  )

// ── TrackingStatusDot ─────────────────────────────────────────────────────────

function TrackingStatusDot({ status }: { status: string }) {
  const delivered = status.toUpperCase().includes('DELIVER') || status.toUpperCase().includes('DOSTAR')
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${delivered ? 'bg-[#059669]' : 'bg-[#0066CC]'}`} />
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  order: AdminOrder | null
  isOpen: boolean
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderDetailModal({ order, isOpen, onClose }: Props) {
  const [allegroDetails, setAllegroDetails] = useState<AllegroOrderDetails | null>(null)
  const [allegroTracking, setAllegroTracking] = useState<AllegroTrackingData | null>(null)
  const [loadingAllegro, setLoadingAllegro] = useState(false)
  const [allegroError, setAllegroError] = useState<string | null>(null)

  // Fetch live Allegro data whenever an Allegro order is opened
  useEffect(() => {
    if (!order || !isOpen) {
      setAllegroDetails(null)
      setAllegroTracking(null)
      setAllegroError(null)
      return
    }
    if (order.source !== 'allegro' || !order.externalId) return

    let cancelled = false
    setLoadingAllegro(true)
    setAllegroError(null)

    // Check Allegro connection status first to avoid unnecessary 503s
    adminApi.getAllegroStatus()
      .then((statusRes) => {
        if (cancelled) return
        if (!statusRes.data?.connected) return // Allegro not connected — skip silently
        return Promise.all([
          adminApi.getAllegroOrderDetails(order.externalId!),
          adminApi.getAllegroOrderTracking(order.externalId!).catch(() => null),
        ]).then(([detailsRes, trackingRes]) => {
          if (cancelled) return
          setAllegroDetails(detailsRes.data)
          if (trackingRes?.data) setAllegroTracking(trackingRes.data)
        })
      })
      .catch((err) => {
        if (cancelled) return
        // 401/503 = Allegro not connected or token expired — degrade silently
        if (err instanceof ApiError && (err.status === 401 || err.status === 503)) return
        const msg = err instanceof ApiError
          ? `Allegro API: ${err.message}`
          : 'Błąd pobierania danych z Allegro'
        setAllegroError(msg)
      })
      .finally(() => { if (!cancelled) setLoadingAllegro(false) })

    return () => { cancelled = true }
  }, [order?.id, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null

  // Resolve address: fresh Allegro address > DB customerData.shippingAddress
  const shippingAddress =
    allegroDetails?.delivery.address ??
    order.customerData?.shippingAddress ??
    null

  // Resolve phone: Allegro buyer phone > DB customerData.phone
  const phone = allegroDetails?.buyer.phone ?? order.customerData?.phone ?? null

  // Resolve tracking: Allegro waybill > DB trackingNumber
  const trackingNumber = allegroTracking?.waybill ?? allegroDetails?.delivery.waybill ?? order.trackingNumber ?? null
  const trackingStatus = allegroTracking?.status ?? null
  const trackingDescription = allegroTracking?.statusDescription ?? null
  const carrier = allegroTracking?.carrier ?? null

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Szczegóły zamówienia">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E4E1]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5F4F1] flex items-center justify-center border border-[#E5E4E1] shrink-0">
              <Package size={22} className="text-[#525252]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A]">{order.orderNumber}</h3>
              <p className="text-sm text-[#737373]">{formatDate(order.paidAt ?? order.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SourceBadge source={order.source} />
            {getStatusBadge(order.status)}
          </div>
        </div>

        {/* Allegro loading / error banner */}
        {loadingAllegro && (
          <div className="flex items-center gap-2 text-xs text-[#737373] px-1">
            <Loader2 size={13} className="animate-spin shrink-0" />
            Pobieranie danych z Allegro…
          </div>
        )}
        {allegroError && (
          <p className="text-xs text-[#DC2626] px-1">{allegroError}</p>
        )}

        {/* Customer + Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Customer */}
          <div>
            <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Klient</p>
            <div className="bg-[#FAFAF9] border border-[#E5E4E1] rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <User size={14} className="text-[#A3A3A3] shrink-0" />
                <span className="text-sm font-medium text-[#1A1A1A]">{order.customerData?.name || '—'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="text-[#A3A3A3] shrink-0" />
                <span className="text-sm text-[#525252] truncate">{order.customerData?.email || '—'}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#A3A3A3] shrink-0" />
                  <span className="text-sm text-[#525252]">{phone}</span>
                </div>
              )}
              {allegroDetails?.buyer.login && (
                <div className="flex items-center gap-2.5">
                  <ShoppingBag size={14} className="text-[#FF5A00] shrink-0" />
                  <span className="text-xs text-[#737373]">Login: {allegroDetails.buyer.login}</span>
                </div>
              )}
              {order.externalId && !allegroDetails?.buyer.login && (
                <div className="flex items-center gap-2.5">
                  <ShoppingBag size={14} className="text-[#FF5A00] shrink-0" />
                  <span className="text-xs font-mono text-[#737373] truncate">ID: {order.externalId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div>
            <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Dostawa</p>
            <div className="bg-[#FAFAF9] border border-[#E5E4E1] rounded-xl p-3 space-y-2">
              {loadingAllegro && !shippingAddress ? (
                <div className="h-16 bg-[#F0EFED] rounded-lg animate-pulse" />
              ) : shippingAddress ? (
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-[#A3A3A3] mt-0.5 shrink-0" />
                  <div className="text-sm text-[#525252]">
                    <p className="font-medium text-[#1A1A1A]">{shippingAddress.name}</p>
                    <p>{shippingAddress.street}</p>
                    <p>{shippingAddress.postalCode} {shippingAddress.city}</p>
                    <p className="text-[#A3A3A3]">{shippingAddress.country}</p>
                    {shippingAddress.phone && (
                      <p className="mt-1 text-[#737373]">{shippingAddress.phone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#A3A3A3]">Brak danych adresowych</p>
              )}
              {(allegroDetails?.delivery.methodName ?? order.shippingMethod) && (
                <div className="flex items-center gap-2.5 pt-1">
                  <Truck size={13} className="text-[#A3A3A3] shrink-0" />
                  <span className="text-xs text-[#737373]">
                    {allegroDetails?.delivery.methodName ?? order.shippingMethod}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracking */}
        {(trackingNumber || (order.source === 'allegro' && loadingAllegro)) && (
          <div>
            <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Śledzenie przesyłki</p>
            <div className="bg-[#FAFAF9] border border-[#E5E4E1] rounded-xl p-3 space-y-2">
              {loadingAllegro && !trackingNumber ? (
                <div className="h-8 bg-[#F0EFED] rounded-lg animate-pulse" />
              ) : trackingNumber ? (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Truck size={14} className="text-[#A3A3A3] shrink-0" />
                    <span className="text-sm font-mono font-semibold text-[#1A1A1A]">{trackingNumber}</span>
                    {carrier && (
                      <span className="text-xs text-[#737373] bg-[#F0EFED] px-2 py-0.5 rounded-full">{carrier}</span>
                    )}
                  </div>
                  {trackingStatus && (
                    <div className="flex items-center gap-2.5">
                      <TrackingStatusDot status={trackingStatus} />
                      <span className="text-sm font-medium text-[#1A1A1A]">{trackingStatus}</span>
                    </div>
                  )}
                  {trackingDescription && (
                    <p className="text-xs text-[#737373] ml-4">{trackingDescription}</p>
                  )}
                  {allegroTracking?.allStatuses && allegroTracking.allStatuses.length > 1 && (
                    <details className="mt-1">
                      <summary className="text-xs text-[#0066CC] cursor-pointer hover:underline ml-4">
                        Historia ({allegroTracking.allStatuses.length} zdarzeń)
                      </summary>
                      <div className="mt-2 ml-4 space-y-1.5 border-l border-[#E5E4E1] pl-3">
                        {allegroTracking.allStatuses.map((s, i) => (
                          <div key={i} className="text-xs text-[#525252]">
                            <span className="font-medium">{s.status}</span>
                            {s.description && <span className="text-[#737373]"> — {s.description}</span>}
                            {s.occurredAt && (
                              <span className="text-[#A3A3A3] ml-1">
                                {new Date(s.occurredAt).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Produkty</p>
          <div className="border border-[#E5E4E1] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF9] border-b border-[#E5E4E1]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#A3A3A3]">Produkt</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-[#A3A3A3]">Ilość</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[#A3A3A3]">Suma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFED]">
                {order.items?.length > 0 ? order.items.map((item, idx) => (
                  <tr key={item.productSku ? `${item.productSku}-${idx}` : idx}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1A1A1A]">{item.productName}</div>
                      <div className="text-xs text-[#A3A3A3]">
                        SKU: {item.productSku} · {Number(item.unitPrice).toFixed(2)} zł/szt
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[#525252] font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A] font-mono">
                      {Number(item.totalPrice).toFixed(2)} zł
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-[#A3A3A3]">Brak pozycji</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAFAF9] border-t border-[#E5E4E1]">
                  <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-[#525252]">Razem:</td>
                  <td className="px-4 py-3 text-right font-bold text-[#1A1A1A] font-mono">
                    {Number(order.total).toFixed(2)} zł
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment */}
        {order.paymentMethod && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#059669] shrink-0">
              <CreditCardIcon size={17} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#065F46]">Metoda płatności</p>
              <p className="text-sm font-semibold text-[#047857]">{order.paymentMethod}</p>
            </div>
            {getStatusBadge(order.status)}
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
            <p className="text-xs font-semibold text-[#92400E] mb-1">Uwagi</p>
            <p className="text-sm text-[#78350F]">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E5E4E1]">
          <button className="flex-1 min-w-[120px] px-4 py-2.5 bg-[#0066CC] text-white rounded-xl text-sm font-medium hover:bg-[#0052A3] transition-colors flex items-center justify-center gap-2">
            <Edit size={15} /> Edytuj
          </button>
          <button className="flex-1 min-w-[120px] px-4 py-2.5 bg-white border border-[#E5E4E1] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#F5F4F1] transition-colors flex items-center justify-center gap-2">
            <Truck size={15} /> Nadaj przesyłkę
          </button>
          <button className="px-4 py-2.5 bg-white border border-[#E5E4E1] text-[#525252] rounded-xl text-sm font-medium hover:bg-[#F5F4F1] transition-colors flex items-center justify-center gap-2">
            <Receipt size={15} /> Faktura
          </button>
        </div>

      </div>
    </GlassModal>
  )
}
