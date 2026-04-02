import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { users, orders, userConsents } from '@repo/db/schema'
import { logAdminAction } from '../../lib/audit'
import { eq, and, desc, sql, like, ilike, isNull, lte, asc } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import type { Env } from '../../index'
import { sanitize } from '../../lib/sanitize'
import { parsePagination, getClientIp, serverError } from '../../lib/request'

export const adminCustomersRouter = new Hono<{ Bindings: Env }>()
adminCustomersRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/customers  🛡️
// Lista klientów z paginacją i wyszukiwaniem
// ============================================
adminCustomersRouter.get('/', auditLogMiddleware('view_customer'), async (c) => {
  try {
    const db               = createDb(c.env.DATABASE_URL)
    const { page, limit } = parsePagination(c)
    const search = sanitize(c.req.query('search') || '', 100)

    const conditions: any[] = [
      isNull(users.anonymizedAt),
      eq(users.role, 'customer'),
    ]
    if (search) {
      conditions.push(ilike(users.email, `%${search}%`))
    }

    const where = and(...conditions)

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(users).where(where),
      db.query.users.findMany({
        columns: {
          id: true, email: true, name: true, role: true,
          emailVerified: true, marketingConsent: true, analyticsConsent: true,
          lastLoginAt: true, lastLoginIp: true, createdAt: true,
          termsVersion: true, privacyVersion: true,
        },
        where,
        orderBy: desc(users.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
    ])

    // Append order count per customer
    const total      = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    return c.json({ success: true, data: rows, meta: { total, page, limit, totalPages } })
  } catch (err) {
    return serverError(c, 'GET /admin/customers', err)
  }
})

// ============================================
// GET /admin/customers/:userId  🛡️
// Szczegóły klienta — RODO: logowane
// ============================================
adminCustomersRouter.get('/:userId', auditLogMiddleware('view_customer'), async (c) => {
  try {
    const db     = createDb(c.env.DATABASE_URL)
    const userId = parseInt(c.req.param('userId'))

    if (isNaN(userId)) return c.json({ error: 'Nieprawidłowe ID użytkownika' }, 400)

    const user = await db.query.users.findFirst({
      columns: {
        id: true, email: true, name: true, role: true,
        emailVerified: true, marketingConsent: true, analyticsConsent: true,
        lastLoginAt: true, lastLoginIp: true, createdAt: true, updatedAt: true,
        termsVersion: true, privacyVersion: true, gdprConsentDate: true,
        dataRetentionUntil: true, anonymizedAt: true,
        failedLoginAttempts: true, lockedUntil: true,
      },
      where: eq(users.id, userId),
    })

    if (!user) return c.json({ error: 'Użytkownik nie znaleziony' }, 404)

    // Fetch recent orders summary
    const orderSummary = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`SUM(CAST(${orders.total} AS NUMERIC))`,
      })
      .from(orders)
      .where(eq(orders.userId, userId))

    // Latest consent per type
    const consentRows = await db
      .select({
        consentType: userConsents.consentType,
        granted:     userConsents.granted,
        version:     userConsents.version,
        createdAt:   userConsents.createdAt,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.createdAt))

    const latestConsents = new Map<string, typeof consentRows[0]>()
    for (const row of consentRows) {
      if (!latestConsents.has(row.consentType)) latestConsents.set(row.consentType, row)
    }

    return c.json({
      success: true,
      data: {
        ...user,
        orders: {
          count: Number(orderSummary[0]?.count ?? 0),
          total: Number(orderSummary[0]?.total ?? 0),
        },
        consents: Object.fromEntries(latestConsents),
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/customers/:userId', err)
  }
})

// ============================================
// POST /admin/customers/:userId/unlock  🛡️
// Odblokowanie konta po lockout
// ============================================
adminCustomersRouter.post('/:userId/unlock', async (c) => {
  try {
    const db     = createDb(c.env.DATABASE_URL)
    const admin  = c.get('user')
    const userId = parseInt(c.req.param('userId'))

    if (isNaN(userId)) return c.json({ error: 'Nieprawidłowe ID' }, 400)

    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId))

    await logAdminAction(db, {
      adminSub:     admin.sub,
      action:       'update_customer',
      targetUserId: userId,
      ipAddress:    getClientIp(c),
      details:      { event: 'account_unlocked' },
    })

    return c.json({ success: true, message: 'Konto zostało odblokowane' })
  } catch (err) {
    return serverError(c, 'POST /admin/customers/:userId/unlock', err)
  }
})

// ============================================
// POST /admin/customers/:userId/anonymize  🛡️
// Wykonanie anonimizacji RODO (Art. 17)
// ============================================
adminCustomersRouter.post('/:userId/anonymize', async (c) => {
  try {
    const db     = createDb(c.env.DATABASE_URL)
    const admin  = c.get('user')
    const userId = parseInt(c.req.param('userId'))

    if (isNaN(userId)) return c.json({ error: 'Nieprawidłowe ID' }, 400)

    const user = await db.query.users.findFirst({
      columns: { id: true, email: true, anonymizedAt: true },
      where: eq(users.id, userId),
    })

    if (!user) return c.json({ error: 'Użytkownik nie znaleziony' }, 404)
    if (user.anonymizedAt) return c.json({ error: 'Konto zostało już zanonimizowane' }, 409)

    // RODO Art. 17 — anonymize PII, retain orders (VAT law)
    await db.update(users).set({
      email:            `anonymized_${userId}@deleted.local`,
      passwordHash:     'ANONYMIZED',
      name:             'Użytkownik usunięty',
      consentIpAddress: null,
      consentUserAgent: null,
      anonymizedAt:     new Date(),
      updatedAt:        new Date(),
    }).where(eq(users.id, userId))

    await logAdminAction(db, {
      adminSub:     admin.sub,
      action:       'anonymize_customer',
      targetUserId: userId,
      ipAddress:    getClientIp(c),
      details: {
        event:         'account_anonymized',
        originalEmail: user.email,
        executedAt:    new Date().toISOString(),
      },
    })

    return c.json({
      success: true,
      message: `Dane użytkownika ID ${userId} zostały zanonimizowane zgodnie z RODO (Art. 17)`,
    })
  } catch (err) {
    return serverError(c, 'POST /admin/customers/:userId/anonymize', err)
  }
})

// ============================================
// GET /admin/gdpr/anonymize-preview  🛡️
// Użytkownicy kwalifikujący się do anonimizacji
// ============================================
adminCustomersRouter.get('/gdpr/anonymize-preview', async (c) => {
  try {
    const db          = createDb(c.env.DATABASE_URL)
    const daysOverdue = parseInt(c.req.query('daysOverdue') || '0', 10)
    const cutoff      = new Date()
    cutoff.setDate(cutoff.getDate() - Math.max(0, daysOverdue))

    const rows = await db.query.users.findMany({
      columns: {
        id: true, email: true, role: true,
        createdAt: true, dataRetentionUntil: true, lastLoginAt: true,
      },
      where: and(
        isNull(users.anonymizedAt),
        sql`${users.dataRetentionUntil} <= ${cutoff.toISOString().split('T')[0]}`,
      ),
      orderBy: asc(users.dataRetentionUntil as any),
      limit: 200,
    })

    return c.json({ success: true, data: rows, meta: { count: rows.length, cutoffDate: cutoff } })
  } catch (err) {
    return serverError(c, 'GET /admin/gdpr/anonymize-preview', err)
  }
})
