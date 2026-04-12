'use client'

import { useCallback, useEffect, useRef } from 'react'
import { adminApi } from '../lib/adminApiClient'
import type { AdminOrder, TrackingPulseUpdate } from '../types/admin-api'

// Mirrors backend cron cooldowns — no point polling faster than cron refreshes
const INTERVAL_MAP: Array<{ pattern: RegExp; ms: number }> = [
  { pattern: /OUT_FOR_DELIVERY|COURIER/i,        ms: 5  * 60 * 1000 },
  { pattern: /EXCEPTION|RETURN|FAILED/i,          ms: 20 * 60 * 1000 },
  { pattern: /IN_TRANSIT|TRANSIT|SENT/i,          ms: 30 * 60 * 1000 },
  { pattern: /LABEL_CREATED|CREATED|REGISTERED/i, ms: 90 * 60 * 1000 },
  { pattern: /DELIVERED|PICKED_UP/i,              ms: 12 * 60 * 60 * 1000 },
]
const FALLBACK_INTERVAL_MS = 60 * 60 * 1000 // 60 min for UNKNOWN

/** Returns shortest applicable interval among active orders, or null if none. */
function computeAdaptiveInterval(orders: AdminOrder[]): number | null {
  const active = orders.filter(
    (o) => o.status === 'shipped' || o.status === 'delivered',
  )
  if (active.length === 0) return null

  let min = FALLBACK_INTERVAL_MS
  for (const order of active) {
    const code = order.trackingStatusCode ?? ''
    for (const { pattern, ms } of INTERVAL_MAP) {
      if (pattern.test(code)) {
        if (ms < min) min = ms
        break
      }
    }
  }
  return min
}

export interface TrackingStatusChange {
  orderId: number
  orderNumber: string
  prevCode: string
  nextCode: string
}

export interface UseTrackingPulseOptions {
  orders: AdminOrder[]
  onOrdersUpdated: (updates: TrackingPulseUpdate[]) => void
  /** Called once per pulse with ALL changed orders (not per-order). Use count to decide single vs collective toast. */
  onStatusChanged: (changes: TrackingStatusChange[]) => void
  enabled?: boolean
}

export function useTrackingPulse({
  orders,
  onOrdersUpdated,
  onStatusChanged,
  enabled = true,
}: UseTrackingPulseOptions): void {
  // Refs — avoid stale closures without re-creating callbacks
  const serverSinceRef = useRef<string | null>(null)
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ordersRef      = useRef(orders)
  const enabledRef     = useRef(enabled)
  const cbRef          = useRef({ onOrdersUpdated, onStatusChanged })

  useEffect(() => { ordersRef.current = orders },            [orders])
  useEffect(() => { enabledRef.current = enabled },          [enabled])
  useEffect(() => { cbRef.current = { onOrdersUpdated, onStatusChanged } }, [onOrdersUpdated, onStatusChanged])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * Execute one poll cycle.
   * wakeFromHidden=true → patches UI silently, suppresses toasts.
   * After completion schedules next poll via adaptive interval.
   */
  const executePoll = useCallback(async (wakeFromHidden: boolean): Promise<void> => {
    if (!enabledRef.current) return

    const since = serverSinceRef.current ?? undefined

    try {
      const res = await adminApi.getTrackingPulse(since)

      // Always use server-provided nextSince — eliminates clock drift
      serverSinceRef.current = res.nextSince

      if (res.data.length > 0) {
        // Snapshot prev codes before notifying parent (parent mutates orders)
        const prevMap = new Map(
          ordersRef.current.map((o) => [
            o.id,
            { code: o.trackingStatusCode, number: o.orderNumber ?? `#${o.id}` },
          ]),
        )

        cbRef.current.onOrdersUpdated(res.data)

        if (!wakeFromHidden) {
          const changes: TrackingStatusChange[] = []
          for (const update of res.data) {
            const prev = prevMap.get(update.id)
            if (
              prev &&
              update.trackingStatusCode &&
              prev.code !== update.trackingStatusCode
            ) {
              changes.push({
                orderId: update.id,
                orderNumber: prev.number,
                prevCode: prev.code ?? 'UNKNOWN',
                nextCode: update.trackingStatusCode,
              })
            }
          }
          if (changes.length > 0) {
            cbRef.current.onStatusChanged(changes)
          }
        }
      }

      // hasMore → immediately fetch next page (cursor already advanced via serverSinceRef)
      if (res.hasMore) {
        void executePoll(wakeFromHidden)
        return
      }
    } catch {
      // Network error — will retry on next scheduled poll
    }

    // Schedule next poll based on current order statuses
    if (enabledRef.current) {
      const interval = computeAdaptiveInterval(ordersRef.current)
      if (interval !== null) {
        timerRef.current = setTimeout(() => void executePoll(false), interval)
      }
    }
  }, []) // No deps — uses only refs

  // Derived stable key: changes only when the SET of shipped/delivered order IDs changes.
  // This prevents re-triggering when tracking status of an existing order updates.
  const activeKey = orders
    .filter((o) => o.status === 'shipped' || o.status === 'delivered')
    .map((o) => o.id)
    .sort((a, b) => a - b)
    .join(',')

  useEffect(() => {
    stopTimer()
    if (!enabled) return

    const interval = computeAdaptiveInterval(orders)
    if (interval === null) return

    // Fire immediately so admin sees fresh data on page load / filter change
    void executePoll(false)

    return stopTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, enabled, executePoll, stopTimer])

  // Pause/resume on tab visibility
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopTimer()
      } else if (enabledRef.current) {
        // Silent poll on wake — patches UI without toasts
        void executePoll(true)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stopTimer()
    }
  }, [executePoll, stopTimer])
}
