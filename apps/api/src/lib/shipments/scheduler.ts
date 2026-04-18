import { createDbWithPool } from '@repo/db/client'
import type { CycleSummary } from './types'
import {
  selectDueShipments,
  isBeforeNextDue,
  isCircuitOpen,
  openCircuit,
  refreshNextDueKv,
} from './queue'
import { pollAllegroShipment, applyPollResult, applyBackoff } from './poller'

interface SchedulerEnv {
  DATABASE_URL: string
  ALLEGRO_KV: KVNamespace
  ALLEGRO_ENVIRONMENT: 'sandbox' | 'production'
}

export async function refreshShipments(env: SchedulerEnv): Promise<CycleSummary> {
  // 1. KV idle guard
  if (await isBeforeNextDue(env.ALLEGRO_KV)) {
    return { processed: 0, updated: 0, stateChanges: 0, failures: 0, skippedReason: 'not_due', nextDueAt: null }
  }

  // 2. Circuit breaker
  if (await isCircuitOpen(env.ALLEGRO_KV)) {
    return { processed: 0, updated: 0, stateChanges: 0, failures: 0, skippedReason: 'circuit_open', nextDueAt: null }
  }

  const { db, end } = createDbWithPool(env.DATABASE_URL)
  try {
    const due = await selectDueShipments(db)
    if (due.length === 0) {
      const next = await refreshNextDueKv(db, env.ALLEGRO_KV)
      return { processed: 0, updated: 0, stateChanges: 0, failures: 0, nextDueAt: next }
    }

    let updated = 0
    let stateChanges = 0
    let failures = 0
    let rateLimitedRetryAfter: number | null = null

    for (const order of due) {
      if (!order.externalId) {
        console.warn(`[Shipments] order ${order.id} missing externalId — skipped`)
        continue
      }

      const res = await pollAllegroShipment(order.externalId, env)
      if (!res.ok) {
        failures++
        await applyBackoff(db, order, res.failure)
        if (res.failure.kind === 'rate_limit') {
          rateLimitedRetryAfter = res.failure.retryAfterSec ?? 60
          break
        }
        if (res.failure.kind === 'auth') break
        continue
      }

      const applied = await applyPollResult(db, order, res.shipments)
      updated++
      if (applied.stateChanged) stateChanges++
    }

    // Circuit breaker: >50% failure rate in a non-trivial cycle
    if (due.length >= 4 && failures / due.length > 0.5) {
      await openCircuit(env.ALLEGRO_KV, 15 * 60)
    }
    if (rateLimitedRetryAfter !== null) {
      await openCircuit(env.ALLEGRO_KV, rateLimitedRetryAfter)
    }

    const nextDueAt = await refreshNextDueKv(db, env.ALLEGRO_KV)

    console.log(
      `[Shipments] cycle done — due=${due.length} updated=${updated} stateChanges=${stateChanges} failures=${failures} nextDueAt=${nextDueAt?.toISOString() ?? 'none'}`,
    )

    return {
      processed:    due.length,
      updated,
      stateChanges,
      failures,
      skippedReason: rateLimitedRetryAfter !== null ? 'rate_limited' : undefined,
      nextDueAt,
    }
  } finally {
    await end()
  }
}
