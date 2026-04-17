-- Rozszerzenie order_status o nowe stany (każdy ALTER osobno — PG wymaga tego dla ADD VALUE)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_transit' AFTER 'shipped';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery' AFTER 'in_transit';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_requested' AFTER 'delivered';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_in_transit' AFTER 'return_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_received' AFTER 'return_in_transit';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded' AFTER 'return_received';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed' AFTER 'refunded';

-- Nowy enum dla atrybucji zmian statusu
DO $$ BEGIN
  CREATE TYPE status_source AS ENUM (
    'system', 'admin', 'allegro_sync', 'carrier_sync', 'p24_webhook', 'backfill'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela append-only historii zmian
CREATE TABLE IF NOT EXISTS order_status_history (
  id            serial PRIMARY KEY,
  order_id      integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category      varchar(20) NOT NULL,
  previous_value varchar(100),
  new_value     varchar(100) NOT NULL,
  source        status_source NOT NULL,
  source_ref    varchar(200),
  metadata      jsonb,
  occurred_at   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS osh_order_idx    ON order_status_history (order_id, occurred_at);
CREATE INDEX IF NOT EXISTS osh_category_idx ON order_status_history (category, occurred_at);
CREATE INDEX IF NOT EXISTS osh_source_idx   ON order_status_history (source);
