/**
 * IL BUON CAFFÈ - Database Schema (RODO-Compliant, Flat Structure)
 *
 * ⚠️ MODEL FLAT: Każdy SKU to osobny produkt (bez wariantów)
 * ⚠️ ALLEGRO 1:1: Jeden SKU = jedna oferta Allegro
 * ⚠️ RODO: Pełna zgodność z GDPR (consents, audit, anonymization)
 *
 * @package @repo/db
 * @version 3.0.0 — merged canonical schema
 */

import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  date,
  index,
  uniqueIndex,
  uuid,
  inet
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import type { CoffeeDetails } from '@repo/types';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['customer', 'admin']);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',              // Oczekuje na płatność (stock zarezerwowany)
  'paid',                 // Opłacone
  'processing',           // W realizacji
  'shipped',              // Wysłane (przekazane kurierowi)
  'in_transit',           // Kurier potwierdził odbiór, w drodze
  'out_for_delivery',     // Ostatnia mila
  'delivered',            // Dostarczone
  'return_requested',     // Kupujący zgłosił zwrot
  'return_in_transit',    // Paczka wraca do nas
  'return_received',      // Otrzymaliśmy zwrot
  'refunded',             // Zwrot pieniędzy zrealizowany
  'disputed',             // Otwarta dyskusja/spór na Allegro
  'cancelled'             // Anulowane przed realizacją
]);

export const statusSourceEnum = pgEnum('status_source', [
  'system',          // Automatyczne przejście (np. webhook P24 → paid)
  'admin',           // Ręczna zmiana w panelu admina
  'allegro_sync',    // Cron odpytujący /order/events
  'carrier_sync',    // Cron odpytujący tracking kuriera
  'p24_webhook',     // Callback z Przelewy24
  'backfill'         // Jednorazowe uzupełnienie historycznych danych
]);

export const orderSourceEnum = pgEnum('order_source', ['shop', 'allegro']);

export const consentTypeEnum = pgEnum('consent_type', [
  'terms',        // Regulamin (wymagane)
  'privacy',      // Polityka prywatności (wymagane)
  'marketing',    // Newsletter/marketing (opcjonalne)
  'analytics'     // Cookies analityczne (opcjonalne)
]);

export const auditActionEnum = pgEnum('audit_action', [
  'login',
  'logout',
  'view_customer',
  'view_order',
  'export_data',
  'update_customer',
  'anonymize_customer',
  'admin_action',
  'update_stock',
  'password_reset',
  // Returns
  'create_return',
  'approve_return',
  'reject_return',
  'issue_refund',
  'cancel_refund',
  'create_refund_claim'
]);

export const stockChangeReasonEnum = pgEnum('stock_change_reason', [
  'order',
  'manual',
  'inventory',
  'damage',
  'allegro_sync',
  'cancellation',
  'return'  // Zwrot towaru do magazynu
]);

export const retentionStatusEnum = pgEnum('retention_status', [
  'active',       // Gorące dane (< 1 rok)
  'archivable',   // Do archiwizacji (1-2 lata)
  'anonymized',   // Zanonimizowane (> 2 lata)
  'deleted'       // Do usunięcia (> 5 lat)
]);

export const allegroEnvEnum = pgEnum('allegro_env', ['sandbox', 'production']);

export const returnStatusEnum = pgEnum('return_status', [
  'new',        // Nowe zgłoszenie
  'in_review',  // W rozpatrzeniu
  'approved',   // Zaakceptowane
  'rejected',   // Odrzucone
  'refunded',   // Zwrot pieniędzy wysłany
  'closed'      // Zamknięte
]);

export const returnReasonEnum = pgEnum('return_reason', [
  'damaged',          // Uszkodzenie transportowe — produkt był sprawny przy wysyłce, uszkodzony w transporcie (shipping damage)
  'wrong_item',       // Błędny produkt
  'not_as_described', // Niezgodny z opisem (Allegro NOT_AS_DESCRIBED, WRONG_DESCRIPTION, INCOMPLETE)
  'change_of_mind',   // Zmiana decyzji (Allegro MISTAKE)
  'defect',           // Wada fabryczna — produkt był wadliwy z fabryki (manufacturing defect; distinct from 'damaged')
  'mistake',          // Zamówienie z pomyłki (Allegro MISTAKE)
  'other'             // Inne
]);

export const returnSourceEnum = pgEnum('return_source', ['shop', 'allegro']);

export const refundMethodEnum = pgEnum('refund_method', [
  'p24',                  // Zwrot przez Przelewy24
  'allegro_payments',     // Zwrot przez system płatności Allegro
  'bank_transfer_manual'  // Ręczny przelew bankowy
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'pending',    // Oczekuje na przetworzenie
  'processing', // W trakcie przetwarzania
  'succeeded',  // Zakończony sukcesem
  'failed',     // Nieudany
  'rejected'    // Odrzucony
]);

// ============================================
// TYPES
// ============================================

export interface CategoryLayoutConfig {
  type: 'grid' | 'hero-list' | 'masonry';
  hero?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    overlayColor?: string;
    height?: 'full' | 'half' | 'third';
  };
  grid?: {
    columns: 2 | 3 | 4;
    gap: 'sm' | 'md' | 'lg';
    cardStyle: 'minimal' | 'detailed' | 'hover-zoom';
  };
  colors?: {
    background?: string;
    accent?: string;
    text?: string;
  };
  filters?: {
    enabled: boolean;
    position: 'sidebar' | 'top' | 'hidden';
    options: ('price' | 'origin' | 'year')[];
  };
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CustomerData {
  email: string;
  name?: string;
  phone?: string;
  shippingAddress?: ShippingAddress;
  billingAddress?: ShippingAddress;
  companyName?: string;
  taxId?: string;
  allegroLogin?: string;
}

// ============================================
// TABLES: USERS & AUTH (RODO-Compliant)
// ============================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: userRoleEnum('role').notNull().default('customer'),

  // ===== Email Verification =====
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

  // ===== Login Security =====
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  tokenVersion: integer('token_version').default(0).notNull(),

  // ===== RODO/GDPR Fields =====
  gdprConsentDate: timestamp('gdpr_consent_date', { withTimezone: true }),
  marketingConsent: boolean('marketing_consent').default(false),
  analyticsConsent: boolean('analytics_consent').default(false),
  termsVersion: varchar('terms_version', { length: 20 }),
  privacyVersion: varchar('privacy_version', { length: 20 }),
  consentIpAddress: varchar('consent_ip_address', { length: 45 }),
  consentUserAgent: text('consent_user_agent'),
  dataRetentionUntil: date('data_retention_until'),
  anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  anonymized: boolean('anonymized').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  roleIdx: index('users_role_idx').on(table.role),
  anonymizedIdx: index('users_anonymized_idx').on(table.anonymizedAt),
  lockedIdx: index('users_locked_idx').on(table.lockedUntil),
  retentionIdx: index('users_retention_idx').on(table.dataRetentionUntil),
}));

// ============================================
// TABLES: SESSIONS (JWT Refresh Token Management)
// ============================================

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userActiveIdx: index('sessions_user_active_idx').on(table.userId, table.isActive),
  tokenIdx: index('sessions_token_idx').on(table.refreshTokenHash),
  expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
}));

// ============================================
// TABLES: PASSWORD RESET TOKENS
// ============================================

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('password_reset_tokens_token_idx').on(table.tokenHash),
  userIdx: index('password_reset_tokens_user_idx').on(table.userId),
  expiresIdx: index('password_reset_tokens_expires_idx').on(table.expiresAt),
}));

// ============================================
// TABLES: EMAIL VERIFICATION TOKENS
// ============================================

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('email_verification_tokens_token_idx').on(table.tokenHash),
  userIdx: index('email_verification_tokens_user_idx').on(table.userId),
}));

// ============================================
// TABLES: CONSENTS HISTORY (RODO Art. 7)
// ============================================

export const userConsents = pgTable('user_consents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  consentType: consentTypeEnum('consent_type').notNull(),
  granted: boolean('granted').notNull(),
  version: varchar('version', { length: 20 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('user_consents_user_idx').on(table.userId),
  typeIdx: index('user_consents_type_idx').on(table.consentType),
  versionIdx: index('user_consents_version_idx').on(table.version),
}));

// ============================================
// TABLES: AUDIT LOG (RODO Accountability)
// ============================================

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').references(() => users.id),
  action: auditActionEnum('action').notNull(),
  targetUserId: integer('target_user_id').references(() => users.id),
  targetOrderId: integer('target_order_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  adminIdx: index('audit_log_admin_idx').on(table.adminId),
  actionIdx: index('audit_log_action_idx').on(table.action),
  targetUserIdx: index('audit_log_target_user_idx').on(table.targetUserId),
  createdIdx: index('audit_log_created_idx').on(table.createdAt),
}));

// ============================================
// TABLES: LEGAL DOCUMENTS (Wersjonowane)
// ============================================

export const legalDocuments = pgTable('legal_documents', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  content: text('content').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  typeVersionIdx: uniqueIndex('legal_documents_type_version_idx').on(table.type, table.version),
}));

// ============================================
// TABLES: CATEGORIES
// ============================================

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  layoutConfig: jsonb('layout_config').$type<CategoryLayoutConfig>(),
  imageUrl: varchar('image_url', { length: 500 }),
  metaTitle: varchar('meta_title', { length: 200 }),
  metaDescription: text('meta_description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sortIdx: index('categories_sort_idx').on(table.sortOrder),
  activeIdx: index('categories_active_idx').on(table.isActive),
}));

// ============================================
// TABLES: PRODUCTS (FLAT STRUCTURE - SKU jako PK)
// ============================================

export const products = pgTable('products', {
  sku: varchar('sku', { length: 50 }).primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id),

  // ===== Ceny =====
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('PLN'),

  // ===== Stock =====
  stock: integer('stock').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),

  // ===== Media =====
  imageUrl: varchar('image_url', { length: 500 }),

  // ===== Atrybuty (legacy — zachowane dla compat) =====
  origin: varchar('origin', { length: 255 }),
  year: varchar('year', { length: 10 }),
  weight: integer('weight'),

  // ===== Wine cascading filter fields =====
  originCountry: varchar('origin_country', { length: 100 }),
  originRegion: varchar('origin_region', { length: 150 }),
  grapeVariety: varchar('grape_variety', { length: 255 }),

  // ===== Category-specific details (JSONB, partial override) =====
  coffeeDetails: jsonb('coffee_details').$type<CoffeeDetails>(),

  // ===== SEO =====
  metaTitle: varchar('meta_title', { length: 200 }),
  metaDescription: text('meta_description'),

  // ===== Flagi =====
  isActive: boolean('is_active').notNull().default(true),
  isNew: boolean('is_new').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),

  // ===== Allegro (1:1 Mapping) =====
  allegroOfferId: varchar('allegro_offer_id', { length: 50 }).unique(),
  allegroSyncPrice: boolean('allegro_sync_price').notNull().default(false),
  allegroSyncStock: boolean('allegro_sync_stock').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('products_category_idx').on(table.categoryId),
  activeIdx: index('products_active_idx').on(table.isActive),
  allegroIdx: index('products_allegro_idx').on(table.allegroOfferId),
  stockIdx: index('products_stock_idx').on(table.stock),
  originCountryIdx: index('products_origin_country_idx').on(table.originCountry),
  originRegionIdx: index('products_origin_region_idx').on(table.originRegion),
  grapeVarietyIdx: index('products_grape_variety_idx').on(table.grapeVariety),
  countryRegionIdx: index('products_country_region_idx').on(table.originCountry, table.originRegion),
}));

// ============================================
// TABLES: PRODUCT IMAGES
// ============================================

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productSku: varchar('product_sku', { length: 50 }).references(() => products.sku).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  altText: varchar('alt_text', { length: 255 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  productIdx: index('product_images_product_idx').on(table.productSku),
}));

// ============================================
// TABLES: ORDERS (Unified: Shop + Allegro)
// ============================================

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),

  userId: integer('user_id').references(() => users.id),
  customerData: jsonb('customer_data').$type<CustomerData>().notNull(),

  // ===== Status & Source =====
  status: orderStatusEnum('status').notNull().default('pending'),
  source: orderSourceEnum('source').notNull().default('shop'),
  externalId: varchar('external_id', { length: 100 }),

  // ===== Allegro reconciliation =====
  allegroRevision: varchar('allegro_revision', { length: 50 }),
  allegroFulfillmentStatus: varchar('allegro_fulfillment_status', { length: 50 }),

  // ===== Kwoty =====
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('PLN'),
  totalPln:     decimal('total_pln',     { precision: 10, scale: 2 }),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }),
  rateDate:     date('rate_date'),

  // ===== Płatność (Przelewy24) =====
  paymentMethod: varchar('payment_method', { length: 50 }),
  p24SessionId: varchar('p24_session_id', { length: 255 }),
  p24OrderId: varchar('p24_order_id', { length: 255 }),
  p24MerchantId: varchar('p24_merchant_id', { length: 50 }),
  p24TransactionId: varchar('p24_transaction_id', { length: 100 }),
  p24Status: varchar('p24_status', { length: 20 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // ===== Wysyłka =====
  shippingMethod: varchar('shipping_method', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  allegroShipmentId: varchar('allegro_shipment_id', { length: 36 }),
  // Snapshot of all Allegro shipments. Source of truth for shipment status display.
  // Refreshed on-demand via /admin/orders/:id/refresh-shipment (5min KV cache).
  // events[] = full status history per parcel (also written to order_status_history on change).
  allegroShipmentsSnapshot: jsonb('allegro_shipments_snapshot').$type<{
    waybill: string
    carrierId: string
    statusCode: string
    statusLabel: string | null
    occurredAt: string | null
    isSelected: boolean
    events?: Array<{ code: string; label: string | null; occurredAt: string | null }>
  }[]>(),

  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),

  // ===== Idempotency =====
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),

  // ===== Retention =====
  retentionStatus: retentionStatusEnum('retention_status').default('active'),

  // ===== Notatki =====
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  // ===== Faktura =====
  invoiceRequired: boolean('invoice_required').notNull().default(false),

  reservationExpiresAt: timestamp('reservation_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('orders_user_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
  sourceIdx: index('orders_source_idx').on(table.source),
  externalIdx: index('orders_external_idx').on(table.externalId),
  idempotencyIdx: uniqueIndex('orders_idempotency_idx').on(table.idempotencyKey),
  createdIdx: index('orders_created_idx').on(table.createdAt),
  reservationIdx: index('orders_reservation_idx').on(table.reservationExpiresAt),
  retentionIdx: index('orders_retention_idx').on(table.retentionStatus, table.createdAt),
  invoiceIdx: index('orders_invoice_idx').on(table.invoiceRequired).where(sql`${table.invoiceRequired} = true`),
}));

// ============================================
// TABLES: ORDER STATUS HISTORY (append-only audit)
// ============================================

export const orderStatusHistory = pgTable('order_status_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),

  // 'status' = wewnętrzny cykl życia zamówienia, 'tracking' = kod statusu kuriera
  category: varchar('category', { length: 20 }).notNull(),

  // Dla category='status': literały z orderStatusEnum
  // Dla category='tracking': wolna forma (kody przewoźników, np. 'DELIVERED', 'IN_TRANSIT')
  previousValue: varchar('previous_value', { length: 100 }),
  newValue: varchar('new_value', { length: 100 }).notNull(),

  source: statusSourceEnum('source').notNull(),
  sourceRef: varchar('source_ref', { length: 200 }),  // np. Allegro event ID, email admina, waybill

  // Dodatkowy kontekst (raw payload, revision, etc.)
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('osh_order_idx').on(table.orderId, table.occurredAt),
  categoryIdx: index('osh_category_idx').on(table.category, table.occurredAt),
  sourceIdx: index('osh_source_idx').on(table.source),
}));

// ============================================
// TABLES: ORDER SEQUENCES (atomic per-year counter)
// ============================================

export const orderSequences = pgTable('order_sequences', {
  year: integer('year').primaryKey(),
  nextSeq: integer('next_seq').notNull().default(1),
});

// ============================================
// TABLES: ORDER ITEMS
// ============================================

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  // Dla zamówień Allegro bez mappingu: Allegro offer ID (UUID, max 36 znaków).
  // Celowo bez FK na products — zamówienia Allegro mogą dotyczyć ofert spoza katalogu.
  productSku: varchar('product_sku', { length: 255 }).notNull(),

  // Snapshot (zamrożone dane z momentu zamówienia)
  productName: varchar('product_name', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),

  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  skuIdx: index('order_items_sku_idx').on(table.productSku),
}));

// ============================================
// TABLES: ALLEGRO INTEGRATION
// ============================================

export const allegroSyncLog = pgTable('allegro_sync_log', {
  id: serial('id').primaryKey(),
  productSku: varchar('product_sku', { length: 50 }),
  offerId: varchar('offer_id', { length: 50 }),
  action: varchar('action', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  errorMessage: text('error_message'),
  errorCode: varchar('error_code', { length: 50 }),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  skuIdx: index('allegro_sync_log_sku_idx').on(table.productSku),
  actionIdx: index('allegro_sync_log_action_idx').on(table.action),
  statusIdx: index('allegro_sync_log_status_idx').on(table.status),
  createdIdx: index('allegro_sync_log_created_idx').on(table.createdAt),
}));

export const allegroCredentials = pgTable('allegro_credentials', {
  id: serial('id').primaryKey(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  tokenType: varchar('token_type', { length: 20 }).default('Bearer'),
  scope: text('scope'),
  isActive: boolean('is_active').notNull().default(true),
  environment: varchar('environment', { length: 20 }).notNull().default('sandbox'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const allegroState = pgTable('allegro_state', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// TABLES: STOCK CHANGES LOG
// ============================================

export const stockChanges = pgTable('stock_changes', {
  id: serial('id').primaryKey(),
  productSku: varchar('product_sku', { length: 50 }).references(() => products.sku).notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  change: integer('change').notNull(),
  reason: varchar('reason', { length: 50 }).notNull(),
  orderId: integer('order_id').references(() => orders.id),
  adminId: integer('admin_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  skuIdx: index('stock_changes_sku_idx').on(table.productSku),
  createdIdx: index('stock_changes_created_idx').on(table.createdAt),
}));

// ============================================
// TABLES: CATALOGS (PDF Flipbook)
// ============================================

export const catalogs = pgTable('catalogs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  r2Key: varchar('r2_key', { length: 500 }).notNull(),
  pageCount: integer('page_count'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('catalogs_slug_idx').on(table.slug),
  activeIdx: index('catalogs_active_idx').on(table.isActive),
}));

// ============================================
// TABLES: RETURNS (Unified: Shop + Allegro)
// ============================================

export const returns = pgTable('returns', {
  id: serial('id').primaryKey(),
  returnNumber: varchar('return_number', { length: 50 }).notNull().unique(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  source: returnSourceEnum('source').notNull(),
  status: returnStatusEnum('status').notNull().default('new'),
  reason: returnReasonEnum('reason').notNull(),
  reasonNote: text('reason_note'),
  totalRefundAmount: decimal('total_refund_amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('PLN'),
  // Snapshot danych kupującego (name, email, phone, bankAccount)
  // Nullable: populated immediately for shop returns; may be set after sync for Allegro returns
  customerData: jsonb('customer_data').$type<{
    name: string
    email: string
    phone?: string
    bankAccount?: { owner: string; accountNumber: string; iban?: string; swift?: string }
  }>(),
  // Dane specyficzne dla Allegro (wypełnione tylko gdy source='allegro')
  allegro: jsonb('allegro').$type<{
    customerReturnId: string
    referenceNumber?: string
    status?: string
    marketplaceId?: string
    isFulfillment?: boolean
    rejection?: { code: string; reason?: string; createdAt: string }
    refund?: { value?: { amount: string; currency: string }; status?: string; bankAccount?: Record<string, unknown> }
    parcels?: Array<{
      carrierId?: string
      transportingCarrierId: string
      waybill?: string
      transportingWaybill?: string
      trackingNumber: string
      sender?: string
      createdAt?: string
    }>
  }>(),
  restockApplied: boolean('restock_applied').notNull().default(false),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('returns_order_idx').on(table.orderId),
  statusIdx: index('returns_status_idx').on(table.status),
  sourceStatusIdx: index('returns_source_status_idx').on(table.source, table.status),
  // Note: uniqueness of allegro->>'customerReturnId' enforced at application level (reconciler)
  // A functional JSONB index must be added via raw SQL in migration if needed.
}));

// ============================================
// TABLES: RETURN ITEMS
// ============================================

export const returnItems = pgTable('return_items', {
  id: serial('id').primaryKey(),
  returnId: integer('return_id').references(() => returns.id, { onDelete: 'cascade' }).notNull(),
  orderItemId: integer('order_item_id').references(() => orderItems.id),
  productSku: varchar('product_sku', { length: 255 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  // Opcjonalny stan zwracanego towaru
  condition: varchar('condition', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  returnIdx: index('return_items_return_idx').on(table.returnId),
  orderItemIdx: index('return_items_order_item_idx').on(table.orderItemId),
}));

// ============================================
// TABLES: REFUNDS (Płatności zwrotne)
// ============================================

export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  returnId: integer('return_id').references(() => returns.id, { onDelete: 'cascade' }).notNull(),
  method: refundMethodEnum('method').notNull(),
  status: refundStatusEnum('status').notNull().default('pending'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('PLN'),
  // ID zwrotu z zewnętrznego systemu (P24 refund id, Allegro payment refund id)
  externalId: varchar('external_id', { length: 255 }),
  // UUID wysyłany jako commandId do Allegro lub requestId do P24 (idempotency)
  commandId: uuid('command_id').defaultRandom().notNull().unique(),
  // Pełny request/response do audytu
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  error: jsonb('error').$type<{ code?: string; message?: string; raw?: unknown }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  returnIdx: index('refunds_return_idx').on(table.returnId),
  statusIdx: index('refunds_status_idx').on(table.status),
  commandIdIdx: uniqueIndex('refunds_command_id_idx').on(table.commandId),
}));

// ============================================
// TABLES: ALLEGRO REFUND CLAIMS (Zwrot prowizji)
// ============================================

export const allegroRefundClaims = pgTable('allegro_refund_claims', {
  id: serial('id').primaryKey(),
  returnId: integer('return_id').references(() => returns.id, { onDelete: 'cascade' }).notNull(),
  allegroClaimId: varchar('allegro_claim_id', { length: 100 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull(), // Allegro status: open-ended (CREATED, IN_CONSIDERATION, ACCEPTED, REJECTED...)
  amount: decimal('amount', { precision: 10, scale: 2 }),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  returnIdx: index('allegro_refund_claims_return_idx').on(table.returnId),
  statusIdx: index('allegro_refund_claims_status_idx').on(table.status),
}));

// ============================================
// TABLES: ALLEGRO ISSUES (Dyskusje/Spory)
// ============================================

export const allegroIssues = pgTable('allegro_issues', {
  id: serial('id').primaryKey(),
  allegroIssueId: varchar('allegro_issue_id', { length: 100 }).notNull().unique(),
  orderId: integer('order_id').references(() => orders.id),
  returnId: integer('return_id').references(() => returns.id),
  status: varchar('status', { length: 50 }).notNull(), // Allegro status: DISPUTE_ONGOING | DISPUTE_CLOSED | DISPUTE_UNRESOLVED | CLAIM_SUBMITTED | CLAIM_ACCEPTED | CLAIM_REJECTED
  subject: varchar('subject', { length: 500 }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdx: index('allegro_issues_order_idx').on(table.orderId),
  returnIdx: index('allegro_issues_return_idx').on(table.returnId),
  statusIdx: index('allegro_issues_status_idx').on(table.status),
}));

// ============================================
// TABLES: ALLEGRO ISSUE MESSAGES
// ============================================

export const allegroIssueMessages = pgTable('allegro_issue_messages', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => allegroIssues.id, { onDelete: 'cascade' }).notNull(),
  allegroMessageId: varchar('allegro_message_id', { length: 100 }).notNull().unique(),
  authorRole: varchar('author_role', { length: 20 }).notNull(),
  text: text('text'),
  attachments: jsonb('attachments').$type<Array<{ id: string; url?: string; name?: string }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  issueIdx: index('allegro_issue_messages_issue_idx').on(table.issueId, table.createdAt),
}));

// ============================================
// RELATIONS
// ============================================

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  orderItems: many(orderItems),
  stockChanges: many(stockChanges),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productSku],
    references: [products.sku],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  consents: many(userConsents),
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  emailVerificationTokens: many(emailVerificationTokens),
  stockChanges: many(stockChanges),
  auditLogs: many(auditLog, { relationName: 'admin' }),
  auditedLogs: many(auditLog, { relationName: 'target' }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  admin: one(users, {
    fields: [auditLog.adminId],
    references: [users.id],
    relationName: 'admin',
  }),
  targetUser: one(users, {
    fields: [auditLog.targetUserId],
    references: [users.id],
    relationName: 'target',
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  stockChanges: many(stockChanges),
  statusHistory: many(orderStatusHistory),
  returns: many(returns),
  allegroIssues: many(allegroIssues),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productSku],
    references: [products.sku],
  }),
  returnItems: many(returnItems),
}));

export const stockChangesRelations = relations(stockChanges, ({ one }) => ({
  product: one(products, {
    fields: [stockChanges.productSku],
    references: [products.sku],
  }),
  order: one(orders, {
    fields: [stockChanges.orderId],
    references: [orders.id],
  }),
  admin: one(users, {
    fields: [stockChanges.adminId],
    references: [users.id],
  }),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  order: one(orders, {
    fields: [returns.orderId],
    references: [orders.id],
  }),
  items: many(returnItems),
  refunds: many(refunds),
  allegroRefundClaims: many(allegroRefundClaims),
  allegroIssues: many(allegroIssues),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, {
    fields: [returnItems.returnId],
    references: [returns.id],
  }),
  orderItem: one(orderItems, {
    fields: [returnItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  return: one(returns, {
    fields: [refunds.returnId],
    references: [returns.id],
  }),
}));

export const allegroRefundClaimsRelations = relations(allegroRefundClaims, ({ one }) => ({
  return: one(returns, {
    fields: [allegroRefundClaims.returnId],
    references: [returns.id],
  }),
}));

export const allegroIssuesRelations = relations(allegroIssues, ({ one, many }) => ({
  order: one(orders, {
    fields: [allegroIssues.orderId],
    references: [orders.id],
  }),
  return: one(returns, {
    fields: [allegroIssues.returnId],
    references: [returns.id],
  }),
  messages: many(allegroIssueMessages),
}));

export const allegroIssueMessagesRelations = relations(allegroIssueMessages, ({ one }) => ({
  issue: one(allegroIssues, {
    fields: [allegroIssueMessages.issueId],
    references: [allegroIssues.id],
  }),
}));

// ============================================
// INFERRED TYPES
// ============================================

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;

export type DbCategory = typeof categories.$inferSelect;
export type NewDbCategory = typeof categories.$inferInsert;

export type DbProduct = typeof products.$inferSelect;
export type NewDbProduct = typeof products.$inferInsert;

export type DbOrder = typeof orders.$inferSelect;
export type NewDbOrder = typeof orders.$inferInsert;

export type DbOrderItem = typeof orderItems.$inferSelect;
export type NewDbOrderItem = typeof orderItems.$inferInsert;

export type DbCatalog = typeof catalogs.$inferSelect;
export type NewDbCatalog = typeof catalogs.$inferInsert;

export type DbReturn = typeof returns.$inferSelect;
export type NewDbReturn = typeof returns.$inferInsert;

export type DbReturnItem = typeof returnItems.$inferSelect;
export type NewDbReturnItem = typeof returnItems.$inferInsert;

export type DbRefund = typeof refunds.$inferSelect;
export type NewDbRefund = typeof refunds.$inferInsert;

export type DbAllegroIssue = typeof allegroIssues.$inferSelect;
export type NewDbAllegroIssue = typeof allegroIssues.$inferInsert;
