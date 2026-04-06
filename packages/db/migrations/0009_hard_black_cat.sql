CREATE TABLE "catalogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" uuid DEFAULT gen_random_uuid() NOT NULL,
	"r2_key" varchar(500) NOT NULL,
	"page_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalogs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalogs_slug_idx" ON "catalogs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalogs_active_idx" ON "catalogs" USING btree ("is_active");