/**
 * Migrates the legacy web wine catalog into D1 product_content.
 *
 * Run:
 *   DATABASE_URL=xxx CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_D1_TOKEN=xxx \
 *   npx tsx apps/api/scripts/migrate-wine-catalog-to-d1.ts --dry-run
 *
 * Add --apply to write to D1.
 */

import { neon } from '@neondatabase/serverless'
import { wineDataCatalog, type WineDetails, type WineAward, type WineFoodPairing } from '../../../apps/web/src/content/products/wineData'

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

function toUnixSeconds() {
  return Math.floor(Date.now() / 1000)
}

function parseAwardYear(value: string): number {
  const match = value.match(/\d{4}/)
  return match ? Number(match[0]) : new Date().getFullYear()
}

function toD1Awards(awards: WineAward[]) {
  return awards.map((award) => ({
    name: award.competition,
    year: parseAwardYear(award.year),
    rank: award.award,
  }))
}

function toD1Pairing(pairing: WineFoodPairing[]) {
  return pairing.map((item) => ({
    dish: item.name,
    note: item.description,
  }))
}

function toExtended(details: WineDetails) {
  return {
    grape: details.grape,
    alcohol: details.alcohol,
    body: details.body,
    aging: details.aging,
    decanting: details.decanting,
    agingPotential: details.agingPotential,
    winery: details.winery,
    established: details.established,
    altitude: details.altitude,
    soil: details.soil,
    climate: details.climate,
    vinification: details.vinification,
    wineryDescription: details.wineryDescription ?? null,
    countryCode: details.countryCode,
    foodPairing: details.foodPairing,
    awards: details.awards,
    isOrganic: details.isOrganic ?? false,
    isBiodynamic: details.isBiodynamic ?? false,
    isNatural: details.isNatural ?? false,
  }
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
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors)}`)
  return json
}

async function main() {
  const slugs = Object.keys(wineDataCatalog)
  const products = await sql`
    SELECT sku, slug
    FROM products
    WHERE slug = ANY(${slugs})
  `
  const skuBySlug = new Map(products.map((row) => [String(row.slug), String(row.sku)]))
  const ts = toUnixSeconds()

  let migrated = 0
  let missing = 0

  for (const [slug, details] of Object.entries(wineDataCatalog)) {
    const sku = skuBySlug.get(slug)
    if (!sku) {
      missing++
      console.warn(`[skip] No product SKU found for slug: ${slug}`)
      continue
    }

    const awards = toD1Awards(details.awards)
    const pairing = toD1Pairing(details.foodPairing)
    const profile = {
      body: details.bodyValue,
      sweetness: details.sweetness,
      acidity: details.acidity,
      tannin: details.tannins,
    }
    const sensory = details.tastingNotes
    const extended = toExtended(details)

    const statement = `
      INSERT INTO product_content (
        sku, category, awards, pairing, ritual, serving_temp, profile, sensory, extended,
        has_awards, is_published, updated_at, version
      )
      VALUES (?, 'wine', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)
      ON CONFLICT(sku) DO UPDATE SET
        category = excluded.category,
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
        version = product_content.version + 1
    `
    const params = [
      sku,
      JSON.stringify(awards),
      JSON.stringify(pairing),
      details.decanting,
      details.servingTemp,
      JSON.stringify(profile),
      JSON.stringify(sensory),
      JSON.stringify(extended),
      awards.length > 0 ? 1 : 0,
      ts,
    ]

    if (APPLY) {
      await d1Exec(statement, params)
      console.log(`[ok] ${slug} -> ${sku}`)
    } else {
      console.log(`[dry] ${slug} -> ${sku}`)
    }
    migrated++
  }

  console.log(`Done. ${APPLY ? 'Migrated' : 'Would migrate'}: ${migrated}, missing SKU: ${missing}`)
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write to D1.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
