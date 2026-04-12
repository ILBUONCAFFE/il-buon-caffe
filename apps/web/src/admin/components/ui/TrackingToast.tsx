'use client'

import { useEffect, useRef } from 'react'

export interface TrackingToastMessage {
  id: string
  message: string
  type: 'info' | 'error'
  duration?: number
}

interface TrackingToastProps {
  messages: TrackingToastMessage[]
  onDismiss: (id: string) => void
}

export function TrackingToast({ messages, onDismiss }: TrackingToastProps) {
  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.slice(0, 3).map((msg) => (
        <ToastItem key={msg.id} msg={msg} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({
  msg,
  onDismiss,
}: {
  msg: TrackingToastMessage
  onDismiss: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(msg.id), msg.duration ?? 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [msg.id, msg.duration, onDismiss])

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm animate-in slide-in-from-bottom-2 fade-in duration-200 ${
        msg.type === 'error'
          ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-[#1A1A1A] text-white'
      }`}
    >
      <span className="flex-1 leading-snug">{msg.message}</span>
      <button
        onClick={() => onDismiss(msg.id)}
        className="shrink-0 text-base leading-none opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Zamknij"
      >
        ×
      </button>
    </div>
  )
}
