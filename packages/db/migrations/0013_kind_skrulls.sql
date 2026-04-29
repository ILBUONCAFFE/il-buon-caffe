ALTER TABLE "products" ADD COLUMN "allegro_sync_price" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "allegro_sync_stock" boolean DEFAULT false NOT NULL;