-- Drop legacy tracking_* columns superseded by allegro_shipments_snapshot + order_status_history.
-- trackingNumber stays — used for manual entry on shop orders + headline display.

DROP INDEX IF EXISTS orders_tracking_refresh_idx;
DROP INDEX IF EXISTS orders_shipment_queue_idx;

ALTER TABLE orders DROP COLUMN IF EXISTS tracking_status;
ALTER TABLE orders DROP COLUMN IF EXISTS tracking_status_code;
ALTER TABLE orders DROP COLUMN IF EXISTS tracking_status_updated_at;
ALTER TABLE orders DROP COLUMN IF EXISTS tracking_last_event_at;

-- Drop optional shipment_* columns from removed auto-tracking layer (idempotent)
ALTER TABLE orders DROP COLUMN IF EXISTS shipment_state;
ALTER TABLE orders DROP COLUMN IF EXISTS shipment_carrier;
ALTER TABLE orders DROP COLUMN IF EXISTS shipment_last_checked_at;
ALTER TABLE orders DROP COLUMN IF EXISTS shipment_next_check_at;
ALTER TABLE orders DROP COLUMN IF EXISTS shipment_check_attempts;
ALTER TABLE orders DROP COLUMN IF EXISTS shipment_state_changed_at;
