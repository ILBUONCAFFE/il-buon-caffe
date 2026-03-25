'use client'

import { useState, useEffect } from 'react'
import {
  User, Mail, Phone, MapPin, Truck, Receipt, Edit,
  ShoppingBag, Store, Loader2, Package, CreditCard,
} from 'lucide-react'
import { GlassModal } from './ui/GlassModal'
import { getStatusBadge } from '../utils/getStatusBadge'
import { adminApi, ApiError } from '../lib/adminApiClient'
import type { AdminOrder, AllegroOrderDetails, AllegroTrackingData } from '../types/admin-api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
    {children}
  </p>
)

const InfoRow = ({
  icon: Icon,
  children,
  iconColor = 'text-[#A3A3A3]',
}: {
  icon: React.ElementType
  children: React.ReactNode
  iconColor?: string
}) => (
  <div className="flex items-center gap-2.5">
    <Icon size={13} className={`${iconColor} shrink-0`} />
    <span className="text-sm text-[#525252]">{children}</span>
  </div>
)

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

    adminApi.getAllegroStatus()
      .then((statusRes) => {
        if (cancelled) return
        if (!statusRes.data?.connected) return
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
        if (err instanceof ApiError && (err.status === 401 || err.status === 503)) return
        setAllegroError(
          err instanceof ApiError
            ? `Allegro API: ${err.message}`
            : 'Błąd pobierania danych z Allegro'
        )
      })
      .finally(() => { if (!cancelled) setLoadingAllegro(false) })

    return () => { cancelled = true }
  }, [order?.id, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null

  const shippingAddress =
    allegroDetails?.delivery.address ??
    order.customerData?.shippingAddress ??
    null

  const phone = allegroDetails?.buyer.phone ?? order.customerData?.phone ?? null
  const trackingNumber = allegroTracking?.waybill ?? allegroDetails?.delivery.waybill ?? order.trackingNumber ?? null
  const trackingStatus = allegroTracking?.status ?? null
  const trackingDescription = allegroTracking?.statusDescription ?? null
  const carrier = allegroTracking?.carrier ?? null

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Szczegóły zamówienia">
      <div className="space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between pb-4 border-b border-[#F0EFEC]">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-[#1A1A1A] tabular-nums">
                {order.orderNumber}
              </h3>
              {order.source === 'allegro' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#FF5A00]/8 text-[#EA580C]">
                  <ShoppingBag size={10} /> Allegro
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#0066CC]/8 text-[#0066CC]">
                  <Store size={10} /> Sklep
                </span>
              )}
            </div>
            <p className="text-xs text-[#A3A3A3] mt-1">
              {formatDate(order.paidAt ?? order.createdAt)}
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        {/* Allegro loading indicator */}
        {loadingAllegro && (
          <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
            <Loader2 size={12} className="animate-spin" />
            Pobieranie danych z Allegro…
          </div>
        )}
        {allegroError && (
          <p className="text-xs text-[#DC2626]">{allegroError}</p>
        )}

        {/* ── Customer + Delivery grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Customer */}
          <div>
            <SectionLabel>Klient</SectionLabel>
            <div className="space-y-2">
              <InfoRow icon={User}>
                <span className="font-medium text-[#1A1A1A]">
                  {order.customerData?.name || '—'}
                </span>
              </InfoRow>
              <InfoRow icon={Mail}>
                {order.customerData?.email || '—'}
              </InfoRow>
              {phone && <InfoRow icon={Phone}>{phone}</InfoRow>}
              {allegroDetails?.buyer.login && (
                <InfoRow icon={ShoppingBag} iconColor="text-[#EA580C]">
                  <span className="text-xs">Login: {allegroDetails.buyer.login}</span>
                </InfoRow>
              )}
              {order.externalId && !allegroDetails?.buyer.login && (
                <InfoRow icon={ShoppingBag} iconColor="text-[#EA580C]">
                  <span className="text-xs font-mono">ID: {order.externalId}</span>
                </InfoRow>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div>
            <SectionLabel>Dostawa</SectionLabel>
            <div className="space-y-2">
              {loadingAllegro && !shippingAddress ? (
                <div className="h-16 bg-[#F5F4F1] rounded-lg animate-pulse" />
              ) : shippingAddress ? (
                <div className="flex items-start gap-2.5">
                  <MapPin size={13} className="text-[#A3A3A3] mt-0.5 shrink-0" />
                  <div className="text-sm text-[#525252]">
                    <p className="font-medium text-[#1A1A1A]">{shippingAddress.name}</p>
                    <p>{shippingAddress.street}</p>
                    <p>{shippingAddress.postalCode} {shippingAddress.city}</p>
                    {shippingAddress.phone && (
                      <p className="text-[#A3A3A3] mt-0.5">{shippingAddress.phone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#A3A3A3]">Brak danych adresowych</p>
              )}
              {(allegroDetails?.delivery.methodName ?? order.shippingMethod) && (
                <InfoRow icon={Truck}>
                  <span className="text-xs text-[#737373]">
                    {allegroDetails?.delivery.methodName ?? order.shippingMethod}
                  </span>
                </InfoRow>
              )}
            </div>
          </div>
        </div>

        {/* ── Tracking ───────────────────────────────────────────────── */}
        {(trackingNumber || (order.source === 'allegro' && loadingAllegro)) && (
          <div>
            <SectionLabel>Śledzenie przesyłki</SectionLabel>
            {loadingAllegro && !trackingNumber ? (
              <div className="h-8 bg-[#F5F4F1] rounded-lg animate-pulse" />
            ) : trackingNumber ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-semibold text-[#1A1A1A]">
                    {trackingNumber}
                  </span>
                  {carrier && (
                    <span className="text-[11px] text-[#737373] bg-[#F5F4F1] px-2 py-0.5 rounded-full">
                      {carrier}
                    </span>
                  )}
                </div>
                {trackingStatus && (
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        trackingStatus.toUpperCase().includes('DELIVER') ||
                        trackingStatus.toUpperCase().includes('DOSTAR')
                          ? 'bg-[#059669]'
                          : 'bg-[#0066CC]'
                      }`}
                    />
                    <span className="font-medium text-[#1A1A1A]">{trackingStatus}</span>
                  </div>
                )}
                {trackingDescription && (
                  <p className="text-xs text-[#737373] ml-3.5">{trackingDescription}</p>
                )}
                {allegroTracking?.allStatuses && allegroTracking.allStatuses.length > 1 && (
                  <details className="mt-1">
                    <summary className="text-xs text-[#0066CC] cursor-pointer hover:underline">
                      Historia ({allegroTracking.allStatuses.length} zdarzeń)
                    </summary>
                    <div className="mt-2 ml-1 space-y-1.5 border-l-2 border-[#F0EFEC] pl-3">
                      {allegroTracking.allStatuses.map((s, i) => (
                        <div key={i} className="text-xs text-[#525252]">
                          <span className="font-medium">{s.status}</span>
                          {s.description && (
                            <span className="text-[#737373]"> — {s.description}</span>
                          )}
                          {s.occurredAt && (
                            <span className="text-[#A3A3A3] ml-1">
                              {new Date(s.occurredAt).toLocaleString('pl-PL', {
                                timeZone: 'Europe/Warsaw',
                              })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Products ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Produkty</SectionLabel>
          <div className="rounded-xl border border-[#E5E4E1] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#F0EFEC]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider w-16">
                    Szt.
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                    Suma
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F4F1]">
                {order.items?.length > 0 ? (
                  order.items.map((item, idx) => (
                    <tr key={item.productSku ? `${item.productSku}-${idx}` : idx}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1A1A1A]">{item.productName}</p>
                        <p className="text-[11px] text-[#A3A3A3] mt-0.5">
                          {item.productSku} · {Number(item.unitPrice).toFixed(2)} zł/szt
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-[#525252] tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1A1A1A] font-mono tabular-nums">
                        {Number(item.totalPrice).toFixed(2)} zł
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-[#A3A3A3]">
                      Brak pozycji
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAFAF9] border-t border-[#E5E4E1]">
                  <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium text-[#525252]">
                    Razem
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#1A1A1A] font-mono tabular-nums">
                    {Number(order.total).toFixed(2)} zł
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Payment ────────────────────────────────────────────────── */}
        {order.paymentMethod && (
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-[#FAFAF9] border border-[#F0EFEC]">
            <CreditCard size={15} className="text-[#059669] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A]">{order.paymentMethod}</p>
            </div>
            {getStatusBadge(order.status)}
          </div>
        )}

        {/* ── Notes ──────────────────────────────────────────────────── */}
        {order.notes && (
          <div className="py-3 px-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]/60">
            <p className="text-[11px] font-semibold text-[#92400E] uppercase tracking-wider mb-1">
              Uwagi
            </p>
            <p className="text-sm text-[#78350F]">{order.notes}</p>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div className="flex gap-2 pt-4 border-t border-[#F0EFEC]">
          <button className="flex-1 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors flex items-center justify-center gap-2">
            <Edit size={14} /> Edytuj
          </button>
          <button className="flex-1 px-4 py-2.5 bg-white border border-[#E5E4E1] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#F5F4F1] transition-colors flex items-center justify-center gap-2">
            <Truck size={14} /> Nadaj
          </button>
          <button className="px-4 py-2.5 bg-white border border-[#E5E4E1] text-[#525252] rounded-xl text-sm font-medium hover:bg-[#F5F4F1] transition-colors flex items-center justify-center gap-2">
            <Receipt size={14} /> Faktura
          </button>
        </div>

      </div>
    </GlassModal>
  )
}
