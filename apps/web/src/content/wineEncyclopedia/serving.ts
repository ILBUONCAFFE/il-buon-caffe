// ============================================
// WINE ENCYCLOPEDIA - SERVING GUIDE
// ============================================

import { GlassType, ServingTemperature, DecantingGuide } from '@/types/wineEncyclopedia';

export const GLASS_TYPES: GlassType[] = [
  {
    id: 'bordeaux',
    name: 'Bordeaux Glass',
    namePl: 'Kieliszek Bordeaux',
    description: 'Wysoki, szeroki kieliszek z prostymi ściankami. Idealny dla pełnych, tanicznych win czerwonych - Cabernet Sauvignon, Merlot, Malbec.',
    bestFor: ['czerwone'],
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400',
      alt: 'Kieliszek Bordeaux',
    },
  },
  {
    id: 'burgundy',
    name: 'Burgundy Glass',
    namePl: 'Kieliszek Burgundzki',
    description: 'Szeroki, beczułkowaty kieliszek z zwężającym się brzegiem. Dla delikatniejszych, aromatycznych win - Pinot Noir, Nebbiolo.',
    bestFor: ['czerwone'],
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400',
      alt: 'Kieliszek Burgundzki',
    },
  },
  {
    id: 'white-universal',
    name: 'White Wine Glass',
    namePl: 'Kieliszek do Białego Wina',
    description: 'Mniejszy od kieliszków do czerwonego, z węższą czaszą zachowującą chłód i aromaty. Do większości win białych.',
    bestFor: ['białe', 'różowe'],
  },
  {
    id: 'chardonnay',
    name: 'Chardonnay Glass',
    namePl: 'Kieliszek do Chardonnay',
    description: 'Szerszy kieliszek dla pełnych, dojrzewanych w dębie win białych. Pozwala wydobyć złożoność i masłowe nuty.',
    bestFor: ['białe'],
  },
  {
    id: 'champagne-flute',
    name: 'Champagne Flute',
    namePl: 'Kieliszek Flute',
    description: 'Wąski, wysoki kieliszek utrzymujący bąbelki. Klasyczny wybór do szampana i win musujących.',
    bestFor: ['musujące'],
  },
  {
    id: 'champagne-tulip',
    name: 'Champagne Tulip',
    namePl: 'Kieliszek Tulipan',
    description: 'Kompromis między flute a szerokim kieliszkiem. Zachowuje bąbelki, ale pozwala lepiej ocenić aromaty premium Champagne.',
    bestFor: ['musujące'],
  },
  {
    id: 'dessert',
    name: 'Dessert Wine Glass',
    namePl: 'Kieliszek do Win Deserowych',
    description: 'Mniejszy kieliszek dla słodkich, intensywnych win. Mniejsza objętość podkreśla koncentrację smaków.',
    bestFor: ['słodkie', 'wzmacniane'],
  },
  {
    id: 'port',
    name: 'Port Glass',
    namePl: 'Kieliszek do Porto',
    description: 'Mały, wąski kieliszek koncentrujący aromaty. Dla win wzmacnianych: Porto, Sherry, Madeira.',
    bestFor: ['wzmacniane'],
  },
];

export const SERVING_TEMPERATURES: ServingTemperature[] = [
  {
    wineType: 'Szampan i wina musujące',
    minTemp: 6,
    maxTemp: 8,
    notes: 'Zimno podkreśla świeżość i przedłuża życie bąbelków',
  },
  {
    wineType: 'Lekkie wina białe (Sauvignon Blanc, Pinot Grigio)',
    minTemp: 7,
    maxTemp: 10,
    notes: 'Świeżość i mineralność w pełni',
  },
  {
    wineType: 'Pełne wina białe (Chardonnay z dębu)',
    minTemp: 10,
    maxTemp: 13,
    notes: 'Cieplejsza temperatura wydobywa maślaną teksturę',
  },
  {
    wineType: 'Wina różowe',
    minTemp: 8,
    maxTemp: 12,
    notes: 'Serwować schłodzone, ale nie lodowate',
  },
  {
    wineType: 'Lekkie wina czerwone (Beaujolais, Pinot Noir)',
    minTemp: 12,
    maxTemp: 14,
    notes: 'Lekkie schłodzenie podkreśla owocowość',
  },
  {
    wineType: 'Średnio pełne wina czerwone (Chianti, Merlot)',
    minTemp: 14,
    maxTemp: 16,
    notes: 'Temperatura piwnicy',
  },
  {
    wineType: 'Pełne wina czerwone (Barolo, Cabernet Sauvignon)',
    minTemp: 16,
    maxTemp: 18,
    notes: 'Zbyt ciepłe = alkohol dominuje, zbyt zimne = taniny szorstkie',
  },
  {
    wineType: 'Wina słodkie i deserowe',
    minTemp: 6,
    maxTemp: 10,
    notes: 'Chłód balansuje słodycz',
  },
  {
    wineType: 'Porto Vintage/LBV',
    minTemp: 14,
    maxTemp: 16,
    notes: 'Cieplejsze niż Porto Tawny',
  },
  {
    wineType: 'Porto Tawny',
    minTemp: 10,
    maxTemp: 14,
    notes: 'Można serwować lekko schłodzone',
  },
];

export const DECANTING_GUIDE: DecantingGuide[] = [
  {
    wineType: 'Młode taniczne czerwone (Barolo, Barbaresco, młode Bordeaux)',
    shouldDecant: true,
    duration: '1-2 godziny',
    reason: 'Napowietrzenie zmiękcza taniny i otwiera aromaty',
  },
  {
    wineType: 'Średnio dojrzałe czerwone (5-10 lat)',
    shouldDecant: true,
    duration: '30 min - 1 godzina',
    reason: 'Delikatne napowietrzenie, ostrożność z osadami',
  },
  {
    wineType: 'Stare czerwone (15+ lat)',
    shouldDecant: true,
    duration: 'Tuż przed podaniem',
    reason: 'Głównie separacja osadu, minimalny kontakt z powietrzem',
  },
  {
    wineType: 'Młode białe wina',
    shouldDecant: false,
    reason: 'Zbyt delikatne, stracą świeżość',
  },
  {
    wineType: 'Dojrzałe białe Burgundy',
    shouldDecant: true,
    duration: '15-30 minut',
    reason: 'Uwolnienie złożonych trzeciorzędowych aromatów',
  },
  {
    wineType: 'Vintage Port',
    shouldDecant: true,
    duration: '2-4 godziny',
    reason: 'Dużo osadów i zamknięte aromaty',
  },
  {
    wineType: 'Wina musujące',
    shouldDecant: false,
    reason: 'Absolutnie nie - stracą bąbelki!',
  },
];

export const OPENING_TECHNIQUES = {
  stillWine: {
    title: 'Otwieranie wina spokojnego',
    steps: [
      'Zdejmij folię/kapsel poniżej brzegu szyjki',
      'Wytryj szyjkę butelki',
      'Wbij korkociąg w środek korka',
      'Obracaj, nie wciskaj - korek powinien wyjść łagodnie',
      'Wytrzyj szyjkę ponownie przed nalewaniem',
    ],
  },
  sparklingWine: {
    title: 'Otwieranie wina musującego',
    steps: [
      'Schłodź butelkę do 6-8°C',
      'Zdejmij folię i koszyczek drucika',
      'Trzymaj kciukiem korek przez cały czas!',
      'Przechyl butelkę pod kątem 45°',
      'Obracaj butelkę (nie korek) - korek powinien wyjść z cichym "sssyk"',
      'Głośny strzał to strata CO₂ i szpan - unikaj!',
    ],
  },
  oldVintage: {
    title: 'Otwieranie starego rocznika',
    steps: [
      'Ustaw butelkę pionowo 24h przed otwarciem (osad osiądzie)',
      'Użyj dwuramiennego korkociągu typu "Ah-So"',
      'Otwieraj bardzo powoli - stare korki się kruszą',
      'Miej pod ręką sitko do ewentualnych okruchów',
      'Dekantuj ostrożnie, obserwując osad',
    ],
  },
};

export const WINE_STORAGE_TIPS = {
  shortTerm: {
    title: 'Przechowywanie krótkoterminowe (dni-tygodnie)',
    tips: [
      'Otwarte białe/różowe: 3-5 dni w lodówce z korkiem',
      'Otwarte czerwone: 3-5 dni w chłodnym miejscu z korkiem',
      'Użyj systemu próżniowego (Vacu Vin) do przedłużenia świeżości',
      'Wina musujące: specjalny korek bąbelkowy, max 1-2 dni',
    ],
  },
  longTerm: {
    title: 'Przechowywanie długoterminowe',
    tips: [
      'Temperatura: 10-14°C, stała',
      'Wilgotność: 60-70%',
      'Ciemność - UV niszczy wino',
      'Bez wibracji',
      'Butelki poziomo (naturalny korek) lub lekko nachylone',
    ],
  },
};
