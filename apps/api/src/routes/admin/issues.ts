import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  orders,
  returns,
  allegroIssues,
  allegroIssueMessages,
} from '@repo/db/schema'
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm'
import { requireAdminOrProxy } from '../../middleware/auth'
import { auditLogMiddleware } from '../../middleware/auditLog'
import { parsePagination, serverError } from '../../lib/request'
import { resolveAccessToken } from '../../lib/allegro-orders/resolve-token'
import {
  changeIssueStatus,
  getIssue,
  listIssueMessages,
  postIssueMessage,
  type AllegroIssue,
  type AllegroIssueMessage,
} from '../../lib/allegro-returns/client'
import type { Env } from '../../index'

export const adminIssuesRouter = new Hono<{ Bindings: Env }>()

adminIssuesRouter.use('*', requireAdminOrProxy())

const ALLEGRO_API_BASE_URLS = {
  production: 'https://api.allegro.pl',
  sandbox:    'https://api.allegro.pl.allegrosandbox.pl',
} as const

function issueStatus(issue: AllegroIssue): string {
  return issue.currentState?.status ?? issue.status ?? 'DISPUTE_ONGOING'
}

function issueLastMessageAt(issue: AllegroIssue, messages: AllegroIssueMessage[] = []): Date | null {
  const dates = [
    issue.chat?.lastMessage?.createdAt,
    issue.lastMessageAt,
    ...messages.map(m => m.createdAt),
  ].filter(Boolean) as string[]
  if (dates.length === 0) return null
  const newest = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
  return newest ? new Date(newest) : null
}

function normalizeAuthorRole(role: string | undefined): string {
  if (role === 'SELLER' || role === 'ALLEGRO' || role === 'BUYER') return role
  if (role === 'ADMIN' || role === 'FULFILLMENT') return 'ALLEGRO'
  return 'BUYER'
}

function normalizeAttachments(
  attachments: AllegroIssueMessage['attachments'],
): Array<{ id: string; url?: string; name?: string }> | null {
  if (!attachments || attachments.length === 0) return null
  return attachments.map(a => ({
    id: String(a.id),
    url: a.url,
    name: a.name ?? a.fileName,
  }))
}

function translateIssueSubject(subject: string): string | null {
  const normalized = subject.trim().toLowerCase()
  if (!normalized) return null

  if (normalized.includes('i have not received the product')) {
    return 'Nie otrzymałem produktu'
  }
  if (normalized.includes('product and parcel damaged')) {
    return 'Produkt i przesyłka uszkodzone w transporcie'
  }
  if (normalized.includes('does not match the description')) {
    return 'Produkt niezgodny z opisem'
  }
  if (normalized.includes('product damaged') || normalized.includes('damaged product')) {
    return 'Produkt uszkodzony'
  }
  if (normalized.includes('wrong product')) {
    return 'Otrzymano niewłaściwy produkt'
  }
  if (normalized.includes('missing product') || normalized.includes('missing item')) {
    return 'Brak produktu w przesyłce'
  }

  const looksEnglish = /\b(the|product|parcel|received|description|damaged|match|wrong|broken|missing|delivery|order)\b/i.test(subject)
  return looksEnglish ? null : subject.trim()
}

function buildIssueSubject(issue: Partial<AllegroIssue> | null | undefined, allegroIssueId: string): string {
  const rawSubject = typeof issue?.subject === 'string' ? issue.subject.trim() : ''
  const translatedSubject = rawSubject ? translateIssueSubject(rawSubject) : null
  if (translatedSubject) return translatedSubject

  const base = issue?.type === 'CLAIM' ? 'Reklamacja Allegro' : 'Dyskusja Allegro'
  const reason = issue?.reason && typeof issue.reason === 'object'
    ? issue.reason as { description?: unknown }
    : null
  const reasonDescription = typeof reason?.description === 'string' ? reason.description.trim() : ''
  const description = typeof issue?.description === 'string' ? issue.description.trim() : ''
  const detail = reasonDescription || description
  if (detail) {
    return `${base}: ${detail}`
  }

  const reference = issue?.referenceNumber?.trim() || allegroIssueId
  return `${base} nr ${reference}`
}

function normalizeCustomerData(
  customerData: { name?: string; email?: string } | null | undefined,
  issue: Partial<AllegroIssue> | null | undefined,
): { name?: string; email?: string } | null {
  const name = customerData?.name?.trim() || issue?.buyer?.login?.trim() || ''
  const email = customerData?.email?.trim() || ''

  if (!name && !email) return null

  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
  }
}

function normalizeMessageFromPayload(
  issueId: number,
  message: AllegroIssueMessage | null | undefined,
): {
  id: number
  issueId: number
  allegroMessageId: string
  authorRole: string
  text: string | null
  attachments: Array<{ id: string; url?: string; name?: string }> | null
  createdAt: string
} | null {
  if (!message?.id || !message.createdAt) return null

  return {
    id: -1,
    issueId,
    allegroMessageId: message.id,
    authorRole: normalizeAuthorRole(message.author?.role),
    text: typeof message.text === 'string' ? message.text : null,
    attachments: normalizeAttachments(message.attachments),
    createdAt: message.createdAt,
  }
}

function withInitialMessageFallback(
  issueId: number,
  messages: Array<{
    id: number
    issueId: number
    allegroMessageId: string
    authorRole: string
    text: string | null
    attachments: Array<{ id: string; url?: string; name?: string }> | null
    createdAt: Date | string
  }>,
  issue: Partial<AllegroIssue> | null | undefined,
) {
  const initialMessage = normalizeMessageFromPayload(issueId, issue?.chat?.initialMessage)
  if (!initialMessage) return messages

  const hasInitialMessage = messages.some((message) => message.allegroMessageId === initialMessage.allegroMessageId)
  if (hasInitialMessage) return messages

  return [
    {
      ...initialMessage,
      createdAt: new Date(initialMessage.createdAt),
    },
    ...messages,
  ]
}

async function upsertIssueFromAllegro(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  issue: AllegroIssue,
  messages: AllegroIssueMessage[] = [],
): Promise<{ issueId: number; orderId: number | null }> {
  const checkoutFormId = issue.checkoutForm?.id
  const orderRow = checkoutFormId
    ? await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.externalId, checkoutFormId))
        .limit(1)
    : []
  const orderId = orderRow[0]?.id ?? null
  const lastMessageAt = issueLastMessageAt(issue, messages)

  const [row] = await db
    .insert(allegroIssues)
    .values({
      allegroIssueId: issue.id,
      orderId,
      returnId: null,
      status: issueStatus(issue),
      subject: buildIssueSubject(issue, issue.id),
      lastMessageAt,
      payload: issue as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: allegroIssues.allegroIssueId,
      set: {
        orderId,
        status: issueStatus(issue),
        subject: buildIssueSubject(issue, issue.id),
        lastMessageAt,
        payload: issue as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    })
    .returning({ id: allegroIssues.id })

  const localIssueId = row.id
  for (const message of messages) {
    await db
      .insert(allegroIssueMessages)
      .values({
        issueId: localIssueId,
        allegroMessageId: message.id,
        authorRole: normalizeAuthorRole(message.author?.role),
        text: message.text ?? null,
        attachments: normalizeAttachments(message.attachments),
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
      })
      .onConflictDoUpdate({
        target: allegroIssueMessages.allegroMessageId,
        set: {
          authorRole: normalizeAuthorRole(message.author?.role),
          text: message.text ?? null,
          attachments: normalizeAttachments(message.attachments),
        },
      })
  }

  return { issueId: localIssueId, orderId }
}

async function refreshIssueFromAllegro(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  env: Env,
  allegroIssueId: string,
): Promise<{ issueId: number; orderId: number | null; messages: number }> {
  const accessToken = await resolveAccessToken(env.ALLEGRO_KV, db, env)
  if (!accessToken) {
    throw new Error('ALLEGRO_TOKEN_UNAVAILABLE')
  }

  const environment = env.ALLEGRO_ENVIRONMENT ?? 'production'
  const apiBase = ALLEGRO_API_BASE_URLS[environment] ?? ALLEGRO_API_BASE_URLS.production
  const [issue, messagesResponse] = await Promise.all([
    getIssue(allegroIssueId, apiBase, accessToken, db),
    listIssueMessages(allegroIssueId, { limit: 100 }, apiBase, accessToken, db),
  ])
  const messages = messagesResponse.chat
  const result = await upsertIssueFromAllegro(db, issue, messages)
  return { ...result, messages: messages.length }
}

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
          payload:        allegroIssues.payload,
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

    const data = rows.map((r) => {
      const payload = (r.payload ?? null) as AllegroIssue | null
      const { payload: _payload, ...rest } = r
      return {
        ...rest,
        subject: buildIssueSubject(payload, r.allegroIssueId),
        customerData: normalizeCustomerData(r.customerData as { name?: string; email?: string } | null, payload),
        lastMessage: latestByIssue[r.id] ?? normalizeMessageFromPayload(r.id, payload?.chat?.initialMessage),
      }
    })

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

    const loadIssueRow = () => db
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

    const loadMessages = () => db
      .select()
      .from(allegroIssueMessages)
      .where(eq(allegroIssueMessages.issueId, issueId))
      .orderBy(allegroIssueMessages.createdAt)

    let issueRow = await loadIssueRow()

    if (!issueRow[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Reklamacja nie istnieje' } }, 404)
    }

    let messages = await loadMessages()

    let payload = (issueRow[0].payload ?? null) as AllegroIssue | null
    const expectedMessagesCount = payload?.chat?.messagesCount
    const latestLocalMessageAt = messages
      .map((message) => new Date(message.createdAt).getTime())
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => b - a)[0] ?? 0
    const latestRemoteMessageAt = payload?.chat?.lastMessage?.createdAt
      ? new Date(payload.chat.lastMessage.createdAt).getTime()
      : 0
    const hasStaleMessages =
      (typeof expectedMessagesCount === 'number' && expectedMessagesCount > messages.length)
      || (latestRemoteMessageAt > latestLocalMessageAt)

    if (hasStaleMessages) {
      try {
        await refreshIssueFromAllegro(db, c.env, issueRow[0].allegroIssueId)
        issueRow = await loadIssueRow()
        messages = await loadMessages()
        payload = (issueRow[0]?.payload ?? null) as AllegroIssue | null
      } catch (err) {
        console.warn('[Issues] auto-refresh failed:', err instanceof Error ? err.message : err)
      }
    }

    const normalizedMessages = withInitialMessageFallback(issueId, messages, payload)

    return c.json({
      data: {
        ...issueRow[0],
        subject: buildIssueSubject(payload, issueRow[0].allegroIssueId),
        customerData: normalizeCustomerData(issueRow[0].customerData as { name?: string; email?: string } | null, payload),
        messages: normalizedMessages,
      },
    })
  } catch (err) {
    return serverError(c, 'GET /admin/issues/:id', err)
  }
})

// ============================================
// POST /admin/issues/:id/refresh
// Odczyt aktualnego statusu i czatu z Allegro REST API
// ============================================
adminIssuesRouter.post('/:id/refresh', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const issueId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(issueId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID reklamacji' } }, 400)
    }

    const [localIssue] = await db
      .select({ allegroIssueId: allegroIssues.allegroIssueId })
      .from(allegroIssues)
      .where(eq(allegroIssues.id, issueId))
      .limit(1)

    if (!localIssue) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Reklamacja nie istnieje' } }, 404)
    }

    const result = await refreshIssueFromAllegro(db, c.env, localIssue.allegroIssueId)
    return c.json({ data: { refreshed: true, ...result } })
  } catch (err) {
    if (err instanceof Error && err.message === 'ALLEGRO_TOKEN_UNAVAILABLE') {
      return c.json({ error: { code: 'ALLEGRO_TOKEN_UNAVAILABLE', message: 'Brak aktywnego tokenu Allegro' } }, 503)
    }
    return serverError(c, 'POST /admin/issues/:id/refresh', err)
  }
})

// ============================================
// POST /admin/issues/:id/messages
// Wysłanie odpowiedzi w dyskusji/reklamacji Allegro
// ============================================
adminIssuesRouter.post('/:id/messages', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const issueId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(issueId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID reklamacji' } }, 400)
    }

    const body = await c.req.json().catch(() => null) as {
      text?: unknown
      type?: unknown
      attachmentIds?: unknown
    } | null
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    const type = typeof body?.type === 'string' && body.type ? body.type : 'REGULAR'
    const attachmentIds = Array.isArray(body?.attachmentIds)
      ? body.attachmentIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : []

    if (!text && attachmentIds.length === 0) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Wpisz wiadomość lub dodaj załącznik' } }, 400)
    }

    const [localIssue] = await db
      .select({ allegroIssueId: allegroIssues.allegroIssueId })
      .from(allegroIssues)
      .where(eq(allegroIssues.id, issueId))
      .limit(1)

    if (!localIssue) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Reklamacja nie istnieje' } }, 404)
    }

    const accessToken = await resolveAccessToken(c.env.ALLEGRO_KV, db, c.env)
    if (!accessToken) {
      return c.json({ error: { code: 'ALLEGRO_TOKEN_UNAVAILABLE', message: 'Brak aktywnego tokenu Allegro' } }, 503)
    }

    const environment = c.env.ALLEGRO_ENVIRONMENT ?? 'production'
    const apiBase = ALLEGRO_API_BASE_URLS[environment] ?? ALLEGRO_API_BASE_URLS.production
    await postIssueMessage(
      localIssue.allegroIssueId,
      { text: text || undefined, attachmentIds, type },
      apiBase,
      accessToken,
      db,
    )
    const result = await refreshIssueFromAllegro(db, c.env, localIssue.allegroIssueId)

    return c.json({ data: { sent: true, ...result } })
  } catch (err) {
    return serverError(c, 'POST /admin/issues/:id/messages', err)
  }
})

// ============================================
// POST /admin/issues/:id/status
// Rozpatrzenie reklamacji Allegro
// ============================================
adminIssuesRouter.post('/:id/status', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL)
    const issueId = parseInt(c.req.param('id') ?? '', 10)

    if (isNaN(issueId)) {
      return c.json({ error: { code: 'INVALID_ID', message: 'Nieprawidłowe ID reklamacji' } }, 400)
    }

    const body = await c.req.json().catch(() => null) as {
      status?: unknown
      message?: unknown
      partialRefund?: unknown
    } | null
    const status = typeof body?.status === 'string' ? body.status : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const partialRefund = body?.partialRefund && typeof body.partialRefund === 'object'
      ? body.partialRefund as { amount?: string; currency?: string }
      : undefined

    const validStatuses = new Set([
      'ACCEPTED_REPAIR',
      'ACCEPTED_REFUND',
      'ACCEPTED_EXCHANGE',
      'ACCEPTED_PARTIAL_REFUND',
      'REJECTED_ADDITIONAL_REQUIREMENTS_NOT_COMPLETED',
      'REJECTED_PRODUCT_NOT_RETURNED',
      'REJECTED_PRODUCT_DAMAGED_BY_USER',
      'REJECTED_PRODUCT_CONFORMS_TO_CONTRACT',
      'REJECTED_MINOR_DEFECT',
      'REJECTED_OTHER',
    ])

    if (!validStatuses.has(status)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Nieprawidłowy status decyzji reklamacyjnej' } }, 400)
    }
    if (!message) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Wiadomość decyzji jest wymagana' } }, 400)
    }
    if (
      status === 'ACCEPTED_PARTIAL_REFUND'
      && (!partialRefund?.amount || !partialRefund?.currency)
    ) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Dla częściowego zwrotu podaj kwotę i walutę' } }, 400)
    }

    const [localIssue] = await db
      .select({ allegroIssueId: allegroIssues.allegroIssueId, payload: allegroIssues.payload })
      .from(allegroIssues)
      .where(eq(allegroIssues.id, issueId))
      .limit(1)

    if (!localIssue) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Reklamacja nie istnieje' } }, 404)
    }

    const payload = localIssue.payload as { type?: string } | null
    if (payload?.type && payload.type !== 'CLAIM') {
      return c.json({ error: { code: 'NOT_CLAIM', message: 'Status można zmienić tylko dla reklamacji Allegro' } }, 422)
    }

    const accessToken = await resolveAccessToken(c.env.ALLEGRO_KV, db, c.env)
    if (!accessToken) {
      return c.json({ error: { code: 'ALLEGRO_TOKEN_UNAVAILABLE', message: 'Brak aktywnego tokenu Allegro' } }, 503)
    }

    const environment = c.env.ALLEGRO_ENVIRONMENT ?? 'production'
    const apiBase = ALLEGRO_API_BASE_URLS[environment] ?? ALLEGRO_API_BASE_URLS.production
    await changeIssueStatus(
      localIssue.allegroIssueId,
      {
        status,
        message,
        partialRefund: status === 'ACCEPTED_PARTIAL_REFUND'
          ? { amount: partialRefund!.amount!, currency: partialRefund!.currency! }
          : undefined,
      },
      apiBase,
      accessToken,
      db,
    )
    const result = await refreshIssueFromAllegro(db, c.env, localIssue.allegroIssueId)

    return c.json({ data: { changed: true, ...result } })
  } catch (err) {
    return serverError(c, 'POST /admin/issues/:id/status', err)
  }
})
