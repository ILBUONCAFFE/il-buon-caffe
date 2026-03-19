// ============================================
// WINE ENCYCLOPEDIA - STORAGE GUIDE
// ============================================

import { StorageCondition, AgingPotential } from '@/types/wineEncyclopedia';

export const STORAGE_CONDITIONS: StorageCondition[] = [
  {
    factor: 'Temperatura',
    ideal: '10-14°C, stała',
    importance: 'Krytyczna - najważniejszy czynnik',
    consequences: 'Zbyt ciepło = przyspieszone starzenie, utrata świeżości. Zbyt zimno = spowolnienie dojrzewania. Wahania = rozszerzanie/kurczenie korka, wnikanie powietrza.',
  },
  {
    factor: 'Wilgotność',
    ideal: '60-70%',
    importance: 'Wysoka - szczególnie dla długoterminowego przechowywania',
    consequences: 'Zbyt sucho = korek wysycha, kurczy się, wpuszcza powietrze. Zbyt wilgotno = pleśń na etykietach.',
  },
  {
    factor: 'Światło',
    ideal: 'Ciemność, brak światła UV',
    importance: 'Wysoka',
    consequences: 'Światło UV degraduje wino, powoduje przedwczesne starzenie i nieprzyjemne aromaty ("goût de lumière").',
  },
  {
    factor: 'Wibracje',
    ideal: 'Brak wibracji',
    importance: 'Średnia',
    consequences: 'Wibracje mogą przyspieszać reakcje chemiczne i zaburzać osad.',
  },
  {
    factor: 'Pozycja butelki',
    ideal: 'Poziomo (korek naturalny) lub lekko nachylone',
    importance: 'Wysoka dla korka naturalnego',
    consequences: 'Korek musi być wilgotny od strony wina, by nie wysechł. Wina z zakrętką można przechowywać pionowo.',
  },
  {
    factor: 'Zapachy',
    ideal: 'Brak silnych zapachów',
    importance: 'Średnia',
    consequences: 'Korek może absorbować zapachy z otoczenia (farby, chemikalia, żywność).',
  },
];

export const AGING_POTENTIAL: AgingPotential[] = [
  {
    wineType: 'Wina białe proste (Pinot Grigio, Vinho Verde)',
    minYears: 0,
    maxYears: 2,
    peakYears: '6-18 miesięcy od zbiorów',
    notes: 'Pić młode, dla świeżości',
  },
  {
    wineType: 'Wina białe średniej klasy (Sauvignon Blanc, Albariño)',
    minYears: 1,
    maxYears: 3,
    notes: 'Zachowują przyjemną świeżość',
  },
  {
    wineType: 'Wina białe premium (Burgundy, Riesling Grand Cru)',
    minYears: 3,
    maxYears: 20,
    peakYears: '5-15 lat',
    notes: 'Rozwijają złożoność, miód, nuty trzeciorzędowe',
  },
  {
    wineType: 'Champagne Non-Vintage',
    minYears: 0,
    maxYears: 5,
    notes: 'Już dojrzałe w momencie degorgażu',
  },
  {
    wineType: 'Champagne Vintage / Prestige Cuvée',
    minYears: 3,
    maxYears: 20,
    peakYears: '10-15 lat',
    notes: 'Rozwijają nuty brioche, orzechów, kremu',
  },
  {
    wineType: 'Wina czerwone lekkie (Beaujolais, proste Merlot)',
    minYears: 0,
    maxYears: 3,
    notes: 'Pić młode dla owocowości',
  },
  {
    wineType: 'Wina czerwone średniej klasy (Chianti, Côtes du Rhône)',
    minYears: 2,
    maxYears: 7,
    peakYears: '3-5 lat',
  },
  {
    wineType: 'Wina czerwone premium (Bordeaux Cru Classé, Barolo)',
    minYears: 5,
    maxYears: 30,
    peakYears: '10-20 lat',
    notes: 'Wymagają cierpliwości, ale nagradzają złożonością',
  },
  {
    wineType: 'Burgundy Grand Cru (Pinot Noir)',
    minYears: 5,
    maxYears: 25,
    peakYears: '10-15 lat',
  },
  {
    wineType: 'Sauternes i wina botrytyzowane',
    minYears: 5,
    maxYears: 50,
    peakYears: '15-30 lat',
    notes: 'Praktycznie nieśmiertelne, rozwijają się dekadami',
  },
  {
    wineType: 'Vintage Port',
    minYears: 10,
    maxYears: 50,
    peakYears: '20-40 lat',
    notes: 'Wymaga dekantacji ze względu na osad',
  },
];

export const CELLAR_SETUP = {
  professional: {
    title: 'Piwniczka profesjonalna',
    description: 'Idealne warunki dla kolekcjonerów i długoterminowego przechowywania.',
    requirements: [
      'System klimatyzacji z kontrolą temperatury (10-14°C)',
      'Nawilżacz utrzymujący 60-70% wilgotności',
      'Brak okien lub światła UV',
      'Regały z drewna lub metalu (bez wibracji)',
      'Katalogowanie kolekcji',
    ],
    cost: 'Wysoki, ale zabezpiecza inwestycję',
  },
  cabinet: {
    title: 'Szafa klimatyzowana (wine cooler)',
    description: 'Praktyczna alternatywa dla mieszkań - jednolub wielostrefowa.',
    requirements: [
      'Kontrola temperatury (różne strefy dla białych/czerwonych)',
      'Ochrona UV (ciemne szkło)',
      'System antywibracyjny',
      'Pojemność: od 12 do 300+ butelek',
    ],
    cost: 'Średni (1500-15000 zł)',
  },
  improvised: {
    title: 'Rozwiązania domowe',
    description: 'Gdy brak miejsca na piwniczkę lub szafę.',
    tips: [
      'Szukaj najchłodniejszego miejsca w mieszkaniu (szafa w korytarzu, piwnica)',
      'Unikaj kuchni (wahania temperatury) i miejsc blisko okien',
      'Ciemna szafka lub karton chroniący przed światłem',
      'Nie przechowuj więcej niż rok-dwa',
    ],
  },
};

export const WINE_INVESTMENT_TIPS = {
  title: 'Wino jako inwestycja',
  intro: 'Niektóre wina zyskują na wartości z czasem, ale wymaga to odpowiedniej wiedzy i przechowywania.',
  tips: [
    {
      title: 'Kupuj od sprawdzonych źródeł',
      description: 'Provenance (historia przechowywania) ma kluczowe znaczenie dla wartości wina.',
    },
    {
      title: 'Inwestuj w klasyki',
      description: 'Bordeaux Premier Cru, Burgundia Grand Cru, rzadkie Champagne - sprawdzone inwestycje.',
    },
    {
      title: 'Przechowuj profesjonalnie',
      description: 'Wino bez udokumentowanych warunków przechowywania traci wartość.',
    },
    {
      title: 'Kupuj skrzynki (OWC)',
      description: 'Oryginalne drewniane skrzynki (Original Wooden Case) zwiększają wartość.',
    },
    {
      title: 'Śledź oceny krytyków',
      description: 'Parker 100, Suckling 100 - wina z najwyższymi ocenami szybko rosną.',
    },
  ],
  topInvestmentWines: [
    'Château Lafite Rothschild',
    'Château Mouton Rothschild',
    'Romanée-Conti',
    'Pétrus',
    'Screaming Eagle',
    'Domaine Leroy',
  ],
};
