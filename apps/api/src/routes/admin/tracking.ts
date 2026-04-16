import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { requireAdminOrProxy } from '../../middleware/auth'
import { TrackingQueueManager } from '../../lib/allegro-orders/tracking-queue'
import { buildQueueFromDb } from '../../lib/allegro-orders/tracking-refresh'
import type { Env } from '../../index'

export const adminTrackingRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /admin/tracking/queue  🛡️
// Stan kolejki trackingu: rozmiar, ile due, kiedy ostatni rebuild, pierwsze 20 wpisów.
// ============================================
adminTrackingRouter.get('/queue', requireAdminOrProxy(), async (c) => {
  try {
    const queue = await TrackingQueueManager.load(c.env.ALLEGRO_KV)
    const due = queue.getDue(200)

    return c.json({
      data: {
        size: queue.size,
        dueNow: due.length,
        needsRebuild: queue.needsRebuild,
        summary: queue.summary(),
        dueEntries: due.slice(0, 20).map((e) => ({
          orderId: e.id,
          externalId: e.eid,
          nextCheckAt: new Date(e.at).toISOString(),
          priority: e.p,
          statusCode: e.s,
          addedAt: new Date(e.ts).toISOString(),
        })),
      },
    })
  } catch (err) {
    return c.json({ error: { code: 'QUEUE_READ_ERROR', message: String(err) } }, 500)
  }
})

// ============================================
// POST /admin/tracking/queue/rebuild  🛡️
// Wymusza przebudowę kolejki z DB. Używaj gdy kolejka jest uszkodzona lub po migracji.
// ============================================
adminTrackingRouter.post('/queue/rebuild', requireAdminOrProxy(), async (c) => {
  try {
    const queue = await TrackingQueueManager.load(c.env.ALLEGRO_KV)
    const db = createDb(c.env.DATABASE_URL)
    const rows = await buildQueueFromDb(db)

    for (const row of rows) {
      queue.enqueue(
        row.id,
        row.externalId,
        row.trackingStatusCode,
        row.trackingStatusUpdatedAt?.getTime(),
      )
    }
    queue.markRebuilt()
    await queue.save(c.env.ALLEGRO_KV)

    return c.json({
      data: {
        rebuilt: rows.length,
        summary: queue.summary(),
      },
    })
  } catch (err) {
    return c.json({ error: { code: 'QUEUE_REBUILD_ERROR', message: String(err) } }, 500)
  }
})
