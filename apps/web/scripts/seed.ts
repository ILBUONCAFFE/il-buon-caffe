/**
 * Database Seed Script
 * Run with: npm run db:seed
 * 
 * This script populates the Neon database with initial categories and products.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { categories, products } from '../src/db/schema';

// Load environment variables from apps/web/.env
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

// ============================================
// SEED DATA: CATEGORIES
// ============================================

const SEED_CATEGORIES = [
  { name: 'Kawa', slug: 'kawa', description: 'Najwyższej jakości kawy ziarniste z całego świata', sortOrder: 1 },
  { name: 'Wina', slug: 'wino', description: 'Ekskluzywne wina włoskie z renomowanych winnic', sortOrder: 2 },
  { name: 'Słodycze', slug: 'slodycze', description: 'Tradycyjne włoskie słodycze i desery', sortOrder: 3 },
  { name: 'Delikatesy', slug: 'spizarnia', description: 'Włoskie delikatesy premium - oliwy, sery, wędliny', sortOrder: 4 },
];

// ============================================
// SEED DATA: PRODUCTS (10 produktów)
// ============================================

const SEED_PRODUCTS = [
  // ===== KAWA (3 produkty) =====
  {
    sku: 'KAW-ETH-250',
    slug: 'ethiopia-yirgacheffe',
    name: 'Ethiopia Yirgacheffe',
    description: 'Aromatyczna kawa single origin z regionu Yirgacheffe. Nuty kwiatowe, cytrusowe i herbaciane. Idealna do chemex i drip.',
    price: '79.00',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80',
    origin: 'Etiopia, Yirgacheffe',
    weight: 250,
    isNew: false,
    isFeatured: true,
    categorySlug: 'kawa',
  },
  {
    sku: 'KAW-COL-250',
    slug: 'colombia-supremo',
    name: 'Colombia Supremo',
    description: 'Kolumbijska arabica o bogatym, pełnym smaku z nutami orzecha i karmelu. Średnio palona, doskonała do espresso.',
    price: '69.00',
    stock: 75,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
    origin: 'Kolumbia, Huila',
    weight: 250,
    isNew: true,
    isFeatured: true,
    categorySlug: 'kawa',
  },
  {
    sku: 'KAW-BRA-1000',
    slug: 'brazil-santos-1kg',
    name: 'Brazil Santos 1kg',
    description: 'Klasyczna brazylijska kawa o łagodnym smaku z nutami czekolady i orzecha laskowego. Opakowanie 1kg dla prawdziwych smakoszy.',
    price: '149.00',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80',
    origin: 'Brazylia, Santos',
    weight: 1000,
    isNew: false,
    isFeatured: false,
    categorySlug: 'kawa',
  },

  // ===== WINA (3 produkty) =====
  {
    sku: 'WIN-BRU-2018',
    slug: 'brunello-di-montalcino-2018',
    name: 'Brunello di Montalcino DOCG 2018',
    description: 'Prestiżowe toskańskie wino z winogron Sangiovese Grosso. Eleganckie, pełne, z nutami wiśni, fiołków i przypraw korzennych.',
    price: '289.00',
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80',
    origin: 'Włochy, Toskania',
    originCountry: 'Włochy',
    originRegion: 'Toskania',
    grapeVariety: 'Sangiovese Grosso',
    year: '2018',
    isNew: false,
    isFeatured: true,
    categorySlug: 'wino',
  },
  {
    sku: 'WIN-CHI-2020',
    slug: 'chianti-classico-riserva-2020',
    name: 'Chianti Classico Riserva DOCG',
    description: 'Klasyczne toskańskie wino o rubinowej barwie z refleksami granatu. Nuty wiśni, śliwki i wanilii z delikatnym taninowym wykończeniem.',
    price: '149.00',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&q=80',
    origin: 'Włochy, Toskania',
    originCountry: 'Włochy',
    originRegion: 'Toskania',
    grapeVariety: 'Sangiovese, Canaiolo',
    year: '2020',
    isNew: true,
    isFeatured: true,
    categorySlug: 'wino',
  },
  {
    sku: 'WIN-PRO-NV',
    slug: 'prosecco-superiore-docg',
    name: 'Prosecco Superiore DOCG',
    description: 'Eleganckie włoskie wino musujące z regionu Valdobbiadene. Świeże, owocowe, z nutami jabłka, gruszki i kwiatów akacji.',
    price: '89.00',
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1566995541428-f2246c17cda1?w=600&q=80',
    origin: 'Włochy, Veneto',
    originCountry: 'Włochy',
    originRegion: 'Veneto',
    grapeVariety: 'Glera',
    isNew: false,
    isFeatured: false,
    categorySlug: 'wino',
  },

  // ===== SŁODYCZE (2 produkty) =====
  {
    sku: 'SLO-PAN-1000',
    slug: 'panettone-tradizionale',
    name: 'Panettone Tradizionale 1kg',
    description: 'Tradycyjny włoski panettone z Mediolanu. Puszyste ciasto drożdżowe z kandyzowanymi owocami i rodzynkami. Idealne na święta.',
    price: '89.00',
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=600&q=80',
    origin: 'Włochy, Mediolan',
    weight: 1000,
    isNew: false,
    isFeatured: true,
    categorySlug: 'slodycze',
  },
  {
    sku: 'SLO-CAN-200',
    slug: 'cantucci-alle-mandorle',
    name: 'Cantucci alle Mandorle',
    description: 'Toskańskie biscotti z migdałami. Chrupiące ciasteczka idealne do maczania w vin santo lub espresso. 200g.',
    price: '35.00',
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80',
    origin: 'Włochy, Toskania',
    weight: 200,
    isNew: true,
    isFeatured: false,
    categorySlug: 'slodycze',
  },

  // ===== DELIKATESY (2 produkty) =====
  {
    sku: 'DEL-OLI-500',
    slug: 'oliwa-extra-virgin-dop',
    name: 'Oliwa Extra Virgin DOP 500ml',
    description: 'Najwyższej jakości oliwa z pierwszego tłoczenia z Toskanii. Intensywny, owocowy smak z nutami karczocha i pieprzu.',
    price: '85.00',
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80',
    origin: 'Włochy, Toskania',
    isNew: false,
    isFeatured: true,
    categorySlug: 'spizarnia',
  },
  {
    sku: 'DEL-PAR-300',
    slug: 'parmigiano-reggiano-24m',
    name: 'Parmigiano Reggiano DOP 24 mesi',
    description: 'Król włoskich serów. Dojrzewanie minimum 24 miesiące. Krystaliczna struktura, intensywny umami. Kawałek 300g.',
    price: '75.00',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&q=80',
    origin: 'Włochy, Emilia-Romania',
    weight: 300,
    isNew: true,
    isFeatured: true,
    categorySlug: 'spizarnia',
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seed() {
  console.log('🌱 Rozpoczynam seedowanie bazy danych...\n');

  try {
    // 1. Insert Categories
    console.log('📁 Dodaję kategorie...');
    const insertedCategories = await db.insert(categories)
      .values(SEED_CATEGORIES)
      .onConflictDoNothing()
      .returning();
    
    // Fetch all categories to ensure we have IDs even for existing ones
    const allCategories = await db.select().from(categories);
    console.log(`   ✓ Mamy ${allCategories.length} kategorii w bazie\n`);

    // Create category lookup map (slug -> id)
    const categoryMap = new Map<string, number>();
    allCategories.forEach(cat => {
      categoryMap.set(cat.slug, cat.id);
    });

    // 2. Insert Products
    console.log('📦 Dodaję produkty...');
    const productsToInsert = SEED_PRODUCTS.map(product => ({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
      origin: product.origin,
      year: product.year,
      weight: product.weight,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      categoryId: categoryMap.get(product.categorySlug) || null,
      // Wine cascading filter fields
      originCountry: (product as any).originCountry || null,
      originRegion: (product as any).originRegion || null,
      grapeVariety: (product as any).grapeVariety || null,
    }));

    const insertedProducts = await db.insert(products)
      .values(productsToInsert)
      .onConflictDoNothing()
      .returning();
    console.log(`   ✓ Dodano ${insertedProducts.length} nowych produktów\n`);

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ Baza danych została pomyślnie zasilona!');
    console.log('═'.repeat(50));
    console.log(`   Kategorie: ${insertedCategories.length}`);
    insertedCategories.forEach(c => console.log(`      - ${c.name} (/${c.slug})`));
    console.log(`   Produkty:  ${insertedProducts.length}`);
    insertedProducts.forEach(p => console.log(`      - ${p.name} (${p.sku})`));

  } catch (error) {
    console.error('❌ Błąd podczas seedowania:', error);
    process.exit(1);
  }
}

// Run seed
seed();
