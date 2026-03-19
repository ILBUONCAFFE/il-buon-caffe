'use client'

import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Link2Off, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { OrganicIcon } from '../../../components/ui/OrganicIcon'
import { useAllegroStatus } from '../../../hooks/useDashboard'

function tokenExpiresIn(expiresAt: string | null): string {
  if (!expiresAt) return '—'
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Wygasł'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}

export const AllegroStatusCard = () => {
  const { allegroStatus: status, loading, refetch } = useAllegroStatus()

  const isConnected  = status?.connected && status?.tokenValid
  const isExpired    = status?.connected && !status?.tokenValid

  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <OrganicIcon
            icon={isConnected ? CheckCircle2 : Link2Off}
            bgColor={isConnected ? 'bg-[#ECFDF5]' : isExpired ? 'bg-[#FEF2F2]' : 'bg-[#737373]/10'}
            iconColor={isConnected ? 'text-[#059669]' : isExpired ? 'text-[#DC2626]' : 'text-[#737373]'}
            size="lg"
          />
          <div>
            <h3 className="text-h3 text-[#1A1A1A]">Allegro</h3>
            <p className="text-xs text-[#737373]">Status integracji</p>
          </div>
        </div>
        {loading
          ? <Loader2 size={16} className="text-[#737373] animate-spin mt-1" />
          : (
            <button
              onClick={refetch}
              title="Odśwież"
              className="p-1.5 rounded-lg hover:bg-[#F5F4F1] transition-colors"
            >
              <RefreshCw size={14} className="text-[#737373]" />
            </button>
          )
        }
      </div>

      {/* Status badge + details */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-5 w-28 rounded bg-[#E5E4E1] animate-pulse" />
          <div className="h-4 w-40 rounded bg-[#E5E4E1] animate-pulse" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connection badge */}
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ECFDF5] text-[#059669]">
              <CheckCircle2 size={12} />
              Połączono {status?.environment === 'sandbox' ? '(Sandbox)' : '(Produkcja)'}
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FEF2F2] text-[#DC2626]">
              <XCircle size={12} /> Token wygasł
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#737373]/10 text-[#737373]">
              <Link2Off size={12} /> Nie połączono
            </span>
          )}

          {/* Token expiry */}
          {status?.connected && (
            <div className="flex items-center gap-2 text-sm text-[#525252]">
              <Clock size={14} className="text-[#737373] shrink-0" />
              <span>Token wygasa za: <span className={`font-mono font-semibold ${isExpired ? 'text-[#DC2626]' : 'text-[#1A1A1A]'}`}>{tokenExpiresIn(status.expiresAt)}</span></span>
            </div>
          )}

          {/* Account login if known */}
          {status?.accountLogin && (
            <p className="text-xs text-[#737373]">Konto: <span className="font-medium text-[#1A1A1A]">{status.accountLogin}</span></p>
          )}
        </div>
      )}

      {/* Footer link */}
      <Link
        href="/admin/settings"
        className="mt-auto flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#F5F4F1] hover:bg-[#EEEDEA] transition-colors text-sm font-medium text-[#525252] group"
      >
        <span>Zarządzaj połączeniem</span>
        <ExternalLink size={14} className="text-[#737373] group-hover:text-[#0066CC] transition-colors" />
      </Link>
    </div>
  )
}
