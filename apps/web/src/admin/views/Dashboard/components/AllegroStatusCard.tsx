'use client'

import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Link2Off, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { useAllegroStatus } from '../../../hooks/useDashboard'

function tokenExpiresIn(expiresAt: string | null): string {
  if (!expiresAt) return '—'
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Wygasł'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export const AllegroStatusCard = () => {
  const { allegroStatus: status, loading, refetch } = useAllegroStatus()

  const isConnected = status?.connected && status?.tokenValid
  const isExpired = status?.connected && !status?.tokenValid

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Allegro</h2>
        {loading ? (
          <Loader2 size={14} className="text-[#A3A3A3] animate-spin" />
        ) : (
          <button
            onClick={refetch}
            title="Odśwież"
            className="p-1 rounded hover:bg-[#F5F4F1] transition-colors"
          >
            <RefreshCw size={12} className="text-[#A3A3A3]" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-[#E5E4E1] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[#E5E4E1] animate-pulse" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connection status line */}
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <CheckCircle2 size={14} className="text-[#059669]" />
                <span className="text-[#525252]">
                  Połączono
                  <span className="text-[#A3A3A3] ml-1">
                    ({status?.environment === 'sandbox' ? 'Sandbox' : 'Prod'})
                  </span>
                </span>
              </>
            ) : isExpired ? (
              <>
                <XCircle size={14} className="text-[#DC2626]" />
                <span className="text-[#DC2626] font-medium">Token wygasł</span>
              </>
            ) : (
              <>
                <Link2Off size={14} className="text-[#A3A3A3]" />
                <span className="text-[#737373]">Nie połączono</span>
              </>
            )}
          </div>

          {/* Token expiry */}
          {status?.connected && (
            <div className="flex items-center gap-2 text-sm text-[#525252]">
              <Clock size={14} className="text-[#A3A3A3]" />
              <span>
                Token:{' '}
                <span
                  className={`font-mono font-medium ${
                    isExpired ? 'text-[#DC2626]' : 'text-[#1A1A1A]'
                  }`}
                >
                  {tokenExpiresIn(status.expiresAt)}
                </span>
              </span>
            </div>
          )}

          {/* Account */}
          {status?.accountLogin && (
            <p className="text-xs text-[#A3A3A3]">
              Konto: <span className="text-[#525252]">{status.accountLogin}</span>
            </p>
          )}

          {/* Manage link */}
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0066CC] transition-colors mt-1"
          >
            <span>Zarządzaj</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}
