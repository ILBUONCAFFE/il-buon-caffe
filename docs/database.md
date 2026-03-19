## **📋 Spis treści struktury**

1. [SQL DDL (PostgreSQL)](https://www.kimi.com/chat/19c0af3c-b172-8294-8000-09fb240dc1dc#sql-ddl-postgresql)
2. [Indeksy i wydajność](https://www.kimi.com/chat/19c0af3c-b172-8294-8000-09fb240dc1dc#indeksy)
3. [Relacje (ERD)](https://www.kimi.com/chat/19c0af3c-b172-8294-8000-09fb240dc1dc#relacje-erd)
4. [Drizzle Schema (TypeScript)](https://www.kimi.com/chat/19c0af3c-b172-8294-8000-09fb240dc1dc#drizzle-schema-typescript)

---

## **SQL DDL (PostgreSQL)**

### **sql**Copy

- `- ============================================- 1. EXTENSIONS- ============================================CREATE EXTENSION IF NOT EXISTS "uuid-ossp";CREATE EXTENSION IF NOT EXISTS "pgcrypto";- ============================================- 2. ENUMS (Typy wyliczeniowe)- ============================================CREATE TYPE user_role AS ENUM ('customer', 'admin');CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');CREATE TYPE order_source AS ENUM ('shop', 'allegro');CREATE TYPE consent_type AS ENUM ('terms', 'privacy', 'marketing', 'analytics', 'allegro_data_transfer');CREATE TYPE audit_action AS ENUM ('login', 'logout', 'view_customer', 'view_order', 'export_data', 'update_stock', 'anonymize_customer', 'admin_action');CREATE TYPE allegro_link_status AS ENUM ('active', 'ended', 'error', 'unmapped');CREATE TYPE stock_change_reason AS ENUM ('order', 'manual', 'inventory', 'damage', 'allegro_sync', 'cancellation');- ============================================- 3. USERS & AUTH (RODO Compliant)- ============================================CREATE TABLE users ( id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, name VARCHAR(255), role user_role NOT NULL DEFAULT 'customer', - RODO/GDPR Fields email_verified BOOLEAN DEFAULT FALSE, email_verified_at TIMESTAMP, gdpr_consent_date TIMESTAMP, - Data ostatniej zmiany zgód marketing_consent BOOLEAN DEFAULT FALSE, analytics_consent BOOLEAN DEFAULT FALSE, terms_version VARCHAR(20), - Wersja regulaminu privacy_version VARCHAR(20), - Wersja polityki prywatności consent_ip_address INET, - IP przy akceptacji (RODO dowód) consent_user_agent TEXT, - User-Agent przy akceptacji data_retention_until DATE, - Data auto-anonimizacji (7 lat) anonymized_at TIMESTAMP, - Soft delete RODO anonymized BOOLEAN DEFAULT FALSE, - Flaga szybkiego sprawdzania created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, - ConstraintsCONSTRAINT chk_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),CONSTRAINT chk_retention_after_creation CHECK (data_retention_until >= created_at::date + INTERVAL '1 year'));- ============================================- 4. CONSENTS HISTORY (RODO Art. 7)- ============================================CREATE TABLE user_consents ( id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, consent_type consent_type NOT NULL, granted BOOLEAN NOT NULL, version VARCHAR(20) NOT NULL, - Wersja dokumentu (np. "2026-01-01") ip_address INET, - Adres IP użytkownika user_agent TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT unique_consent_per_version UNIQUE (user_id, consent_type, version));- ============================================- 5. AUDIT LOG (RODO Accountability + Bezpieczeństwo)- ============================================CREATE TABLE audit_log ( id SERIAL PRIMARY KEY, admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL, - Kto wykonał akcję target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, - Czyje dane były dostępne target_order_id INTEGER, - Opcjonalnie: które zamówienieaction audit_action NOT NULL, details JSONB, - Dodatkowe dane (flexible) ip_address INET NOT NULL, user_agent TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);- ============================================- 6. LEGAL DOCUMENTS (Wersjonowanie)- ============================================CREATE TABLE legal_documents ( id SERIAL PRIMARY KEY,type VARCHAR(50) NOT NULL CHECK (type IN ('privacy_policy', 'terms', 'cookies')), version VARCHAR(20) NOT NULL, content TEXT NOT NULL, - HTML lub Markdown effective_from TIMESTAMP NOT NULL, - Od kiedy obowiązuje created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT unique_doc_version UNIQUE (type, version));- ============================================- 7. CATEGORIES (Layout Config)- ============================================CREATE TABLE categories ( id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL UNIQUE, description TEXT, layout_config JSONB DEFAULT '{}', - Konfiguracja wyglądu (JSON) image_url VARCHAR(500), meta_title VARCHAR(200), meta_description TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);- ============================================- 8. PRODUCTS (FLAT STRUCTURE - SKU jako PK)- ============================================CREATE TABLE products ( sku VARCHAR(50) PRIMARY KEY, - ⭐ SKU jako Primary Key (Flat Model) slug VARCHAR(255) NOT NULL UNIQUE, - Podstawowe dane name VARCHAR(255) NOT NULL, description TEXT, long_description TEXT, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, - Ceny (DECIMAL dla precyzji VAT) price DECIMAL(10, 2) NOT NULL CHECK (price >= 0), compare_at_price DECIMAL(10, 2) CHECK (compare_at_price >= price OR compare_at_price IS NULL), currency VARCHAR(3) DEFAULT 'PLN' NOT NULL, - Stock (dostępny = stock - reserved) stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= stock), - Media image_url VARCHAR(500), - Atrybuty (dla kawy/wina) origin VARCHAR(255), - "Etiopia, Region Gedeo"year VARCHAR(10), - "2024" weight INTEGER CHECK (weight > 0), - Waga w gramach - SEO/Marketing is_active BOOLEAN NOT NULL DEFAULT TRUE, is_new BOOLEAN NOT NULL DEFAULT FALSE, is_featured BOOLEAN NOT NULL DEFAULT FALSE, meta_title VARCHAR(200), meta_description TEXT, - Allegro Integration (1:1 Mapping) allegro_offer_id VARCHAR(50) UNIQUE, - NULL jeśli nie sprzedawane na Allegro allegro_status allegro_link_status DEFAULT 'unmapped', allegro_last_sync TIMESTAMP, - Timestamps created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, - ConstraintsCONSTRAINT chk_price_positive CHECK (price >= 0));- ============================================- 9. PRODUCT IMAGES (1:N)- ============================================CREATE TABLE product_images ( id SERIAL PRIMARY KEY, product_sku VARCHAR(50) NOT NULL REFERENCES products(sku) ON DELETE CASCADE, url VARCHAR(500) NOT NULL, alt_text VARCHAR(255), sort_order INTEGER NOT NULL DEFAULT 0, is_primary BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT unique_primary_per_product UNIQUE (product_sku, is_primary) DEFERRABLE INITIALLY DEFERRED - Tylko jeden primary (hack dla PostgreSQL));- ============================================- 10. ORDERS (Unified: Shop + Allegro)- ============================================CREATE TABLE orders ( id SERIAL PRIMARY KEY, order_number VARCHAR(50) NOT NULL UNIQUE, - Human readable: IBC-2026-00123 - Klient (może być guest lub registered user) user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, - NULL dla guest/allegro customer_data JSONB NOT NULL, - {email, name, phone, shippingAddress, billingAddress} - Źródło i statusstatus order_status NOT NULL DEFAULT 'pending', source order_source NOT NULL DEFAULT 'shop', external_id VARCHAR(100), - Allegro order ID (nullable dla shop) - Kwoty (wszystkie w PLN, brutto) subtotal DECIMAL(10, 2) NOT NULL, - Suma produktów shipping_cost DECIMAL(10, 2) DEFAULT 0 NOT NULL,- Koszt dostawy tax_amount DECIMAL(10, 2) DEFAULT 0, - VAT total DECIMAL(10, 2) NOT NULL, - Do zapłaty - Płatność (Przelewy24 - nie Stripe!) payment_method VARCHAR(50) DEFAULT 'p24', - 'p24', 'cod' (cash on delivery) p24_merchant_id VARCHAR(50), - ID sesji Przelewy24 p24_transaction_id VARCHAR(100), - Transaction ID z P24 p24_status VARCHAR(20), - 'pending', 'success', 'error' paid_at TIMESTAMP, - Kiedy opłacone - Wysyłka shipping_method VARCHAR(50), tracking_number VARCHAR(100), shipped_at TIMESTAMP, delivered_at TIMESTAMP, - Idempotency (ochrona przed double-submit) idempotency_key VARCHAR(100) UNIQUE, - Rezerwacja stocku (ważne dla pending orders) reservation_expires_at TIMESTAMP, - Po tym czasie stock wraca do puli - Notatki notes TEXT, - Odezwa klienta internal_notes TEXT, - Dla admina (nie widoczne dla klienta) - Allegro specific allegro_buyer_login VARCHAR(100), - Login kupującego na Allegro created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, - ConstraintsCONSTRAINT chk_positive_amounts CHECK (subtotal >= 0 AND total >= 0),CONSTRAINT chk_reservation_for_pending CHECK (status != 'pending' OR reservation_expires_at IS NOT NULL));- ============================================- 11. ORDER ITEMS (Snapshot pattern)- ============================================CREATE TABLE order_items ( id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_sku VARCHAR(50) NOT NULL REFERENCES products(sku) ON DELETE RESTRICT, - Nie pozwalaj usunąć produktu z historii - Snapshot (zamrożone dane z momentu zakupu) product_name VARCHAR(255) NOT NULL, - Nazwa w momencie zakupu (nie zmienia się jak produkt) image_url VARCHAR(500), - URL zdjęcia z momentu zakupu - Cena i ilość quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price DECIMAL(10, 2) NOT NULL, - Cena jednostkowa w momencie zakupu total_price DECIMAL(10, 2) NOT NULL, - quantity * unit_price created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);- ============================================- 12. STOCK CHANGES (Audit trail dla magazynu)- ============================================CREATE TABLE stock_changes ( id SERIAL PRIMARY KEY, product_sku VARCHAR(50) NOT NULL REFERENCES products(sku) ON DELETE RESTRICT, - Zmiana previous_stock INTEGER NOT NULL, new_stock INTEGER NOT NULL, change_amount INTEGER NOT NULL, - new - previous (może być ujemne) - Kontekst reason stock_change_reason NOT NULL, order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL, - Jeśli przez zamówienie admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL, - Jeśli ręczna zmiana notes TEXT, - "Inwentaryzacja", "Uszkodzenie przy transporcie" - Allegro (jeśli zmiana przez sync) allegro_sync_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);- ============================================- 13. ALLEGRO INTEGRATION- ============================================CREATE TABLE allegro_credentials ( id SERIAL PRIMARY KEY, access_token TEXT NOT NULL, refresh_token TEXT NOT NULL, expires_at TIMESTAMP NOT NULL, token_type VARCHAR(20) DEFAULT 'Bearer', scope VARCHAR(500), is_active BOOLEAN DEFAULT TRUE NOT NULL, environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);CREATE TABLE allegro_sync_log ( id SERIAL PRIMARY KEY, product_sku VARCHAR(50) REFERENCES products(sku) ON DELETE SET NULL, offer_id VARCHAR(50),action VARCHAR(50) NOT NULL CHECK (action IN ('stock_update', 'price_update', 'order_sync', 'map', 'unmap', 'error')),status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'pending', 'retry')), request_payload JSONB, response_payload JSONB, error_message TEXT, error_code VARCHAR(50), - HTTP code lub Allegro error code retry_count INTEGER NOT NULL DEFAULT 0, executed_by INTEGER REFERENCES users(id), - Który admin zainicjował (null jeśli automat) created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);CREATE TABLE allegro_state (key VARCHAR(50) PRIMARY KEY CHECK (key IN ('order_events_cursor', 'last_stock_sync', 'circuit_breaker_status', 'circuit_breaker_expires')),value TEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);- ============================================- 14. PASSWORD RESET TOKENS (Jednorazowe)- ============================================CREATE TABLE password_resets ( id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash VARCHAR(255) NOT NULL, - Hash tokenu (nie plain text!) expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP, - Kiedy użyty (jednorazowy!) created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT unique_active_token_per_user UNIQUE (user_id) - Tylko jeden aktywny token na usera);- ============================================- TRIGGERS (Automatyczne updated_at)- ============================================CREATE OR REPLACE FUNCTION update_updated_at_column()RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP;RETURN NEW;END;
$$ language 'plpgsql';CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();CREATE TRIGGER update_allegro_credentials_updated_at BEFORE UPDATE ON allegro_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();- ============================================- RODO: Funkcja anonimizacji- ============================================CREATE OR REPLACE FUNCTION anonymize_user(user_id_to_anonymize INTEGER)RETURNS VOID AS $$
BEGINUPDATE users SET email = 'anonymized_' || id || '@deleted.local', password_hash = 'ANONYMIZED', name = 'Użytkownik usunięty', consent_ip_address = NULL, consent_user_agent = NULL, anonymized = TRUE, anonymized_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMPWHERE id = user_id_to_anonymize AND anonymized = FALSE; - Czyść sesje/alerts (jeśli masz dodatkowe tabele)END;
$$ LANGUAGE plpgsql;`

---

## **Indeksy (Dodaj po utworzeniu tabel)**

### **sql**Copy

- `- Wydajność dla najczęstszych zapytańCREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;CREATE INDEX idx_products_category ON products(category_id) WHERE is_active = TRUE;CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);CREATE INDEX idx_orders_source ON orders(source) WHERE source = 'allegro';CREATE INDEX idx_orders_external ON orders(external_id) WHERE external_id IS NOT NULL;CREATE INDEX idx_allegro_sync_sku_created ON allegro_sync_log(product_sku, created_at DESC);CREATE INDEX idx_audit_target_user ON audit_log(target_user_id) WHERE target_user_id IS NOT NULL;CREATE INDEX idx_audit_created ON audit_log(created_at DESC);- GIN index dla JSONB (szybkie przeszukiwanie customer_data)CREATE INDEX idx_orders_customer_data ON orders USING GIN (customer_data);`

---

## **Relacje (ERD)**

### Copy

`users ||--o{ orders : "places"
users ||--o{ user_consents : "has"
users ||--o{ audit_log : "performs"
users ||--o{ stock_changes : "modifies"
users ||--o{ password_resets : "requests"

categories ||--o{ products : "contains"

products ||--o{ product_images : "has"
products ||--o{ order_items : "included_in"
products ||--o{ stock_changes : "tracks"
products ||--do{ allegro_sync_log : "syncs"

orders ||--|{ order_items : "contains"
orders ||--o{ stock_changes : "causes"

allegro_credentials ||--o{ allegro_sync_log : "used_in"`

---

## **Drizzle Schema (TypeScript)**

Jeśli wolisz generować SQL z TypeScript (Drizzle), użyj tej definicji w `packages/db/schema.ts`:

### **TypeScript**Copy

`import { 
  pgTable, pgEnum, serial, varchar, text, boolean, integer, 
  decimal, timestamp, jsonb, date, index, uniqueIndex, inet 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ... (enums jak wcześniej) ...

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  customerData: jsonb('customer_data').$type<CustomerData>().notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  source: orderSourceEnum('source').notNull().default('shop'),
  externalId: varchar('external_id', { length: 100 }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).default('p24'),
  p24MerchantId: varchar('p24_merchant_id', { length: 50 }),
  p24TransactionId: varchar('p24_transaction_id', { length: 100 }),
  p24Status: varchar('p24_status', { length: 20 }),
  paidAt: timestamp('paid_at'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
  reservationExpiresAt: timestamp('reservation_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('orders_user_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
  externalIdx: uniqueIndex('orders_external_idx').on(table.externalId),
  reservationIdx: index('orders_reservation_idx').on(table.reservationExpiresAt),
}));`

**Ten schemat jest gotowy do wdrożenia na Neon.** Możesz skopiować SQL do Neon Console (SQL Editor) lub użyć `drizzle-kit push`