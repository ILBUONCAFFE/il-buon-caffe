/**
 * Nightly exchange rate backfill
 *
 * Fills total_pln / exchange_rate / rate_date for orders where total_pln IS NULL.
 * Groups by (currency, DATE(created_at)) — one NBP fetch + one UPDATE per group.
 * Processes last 90 days per run; runs again the next night for older records.
 */

import { createDb } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { and, isNull, sql, gte } from 'drizzle-orm'
import { getRate, type ForeignCurrency } from '../nbp'
import type { Env } from '../../index'

const FOREIGN_CURRENCIES: ForeignCurrency[] = ['CZK', 'EUR', 'HUF']

export async function backfillExchangeRates(env: Env): Promise<void> {
  if (!env.DATABASE_URL || !env.ALLEGRO_KV) {
    console.warn('[BackfillRates] Missing DATABASE_URL or ALLEGRO_KV — skipping')
    return
  }

  const db  = createDb(env.DATABASE_URL)
  const kv  = env.ALLEGRO_KV
  const ago = new Date()
  ago.setDate(ago.getDate() - 90)

  // 1. One SELECT DISTINCT — minimal data transfer from DB
  const pairs = await db
    .selectDistinct({
      currency:  orders.currency,
      orderDate: sql<string>`DATE(${orders.createdAt})::text`,
    })
    .from(orders)
    .where(
      and(
        isNull(orders.totalPln),
        sql`${orders.currency} IN ('CZK', 'EUR', 'HUF')`,
        gte(orders.createdAt, ago),
      )
    )

  if (pairs.length === 0) {
    console.log('[BackfillRates] Nothing to backfill')
    return
  }

  console.log(`[BackfillRates] ${pairs.length} (currency, date) pairs to process`)

  let updated = 0
  let errors  = 0

  // 2. One NBP fetch + one batch UPDATE per (currency, date) pair
  for (const { currency, orderDate } of pairs) {
    if (!FOREIGN_CURRENCIES.includes(currency as ForeignCurrency)) continue

    try {
      const nbp = await getRate(currency as ForeignCurrency, new Date(orderDate), kv)

      await db
        .update(orders)
        .set({
          totalPln:     sql`ROUND(${orders.total}::numeric * ${nbp.rate}, 2)::text`,
          exchangeRate: nbp.rate.toFixed(6),
          rateDate:     nbp.rateDate,
        })
        .where(
          and(
            isNull(orders.totalPln),
            sql`${orders.currency} = ${currency}`,
            sql`DATE(${orders.createdAt})::text = ${orderDate}`,
          )
        )

      updated++
      console.log(`[BackfillRates] ${currency} ${orderDate} @ ${nbp.rate} PLN`)
    } catch (err) {
      errors++
      console.error(`[BackfillRates] ${currency} ${orderDate} failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`[BackfillRates] Done — ${updated} groups updated, ${errors} errors`)
}
