/**
 * seed-barahonda-to-d1.ts
 *
 * Seeds the Barahonda premium content snapshot into D1 so the product page
 * can render the premium block immediately.
 *
 * Run:
 *   CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_D1_TOKEN=xxx \
 *   npx tsx apps/api/scripts/seed-barahonda-to-d1.ts [--dry-run]
 */

import { wineDataCatalog } from '../../web/src/content/products/wineData'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN!
const D1_DB_ID = '18dbaa4f-5bc4-41f2-861f-7de55c30deb2'
const DRY_RUN = process.argv.includes('--dry-run')

const SKU = 'WIN-BAR-ORG-750'
const SLUG = 'barahonda-organic-barrica'

if (!ACCOUNT_ID || !D1_TOKEN) {
  console.error('Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN')
  process.exit(1)
}

const source = wineDataCatalog[SLUG]

if (!source) {
  console.error(`Missing wine catalog entry for slug: ${SLUG}`)
  process.exit(1)
}

function now() {
  return Math.floor(Date.now() / 1000)
}

async function d1Exec(statement: string, params: unknown[] = []) {
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

  const json = await res.json() as { success: boolean; errors?: unknown[] }
  if (!json.success) {
    throw new Error(`D1 error: ${JSON.stringify(json.errors)}`)
  }
  return json
}

function mapAwards() {
  return (source.awards ?? []).map((award) => ({
    name: award.award,
    year: Number(award.year) || now(),
    rank: award.competition,
  }))
}

function mapPairing() {
  return (source.foodPairing ?? []).map((item) => ({
    dish: item.name,
    note: item.description,
  }))
}

function mapProfile() {
  return {
    body: source.bodyValue,
    sweetness: source.sweetness,
    acidity: source.acidity,
    tannin: source.tannins,
  }
}

function mapSensory() {
  return {
    eye: source.tastingNotes.eye,
    nose: source.tastingNotes.nose,
    palate: source.tastingNotes.palate,
  }
}

function mapExtended() {
  return {
    grape: source.grape,
    alcohol: source.alcohol,
    body: source.body,
    bodyValue: source.bodyValue,
    tannins: source.tannins,
    acidity: source.acidity,
    sweetness: source.sweetness,
    aging: source.aging,
    servingTemp: source.servingTemp,
    decanting: source.decanting,
    agingPotential: source.agingPotential,
    winery: source.winery,
    established: source.established,
    altitude: source.altitude,
    soil: source.soil,
    climate: source.climate,
    vinification: source.vinification,
    wineryDescription: source.wineryDescription,
    countryCode: source.countryCode,
    foodPairing: source.foodPairing,
    awards: source.awards,
    isOrganic: Boolean(source.isOrganic),
    isBiodynamic: Boolean(source.isBiodynamic),
    isNatural: Boolean(source.isNatural),
  }
}

async function main() {
  const ts = now()

  const awards = mapAwards()
  const pairing = mapPairing()
  const profile = mapProfile()
  const sensory = mapSensory()
  const extended = mapExtended()

  const historyPayload = {
    sku: SKU,
    category: 'wine',
    producerSlug: null,
    awards,
    pairing,
    ritual: source.vinification,
    servingTemp: source.servingTemp,
    profile,
    sensory,
    extended,
    hasAwards: awards.length > 0,
    isPublished: true,
    updatedAt: ts,
    version: 1,
  }

  const payload = {
    sku: SKU,
    category: 'wine',
    producerSlug: null,
    awards: JSON.stringify(awards),
    pairing: JSON.stringify(pairing),
    ritual: source.vinification,
    servingTemp: source.servingTemp,
    profile: JSON.stringify(profile),
    sensory: JSON.stringify(sensory),
    extended: JSON.stringify(extended),
    hasAwards: awards.length > 0 ? 1 : 0,
    isPublished: 1,
    updatedAt: ts,
    version: 1,
  }

  console.log(`Seeding ${SLUG} (${SKU}) into D1...`)

  const insertSql = `
    INSERT INTO product_content (
      sku, category, producer_slug, awards, pairing, ritual, serving_temp,
      profile, sensory, extended, has_awards, is_published, updated_at, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(sku) DO UPDATE SET
      category = excluded.category,
      producer_slug = excluded.producer_slug,
      awards = excluded.awards,
      pairing = excluded.pairing,
      ritual = excluded.ritual,
      serving_temp = excluded.serving_temp,
      profile = excluded.profile,
      sensory = excluded.sensory,
      extended = excluded.extended,
      has_awards = excluded.has_awards,
      is_published = excluded.is_published,
      updated_at = excluded.updated_at,
      version = excluded.version
  `

  const historySql = `
    INSERT INTO product_content_history (sku, payload, changed_by, created_at)
    VALUES (?, ?, ?, ?)
  `

  const params = [
    payload.sku,
    payload.category,
    payload.producerSlug,
    payload.awards,
    payload.pairing,
    payload.ritual,
    payload.servingTemp,
    payload.profile,
    payload.sensory,
    payload.extended,
    payload.hasAwards,
    payload.isPublished,
    payload.updatedAt,
    payload.version,
  ]

  if (DRY_RUN) {
    console.log('[DRY RUN] Would upsert product_content and history for Barahonda')
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  await d1Exec(insertSql, params)
  await d1Exec(historySql, [SKU, JSON.stringify(historyPayload), null, ts])
  console.log('✅ Barahonda premium content seeded into D1 and published')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})