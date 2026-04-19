/**
 * Allegro Returns — Reconciler
 *
 * Idempotent upsert: persists Allegro customer-return data into the local
 * `returns` table, handles status transitions, and optionally records
 * changes to `orderStatusHistory` via `recordStatusChange`.
 *
 * DB errors bubble up to the caller. Fire-and-forget logs use console.log.
 */

import { sql, eq } from 'drizzle-orm'
import { returns, returnItems } from '@repo/db/schema'
import type { Database } from '@repo/db/client'
import type { AllegroCustomerReturn } from './client'
import {
  mapAllegroReturnStatusToInternal,
  mapAllegroReasonToInternal,
  mapInternalStatusToOrderStatus,
  type InternalReturnStatus,
} from './state-mapping'
import { recordStatusChange } from '../record-status-change'

// ── Return-number generation ───────────────────────────────────────────────

function generateAllegroReturnNumber(allegroId: string): string {
  const year = new Date().getFullYear()
  const ref = allegroId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `Z-${year}-A${ref}`
}

// ── Main upsert function ───────────────────────────────────────────────────

export async function upsertAllegroReturn(
  db: Database,
  allegroReturn: AllegroCustomerReturn,
  orderId: number,
): Promise<{ returnId: number; isNew: boolean; statusChanged: boolean }> {
  // 1. Look up existing return by Allegro customerReturnId stored in JSONB
  const existing = await db
    .select({ id: returns.id, status: returns.status })
    .from(returns)
    .where(sql`${returns.allegro}->>'customerReturnId' = ${allegroReturn.id}`)
    .limit(1)

  // 2. Map Allegro data to internal fields
  const newStatus = mapAllegroReturnStatusToInternal(allegroReturn.status ?? 'CREATED')

  const firstItem = allegroReturn.items?.[0]
  const reason = mapAllegroReasonToInternal(firstItem?.reason?.type ?? 'MISTAKE')
  const reasonNote = firstItem?.reason?.userComment ?? null

  const totalRefundAmount = allegroReturn.refund?.value?.amount ?? null
  const currency = allegroReturn.refund?.value?.currency ?? 'PLN'

  const buyer = allegroReturn.buyer
  const customerData = buyer
    ? { name: buyer.login, email: buyer.email }
    : { name: '', email: '' }

  // Build the allegro JSONB block, using undefined for absent optional fields
  // (schema type uses `?` not `| null` for optional fields)
  const allegroJsonb: {
    customerReturnId: string
    referenceNumber?: string
    rejection?: { code: string; reason?: string; createdAt: string }
    refund?: { value: { amount: string; currency: string }; status: string; bankAccount?: Record<string, unknown> }
    parcels?: Array<{ transportingCarrierId: string; trackingNumber: string; sender?: string }>
  } = {
    customerReturnId: allegroReturn.id,
    ...(allegroReturn.referenceNumber !== undefined
      ? { referenceNumber: allegroReturn.referenceNumber }
      : {}),
    ...(allegroReturn.rejection?.code !== undefined
      ? {
          rejection: {
            code: allegroReturn.rejection.code,
            reason: allegroReturn.rejection.reason,
            createdAt: allegroReturn.rejection.createdAt ?? new Date().toISOString(),
          },
        }
      : {}),
    ...(allegroReturn.refund?.value?.amount !== undefined && allegroReturn.refund?.status !== undefined
      ? {
          refund: {
            value: {
              amount: allegroReturn.refund.value.amount,
              currency: allegroReturn.refund.value.currency,
            },
            status: allegroReturn.refund.status,
            bankAccount: allegroReturn.refund.bankAccount,
          },
        }
      : {}),
    ...(allegroReturn.parcels !== undefined
      ? {
          parcels: allegroReturn.parcels.map((p) => ({
            transportingCarrierId: p.transportingCarrierId ?? '',
            trackingNumber: p.trackingNumber ?? '',
          })),
        }
      : {}),
  }

  // 3. New return — insert
  if (existing.length === 0) {
    const returnNumber = generateAllegroReturnNumber(allegroReturn.id)

    const [inserted] = await db
      .insert(returns)
      .values({
        returnNumber,
        orderId,
        source: 'allegro',
        status: newStatus,
        reason,
        reasonNote,
        totalRefundAmount: totalRefundAmount,
        currency,
        customerData,
        allegro: allegroJsonb,
        restockApplied: false,
      })
      .returning({ id: returns.id })

    const returnId = inserted.id
    console.log(`[Returns] New return created: id=${returnId} allegroId=${allegroReturn.id}`)

    // Insert return items
    if (allegroReturn.items && allegroReturn.items.length > 0) {
      const itemRows = allegroReturn.items.map((item) => {
        const priceStr = item.price?.amount ?? '0'
        const quantity = item.quantity ?? 1
        const unitCents = Math.round(parseFloat(priceStr) * 100)
        const totalCents = unitCents * quantity
        const totalStr = (totalCents / 100).toFixed(2)
        return {
          returnId,
          orderItemId: null,
          productSku: item.offerId ?? 'UNKNOWN',
          productName: item.offerTitle ?? 'Produkt Allegro',
          quantity,
          unitPrice: priceStr,
          totalPrice: totalStr,
          condition: null,
        }
      })

      await db.insert(returnItems).values(itemRows)
      console.log(`[Returns] Inserted ${itemRows.length} return item(s) for returnId=${returnId}`)
    }

    return { returnId, isNew: true, statusChanged: false }
  }

  // 4. Existing return — update
  const existingRecord = existing[0]
  const oldStatus = existingRecord.status as InternalReturnStatus
  const statusChanged = oldStatus !== newStatus

  await db
    .update(returns)
    .set({
      status: newStatus,
      allegro: allegroJsonb,
      totalRefundAmount: totalRefundAmount,
      updatedAt: new Date(),
    })
    .where(eq(returns.id, existingRecord.id))

  console.log(
    `[Returns] Updated return id=${existingRecord.id} allegroId=${allegroReturn.id} statusChanged=${statusChanged}`,
  )

  // 5. Record status history only when status changed
  if (statusChanged) {
    const orderStatus = mapInternalStatusToOrderStatus(newStatus)
    if (orderStatus) {
      await recordStatusChange(db, {
        orderId,
        category: 'status',
        newValue: orderStatus,
        source: 'allegro_sync',
        sourceRef: allegroReturn.referenceNumber ?? null,
      }).catch((err) => console.warn('[Returns] recordStatusChange failed:', err))
    }
  }

  return { returnId: existingRecord.id, isNew: false, statusChanged }
}
