DROP INDEX "orders_invoice_idx";--> statement-breakpoint
CREATE INDEX "orders_invoice_idx" ON "orders" USING btree ("invoice_required") WHERE "orders"."invoice_required" = true;