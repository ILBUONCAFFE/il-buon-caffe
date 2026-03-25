'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../lib/adminApiClient'
import type { DashboardStats, DashboardOverview, WeeklyRevenuePoint, WeeklyPoint, OrdersQueryParams, AdminOrder, ActivityItem, AllegroConnectionStatus, AllegroSalesQuality } from '../types/admin-api'

// ── Generic async state ───────────────────────────────────────────────────────
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })

  const run = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }))
    fetcher()
      .then(data => setState({ data, loading: false, error: null }))
      .catch((err: Error) => setState({ data: null, loading: false, error: err.message }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  return { ...state, refetch: run }
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export function useDashboardStats() {
  const { data, loading, error, refetch } = useAsync(
    () => adminApi.getDashboardStats().then(r => r.data),
  )
  return { stats: data as DashboardStats | null, loading, error, refetch }
}

// ── Dashboard overview (monthly revenue, pending orders, customers, low stock) ─
export function useDashboardOverview() {
  const { data, loading, error, refetch } = useAsync(
    () => adminApi.getDashboardOverview().then(r => r.data),
  )
  return { overview: data as DashboardOverview | null, loading, error, refetch }
}

// ── Allegro connection status ─────────────────────────────────────────────────
export function useAllegroStatus() {
  const { data, loading, error, refetch } = useAsync(
    () => adminApi.getAllegroStatus().then(r => r.data),
  )
  return { allegroStatus: data as AllegroConnectionStatus | null, loading, error, refetch }
}

// ── Weekly revenue chart (Mon → yesterday) ───────────────────────────────────
export function useWeeklyRevenue() {
  const { data, loading, error, refetch } = useAsync(
    () => adminApi.getWeeklyRevenue().then(r => r.data),
  )
  return { revenueData: data as WeeklyRevenuePoint[] | null, loading, error, refetch }
}

// ── Weekly stats ──────────────────────────────────────────────────────────────
export function useWeeklyStats() {
  const { data, loading, error, refetch } = useAsync(
    () => adminApi.getWeeklyStats().then(r => r.data),
  )
  return { weeklyData: data as WeeklyPoint[] | null, loading, error, refetch }
}

// ── Orders (with local filter state) ─────────────────────────────────────────
export function useOrders(params: OrdersQueryParams = {}) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi.getOrders(params)
      .then(res => {
        setOrders(res.data)
        setMeta(res.meta)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.limit, params.status, params.source, params.from, params.to])

  useEffect(() => { fetch() }, [fetch])

  return { orders, meta, loading, error, refetch: fetch }
}

// ── Allegro sales quality ─────────────────────────────────────────────────────
export function useSalesQuality() {
  const [forceCount, setForceCount] = useState(0)

  const { data, loading, error } = useAsync(
    () => adminApi.getAllegroQuality(forceCount > 0).then(r => r.data),
    [forceCount],
  )

  const refetch = useCallback(() => setForceCount(n => n + 1), [])

  return {
    quality: data as AllegroSalesQuality | null,
    loading,
    error,
    refetch,
  }
}

// ── Activity feed ─────────────────────────────────────────────────────────────
export function useActivityFeed(limit = 10) {
  const { data, loading, error, refetch } = useAsync(
    () => adminApi.getActivityFeed(limit).then(r => r.data),
    [limit],
  )
  return { activities: data as ActivityItem[] | null, loading, error, refetch }
}

