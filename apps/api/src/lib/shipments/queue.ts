import { createDbWithPool } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, lte, isNotNull, notInArray, sql, asc } from 'drizzle-orm'
import type { AllegroShipmentRecord } from './types'

type ShipmentDb = ReturnType<typeof createDbWithPool>['db']

export const KV_NEXT_DUE_AT = 'shipments:next_due_at'
export const KV_CIRCUIT_OPEN = 'shipments:circuit_open'
const BATCH_SIZE = 10
const TERMINAL_STATES: string[] = ['delivered', 'stale']

export interface DueOrder {
  id: number
  externalId: string | null
  shipmentState: string
  shipmentCheckAttempts: number
  shipmentStateChangedAt: Date | null
  allegroShipmentsSnapshot: AllegroShipmentRecord[] | null
}

export async function isCircuitOpen(kv: KVNamespace): Promise<boolean> {
  return (await kv.get(KV_CIRCUIT_OPEN)) === '1'
}

export async function openCircuit(kv: KVNamespace, ttlSec = 15 * 60): Promise<void> {
  await kv.put(KV_CIRCUIT_OPEN, '1', { expirationTtl: ttlSec })
}

/**
 * Returns true if we should skip DB entirely this cycle.
 * KV stores the timestamp of the earliest future `shipment_next_check_at`.
 */
export async function isBeforeNextDue(kv: KVNamespace, now: Date = new Date()): Promise<boolean> {
  const raw = await kv.get(KV_NEXT_DUE_AT)
  if (!raw) return false
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return false
  return t > now.getTime()
}

export async function selectDueShipments(
  db: ShipmentDb,
  now: Date = new Date(),
): Promise<DueOrder[]> {
  const rows = await db
    .select({
      id:                       orders.id,
      externalId:               orders.externalId,
      shipmentState:            orders.shipmentState,
      shipmentCheckAttempts:    orders.shipmentCheckAttempts,
      shipmentStateChangedAt:   orders.shipmentStateChangedAt,
      allegroShipmentsSnapshot: orders.allegroShipmentsSnapshot,
    })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.shipmentState),
        notInArray(orders.shipmentState, TERMINAL_STATES),
        lte(orders.shipmentNextCheckAt, now),
      ),
    )
    .orderBy(asc(orders.shipmentNextCheckAt))
    .limit(BATCH_SIZE)
  return rows as DueOrder[]
}

/**
 * After a cycle, update KV with the earliest future check timestamp.
 */
export async function refreshNextDueKv(
  db: ShipmentDb,
  kv: KVNamespace,
): Promise<Date | null> {
  const [row] = await db
    .select({ next: sql<string | null>`MIN(${orders.shipmentNextCheckAt})` })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'allegro'),
        isNotNull(orders.shipmentState),
        notInArray(orders.shipmentState, TERMINAL_STATES),
      ),
    )
  const next = row?.next ? new Date(row.next) : new Date(Date.now() + 60 * 60 * 1000)
  await kv.put(KV_NEXT_DUE_AT, next.toISOString(), { expirationTtl: 3600 })
  return next
}

export async function invalidateNextDueKv(kv: KVNamespace): Promise<void> {
  await kv.delete(KV_NEXT_DUE_AT)
}
