import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders,
  returns,
  allegroIssues,
  allegroIssueMessages,
} from '@repo/db/schema'
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import { parsePagination, serverError } from '../../lib/request'
import type { Env } from '../../index'

export const adminIssuesRouter = new Hono<{ Bindings: Env }>()

adminIssuesRouter.use('*', requireAdminOrProxy())

// ============================================
// GET /admin/issues
// Lista reklamacji/dyskusji Allegro z filtrami i paginacją
// ============================================
adminIssuesRouter.get('/', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const { page, limit } = parsePagination(c)
    const status = c.req.query('status') || ''
    const search = c.req.query('search') || ''
    const from   = c.req.query('from')   || ''
    const to     = c.req.query('to')     || ''

    const validStatuses = [
      'DISPUTE_ONGOING',
      'DISPUTE_CLOSED',
      'DISPUTE_UNRESOLVED',
      'CLAIM_SUBMITTED',
      'CLAIM_ACCEPTED',
      'CLAIM_REJECTED',
    ]

    const conditions: any[] = []
    if (status && validStatuses.includes(status)) conditions.push(eq(allegroIssues.status, status))
    if (from) conditions.push(gte(allegroIssues.createdAt, new Date(from)))
    if (to)   conditions.push(lte(allegroIssues.createdAt, new Date(to)))

    if (search) {
      const safe = search.trim().replace(/[%_]/g, '')
      const term = `%${safe}%`
      conditions.push(
        sql`(
          ${allegroIssues.allegroIssueId} ILIKE ${term}
          OR ${allegroIssues.subject} ILIKE ${term}
          OR EXISTS (
            SELECT 1 FROM orders o WHERE o.id = ${allegroIssues.orderId}
              AND (o.order_number ILIKE ${term} OR o.customer_data->>'email' ILIKE ${term})
          )
        )`,
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(allegroIssues).where(where),
      db
        .select({
          id:             allegroIssues.id,
          allegroIssueId: allegroIssues.allegroIssueId,
          orderId:        allegroIssues.orderId,
          returnId:       allegroIssues.returnId,
          status:         allegroIssues.status,
          subject:        allegroIssues.subject,
          lastMessageAt:  allegroIssues.lastMessageAt,
          createdAt:      allegroIssues.createdAt,
          updatedAt:      allegroIssues.updatedAt,
          orderNumber:    orders.orderNumber,
          customerData:   orders.customerData,
        })
        .from(allegroIssues)
        .leftJoin(orders, eq(allegroIssues.orderId, orders.id))
        .where(where)
        .orderBy(desc(allegroIssues.lastMessageAt), desc(allegroIssues.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ])

    // Batch-fetch latest message per issue (for list preview)
    const issueIds = rows.map(r => r.id)
    const latestMessages = issueIds.length > 0
      ? await db.execute(sql`
          SELECT DISTINCT ON (issue_id) issue_id, text, author_role, created_at
          FROM allegro_issue_messages
          WHERE issue_id IN (${sql.join(issueIds.map(id => sql`${id}`), sql`, `)})
          ORDER BY issue_id, created_at DESC
        `)
      : { rows: [] as any[] }

    const latestByIssue: Record<number, { text: string | null; authorRole: string; createdAt: string }> = {}
    for (const m of (latestMessages as any).rows ?? []) {
      latestByIssue[m.issue_id] = {
        text:       m.text,
        authorRole: m.author_role,
        createdAt:  m.created_at,
      }
    }

    const total = Number(countResult[0]?.count ?? 0)
    const totalPages = Math.ceil(total / limit)

    const data = rows.map(r => ({
      ...r,
      customerData: r.customerData as { name?: string; email?: string } | null,
      lastMessage:  latestByIssue[r.id] ?? null,
    }))

    return c.json({ data, meta: { total, page, limit, totalPages } })
  } catch (err) {
    return serverError(c, 'GET /admin/issues', err)
  }
})

// ============================================
// GET /admin/issues/:id
// Szczegóły reklamacji + pełen wątek wiadomości
// ============================================
adminIssuesRouter.get('/:id', auditLogMiddleware('view_order'), async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const issueId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(issueId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID reklamacji' } }, 400)
    }

    const issueRow = await db
      .select({
        id:             allegroIssues.id,
        allegroIssueId: allegroIssues.allegroIssueId,
        orderId:        allegroIssues.orderId,
        returnId:       allegroIssues.returnId,
        status:         allegroIssues.status,
        subject:        allegroIssues.subject,
        lastMessageAt:  allegroIssues.lastMessageAt,
        payload:        allegroIssues.payload,
        createdAt:      allegroIssues.createdAt,
        updatedAt:      allegroIssues.updatedAt,
        orderNumber:    orders.orderNumber,
        customerData:   orders.customerData,
        returnNumber:   returns.returnNumber,
      })
      .from(allegroIssues)
      .leftJoin(orders,  eq(allegroIssues.orderId,  orders.id))
      .leftJoin(returns, eq(allegroIssues.returnId, returns.id))
      .where(eq(allegroIssues.id, issueId))
      .limit(1)

    if (!issueRow[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Reklamacja nie istnieje' } }, 404)
    }

    const messages = await db
      .select()
      .from(allegroIssueMessages)
      .where(eq(allegroIssueMessages.issueId, issueId))
      .orderBy(allegroIssueMessages.createdAt)

    return c.json({
      data: {
        ...issueRow[0],
        customerData: issueRow[0].customerData as { name?: string; email?: string } | null,
        messages,
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/issues/:id', err)
  }
})
