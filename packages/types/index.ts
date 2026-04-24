/**
 * IL BUON CAFFÈ - Shared Types (v2.0)
 * 
 * ⚠️ MODEL FLAT: Każdy SKU to osobny produkt (bez wariantów)
 * ⚠️ UNIFIED AUTH: JWT dla wszystkich (customer + admin)
 * ⚠️ RODO: Typy dla consent tracking i audit
 * 
 * @package @repo/types
 * @version 2.0.0
 */

// ============================================
// API TYPES
// ============================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  allegroCode?: string; // Dla błędów Allegro
}

// ============================================
// AUTH TYPES (Unified JWT)
// ============================================

export type UserRole = 'customer' | 'admin';

export interface User {
  id: number;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthTokenPayload {
  sub: string;       // User ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;           // 86400 dla customer, 7200 dla admin
  user: User;
  requiresNewConsent?: boolean; // true jeśli regulamin się zmienił
  newTermsVersion?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  consents: {
    terms: boolean;      // ✅ WYMAGANE
    privacy: boolean;    // ✅ WYMAGANE
    marketing: boolean;  // Opcjonalne
    analytics: boolean;  // Opcjonalne
  };
  termsVersion: string;
  privacyVersion: string;
}

// ============================================
// PRODUCT TYPES (FLAT STRUCTURE)
// ============================================

/**
 * ⚠️ MODEL FLAT: Każdy SKU to osobny produkt
 * 
 * Przykład:
 * - "Etiopia Yirgacheffe 250g" → SKU: "ETH-YRG-250"
 * - "Etiopia Yirgacheffe 1kg"  → SKU: "ETH-YRG-1000"
 * 
 * Oba to OSOBNE produkty (nie warianty jednego produktu)
 */
export interface Product {
  sku: string;                    // ⭐ Primary Key
  slug: string;
  name: string;
  description?: string;
  longDescription?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  reserved: number;
  imageUrl?: string;
  images?: ProductImage[];
  category?: Category;
  origin?: string;
  year?: string;
  weight?: number;
  isActive: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  allegroOfferId?: string;        // Mapowanie 1:1 z Allegro
  createdAt: string;
  updatedAt: string;
}

/** Product as shown in list (simplified) */
export interface ProductCard {
  sku: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  origin?: string;
  isNew?: boolean;
}

export interface ProductImage {
  id: number;
  url: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
}

// ============================================
// CATEGORY TYPES
// ============================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  layoutConfig?: CategoryLayoutConfig;
  isActive: boolean;
  sortOrder: number;
}

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

// ============================================
// CART TYPES
// ============================================

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  maxQuantity: number;  // stock - reserved
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
}

// ============================================
// ORDER TYPES (Unified: Shop + Allegro)
// ============================================

export type OrderStatus = 
  | 'pending'      // Oczekuje na płatność
  | 'paid'         // Opłacone
  | 'processing'   // W realizacji
  | 'shipped'      // Wysłane
  | 'delivered'    // Dostarczone
  | 'cancelled';   // Anulowane

export type OrderSource = 'shop' | 'allegro';

export interface Order {
  id: number;
  orderNumber: string;
  customerData: CustomerData;
  status: OrderStatus;
  source: OrderSource;
  externalId?: string;         // Allegro order ID
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  totalPln: number | null;
  exchangeRate: number | null;
  rateDate: string | null;
  paymentMethod?: string;
  p24SessionId?: string;       // Przelewy24 session ID
  p24OrderId?: string;          // Przelewy24 order ID (z webhook)
  paidAt?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  shippedAt?: string;
  items: OrderItem[];
  notes?: string;
  invoiceRequired?: boolean;   // czy zamówienie wymaga faktury VAT
  reservationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CustomerData {
  email:            string;
  name?:            string;
  phone?:           string;
  shippingAddress?: ShippingAddress;
  billingAddress?:  ShippingAddress;
  companyName?:     string;        // nazwa firmy (faktura VAT)
  taxId?:           string;        // NIP (faktura VAT)
  allegroLogin?:    string;        // login kupującego na Allegro
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateOrderRequest {
  items: { sku: string; quantity: number }[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: 'card' | 'blik' | 'transfer';
  notes?: string;
}

export interface CreateOrderResponse {
  orderId: number;
  orderNumber: string;
  total: number;
  status: OrderStatus;
  reservationExpiresAt: string;
  // Nie ma paymentIntent - trzeba wywołać /payments/p24/initiate
}

// ============================================
// PRZELEWY24 TYPES
// ============================================

export interface P24InitiateRequest {
  orderId: number;
  returnUrl: string;
  language?: 'pl' | 'en';
}

export interface P24InitiateResponse {
  sessionId: string;
  redirectUrl: string;
  expiresAt: string;
}

export interface P24ReturnResponse {
  orderId: number;
  status: OrderStatus;
  verified: boolean;
}

export interface P24WebhookPayload {
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  sign: string;  // CRC hash
}

// ============================================
// GDPR/RODO TYPES
// ============================================

export type ConsentType = 'terms' | 'privacy' | 'marketing' | 'analytics';

export interface UserConsent {
  type: ConsentType;
  granted: boolean;
  version?: string;
  grantedAt?: string;
}

export interface ConsentsResponse {
  terms: UserConsent;
  privacy: UserConsent;
  marketing: UserConsent;
  analytics: UserConsent;
}

export interface UserDataExport {
  user: {
    id: number;
    email: string;
    name?: string;
    createdAt: string;
  };
  consents: UserConsent[];
  orders: Order[];
  exportedAt: string;
  format: 'GDPR_EXPORT_V1';
}

export interface AnonymizeRequest {
  confirmEmail: string;
  reason?: string;
}

export interface AnonymizeResponse {
  message: string;
  anonymizationDate: string;
  retainedData: string[];
}

// ============================================
// ALLEGRO TYPES (Flat 1:1 Mapping)
// ============================================

export interface AllegroOffer {
  offerId: string;
  name: string;
  price: number;
  stock: number;
  status: 'ACTIVE' | 'ENDED' | 'ACTIVATING';
  mappedSku?: string;  // null jeśli niezmapowane
}

export interface AllegroMapRequest {
  sku: string;
  offerId: string;
}

export interface AllegroSyncStatus {
  lastOrderSync: string;
  lastStockSync: string;
  orderEventsCursor: string;
  pendingStockChanges: number;
  circuitBreaker: {
    status: 'closed' | 'open' | 'half-open';
    retriesRemaining: number;
  };
  errors24h: number;
}

// ============================================
// STOCK TYPES
// ============================================

export type StockChangeReason = 
  | 'order'         // Zmiana przez zamówienie
  | 'manual'        // Ręczna korekta
  | 'inventory'     // Inwentaryzacja
  | 'damage'        // Uszkodzenie
  | 'allegro_sync'; // Sync z Allegro

export interface StockUpdateRequest {
  stock: number;
  reason: StockChangeReason;
  notes?: string;
  syncToAllegro?: boolean;
}

export interface StockChange {
  id: number;
  sku: string;
  previousStock: number;
  newStock: number;
  change: number;
  reason: StockChangeReason;
  orderId?: number;
  adminId?: number;
  notes?: string;
  createdAt: string;
}

// ============================================
// AUDIT TYPES
// ============================================

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'view_customer'
  | 'view_order'
  | 'export_data'
  | 'update_customer'
  | 'anonymize_customer'
  | 'admin_action';

export interface AuditLogEntry {
  id: number;
  adminId: number;
  adminEmail: string;
  action: AuditAction;
  targetUserId?: number;
  details?: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

// ============================================
// ADMIN DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;        // vs previous period (%)
  newCustomers: number;
  customersChange: number;
  activeOrders: number;
  ordersChange: number;
  lowStockProducts: number;     // stock < 5
}

export interface RecentActivity {
  id: string;
  type: 'order' | 'customer' | 'stock' | 'allegro';
  message: string;
  time: string;
  source?: OrderSource;
}

// ============================================
// LEGAL DOCUMENTS TYPES
// ============================================

export interface LegalDocument {
  type: 'privacy_policy' | 'terms' | 'cookies';
  version: string;
  content: string;
  contentType: 'text/html' | 'text/markdown';
  effectiveFrom: string;
}

export interface LegalDocumentHistory {
  versions: {
    version: string;
    effectiveFrom: string;
  }[];
}

// ============================================
// HEALTH CHECK TYPES
// ============================================

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: 'connected' | 'error';
    allegroAuth: 'valid' | 'expired' | 'not_configured';
    allegroAuthExpiresIn?: number;
    kv: 'connected' | 'error';
    r2: 'connected' | 'error';
  };
  version: string;
}

// ============================================
// CAFE MENU TYPES (for /cafe page)
// ============================================

export interface CafeMenuItem {
  category: string;
  items: {
    name: string;
    price: string;
    description?: string;
    isSpecial?: boolean;
  }[];
}

// ============================================
// ENCYCLOPEDIA/ARTICLE TYPES
// ============================================

export interface Article {
  id: number;
  title: string;
  subtitle: string;
  category: 'Wiedza' | 'Regiony' | 'Proces';
  image: string;
  content: string;
  readTime: string;
}

// ============================================
// ALLEGRO SALES QUALITY TYPES
// ============================================

export interface AllegroSalesQuality {
  score: number
  maxScore: number
  grade?: string                                 // e.g. "SUPER_SELLER" (from /sale/quality)
  fetchedAt: string                              // ISO timestamp
  fulfillment: {
    onTimePercent: number                        // e.g. 94.2 (from DISPATCH_IN_TIME metric)
  }
  returns: {
    count: number        // from /order/customer-returns (FINISHED, 90-day window)
    ratePercent?: number // undefined when DB ordersCount === 0 (incomplete sync guard)
  }
  ratings: {
    positive: number                             // from /users/{userId}/ratings-summary .recommended.total
    negative: number                             // from /users/{userId}/ratings-summary .notRecommended.total
    negativePercent: number                      // calculated: negative / (positive + negative) * 100
  }
}

export interface AllegroSalesQualityResponse {
  data: AllegroSalesQuality | null
}

// ── Allegro Shipment Management ──────────────────────────────────────────────

export interface CreateShipmentRequest {
  carrierId: string
  deliveryMethodId: string
  weight: number
  length: number
  width: number
  height: number
  referenceNumber?: string
}

export interface CreateShipmentResponse {
  shipmentId: string
  trackingNumber: string
  status: 'shipped'
}

export interface AllegroDeliveryService {
  id: string
  name: string
  carrierId: string
  maxWeight: number
  maxLength: number
  maxWidth: number
  maxHeight: number
  volumetricDivisor: number | null
}

// ============================================
// RETURNS / REFUNDS / DISPUTES
// ============================================

export type ReturnStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refunded' | 'closed'

export type ReturnReason =
  | 'damaged'          // Uszkodzenie w transporcie
  | 'wrong_item'       // Błędny produkt
  | 'not_as_described' // Niezgodny z opisem
  | 'change_of_mind'   // Zmiana decyzji kupującego
  | 'defect'           // Wada fabryczna
  | 'mistake'          // Zamówienie z pomyłki
  | 'other'

export type ReturnSource = 'shop' | 'allegro'

export type RefundMethod = 'p24' | 'allegro_payments' | 'bank_transfer_manual'

export type RefundStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'rejected'

export interface ReturnCustomerData {
  name: string
  email: string
  phone?: string
  bankAccount?: {
    owner: string
    accountNumber: string
    iban?: string
    swift?: string
  }
}

export interface ReturnAllegroData {
  customerReturnId: string
  referenceNumber?: string
  rejection?: { code: string; reason?: string; createdAt: string }
  refund?: {
    value: { amount: string; currency: string }
    status: string
    bankAccount?: Record<string, unknown>
  }
  parcels?: Array<{
    transportingCarrierId: string
    trackingNumber: string
    sender?: string
  }>
}

export interface ReturnItem {
  id: number
  returnId: number
  orderItemId: number | null
  productSku: string
  productName: string
  quantity: number
  unitPrice: string
  totalPrice: string
  condition: string | null
  createdAt: string
  updatedAt: string
}

export interface Refund {
  id: number
  returnId: number
  method: RefundMethod
  status: RefundStatus
  amount: string
  currency: string
  externalId: string | null
  commandId: string
  payload: Record<string, unknown> | null
  error: { code?: string; message?: string } | null
  createdAt: string
  updatedAt: string
}

export interface Return {
  id: number
  returnNumber: string
  orderId: number
  source: ReturnSource
  status: ReturnStatus
  reason: ReturnReason
  reasonNote: string | null
  totalRefundAmount: string | null
  currency: string
  customerData: ReturnCustomerData | null
  allegro: ReturnAllegroData | null
  restockApplied: boolean
  closedAt: string | null
  createdAt: string
  updatedAt: string
  // Relations (optional, populated by joins)
  items?: ReturnItem[]
  refunds?: Refund[]
}

// ── Admin API shapes ─────────────────────────────────────────────────────────

export interface AdminReturn extends Return {
  orderNumber: string
  items: ReturnItem[]
}

export interface AdminReturnDetail extends AdminReturn {
  refunds: Refund[]
  allegroIssue?: AllegroIssue | null
}

export interface ReturnsListResponse {
  data: AdminReturn[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ── Allegro Issues (Disputes) ────────────────────────────────────────────────

export type AllegroIssueStatus =
  | 'DISPUTE_ONGOING'
  | 'DISPUTE_CLOSED'
  | 'DISPUTE_UNRESOLVED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_ACCEPTED'
  | 'CLAIM_REJECTED'

export interface AllegroIssueMessage {
  id: number
  issueId: number
  allegroMessageId: string
  authorRole: 'BUYER' | 'SELLER' | 'ALLEGRO'
  text: string | null
  attachments: Array<{ id: string; url?: string; name?: string }> | null
  createdAt: string
}

export interface AllegroIssue {
  id: number
  allegroIssueId: string
  orderId: number | null
  returnId: number | null
  status: string
  subject: string | null
  lastMessageAt: string | null
  payload: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  messages?: AllegroIssueMessage[]
}

// ── Zod-compatible request shapes (used for API validation) ─────────────────

export interface CreateReturnRequest {
  orderId: number
  reason: ReturnReason
  reasonNote?: string
  items: Array<{
    orderItemId: number
    quantity: number
    condition?: string
  }>
  customerBankAccount?: ReturnCustomerData['bankAccount']
}

export interface ApproveReturnRequest {
  refundMethod?: RefundMethod
  amount?: number
}

export interface RejectReturnRequest {
  code: string
  reason?: string
}

export interface PostIssueMessageRequest {
  text: string
  attachmentIds?: string[]
}
