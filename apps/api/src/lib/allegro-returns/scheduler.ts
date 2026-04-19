/**
 * Returns + Issues cron scheduler.
 * Wraps pollReturnsCycle and pollIssuesCycle with KV idle-guard + circuit breaker.
 */

import {
  isBeforeNextDue,
  setNextDueAt,
  isCircuitOpen,
  openCircuit,
  closeCircuit,
  RETURNS_GUARD_KEYS,
  ISSUES_GUARD_KEYS,
} from '../cron/guards'
import { pollReturnsCycle, pollIssuesCycle, type PollEnv } from './poller'

export type SchedulerEnv = PollEnv

export async function returnsReconcileTick(env: SchedulerEnv): Promise<void> {
  const kv = env.ALLEGRO_KV

  // 1. KV idle guard
  if (await isBeforeNextDue(kv, RETURNS_GUARD_KEYS)) {
    console.log('[Returns] skip — not_due (KV guard)')
    return
  }

  // 2. Circuit breaker
  if (await isCircuitOpen(kv, RETURNS_GUARD_KEYS)) {
    console.warn('[Returns] skip — circuit_open')
    return
  }

  try {
    const summary = await pollReturnsCycle(env)
    console.log(
      `[Returns] cycle done — processed=${summary.processed} upserted=${summary.upserted} new=${summary.newReturns} failures=${summary.failures}`,
    )

    // Open circuit on rate limit
    if (summary.rateLimited) {
      await openCircuit(kv, RETURNS_GUARD_KEYS, 15 * 60)
      return
    }

    // Set next due in 2 min (our cron interval)
    await setNextDueAt(kv, RETURNS_GUARD_KEYS, new Date(Date.now() + 2 * 60 * 1000))
    await closeCircuit(kv, RETURNS_GUARD_KEYS)
  } catch (err) {
    console.error('[Returns] cycle error:', err instanceof Error ? err.message : String(err))
    await openCircuit(kv, RETURNS_GUARD_KEYS, 15 * 60)
  }
}

export async function issuesReconcileTick(env: SchedulerEnv): Promise<void> {
  const kv = env.ALLEGRO_KV

  if (await isBeforeNextDue(kv, ISSUES_GUARD_KEYS)) {
    console.log('[Issues] skip — not_due')
    return
  }
  if (await isCircuitOpen(kv, ISSUES_GUARD_KEYS)) {
    console.warn('[Issues] skip — circuit_open')
    return
  }

  try {
    const summary = await pollIssuesCycle(env)
    console.log(`[Issues] cycle done — processed=${summary.processed} failures=${summary.failures}`)

    if (summary.rateLimited) {
      await openCircuit(kv, ISSUES_GUARD_KEYS, 15 * 60)
      return
    }

    // Set next due in 5 min (issues cron interval)
    await setNextDueAt(kv, ISSUES_GUARD_KEYS, new Date(Date.now() + 5 * 60 * 1000))
    await closeCircuit(kv, ISSUES_GUARD_KEYS)
  } catch (err) {
    console.error('[Issues] cycle error:', err instanceof Error ? err.message : String(err))
    await openCircuit(kv, ISSUES_GUARD_KEYS, 15 * 60)
  }
}
