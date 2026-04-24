/**
 * Generic KV idle-guard and circuit-breaker helpers for cron jobs.
 * Used by shipments poller and returns poller.
 */

export interface CronGuardKeys {
  nextDueAt: string      // KV key storing ISO timestamp of next scheduled run
  circuitOpen: string    // KV key storing '1' when circuit is open
}

/**
 * Returns true if we should skip DB entirely this cycle.
 * KV nextDueAt stores the ISO timestamp of the earliest future work item.
 */
export async function isBeforeNextDue(
  kv: KVNamespace,
  keys: CronGuardKeys,
  now: Date = new Date(),
): Promise<boolean> {
  const raw = await kv.get(keys.nextDueAt)
  if (!raw) return false
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return false
  return t > now.getTime()
}

/**
 * Update KV with the next due timestamp.
 */
export async function setNextDueAt(
  kv: KVNamespace,
  keys: CronGuardKeys,
  nextAt: Date,
  ttlSec = 3600,
): Promise<void> {
  await kv.put(keys.nextDueAt, nextAt.toISOString(), { expirationTtl: ttlSec })
}

/**
 * Clear the idle guard (force next cycle to run).
 */
export async function invalidateNextDueAt(
  kv: KVNamespace,
  keys: CronGuardKeys,
): Promise<void> {
  await kv.delete(keys.nextDueAt)
}

/**
 * Returns true if the circuit breaker is open (too many recent failures).
 */
export async function isCircuitOpen(
  kv: KVNamespace,
  keys: CronGuardKeys,
): Promise<boolean> {
  return (await kv.get(keys.circuitOpen)) === '1'
}

/**
 * Open the circuit breaker with a TTL. Auto-closes when TTL expires.
 */
export async function openCircuit(
  kv: KVNamespace,
  keys: CronGuardKeys,
  ttlSec = 15 * 60,
): Promise<void> {
  await kv.put(keys.circuitOpen, '1', { expirationTtl: ttlSec })
}

/**
 * Close the circuit breaker manually.
 */
export async function closeCircuit(
  kv: KVNamespace,
  keys: CronGuardKeys,
): Promise<void> {
  await kv.delete(keys.circuitOpen)
}

// ── Pre-configured key sets ──────────────────────────────────────────────────

export const RETURNS_GUARD_KEYS: CronGuardKeys = {
  nextDueAt:   'returns:next_due_at',
  circuitOpen: 'returns:circuit_open',
}

export const ISSUES_GUARD_KEYS: CronGuardKeys = {
  nextDueAt:   'issues:next_due_at',
  circuitOpen: 'issues:circuit_open',
}
