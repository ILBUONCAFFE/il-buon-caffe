/**
 * ═══════════════════════════════════════════════════════════
 * WINE PRODUCT DATA — D1 content + legacy fallbacks
 * ═══════════════════════════════════════════════════════════
 * 
 * ARCHITEKTURA: "D1-first with static fallback"
 * 
 * ┌─────────────────────────────────────────────────────────┐
 * │  Warstwa 1: D1 → product_content.wine_details by SKU    │
 * │  Warstwa 2: Ten plik → wineDataCatalog[slug]            │
 * │  Warstwa 3: defaultWineDetails                          │
 * └─────────────────────────────────────────────────────────┘
 * 
 * ── Dlaczego nie wszystko w DB? ──
 * Dane statyczne (terroir, nuty smakowe, nagrody) NIE zmieniają
 * się z zamówieniami. Trzymanie ich tu = zero obciążenia DB.
 * Pole wine_details mieszka w Cloudflare D1 product_content.
 * 
 * ── Admin ──
 * Admin edytuje treść → API zapisuje do D1 product_content →
 * getWineDetailsForProduct() merguje: D1 wine_details > D1 split fields > catalog > default.
 * 
 * ── Dodawanie nowego wina ──
 * 1. Skopiuj template na dole tego pliku
 * 2. Uzupełnij dane, wklej do wineDataCatalog
 * 3. Gotowe — zero zmian w DB
 * ═══════════════════════════════════════════════════════════
 */

import type { ProductRichContent } from '@repo/types';

// ============================================
// TYPES
// ============================================

export interface WineTastingNotes {
  eye: string;
  nose: string;
  palate: string;
}

export interface WineAward {
  year: string;
  award: string;
  competition: string;
}

export type WineColor = 'Czerwone' | 'Białe' | 'Różowe' | 'Pomarańczowe';
export type WineType = 'Spokojne' | 'Musujące' | 'Półmusujące';
export type WineSweetness = 'Wytrawne' | 'Półwytrawne' | 'Półsłodkie' | 'Słodkie';
export type GlassType = 'bordeaux' | 'burgundy' | 'flute' | 'tulip' | 'coupe' | 'iso' | 'white' | 'rose';

export interface WineDetails {
  // ── Technikalia ──
  grape: string;
  alcohol: string;
  /** Pojemność butelki — np. "750 ml", "1,5 L". Wyświetlane w hero. */
  capacity?: string;
  /** Klasyfikacja widoczna w hero produktu. */
  wineColor?: WineColor;
  wineType?: WineType;
  wineSweetness?: WineSweetness;
  body: string;
  bodyValue: number;       // 0–100
  tannins: number;         // 0–100
  acidity: number;         // 0–100
  sweetness: number;       // 0–100
  aging: string;
  servingTemp: string;
  decanting: string;
  agingPotential: string;
  
  // ── Winnica & Terroir ──
  winery: string;
  established: string;
  altitude: string;
  soil: string;
  climate: string;
  vinification: string;
  /** Pełny opis narracyjny winnicy — historia, terroir, certyfikaty.
   *  Renderowany jako akapity w sekcji "Historia & Terroir".
   *  Pola established/altitude/soil/climate zostają KRÓTKIE (kafelki). */
  wineryDescription?: string;
  
  // ── Degustacja ──
  tastingNotes: WineTastingNotes;

  /** Typ kieliszka rekomendowany dla tego wina. Renderowany jako SVG sylwetka
   *  w sekcji "Serwowanie". */
  glassType?: GlassType;

  /** Krótka ciekawostka o winie / producencie / regionie. Renderowana jako
   *  narracyjny break między sekcjami Terroir i Serwowanie. ~200 znaków. */
  funFact?: string;

  /** Ogólne kategorie żywności do których pasuje wino — bez konkretnych dań.
   *  Np. "Czerwone mięsa, dziczyzna, dojrzewające sery". Wyświetlane w sekcji
   *  "Z czym podać" na stronie produktu. */
  foodPairing?: string;

  // ── Nagrody ──
  awards: WineAward[];
  
  // ── Certyfikaty ──
  isOrganic?: boolean;
  isBiodynamic?: boolean;
  isNatural?: boolean;
  
  // ── Kraj & Flaga ──
  /** Kod kraju ISO 3166-1 alpha-2 (małe litery), np. "es", "it", "fr"
   *  Flaga ładowana z: /assets/flags/{countryCode}.png */
  countryCode: string;
}

// ============================================
// DANE PRODUKTÓW — WINE CATALOG
// ============================================

/**
 * Główny katalog danych winnych.
 * Klucz = slug produktu z bazy danych.
 */
export const wineDataCatalog: Record<string, WineDetails> = {
  // ─────────────────────────────────────────
  // TEMPLATE — skopiuj i dostosuj dla nowego wina
  // ─────────────────────────────────────────
  // "slug-nowego-wina": {
  //   grape: "",
  //   alcohol: "",
  //   body: "",
  //   bodyValue: 0,
  //   tannins: 0,
  //   acidity: 0,
  //   sweetness: 0,
  //   aging: "",
  //   servingTemp: "",
  //   decanting: "",
  //   agingPotential: "",
  //   winery: "",
  //   established: "",
  //   altitude: "",
  //   soil: "",
  //   climate: "",
  //   vinification: "",
  //   tastingNotes: {
  //     eye: "",
  //     nose: "",
  //     palate: "",
  //   },
  //   awards: [],
  //   countryCode: "",
  // },
};

// ============================================
// HELPER — pobierz dane lub zwróć fallback
// ============================================

/** Domyślne dane (fallback) gdy produkt nie ma wpisu w katalogu */
const defaultWineDetails: WineDetails = {
  grape: "—",
  alcohol: "—",
  body: "Średnie",
  bodyValue: 50,
  tannins: 50,
  acidity: 50,
  sweetness: 20,
  aging: "—",
  servingTemp: "14-18°C",
  decanting: "—",
  agingPotential: "—",
  winery: "—",
  established: "—",
  altitude: "—",
  soil: "—",
  climate: "—",
  vinification: "Brak danych o winifikacji.",
  tastingNotes: {
    eye: "Brak opisu.",
    nose: "Brak opisu.",
    palate: "Brak opisu.",
  },
  awards: [],
  foodPairing: undefined,
  glassType: undefined,
  funFact: undefined,
  countryCode: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeWineDetails(details: WineDetails): WineDetails {
  const tastingNotes: Record<string, unknown> = isRecord(details.tastingNotes) ? details.tastingNotes : {};


  const awards: WineAward[] = Array.isArray(details.awards)
    ? details.awards
        .filter((item): item is WineAward => {
          return (
            isRecord(item) &&
            (typeof item.year === 'string' || typeof item.year === 'number') &&
            typeof item.award === 'string' &&
            typeof item.competition === 'string'
          );
        })
        .map((item) => ({
          year: String(item.year),
          award: item.award,
          competition: item.competition,
        }))
    : [];

  return {
    ...defaultWineDetails,
    ...details,
    grape: toString(details.grape, defaultWineDetails.grape),
    alcohol: toString(details.alcohol, defaultWineDetails.alcohol),
    capacity:
      details.capacity === undefined || details.capacity === null
        ? undefined
        : toString(details.capacity, ''),
    wineColor:
      details.wineColor === undefined || details.wineColor === null
        ? undefined
        : toString(details.wineColor, '') as WineColor,
    wineType:
      details.wineType === undefined || details.wineType === null
        ? undefined
        : toString(details.wineType, '') as WineType,
    wineSweetness:
      details.wineSweetness === undefined || details.wineSweetness === null
        ? undefined
        : toString(details.wineSweetness, '') as WineSweetness,
    body: toString(details.body, defaultWineDetails.body),
    bodyValue: toNumber(details.bodyValue, defaultWineDetails.bodyValue),
    tannins: toNumber(details.tannins, defaultWineDetails.tannins),
    acidity: toNumber(details.acidity, defaultWineDetails.acidity),
    sweetness: toNumber(details.sweetness, defaultWineDetails.sweetness),
    aging: toString(details.aging, defaultWineDetails.aging),
    servingTemp: toString(details.servingTemp, defaultWineDetails.servingTemp),
    decanting: toString(details.decanting, defaultWineDetails.decanting),
    agingPotential: toString(details.agingPotential, defaultWineDetails.agingPotential),
    winery: toString(details.winery, defaultWineDetails.winery),
    established: toString(details.established, defaultWineDetails.established),
    altitude: toString(details.altitude, defaultWineDetails.altitude),
    soil: toString(details.soil, defaultWineDetails.soil),
    climate: toString(details.climate, defaultWineDetails.climate),
    vinification: toString(details.vinification, defaultWineDetails.vinification),
    wineryDescription:
      details.wineryDescription === undefined
        ? undefined
        : toString(details.wineryDescription, defaultWineDetails.wineryDescription ?? ''),
    tastingNotes: {
      eye: toString(tastingNotes['eye'], defaultWineDetails.tastingNotes.eye),
      nose: toString(tastingNotes['nose'], defaultWineDetails.tastingNotes.nose),
      palate: toString(tastingNotes['palate'], defaultWineDetails.tastingNotes.palate),
    },
    awards,
    foodPairing:
      details.foodPairing === undefined || details.foodPairing === null
        ? undefined
        : toString(details.foodPairing, ''),
    glassType:
      details.glassType === undefined || details.glassType === null
        ? undefined
        : (toString(details.glassType, '') as GlassType),
    funFact:
      details.funFact === undefined || details.funFact === null
        ? undefined
        : toString(details.funFact, ''),
    countryCode: toString(details.countryCode, defaultWineDetails.countryCode),
  };
}

// ============================================
// DEEP MERGE HELPER
// ============================================

/**
 * Głęboki merge dwóch obiektów. `override` nadpisuje pola z `base`.
 * Obsługuje zagnieżdżone obiekty (np. tastingNotes.nose).
 * Tablice (awards) są ZASTĘPOWANE, nie mergowane.
 */
function deepMerge(base: WineDetails, override: Record<string, unknown>): WineDetails {
  const result: Record<string, unknown> = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    // Ignore nullish overrides so partial JSONB payloads don't erase safe defaults.
    if (value === null || value === undefined) {
      continue;
    }

    const current = result[key];

    if (isRecord(current) && isRecord(value)) {
      // Recursive merge for nested objects (e.g. tastingNotes)
      result[key] = { ...current, ...value };
      continue;
    }

    // Keep the base type if override has incompatible shape.
    if (Array.isArray(current) && !Array.isArray(value)) continue;
    if (isRecord(current) && !isRecord(value)) continue;

    result[key] = value;
  }
  
  return result as unknown as WineDetails;
}

function getExtendedString(extended: Record<string, unknown>, key: string): string | undefined {
  const value = extended[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getProfileNumber(profile: Record<string, number>, key: string): number | undefined {
  const value = profile[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapContentAwards(content: ProductRichContent): WineAward[] | undefined {
  const extendedAwards = content.extended['awards'];
  if (Array.isArray(extendedAwards)) {
    const items = extendedAwards
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => {
        const competition = toString(item.competition, toString(item.name, ''));
        const award = toString(item.award, toString(item.rank, 'Wyróżnienie'));
        const year = item.year;
        if (!competition || (typeof year !== 'string' && typeof year !== 'number')) return null;
        return { year: String(year), award, competition };
      })
      .filter((item): item is WineAward => item !== null);

    if (items.length > 0) return items;
  }

  if (content.awards.length === 0) return undefined;
  return content.awards.map((item) => ({
    year: String(item.year),
    award: item.rank || 'Wyróżnienie',
    competition: item.name,
  }));
}

function productRichContentToWineDetails(content: ProductRichContent | null | undefined): Record<string, unknown> | null {
  if (!content || content.category !== 'wine' || !content.isPublished) return null;

  if (content.wineDetails && Object.keys(content.wineDetails).length > 0) {
    return content.wineDetails;
  }

  const extended = content.extended;
  const bodyValue = getProfileNumber(content.profile, 'body');
  const tannins = getProfileNumber(content.profile, 'tannin') ?? getProfileNumber(content.profile, 'tannins');
  const acidity = getProfileNumber(content.profile, 'acidity');
  const sweetness = getProfileNumber(content.profile, 'sweetness');
  const awards = mapContentAwards(content);

  const mapped: Record<string, unknown> = {
    ...(bodyValue !== undefined ? { bodyValue } : {}),
    ...(tannins !== undefined ? { tannins } : {}),
    ...(acidity !== undefined ? { acidity } : {}),
    ...(sweetness !== undefined ? { sweetness } : {}),
    ...(content.servingTemp ? { servingTemp: content.servingTemp } : {}),
    ...(getExtendedString(extended, 'grape') ? { grape: getExtendedString(extended, 'grape') } : {}),
    ...(getExtendedString(extended, 'alcohol') ? { alcohol: getExtendedString(extended, 'alcohol') } : {}),
    ...(getExtendedString(extended, 'capacity') ? { capacity: getExtendedString(extended, 'capacity') } : {}),
    ...(getExtendedString(extended, 'body') ? { body: getExtendedString(extended, 'body') } : {}),
    ...(getExtendedString(extended, 'aging') ? { aging: getExtendedString(extended, 'aging') } : {}),
    ...(getExtendedString(extended, 'decanting') ? { decanting: getExtendedString(extended, 'decanting') } : {}),
    ...(getExtendedString(extended, 'agingPotential') ? { agingPotential: getExtendedString(extended, 'agingPotential') } : {}),
    ...(getExtendedString(extended, 'winery') ? { winery: getExtendedString(extended, 'winery') } : {}),
    ...(getExtendedString(extended, 'established') ? { established: getExtendedString(extended, 'established') } : {}),
    ...(getExtendedString(extended, 'altitude') ? { altitude: getExtendedString(extended, 'altitude') } : {}),
    ...(getExtendedString(extended, 'soil') ? { soil: getExtendedString(extended, 'soil') } : {}),
    ...(getExtendedString(extended, 'climate') ? { climate: getExtendedString(extended, 'climate') } : {}),
    ...(getExtendedString(extended, 'vinification') ? { vinification: getExtendedString(extended, 'vinification') } : {}),
    ...(getExtendedString(extended, 'wineryDescription') ? { wineryDescription: getExtendedString(extended, 'wineryDescription') } : {}),
    ...(getExtendedString(extended, 'foodPairing') ? { foodPairing: getExtendedString(extended, 'foodPairing') } : {}),
    ...(getExtendedString(extended, 'glassType') ? { glassType: getExtendedString(extended, 'glassType') } : {}),
    ...(getExtendedString(extended, 'funFact') ? { funFact: getExtendedString(extended, 'funFact') } : {}),
    ...(getExtendedString(extended, 'countryCode') ? { countryCode: getExtendedString(extended, 'countryCode') } : {}),
    ...(awards ? { awards } : {}),
  };

  if (Object.keys(content.sensory).length > 0) {
    mapped.tastingNotes = {
      ...(content.sensory.eye ? { eye: content.sensory.eye } : {}),
      ...(content.sensory.nose ? { nose: content.sensory.nose } : {}),
      ...(content.sensory.palate ? { palate: content.sensory.palate } : {}),
    };
  }

  return Object.keys(mapped).length > 0 ? mapped : null;
}

// ============================================
// MAIN RESOLVER — 3-tier priority chain
// ============================================

/**
 * Pobierz dane winne dla produktu.
 * Użycie: const details = getWineDetailsForProduct(product);
 * 
 * ══════════════════════════════════════════
 * PRIORYTET:
 * ══════════════════════════════════════════
 * 
 * 1. D1 Product Content (product_content.wine_details keyed by SKU)
 *    ↳ Opublikowane dane premium pobierane z Cloudflare D1.
 * 
 * 2. Static Catalog (wineDataCatalog[slug])
 *    ↳ Pełny obiekt WineDetails zdefiniowany w tym pliku.
 *      Służy jako "domyślne dane" produktu — darmowe, zero DB.
 * 
 * 3. Default Fallback (defaultWineDetails)
 *    ↳ Generyczne wartości gdy produkt nie ma wpisu w katalogu.
 *      Uzupełniane danymi z pól product (grapeVariety, origin).
 * 
 * ══════════════════════════════════════════
 * PRZEPŁYW DLA ADMINA:
 * ══════════════════════════════════════════
 * 
 * Admin → API PUT /admin/content/product/:sku
 *   → Zapisuje do D1 product_content
 *   → Produkt pobiera D1 po SKU i mapuje na obecny UI WineDetails
 */
export function getWineDetailsForProduct(product: {
  slug?: string | null;
  grapeVariety?: string | null;
  origin?: string | null;
  originCountry?: string | null;
  year?: string | null;
}, productContent?: ProductRichContent | null): WineDetails {
  // Static catalog or default fallback; D1 content is merged on top.
  const staticData: WineDetails = (product.slug && wineDataCatalog[product.slug])
    ? { ...wineDataCatalog[product.slug] }
    : {
        ...defaultWineDetails,
        grape: product.grapeVariety || defaultWineDetails.grape,
        countryCode: getCountryCode(product.originCountry || product.origin || ""),
      };

  const d1WineDetails = productRichContentToWineDetails(productContent);
  if (d1WineDetails) {
    return normalizeWineDetails(deepMerge(staticData, d1WineDetails));
  }

  return normalizeWineDetails(staticData);
}

// ============================================
// COUNTRY CODE MAPPING
// ============================================

/** Mapowanie nazw krajów (PL) → kody ISO */
const countryNameToCode: Record<string, string> = {
  "hiszpania": "es",
  "spain": "es",
  "włochy": "it",
  "italy": "it",
  "francja": "fr",
  "france": "fr",
  "portugalia": "pt",
  "portugal": "pt",
  "argentyna": "ar",
  "argentina": "ar",
  "chile": "cl",
  "niemcy": "de",
  "germany": "de",
  "austria": "at",
  "australia": "au",
  "nowa zelandia": "nz",
  "new zealand": "nz",
  "usa": "us",
  "stany zjednoczone": "us",
  "united states": "us",
  "rpa": "za",
  "south africa": "za",
  "gruzja": "ge",
  "georgia": "ge",
  "grecja": "gr",
  "greece": "gr",
  "węgry": "hu",
  "hungary": "hu",
  "rumunia": "ro",
  "romania": "ro",
  "chorwacja": "hr",
  "croatia": "hr",
  "słowenia": "si",
  "slovenia": "si",
  "mołdawia": "md",
  "moldova": "md",
};

/**
 * Konwertuje nazwę kraju na kod ISO 3166-1 alpha-2.
 * Obsługuje polskie i angielskie nazwy.
 */
export function getCountryCode(countryName: string): string {
  if (!countryName) return "";
  
  // Jeśli to już jest 2-literowy kod
  if (countryName.length === 2) return countryName.toLowerCase();
  
  // Znajdź w mapowaniu (case-insensitive)
  const normalized = countryName.toLowerCase().trim();
  
  // Sprawdź bezpośrednie dopasowanie
  if (countryNameToCode[normalized]) {
    return countryNameToCode[normalized];
  }
  
  // Sprawdź, czy nazwa zawiera jakiś klucz (np. "Hiszpania, Yecla" → "es")
  for (const [name, code] of Object.entries(countryNameToCode)) {
    if (normalized.includes(name)) {
      return code;
    }
  }
  
  return "";
}

/**
 * Zwraca ścieżkę do pliku flagi.
 * Np: getFlagPath("es") → "/assets/flags/es.png"
 */
export function getFlagPath(countryCode: string): string {
  if (!countryCode) return "";
  return `/assets/flags/${countryCode.toLowerCase()}.png`;
}
