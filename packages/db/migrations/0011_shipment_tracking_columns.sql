CREATE TYPE "public"."status_source" AS ENUM('system', 'admin', 'allegro_sync', 'carrier_sync', 'p24_webhook', 'backfill');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'in_transit' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'out_for_delivery' BEFORE 'delivered';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'return_requested' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'return_in_transit' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'return_received' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'refunded' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'disputed' BEFORE 'cancelled';--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"category" varchar(20) NOT NULL,
	"previous_value" varchar(100),
	"new_value" varchar(100) NOT NULL,
	"source" "status_source" NOT NULL,
	"source_ref" varchar(200),
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "orders_tracking_queue_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "allegro_shipments_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_state" varchar(32);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_carrier" varchar(32);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_next_check_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_check_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipment_state_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "osh_order_idx" ON "order_status_history" USING btree ("order_id","occurred_at");--> statement-breakpoint
CREATE INDEX "osh_category_idx" ON "order_status_history" USING btree ("category","occurred_at");--> statement-breakpoint
CREATE INDEX "osh_source_idx" ON "order_status_history" USING btree ("source");--> statement-breakpoint
CREATE INDEX "orders_shipment_queue_idx" ON "orders" USING btree ("shipment_next_check_at") WHERE "orders"."source" = 'allegro'
             AND "orders"."shipment_state" IS NOT NULL
             AND "orders"."shipment_state" NOT IN ('delivered', 'stale');