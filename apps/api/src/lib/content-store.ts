import { eq, and } from 'drizzle-orm'
import { createContentDb } from '@repo/content-db/client'
import { productContent, productContentHistory, producers, producersHistory } from '@repo/content-db/schema'
import type {
  ProductRichContent,
  ProducerContent,
  ContentHistoryEntry,
  ProducerHistoryEntry,
  Award,
  Pairing,
  FlavorProfile,
  SensoryNotes,
  ProducerEstateInfo,
  ProducerImage,
} from '@repo/types'

function now() {
  return Math.floor(Date.now() / 1000)
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function rowToProductRichContent(row: typeof productContent.$inferSelect): ProductRichContent {
  return {
    sku: row.sku,
    category: row.category,
    producerSlug: row.producerSlug,
    awards: parseJson<Award[]>(row.awards, []),
    pairing: parseJson<Pairing[]>(row.pairing, []),
    ritual: row.ritual,
    servingTemp: row.servingTemp,
    profile: parseJson<FlavorProfile>(row.profile, {}),
    sensory: parseJson<SensoryNotes>(row.sensory, {}),
    extended: parseJson<Record<string, unknown>>(row.extended, {}),
    hasAwards: row.hasAwards === 1,
    isPublished: row.isPublished === 1,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

function rowToProducerContent(row: typeof producers.$inferSelect): ProducerContent {
  return {
    slug: row.slug,
    category: row.category,
    name: row.name,
    region: row.region,
    country: row.country,
    founded: row.founded,
    shortStory: row.shortStory,
    story: row.story,
    philosophy: row.philosophy,
    estateInfo: parseJson<ProducerEstateInfo[]>(row.estateInfo, []),
    images: parseJson<ProducerImage[]>(row.images, []),
    website: row.website,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

// ── Product content ──────────────────────────────────────────────────────────

export async function getProductContent(
  d1: D1Database,
  sku: string
): Promise<ProductRichContent | null> {
  const db = createContentDb(d1)
  const rows = await db
    .select()
    .from(productContent)
    .where(eq(productContent.sku, sku))
    .limit(1)
  return rows[0] ? rowToProductRichContent(rows[0]) : null
}

export async function getProductContentBatch(
  d1: D1Database,
  skus: string[]
): Promise<Map<string, ProductRichContent>> {
  if (skus.length === 0) return new Map()
  const db = createContentDb(d1)
  // D1 has no inArray helper that handles large sets — batch via individual queries if needed,
  // but for reasonable SKU counts (< 100) a single query with OR chain is fine.
  const rows = await db.select().from(productContent)
  const result = new Map<string, ProductRichContent>()
  const skuSet = new Set(skus)
  for (const row of rows) {
    if (skuSet.has(row.sku)) {
      result.set(row.sku, rowToProductRichContent(row))
    }
  }
  return result
}

export async function putProductContent(
  d1: D1Database,
  sku: string,
  category: string,
  payload: Partial<Omit<ProductRichContent, 'sku' | 'category' | 'version' | 'updatedAt'>>,
  adminId: number | null
): Promise<ProductRichContent> {
  const db = createContentDb(d1)
  const ts = now()

  // Read current for version bump + history snapshot
  const existing = await db
    .select()
    .from(productContent)
    .where(eq(productContent.sku, sku))
    .limit(1)

  const nextVersion = existing[0] ? existing[0].version + 1 : 1
  const awards = payload.awards ?? []

  const values = {
    sku,
    category,
    producerSlug: payload.producerSlug ?? existing[0]?.producerSlug ?? null,
    awards: JSON.stringify(awards),
    pairing: JSON.stringify(payload.pairing ?? []),
    ritual: payload.ritual ?? existing[0]?.ritual ?? null,
    servingTemp: payload.servingTemp ?? existing[0]?.servingTemp ?? null,
    profile: JSON.stringify(payload.profile ?? {}),
    sensory: JSON.stringify(payload.sensory ?? {}),
    extended: JSON.stringify(payload.extended ?? {}),
    hasAwards: awards.length > 0 ? 1 : 0,
    isPublished: payload.isPublished !== undefined ? (payload.isPublished ? 1 : 0) : (existing[0]?.isPublished ?? 0),
    updatedAt: ts,
    version: nextVersion,
  }

  // Atomic: history insert + upsert
  await db.batch([
    db.insert(productContentHistory).values({
      sku,
      payload: JSON.stringify(existing[0] ?? {}),
      changedBy: adminId,
      createdAt: ts,
    }),
    db
      .insert(productContent)
      .values(values)
      .onConflictDoUpdate({ target: productContent.sku, set: values }),
  ])

  return rowToProductRichContent(values as typeof productContent.$inferSelect)
}

export async function deleteProductContent(d1: D1Database, sku: string): Promise<void> {
  const db = createContentDb(d1)
  await db.delete(productContent).where(eq(productContent.sku, sku))
}

// ── Product content history ──────────────────────────────────────────────────

export async function getProductContentHistory(
  d1: D1Database,
  sku: string,
  limit = 20
): Promise<ContentHistoryEntry[]> {
  const db = createContentDb(d1)
  const rows = await db
    .select()
    .from(productContentHistory)
    .where(eq(productContentHistory.sku, sku))
    .orderBy(productContentHistory.createdAt)
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    payload: parseJson<ProductRichContent>(r.payload, {} as ProductRichContent),
    changedBy: r.changedBy,
    createdAt: r.createdAt,
  }))
}

export async function restoreProductContent(
  d1: D1Database,
  sku: string,
  historyId: number,
  adminId: number | null
): Promise<ProductRichContent> {
  const db = createContentDb(d1)
  const histRows = await db
    .select()
    .from(productContentHistory)
    .where(and(eq(productContentHistory.id, historyId), eq(productContentHistory.sku, sku)))
    .limit(1)

  if (!histRows[0]) throw new Error(`History entry ${historyId} not found for SKU ${sku}`)

  const snapshot = parseJson<ProductRichContent>(histRows[0].payload, {} as ProductRichContent)
  return putProductContent(d1, sku, snapshot.category ?? '', snapshot, adminId)
}

// ── Producers ────────────────────────────────────────────────────────────────

export async function getProducer(
  d1: D1Database,
  slug: string
): Promise<ProducerContent | null> {
  const db = createContentDb(d1)
  const rows = await db
    .select()
    .from(producers)
    .where(eq(producers.slug, slug))
    .limit(1)
  return rows[0] ? rowToProducerContent(rows[0]) : null
}

export async function listProducers(
  d1: D1Database,
  filters: { category?: string; region?: string; country?: string } = {}
): Promise<ProducerContent[]> {
  const db = createContentDb(d1)
  const conditions = []
  if (filters.category) conditions.push(eq(producers.category, filters.category))
  if (filters.region) conditions.push(eq(producers.region, filters.region))
  if (filters.country) conditions.push(eq(producers.country, filters.country))

  const rows = conditions.length
    ? await db.select().from(producers).where(and(...conditions))
    : await db.select().from(producers)

  return rows.map(rowToProducerContent)
}

export async function putProducer(
  d1: D1Database,
  slug: string,
  payload: Omit<ProducerContent, 'slug' | 'version' | 'updatedAt'>,
  adminId: number | null
): Promise<ProducerContent> {
  const db = createContentDb(d1)
  const ts = now()

  const existing = await db
    .select()
    .from(producers)
    .where(eq(producers.slug, slug))
    .limit(1)

  const nextVersion = existing[0] ? existing[0].version + 1 : 1

  const values = {
    slug,
    category: payload.category,
    name: payload.name,
    region: payload.region,
    country: payload.country,
    founded: payload.founded,
    shortStory: payload.shortStory,
    story: payload.story,
    philosophy: payload.philosophy,
    estateInfo: JSON.stringify(payload.estateInfo ?? []),
    images: JSON.stringify(payload.images ?? []),
    website: payload.website,
    updatedAt: ts,
    version: nextVersion,
  }

  await db.batch([
    db.insert(producersHistory).values({
      slug,
      payload: JSON.stringify(existing[0] ?? {}),
      changedBy: adminId,
      createdAt: ts,
    }),
    db
      .insert(producers)
      .values(values)
      .onConflictDoUpdate({ target: producers.slug, set: values }),
  ])

  return rowToProducerContent(values as typeof producers.$inferSelect)
}

export async function getProducerHistory(
  d1: D1Database,
  slug: string,
  limit = 20
): Promise<ProducerHistoryEntry[]> {
  const db = createContentDb(d1)
  const rows = await db
    .select()
    .from(producersHistory)
    .where(eq(producersHistory.slug, slug))
    .orderBy(producersHistory.createdAt)
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    payload: parseJson<ProducerContent>(r.payload, {} as ProducerContent),
    changedBy: r.changedBy,
    createdAt: r.createdAt,
  }))
}
