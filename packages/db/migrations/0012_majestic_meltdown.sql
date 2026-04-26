CREATE TYPE "public"."refund_method" AS ENUM('p24', 'allegro_payments', 'bank_transfer_manual');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."return_reason" AS ENUM('damaged', 'wrong_item', 'not_as_described', 'change_of_mind', 'defect', 'mistake', 'other');--> statement-breakpoint
CREATE TYPE "public"."return_source" AS ENUM('shop', 'allegro');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('new', 'in_review', 'approved', 'rejected', 'refunded', 'closed');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'create_return';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'approve_return';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'reject_return';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'issue_refund';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'cancel_refund';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'create_refund_claim';--> statement-breakpoint
ALTER TYPE "public"."stock_change_reason" ADD VALUE 'return';--> statement-breakpoint
CREATE TABLE "allegro_issue_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"allegro_message_id" varchar(100) NOT NULL,
	"author_role" varchar(20) NOT NULL,
	"text" text,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allegro_issue_messages_allegro_message_id_unique" UNIQUE("allegro_message_id")
);
--> statement-breakpoint
CREATE TABLE "allegro_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"allegro_issue_id" varchar(100) NOT NULL,
	"order_id" integer,
	"return_id" integer,
	"status" varchar(50) NOT NULL,
	"subject" varchar(500),
	"last_message_at" timestamp with time zone,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allegro_issues_allegro_issue_id_unique" UNIQUE("allegro_issue_id")
);
--> statement-breakpoint
CREATE TABLE "allegro_refund_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"allegro_claim_id" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"amount" numeric(10, 2),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allegro_refund_claims_allegro_claim_id_unique" UNIQUE("allegro_claim_id")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"method" "refund_method" NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'PLN' NOT NULL,
	"external_id" varchar(255),
	"command_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_command_id_unique" UNIQUE("command_id")
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"order_item_id" integer,
	"product_sku" varchar(255) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"condition" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_number" varchar(50) NOT NULL,
	"order_id" integer NOT NULL,
	"source" "return_source" NOT NULL,
	"status" "return_status" DEFAULT 'new' NOT NULL,
	"reason" "return_reason" NOT NULL,
	"reason_note" text,
	"total_refund_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'PLN' NOT NULL,
	"customer_data" jsonb,
	"allegro" jsonb,
	"restock_applied" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
DROP INDEX "orders_shipment_queue_idx";--> statement-breakpoint
ALTER TABLE "allegro_issue_messages" ADD CONSTRAINT "allegro_issue_messages_issue_id_allegro_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."allegro_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allegro_issues" ADD CONSTRAINT "allegro_issues_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allegro_issues" ADD CONSTRAINT "allegro_issues_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allegro_refund_claims" ADD CONSTRAINT "allegro_refund_claims_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allegro_issue_messages_issue_idx" ON "allegro_issue_messages" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "allegro_issues_order_idx" ON "allegro_issues" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "allegro_issues_return_idx" ON "allegro_issues" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "allegro_issues_status_idx" ON "allegro_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "allegro_refund_claims_return_idx" ON "allegro_refund_claims" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "allegro_refund_claims_status_idx" ON "allegro_refund_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_return_idx" ON "refunds" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_command_id_idx" ON "refunds" USING btree ("command_id");--> statement-breakpoint
CREATE INDEX "return_items_return_idx" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "return_items_order_item_idx" ON "return_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "returns_order_idx" ON "returns" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "returns_status_idx" ON "returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "returns_source_status_idx" ON "returns" USING btree ("source","status");--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "tracking_status";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "tracking_status_code";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "tracking_status_updated_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "tracking_last_event_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipment_state";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipment_carrier";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipment_last_checked_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipment_next_check_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipment_check_attempts";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipment_state_changed_at";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "long_description";