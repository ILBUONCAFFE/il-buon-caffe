-- ============================================================
-- 0012_returns_backend.sql
-- Returns / Refunds / Disputes system
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction.
--       Apply statements 2–8 outside BEGIN/COMMIT.
-- ============================================================

-- 1. New enums
CREATE TYPE "return_status" AS ENUM ('new', 'in_review', 'approved', 'rejected', 'refunded', 'closed');
CREATE TYPE "return_reason" AS ENUM ('damaged', 'wrong_item', 'not_as_described', 'change_of_mind', 'defect', 'mistake', 'other');
CREATE TYPE "return_source" AS ENUM ('shop', 'allegro');
CREATE TYPE "refund_method" AS ENUM ('p24', 'allegro_payments', 'bank_transfer_manual');
CREATE TYPE "refund_status" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'rejected');

-- 2–7. Extend existing enums (run outside transaction)
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'create_return';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'approve_return';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reject_return';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'issue_refund';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'cancel_refund';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'create_refund_claim';
ALTER TYPE "stock_change_reason" ADD VALUE IF NOT EXISTS 'return';

-- 8. returns table
CREATE TABLE "returns" (
  "id"                  serial          PRIMARY KEY,
  "return_number"       varchar(50)     NOT NULL UNIQUE,
  "order_id"            integer         NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "source"              "return_source" NOT NULL,
  "status"              "return_status" NOT NULL DEFAULT 'new',
  "reason"              "return_reason" NOT NULL,
  "reason_note"         text,
  "total_refund_amount" decimal(10,2),
  "currency"            varchar(3)      NOT NULL DEFAULT 'PLN',
  "customer_data"       jsonb,
  "allegro"             jsonb,
  "restock_applied"     boolean         NOT NULL DEFAULT false,
  "closed_at"           timestamptz,
  "created_at"          timestamptz     NOT NULL DEFAULT now(),
  "updated_at"          timestamptz     NOT NULL DEFAULT now()
);
CREATE INDEX "returns_order_idx"          ON "returns"("order_id");
CREATE INDEX "returns_status_idx"         ON "returns"("status");
CREATE INDEX "returns_source_status_idx"  ON "returns"("source", "status");

-- 9. return_items table
CREATE TABLE "return_items" (
  "id"            serial      PRIMARY KEY,
  "return_id"     integer     NOT NULL REFERENCES "returns"("id") ON DELETE CASCADE,
  "order_item_id" integer     REFERENCES "order_items"("id"),
  "product_sku"   varchar(255) NOT NULL,
  "product_name"  varchar(255) NOT NULL,
  "quantity"      integer     NOT NULL,
  "unit_price"    decimal(10,2) NOT NULL,
  "total_price"   decimal(10,2) NOT NULL,
  "condition"     varchar(20),
  "created_at"    timestamptz  NOT NULL DEFAULT now(),
  "updated_at"    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX "return_items_return_idx"     ON "return_items"("return_id");
CREATE INDEX "return_items_order_item_idx" ON "return_items"("order_item_id");

-- 10. refunds table
CREATE TABLE "refunds" (
  "id"          serial          PRIMARY KEY,
  "return_id"   integer         NOT NULL REFERENCES "returns"("id") ON DELETE CASCADE,
  "method"      "refund_method" NOT NULL,
  "status"      "refund_status" NOT NULL DEFAULT 'pending',
  "amount"      decimal(10,2)   NOT NULL,
  "currency"    varchar(3)      NOT NULL DEFAULT 'PLN',
  "external_id" varchar(255),
  "command_id"  uuid            NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "payload"     jsonb,
  "error"       jsonb,
  "created_at"  timestamptz     NOT NULL DEFAULT now(),
  "updated_at"  timestamptz     NOT NULL DEFAULT now()
);
CREATE INDEX "refunds_return_idx"           ON "refunds"("return_id");
CREATE INDEX "refunds_status_idx"           ON "refunds"("status");
CREATE UNIQUE INDEX "refunds_command_id_idx" ON "refunds"("command_id");

-- 11. allegro_refund_claims table
CREATE TABLE "allegro_refund_claims" (
  "id"                serial       PRIMARY KEY,
  "return_id"         integer      NOT NULL REFERENCES "returns"("id") ON DELETE CASCADE,
  "allegro_claim_id"  varchar(100) NOT NULL UNIQUE,
  "status"            varchar(50)  NOT NULL,
  "amount"            decimal(10,2),
  "payload"           jsonb,
  "created_at"        timestamptz  NOT NULL DEFAULT now(),
  "updated_at"        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX "allegro_refund_claims_return_idx" ON "allegro_refund_claims"("return_id");
CREATE INDEX "allegro_refund_claims_status_idx" ON "allegro_refund_claims"("status");

-- 12. allegro_issues table
CREATE TABLE "allegro_issues" (
  "id"                serial       PRIMARY KEY,
  "allegro_issue_id"  varchar(100) NOT NULL UNIQUE,
  "order_id"          integer      REFERENCES "orders"("id"),
  "return_id"         integer      REFERENCES "returns"("id"),
  "status"            varchar(50)  NOT NULL,
  "subject"           varchar(500),
  "last_message_at"   timestamptz,
  "payload"           jsonb,
  "created_at"        timestamptz  NOT NULL DEFAULT now(),
  "updated_at"        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX "allegro_issues_order_idx"  ON "allegro_issues"("order_id");
CREATE INDEX "allegro_issues_return_idx" ON "allegro_issues"("return_id");
CREATE INDEX "allegro_issues_status_idx" ON "allegro_issues"("status");

-- 13. allegro_issue_messages table
CREATE TABLE "allegro_issue_messages" (
  "id"                  serial       PRIMARY KEY,
  "issue_id"            integer      NOT NULL REFERENCES "allegro_issues"("id") ON DELETE CASCADE,
  "allegro_message_id"  varchar(100) NOT NULL UNIQUE,
  "author_role"         varchar(20)  NOT NULL,
  "text"                text,
  "attachments"         jsonb,
  "created_at"          timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX "allegro_issue_messages_issue_idx" ON "allegro_issue_messages"("issue_id", "created_at");
