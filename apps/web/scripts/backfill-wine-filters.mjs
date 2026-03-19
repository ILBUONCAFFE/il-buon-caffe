/**
 * Backfill wine filter columns (origin_country, origin_region, grape_variety)
 * for all existing wine products in the DB.
 *
 * Run: node scripts/backfill-wine-filters.mjs
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
const DATABASE_URL = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
).DATABASE_URL;

if (!DATABASE_URL) { console.error('DATABASE_URL not found'); process.exit(1); }

const sql = neon(DATABASE_URL);

// Known wine products and their filter data
// Add/edit entries here whenever a new wine product is added to the DB.
const WINE_DATA = [
  {
    sku: 'WIN-BAR-ORG-750',
    originCountry: 'Hiszpania',
    originRegion: 'Yecla',
    grapeVariety: 'Monastrell, Syrah',
  },
  {
    sku: 'WIN-BRU-2018',
    originCountry: 'Włochy',
    originRegion: 'Toskania',
    grapeVariety: 'Sangiovese Grosso',
  },
  {
    sku: 'WIN-CHI-2020',
    originCountry: 'Włochy',
    originRegion: 'Toskania',
    grapeVariety: 'Sangiovese, Canaiolo',
  },
  {
    sku: 'WIN-PRO-NV',
    originCountry: 'Włochy',
    originRegion: 'Veneto',
    grapeVariety: 'Glera',
  },
];

async function backfill() {
  console.log('Reading current wine products from DB...');
  const existing = await sql`
    SELECT sku, slug, origin_country, origin_region, grape_variety
    FROM products
    WHERE sku LIKE 'WIN-%'
  `;
  console.log(`Found ${existing.length} wine product(s):`);
  existing.forEach(p => console.log(`  ${p.sku} | country: ${p.origin_country ?? 'NULL'} | region: ${p.origin_region ?? 'NULL'} | grape: ${p.grape_variety ?? 'NULL'}`));

  let updated = 0;
  for (const wine of WINE_DATA) {
    const row = existing.find(p => p.sku === wine.sku);
    if (!row) {
      console.log(`\n⚠  SKU ${wine.sku} not found in DB, skipping.`);
      continue;
    }
    if (row.origin_country && row.origin_region && row.grape_variety) {
      console.log(`\n✓  ${wine.sku} already has all filter data, skipping.`);
      continue;
    }
    await sql`
      UPDATE products
      SET
        origin_country = ${wine.originCountry},
        origin_region  = ${wine.originRegion},
        grape_variety  = ${wine.grapeVariety},
        updated_at     = now()
      WHERE sku = ${wine.sku}
    `;
    console.log(`\n✅ Updated ${wine.sku}:`);
    console.log(`   origin_country = ${wine.originCountry}`);
    console.log(`   origin_region  = ${wine.originRegion}`);
    console.log(`   grape_variety  = ${wine.grapeVariety}`);
    updated++;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Backfill complete. Updated ${updated} product(s).`);

  // Verify
  const verify = await sql`
    SELECT sku, origin_country, origin_region, grape_variety
    FROM products WHERE sku LIKE 'WIN-%'
    ORDER BY sku
  `;
  console.log('\nFinal state:');
  verify.forEach(p => console.log(`  ${p.sku} | ${p.origin_country} | ${p.origin_region} | ${p.grape_variety}`));
}

backfill().catch(e => { console.error(e.message); process.exit(1); });
