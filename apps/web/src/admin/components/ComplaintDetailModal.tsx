'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, Paperclip, User, Store, Shield } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import { ComplaintStatusBadge } from './ComplaintStatusBadge'
import type { AdminComplaint, AdminComplaintDetail, ComplaintMessage } from '../types/admin-api'

interface Props {
  complaint: AdminComplaint | null
  isOpen: boolean
  onClose: () => void
}

const DATE_FMT = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

function formatDT(iso: string | null | undefined): string {
  if (!iso) return '-'
  return DATE_FMT.format(new Date(iso))
}

function roleIcon(role: string) {
  if (role === 'SELLER')  return <Store size={14} className="text-[#1A1A1A]" />
  if (role === 'ALLEGRO') return <Shield size={14} className="text-[#FF5A00]" />
  return <User size={14} className="text-[#525252]" />
}

function roleLabel(role: string): string {
  if (role === 'SELLER')  return 'My'
  if (role === 'ALLEGRO') return 'Allegro'
  if (role === 'BUYER')   return 'Kupujący'
  return role
}

export function ComplaintDetailModal({ complaint, isOpen, onClose }: Props) {
  const [detail, setDetail]   = useState<AdminComplaintDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !complaint) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    adminApi.getComplaintDetail(complaint.id)
      .then(res => { if (!cancelled) setDetail(res.data) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Błąd ładowania reklamacji') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, complaint])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !complaint) return null

  const messages: ComplaintMessage[] = detail?.messages ?? []

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#F0EFEC]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#1A1A1A] truncate">
                {complaint.subject || `Reklamacja #${complaint.allegroIssueId}`}
              </h2>
              <ComplaintStatusBadge status={complaint.status} />
            </div>
            <div className="text-xs text-[#A3A3A3] mt-1">
              ID Allegro: {complaint.allegroIssueId}
              {complaint.orderNumber && <> · Zamówienie: {complaint.orderNumber}</>}
              {detail?.returnNumber && <> · Zwrot: {detail.returnNumber}</>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-[#F0EFEC] bg-[#FAFAF9] grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#A3A3A3] mb-1">Klient</div>
            <div className="text-[#1A1A1A] font-medium">{complaint.customerData?.name ?? '-'}</div>
            <div className="text-xs text-[#525252]">{complaint.customerData?.email ?? ''}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#A3A3A3] mb-1">Ostatnia wiadomość</div>
            <div className="text-[#1A1A1A]">{formatDT(complaint.lastMessageAt)}</div>
            <div className="text-xs text-[#525252]">Utworzono: {formatDT(complaint.createdAt)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-[#F5F4F1] rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="text-center py-12 text-[#A3A3A3] text-sm">
              Brak wiadomości w tym wątku.
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.authorRole === 'SELLER'
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      mine
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#F5F4F1] text-[#1A1A1A]'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 text-[11px] mb-1 ${mine ? 'text-white/70' : 'text-[#A3A3A3]'}`}>
                      {roleIcon(m.authorRole)}
                      <span className="font-medium">{roleLabel(m.authorRole)}</span>
                      <span>·</span>
                      <span>{formatDT(m.createdAt)}</span>
                    </div>
                    {m.text && (
                      <p className={`text-sm whitespace-pre-wrap ${mine ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {m.text}
                      </p>
                    )}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className={`mt-2 space-y-1 text-xs ${mine ? 'text-white/80' : 'text-[#525252]'}`}>
                        {m.attachments.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <Paperclip size={12} />
                            {a.url ? (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:no-underline inline-flex items-center gap-1"
                              >
                                {a.name ?? a.id}
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span>{a.name ?? a.id}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#F0EFEC] bg-[#FAFAF9] flex items-center justify-between">
          <p className="text-xs text-[#A3A3A3]">
            Odpowiedzi należy wysyłać przez panel Allegro.
            Synchronizacja odbywa się automatycznie co 6 minut.
          </p>
          <button
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}
