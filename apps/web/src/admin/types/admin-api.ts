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
  | 'completed'
  | 'cancelled'
  | 'refunded'

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
  allegroLogin?: string
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
  notes?: string
  internalNotes?: string
  paidAt?: string | null
  shippedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface OrdersQueryParams {
  page?: number
  limit?: number
  status?: string
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

export interface AllegroTrackingData {
  carrier: string | null
  waybill: string | null
  status: string | null
  statusDescription: string | null
  updatedAt: string | null
  allStatuses: Array<{
    status: string
    description: string | null
    occurredAt: string | null
  }>
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
