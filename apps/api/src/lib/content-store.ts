import { eq, and, asc } from 'drizzle-orm'
import { createContentDb } from '@repo/content-db/client'
import { dishTemplates, productContent, productContentHistory, producers, producersHistory } from '@repo/content-db/schema'
import type {
  ProductRichContent,
  ProducerContent,
  ContentHistoryEntry,
  ProducerHistoryEntry,
  DishTemplate,
  UpsertDishTemplateRequest,
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
    wineDetails: parseJson<Record<string, unknown> | null>(row.wineDetails, null),
    hasAwards: row.hasAwards === 1,
    isPublished: row.isPublished === 1,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

function rowToProducerContent(row: typeof producers.$inferSelect): ProducerContent {
  const estateInfo = parseJson<(ProducerEstateInfo & Record<string, unknown>)[]>(row.estateInfo, [])
  const wineryMeta = estateInfo.find((item) => item.name === '__winery_meta__') as Record<string, unknown> | undefined
  const publicEstateInfo = estateInfo.filter((item) => item.name !== '__winery_meta__')

  return {
    slug: row.slug,
    category: row.category,
    name: row.name,
    region: row.region,
    country: row.country,
    founded: row.founded,
    countryCode: typeof wineryMeta?.countryCode === 'string' ? wineryMeta.countryCode : null,
    established: typeof wineryMeta?.established === 'string' ? wineryMeta.established : null,
    altitude: typeof wineryMeta?.altitude === 'string' ? wineryMeta.altitude : null,
    soil: typeof wineryMeta?.soil === 'string' ? wineryMeta.soil : null,
    climate: typeof wineryMeta?.climate === 'string' ? wineryMeta.climate : null,
    shortStory: row.shortStory,
    story: row.story,
    philosophy: row.philosophy,
    estateInfo: publicEstateInfo,
    images: parseJson<ProducerImage[]>(row.images, []),
    website: row.website,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

function rowToDishTemplate(row: typeof dishTemplates.$inferSelect): DishTemplate {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    note: row.note,
    dishType: row.dishType,
    imageUrl: row.imageUrl,
    emoji: row.emoji,
    tags: parseJson<string[]>(row.tags, []),
    isActive: row.isActive === 1,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

  const current = existing[0]
  const nextVersion = current ? current.version + 1 : 1
  const awardsJson = payload.awards !== undefined ? JSON.stringify(payload.awards) : (current?.awards ?? JSON.stringify([]))
  const awards = parseJson<Award[]>(awardsJson, [])

  const values = {
    sku,
    category,
    producerSlug: payload.producerSlug !== undefined ? payload.producerSlug : (current?.producerSlug ?? null),
    awards: awardsJson,
    pairing: payload.pairing !== undefined ? JSON.stringify(payload.pairing) : (current?.pairing ?? JSON.stringify([])),
    ritual: payload.ritual !== undefined ? payload.ritual : (current?.ritual ?? null),
    servingTemp: payload.servingTemp !== undefined ? payload.servingTemp : (current?.servingTemp ?? null),
    profile: payload.profile !== undefined ? JSON.stringify(payload.profile) : (current?.profile ?? JSON.stringify({})),
    sensory: payload.sensory !== undefined ? JSON.stringify(payload.sensory) : (current?.sensory ?? JSON.stringify({})),
    extended: payload.extended !== undefined ? JSON.stringify(payload.extended) : (current?.extended ?? JSON.stringify({})),
    wineDetails: payload.wineDetails !== undefined
      ? (payload.wineDetails ? JSON.stringify(payload.wineDetails) : null)
      : (current?.wineDetails ?? null),
    hasAwards: awards.length > 0 ? 1 : 0,
    isPublished: payload.isPublished !== undefined ? (payload.isPublished ? 1 : 0) : (current?.isPublished ?? 0),
    updatedAt: ts,
    version: nextVersion,
  }

  // Atomic: history insert + upsert
  await db.batch([
    db.insert(productContentHistory).values({
      sku,
      payload: JSON.stringify(current ?? {}),
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

export async function putProductWineDetails(
  d1: D1Database,
  sku: string,
  category: string,
  wineDetails: Record<string, unknown>,
  adminId: number | null
): Promise<ProductRichContent> {
  const db = createContentDb(d1)
  const ts = now()

  const existing = await db
    .select()
    .from(productContent)
    .where(eq(productContent.sku, sku))
    .limit(1)

  const current = existing[0]
  const nextVersion = current ? current.version + 1 : 1
  const awards = current?.awards ?? JSON.stringify([])
  const pairing = current?.pairing ?? JSON.stringify([])

  const values = {
    sku,
    category: current?.category ?? category,
    producerSlug: current?.producerSlug ?? null,
    awards,
    pairing,
    ritual: current?.ritual ?? null,
    servingTemp: current?.servingTemp ?? null,
    profile: current?.profile ?? JSON.stringify({}),
    sensory: current?.sensory ?? JSON.stringify({}),
    extended: current?.extended ?? JSON.stringify({}),
    wineDetails: JSON.stringify(wineDetails),
    hasAwards: current?.hasAwards ?? 0,
    isPublished: 1,
    updatedAt: ts,
    version: nextVersion,
  }

  await db.batch([
    db.insert(productContentHistory).values({
      sku,
      payload: JSON.stringify(current ?? {}),
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
  const existingEstateInfo = parseJson<(ProducerEstateInfo & Record<string, unknown>)[]>(existing[0]?.estateInfo ?? null, [])
  const payloadEstateInfo = payload.estateInfo ?? existingEstateInfo.filter((item) => item.name !== '__winery_meta__')
  const wineryMeta = {
    name: '__winery_meta__',
    countryCode: payload.countryCode,
    established: payload.established,
    altitude: payload.altitude,
    soil: payload.soil,
    climate: payload.climate,
  }

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
    estateInfo: JSON.stringify([wineryMeta, ...payloadEstateInfo]),
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

// ── Dish templates ───────────────────────────────────────────────────────────

export async function listDishTemplates(
  d1: D1Database,
  filters: { category?: string; active?: boolean; search?: string } = {}
): Promise<DishTemplate[]> {
  const db = createContentDb(d1)
  const conditions = []
  if (filters.category) conditions.push(eq(dishTemplates.category, filters.category))
  if (filters.active !== undefined) conditions.push(eq(dishTemplates.isActive, filters.active ? 1 : 0))

  const rows = conditions.length
    ? await db.select().from(dishTemplates).where(and(...conditions)).orderBy(asc(dishTemplates.sortOrder), asc(dishTemplates.name))
    : await db.select().from(dishTemplates).orderBy(asc(dishTemplates.sortOrder), asc(dishTemplates.name))

  const search = filters.search?.trim().toLowerCase()
  const mapped = rows.map(rowToDishTemplate)
  if (!search) return mapped

  return mapped.filter((item) =>
    item.name.toLowerCase().includes(search) ||
    (item.note ?? '').toLowerCase().includes(search) ||
    (item.dishType ?? '').toLowerCase().includes(search) ||
    item.tags.some((tag) => tag.toLowerCase().includes(search))
  )
}

export async function createDishTemplate(
  d1: D1Database,
  payload: UpsertDishTemplateRequest
): Promise<DishTemplate> {
  const db = createContentDb(d1)
  const ts = now()
  const values = {
    category: payload.category ?? 'wine',
    name: payload.name,
    note: payload.note ?? null,
    dishType: payload.dishType ?? null,
    imageUrl: payload.imageUrl ?? null,
    emoji: payload.emoji ?? null,
    tags: JSON.stringify(payload.tags ?? []),
    isActive: payload.isActive === false ? 0 : 1,
    sortOrder: payload.sortOrder ?? 0,
    createdAt: ts,
    updatedAt: ts,
  }

  const result = await db.insert(dishTemplates).values(values).returning()
  return rowToDishTemplate(result[0])
}

export async function updateDishTemplate(
  d1: D1Database,
  id: number,
  payload: UpsertDishTemplateRequest
): Promise<DishTemplate> {
  const db = createContentDb(d1)
  const existing = await db.select().from(dishTemplates).where(eq(dishTemplates.id, id)).limit(1)
  if (!existing[0]) throw new Error(`Dish template ${id} not found`)

  const values = {
    category: payload.category ?? existing[0].category,
    name: payload.name,
    note: payload.note ?? null,
    dishType: payload.dishType ?? null,
    imageUrl: payload.imageUrl ?? null,
    emoji: payload.emoji ?? null,
    tags: JSON.stringify(payload.tags ?? []),
    isActive: payload.isActive === false ? 0 : 1,
    sortOrder: payload.sortOrder ?? 0,
    updatedAt: now(),
  }

  const result = await db.update(dishTemplates).set(values).where(eq(dishTemplates.id, id)).returning()
  return rowToDishTemplate(result[0])
}

export async function deleteDishTemplate(d1: D1Database, id: number): Promise<void> {
  const db = createContentDb(d1)
  await db.delete(dishTemplates).where(eq(dishTemplates.id, id))
}
