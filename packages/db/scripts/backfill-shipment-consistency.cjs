#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

const APPLY_FLAG = '--apply';
const FINAL_STATUSES = [
  'delivered',
  'cancelled',
  'refunded',
  'return_requested',
  'return_in_transit',
  'return_received',
  'disputed',
];

const ENROLL_STATUSES = [
  'paid',
  'processing',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

function parseArgs() {
  const apply = process.argv.includes(APPLY_FLAG);
  return { apply };
}

function asInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function getSnapshot(sql) {
  const [row] = await sql.query(
    `
      SELECT
        (SELECT COUNT(*)
         FROM orders
         WHERE source = 'allegro'
           AND external_id IS NOT NULL
           AND shipment_state IS NULL
           AND status = ANY($1::order_status[])
        ) AS eligible_null_shipment,

        (SELECT COUNT(*)
         FROM orders
         WHERE source = 'allegro'
           AND external_id IS NOT NULL
           AND shipment_state IS NULL
           AND status = ANY($1::order_status[])
           AND allegro_fulfillment_status = 'PICKED_UP'
        ) AS eligible_null_shipment_picked_up,

        (SELECT COUNT(*)
         FROM orders
         WHERE source = 'allegro'
           AND external_id IS NOT NULL
           AND allegro_fulfillment_status = 'PICKED_UP'
           AND shipment_state IS DISTINCT FROM 'delivered'
        ) AS picked_up_shipment_mismatch,

        (SELECT COUNT(*)
         FROM orders
         WHERE source = 'allegro'
           AND external_id IS NOT NULL
           AND status <> 'delivered'
           AND (
             shipment_state = 'delivered'
             OR allegro_fulfillment_status = 'PICKED_UP'
           )
        ) AS eligible_status_promotion,

        (SELECT COUNT(*)
         FROM orders
         WHERE source = 'allegro'
           AND shipment_state = 'delivered'
           AND status <> 'delivered'
        ) AS delivered_state_status_mismatch
    `,
    [ENROLL_STATUSES],
  );

  return {
    eligibleNullShipment: asInt(row.eligible_null_shipment),
    eligibleNullShipmentPickedUp: asInt(row.eligible_null_shipment_picked_up),
    pickedUpShipmentMismatch: asInt(row.picked_up_shipment_mismatch),
    eligibleStatusPromotion: asInt(row.eligible_status_promotion),
    deliveredStateStatusMismatch: asInt(row.delivered_state_status_mismatch),
  };
}

async function applyBackfill(sql) {
  const enrolledRows = await sql.query(
    `
      UPDATE orders
      SET
        shipment_state = CASE
          WHEN allegro_fulfillment_status = 'PICKED_UP' OR status = 'delivered' THEN 'delivered'
          WHEN allegro_fulfillment_status = 'SENT' OR status IN ('shipped', 'in_transit', 'out_for_delivery') THEN 'in_transit'
          WHEN allegro_fulfillment_status IN ('READY_FOR_SHIPMENT', 'PROCESSING', 'NEW') OR status IN ('paid', 'processing') THEN 'awaiting_handover'
          ELSE 'awaiting_handover'
        END,
        shipment_carrier = COALESCE(shipment_carrier, 'allegro'),
        shipment_next_check_at = CASE
          WHEN allegro_fulfillment_status = 'PICKED_UP' OR status = 'delivered' THEN NULL
          WHEN allegro_fulfillment_status = 'SENT' OR status IN ('shipped', 'in_transit', 'out_for_delivery') THEN now() + interval '6 hours'
          WHEN allegro_fulfillment_status IN ('READY_FOR_SHIPMENT', 'PROCESSING', 'NEW') OR status IN ('paid', 'processing') THEN now() + interval '30 minutes'
          ELSE now() + interval '30 minutes'
        END,
        shipment_state_changed_at = COALESCE(shipment_state_changed_at, shipped_at, paid_at, updated_at, created_at, now()),
        shipment_last_checked_at = COALESCE(shipment_last_checked_at, now()),
        shipment_check_attempts = 0,
        tracking_status_code = CASE
          WHEN allegro_fulfillment_status = 'PICKED_UP' THEN COALESCE(tracking_status_code, 'PICKED_UP')
          ELSE tracking_status_code
        END,
        tracking_status = CASE
          WHEN allegro_fulfillment_status = 'PICKED_UP' THEN COALESCE(tracking_status, 'Przesylka dostarczona')
          ELSE tracking_status
        END,
        delivered_at = CASE
          WHEN allegro_fulfillment_status = 'PICKED_UP' OR status = 'delivered'
            THEN COALESCE(delivered_at, shipment_state_changed_at, shipped_at, paid_at, updated_at, now())
          ELSE delivered_at
        END,
        updated_at = now()
      WHERE source = 'allegro'
        AND external_id IS NOT NULL
        AND shipment_state IS NULL
        AND status = ANY($1::order_status[])
      RETURNING id
    `,
    [ENROLL_STATUSES],
  );

  const pickedUpStateRows = await sql.query(
    `
      UPDATE orders
      SET
        shipment_state = 'delivered',
        shipment_next_check_at = NULL,
        shipment_state_changed_at = COALESCE(shipment_state_changed_at, updated_at, now()),
        shipment_last_checked_at = now(),
        shipment_check_attempts = 0,
        shipment_carrier = COALESCE(shipment_carrier, 'allegro'),
        tracking_status_code = COALESCE(tracking_status_code, 'PICKED_UP'),
        tracking_status = COALESCE(tracking_status, 'Przesylka dostarczona'),
        delivered_at = COALESCE(delivered_at, shipment_state_changed_at, shipped_at, paid_at, updated_at, now()),
        updated_at = now()
      WHERE source = 'allegro'
        AND external_id IS NOT NULL
        AND allegro_fulfillment_status = 'PICKED_UP'
        AND shipment_state IS DISTINCT FROM 'delivered'
      RETURNING id
    `,
  );

  const [promotion] = await sql.query(
    `
      WITH candidates AS (
        SELECT id, status::text AS previous_status
        FROM orders
        WHERE source = 'allegro'
          AND external_id IS NOT NULL
          AND status <> 'delivered'
          AND (
            shipment_state = 'delivered'
            OR allegro_fulfillment_status = 'PICKED_UP'
          )
          AND status <> ALL($1::order_status[])
      ),
      upd AS (
        UPDATE orders o
        SET
          status = 'delivered',
          delivered_at = COALESCE(o.delivered_at, o.shipment_state_changed_at, o.shipped_at, o.paid_at, o.updated_at, now()),
          updated_at = now()
        FROM candidates c
        WHERE o.id = c.id
        RETURNING o.id, c.previous_status
      ),
      ins AS (
        INSERT INTO order_status_history (
          order_id,
          category,
          previous_value,
          new_value,
          source,
          source_ref,
          metadata,
          occurred_at
        )
        SELECT
          u.id,
          'status',
          u.previous_status,
          'delivered',
          'backfill',
          'shipment-consistency-2026-04-22',
          jsonb_build_object('reason', 'shipment_state_or_fulfillment_terminal'),
          now()
        FROM upd u
        RETURNING id
      )
      SELECT
        (SELECT COUNT(*) FROM upd) AS updated_count,
        (SELECT COUNT(*) FROM ins) AS inserted_history_count
    `,
    [FINAL_STATUSES],
  );

  return {
    enrolledFromNullShipmentState: enrolledRows.length,
    forcedPickedUpStateToDelivered: pickedUpStateRows.length,
    promotedStatusToDelivered: asInt(promotion.updated_count),
    insertedStatusHistory: asInt(promotion.inserted_history_count),
  };
}

async function main() {
  const { apply } = parseArgs();
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(dbUrl);
  const before = await getSnapshot(sql);

  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', before }, null, 2));
    return;
  }

  const applied = await applyBackfill(sql);
  const after = await getSnapshot(sql);

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        before,
        applied,
        after,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(`SHIPMENT_BACKFILL_ERROR:${err.message}`);
  process.exit(1);
});
