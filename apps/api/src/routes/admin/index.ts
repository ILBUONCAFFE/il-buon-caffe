import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { orders, users, products, allegroIssues } from '@repo/db/schema'
import { eq, and, sql, gte, lt, desc, isNull } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { serverError } from '../../lib/request'
import { adminOrdersRouter } from './orders'
import { adminProductsRouter } from './products'
import { adminCustomersRouter } from './customers'
import { adminAuditRouter } from './audit'
import { adminCategoriesRouter } from './categories'
import { adminShipmentsRouter } from './shipments'
import { adminReturnsRouter } from './returns'
import { adminIssuesRouter } from './issues'
import { adminAllegroProductsRouter } from './allegro-products'
import { adminContentRouter } from './content'
import type { Env } from '../../index'
import { attachCurrentOrderStatuses, currentOrderStatusSql, orderStatusEq, orderStatusIn } from '../../lib/order-status'

// ── Polish timezone helpers ───────────────────────────────────────────────────
const PL_DAYS = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']

/**
 * Returns the UTC instant that corresponds to midnight in Warsaw (Europe/Warsaw)
 * for the date that is `daysAgo` calendar days ago in Warsaw time.
 * Uses Intl.DateTimeFormat so it handles CET (UTC+1) / CEST (UTC+2) DST correctly.
 */
function polishMidnightUTC(daysAgo = 0): Date {
  const target  = new Date(Date.now() - daysAgo * 86_400_000)
  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(target)
  const utcMid  = new Date(dateStr + 'T00:00:00Z')
  // Warsaw hour at UTC midnight tells us the local offset (1 for CET, 2 for CEST)
  const warsawH = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour: '2-digit', hour12: false }).format(utcMid),
    10,
  )
  return new Date(utcMid.getTime() - warsawH * 3_600_000)
}

/** ISO date string (YYYY-MM-DD) for the current date in Warsaw timezone, shifted by `daysAgo` */
function polishDateStr(daysAgo = 0): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(
    new Date(Date.now() - daysAgo * 86_400_000),
  )
}

/** Polish weekday abbreviation (Pon/Wt/…) for a given ISO date string */
function polishDayAbbr(dateStr: string): string {
  return PL_DAYS[new Date(dateStr + 'T12:00:00Z').getUTCDay()]
}

/**
 * Read from KV cache; on miss, compute via `fn`, store the result, and return it.
 * Returns `{ data, cached }` so callers can include the `cached` flag in responses.
 */
async function kvCached<T>(
  kv: KVNamespace,
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  const hit = await kv.get(key)
  if (hit) return { data: JSON.parse(hit) as T, cached: true }
  const data = await fn()
  await kv.put(key, JSON.stringify(data), { expirationTtl: ttl })
  return { data, cached: false }
}

export const adminRouter = new Hono<{ Bindings: Env }>()

// ── Sub-routers ─────────────────────────────────────────────────────────────
adminRouter.route('/',          adminShipmentsRouter)
adminRouter.route('/orders',     adminOrdersRouter)
adminRouter.route('/products',   adminProductsRouter)
adminRouter.route('/customers',  adminCustomersRouter)
adminRouter.route('/audit',      adminAuditRouter)
adminRouter.route('/categories', adminCategoriesRouter)
adminRouter.route('/returns',    adminReturnsRouter)
adminRouter.route('/issues',           adminIssuesRouter)
adminRouter.route('/allegro-products', adminAllegroProductsRouter)
adminRouter.route('/content',          adminContentRouter)

// ============================================
// GET /admin/dashboard  🛡️
// Podsumowanie dla dashboardu admina
// ============================================
adminRouter.get('/dashboard', requireAdminOrProxy(), async (c) => {
  try {
    const db    = createDb(c.env.DATABASE_URL)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      ordersToday,
      ordersPending,
      ordersProcessing,
      revenueMonth,
      totalCustomers,
      lowStockProducts,
    ] = await Promise.all([
      // Orders created today
      db.select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(gte(orders.createdAt, today)),

      // Orders ready for fulfilment/packing
      db.select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(orderStatusIn(orders.id, ['paid', 'processing'])),

      // Processing orders
      db.select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(orderStatusEq(orders.id, 'processing')),

      // Monthly revenue — PLN-normalised (uses total_pln when available)
      db.select({
        total: sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)), 0)`,
      })
        .from(orders)
        .where(and(
          gte(orders.createdAt, thirtyDaysAgo),
          orderStatusIn(orders.id, ['paid', 'processing', 'shipped', 'delivered']),
        )),

      // Total customers (non-anonymized)
      db.select({ count: sql<number>`COUNT(*)` }).from(users).where(
        and(eq(users.role, 'customer'), isNull(users.anonymizedAt)),
      ),

      // Products with available stock <= 2
      db.select({ count: sql<number>`COUNT(*)` })
        .from(products)
        .where(and(eq(products.isActive, true), sql`${products.stock} - ${products.reserved} <= 2`)),
    ])

    // Recent orders
    const recentOrders = await db.query.orders.findMany({
      columns: {
        id: true, orderNumber: true, source: true,
        total: true, customerData: true, createdAt: true,
      },
      orderBy: desc(orders.createdAt),
      limit: 5,
    })

    return c.json({
      success: true,
      data: {
        stats: {
          ordersToday:      Number(ordersToday[0]?.count ?? 0),
          ordersPending:    Number(ordersPending[0]?.count ?? 0),
          ordersProcessing: Number(ordersProcessing[0]?.count ?? 0),
          revenueMonth:     Number(revenueMonth[0]?.total ?? 0),
          totalCustomers:   Number(totalCustomers[0]?.count ?? 0),
          lowStockProducts: Number(lowStockProducts[0]?.count ?? 0),
        },
        recentOrders: (await attachCurrentOrderStatuses(db, recentOrders)).map(o => ({
          ...o,
          total: Number(o.total),
        })),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/dashboard', err)
  }
})

// ============================================
// GET /admin/stats/overview  🛡️
// Dashboard stats z porównaniem dzień-do-dnia
// + podział na źródło (shop / allegro)
// + KV cache 5 min (§22.3 ALLEGRO_API_STRATEGY)
// ============================================
adminRouter.get('/stats/overview', requireAdminOrProxy(), async (c) => {
  try {
    const { data, cached } = await kvCached(c.env.ALLEGRO_KV, 'stats:today', 300, async () => {
      const db = createDb(c.env.DATABASE_URL)

      // Polish-timezone midnight UTC instants for index-friendly range queries
      const todayStart     = polishMidnightUTC(0)
      const tomorrowStart  = polishMidnightUTC(-1)   // tomorrow midnight = upper bound for today
      const yesterdayStart = polishMidnightUTC(1)
      const day30agoStart  = polishMidnightUTC(30)
      const day60agoStart  = polishMidnightUTC(60)

      const PAID = orderStatusIn(orders.id, ['paid', 'processing', 'shipped', 'delivered'])

      // All revenue/count queries use paidAt so they reflect actual payment date in PL time
      const [todayRow, ydayRow, avg30Row, avgPrior30Row, todayCntRow, ydayCntRow] = await Promise.all([
        // Today: total + allegro breakdown (paidAt in today's Polish calendar day)
        db.select({
          total:        sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)), 0)`,
          allegroTotal: sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)) FILTER (WHERE ${orders.source} = 'allegro'), 0)`,
          allegroCount: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${orders.source} = 'allegro'), 0)`,
        }).from(orders).where(and(PAID, gte(orders.paidAt, todayStart), lt(orders.paidAt, tomorrowStart))),

        // Yesterday revenue (for % change)
        db.select({ v: sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)),0)` })
          .from(orders).where(and(PAID, gte(orders.paidAt, yesterdayStart), lt(orders.paidAt, todayStart))),

        // Avg order value — last 30 days (paid)
        db.select({ v: sql<number>`COALESCE(AVG(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)),0)` })
          .from(orders).where(and(PAID, gte(orders.paidAt, day30agoStart), lt(orders.paidAt, tomorrowStart))),

        // Avg order value — prior 30 days (for % change)
        db.select({ v: sql<number>`COALESCE(AVG(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)),0)` })
          .from(orders).where(and(PAID, gte(orders.paidAt, day60agoStart), lt(orders.paidAt, day30agoStart))),

        // Today paid order count (shipments paid today in PL time)
        db.select({ v: sql<number>`COUNT(*)` })
          .from(orders).where(and(PAID, gte(orders.paidAt, todayStart), lt(orders.paidAt, tomorrowStart))),

        // Yesterday paid order count (for % change)
        db.select({ v: sql<number>`COUNT(*)` })
          .from(orders).where(and(PAID, gte(orders.paidAt, yesterdayStart), lt(orders.paidAt, todayStart))),
      ])

      const pct = (cur: number, prev: number) =>
        prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10

      const tv  = Number(todayRow[0]?.total    ?? 0)
      const yv  = Number(ydayRow[0]?.v         ?? 0)
      const av  = Number(avg30Row[0]?.v        ?? 0)
      const pv  = Number(avgPrior30Row[0]?.v   ?? 0)
      const tc  = Number(todayCntRow[0]?.v     ?? 0)
      const yc  = Number(ydayCntRow[0]?.v      ?? 0)
      const alr = Number(todayRow[0]?.allegroTotal ?? 0)
      const alc = Number(todayRow[0]?.allegroCount ?? 0)

      return {
        todayRevenue:        tv,
        revenueChange:       pct(tv, yv),
        todayOrders:         tc,
        ordersChange:        pct(tc, yc),
        avgOrderValue:       av,
        avgOrderValueChange: pct(av, pv),
        // Podział na kanały (gotowe na dane z Allegro)
        allegroRevenue:      alr,
        allegroOrders:       alc,
        shopRevenue:         Math.round((tv - alr) * 100) / 100,
        shopOrders:          tc - alc,
      }
    })

    return c.json({ success: true, data, ...(cached && { cached: true }) })
  } catch (err) {
    return serverError(c, 'GET /admin/stats/overview', err)
  }
})

// ============================================
// GET /admin/stats/weekly-revenue  🛡️
// Przychód z ostatnich 7 dni z podziałem shop/allegro
// Grupowanie po paidAt w strefie czasowej PL (Europe/Warsaw)
// KV cache 5 min
// ============================================
adminRouter.get('/stats/weekly-revenue', requireAdminOrProxy(), async (c) => {
  try {
    const { data, cached } = await kvCached(c.env.ALLEGRO_KV, 'stats:weekly-revenue', 300, async () => {
      const db = createDb(c.env.DATABASE_URL)
      // Last 7 days including today — index-friendly lower bound in UTC
      const weekAgoStart = polishMidnightUTC(6)

      const rows = await db
        .select({
          // Group by calendar date in Warsaw timezone for correct PL-midnight boundaries
          day:     sql<string>`DATE(${orders.paidAt} AT TIME ZONE 'Europe/Warsaw')`,
          shop:    sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)) FILTER (WHERE ${orders.source} = 'shop'), 0)`,
          allegro: sql<number>`COALESCE(SUM(COALESCE(CAST(${orders.totalPln} AS NUMERIC), CASE WHEN ${orders.currency} = 'PLN' THEN CAST(${orders.total} AS NUMERIC) ELSE NULL END)) FILTER (WHERE ${orders.source} = 'allegro'), 0)`,
        })
        .from(orders)
        .where(and(
          gte(orders.paidAt, weekAgoStart),
          orderStatusIn(orders.id, ['paid', 'processing', 'shipped', 'delivered']),
        ))
        .groupBy(sql`DATE(${orders.paidAt} AT TIME ZONE 'Europe/Warsaw')`)
        .orderBy(sql`DATE(${orders.paidAt} AT TIME ZONE 'Europe/Warsaw')`)

      const shopMap    = Object.fromEntries(rows.map(r => [r.day, Number(r.shop)]))
      const allegroMap = Object.fromEntries(rows.map(r => [r.day, Number(r.allegro)]))

      // Build 7-day result using Polish calendar dates (oldest → today)
      return Array.from({ length: 7 }, (_, i) => {
        const dateStr = polishDateStr(6 - i)
        const shop    = shopMap[dateStr]    ?? 0
        const allegro = allegroMap[dateStr] ?? 0
        return { day: polishDayAbbr(dateStr), revenue: shop + allegro, shop, allegro }
      })
    })

    return c.json({ success: true, data, ...(cached && { cached: true }) })
  } catch (err) {
    return serverError(c, 'GET /admin/stats/weekly-revenue', err)
  }
})

// ============================================
// GET /admin/stats/weekly  🛡️
// Liczba opłaconych zamówień z ostatnich 7 dni (po paidAt w strefie PL)
// KV cache 5 min
// ============================================
adminRouter.get('/stats/weekly', requireAdminOrProxy(), async (c) => {
  try {
    const { data, cached } = await kvCached(c.env.ALLEGRO_KV, 'stats:weekly', 300, async () => {
      const db = createDb(c.env.DATABASE_URL)
      const weekAgoStart = polishMidnightUTC(6)

      const rows = await db
        .select({
          day:   sql<string>`DATE(${orders.paidAt} AT TIME ZONE 'Europe/Warsaw')`,
          value: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(
          gte(orders.paidAt, weekAgoStart),
          orderStatusIn(orders.id, ['paid', 'processing', 'shipped', 'delivered']),
        ))
        .groupBy(sql`DATE(${orders.paidAt} AT TIME ZONE 'Europe/Warsaw')`)
        .orderBy(sql`DATE(${orders.paidAt} AT TIME ZONE 'Europe/Warsaw')`)

      const map = Object.fromEntries(rows.map(r => [r.day, Number(r.value)]))
      return Array.from({ length: 7 }, (_, i) => {
        const dateStr = polishDateStr(6 - i)
        return { day: polishDayAbbr(dateStr), value: map[dateStr] ?? 0 }
      })
    })

    return c.json({ success: true, data, ...(cached && { cached: true }) })
  } catch (err) {
    return serverError(c, 'GET /admin/stats/weekly', err)
  }
})

// ============================================
// GET /admin/activity  🛡️
// Ostatnia aktywność (zamówienia + logi admina)
// ============================================
adminRouter.get('/activity', requireAdminOrProxy(), async (c) => {
  try {
    const db    = createDb(c.env.DATABASE_URL)
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '10', 10)))

    // Recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: currentOrderStatusSql(orders.id),
        source: orders.source,
        total: orders.total,
        currency: orders.currency,
        customerData: orders.customerData,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit)

    // Currency symbol map — extend when adding new markets
    const currencySymbol: Record<string, string> = { PLN: 'zł', EUR: '€', CZK: 'Kč', HUF: 'Ft' }

    const activityItems = recentOrders.map(o => {
      const customer = (o.customerData as { name?: string } | null)?.name ?? 'Klient'
      const isAllegro = o.source === 'allegro'
      const type = isAllegro ? 'allegro' : 'sale'
      const sym  = currencySymbol[o.currency ?? 'PLN'] ?? o.currency
      return {
        id:      o.id,
        type,
        text:    `Zamówienie ${o.orderNumber}`,
        subtext: customer,
        amount:  `${Number(o.total).toFixed(2)} ${sym}`,
        currency: o.currency ?? 'PLN',
        time:    o.createdAt.toISOString(),
      }
    })

    return c.json({ success: true, data: activityItems })
  } catch (err) {
    return serverError(c, 'GET /admin/activity', err)
  }
})

// ============================================
// GET /admin/notifications  🛡️
// Powiadomienia: nowe zamówienia + niski stan magazynowy + reklamacje Allegro
// ============================================
adminRouter.get('/notifications', requireAdminOrProxy(), async (c) => {
  try {
    const db      = createDb(c.env.DATABASE_URL)
    const now     = new Date()
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const since1h  = new Date(now.getTime() - 60 * 60 * 1000)

    const openIssueStatuses = [
      'CLAIM_SUBMITTED',
      'DISPUTE_ONGOING',
      'DISPUTE_UNRESOLVED',
    ]

    const [recentOrders, lowStockItems, activeIssues] = await Promise.all([
      db.select({
        id:           orders.id,
        orderNumber:  orders.orderNumber,
        status:       currentOrderStatusSql(orders.id),
        total:        orders.total,
        totalPln:     orders.totalPln,
        currency:     orders.currency,
        customerData: orders.customerData,
        createdAt:    orders.createdAt,
        paidAt:       orders.paidAt,
      })
        .from(orders)
        .where(gte(orders.createdAt, since24h))
        .orderBy(desc(orders.createdAt))
        .limit(8),

      db.select({
        sku:      products.sku,
        name:     products.name,
        stock:    products.stock,
        reserved: products.reserved,
      })
        .from(products)
        .where(and(
          eq(products.isActive, true),
          sql`${products.stock} - ${products.reserved} <= 5`,
        ))
        .orderBy(sql`${products.stock} - ${products.reserved}`)
        .limit(3),

      db.select({
        id:             allegroIssues.id,
        allegroIssueId: allegroIssues.allegroIssueId,
        status:         allegroIssues.status,
        subject:        allegroIssues.subject,
        lastMessageAt:  allegroIssues.lastMessageAt,
        payload:        allegroIssues.payload,
        createdAt:      allegroIssues.createdAt,
        updatedAt:      allegroIssues.updatedAt,
        orderNumber:    orders.orderNumber,
      })
        .from(allegroIssues)
        .leftJoin(orders, eq(allegroIssues.orderId, orders.id))
        .where(sql`${allegroIssues.status} IN (${sql.join(openIssueStatuses.map(s => sql`${s}`), sql`, `)})`)
        .orderBy(
          sql`CASE WHEN ${allegroIssues.status} = 'CLAIM_SUBMITTED' THEN 0 ELSE 1 END`,
          desc(allegroIssues.lastMessageAt),
          desc(allegroIssues.updatedAt),
        )
        .limit(8),
    ])

    const sym: Record<string, string> = { PLN: 'zł', EUR: '€' }
    const todayWarsaw = polishDateStr(0)

    type Notif = { id: string; type: string; title: string; message: string; createdAt: string; unread: boolean }
    const result: Notif[] = []

    for (const o of recentOrders) {
      const customer = (o.customerData as { name?: string } | null)?.name ?? 'Klient'
      const currency = o.currency ?? 'PLN'
      const total = Number(o.totalPln ?? (currency === 'PLN' ? o.total : 0)).toFixed(2)
      const unit  = sym[currency] ?? currency
      const isUnread = o.createdAt >= since1h

      if (o.status === 'pending') {
        result.push({
          id:        `order-${o.id}`,
          type:      'order',
          title:     'Nowe zamówienie',
          message:   `${o.orderNumber} · ${customer} · ${total} ${unit}`,
          createdAt: o.createdAt.toISOString(),
          unread:    isUnread,
        })
      } else if (o.status === 'paid' && o.paidAt) {
        result.push({
          id:        `payment-${o.id}`,
          type:      'payment',
          title:     'Płatność otrzymana',
          message:   `${total} ${unit} od ${customer}`,
          createdAt: (o.paidAt as Date).toISOString(),
          unread:    isUnread,
        })
      }
    }

    for (const p of lowStockItems) {
      const available = Math.max(0, (p.stock ?? 0) - (p.reserved ?? 0))
      result.push({
        id:        `stock-${p.sku}`,
        type:      'stock',
        title:     'Niski stan magazynowy',
        message:   `${p.name} — zostało ${available} szt.`,
        createdAt: now.toISOString(),
        unread:    false,
      })
    }

    for (const issue of activeIssues) {
      const payload = issue.payload as {
        type?: string
        referenceNumber?: string | null
        decisionDueDate?: string | null
        currentState?: { statusDueDate?: string | null; dueDate?: string | null }
        buyer?: { login?: string }
      } | null
      const dueIso = payload?.decisionDueDate
        ?? payload?.currentState?.statusDueDate
        ?? payload?.currentState?.dueDate
        ?? null
      const dueDate = dueIso ? new Date(dueIso) : null
      const hoursToDue = dueDate ? (dueDate.getTime() - now.getTime()) / 3_600_000 : null
      const dueSoon = issue.status === 'CLAIM_SUBMITTED' && hoursToDue !== null && hoursToDue <= 48
      const overdue = issue.status === 'CLAIM_SUBMITTED' && hoursToDue !== null && hoursToDue < 0
      const reference = payload?.referenceNumber ?? issue.subject ?? issue.allegroIssueId
      const orderRef = issue.orderNumber ? `zam. ${issue.orderNumber}` : `ID ${issue.allegroIssueId}`
      const createdAt = (issue.lastMessageAt ?? issue.updatedAt ?? issue.createdAt).toISOString()
      const dueLabel = dueDate
        ? todayWarsaw === new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(dueDate)
          ? 'dzisiaj'
          : dueDate.toLocaleDateString('pl-PL')
        : '-'

      result.push({
        id:        `issue-${issue.id}`,
        type:      'complaint',
        title:     overdue
          ? 'Przekroczony termin reklamacji'
          : dueSoon
            ? 'Termin reklamacji blisko'
            : issue.status === 'CLAIM_SUBMITTED'
              ? 'Reklamacja do rozpatrzenia'
              : issue.status === 'DISPUTE_UNRESOLVED'
                ? 'Nierozwiązana dyskusja Allegro'
                : 'Aktywna dyskusja Allegro',
        message:   dueSoon || overdue
          ? `${reference} · ${orderRef} · termin ${dueLabel}`
          : `${reference} · ${orderRef}`,
        createdAt,
        unread:    Boolean(issue.lastMessageAt && issue.lastMessageAt >= since1h) || overdue,
      })
    }

    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return c.json({ success: true, data: result })
  } catch (err) {
    return serverError(c, 'GET /admin/notifications', err)
  }
})
