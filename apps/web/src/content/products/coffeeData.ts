/**
 * ═══════════════════════════════════════════════════════════
 * COFFEE PRODUCT DATA — statyczny katalog + DB override
 * ═══════════════════════════════════════════════════════════
 * 
 * ARCHITEKTURA: "Static-first with DB override"
 * (identyczna jak wineData.ts — patrz tamten plik po opis ogólny)
 * 
 * ── Dodawanie nowej kawy ──
 * 1. Skopiuj template na dole tego pliku
 * 2. Uzupełnij dane, wklej do coffeeDataCatalog
 * 3. Gotowe — zero zmian w DB
 * ═══════════════════════════════════════════════════════════
 */

// ============================================
// TYPES
// ============================================

export type CoffeeRoastLevel = 'jasny' | 'średni-jasny' | 'średni' | 'średni-ciemny' | 'ciemny';

export type CoffeeProcessing =
  | 'naturalny'   // Natural / Dry — suszenie w owocach
  | 'myty'        // Washed / Wet — fermentacja + mycie
  | 'honey'       // Honey / Pulped Natural
  | 'anaerobic'   // Anaerobic — fermentacja beztlenowa
  | 'wet-hulled'; // Giling Basah (Indonezja)

export interface CoffeeCuppingNotes {
  aroma: string;
  flavor: string;
  aftertaste: string;
  acidity: string;
  body: string;
}

export interface CoffeeBrewingMethod {
  method: string;       // "Espresso", "Pour-over", "French press", "Aeropress"
  grind: string;        // "drobny", "średni", "gruby"
  temp: string;         // "92–94°C"
  ratio: string;        // "1:2 (espresso)", "1:15 (filtr)"
  time: string;         // "25–30 s", "3–4 min"
  tip?: string;         // opcjonalna wskazówka
}

export interface CoffeeDetails {
  // ── Pochodzenie ──
  country: string;            // "Etiopia"
  region: string;             // "Gedeo Zone, Yirgacheffe"
  farm?: string;              // "Kebele Haru Washing Station"
  altitude: string;           // "1 800–2 200 m n.p.m."
  variety: string;            // "Heirloom Ethiopian"
  harvest: string;            // "Grudzień 2024 – Luty 2025"

  // ── Przetwarzanie & Palenie ──
  processing: CoffeeProcessing;
  roastLevel: CoffeeRoastLevel;
  roastDate?: string;         // "Palone na zamówienie" albo data

  // ── Profil smakowy (suwaki 0–100) ──
  acidityValue: number;       // 0–100
  sweetnessValue: number;     // 0–100
  bitterValue: number;        // 0–100
  bodyValue: number;          // 0–100

  // ── Notatki sensoryczne ──
  flavorNotes: string[];      // ["czarna porzeczka", "malina", "ciemna czekolada"]
  cuppingNotes: CoffeeCuppingNotes;

  // ── Palacznia / Dostawca ──
  roastery: string;
  roasteryDescription?: string;

  // ── Parzenie ──
  brewingMethods: CoffeeBrewingMethod[];

  // ── Certyfikaty ──
  isOrganic?: boolean;
  isFairTrade?: boolean;
  isRainforestAlliance?: boolean;
  isSpecialty?: boolean;      // SCA ≥ 80 pkt

  // ── Kraj & Flaga ──
  countryCode: string;
}

// ============================================
// DANE PRODUKTÓW — COFFEE CATALOG
// ============================================

/**
 * Główny katalog danych kawowych.
 * Klucz = slug produktu z bazy danych.
 */
export const coffeeDataCatalog: Record<string, CoffeeDetails> = {

  // ─────────────────────────────────────────
  // TEMPLATE — skopiuj i dostosuj dla nowej kawy
  // ─────────────────────────────────────────
  // "slug-nowej-kawy": {
  //   country: "",
  //   region: "",
  //   farm: "",
  //   altitude: "",
  //   variety: "",
  //   harvest: "",
  //   processing: "myty",
  //   roastLevel: "średni",
  //   acidityValue: 65,
  //   sweetnessValue: 40,
  //   bitterValue: 30,
  //   bodyValue: 55,
  //   flavorNotes: ["", "", ""],
  //   cuppingNotes: {
  //     aroma: "",
  //     flavor: "",
  //     aftertaste: "",
  //     acidity: "",
  //     body: "",
  //   },
  //   roastery: "",
  //   roasteryDescription: "",
  //   brewingMethods: [
  //     {
  //       method: "Espresso",
  //       grind: "drobny",
  //       temp: "93°C",
  //       ratio: "1:2",
  //       time: "25–28 s",
  //     },
  //     {
  //       method: "Filter / Pour-over",
  //       grind: "średni",
  //       temp: "92–94°C",
  //       ratio: "1:15",
  //       time: "3–4 min",
  //     },
  //   ],
  //   countryCode: "",
  // },
};

// ============================================
// HELPER — pobierz dane lub zwróć fallback
// ============================================

const defaultCoffeeDetails: CoffeeDetails = {
  country: "—",
  region: "—",
  altitude: "—",
  variety: "—",
  harvest: "—",
  processing: "myty",
  roastLevel: "średni",
  acidityValue: 50,
  sweetnessValue: 40,
  bitterValue: 40,
  bodyValue: 50,
  flavorNotes: [],
  cuppingNotes: {
    aroma: "Brak opisu.",
    flavor: "Brak opisu.",
    aftertaste: "Brak opisu.",
    acidity: "Brak opisu.",
    body: "Brak opisu.",
  },
  roastery: "—",
  brewingMethods: [],
  countryCode: "",
};

function deepMergeCoffee(
  base: CoffeeDetails,
  override: Record<string, unknown>,
): CoffeeDetails {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key]) &&
      result[key] !== null
    ) {
      result[key] = {
        ...(result[key] as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      };
    } else {
      result[key] = value;
    }
  }

  return result as unknown as CoffeeDetails;
}

/**
 * Pobierz dane kawowe dla produktu.
 * 
 * Priority chain (3-warstwowy merge):
 * 1. DB Override (product.coffeeDetails JSONB) — partial, tylko zmienione pola
 * 2. Static Catalog (coffeeDataCatalog[slug])   — pełny obiekt CoffeeDetails
 * 3. Default Fallback (defaultCoffeeDetails)    — generyczne wartości
 */
export function getCoffeeDetailsForProduct(product: {
  slug?: string;
  origin?: string;
  originCountry?: string;
  coffeeDetails?: Record<string, unknown> | null;
}): CoffeeDetails {
  const staticData: CoffeeDetails =
    product.slug && coffeeDataCatalog[product.slug]
      ? { ...coffeeDataCatalog[product.slug] }
      : { ...defaultCoffeeDetails };

  if (product.coffeeDetails && Object.keys(product.coffeeDetails).length > 0) {
    return deepMergeCoffee(staticData, product.coffeeDetails);
  }

  return staticData;
}
