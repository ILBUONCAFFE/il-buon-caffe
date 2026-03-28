/**
 * Allegro Order Sync — Backfill (one-time / on-demand import)
 *
 * Fetches Allegro checkout-forms (newest first) and imports orders that are
 * missing in the local DB.
 *
 * Stop conditions:
 *  - `full=false` (default): stops after CONSECUTIVE_EXISTING_BATCHES_TO_STOP
 *    consecutive batches where every order already exists in DB ("do ostatniego
 *    zapisanego"). Using 2 consecutive batches instead of 1 makes it resilient
 *    to sparse gaps caused by earlier import errors.
 *  - `full=true`: imports ALL orders from Allegro regardless of what's in DB
 *    (skips stop condition — good for total re-import).
 *
 * After the backfill, sets the event-stream cursor to the latest Allegro
 * event so the regular cron sync continues from now onwards.
 */

import { createDbWsPool } from '@repo/db/client'
import { orders } from '@repo/db/schema'
import { eq } from 'drizzle-orm'
import { getAllegroApiBase, type AllegroEnvironment } from '../allegro'
import type { Env } from '../../index'
import type { BackfillResult, AllegroCheckoutForm } from './types'
import { writeCursor, allegroHeaders, sleep, withRetry } from './helpers'
import { handleBought, handleFilledIn, handleReadyForProcessing, handleCancelled } from './handlers'
import { resolveAccessToken } from './resolve-token'
import type { createDb } from '@repo/db/client'

/** How many consecutive all-existing batches before we consider ourselves "caught up". */
const CONSECUTIVE_EXISTING_BATCHES_TO_STOP = 2

export async function backfillAllegroOrders(env: Env, full = false): Promise<BackfillResult> {
  const kv = env.ALLEGRO_KV
  if (!kv) throw new Error('ALLEGRO_KV not configured')

  // Use WebSocket Pool driver — neon HTTP driver hits CF Workers subrequest limit
  // (50 free / 1000 paid) after a few orders. A single WebSocket connection is unlimited.
  const { db, end } = createDbWsPool(env.DATABASE_URL)

  try {
    return await _backfillInner(env, kv, db, full)
  } finally {
    await end()
  }
}

async function _backfillInner(
  env: Env,
  kv: KVNamespace,
  db: ReturnType<typeof createDb>,
  full: boolean,
): Promise<BackfillResult> {
  // ── Resolve access token ────────────────────────────────────────────
  const accessToken = await resolveAccessToken(kv, db, env)
  if (!accessToken) throw new Error('Brak połączenia z Allegro (brak credentials lub błąd deszyfrowania tokenu)')

  const allegroEnv = (env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
  const apiBase    = getAllegroApiBase(allegroEnv)

  // ── Fetch checkout-forms (newest first) in batches ────────────────────
  const BATCH_SIZE = 100
  const MAX_PAGES  = 100   // safety: max 10 000 orders
  let offset                   = 0
  let imported                 = 0
  let skipped                  = 0
  let errors                   = 0
  let consecutiveExistingBatches = 0
  let stoppedReason: BackfillResult['stoppedReason'] = 'end_of_data'

  console.log(`[Backfill] Start — full=${full}, pobieranie zamówień z Allegro (newest first)`)

  for (let page = 0; page < MAX_PAGES; page++) {
    let forms: AllegroCheckoutForm[]
    try {
      const resp = await fetch(
        `${apiBase}/order/checkout-forms?limit=${BATCH_SIZE}&offset=${offset}&sort=-lineItems.boughtAt`,
        { signal: AbortSignal.timeout(15_000), headers: allegroHeaders(accessToken) },
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
      forms = data.checkoutForms ?? []
    } catch (err) {
      console.error(`[Backfill] Fetch error on page ${page + 1}:`, err instanceof Error ? err.message : err)
      stoppedReason = 'api_error'
      break
    }

    if (forms.length === 0) break

    let batchAllExisting = true
    let batchImported    = 0
    let batchSkipped     = 0

    for (const form of forms) {
      // ── Check if order already exists in DB ──────────────────────────
      let existing: { id: number } | undefined
      try {
        const rows = await withRetry(() =>
          db.select({ id: orders.id })
            .from(orders)
            .where(eq(orders.externalId, form.id))
            .limit(1),
          4, // 4 retries for existence check (covers transient Neon wake-up)
        )
        existing = rows[0]
      } catch (err) {
        errors++
        batchAllExisting = false // don't count as "caught up" if check failed
        console.error(`[Backfill] Existence check failed for ${form.id}:`, err instanceof Error ? err.message : err)
        await sleep(1000)
        continue
      }

      if (existing) {
        batchSkipped++
        skipped++
        // Do NOT set batchAllExisting=false — existing orders keep it true
        continue
      }

      // ── Import missing order ─────────────────────────────────────────
      batchAllExisting = false // there are new orders in this batch
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
        }, 3)
        imported++
        batchImported++
      } catch (err) {
        errors++
        console.error(`[Backfill] Błąd importu ${form.id}:`, err instanceof Error ? err.message : err)
      }

      // Throttle to avoid overwhelming Neon
      await sleep(100)
    }

    console.log(
      `[Backfill] Strona ${page + 1}: ${forms.length} form(s), ` +
      `imported=${batchImported}, existing=${batchSkipped}, allExisting=${batchAllExisting}`,
    )

    // ── Stop condition (only when not full import) ───────────────────
    if (!full && batchAllExisting) {
      consecutiveExistingBatches++
      if (consecutiveExistingBatches >= CONSECUTIVE_EXISTING_BATCHES_TO_STOP) {
        stoppedReason = 'caught_up'
        console.log(
          `[Backfill] ${consecutiveExistingBatches} kolejne batch'e — wszystkie zamówienia istnieją w DB. ` +
          `Zatrzymuję (do ostatniego zapisanego).`,
        )
        break
      }
      console.log(`[Backfill] Batch w całości istniejący (${consecutiveExistingBatches}/${CONSECUTIVE_EXISTING_BATCHES_TO_STOP}) — kontynuuję weryfikację`)
    } else {
      // Reset counter — batch had new orders or an error
      consecutiveExistingBatches = 0
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
