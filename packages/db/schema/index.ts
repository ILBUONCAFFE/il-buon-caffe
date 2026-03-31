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
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['customer', 'admin']);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',      // Oczekuje na płatność (stock zarezerwowany)
  'paid',         // Opłacone
  'processing',   // W realizacji
  'shipped',      // Wysłane
  'delivered',    // Dostarczone
  'cancelled'     // Anulowane (stock zwrócony)
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
  'password_reset'
]);

export const stockChangeReasonEnum = pgEnum('stock_change_reason', [
  'order',
  'manual',
  'inventory',
  'damage',
  'allegro_sync',
  'cancellation'
]);

export const retentionStatusEnum = pgEnum('retention_status', [
  'active',       // Gorące dane (< 1 rok)
  'archivable',   // Do archiwizacji (1-2 lata)
  'anonymized',   // Zanonimizowane (> 2 lata)
  'deleted'       // Do usunięcia (> 5 lat)
]);

export const allegroEnvEnum = pgEnum('allegro_env', ['sandbox', 'production']);

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
  longDescription: text('long_description'),
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
  wineDetails: jsonb('wine_details').$type<Record<string, unknown>>(),
  coffeeDetails: jsonb('coffee_details').$type<Record<string, unknown>>(),

  // ===== SEO =====
  metaTitle: varchar('meta_title', { length: 200 }),
  metaDescription: text('meta_description'),

  // ===== Flagi =====
  isActive: boolean('is_active').notNull().default(true),
  isNew: boolean('is_new').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),

  // ===== Allegro (1:1 Mapping) =====
  allegroOfferId: varchar('allegro_offer_id', { length: 50 }).unique(),

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
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),

  // ===== Idempotency =====
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),

  // ===== Retention =====
  retentionStatus: retentionStatusEnum('retention_status').default('active'),

  // ===== Notatki =====
  notes: text('notes'),
  internalNotes: text('internal_notes'),

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
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productSku],
    references: [products.sku],
  }),
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
