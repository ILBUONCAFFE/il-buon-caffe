/**
 * Append-only status change recorder. Atomic via data-modifying CTE —
 * neon-http driver does NOT support db.transaction(), so a single SQL
 * statement is the only way to keep order metadata and history consistent.
 *
 * Returns true when a transition was recorded, false when new value equals
 * current (no-op, caller can skip secondary updates).
 */
import { sql } from 'drizzle-orm';
import type { Database } from '@repo/db/client';

export type StatusCategory = 'status' | 'tracking';

export type StatusSource =
  | 'system'
  | 'admin'
  | 'allegro_sync'
  | 'carrier_sync'
  | 'p24_webhook'
  | 'backfill';

export interface RecordStatusChangeInput {
  orderId: number;
  category: StatusCategory;
  newValue: string;
  source: StatusSource;
  sourceRef?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordStatusChange(
  db: Database,
  input: RecordStatusChangeInput,
): Promise<boolean> {
  const { orderId, category, newValue, source, sourceRef = null, metadata = null } = input;

  const metadataJson = metadata !== null ? JSON.stringify(metadata) : null;

  let result: { rows: Record<string, unknown>[] };

  if (category === 'status') {
    result = await db.execute(sql`
      WITH prev AS (
        SELECT new_value AS v
        FROM   order_status_history
        WHERE  order_id = ${orderId} AND category = 'status'
        ORDER  BY occurred_at DESC, id DESC
        LIMIT  1
      ),
      upd AS (
        UPDATE orders
        SET    updated_at = now()
        WHERE  id             = ${orderId}
          AND  COALESCE((SELECT v FROM prev), '') IS DISTINCT FROM ${newValue}
        RETURNING 1
      ),
      ins AS (
        INSERT INTO order_status_history
               (order_id, category, previous_value, new_value, source, source_ref, metadata)
        SELECT ${orderId},
               'status',
               (SELECT v FROM prev),
               ${newValue},
               ${source}::status_source,
               ${sourceRef},
               ${metadataJson}::jsonb
        WHERE  EXISTS (SELECT 1 FROM upd)
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM ins) AS recorded
    `);
  } else {
    // Tracking history: append only when new_value differs from the latest tracking entry.
    // Source of truth for current tracking status is allegro_shipments_snapshot, not an
    // orders column — so we look up "previous" from order_status_history itself.
    result = await db.execute(sql`
      WITH prev AS (
        SELECT new_value AS v
        FROM   order_status_history
        WHERE  order_id = ${orderId} AND category = 'tracking'
        ORDER  BY occurred_at DESC
        LIMIT  1
      ),
      ins AS (
        INSERT INTO order_status_history
               (order_id, category, previous_value, new_value, source, source_ref, metadata)
        SELECT ${orderId},
               'tracking',
               (SELECT v FROM prev),
               ${newValue},
               ${source}::status_source,
               ${sourceRef},
               ${metadataJson}::jsonb
        WHERE  COALESCE((SELECT v FROM prev), '') IS DISTINCT FROM ${newValue}
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM ins) AS recorded
    `);
  }

  return (result.rows[0]?.recorded as boolean) ?? false;
}
