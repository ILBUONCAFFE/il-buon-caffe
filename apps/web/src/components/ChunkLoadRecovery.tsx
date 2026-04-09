'use client'

import { useEffect } from 'react'

const RELOAD_GUARD_KEY = 'ibc:chunk-reload-once:v1'
const GUARD_TTL_MS = 10 * 60 * 1000

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

// For runtime JS errors (ErrorEvent) — only match by error name/type.
// Matching by URL patterns in message/stack would cause false positives
// for any error that happens to mention /_next/static/ in its stacktrace.
function isChunkRelatedRuntimeError(payload: unknown): boolean {
  const text = String(payload ?? '').toLowerCase()
  return text.includes('chunkloaderror') || text.includes('loading chunk')
}

// For resource load errors (HTMLScriptElement failed to fetch) — match by URL.
function isChunkRelatedResourceError(src: string): boolean {
  const text = src.toLowerCase()
  const isNextChunk = text.includes('/_next/static/chunks/')
  const hasMimeHtmlError = text.includes('mime type') && text.includes('text/html') && text.includes('/_next/static/')
  return isNextChunk || hasMimeHtmlError
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
    // Strip cache-bust param from URL after successful reload
    const url = new URL(window.location.href)
    if (url.searchParams.has('__r')) {
      url.searchParams.delete('__r')
      history.replaceState(null, '', url.toString())
    }

    const onError = (event: ErrorEvent | Event) => {
      // Runtime error case (ErrorEvent) — match only by error type, not URL patterns
      if (event instanceof ErrorEvent && isChunkRelatedRuntimeError(event.message)) {
        hardReloadWithCacheBust()
        return
      }

      // Resource load error case (script tag failed to fetch a chunk)
      const target = event.target
      if (target instanceof HTMLScriptElement && isChunkRelatedResourceError(target.src)) {
        hardReloadWithCacheBust()
      }
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason)
      if (isChunkRelatedRuntimeError(message)) {
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
