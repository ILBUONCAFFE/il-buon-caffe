CREATE TYPE "public"."allegro_env" AS ENUM('sandbox', 'production');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('login', 'logout', 'view_customer', 'view_order', 'export_data', 'update_customer', 'anonymize_customer', 'admin_action', 'update_stock', 'password_reset');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms', 'privacy', 'marketing', 'analytics');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('shop', 'allegro');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."retention_status" AS ENUM('active', 'archivable', 'anonymized', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."stock_change_reason" AS ENUM('order', 'manual', 'inventory', 'damage', 'allegro_sync', 'cancellation');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TABLE "allegro_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token_type" varchar(20) DEFAULT 'Bearer',
	"scope" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"environment" varchar(20) DEFAULT 'sandbox' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allegro_state" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allegro_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_sku" varchar(50),
	"offer_id" varchar(50),
	"action" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error_message" text,
	"error_code" varchar(50),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" "audit_action" NOT NULL,
	"target_user_id" integer,
	"target_order_id" integer,
	"details" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"layout_config" jsonb,
	"image_url" varchar(500),
	"meta_title" varchar(200),
	"meta_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"version" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_sku" varchar(255) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"image_url" varchar(500),
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"user_id" integer,
	"customer_data" jsonb NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"source" "order_source" DEFAULT 'shop' NOT NULL,
	"external_id" varchar(100),
	"subtotal" numeric(10, 2) NOT NULL,
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2),
	"total" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'PLN' NOT NULL,
	"total_pln" numeric(10, 2),
	"payment_method" varchar(50),
	"p24_session_id" varchar(255),
	"p24_order_id" varchar(255),
	"p24_merchant_id" varchar(50),
	"p24_transaction_id" varchar(100),
	"p24_status" varchar(20),
	"paid_at" timestamp with time zone,
	"shipping_method" varchar(255),
	"tracking_number" varchar(100),
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"idempotency_key" varchar(100),
	"retention_status" "retention_status" DEFAULT 'active',
	"notes" text,
	"internal_notes" text,
	"reservation_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_sku" varchar(50) NOT NULL,
	"url" varchar(500) NOT NULL,
	"alt_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"sku" varchar(50) PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"long_description" text,
	"category_id" integer,
	"price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'PLN' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"image_url" varchar(500),
	"origin" varchar(255),
	"year" varchar(10),
	"weight" integer,
	"origin_country" varchar(100),
	"origin_region" varchar(150),
	"grape_variety" varchar(255),
	"wine_details" jsonb,
	"coffee_details" jsonb,
	"meta_title" varchar(200),
	"meta_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"allegro_offer_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_allegro_offer_id_unique" UNIQUE("allegro_offer_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE "stock_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_sku" varchar(50) NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"change" integer NOT NULL,
	"reason" varchar(50) NOT NULL,
	"order_id" integer,
	"admin_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"version" varchar(20),
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(45),
	"token_version" integer DEFAULT 0 NOT NULL,
	"gdpr_consent_date" timestamp with time zone,
	"marketing_consent" boolean DEFAULT false,
	"analytics_consent" boolean DEFAULT false,
	"terms_version" varchar(20),
	"privacy_version" varchar(20),
	"consent_ip_address" varchar(45),
	"consent_user_agent" text,
	"data_retention_until" date,
	"anonymized_at" timestamp with time zone,
	"anonymized" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_sku_products_sku_fk" FOREIGN KEY ("product_sku") REFERENCES "public"."products"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_changes" ADD CONSTRAINT "stock_changes_product_sku_products_sku_fk" FOREIGN KEY ("product_sku") REFERENCES "public"."products"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_changes" ADD CONSTRAINT "stock_changes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_changes" ADD CONSTRAINT "stock_changes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allegro_sync_log_sku_idx" ON "allegro_sync_log" USING btree ("product_sku");--> statement-breakpoint
CREATE INDEX "allegro_sync_log_action_idx" ON "allegro_sync_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "allegro_sync_log_status_idx" ON "allegro_sync_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "allegro_sync_log_created_idx" ON "allegro_sync_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_admin_idx" ON "audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_target_user_idx" ON "audit_log" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "categories_sort_idx" ON "categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "categories_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_type_version_idx" ON "legal_documents" USING btree ("type","version");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_sku_idx" ON "order_items" USING btree ("product_sku");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_source_idx" ON "orders" USING btree ("source");--> statement-breakpoint
CREATE INDEX "orders_external_idx" ON "orders" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_idx" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_reservation_idx" ON "orders" USING btree ("reservation_expires_at");--> statement-breakpoint
CREATE INDEX "orders_retention_idx" ON "orders" USING btree ("retention_status","created_at");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_sku");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "products_allegro_idx" ON "products" USING btree ("allegro_offer_id");--> statement-breakpoint
CREATE INDEX "products_stock_idx" ON "products" USING btree ("stock");--> statement-breakpoint
CREATE INDEX "products_origin_country_idx" ON "products" USING btree ("origin_country");--> statement-breakpoint
CREATE INDEX "products_origin_region_idx" ON "products" USING btree ("origin_region");--> statement-breakpoint
CREATE INDEX "products_grape_variety_idx" ON "products" USING btree ("grape_variety");--> statement-breakpoint
CREATE INDEX "products_country_region_idx" ON "products" USING btree ("origin_country","origin_region");--> statement-breakpoint
CREATE INDEX "sessions_user_active_idx" ON "sessions" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "stock_changes_sku_idx" ON "stock_changes" USING btree ("product_sku");--> statement-breakpoint
CREATE INDEX "stock_changes_created_idx" ON "stock_changes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_consents_user_idx" ON "user_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_consents_type_idx" ON "user_consents" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "user_consents_version_idx" ON "user_consents" USING btree ("version");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_anonymized_idx" ON "users" USING btree ("anonymized_at");--> statement-breakpoint
CREATE INDEX "users_locked_idx" ON "users" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "users_retention_idx" ON "users" USING btree ("data_retention_until");