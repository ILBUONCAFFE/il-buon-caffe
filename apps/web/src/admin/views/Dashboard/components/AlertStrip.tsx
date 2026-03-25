'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Link2Off, XCircle } from 'lucide-react'
import { useDashboardOverview, useAllegroStatus } from '../../../hooks/useDashboard'

export const AlertStrip = () => {
  const { overview, loading: overviewLoading } = useDashboardOverview()
  const { allegroStatus, loading: allegroLoading } = useAllegroStatus()

  const lowStock = overview?.stats.lowStockProducts ?? 0
  const isConnected = allegroStatus?.connected && allegroStatus?.tokenValid
  const isExpired = allegroStatus?.connected && !allegroStatus?.tokenValid
  const isLoading = overviewLoading || allegroLoading

  if (isLoading) {
    return (
      <div className="flex gap-3 mb-8">
        <div className="h-10 flex-1 rounded-xl bg-[#E5E4E1] animate-pulse" />
        <div className="h-10 w-48 rounded-xl bg-[#E5E4E1] animate-pulse" />
      </div>
    )
  }

  const hasWarnings = lowStock > 0 || isExpired || !allegroStatus?.connected

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      {/* Low stock alert */}
      {lowStock > 0 ? (
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FEF3C7] text-[#92400E] text-sm font-medium hover:bg-[#FDE68A] transition-colors"
        >
          <AlertTriangle size={14} />
          <span>{lowStock} {lowStock === 1 ? 'produkt' : lowStock < 5 ? 'produkty' : 'produktów'} z niskim stanem</span>
        </Link>
      ) : (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F4F1] text-[#525252] text-sm">
          <CheckCircle2 size={14} className="text-[#059669]" />
          <span>Stan magazynowy OK</span>
        </div>
      )}

      {/* Allegro status */}
      {isConnected ? (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F4F1] text-[#525252] text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
          <span>Allegro połączone</span>
        </div>
      ) : isExpired ? (
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FEF2F2] text-[#991B1B] text-sm font-medium hover:bg-[#FEE2E2] transition-colors"
        >
          <XCircle size={14} />
          <span>Token Allegro wygasł</span>
        </Link>
      ) : (
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F4F1] text-[#737373] text-sm hover:bg-[#EEEDEA] transition-colors"
        >
          <Link2Off size={14} />
          <span>Allegro niepołączone</span>
        </Link>
      )}

      {/* Pending orders */}
      {(overview?.stats.ordersPending ?? 0) > 0 && (
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EFF6FF] text-[#1E40AF] text-sm font-medium hover:bg-[#DBEAFE] transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066CC]" />
          <span>{overview?.stats.ordersPending} {(overview?.stats.ordersPending ?? 0) === 1 ? 'zamówienie' : 'zamówień'} do realizacji</span>
        </Link>
      )}

      {/* All clear message */}
      {!hasWarnings && (overview?.stats.ordersPending ?? 0) === 0 && (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ECFDF5] text-[#065F46] text-sm">
          <CheckCircle2 size={14} />
          <span>Wszystko sprawne</span>
        </div>
      )}
    </div>
  )
}
