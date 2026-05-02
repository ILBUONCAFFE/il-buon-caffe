/**
 * migrate-content-to-d1.ts
 *
 * Migrates awards/servingTemp from wineDetails JSONB (Neon) → D1 product_content.
 *
 * Run:
 *   CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_D1_TOKEN=xxx DATABASE_URL=xxx \
 *   npx tsx apps/api/scripts/migrate-content-to-d1.ts [--dry-run]
 *
 * Requires:
 *   - DATABASE_URL: Neon connection string
 *   - CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN: for D1 HTTP API
 *   - D1 database id: 18dbaa4f-5bc4-41f2-861f-7de55c30deb2
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL!
const ACCOUNT_ID   = process.env.CLOUDFLARE_ACCOUNT_ID!
const D1_TOKEN     = process.env.CLOUDFLARE_D1_TOKEN!
const D1_DB_ID     = '18dbaa4f-5bc4-41f2-861f-7de55c30deb2'
const DRY_RUN      = process.argv.includes('--dry-run')

if (!DATABASE_URL || !ACCOUNT_ID || !D1_TOKEN) {
  console.error('Missing required env vars: DATABASE_URL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

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

interface WineDetails {
  awards?: Array<{ name: string; year: number; rank?: string }>
  servingTemp?: string
  aging?: string
  grape?: string
  region?: string
  alcohol?: number
  color?: string
  style?: string
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log('Fetching wine products from Neon...')

  const rows = await sql`
    SELECT sku, wine_details
    FROM products
    WHERE wine_details IS NOT NULL
      AND category_id IN (SELECT id FROM categories WHERE slug IN ('wino', 'alcohol'))
  `

  console.log(`Found ${rows.length} wine products`)

  let migrated = 0
  let skipped  = 0

  for (const row of rows) {
    const sku: string  = row.sku as string
    const details = (row.wine_details ?? {}) as WineDetails

    const awards  = details.awards  ?? []
    const servingTemp = details.servingTemp ?? null

    if (awards.length === 0 && !servingTemp) {
      skipped++
      continue
    }

    const ts = Math.floor(Date.now() / 1000)

    const stmt = `
      INSERT INTO product_content (sku, category, awards, serving_temp, has_awards, is_published, updated_at, version)
      VALUES (?, 'wine', ?, ?, ?, 0, ?, 1)
      ON CONFLICT(sku) DO UPDATE SET
        awards = excluded.awards,
        serving_temp = excluded.serving_temp,
        has_awards = excluded.has_awards,
        updated_at = excluded.updated_at
    `
    const params = [
      sku,
      JSON.stringify(awards),
      servingTemp,
      awards.length > 0 ? 1 : 0,
      ts,
    ]

    if (DRY_RUN) {
      console.log(`[DRY] Would migrate SKU ${sku}: ${awards.length} awards`)
    } else {
      await d1Exec(stmt, params)
      console.log(`Migrated SKU ${sku}`)
    }
    migrated++
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped (empty): ${skipped}`)
  if (DRY_RUN) console.log('(Dry run — no data written)')
}

main().catch((err) => { console.error(err); process.exit(1) })
