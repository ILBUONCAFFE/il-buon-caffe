import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import {
  users, userConsents, orders, orderItems, auditLog,
} from '@repo/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import type { Env } from '../index'

const MAX_BODY = 10_000

function sanitize(raw: unknown, max = 255): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, max)
}

// Rate limit — 5 export requests per hour per user
const exportRateLimiter = rateLimit({
  limit: 5,
  windowMs: 60 * 60 * 1000,
  blockDurationMs: 60 * 60 * 1000,
  keyGenerator: (c) => `user-export:${c.get('user')?.sub ?? c.req.header('CF-Connecting-IP') ?? 'unknown'}`,
})

const VALID_CONSENT_TYPES = ['marketing', 'analytics'] as const
type UpdatableConsent = typeof VALID_CONSENT_TYPES[number]

export const userRouter = new Hono<{ Bindings: Env }>()

// ============================================
// GET /api/user/profile  🔒
// Profil zalogowanego użytkownika
// ============================================
userRouter.get('/profile', requireAuth(), async (c) => {
  try {
    const payload = c.get('user')
    const db      = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)

    const user = await db.query.users.findFirst({
      columns: {
        id: true, email: true, name: true, role: true,
        emailVerified: true, marketingConsent: true, analyticsConsent: true,
        termsVersion: true, privacyVersion: true, createdAt: true,
      },
      where: eq(users.id, parseInt(payload.sub)),
    })

    if (!user || user.id === undefined) {
      return c.json({ error: 'Użytkownik nie znaleziony' }, 404)
    }

    return c.json({ success: true, data: user })
  } catch (err) {
    console.error('GET /user/profile error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// PATCH /api/user/profile  🔒
// Aktualizacja imienia użytkownika
// ============================================
userRouter.patch('/profile', requireAuth(), async (c) => {
  try {
    const contentLength = parseInt(c.req.header('Content-Length') || '0', 10)
    if (contentLength > MAX_BODY) return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)

    const payload = c.get('user')
    const db      = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const body    = await c.req.json<{ name?: string }>()
    const name    = sanitize(body.name, 100)

    if (!name) return c.json({ error: 'Imię jest wymagane' }, 400)

    await db.update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, parseInt(payload.sub)))

    return c.json({ success: true, message: 'Profil zaktualizowany' })
  } catch (err) {
    console.error('PATCH /user/profile error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/user/consents  🔒
// Aktualny stan zgód RODO
// ============================================
userRouter.get('/consents', requireAuth(), async (c) => {
  try {
    const payload = c.get('user')
    const db      = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const userId  = parseInt(payload.sub)

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

    // Deduplicate — keep latest for each type
    const latestMap = new Map<string, typeof consentRows[0]>()
    for (const row of consentRows) {
      if (!latestMap.has(row.consentType)) latestMap.set(row.consentType, row)
    }

    const result: Record<string, { granted: boolean; version: string | null; grantedAt: Date | null }> = {}
    for (const [type, row] of latestMap) {
      result[type] = {
        granted:   row.granted,
        version:   row.version ?? null,
        grantedAt: row.granted ? row.createdAt : null,
      }
    }

    return c.json({ success: true, data: result })
  } catch (err) {
    console.error('GET /user/consents error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// POST /api/user/consents  🔒
// Aktualizacja opcjonalnych zgód
// Body: { marketing?: boolean, analytics?: boolean }
// ============================================
userRouter.post('/consents', requireAuth(), async (c) => {
  try {
    const contentLength = parseInt(c.req.header('Content-Length') || '0', 10)
    if (contentLength > MAX_BODY) return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)

    const payload    = c.get('user')
    const userId     = parseInt(payload.sub)
    const db         = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const body       = await c.req.json<Partial<Record<UpdatableConsent, boolean>>>()
    const ipAddress  = c.req.header('CF-Connecting-IP') || 'unknown'
    const userAgent  = sanitize(c.req.header('User-Agent'), 500) || 'unknown'

    const updates: Promise<unknown>[] = []

    for (const type of VALID_CONSENT_TYPES) {
      if (typeof body[type] !== 'boolean') continue

      // Record consent history
      updates.push(
        db.insert(userConsents).values({
          userId,
          consentType: type,
          granted:     body[type]!,
          version:     '1.0',
          ipAddress,
          userAgent,
        }),
      )

      // Update user record
      if (type === 'marketing') {
        updates.push(
          db.update(users).set({ marketingConsent: body[type]!, gdprConsentDate: new Date(), updatedAt: new Date() }).where(eq(users.id, userId)),
        )
      } else if (type === 'analytics') {
        updates.push(
          db.update(users).set({ analyticsConsent: body[type]!, gdprConsentDate: new Date(), updatedAt: new Date() }).where(eq(users.id, userId)),
        )
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'Brak prawidłowych pól zgód' }, 400)
    }

    await Promise.all(updates)

    return c.json({ success: true, message: 'Zgody zaktualizowane' })
  } catch (err) {
    console.error('POST /user/consents error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// DELETE /api/user/consents/:type  🔒
// Wycofanie opcjonalnej zgody (Art. 7 RODO)
// ============================================
userRouter.delete('/consents/:type', requireAuth(), async (c) => {
  try {
    const payload    = c.get('user')
    const userId     = parseInt(payload.sub)
    const type       = c.req.param('type') as UpdatableConsent
    const db         = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const ipAddress  = c.req.header('CF-Connecting-IP') || 'unknown'
    const userAgent  = sanitize(c.req.header('User-Agent'), 500) || 'unknown'

    if (!VALID_CONSENT_TYPES.includes(type)) {
      return c.json({ error: 'Nieprawidłowy typ zgody. Dozwolone: marketing, analytics' }, 400)
    }

    // Record revocation
    await db.insert(userConsents).values({
      userId,
      consentType: type,
      granted:     false,
      version:     '1.0',
      ipAddress,
      userAgent,
    })

    // Update user record
    const setCols = type === 'marketing'
      ? { marketingConsent: false, gdprConsentDate: new Date(), updatedAt: new Date() }
      : { analyticsConsent: false, gdprConsentDate: new Date(), updatedAt: new Date() }

    await db.update(users).set(setCols).where(eq(users.id, userId))

    return c.json({ success: true, message: `Zgoda '${type}' została wycofana` })
  } catch (err) {
    console.error('DELETE /user/consents/:type error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/user/export  🔒  (Art. 20 RODO)
// Eksport wszystkich danych użytkownika
// ============================================
userRouter.get('/export', requireAuth(), exportRateLimiter, async (c) => {
  try {
    const payload = c.get('user')
    const userId  = parseInt(payload.sub)
    const db      = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const ip      = c.req.header('CF-Connecting-IP') || 'unknown'
    const ua      = sanitize(c.req.header('User-Agent'), 500) || 'unknown'

    // Fetch user (exclude sensitive data)
    const user = await db.query.users.findFirst({
      columns: {
        id: true, email: true, name: true, role: true,
        marketingConsent: true, analyticsConsent: true,
        termsVersion: true, privacyVersion: true,
        gdprConsentDate: true, createdAt: true,
      },
      where: eq(users.id, userId),
    })

    if (!user) return c.json({ error: 'Użytkownik nie znaleziony' }, 404)

    // Fetch consents
    const consentRows = await db
      .select({
        consentType: userConsents.consentType,
        granted:     userConsents.granted,
        version:     userConsents.version,
        ipAddress:   userConsents.ipAddress,
        createdAt:   userConsents.createdAt,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.createdAt))

    // Fetch orders
    const orderRows = await db.query.orders.findMany({
      columns: {
        id: true, orderNumber: true, status: true, source: true,
        total: true, subtotal: true, shippingCost: true,
        paymentMethod: true, shippingMethod: true, trackingNumber: true,
        createdAt: true, paidAt: true, shippedAt: true,
        customerData: true, notes: true,
      },
      with: {
        items: {
          columns: { productSku: true, productName: true, quantity: true, unitPrice: true, totalPrice: true },
        },
      },
      where: eq(orders.userId, userId),
      orderBy: desc(orders.createdAt),
    })

    // Log data export to audit
    await db.insert(auditLog).values({
      action:       'export_data',
      targetUserId: userId,
      ipAddress:    ip,
      userAgent:    ua,
      details:      { exportedAt: new Date().toISOString(), format: 'GDPR_EXPORT_V1' },
    })

    return c.json({
      success: true,
      data: {
        user,
        consents: consentRows,
        orders:   orderRows,
        exportedAt: new Date().toISOString(),
        format:     'GDPR_EXPORT_V1',
      },
    })
  } catch (err) {
    console.error('GET /user/export error:', err)
    return c.json({ error: 'Błąd serwera podczas eksportu' }, 500)
  }
})

// ============================================
// POST /api/user/anonymize  🔒  (Art. 17 RODO)
// Żądanie anonimizacji konta
// ============================================
userRouter.post('/anonymize', requireAuth(), async (c) => {
  try {
    const contentLength = parseInt(c.req.header('Content-Length') || '0', 10)
    if (contentLength > MAX_BODY) return c.json({ error: 'Zbyt duży rozmiar żądania' }, 413)

    const payload = c.get('user')
    const userId  = parseInt(payload.sub)
    const db      = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)

    const body         = await c.req.json<{ confirmEmail: string; reason?: string }>()
    const confirmEmail = sanitize(body.confirmEmail || '').toLowerCase()
    const reason       = sanitize(body.reason || '', 500)

    const user = await db.query.users.findFirst({
      columns: { id: true, email: true, anonymizedAt: true },
      where: eq(users.id, userId),
    })

    if (!user) return c.json({ error: 'Użytkownik nie znaleziony' }, 404)
    if (user.anonymizedAt) return c.json({ error: 'Konto zostało już zanonimizowane' }, 409)
    if (confirmEmail !== user.email.toLowerCase()) {
      return c.json({ error: 'Podany email nie zgadza się z kontem' }, 400)
    }

    // Schedule anonymization in 30 days (admin will confirm)
    const anonymizationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const ip = c.req.header('CF-Connecting-IP') || 'unknown'
    const ua = sanitize(c.req.header('User-Agent'), 500) || 'unknown'

    await db.insert(auditLog).values({
      action:       'anonymize_customer',
      targetUserId: userId,
      ipAddress:    ip,
      userAgent:    ua,
      details:      {
        reason,
        requestedAt:      new Date().toISOString(),
        scheduledFor:     anonymizationDate.toISOString(),
        pendingConfirmation: true,
      },
    })

    return c.json({
      success: true,
      data: {
        message:          'Konto zostanie zanonimizowane w ciągu 30 dni',
        anonymizationDate: anonymizationDate.toISOString(),
        retainedData:     ['orders (required by VAT law — 5 years)'],
      },
    })
  } catch (err) {
    console.error('POST /user/anonymize error:', err)
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})
