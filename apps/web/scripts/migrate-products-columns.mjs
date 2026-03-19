/**
 * Migration: Add missing columns to products table
 * Run: node scripts/migrate-products-columns.mjs
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const DATABASE_URL = envVars.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('Connecting to database...');
  
  // Check current columns
  const cols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products' AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  console.log('Existing product columns:', cols.map(c => c.column_name).join(', '));

  console.log('\nAdding missing columns...');
  await sql`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'PLN',
      ADD COLUMN IF NOT EXISTS origin_country varchar(100),
      ADD COLUMN IF NOT EXISTS origin_region varchar(150),
      ADD COLUMN IF NOT EXISTS grape_variety varchar(255),
      ADD COLUMN IF NOT EXISTS wine_details jsonb,
      ADD COLUMN IF NOT EXISTS coffee_details jsonb,
      ADD COLUMN IF NOT EXISTS meta_title varchar(200),
      ADD COLUMN IF NOT EXISTS meta_description text
  `;
  console.log('✓ Columns added');

  console.log('Creating indexes...');
  await sql`CREATE INDEX IF NOT EXISTS products_origin_country_idx ON products (origin_country)`;
  await sql`CREATE INDEX IF NOT EXISTS products_origin_region_idx ON products (origin_region)`;
  await sql`CREATE INDEX IF NOT EXISTS products_grape_variety_idx ON products (grape_variety)`;
  await sql`CREATE INDEX IF NOT EXISTS products_country_region_idx ON products (origin_country, origin_region)`;
  console.log('✓ Indexes created');

  // Verify
  const updatedCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products' AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  console.log('\nUpdated product columns:', updatedCols.map(c => c.column_name).join(', '));
  console.log('\n✅ Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
