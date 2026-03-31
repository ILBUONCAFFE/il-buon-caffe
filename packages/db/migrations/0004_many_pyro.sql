ALTER TABLE "orders" ADD COLUMN "invoice_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_invoice_idx" ON "orders" USING btree ("invoice_required");