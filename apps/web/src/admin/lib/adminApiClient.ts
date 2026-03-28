import type {
  DashboardStatsResponse,
  DashboardOverviewResponse,
  WeeklyRevenueResponse,
  WeeklyStatsResponse,
  OrdersResponse,
  OrdersQueryParams,
  AdminOrder,
  ActivityFeedResponse,
  AllegroStatusResponse,
  AllegroConnectUrlResponse,
  AllegroRefreshResponse,
  AllegroEnvironment,
  AllegroSalesQualityResponse,
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
    if (params?.status && params.status !== 'all') qs.set('status', params.status)
    if (params?.source) qs.set('source', params.source)
    if (params?.from)   qs.set('from',   params.from)
    if (params?.to)     qs.set('to',     params.to)
    if (params?.search) qs.set('search', params.search)
    return request<OrdersResponse>(`/api/admin/orders?${qs}`)
  },

  getOrder: (id: number) =>
    request<{ success: boolean; data: AdminOrder }>(`/api/admin/orders/${id}`),

  updateOrderStatus: (id: number, status: string) =>
    request<{ success: boolean }>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ── Activity feed ──────────────────────────────────────────────────────────
  getActivityFeed: (limit = 10) =>
    request<ActivityFeedResponse>(`/api/admin/activity?limit=${limit}`),

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
  ActivityFeedResponse,
  AllegroConnectionStatus,
  AllegroStatusResponse,
  AllegroConnectUrlResponse,
  AllegroRefreshResponse,
  AllegroEnvironment,
  AllegroOrderDetails,
  AllegroTrackingData,
  AllegroSalesQualityResponse,
} from '../types/admin-api'
