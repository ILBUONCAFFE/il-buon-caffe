import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, eq, isNull, inArray, gt } from 'drizzle-orm'
import { invalidateNextDueKv } from './queue'
import { computeNextCheckAt } from './state-machine'

/**
 * Eager enrollment — call from order handlers when a paid/processing order
 * is confirmed. Idempotent: only sets fields if shipmentState is NULL.
 */
export async function enrollShipment(
  db: ReturnType<typeof createDb>,
  orderId: number,
  kv: KVNamespace,
  now: Date = new Date(),
): Promise<{ enrolled: boolean }> {
  const nextCheckAt = computeNextCheckAt('awaiting_handover', now)
  const res = await db.update(orders).set({
    shipmentState:          'awaiting_handover',
    shipmentCarrier:        'allegro',
    shipmentNextCheckAt:    nextCheckAt,
    shipmentStateChangedAt: now,
    shipmentCheckAttempts:  0,
    updatedAt:              now,
  }).where(
    and(
      eq(orders.id, orderId),
      isNull(orders.shipmentState),
    ),
  ).returning({ id: orders.id })

  if (res.length > 0) {
    await invalidateNextDueKv(kv)
    return { enrolled: true }
  }
  return { enrolled: false }
}

/**
 * Lazy backfill — runs in nightly cron. Enrolls Allegro orders that somehow
 * missed eager enrollment. Scoped to last 30 days to avoid ancient data.
 */
export async function backfillShipmentEnrollment(
  db: ReturnType<typeof createDb>,
  kv: KVNamespace,
): Promise<{ enrolled: number }> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const res = await db.update(orders).set({
    shipmentState:          'awaiting_handover',
    shipmentCarrier:        'allegro',
    shipmentNextCheckAt:    now,
    shipmentStateChangedAt: now,
    shipmentCheckAttempts:  0,
    updatedAt:              now,
  }).where(
    and(
      eq(orders.source, 'allegro'),
      isNull(orders.shipmentState),
      inArray(orders.status, ['paid', 'processing', 'shipped', 'in_transit', 'out_for_delivery'] as any),
      gt(orders.createdAt, thirtyDaysAgo),
    ),
  ).returning({ id: orders.id })

  if (res.length > 0) await invalidateNextDueKv(kv)
  return { enrolled: res.length }
}
