'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, Paperclip, User, Store, Shield, RefreshCw, Send, CheckCircle, XCircle } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import { ComplaintStatusBadge } from './ComplaintStatusBadge'
import type { AdminComplaint, AdminComplaintDetail, ComplaintMessage } from '../types/admin-api'

interface Props {
  complaint: AdminComplaint | null
  isOpen: boolean
  onClose: () => void
  onChanged?: () => void
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

const DECISION_OPTIONS = [
  { status: 'ACCEPTED_REFUND', label: 'Uznaj: zwrot płatności', tone: 'accept' },
  { status: 'ACCEPTED_EXCHANGE', label: 'Uznaj: wymiana', tone: 'accept' },
  { status: 'ACCEPTED_REPAIR', label: 'Uznaj: naprawa', tone: 'accept' },
  { status: 'REJECTED_PRODUCT_CONFORMS_TO_CONTRACT', label: 'Odrzuć: zgodne z umową', tone: 'reject' },
  { status: 'REJECTED_PRODUCT_NOT_RETURNED', label: 'Odrzuć: brak zwrotu towaru', tone: 'reject' },
  { status: 'REJECTED_OTHER', label: 'Odrzuć: inny powód', tone: 'reject' },
] as const

export function ComplaintDetailModal({ complaint, isOpen, onClose, onChanged }: Props) {
  const [detail, setDetail]   = useState<AdminComplaintDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadDetail = async (id: number) => {
    setLoading(true)
    setError(null)
    setDetail(null)
    try {
      const res = await adminApi.getComplaintDetail(id)
      setDetail(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania reklamacji')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !complaint) return
    let cancelled = false
    setMessage('')
    setActionError(null)
    const run = async () => {
      setLoading(true)
      setError(null)
      setDetail(null)
      try {
        const res = await adminApi.getComplaintDetail(complaint.id)
        if (!cancelled) setDetail(res.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Błąd ładowania reklamacji')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
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
  const activeDetail = detail ?? complaint
  const payload = detail?.payload
  const isClaim = payload?.type === 'CLAIM' || String(activeDetail.status).startsWith('CLAIM_')
  const chatActive = payload?.currentState?.chatActive !== false && payload?.currentState?.chatActive !== 'false'
  const canDecide = isClaim && activeDetail.status === 'CLAIM_SUBMITTED'
  const decisionDueDate = payload?.decisionDueDate ?? payload?.currentState?.statusDueDate ?? payload?.currentState?.dueDate

  const refresh = async () => {
    if (!complaint) return
    setActionLoading('refresh')
    setActionError(null)
    try {
      await adminApi.refreshComplaint(complaint.id)
      await loadDetail(complaint.id)
      onChanged?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nie udało się odświeżyć reklamacji')
    } finally {
      setActionLoading(null)
    }
  }

  const sendMessage = async () => {
    if (!complaint || !message.trim()) return
    setActionLoading('message')
    setActionError(null)
    try {
      await adminApi.postComplaintMessage(complaint.id, { text: message.trim(), type: 'REGULAR' })
      setMessage('')
      await loadDetail(complaint.id)
      onChanged?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nie udało się wysłać wiadomości')
    } finally {
      setActionLoading(null)
    }
  }

  const decide = async (status: string) => {
    if (!complaint || !message.trim()) {
      setActionError('Przy decyzji reklamacyjnej wpisz wiadomość dla kupującego.')
      return
    }
    setActionLoading(status)
    setActionError(null)
    try {
      await adminApi.updateComplaintStatus(complaint.id, { status, message: message.trim() })
      setMessage('')
      await loadDetail(complaint.id)
      onChanged?.()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nie udało się zmienić statusu reklamacji')
    } finally {
      setActionLoading(null)
    }
  }

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
              <ComplaintStatusBadge status={activeDetail.status} />
            </div>
            <div className="text-xs text-[#A3A3A3] mt-1">
              {isClaim ? 'Reklamacja' : 'Dyskusja'} Allegro: {complaint.allegroIssueId}
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
            <div className="text-[11px] uppercase tracking-wider text-[#A3A3A3] mb-1">
              {isClaim ? 'Termin decyzji' : 'Ostatnia wiadomość'}
            </div>
            <div className="text-[#1A1A1A]">{formatDT(isClaim ? decisionDueDate : activeDetail.lastMessageAt)}</div>
            <div className="text-xs text-[#525252]">Utworzono: {formatDT(complaint.createdAt)}</div>
          </div>
        </div>

        {payload && (
          <div className="px-6 py-3 border-b border-[#F0EFEC] bg-white text-xs text-[#525252] grid sm:grid-cols-3 gap-2">
            <div><span className="text-[#A3A3A3]">Typ:</span> {isClaim ? 'Reklamacja' : 'Dyskusja'}</div>
            <div><span className="text-[#A3A3A3]">Czat:</span> {chatActive ? 'aktywny' : 'nieaktywny'}</div>
            <div><span className="text-[#A3A3A3]">Wiadomości:</span> {payload.chat?.messagesCount ?? messages.length}</div>
          </div>
        )}

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

        <div className="px-6 py-4 border-t border-[#F0EFEC] bg-[#FAFAF9] space-y-3">
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          {chatActive ? (
            <div className="space-y-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={canDecide ? 'Wpisz wiadomość do decyzji albo zwykłą odpowiedź...' : 'Wpisz odpowiedź do kupującego...'}
                className="admin-input min-h-24 resize-y text-sm"
              />
              {canDecide && (
                <div className="flex flex-wrap gap-2">
                  {DECISION_OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      onClick={() => decide(option.status)}
                      disabled={!!actionLoading}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        option.tone === 'accept'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {option.tone === 'accept' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#A3A3A3]">Czat w tej sprawie nie jest aktywny w Allegro.</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={refresh}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 btn-secondary text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={actionLoading === 'refresh' ? 'animate-spin' : ''} />
              Odśwież z Allegro
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Zamknij</button>
              {chatActive && (
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || !!actionLoading}
                  className="inline-flex items-center gap-1.5 btn-primary text-sm disabled:opacity-50"
                >
                  <Send size={15} />
                  Wyślij
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
