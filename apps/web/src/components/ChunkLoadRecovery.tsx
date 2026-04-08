'use client'

import { useEffect } from 'react'

const RELOAD_GUARD_KEY = 'ibc:chunk-reload-once:v1'
const GUARD_TTL_MS = 2 * 60 * 1000

function shouldAttemptReload(): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY)
    if (!raw) return true

    const parsed = JSON.parse(raw) as { ts?: number }
    const ts = typeof parsed?.ts === 'number' ? parsed.ts : 0
    return Date.now() - ts > GUARD_TTL_MS
  } catch {
    return true
  }
}

function markReloadAttempt() {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ ts: Date.now() }))
  } catch {
    // Ignore storage failures (e.g. privacy mode).
  }
}

function isChunkRelatedError(payload: unknown): boolean {
  const text = String(payload ?? '').toLowerCase()

  const hasNextChunkHint = text.includes('/_next/static/chunks/') || text.includes('loading chunk')
  const hasChunkLoadError = text.includes('chunkloaderror')
  const hasNextBuildAssetHint = text.includes('/_next/static/')
  const hasMimeHtmlError = text.includes('mime type') && text.includes('text/html')

  return (
    hasChunkLoadError
    || hasNextChunkHint
    // Only treat MIME/type mismatch as chunk-related if it points to Next static assets.
    || (hasMimeHtmlError && hasNextBuildAssetHint)
  )
}

function hardReloadWithCacheBust() {
  if (!shouldAttemptReload()) return
  markReloadAttempt()

  const url = new URL(window.location.href)
  url.searchParams.set('__r', Date.now().toString())
  window.location.replace(url.toString())
}

export default function ChunkLoadRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent | Event) => {
      // Runtime error case (ErrorEvent)
      if ('message' in event && isChunkRelatedError(event.message)) {
        hardReloadWithCacheBust()
        return
      }

      // Resource load error case (script tag could return HTML 404)
      const target = event.target
      if (target instanceof HTMLScriptElement && isChunkRelatedError(target.src)) {
        hardReloadWithCacheBust()
      }
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason)
      if (isChunkRelatedError(message)) {
        hardReloadWithCacheBust()
      }
    }

    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
