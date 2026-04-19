/**
 * Single-cycle returns reconciler.
 * Called by scheduler on each cron tick.
 */

import { eq } from 'drizzle-orm'
import { createDb } from '@repo/db/client'
import { orders, allegroIssues } from '@repo/db/schema'
import { listCustomerReturns, listIssues, AllegroReturnsRateLimitError } from './client'
import type { AllegroIssue } from './client'
import { upsertAllegroReturn } from './reconciler'
import { resolveAccessToken } from '../allegro-orders/resolve-token'
import type { Env } from '../../index'

// Env bindings needed by the poller (subset of Env)
export interface PollEnv {
  DATABASE_URL:                  string
  ALLEGRO_KV:                    KVNamespace
  ALLEGRO_ENVIRONMENT:           'sandbox' | 'production'
  ALLEGRO_TOKEN_ENCRYPTION_KEY?: string
}

export interface PollCycleSummary {
  processed:   number
  upserted:    number
  newReturns:  number
  failures:    number
  rateLimited: boolean
  nextCursor?: string
}

// KV key for the event cursor (last processed offset / updatedAt timestamp)
const RETURNS_CURSOR_KV = 'returns:cursor'

const ALLEGRO_API_BASE_URLS = {
  production: 'https://api.allegro.pl',
  sandbox:    'https://api.allegro.pl.allegrosandbox.pl',
} as const

export async function pollReturnsCycle(env: PollEnv): Promise<PollCycleSummary> {
  const db = createDb(env.DATABASE_URL)
  const accessToken = await resolveAccessToken(env.ALLEGRO_KV, db, env as unknown as Env)
  if (!accessToken) {
    console.warn('[Returns] skip cycle — no access token available')
    return { processed: 0, upserted: 0, newReturns: 0, failures: 0, rateLimited: false }
  }

  const apiBase = ALLEGRO_API_BASE_URLS[env.ALLEGRO_ENVIRONMENT] ?? ALLEGRO_API_BASE_URLS.production

  // Read cursor from KV (updatedAt timestamp for incremental sync)
  const lastCursor = await env.ALLEGRO_KV.get(RETURNS_CURSOR_KV)
  // For first run, look back 90 days (Allegro keeps returns for ~90 days)
  const createdAtGte = lastCursor ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  let processed  = 0
  let upserted   = 0
  let newReturns = 0
  let failures   = 0
  let rateLimited = false

  try {
    const response = await listCustomerReturns(
      { createdAtGte, limit: 25 },
      apiBase,
      accessToken,
      db,
    )

    const allegroReturns = response.customerReturns ?? []
    console.log(`[Returns] fetched ${allegroReturns.length} returns from Allegro`)

    for (const allegroReturn of allegroReturns) {
      processed++
      try {
        // Look up the orderId in our DB via the Allegro checkout form ID
        const orderRows = await db
          .select({ id: orders.id })
          .from(orders)
          .where(eq(orders.externalId, allegroReturn.orderId))
          .limit(1)

        const orderId = orderRows[0]?.id
        if (!orderId) {
          console.warn(`[Returns] no local order for allegroOrderId=${allegroReturn.orderId} — skipping`)
          failures++
          continue
        }

        const result = await upsertAllegroReturn(db, allegroReturn, orderId)
        upserted++
        if (result.isNew) newReturns++

        console.log(
          `[Returns] upsert returnId=${result.returnId} isNew=${result.isNew} statusChanged=${result.statusChanged}`,
        )
      } catch (err) {
        failures++
        console.error(
          `[Returns] upsert failed allegroReturnId=${allegroReturn.id}:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    }

    // Advance cursor to now so next cycle is incremental
    if (upserted > 0) {
      const nextCursor = new Date().toISOString()
      await env.ALLEGRO_KV.put(RETURNS_CURSOR_KV, nextCursor)
      return { processed, upserted, newReturns, failures, rateLimited, nextCursor }
    }
  } catch (err) {
    if (err instanceof AllegroReturnsRateLimitError) {
      rateLimited = true
      console.warn(`[Returns] rate limited — retryAfterSec=${err.retryAfterSec}`)
      return { processed, upserted, newReturns, failures, rateLimited }
    }
    console.error('[Returns] list failed:', err instanceof Error ? err.message : String(err))
    throw err
  }

  return { processed, upserted, newReturns, failures, rateLimited }
}

// ── Issues (disputes) sweep ──────────────────────────────────────────────────

export async function pollIssuesCycle(
  env: PollEnv,
): Promise<{ processed: number; failures: number; rateLimited: boolean }> {
  const db = createDb(env.DATABASE_URL)
  const accessToken = await resolveAccessToken(env.ALLEGRO_KV, db, env as unknown as Env)
  if (!accessToken) {
    console.warn('[Issues] skip cycle — no access token available')
    return { processed: 0, failures: 0, rateLimited: false }
  }

  const apiBase = ALLEGRO_API_BASE_URLS[env.ALLEGRO_ENVIRONMENT] ?? ALLEGRO_API_BASE_URLS.production

  try {
    const response = await listIssues({ limit: 25 }, apiBase, accessToken, db)
    const issues: AllegroIssue[] = response.issues ?? []
    console.log(`[Issues] fetched ${issues.length} issues from Allegro`)

    let processed = 0
    let failures  = 0

    for (const issue of issues) {
      try {
        await db
          .insert(allegroIssues)
          .values({
            allegroIssueId: issue.id,
            orderId:        null,
            returnId:       null,
            status:         issue.status,
            subject:        issue.subject ?? null,
            lastMessageAt:  issue.lastMessageAt ? new Date(issue.lastMessageAt) : null,
            payload:        issue as unknown as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: allegroIssues.allegroIssueId,
            set: {
              status:        issue.status,
              subject:       issue.subject ?? null,
              lastMessageAt: issue.lastMessageAt ? new Date(issue.lastMessageAt) : null,
              payload:       issue as unknown as Record<string, unknown>,
              updatedAt:     new Date(),
            },
          })
        processed++
      } catch (err) {
        failures++
        console.error(
          `[Issues] upsert failed issueId=${issue.id}:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    }

    return { processed, failures, rateLimited: false }
  } catch (err) {
    if (err instanceof AllegroReturnsRateLimitError) {
      console.warn('[Issues] rate limited')
      return { processed: 0, failures: 0, rateLimited: true }
    }
    console.error('[Issues] list failed:', err instanceof Error ? err.message : String(err))
    throw err  // let scheduler's catch open the circuit breaker
  }
}
