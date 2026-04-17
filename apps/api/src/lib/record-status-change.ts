/**
 * Append-only status change recorder. Atomic via data-modifying CTE —
 * neon-http driver does NOT support db.transaction(), so a single SQL
 * statement is the only way to guarantee consistency between orders update
 * and history insert.
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
        SELECT status::text AS v FROM orders WHERE id = ${orderId}
      ),
      upd AS (
        UPDATE orders
        SET    status     = ${newValue}::order_status,
               updated_at = now()
        WHERE  id             = ${orderId}
          AND  status::text  IS DISTINCT FROM ${newValue}
        RETURNING 1
      ),
      ins AS (
        INSERT INTO order_status_history
               (order_id, category, previous_value, new_value, source, source_ref, metadata)
        SELECT ${orderId},
               'status',
               prev.v,
               ${newValue},
               ${source}::status_source,
               ${sourceRef},
               ${metadataJson}::jsonb
        FROM   prev
        WHERE  EXISTS (SELECT 1 FROM upd)
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM ins) AS recorded
    `);
  } else {
    result = await db.execute(sql`
      WITH prev AS (
        SELECT tracking_status_code AS v FROM orders WHERE id = ${orderId}
      ),
      upd AS (
        UPDATE orders
        SET    tracking_status_code       = ${newValue},
               tracking_status_updated_at = now(),
               updated_at                = now()
        WHERE  id                    = ${orderId}
          AND  tracking_status_code IS DISTINCT FROM ${newValue}
        RETURNING 1
      ),
      ins AS (
        INSERT INTO order_status_history
               (order_id, category, previous_value, new_value, source, source_ref, metadata)
        SELECT ${orderId},
               'tracking',
               prev.v,
               ${newValue},
               ${source}::status_source,
               ${sourceRef},
               ${metadataJson}::jsonb
        FROM   prev
        WHERE  EXISTS (SELECT 1 FROM upd)
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM ins) AS recorded
    `);
  }

  return (result.rows[0]?.recorded as boolean) ?? false;
}
