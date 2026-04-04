-- Partial index dla cron-based tracking status refresh
-- Pokrywa zapytanie selectTrackingRefreshCandidates:
--   WHERE source = 'allegro'
--     AND allegro_shipment_id IS NOT NULL
--     AND status IN ('shipped', 'delivered')
--   ORDER BY tracking_status_updated_at ASC NULLS FIRST

CREATE INDEX IF NOT EXISTS idx_orders_tracking_refresh
  ON orders (tracking_status_updated_at ASC NULLS FIRST, updated_at DESC)
  WHERE source = 'allegro'
    AND allegro_shipment_id IS NOT NULL
    AND status IN ('shipped', 'delivered');
