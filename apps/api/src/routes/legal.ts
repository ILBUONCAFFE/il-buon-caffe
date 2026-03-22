import { Hono } from 'hono'
import { createDb } from '@repo/db/client'
import { legalDocuments } from '@repo/db/schema'
import { eq, and, desc, lte } from 'drizzle-orm'
import type { Env } from '../index'

export const legalRouter = new Hono<{ Bindings: Env }>()

const VALID_TYPES = ['privacy-policy', 'terms', 'cookies'] as const
type LegalType = typeof VALID_TYPES[number]

/** Normalize URL type to DB type */
const toDbType = (t: LegalType) =>
  t === 'privacy-policy' ? 'privacy_policy' : t

// ============================================
// GET /api/legal/:type
// Aktualny dokument prawny
// ============================================
legalRouter.get('/:type', async (c) => {
  try {
    const type = c.req.param('type') as LegalType
    if (!VALID_TYPES.includes(type)) {
      return c.json({ error: 'Nieprawidłowy typ dokumentu. Dozwolone: privacy-policy, terms, cookies' }, 400)
    }

    const db     = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const dbType = toDbType(type)

    const doc = await db.query.legalDocuments.findFirst({
      where: and(
        eq(legalDocuments.type, dbType),
        lte(legalDocuments.effectiveFrom, new Date()),
      ),
      orderBy: desc(legalDocuments.effectiveFrom),
    })

    if (!doc) {
      return c.json({ error: 'Dokument nie znaleziony' }, 404)
    }

    return c.json({
      success: true,
      data: {
        type:          doc.type,
        version:       doc.version,
        effectiveFrom: doc.effectiveFrom,
        content:       doc.content,
        contentType:   'text/html',
      },
    })
  } catch (err) {
    console.error('GET /legal/:type error:', err instanceof Error ? err.message : String(err))
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})

// ============================================
// GET /api/legal/:type/history
// Historia wersji dokumentu
// ============================================
legalRouter.get('/:type/history', async (c) => {
  try {
    const type = c.req.param('type') as LegalType
    if (!VALID_TYPES.includes(type)) {
      return c.json({ error: 'Nieprawidłowy typ dokumentu' }, 400)
    }

    const db     = createDb(c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL)
    const dbType = toDbType(type)

    const docs = await db
      .select({
        version:       legalDocuments.version,
        effectiveFrom: legalDocuments.effectiveFrom,
        createdAt:     legalDocuments.createdAt,
      })
      .from(legalDocuments)
      .where(eq(legalDocuments.type, dbType))
      .orderBy(desc(legalDocuments.effectiveFrom))

    return c.json({ success: true, data: docs })
  } catch (err) {
    console.error('GET /legal/:type/history error:', err instanceof Error ? err.message : String(err))
    return c.json({ error: 'Błąd serwera' }, 500)
  }
})
