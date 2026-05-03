import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { auditLog, users } from '@repo/db/schema'
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import type { Env } from '../../index'
import { parsePagination, parseQueryDate, serverError } from '../../lib/request'

export const adminAuditRouter = new Hono<{ Bindings: Env }>()
adminAuditRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/audit  🛡️
// Dziennik audytu RODO
// ============================================
adminAuditRouter.get('/', async (c) => {
  try {
    const db               = createDb(c.env.DATABASE_URL)
    const { page, limit } = parsePagination(c)
    const action    = c.req.query('action')  || ''
    const adminIdQ  = c.req.query('adminId') || ''
    const from      = c.req.query('from')    || ''
    const to        = c.req.query('to')      || ''

    const VALID_ACTIONS = [
      'login', 'logout', 'view_customer', 'view_order',
      'export_data', 'update_customer', 'anonymize_customer', 'admin_action',
    ]

    const conditions: any[] = []
    if (action  && VALID_ACTIONS.includes(action)) conditions.push(eq(auditLog.action, action as any))
    if (adminIdQ && !isNaN(parseInt(adminIdQ)))    conditions.push(eq(auditLog.adminId, parseInt(adminIdQ)))
    const fromDate = parseQueryDate(from)
    const toDate = parseQueryDate(to)
    if (fromDate) conditions.push(gte(auditLog.createdAt, fromDate))
    if (toDate)   conditions.push(lte(auditLog.createdAt, toDate))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(auditLog).where(where),
      db.query.auditLog.findMany({
        with: {
          admin: { columns: { id: true, email: true, name: true } },
          targetUser: { columns: { id: true, email: true } },
        },
        where,
        orderBy: desc(auditLog.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
    ])

    const total      = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    return c.json({ success: true, data: rows, meta: { total, page, limit, totalPages } })
  } catch (err) {
    return serverError(c, 'GET /admin/audit', err)
  }
})

// ============================================
// GET /admin/audit/stats  🛡️
// Statystyki audytu — podsumowanie
// ============================================
adminAuditRouter.get('/stats', async (c) => {
  try {
    const db   = createDb(c.env.DATABASE_URL)
    const days = Math.min(90, Math.max(1, parseInt(c.req.query('days') || '7', 10)))
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const byAction = await db
      .select({
        action: auditLog.action,
        count:  sql<number>`COUNT(*)`
      })
      .from(auditLog)
      .where(gte(auditLog.createdAt, from))
      .groupBy(auditLog.action)
      .orderBy(desc(sql`COUNT(*)`))

    return c.json({ success: true, data: { period: { days, from }, byAction } })
  } catch (err) {
    return serverError(c, 'GET /admin/audit/stats', err)
  }
})
