'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '../lib/adminApiClient'
import type { OrderStatusHistoryEntry, StatusSource, StatusCategory } from '../types/admin-api'

// ── Etykiety źródeł ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<StatusSource, string> = {
  system:       'System',
  admin:        'Administrator',
  allegro_sync: 'Allegro',
  carrier_sync: 'Kurier',
  p24_webhook:  'Przelewy24',
  backfill:     'Dane historyczne',
}

const CATEGORY_DOT: Record<StatusCategory, string> = {
  status:   'bg-[#1A1A1A]',
  tracking: 'bg-[#8B7355]',
}

// ── Mapowanie kodów statusu na polskie etykiety ───────────────────────────────

const STATUS_PL: Record<string, string> = {
  pending:          'Oczekuje na płatność',
  paid:             'Opłacone',
  processing:       'W realizacji',
  shipped:          'Wysłane',
  in_transit:       'W transporcie',
  out_for_delivery: 'Dostawa do drzwi',
  delivered:        'Dostarczone',
  return_requested: 'Zgłoszono zwrot',
  return_in_transit:'Zwrot w drodze',
  return_received:  'Zwrot otrzymany',
  refunded:         'Zwrot pieniędzy',
  disputed:         'Spór / dyskusja',
  cancelled:        'Anulowane',
}

function formatValue(category: StatusCategory, value: string): string {
  if (category === 'status') return STATUS_PL[value] ?? value
  return value.replace(/_/g, ' ')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Komponent ─────────────────────────────────────────────────────────────────

interface Props {
  orderId: number
}

export function OrderTimeline({ orderId }: Props) {
  const [entries, setEntries] = useState<OrderStatusHistoryEntry[] | null>(null)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.getOrderHistory(orderId)
      .then((res) => { if (!cancelled) setEntries(res.data) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Błąd')
      })
    return () => { cancelled = true }
  }, [orderId])

  if (error) {
    return (
      <p className="text-xs text-red-500 mt-1">
        Nie udało się wczytać historii: {error}
      </p>
    )
  }

  if (!entries) {
    return (
      <p className="text-xs text-[#A3A3A3] animate-pulse mt-1">
        Wczytywanie historii…
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-[#A3A3A3] mt-1">
        Brak zapisanych zmian statusu.
      </p>
    )
  }

  return (
    <ol className="relative border-l border-[#F0EFEC] pl-4 space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          {/* Dot */}
          <span
            className={`absolute -left-[1.1rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${CATEGORY_DOT[entry.category]}`}
          />

          {/* Czas */}
          <time className="block text-[10px] text-[#A3A3A3] tabular-nums leading-tight">
            {formatDate(entry.occurred_at)}
          </time>

          {/* Zmiana */}
          <p className="mt-0.5 text-xs text-[#1A1A1A] leading-snug">
            {entry.category === 'status' ? '📦' : '🚚'}{' '}
            {entry.previous_value
              ? <>{formatValue(entry.category, entry.previous_value)} → <strong>{formatValue(entry.category, entry.new_value)}</strong></>
              : <strong>{formatValue(entry.category, entry.new_value)}</strong>
            }
          </p>

          {/* Źródło */}
          <p className="mt-0.5 text-[10px] text-[#A3A3A3]">
            {SOURCE_LABELS[entry.source] ?? entry.source}
            {entry.source_ref ? ` · ${entry.source_ref}` : ''}
          </p>
        </li>
      ))}
    </ol>
  )
}
