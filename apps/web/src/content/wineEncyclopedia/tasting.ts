// ============================================
// WINE ENCYCLOPEDIA - TASTING GUIDE
// ============================================

import { TastingStep, AromaCategory, WineFault } from '@/types/wineEncyclopedia';

export const TASTING_STEPS: TastingStep[] = [
  {
    id: 'see',
    name: 'See',
    namePl: 'Obserwuj',
    order: 1,
    description: 'Oceń wygląd wina: kolor, klarowność i "łzy" spływające po kieliszku.',
    tips: [
      'Trzymaj kieliszek pod kątem 45° nad białym tłem',
      'Kolor czerwonego wina: fioletowy (młode) → rubin → granat → cegła (stare)',
      'Kolor białego wina: słomkowy → złoty → bursztynowy (stare)',
      '"Łzy" (nóżki) wskazują na zawartość alkoholu i gliceryny',
      'Zmętnienie może oznaczać wadę lub celowy brak filtracji',
    ],
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      alt: 'Obserwacja wina',
    },
  },
  {
    id: 'swirl',
    name: 'Swirl',
    namePl: 'Obracaj',
    order: 2,
    description: 'Delikatnie obracaj kieliszek, aby napowietrzyć wino i uwolnić aromaty.',
    tips: [
      'Ustaw kieliszek na stole i obracaj za podstawę',
      'Wystarczą 2-3 obroty',
      'Nie obracaj zbyt intensywnie - wino może się wylać',
      'Obserwuj, jak wino spływa po ściankach',
    ],
  },
  {
    id: 'sniff',
    name: 'Sniff',
    namePl: 'Wąchaj',
    order: 3,
    description: 'Oceń aromaty wina - najpierw bez obracania (nos I), potem po napowietrzeniu (nos II).',
    tips: [
      'Nos I: wąchaj bez obracania - pierwsze wrażenie',
      'Nos II: po obracaniu - pełniejszy bukiet',
      'Szukaj aromatów pierwszorzędowych (owocowe), drugorzędowych (fermentacja) i trzeciorzędowych (dojrzewanie)',
      'Zaufaj instynktowi - aromaty kojarzą się z doświadczeniami',
      'Sprawdź, czy nie ma wad (korek, ocet, siarka)',
    ],
    image: {
      url: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800',
      alt: 'Wąchanie wina',
    },
  },
  {
    id: 'sip',
    name: 'Sip',
    namePl: 'Kosztuj',
    order: 4,
    description: 'Weź łyk wina i pozwól mu pokryć całą jamę ustną, szukając smaków i struktury.',
    tips: [
      'Weź mały łyk (około łyżeczki)',
      'Przepuść powietrze przez wino (może być głośne!)',
      'Rozprowadź wino po całym podniebieniu',
      'Oceń: słodycz (czubek języka), kwasowość (boki), gorzycz/taniny (tył)',
      'Zwróć uwagę na teksturę i "ciało" wina',
    ],
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      alt: 'Degustacja wina',
    },
  },
  {
    id: 'savor',
    name: 'Savor',
    namePl: 'Smakuj',
    order: 5,
    description: 'Oceń finisz - posmak, który pozostaje po połknięciu lub wyplunięciu wina.',
    tips: [
      'Finisz może być krótki (<5 sek), średni (5-10 sek) lub długi (>10 sek)',
      'Dłuższy finisz zazwyczaj oznacza wyższą jakość',
      'Szukaj nowych aromatów pojawiających się w posmaku',
      'Oceń harmonię i równowagę całości',
      'Zastanów się, czy wino jest "kompletne" czy potrzebuje czasu',
    ],
  },
];

export const AROMA_CATEGORIES: AromaCategory[] = [
  {
    id: 'fruits-red',
    category: 'Red Fruits',
    categoryPl: 'Czerwone owoce',
    aromas: [
      { name: 'Cherry', namePl: 'Wiśnia', description: 'Typowy aromat Pinot Noir i Sangiovese' },
      { name: 'Raspberry', namePl: 'Malina' },
      { name: 'Strawberry', namePl: 'Truskawka' },
      { name: 'Cranberry', namePl: 'Żurawina' },
      { name: 'Red Currant', namePl: 'Czerwona porzeczka' },
    ],
  },
  {
    id: 'fruits-dark',
    category: 'Dark Fruits',
    categoryPl: 'Ciemne owoce',
    aromas: [
      { name: 'Blackberry', namePl: 'Jeżyna' },
      { name: 'Blackcurrant', namePl: 'Czarna porzeczka', description: 'Charakterystyczny dla Cabernet Sauvignon' },
      { name: 'Blueberry', namePl: 'Borówka' },
      { name: 'Plum', namePl: 'Śliwka' },
      { name: 'Fig', namePl: 'Figa' },
    ],
  },
  {
    id: 'fruits-citrus',
    category: 'Citrus Fruits',
    categoryPl: 'Cytrusy',
    aromas: [
      { name: 'Lemon', namePl: 'Cytryna' },
      { name: 'Lime', namePl: 'Limonka' },
      { name: 'Grapefruit', namePl: 'Grejpfrut', description: 'Typowy dla Sauvignon Blanc' },
      { name: 'Orange Zest', namePl: 'Skórka pomarańczy' },
    ],
  },
  {
    id: 'fruits-tropical',
    category: 'Tropical Fruits',
    categoryPl: 'Owoce tropikalne',
    aromas: [
      { name: 'Pineapple', namePl: 'Ananas' },
      { name: 'Mango', namePl: 'Mango' },
      { name: 'Passion Fruit', namePl: 'Marakuja' },
      { name: 'Lychee', namePl: 'Liczi', description: 'Charakterystyczny dla Gewürztraminer' },
    ],
  },
  {
    id: 'floral',
    category: 'Floral',
    categoryPl: 'Kwiatowe',
    aromas: [
      { name: 'Rose', namePl: 'Róża', description: 'Typowy dla Nebbiolo i Gewürztraminer' },
      { name: 'Violet', namePl: 'Fiołek', description: 'Częsty w Malbec i młodych winach' },
      { name: 'Jasmine', namePl: 'Jaśmin' },
      { name: 'Orange Blossom', namePl: 'Kwiat pomarańczy' },
      { name: 'Acacia', namePl: 'Akacja' },
    ],
  },
  {
    id: 'herbal',
    category: 'Herbal',
    categoryPl: 'Ziołowe',
    aromas: [
      { name: 'Mint', namePl: 'Mięta' },
      { name: 'Eucalyptus', namePl: 'Eukaliptus' },
      { name: 'Thyme', namePl: 'Tymianek' },
      { name: 'Oregano', namePl: 'Oregano' },
      { name: 'Lavender', namePl: 'Lawenda' },
    ],
  },
  {
    id: 'spice',
    category: 'Spice',
    categoryPl: 'Przyprawy',
    aromas: [
      { name: 'Black Pepper', namePl: 'Czarny pieprz', description: 'Typowy dla Syrah' },
      { name: 'Vanilla', namePl: 'Wanilia', description: 'Pochodzi z dębu' },
      { name: 'Cinnamon', namePl: 'Cynamon' },
      { name: 'Clove', namePl: 'Goździki' },
      { name: 'Licorice', namePl: 'Lukrecja' },
    ],
  },
  {
    id: 'oak',
    category: 'Oak',
    categoryPl: 'Dębowe',
    aromas: [
      { name: 'Toast', namePl: 'Tostowany chleb' },
      { name: 'Smoke', namePl: 'Dym' },
      { name: 'Coconut', namePl: 'Kokos', description: 'Pochodzi od dębu amerykańskiego' },
      { name: 'Cedar', namePl: 'Cedr' },
      { name: 'Coffee', namePl: 'Kawa' },
    ],
  },
  {
    id: 'earth',
    category: 'Earth',
    categoryPl: 'Ziemiste',
    aromas: [
      { name: 'Mushroom', namePl: 'Grzyby', description: 'Częste w dojrzałych Pinot Noir' },
      { name: 'Truffle', namePl: 'Trufa' },
      { name: 'Forest Floor', namePl: 'Podszyt leśny' },
      { name: 'Wet Stone', namePl: 'Mokry kamień' },
      { name: 'Leather', namePl: 'Skóra' },
    ],
  },
  {
    id: 'mineral',
    category: 'Mineral',
    categoryPl: 'Mineralne',
    aromas: [
      { name: 'Flint', namePl: 'Krzemień' },
      { name: 'Chalk', namePl: 'Kreda' },
      { name: 'Petrol', namePl: 'Nuta naftowa', description: 'Charakterystyczny dla dojrzałego Rieslinga' },
      { name: 'Saline', namePl: 'Sól morska' },
    ],
  },
];

export const WINE_FAULTS: WineFault[] = [
  {
    id: 'cork-taint',
    name: 'Cork Taint (TCA)',
    namePl: 'Korek (TCA)',
    cause: 'Związek chemiczny TCA (2,4,6-trichloroanizol) w korku naturalnym',
    detection: 'Zapach mokrego kartonu, stęchlizny, mokrego psa. Wino traci świeżość owocową.',
    prevention: 'Stosowanie korków syntetycznych lub zakrętek śrubowych',
  },
  {
    id: 'oxidation',
    name: 'Oxidation',
    namePl: 'Oksydacja',
    cause: 'Nadmierny kontakt z tlenem',
    detection: 'Brązowienie koloru, aromaty jabłek, orzechów, sherry. Utrata świeżości.',
    prevention: 'Prawidłowe przechowywanie, szczelne zamknięcie',
  },
  {
    id: 'volatile-acidity',
    name: 'Volatile Acidity',
    namePl: 'Lotna kwasowość',
    cause: 'Bakterie octowe przekształcające alkohol w kwas octowy',
    detection: 'Zapach octu lub rozpuszczalnika do paznokci',
    prevention: 'Higiena w winnicy i piwnicy',
  },
  {
    id: 'brettanomyces',
    name: 'Brettanomyces (Brett)',
    namePl: 'Brettanomyces',
    cause: 'Dzika drożdże Brettanomyces',
    detection: 'Zapachy stajni, potu końskiego, plastru, dymu. W niskich stężeniach może dodawać złożoności.',
    prevention: 'Ścisła higiena w piwnicy',
  },
  {
    id: 'reduction',
    name: 'Reduction',
    namePl: 'Redukcja',
    cause: 'Brak kontaktu z tlenem podczas winifikacji',
    detection: 'Zapachy siarki, zapałek, czosnku, kapusty',
    prevention: 'Często znika po dekantacji lub po kilku minutach w kieliszku',
  },
];

export const TASTING_GLOSSARY = {
  body: {
    light: 'Lekkie - wina o niskiej zawartości alkoholu i ekstraktu (np. Muscadet, Vinho Verde)',
    medium: 'Średnie - zbalansowana struktura (np. Chianti, Sauvignon Blanc)',
    full: 'Pełne - bogate, gęste, wysokoalkoholowe (np. Barolo, Amarone, Chardonnay z dębu)',
  },
  acidity: {
    low: 'Niska kwasowość - wina "płaskie", bez świeżości',
    medium: 'Średnia kwasowość - zbalansowane',
    high: 'Wysoka kwasowość - "ślinka cieknie", świeże, rześkie',
  },
  tannins: {
    low: 'Niskie taniny - miękkie, gładkie (Pinot Noir, Merlot)',
    medium: 'Średnie taniny - dobrze zintegrowane',
    high: 'Wysokie taniny - ściągające, szorstkie (młode Nebbiolo, Tannat)',
  },
  finish: {
    short: 'Krótki finisz - <5 sekund',
    medium: 'Średni finisz - 5-10 sekund',
    long: 'Długi finisz - >10 sekund, cecha wysokiej jakości',
  },
};
