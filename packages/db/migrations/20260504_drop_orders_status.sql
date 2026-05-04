INSERT INTO order_status_history
       (order_id, category, previous_value, new_value, source, source_ref, metadata, occurred_at)
SELECT o.id,
       'status',
       latest.new_value,
       o.status::text,
       'backfill',
       'drop-orders-status-column',
       jsonb_build_object('source_column', 'orders.status'),
       COALESCE(o.updated_at, now())
FROM orders o
LEFT JOIN LATERAL (
  SELECT osh.new_value
  FROM order_status_history osh
  WHERE osh.order_id = o.id
    AND osh.category = 'status'
  ORDER BY osh.occurred_at DESC, osh.id DESC
  LIMIT 1
) latest ON true
WHERE latest.new_value IS DISTINCT FROM o.status::text;

DROP INDEX IF EXISTS orders_status_idx;
ALTER TABLE orders DROP COLUMN IF EXISTS status;
