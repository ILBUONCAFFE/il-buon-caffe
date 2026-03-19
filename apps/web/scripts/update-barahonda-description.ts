/**
 * Skrypt: zaktualizuj opis produktu Barahonda Organic Barrica w bazie danych.
 *
 * Źródło danych: src/lib/data/products/wineData.ts (wineDataCatalog)
 *
 * Uruchomienie:
 *   npx tsx scripts/update-barahonda-description.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { products } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '.env' }); // fallback

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

const SKU = 'WIN-BAR-ORG-750';

// ─────────────────────────────────────────────────────────────
// Treść opisu — pochodzi z wineData.ts + add-product-barahonda.ts
// ─────────────────────────────────────────────────────────────

const description =
  'Ekologiczne czerwone wino z D.O. Yecla (Hiszpania). ' +
  'Kupaż 60% Monastrell (40-letnie winorośle) + 40% Syrah, ' +
  'dojrzewany 6 miesięcy w beczce z francuskiego dębu. ' +
  'Certyfikat ekologiczny CAERM. 14,5% alk. Oceny: 94 pkt Decanter (2022).';

const longDescription =
  `Barahonda Organic Barrica to wybitne wino z południowo-wschodniej Hiszpanii (D.O. Yecla), ` +
  `produkowane przez Bodegas Barahonda — rodzinną winnicę z tradycją sięgającą 1850 roku.

` +
  `── Szczepy ──
60% Monastrell (ze starych, 40-letnich krzewów) + 40% Syrah (krzewy 20-letnie). ` +
  `Uprawy ekologiczne na wysokości 700–800 m n.p.m., certyfikat CAERM (ES-ECO-024-MU), certyfikat wegański.

` +
  `── Winifikacja ──
Oddzielna winifikacja każdego szczepu, połączenie po fermentacji. ` +
  `6 miesięcy dojrzewania w beczkach z francuskiego dębu. 14,5% alk.

` +
  `── Degustacja ──
Wzrok: Intensywna rubinowa czerwień o żywym, niemal purpurowym połysku.
Nos: Bogaty i głęboko perfumowany — dojrzałe czarne i niebieskie owoce, cola, wanilia i potpourri. ` +
  `Śliwka, borówka, czarny pieprz i kamfora, a za nimi mineralne, dymne i drzewne nuty.
Usta: Aksamitne i uwodzicielskie — dobra intensywność owocowa, czyste nuty, kwasowość nadająca świeżość, ` +
  `zrównoważona przez dobrze zintegrowany słodki dąb na finiszu. Dymna nuta pojawia się po napowietrzeniu.

` +
  `── Parowanie ──
Wołowina i wieprzowina grillowana lub pieczona, dojrzałe sery twarde (Manchego, Pecorino), ` +
  `korzenne dania z drobiu i cielęciny, dania z roślin strączkowych i ryżu.

` +
  `── Historia winnicy ──
Rodzinna tradycja winarska sięga 1850 roku — cztery pokolenia rodziny Candela. ` +
  `W 1925 r. założono bodegę, a w 2006 r. bracia Antonio i Alfredo Candela powołali Bodegas Barahonda, ` +
  `dziś jedną z najbardziej rozpoznawalnych winnic w D.O. Yecla. ` +
  `150 ha własnych winnic + ponad 600 ha pod nadzorem agrotechnicznym. ` +
  `Restauracja przy winnicy wyróżniona w przewodniku Michelin i nagrodzona Repsol Sol.

` +
  `── Nagrody ──
Rocznik 2022: 94 pkt Decanter, 92 pkt Vinous, 91 pkt Wine Enthusiast, 90 pkt James Suckling.
Rocznik 2021: 90 pkt Decanter, 90 pkt James Suckling.
Rocznik 2020: 91 pkt James Suckling, 90 pkt Wine Enthusiast «Best Buy».
Challenge Milésime Bio 2020: Złoty Medal (rocznik 2017).`;

async function main() {
  console.log(`✏️  Aktualizacja opisu: ${SKU}`);

  // Sprawdź czy produkt istnieje
  const existing = await db
    .select({ sku: products.sku, name: products.name })
    .from(products)
    .where(eq(products.sku, SKU))
    .limit(1);

  if (existing.length === 0) {
    console.error(`❌ Produkt ${SKU} nie istnieje w bazie. Uruchom najpierw add-product-barahonda.ts`);
    process.exit(1);
  }

  console.log(`✓ Znaleziono: ${existing[0].name}`);

  await db
    .update(products)
    .set({
      description,
      longDescription,
      // Pola filtrów — kaskadowe filtry w sklepie
      originCountry: 'Hiszpania',
      originRegion: 'Yecla',
      grapeVariety: 'Monastrell, Syrah',
      year: '2022',
      // wineDetails: NULL — aktualnie dane obsługuje statyczny wineData.ts
    })
    .where(eq(products.sku, SKU));

  console.log('');
  console.log('✅ Zaktualizowano:');
  console.log('   • description      →', description.slice(0, 60) + '…');
  console.log('   • longDescription  →', longDescription.split('\n')[0].slice(0, 60) + '…');
  console.log('   • originCountry    → Hiszpania');
  console.log('   • originRegion     → Yecla');
  console.log('   • grapeVariety     → Monastrell, Syrah');
  console.log('   • year             → 2022');
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
