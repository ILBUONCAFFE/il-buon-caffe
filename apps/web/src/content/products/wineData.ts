/**
 * ═══════════════════════════════════════════════════════════
 * WINE PRODUCT DATA — statyczny katalog + DB override
 * ═══════════════════════════════════════════════════════════
 * 
 * ARCHITEKTURA: "Static-first with DB override"
 * 
 * ┌─────────────────────────────────────────────────────────┐
 * │  Warstwa 1: DB → products.wine_details (JSONB, partial) │
 * │  Warstwa 2: Ten plik → wineDataCatalog[slug]            │
 * │  Warstwa 3: defaultWineDetails (generyczny fallback)    │
 * └─────────────────────────────────────────────────────────┘
 * 
 * ── Dlaczego nie wszystko w DB? ──
 * Dane statyczne (terroir, nuty smakowe, nagrody) NIE zmieniają
 * się z zamówieniami. Trzymanie ich tu = zero obciążenia DB.
 * Kolumna wine_details w DB jest domyślnie NULL (0 bajtów).
 * 
 * ── Electron Admin ──
 * Admin edytuje treść → API zapisuje PARTIAL JSONB do DB →
 * getWineDetailsForProduct() merguje: DB > catalog > default.
 * Np. admin zmienia TYLKO "bodyValue" → DB: {"bodyValue": 90}
 * → reszta pól brana ze statycznego katalogu poniżej.
 * 
 * ── Dodawanie nowego wina ──
 * 1. Skopiuj template na dole tego pliku
 * 2. Uzupełnij dane, wklej do wineDataCatalog
 * 3. Gotowe — zero zmian w DB
 * ═══════════════════════════════════════════════════════════
 */

// ============================================
// TYPES
// ============================================

export interface WineTastingNotes {
  eye: string;
  nose: string;
  palate: string;
}

export interface WineFoodPairing {
  name: string;
  description: string;
  emoji?: string;
  /** Ścieżka do zdjęcia talerza. Lokalnie: /assets/dishes/nazwa.webp; produkcja: URL R2.
   *  Jeśli brak — wyświetla fallback z emoji. */
  imageUrl?: string;
  /** Kategoria dania — używana do filtrowania lub stylu karty */
  category?: 'mięso' | 'ryba' | 'makaron' | 'sery' | 'warzywa' | 'owoce morza' | 'drób' | 'deser' | 'wędliny' | 'dziczyzna';
}

export interface WineAward {
  year: string;
  award: string;
  competition: string;
}

export interface WineDetails {
  // ── Technikalia ──
  grape: string;
  alcohol: string;
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
  
  // ── Parowanie z jedzeniem ──
  foodPairing: WineFoodPairing[];
  
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
  // BARAHONDA ORGANIC BARRICA
  // ─────────────────────────────────────────
  "barahonda-organic-barrica": {
    grape: "60% Monastrell (40-letnie winorośle) + 40% Syrah (20-letnie winorośle)",
    alcohol: "14,5%",
    body: "Pełne, aksamitne",
    bodyValue: 80,
    tannins: 60,
    acidity: 58,
    sweetness: 15,
    aging: "6 mies. beczki z francuskiego dębu (oddzielna winifikacja szczepów, połączenie po fermentacji)",
    servingTemp: "16–18°C",
    decanting: "30–45 min — otwiera dymne nuty i łagodzi taniny",
    agingPotential: "7–8 lat od zbioru",
    
    winery: "Bodegas Barahonda",
    established: "1925 / 2006",
    altitude: "700–800 m n.p.m.",
    soil: "Wapień, piasek, glina",
    climate: "Kontynentalny",
    vinification: "Oddzielna winifikacja Monastrell i Syrah, połączenie po fermentacji. 6 mies. dąb francuski.",
    wineryDescription: "Rodzinna tradycja winarska sięga 1850 roku — cztery pokolenia rodziny Candela. W 1925 r. założono bodegę, a w 2006 r. bracia Antonio i Alfredo Candela powołali Bodegas Barahonda, dziś jedną z najbardziej rozpoznawalnych winnic w D.O. Yecla.\n\n150 ha własnych winnic + ponad 600 ha pod nadzorem agrotechnicznym. Działki w dwóch strefach: Campo Arriba (700–800 m) — 80% wapień, 5% piasek, 15% glina; Campo Abajo (400–500 m) — 30% wapień, 5% piasek, 65% glina. Głębokie, przepuszczalne gleby — ilaste podłoże retencjonuje wodę, co przekłada się na koncentrację i złożoność wina.\n\nKlimat kontynentalny z ekstremalnymi amplitudami (–6°C do +40°C), 3 385 h słońca i ok. 300 mm opadów rocznie. Certyfikat ekologiczny CAERM (ES-ECO-024-MU), certyfikat wegański. Restauracja przy winnicy wyróżniona w przewodniku Michelin i nagrodzona Repsol Sol.",
    
    tastingNotes: {
      eye: "Intensywna rubinowa czerwień o żywym, niemal purpurowym połysku.",
      nose: "Bogaty i głęboko perfumowany — dojrzałe czarne i niebieskie owoce, cola, wanilia i potpourri. Śliwka, borówka, czarny pieprz i kamfora, a za nimi mineralne, dymne i drzewne nuty.",
      palate: "Aksamitne i uwodzicielskie — dobra intensywność owocowa, czyste nuty, kwasowość nadająca świeżość, zrównoważona przez dobrze zintegrowany słodki dąb na finiszu. Gładkie i słodkie przy wejściu, bardziej zwarte w środku palety — gorzkawa wiśnia, borówka, wanilia i korzenny tort. Dymna nuta pojawia się po napowietrzeniu.",
    },
    
    foodPairing: [
      {
        name: "Albóndigas",
        description: "Klopsiki w sosie pomidorowym po hiszpańsku — klasyczna tapas, której pikantność świetnie rezonuje z owocowymi nutami Monastrell",
        category: "mięso",
        imageUrl: "/api/uploads/image/Albóndigas.png",
      },
      {
        name: "Antrykot wołowy z grilla",
        description: "Soczysty antrykot z grilla z chrupiącą skórką — moce taniny Monastrell doskonale tną tłuszcz, wydobywając dymne nuty mięsa",
        category: "mięso",
        imageUrl: "/api/uploads/image/Antrykot wołowy z grilla.png",
      },
      {
        name: "Birria",
        description: "Meksykańskie duszone mięso w pikantnym bulionie — intensywne przyprawy i głęboki smak umami grają z ciemnymi owocami wina",
        category: "mięso",
        imageUrl: "/api/uploads/image/Birria.png",
      },
      {
        name: "Chili con carne",
        description: "Wołowina z fasolą i chili — pełna treść tego dania wymaga równie mocnego, taniczniego wina z Yecla",
        category: "mięso",
        imageUrl: "/api/uploads/image/Chili con carne.png",
      },
      {
        name: "Chorizo i fuet – talerz wędlin",
        description: "Talerz z chorizo, fuet i innymi suszonymi wędlinami — korzenne nuty wina i dymna wiśnia tworzą idealne połączenie tapas",
        category: "wędliny",
        imageUrl: "/api/uploads/image/Chorizo i fuet – talerz wędlin.png",
      },
      {
        name: "Dzik duszony",
        description: "Wolno duszony dzik z ziołami i czerwonym winem — dziczyzna o intensywnym smaku doskonale harmonizuje z Monastrell",
        category: "dziczyzna",
        imageUrl: "/api/uploads/image/Dzik duszony.png",
      },
      {
        name: "Escalivada",
        description: "Pieczone warzywa po katalońsku: bakłażan, papryka i cebula — wegańska klasyka podkreślająca owocowy charakter wina",
        category: "warzywa",
        imageUrl: "/api/uploads/image/Escalivada.png",
      },
      {
        name: "Jagnięcina pieczona z ziołami",
        description: "Udziec jagnięcy pieczony z rozmarynem, tymiankiem i czosnkiem — klasyczne połączenie dla win ze szczepu Monastrell z Yecla",
        category: "mięso",
        imageUrl: "/api/uploads/image/Jagnięcina pieczona z ziołami.png",
      },
      {
        name: "Karkówka z grilla",
        description: "Soczysta karkówka z grilla z marynatą ziołową — delikatny tłuszcz i dym grilla świetnie rezonują z taniczną strukturą Barahondy",
        category: "mięso",
        imageUrl: "/api/uploads/image/Karkówka z grilla.png",
      },
      {
        name: "Manchego z dodatkami",
        description: "Dojrzewający ser Manchego z oliwkami, marynowanymi warzywami i chrupkim pieczywem — idealna tapas do kieliszka Barahondy",
        category: "sery",
        imageUrl: "/api/uploads/image/Manchego z dodatkami.png",
      },
      {
        name: "Moussaka",
        description: "Grecka zapiekanka z mięsem mielonym, bakłażanem i sosem béchamel — bogata i kremowa struktura dania podkreśla dojrzałość wina",
        category: "mięso",
        imageUrl: "/api/uploads/image/Moussaka.png",
      },
      {
        name: "Paella z mięsem",
        description: "Tradycyjna paella valenciana z kurczakiem i królikiem — szafranowy ryż i wino z tej samej strefy klimatycznej to naturalne połączenie",
        category: "mięso",
        imageUrl: "/api/uploads/image/Paella z mięsem.png",
      },
      {
        name: "Parmezan i Pecorino",
        description: "Twarde sery dojrzewające o intensywnym smaku — słony, orzechowy charakter serów podkreśla ciemnoowocowe nuty Monastrell",
        category: "sery",
        imageUrl: "/api/uploads/image/Parmezan i Pecorino.png",
      },
      {
        name: "Pieczona kaczka",
        description: "Kaczka pieczona z figami i korzennymi przyprawami — tłuste, aromatyczne mięso drobiowe idealnie balansuje taniny Barahondy",
        category: "drób",
        imageUrl: "/api/uploads/image/Pieczona kaczka.png",
      },
      {
        name: "Sarnina",
        description: "Pieczeń z sarny lub gulasz z sarniny — szlachetna dziczyzna o lekko słodkawym smaku tworzy eleganckie połączenie z organicznym winem",
        category: "dziczyzna",
        imageUrl: "/api/uploads/image/Sarnina.png",
      },
      {
        name: "Sery pleśniowe",
        description: "Roquefort, Gorgonzola lub Cabrales — kontrastowe połączenie intensywnej pleśni i dojrzałych, ciemnych owoców wina",
        category: "sery",
        imageUrl: "/api/uploads/image/Sery pleśniowe.png",
      },
      {
        name: "Souvlaki",
        description: "Greckie szaszłyki z wieprzowiny lub jagnięciny z tzatziki i pitą — dymny grill i śródziemnomorskie zioła grają z charakterem wina",
        category: "mięso",
        imageUrl: "/api/uploads/image/Souvlaki.png",
      },
      {
        name: "Żeberka wieprzowe BBQ",
        description: "Wolno pieczone żeberka z sosem BBQ — słodko-dymna glazura i miękkie mięso wymagają pełnego, taniczniego czerwonego wina",
        category: "mięso",
        imageUrl: "/api/uploads/image/Żeberka wieprzowe BBQ.png",
      },
      {
        name: "Żeberka wołowe duszone",
        description: "Short ribs duszone przez 6 godzin z warzywami korzennymi — intensywne, rozpadające się mięso doskonale harmonizuje z Barahondą",
        category: "mięso",
        imageUrl: "/api/uploads/image/Żeberka wołowe duszone.png",
      },
    ],
    
    awards: [
      { year: "2022", award: "94 pkt Decanter, 92 pkt Vinous, 91 pkt Wine Enthusiast, 90 pkt James Suckling", competition: "Rocznik 2022" },
      { year: "2021", award: "90 pkt Decanter, 90 pkt James Suckling", competition: "Rocznik 2021" },
      { year: "2020", award: "91 pkt James Suckling, 90 pkt Wine Enthusiast «Best Buy»", competition: "Rocznik 2020" },
      { year: "2019", award: "91 pkt James Suckling", competition: "Rocznik 2019" },
      { year: "2018", award: "92 pkt James Suckling (rocznik 2017), 91 pkt James Suckling (rocznik 2016)", competition: "James Suckling" },
      { year: "2020", award: "Złoty Medal", competition: "Challenge Milésime Bio (rocznik 2017)" },
    ],
    
    isOrganic: true,
    countryCode: "es",
  },

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
  //   foodPairing: [
  //     { name: "", description: "", emoji: "" },
  //   ],
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
  foodPairing: [],
  awards: [],
  countryCode: "",
};

// ============================================
// DEEP MERGE HELPER
// ============================================

/**
 * Głęboki merge dwóch obiektów. `override` nadpisuje pola z `base`.
 * Obsługuje zagnieżdżone obiekty (np. tastingNotes.nose).
 * Tablice (foodPairing, awards) są ZASTĘPOWANE, nie mergowane.
 */
function deepMerge(base: WineDetails, override: Record<string, unknown>): WineDetails {
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
      // Recursive merge for nested objects (e.g. tastingNotes)
      result[key] = { ...(result[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      result[key] = value;
    }
  }
  
  return result as unknown as WineDetails;
}

// ============================================
// MAIN RESOLVER — 3-tier priority chain
// ============================================

/**
 * Pobierz dane winne dla produktu.
 * Użycie: const details = getWineDetailsForProduct(product);
 * 
 * ══════════════════════════════════════════
 * PRIORYTET (3-warstwowy merge):
 * ══════════════════════════════════════════
 * 
 * 1. 🔶 DB Override (product.wineDetails JSONB)
 *    ↳ Partial — zawiera TYLKO pola zmienione z Electron admin.
 *      Np: { "bodyValue": 90, "tastingNotes": { "nose": "nowy opis" } }
 *      Reszta pól brana jest z warstw poniżej.
 * 
 * 2. 📄 Static Catalog (wineDataCatalog[slug])
 *    ↳ Pełny obiekt WineDetails zdefiniowany w tym pliku.
 *      Służy jako "domyślne dane" produktu — darmowe, zero DB.
 * 
 * 3. ⬜ Default Fallback (defaultWineDetails)
 *    ↳ Generyczne wartości gdy produkt nie ma wpisu w katalogu.
 *      Uzupełniane danymi z pól product (grapeVariety, origin).
 * 
 * ══════════════════════════════════════════
 * PRZEPŁYW DLA ELECTRON ADMIN:
 * ══════════════════════════════════════════
 * 
 * Electron → API PUT /products/:sku/wine-details
 *   → Zapisuje partial JSONB do products.wine_details
 *   → Frontend automatycznie merguje z catalogiem
 * 
 * Przykład: admin zmienia tylko "bodyValue" na 90:
 *   DB: { "bodyValue": 90 }
 *   Static catalog: { bodyValue: 85, tannins: 75, ... }
 *   Wynik: { bodyValue: 90, tannins: 75, ... }  ← 90 z DB, reszta statyczna
 */
export function getWineDetailsForProduct(product: {
  slug?: string;
  grapeVariety?: string;
  origin?: string;
  originCountry?: string;
  year?: string;
  wineDetails?: Record<string, unknown> | null;
}): WineDetails {
  // Layer 2: Static catalog (or layer 3 fallback)
  const staticData: WineDetails = (product.slug && wineDataCatalog[product.slug])
    ? { ...wineDataCatalog[product.slug] }
    : {
        ...defaultWineDetails,
        grape: product.grapeVariety || defaultWineDetails.grape,
        countryCode: getCountryCode(product.originCountry || product.origin || ""),
      };
  
  // Layer 1: DB override (partial merge from Electron admin)
  if (product.wineDetails && Object.keys(product.wineDetails).length > 0) {
    return deepMerge(staticData, product.wineDetails);
  }
  
  return staticData;
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
