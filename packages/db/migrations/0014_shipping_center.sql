CREATE TABLE IF NOT EXISTS "shipments" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "external_order_id" varchar(100) NOT NULL,
  "allegro_shipment_id" varchar(100),
  "waybill" varchar(100),
  "carrier_id" varchar(100),
  "carrier_name" varchar(255),
  "delivery_method_id" varchar(100),
  "status_code" varchar(100) DEFAULT 'UNKNOWN' NOT NULL,
  "status_label" varchar(255),
  "occurred_at" timestamp with time zone,
  "pickup_id" varchar(100),
  "label_downloaded_at" timestamp with time zone,
  "protocol_downloaded_at" timestamp with time zone,
  "last_synced_at" timestamp with time zone,
  "sync_error" text,
  "raw" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipment_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "shipment_id" integer NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(255),
  "occurred_at" timestamp with time zone,
  "source" varchar(50) DEFAULT 'allegro_sync' NOT NULL,
  "raw" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipment_commands" (
  "id" serial PRIMARY KEY NOT NULL,
  "command_id" uuid NOT NULL,
  "type" varchar(50) NOT NULL,
  "status" varchar(50) DEFAULT 'IN_PROGRESS' NOT NULL,
  "order_id" integer,
  "shipment_id" integer,
  "allegro_shipment_id" varchar(100),
  "pickup_id" varchar(100),
  "retry_after" integer,
  "request_payload" jsonb,
  "response_payload" jsonb,
  "errors" jsonb,
  "created_by_admin_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "shipment_commands_command_id_unique" UNIQUE("command_id")
);

DO $$ BEGIN
  ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "shipment_commands" ADD CONSTRAINT "shipment_commands_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "shipment_commands" ADD CONSTRAINT "shipment_commands_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "shipment_commands" ADD CONSTRAINT "shipment_commands_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "shipments_order_idx" ON "shipments" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "shipments_external_order_idx" ON "shipments" USING btree ("external_order_id");
CREATE INDEX IF NOT EXISTS "shipments_waybill_idx" ON "shipments" USING btree ("waybill");
CREATE INDEX IF NOT EXISTS "shipments_allegro_shipment_idx" ON "shipments" USING btree ("allegro_shipment_id");
CREATE INDEX IF NOT EXISTS "shipments_status_idx" ON "shipments" USING btree ("status_code","occurred_at");
CREATE UNIQUE INDEX IF NOT EXISTS "shipments_order_waybill_idx" ON "shipments" USING btree ("order_id","waybill");
CREATE INDEX IF NOT EXISTS "shipment_events_shipment_idx" ON "shipment_events" USING btree ("shipment_id","occurred_at");
CREATE INDEX IF NOT EXISTS "shipment_events_code_idx" ON "shipment_events" USING btree ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "shipment_events_unique_idx" ON "shipment_events" USING btree ("shipment_id","code","occurred_at");
CREATE UNIQUE INDEX IF NOT EXISTS "shipment_commands_command_idx" ON "shipment_commands" USING btree ("command_id");
CREATE INDEX IF NOT EXISTS "shipment_commands_type_status_idx" ON "shipment_commands" USING btree ("type","status");
CREATE INDEX IF NOT EXISTS "shipment_commands_order_idx" ON "shipment_commands" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "shipment_commands_shipment_idx" ON "shipment_commands" USING btree ("shipment_id");
