import type {
  DashboardStatsResponse,
  DashboardOverviewResponse,
  WeeklyRevenueResponse,
  WeeklyStatsResponse,
  OrdersResponse,
  OrdersQueryParams,
  AdminOrder,
  AdminOrderDetailResponse,
  AdminOrderAllegroLiveResponse,
  AdminOrderAllegroSyncResponse,
  DeliveryServicesResponse,
  CreateShipmentPayload,
  ShipmentCreatedResponse,
  ActivityFeedResponse,
  NotificationsResponse,
  AllegroStatusResponse,
  AllegroConnectUrlResponse,
  AllegroRefreshResponse,
  AllegroEnvironment,
  AllegroSalesQualityResponse,
  AdminReturn,
  ReturnsQueryParams,
  ReturnsResponse,
  AdminComplaint,
  AdminComplaintDetail,
  ComplaintsQueryParams,
  ComplaintsResponse,
  AdminProductsResponse,
  AdminProductsQueryParams,
  AdminProductResponse,
  AdminCategoriesResponse,
  CreateAdminProductPayload,
  UpdateAdminProductPayload,
  UpdateProductStockPayload,
  UpdateProductStockResponse,
  UploadProductImageResponse,
  OrderStatusHistoryEntry,
  AllegroOffersResponse,
  LinkAllegroOfferPayload,
  PushStockResponse,
  StockHistoryResponse,
  LowStockResponse,
  ProductRichContentResponse,
  UpsertProductRichContentPayload,
  ContentHistoryResponse,
  ProducersListResponse,
  ProducerContentResponse,
  UpsertProducerPayload,
} from '../types/admin-api'

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * All admin API calls go through the Next.js proxy routes:
 *   /api/admin/[...slug]         — general admin routes (verified admin_session cookie)
 *   /api/admin/allegro/[...slug] — Allegro-specific proxy (matched first by Next.js)
 *
 * Using credentials:'include' so the admin_session httpOnly cookie is forwarded
 * to the proxy, which verifies it server-side before calling the CF Worker.
 * The CF Worker never receives the admin_session cookie — it only sees the
 * X-Admin-Internal-Secret header injected by the proxy.
 *
 * Direct calls to the CF Worker are intentionally NOT made from the browser;
 * this guarantees admin routes are gated by the Next.js session check.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    // Send admin_session cookie to the Next.js proxy route
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errObj = body?.error
    const code    = errObj?.code    ?? 'HTTP_ERROR'
    const message = (errObj?.message ?? (typeof errObj === 'string' ? errObj : null) ?? res.statusText) || `Błąd HTTP ${res.status}`
    throw new ApiError(res.status, code, message)
  }

  return res.json() as Promise<T>
}

// Allegro calls use the same proxy pattern — alias to keep call sites unchanged.
const allegroRequest = request

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const adminApi = {
  // ── Dashboard stats ────────────────────────────────────────────────────────
  getDashboardStats: () =>
    request<DashboardStatsResponse>('/api/admin/stats/overview'),

  getDashboardOverview: () =>
    request<DashboardOverviewResponse>('/api/admin/dashboard'),

  getWeeklyRevenue: () =>
    request<WeeklyRevenueResponse>('/api/admin/stats/weekly-revenue'),

  getWeeklyStats: () =>
    request<WeeklyStatsResponse>('/api/admin/stats/weekly'),

  // ── Orders ─────────────────────────────────────────────────────────────────
  getOrders: (params?: OrdersQueryParams) => {
    const qs = new URLSearchParams()
    if (params?.page)   qs.set('page',   String(params.page))
    if (params?.limit)  qs.set('limit',  String(params.limit))
    if (params?.queue)  qs.set('queue',  params.queue)
    if (params?.status && params.status !== 'all') qs.set('status', params.status)
    if (params?.source) qs.set('source', params.source)
    if (params?.from)   qs.set('from',   params.from)
    if (params?.to)     qs.set('to',     params.to)
    if (params?.search) qs.set('search', params.search)
    return request<OrdersResponse>(`/api/admin/orders?${qs}`)
  },

  getOrder: (id: number) =>
    request<{ success: boolean; data: AdminOrder }>(`/api/admin/orders/${id}`),

  getOrderDetail: (id: number) =>
    request<AdminOrderDetailResponse>(`/api/admin/orders/${id}`),

  getOrderAllegroLive: (id: number) =>
    request<AdminOrderAllegroLiveResponse>(`/api/admin/orders/${id}/allegro-live`),

  syncOrderAllegro: (id: number) =>
    request<AdminOrderAllegroSyncResponse>(`/api/admin/orders/${id}/allegro-sync`, {
      method: 'POST',
    }),

  updateOrderStatus: (id: number, status: string) =>
    request<{ success: boolean }>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getOrderHistory: (id: number) =>
    request<{ data: OrderStatusHistoryEntry[] }>(`/api/admin/orders/${id}/history`),

  refreshOrderShipment: (id: number, opts?: { force?: boolean }) =>
    request<{ data: { refreshed: boolean; cached: boolean; snapshot: import('../types/admin-api').AllegroShipmentEntry[] | null } }>(
      `/api/admin/orders/${id}/refresh-shipment${opts?.force ? '?force=1' : ''}`,
      { method: 'POST' },
    ),

  setOrderFulfillment: (id: number, status: 'NEW' | 'PROCESSING' | 'READY_FOR_SHIPMENT' | 'SENT' | 'PICKED_UP' | 'CANCELLED' | 'SUSPENDED') =>
    request<{ success: boolean }>(`/api/admin/orders/${id}/fulfillment`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // ── Shipment management ────────────────────────────────────────────────
  getDeliveryServices: () =>
    request<DeliveryServicesResponse>('/api/admin/shipment/delivery-services'),

  createShipment: (orderId: number, payload: CreateShipmentPayload) =>
    request<ShipmentCreatedResponse>(`/api/admin/orders/${orderId}/shipment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getShipmentLabel: async (orderId: number, mode?: 'all'): Promise<Blob> => {
    const url = `/api/admin/orders/${orderId}/label${mode === 'all' ? '?mode=all' : ''}`
    const res = await fetch(url, {
      credentials: 'include',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as {
        error?: { code?: string; message?: string }
      }
      throw new ApiError(
        res.status,
        body.error?.code ?? 'LABEL_ERROR',
        body.error?.message ?? 'Nie udalo sie pobrac etykiety',
      )
    }

    return res.blob()
  },

  updateFulfillmentStatus: (orderId: number, status: string) =>
    request<{ success: boolean }>(`/api/admin/orders/${orderId}/fulfillment`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // ── Products ───────────────────────────────────────────────────────────────
  getProducts: (params?: AdminProductsQueryParams) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    if (params?.active) qs.set('active', params.active)
    if (params?.category) qs.set('category', params.category)

    const suffix = qs.toString()
    return request<AdminProductsResponse>(`/api/admin/products${suffix ? `?${suffix}` : ''}`)
  },

  getProduct: (sku: string) =>
    request<AdminProductResponse>(`/api/admin/products/${encodeURIComponent(sku)}`),

  createProduct: (payload: CreateAdminProductPayload) =>
    request<AdminProductResponse>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (sku: string, payload: UpdateAdminProductPayload) =>
    request<AdminProductResponse>(`/api/admin/products/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateProductStock: (sku: string, payload: UpdateProductStockPayload) =>
    request<UpdateProductStockResponse>(`/api/admin/products/${encodeURIComponent(sku)}/stock`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deactivateProduct: (sku: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/products/${encodeURIComponent(sku)}`, {
      method: 'DELETE',
    }),

  deleteProductPermanently: (sku: string) =>
    request<{ success: boolean; message: string; permanent: true }>(`/api/admin/products/${encodeURIComponent(sku)}?permanent=true`, {
      method: 'DELETE',
    }),

  clearProductCache: (sku: string) =>
    request<{ cleared: boolean }>(`/api/admin/products/${encodeURIComponent(sku)}/cache`, {
      method: 'DELETE',
    }),

  getCategories: () =>
    request<AdminCategoriesResponse>('/api/admin/categories'),

  uploadProductMainImage: async (sku: string, file: File): Promise<UploadProductImageResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'products')
    formData.append('productSku', sku)

    const res = await fetch('/api/admin/uploads/image', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as {
        error?: { code?: string; message?: string } | string
      }
      const errObj = body?.error
      const code = typeof errObj === 'object' && errObj?.code ? errObj.code : 'UPLOAD_ERROR'
      const message =
        (typeof errObj === 'object' && errObj?.message) ||
        (typeof errObj === 'string' ? errObj : null) ||
        `Błąd uploadu (HTTP ${res.status})`
      throw new ApiError(res.status, code, message)
    }

    return res.json() as Promise<UploadProductImageResponse>
  },

  // ── Products: stock history & low-stock ───────────────────────────────────
  getProductStockHistory: (sku: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page)  qs.set('page',  String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    return request<StockHistoryResponse>(
      `/api/admin/products/${encodeURIComponent(sku)}/stock-history?${qs}`
    )
  },

  getLowStockProducts: (threshold = 5) =>
    request<LowStockResponse>(`/api/admin/products/low-stock?threshold=${threshold}`),

  // ── Allegro Products ──────────────────────────────────────────────────────
  getAllegroOffers: (params?: { search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.limit)  qs.set('limit',  String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    return request<AllegroOffersResponse>(`/api/admin/allegro-products/offers?${qs}`)
  },

  linkAllegroOffer: (payload: LinkAllegroOfferPayload) =>
    request<{ success: boolean; data: { sku: string; allegroOfferId: string } }>(
      '/api/admin/allegro-products/link',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  unlinkAllegroOffer: (sku: string) =>
    request<{ success: boolean }>(
      `/api/admin/allegro-products/link/${encodeURIComponent(sku)}`,
      { method: 'DELETE' }
    ),

  pushStockToAllegro: (sku: string) =>
    request<PushStockResponse>(
      `/api/admin/allegro-products/${encodeURIComponent(sku)}/push-stock`,
      { method: 'POST' }
    ),

  pushAllegroSync: (sku: string) =>
    request<PushStockResponse>(
      `/api/admin/allegro-products/${encodeURIComponent(sku)}/push-sync`,
      { method: 'POST' }
    ),

  // ── Activity feed ──────────────────────────────────────────────────────────
  getActivityFeed: (limit = 10) =>
    request<ActivityFeedResponse>(`/api/admin/activity?limit=${limit}`),

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications: () =>
    request<NotificationsResponse>('/api/admin/notifications'),

  // ── Allegro OAuth ──────────────────────────────────────────────────────────
  // These use the Next.js rewrite proxy (/api/* → API worker) so they work
  // in local dev without extra env config.
  getAllegroStatus: () =>
    allegroRequest<AllegroStatusResponse>('/api/admin/allegro/status'),

  getAllegroQuality: (force = false) =>
    allegroRequest<AllegroSalesQualityResponse>(
      `/api/admin/allegro/quality${force ? '?force=true' : ''}`,
    ),

  getAllegroConnectUrl: (environment: AllegroEnvironment = 'production') =>
    allegroRequest<AllegroConnectUrlResponse>(`/api/admin/allegro/connect/url?environment=${environment}`),

  disconnectAllegro: () =>
    allegroRequest<{ success: boolean; message: string }>('/api/admin/allegro/disconnect', { method: 'POST' }),

  refreshAllegroToken: () =>
    allegroRequest<AllegroRefreshResponse>('/api/admin/allegro/refresh', { method: 'POST' }),

  verifyAllegroAccount: () =>
    allegroRequest<{ success: boolean; data: Record<string, unknown> }>('/api/admin/allegro/me'),

  // ── Allegro order details (live from Allegro REST API) ──────────────────
  getAllegroOrderDetails: (externalId: string) =>
    allegroRequest<{ success: boolean; data: import('../types/admin-api').AllegroOrderDetails }>(`/api/admin/allegro/orders/${externalId}`),

  getAllegroOrderTracking: (externalId: string) =>
    allegroRequest<{ success: boolean; data: import('../types/admin-api').AllegroTrackingData }>(`/api/admin/allegro/orders/${externalId}/tracking`),

  // ── Allegro sync ───────────────────────────────────────────────────────
  forceAllegroSync: (resetCursor = false) =>
    allegroRequest<{ success: boolean; message: string; cursorReset: boolean }>(
      `/api/admin/allegro/sync/force${resetCursor ? '?reset=true' : ''}`,
      { method: 'POST' },
    ),

  /** Backfill: imports missing orders from Allegro up to the last saved in DB.
   *  full=true → imports ALL orders regardless (full re-import, may take longer). */
  backfillAllegroOrders: (full = false) =>
    allegroRequest<{ success: boolean; message: string; data: { imported: number; skipped: number; errors: number; stoppedReason: string } }>(
      `/api/admin/allegro/backfill${full ? '?full=true' : ''}`,
      { method: 'POST' },
    ),

  // ── Returns ──────────────────────────────────────────────────────────────────
  getReturns: (params?: ReturnsQueryParams): Promise<ReturnsResponse> => {
    const qs = new URLSearchParams()
    if (params?.page)   qs.set('page',   String(params.page))
    if (params?.limit)  qs.set('limit',  String(params.limit))
    if (params?.status) qs.set('status', params.status)
    if (params?.source) qs.set('source', params.source)
    if (params?.search) qs.set('search', params.search)
    if (params?.from)   qs.set('from',   params.from)
    if (params?.to)     qs.set('to',     params.to)
    return request<ReturnsResponse>(`/api/admin/returns?${qs}`)
  },

  updateReturnStatus: (id: number, status: string) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getReturnDetail: (id: number) =>
    request<{ data: AdminReturn }>(`/api/admin/returns/${id}`),

  approveReturn: (id: number, body?: { refundMethod?: string }) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  rejectReturn: (id: number, body: { code: string; reason?: string }) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  refundReturn: (id: number, body: { amount: number }) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  reopenReturn: (id: number) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  restockReturn: (id: number) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  refreshReturn: (id: number) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/refresh`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  postReturnMessage: (id: number, body: { text: string }) =>
    request<{ success: boolean }>(`/api/admin/returns/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ── Complaints (Allegro Issues / Disputes) ──────────────────────────────────
  getComplaints: (params?: ComplaintsQueryParams): Promise<ComplaintsResponse> => {
    const qs = new URLSearchParams()
    if (params?.page)   qs.set('page',   String(params.page))
    if (params?.limit)  qs.set('limit',  String(params.limit))
    if (params?.status) qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.from)   qs.set('from',   params.from)
    if (params?.to)     qs.set('to',     params.to)
    return request<ComplaintsResponse>(`/api/admin/issues?${qs}`)
  },

  getComplaintDetail: (id: number) =>
    request<{ data: AdminComplaintDetail }>(`/api/admin/issues/${id}`),

  refreshComplaint: (id: number) =>
    request<{ data: { refreshed: boolean; issueId: number; messages: number } }>(`/api/admin/issues/${id}/refresh`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  postComplaintMessage: (id: number, body: { text: string; type?: string; attachmentIds?: string[] }) =>
    request<{ data: { sent: boolean; issueId: number; messages: number } }>(`/api/admin/issues/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateComplaintStatus: (id: number, body: {
    status: string
    message: string
    partialRefund?: { amount: string; currency: string }
  }) =>
    request<{ data: { changed: boolean; issueId: number; messages: number } }>(`/api/admin/issues/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ── Rich Content (D1) ────────────────────────────────────────────────────────
  getProductRichContent: (sku: string) =>
    request<ProductRichContentResponse>(`/api/admin/content/product/${encodeURIComponent(sku)}`),

  upsertProductRichContent: (sku: string, payload: UpsertProductRichContentPayload) =>
    request<ProductRichContentResponse>(`/api/admin/content/product/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  upsertProductWineDetails: (sku: string, wineDetails: Record<string, unknown>, category = 'wine') =>
    request<ProductRichContentResponse>(`/api/admin/content/product/${encodeURIComponent(sku)}/wine-details`, {
      method: 'PUT',
      body: JSON.stringify({ category, wineDetails }),
    }),

  deleteProductRichContent: (sku: string) =>
    request<{ data: { deleted: boolean } }>(`/api/admin/content/product/${encodeURIComponent(sku)}`, {
      method: 'DELETE',
    }),

  getProductRichContentHistory: (sku: string, limit = 20) =>
    request<ContentHistoryResponse>(`/api/admin/content/product/${encodeURIComponent(sku)}/history?limit=${limit}`),

  restoreProductRichContent: (sku: string, historyId: number) =>
    request<ProductRichContentResponse>(
      `/api/admin/content/product/${encodeURIComponent(sku)}/restore/${historyId}`,
      { method: 'POST' }
    ),

  listProducers: (params?: { category?: string; region?: string; country?: string }) => {
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.region)   qs.set('region',   params.region)
    if (params?.country)  qs.set('country',  params.country)
    return request<ProducersListResponse>(`/api/admin/content/producers?${qs}`)
  },

  getProducer: (slug: string) =>
    request<ProducerContentResponse>(`/api/admin/content/producer/${encodeURIComponent(slug)}`),

  upsertProducer: (slug: string, payload: UpsertProducerPayload) =>
    request<ProducerContentResponse>(`/api/admin/content/producer/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

}

// ── Re-export types so components can import from one place ──────────────────
export type {
  DashboardStatsResponse,
  DashboardOverview,
  DashboardOverviewStats,
  DashboardOverviewResponse,
  WeeklyRevenueResponse,
  WeeklyStatsResponse,
  OrdersResponse,
  OrdersQueryParams,
  AdminOrder,
  AdminOrderAllegroSyncResponse,
  ActivityFeedResponse,
  AdminNotification,
  NotificationsResponse,
  AllegroConnectionStatus,
  AllegroStatusResponse,
  AllegroConnectUrlResponse,
  AllegroRefreshResponse,
  AllegroEnvironment,
  AllegroOrderDetails,
  AllegroTrackingData,
  AllegroTrackingStatusEntry,
  DeliveryServicesResponse,
  DeliveryServiceInfo,
  CreateShipmentPayload,
  ShipmentCreatedResponse,
  AllegroSalesQualityResponse,
  AdminProduct,
  AdminProductImage,
  AdminProductsResponse,
  AdminProductsQueryParams,
  AdminProductResponse,
  AdminCategory,
  AdminCategoriesResponse,
  CreateAdminProductPayload,
  UpdateAdminProductPayload,
  UpdateProductStockPayload,
  UpdateProductStockResponse,
  UploadProductImageResponse,
  AdminComplaint,
  AdminComplaintDetail,
  ComplaintsQueryParams,
  ComplaintsResponse,
  ComplaintStatus,
  ComplaintMessage,
  AllegroOffer,
  AllegroOffersResponse,
  LinkAllegroOfferPayload,
  PushStockResponse,
  StockHistoryEntry,
  StockHistoryResponse,
  LowStockProduct,
  LowStockResponse,
  ProductRichContent,
  ProductRichContentResponse,
  UpsertProductRichContentPayload,
  ProducerContent,
  ProducerContentResponse,
  ProducersListResponse,
  UpsertProducerPayload,
  ContentHistoryEntry,
  ContentHistoryResponse,
  RichContentAward,
} from '../types/admin-api'
