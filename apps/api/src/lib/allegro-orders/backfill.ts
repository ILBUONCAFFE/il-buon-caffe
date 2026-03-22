/**
 * Allegro Order Sync — Backfill (one-time import)
 *
 * Fetches Allegro checkout-forms (newest first) and imports orders that are
 * missing in the local DB. Stops when an entire batch is already present
 * ("do ostatniego zapisanego") or after MAX_PAGES batches.
 *
 * After the backfill, sets the event-stream cursor to the latest Allegro
 * event so the regular cron sync continues from now onwards.
 */

import { createDb, createDbWsPool } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import { getAllegroApiBase, type AllegroEnvironment } from '../allegro'
import type { Env } from '../../index'
import type { BackfillResult, AllegroCheckoutForm } from './types'
import { writeCursor, allegroHeaders, sleep, withRetry } from './helpers'
import { handleBought, handleFilledIn, handleReadyForProcessing, handleCancelled } from './handlers'
import { resolveAccessToken } from './resolve-token'

export async function backfillAllegroOrders(env: Env): Promise<BackfillResult> {
  const kv = env.ALLEGRO_KV
  if (!kv) throw new Error('ALLEGRO_KV not configured')

  // Use WebSocket Pool driver — neon HTTP driver hits CF Workers subrequest limit
  // (50 free / 1000 paid) after a few orders. A single WebSocket connection is unlimited.
  const { db, end } = createDbWsPool(env.DATABASE_URL)

  try {
    return await _backfillInner(env, kv, db)
  } finally {
    await end()
  }
}

async function _backfillInner(
  env: Env,
  kv: KVNamespace,
  db: ReturnType<typeof createDb>,
): Promise<BackfillResult> {
  // ── Resolve access token ────────────────────────────────────────────
  const accessToken = await resolveAccessToken(kv, db, env)
  if (!accessToken) throw new Error('Brak połączenia z Allegro (brak credentials)')

  const allegroEnv = (env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
  const apiBase    = getAllegroApiBase(allegroEnv)

  // ── Fetch checkout-forms (newest first) in batches ────────────────────
  const BATCH_SIZE = 100
  const MAX_PAGES  = 50   // safety: max 5 000 orders
  let offset       = 0
  let imported      = 0
  let skipped       = 0
  let errors        = 0
  let stoppedReason: BackfillResult['stoppedReason'] = 'end_of_data'

  console.log(`[Backfill] Start — pobieranie zamówień z Allegro (newest first)`)

  for (let page = 0; page < MAX_PAGES; page++) {
    const resp = await fetch(
      `${apiBase}/order/checkout-forms?limit=${BATCH_SIZE}&offset=${offset}&sort=-lineItems.boughtAt`,
      { signal: AbortSignal.timeout(10_000), headers: allegroHeaders(accessToken) },
    )

    if (resp.status === 401) {
      console.warn('[Backfill] Token wygasł (401)')
      stoppedReason = 'auth_error'
      break
    }
    if (!resp.ok) {
      console.error(`[Backfill] GET /checkout-forms → ${resp.status}`)
      stoppedReason = 'api_error'
      break
    }

    const data = await resp.json() as { checkoutForms: AllegroCheckoutForm[] }
    const forms = data.checkoutForms ?? []
    if (forms.length === 0) break

    let batchSkipped = 0

    for (const form of forms) {
      // Check if order already exists in DB (with retry for transient neon HTTP failures)
      let existing: { id: number } | undefined
      try {
        const rows = await withRetry(() =>
          db.select({ id: orders.id })
            .from(orders)
            .where(eq(orders.externalId, form.id))
            .limit(1)
        )
        existing = rows[0]
      } catch (err) {
        errors++
        console.error(`[Backfill] Existence check failed for ${form.id}:`, err instanceof Error ? err.message : err)
        await sleep(1000)
        continue
      }

      if (existing) {
        batchSkipped++
        skipped++
        continue
      }

      // Import missing order
      try {
        await withRetry(async () => {
          const isPaid = form.payment?.finishedAt
            || form.payment?.paidAmount
            || form.status === 'READY_FOR_PROCESSING'
          const isCancelled = form.status === 'CANCELLED'

          if (isCancelled) {
            await handleCancelled(db, form, 'AUTO_CANCELLED')
          } else if (isPaid) {
            await handleReadyForProcessing(db, form)
          } else {
            await handleBought(db, form)
            if (form.delivery?.address) {
              await handleFilledIn(db, form)
            }
          }
        })
        imported++
      } catch (err) {
        errors++
        console.error(`[Backfill] Błąd importu ${form.id}:`, err instanceof Error ? err.message : err)
      }

      // Throttle to avoid overwhelming Neon HTTP API
      await sleep(150)
    }

    console.log(`[Backfill] Strona ${page + 1}: ${forms.length} form(s), imported=${imported}, skipped(existing)=${batchSkipped}`)

    // Stop if the entire batch already existed — we've caught up
    if (batchSkipped === forms.length) {
      stoppedReason = 'caught_up'
      console.log(`[Backfill] Cały batch już istnieje w DB — zatrzymuję (do ostatniego zapisanego)`)
      break
    }

    if (forms.length < BATCH_SIZE) break // last page

    offset += BATCH_SIZE
    await sleep(200)
  }

  // ── Set event-stream cursor to latest so cron sync continues from now ──
  try {
    const resp = await fetch(`${apiBase}/order/event-stats`, {
      signal:  AbortSignal.timeout(10_000),
      headers: allegroHeaders(accessToken),
    })
    if (resp.ok) {
      const data = await resp.json() as { latestEvent?: { id: string } }
      if (data.latestEvent?.id) {
        await writeCursor(kv, db, data.latestEvent.id)
        console.log(`[Backfill] Cursor ustawiony na najnowszy event ${data.latestEvent.id}`)
      }
    }
  } catch { /* non-critical */ }

  console.log(`[Backfill] Zakończono — imported: ${imported}, skipped: ${skipped}, errors: ${errors}, reason: ${stoppedReason}`)
  return { imported, skipped, errors, stoppedReason }
}
