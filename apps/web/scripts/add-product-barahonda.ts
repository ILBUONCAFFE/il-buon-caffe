
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { categories, products } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

async function main() {
  console.log('🍷 Dodawanie wina Barahonda Organic Barrica do bazy danych...');

  try {
    // 1. Znajdź kategorię "Wina"
    const categoryResult = await db.select().from(categories).where(eq(categories.slug, 'wino')).limit(1);
    const category = categoryResult[0];

    if (!category) {
      console.error('❌ Nie znaleziono kategorii "wino"!');
      process.exit(1);
    }

    console.log(`✓ Znaleziono kategorię: ${category.name} (ID: ${category.id})`);

    // 2. Przygotuj dane produktu
    const product = {
      sku: 'WIN-BAR-ORG-750',
      slug: 'barahonda-organic-barrica',
      name: 'Barahonda Organic Barrica',
      description: 'Ekologiczne czerwone wino z regionu Yecla (Hiszpania). Kupaż Monastrell i Syrah, 6 miesięcy w beczce.',
      longDescription: 'Barahonda Organic Barrica to wybitne wino z południowo-wschodniej Hiszpanii (region Yecla). Powstaje z ekologicznych upraw winorośli (Certyfikat Organic), rosnących na wysokości 400-800 m n.p.m.\n\nKompozycja szczepów:\n- 60% Monastrell (ze starych, 40-letnich krzewów)\n- 40% Syrah (krzewy 20-letnie)\n\nWino dojrzewało przez 6 miesięcy w brikach z dębu francuskiego. Zachwyca intensywnym, wiśniowym kolorem i bogatym bukietem, w którym dominują dojrzałe owoce, nuty przypraw oraz delikatny akcent drewna. W ustach jest pełne, soczyste, z dobrze zintegrowaną kwasowością i długim finiszem. Idealne do dań mięsnych, dziczyzny i dojrzewających serów.',
      price: '65.00',
      stock: 48,
      // Używamy placeholder z Unsplash, przypominający butelkę czerwonego wina
      imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80', 
      origin: 'Hiszpania, Yecla',
      year: '2020',
      weight: 750, // gramy/ml
      categoryId: category.id,
      isNew: true,
      isFeatured: true,
      isActive: true,
      currency: 'PLN'
    };

    // 3. Wstaw produkt do bazy
    await db.insert(products).values(product);

    console.log('✅ Produkt dodany pomyślnie!');
    console.log('==========================================');
    console.log(`Nazwa: ${product.name}`);
    console.log(`SKU:   ${product.sku}`);
    console.log(`Cena:  ${product.price} PLN`);
    console.log(`Slug:  ${product.slug}`);
    console.log('==========================================');

  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation code in Postgres
        console.error('⚠️ Produkt o tym SKU lub slugu już istnieje w bazie danych.');
    } else {
        console.error('❌ Błąd podczas dodawania produktu:', error);
    }
    process.exit(1);
  }
}

main();
