/**
 * Backfills full wineDetails JSON from Neon products.wine_details to
 * Cloudflare D1 product_content.wine_details.
 *
 * Run:
 *   DATABASE_URL=xxx CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_D1_TOKEN=xxx \
 *   npx tsx apps/api/scripts/backfill-wine-details-to-d1.ts --dry-run
 *
 * Add --apply to write to D1.
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN
const D1_DB_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || '18dbaa4f-5bc4-41f2-861f-7de55c30deb2'
const APPLY = process.argv.includes('--apply')

if (!DATABASE_URL || !ACCOUNT_ID || !D1_TOKEN) {
  console.error('Missing required env vars: DATABASE_URL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

type JsonObject = Record<string, unknown>

type D1Row = {
  sku: string
  category: string | null
  awards: string | null
  pairing: string | null
  serving_temp: string | null
  profile: string | null
  sensory: string | null
  extended: string | null
  wine_details: string | null
}

type D1QueryResponse<T> = {
  success: boolean
  errors?: unknown[]
  result?: Array<{ results?: T[] }>
}

function now() {
  return Math.floor(Date.now() / 1000)
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasKeys(value: unknown): value is JsonObject {
  return isObject(value) && Object.keys(value).length > 0
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw === 'object') return raw as T
  if (typeof raw !== 'string' || !raw.trim()) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function mapAwards(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const awards = raw
    .filter(isObject)
    .map((item) => {
      const year = item.year
      const competition = asString(item.name) ?? asString(item.competition)
      const award = asString(item.rank) ?? asString(item.award) ?? 'Wyroznienie'
      if (!competition || (typeof year !== 'number' && typeof year !== 'string')) return null
      return { year: String(year), award, competition }
    })
    .filter(Boolean)
  return awards.length > 0 ? awards : undefined
}

function mapPairing(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const pairing = raw
    .filter(isObject)
    .map((item) => {
      const name = asString(item.dish) ?? asString(item.name)
      const description = asString(item.note) ?? asString(item.description)
      if (!name && !description) return null
      return { name: name ?? description, description: description ?? name }
    })
    .filter(Boolean)
  return pairing.length > 0 ? pairing : undefined
}

function composeWineDetailsFromD1(row: D1Row | null): JsonObject {
  if (!row) return {}

  const profile = parseJson<JsonObject>(row.profile, {})
  const sensory = parseJson<JsonObject>(row.sensory, {})
  const extended = parseJson<JsonObject>(row.extended, {})
  const awards = mapAwards(parseJson<unknown[]>(row.awards, []))
  const foodPairing = mapPairing(parseJson<unknown[]>(row.pairing, []))

  const details: JsonObject = {
    ...(asNumber(profile.body) !== undefined ? { bodyValue: profile.body } : {}),
    ...(asNumber(profile.tannin) !== undefined ? { tannins: profile.tannin } : {}),
    ...(asNumber(profile.tannins) !== undefined ? { tannins: profile.tannins } : {}),
    ...(asNumber(profile.acidity) !== undefined ? { acidity: profile.acidity } : {}),
    ...(asNumber(profile.sweetness) !== undefined ? { sweetness: profile.sweetness } : {}),
    ...(asString(row.serving_temp) ? { servingTemp: asString(row.serving_temp) } : {}),
    ...(asString(extended.grape) ? { grape: asString(extended.grape) } : {}),
    ...(asString(extended.alcohol) ? { alcohol: asString(extended.alcohol) } : {}),
    ...(asString(extended.body) ? { body: asString(extended.body) } : {}),
    ...(asString(extended.aging) ? { aging: asString(extended.aging) } : {}),
    ...(asString(extended.decanting) ? { decanting: asString(extended.decanting) } : {}),
    ...(asString(extended.agingPotential) ? { agingPotential: asString(extended.agingPotential) } : {}),
    ...(asString(extended.winery) ? { winery: asString(extended.winery) } : {}),
    ...(asString(extended.established) ? { established: asString(extended.established) } : {}),
    ...(asString(extended.altitude) ? { altitude: asString(extended.altitude) } : {}),
    ...(asString(extended.soil) ? { soil: asString(extended.soil) } : {}),
    ...(asString(extended.climate) ? { climate: asString(extended.climate) } : {}),
    ...(asString(extended.vinification) ? { vinification: asString(extended.vinification) } : {}),
    ...(asString(extended.wineryDescription) ? { wineryDescription: asString(extended.wineryDescription) } : {}),
    ...(asString(extended.countryCode) ? { countryCode: asString(extended.countryCode) } : {}),
    ...(typeof extended.isOrganic === 'boolean' ? { isOrganic: extended.isOrganic } : {}),
    ...(typeof extended.isBiodynamic === 'boolean' ? { isBiodynamic: extended.isBiodynamic } : {}),
    ...(typeof extended.isNatural === 'boolean' ? { isNatural: extended.isNatural } : {}),
    ...(awards ? { awards } : {}),
    ...(foodPairing ? { foodPairing } : {}),
  }

  if (Object.keys(sensory).length > 0) {
    details.tastingNotes = {
      ...(asString(sensory.eye) ? { eye: asString(sensory.eye) } : {}),
      ...(asString(sensory.nose) ? { nose: asString(sensory.nose) } : {}),
      ...(asString(sensory.palate) ? { palate: asString(sensory.palate) } : {}),
    }
  }

  return details
}

async function d1Query<T>(statement: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${D1_DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${D1_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: statement, params }),
    }
  )

  const json = await res.json() as D1QueryResponse<T>
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors)}`)
  return json.result?.[0]?.results ?? []
}

async function getD1Row(sku: string): Promise<D1Row | null> {
  const rows = await d1Query<D1Row>(
    `SELECT sku, category, awards, pairing, serving_temp, profile, sensory, extended, wine_details
     FROM product_content
     WHERE sku = ?`,
    [sku]
  )
  return rows[0] ?? null
}

async function saveWineDetails(sku: string, category: string, details: JsonObject, existing: D1Row | null) {
  const ts = now()

  await d1Query(
    `INSERT INTO product_content_history (sku, payload, changed_by, created_at)
     VALUES (?, ?, NULL, ?)`,
    [sku, JSON.stringify(existing ?? {}), ts]
  )

  await d1Query(
    `INSERT INTO product_content (
       sku, category, awards, pairing, profile, sensory, extended, wine_details,
       has_awards, is_published, updated_at, version
     )
     VALUES (?, ?, '[]', '[]', '{}', '{}', '{}', ?, 0, 1, ?, 1)
     ON CONFLICT(sku) DO UPDATE SET
       wine_details = excluded.wine_details,
       is_published = 1,
       updated_at = excluded.updated_at,
       version = product_content.version + 1`,
    [sku, category, JSON.stringify(details), ts]
  )
}

async function main() {
  console.log(`Mode: ${APPLY ? 'LIVE' : 'DRY RUN (no writes)'}`)

  const rows = await sql`
    SELECT p.sku, p.wine_details, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.wine_details IS NOT NULL
      AND (c.slug IN ('wino', 'wine', 'alcohol') OR p.sku LIKE 'WIN%')
  `

  console.log(`Found ${rows.length} Neon products with wine_details`)

  let migrated = 0
  let skipped = 0

  for (const row of rows) {
    const sku = String(row.sku)
    const neonDetails = parseJson<JsonObject>(row.wine_details, {})
    if (!hasKeys(neonDetails)) {
      skipped++
      continue
    }

    const existing = await getD1Row(sku)
    const existingFull = parseJson<JsonObject>(existing?.wine_details, {})
    const d1SplitDetails = composeWineDetailsFromD1(existing)
    const nextDetails = hasKeys(existingFull)
      ? existingFull
      : { ...neonDetails, ...d1SplitDetails }

    if (!hasKeys(nextDetails)) {
      skipped++
      continue
    }

    const category = existing?.category || 'wine'
    if (APPLY) {
      await saveWineDetails(sku, category, nextDetails, existing)
      console.log(`Migrated ${sku}`)
    } else {
      console.log(`[DRY] ${sku}: Neon keys=${Object.keys(neonDetails).length}, D1 split keys=${Object.keys(d1SplitDetails).length}, final keys=${Object.keys(nextDetails).length}`)
    }
    migrated++
  }

  console.log(`Done. Migrated: ${migrated}, skipped: ${skipped}`)
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write to D1.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
