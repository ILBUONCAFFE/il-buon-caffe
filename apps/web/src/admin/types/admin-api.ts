import type { AllegroSalesQuality, AllegroSalesQualityResponse } from '@repo/types'
export type { AllegroSalesQuality, AllegroSalesQualityResponse }

// ── Shared wrappers ───────────────────────────────────────────────────────────
export interface ApiListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export interface DashboardStats {
  todayRevenue: number         // today's turnover (PLN-equivalent)
  revenueChange: number        // % change vs yesterday
  todayOrders: number          // orders placed today (all sources)
  ordersChange: number         // % change vs yesterday
  avgOrderValue: number        // avg order value last 30 days
  avgOrderValueChange: number  // % change vs prior 30-day period
  // Channel breakdown — populated once Allegro sync is active
  allegroRevenue: number       // today's Allegro turnover (PLN-equivalent)
  allegroOrders: number        // today's orders via Allegro
  shopRevenue: number          // today's own-shop turnover
  shopOrders: number           // today's own-shop orders
  cached?: boolean             // true = served from KV cache
}

export interface DashboardStatsResponse {
  success: boolean
  data: DashboardStats
}

// ── Weekly revenue chart (Mon → yesterday) ──────────────────────────────────
export interface WeeklyRevenuePoint {
  day: string                // e.g. 'Pon', 'Wt' …
  revenue: number            // total PLN (shop + allegro)
  shop: number               // shop-only revenue
  allegro: number            // Allegro-only revenue
}

export interface WeeklyRevenueResponse {
  success: boolean
  data: WeeklyRevenuePoint[]
}

// ── Weekly stats ──────────────────────────────────────────────────────────────
export interface WeeklyPoint {
  day: string                // e.g. 'Pon'
  value: number              // order count
}

export interface WeeklyStatsResponse {
  success: boolean
  data: WeeklyPoint[]
}

// ── Orders ────────────────────────────────────────────────────────────────────
export type OrderSource = 'shop' | 'allegro'
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type ShipmentDisplayStatus =
  | 'none'
  | 'label_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'issue'
  | 'unknown'

export type ShipmentFreshness = 'fresh' | 'stale' | 'unknown'

export interface OrderItem {
  id?: number
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ShippingAddress {
  name: string
  street: string
  city: string
  postalCode: string
  country: string
  phone?: string
}

export interface CustomerData {
  name: string
  email: string
  phone?: string
  shippingAddress?: ShippingAddress
  billingAddress?: ShippingAddress
  companyName?: string
  taxId?: string
  allegroLogin?: string
}

export interface ShipmentEvent {
  code: string
  label: string | null
  occurredAt: string | null
}

export interface AllegroShipmentEntry {
  waybill: string
  carrierId: string
  carrierName?: string | null
  statusCode: string
  statusLabel: string | null
  occurredAt: string | null
  isSelected: boolean
  events?: ShipmentEvent[]
}

export interface AdminOrder {
  id: number
  orderNumber: string
  source: OrderSource
  externalId: string | null    // Allegro order ID
  status: OrderStatus
  total: number
  currency:     string
  totalPln:     number | null
  exchangeRate: number | null
  rateDate:     string | null
  subtotal?: number
  shippingCost?: number
  customerData: CustomerData
  items: OrderItem[]
  paymentMethod?: string
  shippingMethod?: string | null
  trackingNumber?: string | null
  trackingStatus?: string | null              // derived: snapshot[selected].statusLabel
  trackingStatusCode?: string | null          // derived: snapshot[selected].statusCode (normalized)
  trackingStatusUpdatedAt?: string | null     // derived: snapshot[selected].occurredAt
  allegroShipmentId?: string | null
  allegroFulfillmentStatus?: string | null
  shipmentDisplayStatus?: ShipmentDisplayStatus
  shipmentFreshness?: ShipmentFreshness
  allShipments?: AllegroShipmentEntry[] | null
  notes?: string
  internalNotes?: string
  paidAt?: string | null
  shippedAt?: string | null
  invoiceRequired?: boolean
  createdAt: string
  updatedAt?: string
}

export interface OrdersQueryParams {
  page?: number
  limit?: number
  status?: string
  queue?: 'fulfillment' | 'awaiting_payment' | ''
  source?: OrderSource | ''
  from?: string
  to?: string
  search?: string
}

export interface OrdersResponse {
  success: boolean
  data: AdminOrder[]
  meta: ApiListMeta
}

// ── Products ────────────────────────────────────────────────────────────────
export interface AdminCategory {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  sortOrder: number
  productCount?: number
}

export interface AdminProductImage {
  id: number
  url: string
  altText: string | null
  sortOrder: number
  isPrimary: boolean
}

export interface AdminProduct {
  sku: string
  slug: string
  name: string
  description: string | null
  categoryId: number | null
  category?: {
    id: number
    name: string
    slug: string
  } | null
  price: number
  compareAtPrice: number | null
  currency: string
  stock: number
  reserved: number
  available: number
  imageUrl: string | null
  origin: string | null
  originCountry?: string | null
  originRegion?: string | null
  grapeVariety?: string | null
  year: string | null
  weight: number | null
  wineDetails?: Record<string, unknown> | null
  isActive: boolean
  isNew: boolean
  isFeatured: boolean
  allegroOfferId: string | null
  allegroSyncPrice: boolean
  allegroSyncStock: boolean
  images?: AdminProductImage[]
  createdAt: string
  updatedAt: string
}

export interface AdminProductsQueryParams {
  page?: number
  limit?: number
  search?: string
  active?: 'true' | 'false'
  category?: string
}

export interface AdminProductsResponse {
  success: boolean
  data: AdminProduct[]
  meta: ApiListMeta
}

export interface AdminProductResponse {
  success: boolean
  data: AdminProduct
}

export interface AdminCategoriesResponse {
  success: boolean
  data: AdminCategory[]
}

export interface CreateAdminProductPayload {
  sku?: string
  name: string
  description?: string
  categoryId?: number | null
  price: number
  compareAtPrice?: number | null
  stock?: number
  imageUrl?: string
  origin?: string
  year?: string
  weight?: number | null
  wineDetails?: Record<string, unknown> | null
  isActive?: boolean
  isNew?: boolean
  isFeatured?: boolean
  allegroOfferId?: string | null
  allegroSyncPrice?: boolean
  allegroSyncStock?: boolean
}

export type UpdateAdminProductPayload = Partial<Omit<CreateAdminProductPayload, 'sku' | 'stock'>>

export interface UpdateProductStockPayload {
  stock: number
  reason: 'manual' | 'inventory' | 'damage' | 'cancellation'
  notes?: string
}

export interface UpdateProductStockResponse {
  success: boolean
  data: {
    sku: string
    previousStock: number
    newStock: number
    change: number
    available: number
  }
}

export interface UploadProductImageResponse {
  key: string
  url: string
  productSku?: string
  persistedInDb?: boolean
  size: number
  type: string
}

// ── Allegro Order Details (fetched live from Allegro REST API) ────────────────
export interface AllegroOrderDetails {
  status: string | null
  buyer: {
    login: string | null
    email: string | null
    phone: string | null
  }
  delivery: {
    address: {
      name: string
      street: string
      city: string
      postalCode: string
      country: string
      phone?: string | null
    } | null
    methodName: string | null
    waybill: string | null
  }
  fulfillment: {
    status: string | null
  }
}

export interface AllegroTrackingStatusEntry {
  status: string
  description: string | null
  occurredAt: string | null
}

export interface AllegroTrackingData {
  carrier: string | null
  waybill: string | null
  status: string | null
  statusDescription: string | null
  updatedAt: string | null
  allStatuses: AllegroTrackingStatusEntry[]
}

// ── Shipment Management ──────────────────────────────────────────────────────
export interface DeliveryServiceInfo {
  id: string
  name: string
  carrierId: string
  maxWeight: number
  maxLength: number
  maxWidth: number
  maxHeight: number
  volumetricDivisor: number | null
}

export interface DeliveryServicesResponse {
  success: boolean
  data: DeliveryServiceInfo[]
}

export interface CreateShipmentPayload {
  carrierId: string
  deliveryMethodId: string
  weight: number
  length: number
  width: number
  height: number
  referenceNumber?: string
}

export interface ShipmentCreatedResponse {
  success: boolean
  data: {
    shipmentId: string
    trackingNumber: string
    status: 'shipped'
  }
}

// ── Allegro OAuth ─────────────────────────────────────────────────────────────
export type AllegroEnvironment = 'sandbox' | 'production'

export interface AllegroConnectionStatus {
  connected:     boolean
  environment:   AllegroEnvironment | null
  expiresAt:     string | null
  tokenValid:    boolean
  accountId?:    string
  accountLogin?: string
}

export interface AllegroStatusResponse {
  success: boolean
  data: AllegroConnectionStatus
}

export interface AllegroConnectUrlResponse {
  success: boolean
  data: { url: string; state: string; environment: AllegroEnvironment }
}

export interface AllegroRefreshResponse {
  success: boolean
  data: { expiresAt: string; environment: AllegroEnvironment }
}

// ── Dashboard overview (full /admin/dashboard endpoint) ──────────────────────
export interface DashboardOverviewStats {
  ordersToday:      number
  ordersPending:    number
  ordersProcessing: number
  revenueMonth:     number   // PLN, 30-day
  totalCustomers:   number
  lowStockProducts: number   // active products with available stock <= 2
}

export interface DashboardOverview {
  stats: DashboardOverviewStats
}

export interface DashboardOverviewResponse {
  success: boolean
  data: DashboardOverview
}

// ── Activity feed ─────────────────────────────────────────────────────────────
export type ActivityType = 'sale' | 'register' | 'invoice' | 'shipment' | 'payment' | 'allegro'

export interface ActivityItem {
  id: number
  type: ActivityType
  text: string
  subtext: string
  amount?: string
  time: string
}

export interface ActivityFeedResponse {
  success: boolean
  data: ActivityItem[]
}

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotificationType = 'order' | 'payment' | 'stock'

export interface AdminNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  unread: boolean
}

export interface NotificationsResponse {
  success: boolean
  data: AdminNotification[]
}

// ── Returns ──────────────────────────────────────────────────────────────────

export type ReturnStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refunded' | 'closed'

export type ReturnReason =
  | 'damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'change_of_mind'
  | 'other'

export interface ReturnItem {
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface AdminReturn {
  id: number
  returnNumber: string
  orderId: number
  orderNumber: string
  createdAt: string
  updatedAt: string
  status: ReturnStatus
  reason: ReturnReason
  reasonNote: string | null
  items: ReturnItem[]
  totalRefundAmount: number | null
  currency: string
  customerData: {
    name: string
    email: string
    phone?: string
  } | null
}

export interface ReturnsQueryParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  from?: string
  to?: string
}

export interface ReturnsResponse {
  data: AdminReturn[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ── Complaints (Allegro Issues / Disputes) ───────────────────────────────────

export type ComplaintStatus =
  | 'DISPUTE_ONGOING'
  | 'DISPUTE_CLOSED'
  | 'DISPUTE_UNRESOLVED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_ACCEPTED'
  | 'CLAIM_REJECTED'

export type ComplaintAuthorRole = 'BUYER' | 'SELLER' | 'ALLEGRO'

export interface ComplaintMessage {
  id: number
  issueId: number
  allegroMessageId: string
  authorRole: ComplaintAuthorRole
  text: string | null
  attachments: Array<{ id: string; url?: string; name?: string }> | null
  createdAt: string
}

export interface AdminComplaint {
  id: number
  allegroIssueId: string
  orderId: number | null
  returnId: number | null
  status: ComplaintStatus | string
  subject: string | null
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
  orderNumber: string | null
  customerData: { name?: string; email?: string } | null
  lastMessage?: { text: string | null; authorRole: string; createdAt: string } | null
}

export interface AdminComplaintDetail extends AdminComplaint {
  payload: Record<string, unknown> | null
  returnNumber: string | null
  messages: ComplaintMessage[]
}

export interface ComplaintsQueryParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  from?: string
  to?: string
}

export interface ComplaintsResponse {
  data: AdminComplaint[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ── Order status history ──────────────────────────────────────────────────────
export type StatusSource = 'system' | 'admin' | 'allegro_sync' | 'carrier_sync' | 'p24_webhook' | 'backfill'
export type StatusCategory = 'status' | 'tracking'

export interface OrderStatusHistoryEntry {
  id: number
  order_id: number
  category: StatusCategory
  previous_value: string | null
  new_value: string
  source: StatusSource
  source_ref: string | null
  metadata: Record<string, unknown> | null
  occurred_at: string
}

// ── Allegro Products ──────────────────────────────────────────────────────────

export interface AllegroOffer {
  id: string
  name: string
  status: string       // ACTIVE | INACTIVE | ENDED | etc.
  stock: number | null
  price: number | null
  linkedSku: string | null
}

export interface AllegroOffersResponse {
  success: boolean
  data: AllegroOffer[]
  meta: { total: number; limit: number; offset: number }
}

export interface LinkAllegroOfferPayload {
  sku: string
  offerId: string
  syncPrice?: boolean
  syncStock?: boolean
}

export interface PushStockResponse {
  success: boolean
  data: {
    sku: string
    allegroOfferId: string
    pushed?: number
    offerId?: string
    syncedPrice?: { amount: string; currency: string }
    syncedStock?: number
  }
}

// ── Stock History ─────────────────────────────────────────────────────────────

export interface StockHistoryEntry {
  id: number
  productSku: string
  previousStock: number
  newStock: number
  change: number
  reason: string
  orderId: number | null
  adminId: number | null
  notes: string | null
  createdAt: string
}

export interface StockHistoryResponse {
  success: boolean
  data: StockHistoryEntry[]
  meta: ApiListMeta
}

// ── Low Stock ─────────────────────────────────────────────────────────────────

export interface LowStockProduct {
  sku: string
  name: string
  stock: number
  reserved: number
  available: number
  isActive: boolean
  allegroOfferId: string | null
  category: { name: string } | null
}

export interface LowStockResponse {
  success: boolean
  data: LowStockProduct[]
  meta: { threshold: number; total: number }
}

// ── Rich Content (D1) ─────────────────────────────────────────────────────────

export interface RichContentAward {
  name: string
  year: number
  rank?: string
}

export interface RichContentPairing {
  dish: string
  note?: string
}

export interface DishTemplate {
  id: number
  category: string
  name: string
  note: string | null
  dishType: string | null
  imageUrl: string | null
  emoji: string | null
  tags: string[]
  isActive: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface DishTemplatesResponse {
  data: DishTemplate[]
}

export interface DishTemplateResponse {
  data: DishTemplate
}

export interface UpsertDishTemplatePayload {
  category?: string
  name: string
  note?: string | null
  dishType?: string | null
  imageUrl?: string | null
  emoji?: string | null
  tags?: string[]
  isActive?: boolean
  sortOrder?: number
}

export interface ProductRichContent {
  sku: string
  category: string
  producerSlug: string | null
  awards: RichContentAward[]
  pairing: RichContentPairing[]
  ritual: string | null
  servingTemp: string | null
  profile: Record<string, number>
  sensory: Record<string, string>
  extended: Record<string, unknown>
  hasAwards: boolean
  isPublished: boolean
  updatedAt: number
  version: number
}

export interface ProductRichContentResponse {
  data: ProductRichContent
}

export interface UpsertProductRichContentPayload {
  category: string
  producerSlug?: string | null
  awards?: RichContentAward[]
  pairing?: RichContentPairing[]
  ritual?: string | null
  servingTemp?: string | null
  profile?: Record<string, number>
  sensory?: Record<string, string>
  extended?: Record<string, unknown>
  isPublished?: boolean
}

export interface ProducerEstateInfo {
  name: string
  hectares?: number
  soil?: string
  altitude?: number
  variety?: string
}

export interface ProducerImage {
  url: string
  caption?: string
}

export interface ProducerContent {
  slug: string
  category: string
  name: string
  region: string
  country: string
  founded: number | null
  shortStory: string | null
  story: string | null
  philosophy: string | null
  estateInfo: ProducerEstateInfo[]
  images: ProducerImage[]
  website: string | null
  updatedAt: number
  version: number
}

export interface ProducerContentResponse {
  data: ProducerContent
}

export interface ProducersListResponse {
  data: ProducerContent[]
}

export interface UpsertProducerPayload {
  category: string
  name: string
  region: string
  country: string
  founded?: number | null
  shortStory?: string | null
  story?: string | null
  philosophy?: string | null
  estateInfo?: ProducerEstateInfo[]
  images?: ProducerImage[]
  website?: string | null
}

export interface ContentHistoryEntry {
  id: number
  sku: string
  payload: ProductRichContent
  changedBy: number | null
  createdAt: number
}

export interface ContentHistoryResponse {
  data: ContentHistoryEntry[]
}
