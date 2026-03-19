// ============================================
// WINE ENCYCLOPEDIA - CLASSIFICATIONS
// ============================================

import { ClassificationSystem, PrestigeClassification } from '@/types/wineEncyclopedia';

export const CLASSIFICATION_SYSTEMS: ClassificationSystem[] = [
  {
    id: 'france-aoc',
    country: 'Francja',
    name: 'System Apelacji (AOC/AOP)',
    levels: [
      {
        level: 'AOP (Appellation d\'Origine Protégée)',
        description: 'Najwyższy poziom - ścisłe zasady dotyczące regionu, szczepów, uprawy i produkcji.',
        requirements: [
          'Winogrona z określonego obszaru',
          'Dopuszczone szczepy',
          'Maksymalne plony',
          'Minimalna zawartość alkoholu',
          'Metody produkcji',
        ],
      },
      {
        level: 'IGP (Indication Géographique Protégée)',
        description: 'Dawniej Vin de Pays - więcej swobody w doborze szczepów i metod.',
        requirements: [
          'Winogrona z szerszego regionu',
          'Większa elastyczność w doborze szczepów',
        ],
      },
      {
        level: 'Vin de France',
        description: 'Podstawowy poziom - wino francuskie bez określonego pochodzenia.',
        requirements: [
          'Winogrona z dowolnego miejsca we Francji',
          'Może podawać szczep i rocznik',
        ],
      },
    ],
    description: 'Francuski system ochrony pochodzenia, wzór dla całej Europy. Wprowadzony w 1935 roku.',
  },
  {
    id: 'italy-doc',
    country: 'Włochy',
    name: 'System DOC/DOCG',
    levels: [
      {
        level: 'DOCG (Denominazione di Origine Controllata e Garantita)',
        description: 'Najwyższy poziom - gwarancja pochodzenia i jakości, testowanie organoleptyczne.',
        requirements: [
          'Najbardziej prestiżowe regiony',
          'Państwowa degustacja każdej partii',
          'Banderola na szyjce butelki',
        ],
      },
      {
        level: 'DOC (Denominazione di Origine Controllata)',
        description: 'Gwarancja pochodzenia z określonego regionu.',
        requirements: [
          'Podobne do AOC francuskiego',
          'Określone szczepy i metody',
        ],
      },
      {
        level: 'IGT (Indicazione Geografica Tipica)',
        description: 'Elastyczny poziom - pozwala na innowacje (Super Toskany).',
        requirements: [
          'Szersze regiony',
          'Możliwość użycia nietradycyjnych szczepów',
        ],
      },
      {
        level: 'Vino',
        description: 'Podstawowy poziom - wino włoskie bez określonego pochodzenia.',
        requirements: [],
      },
    ],
    description: 'Włoski odpowiednik systemu francuskiego, z gwarancją jakości DOCG.',
  },
  {
    id: 'spain-do',
    country: 'Hiszpania',
    name: 'System DO/DOCa',
    levels: [
      {
        level: 'DOCa (Denominación de Origen Calificada)',
        description: 'Najwyższy poziom - tylko Rioja i Priorat.',
        requirements: [
          'Minimum 10 lat jako DO',
          'Ścisła kontrola jakości',
          'Butelkowanie w regionie',
        ],
      },
      {
        level: 'DO (Denominación de Origen)',
        description: 'Gwarancja pochodzenia z określonego regionu.',
        requirements: [
          'Określone szczepy i metody',
          'Consejo Regulador nadzoruje produkcję',
        ],
      },
      {
        level: 'Vino de la Tierra',
        description: 'Wino regionalne - więcej swobody.',
        requirements: [],
      },
    ],
    description: 'Hiszpański system z dodatkowymi klasyfikacjami wiekowymi (Crianza, Reserva, Gran Reserva).',
  },
  {
    id: 'germany-pradikat',
    country: 'Niemcy',
    name: 'System Prädikatswein',
    levels: [
      {
        level: 'Trockenbeerenauslese (TBA)',
        description: 'Najsłodsze - wyselekcjonowane, wysuszone przez botrytis winogrona.',
      },
      {
        level: 'Eiswein',
        description: 'Wino lodowe - winogrona zbierane zamrożone.',
      },
      {
        level: 'Beerenauslese (BA)',
        description: 'Słodkie - wyselekcjonowane przejrzałe winogrona.',
      },
      {
        level: 'Auslese',
        description: 'Wyselekcjonowane dojrzałe grona - od wytrawnych po słodkie.',
      },
      {
        level: 'Spätlese',
        description: 'Późny zbiór - bardziej dojrzałe winogrona.',
      },
      {
        level: 'Kabinett',
        description: 'Najlżejszy Prädikat - delikatne, często półwytrawne.',
      },
    ],
    description: 'System bazujący na dojrzałości winogron (zawartości cukru w momencie zbioru), nie na jakości per se.',
  },
];

export const SPANISH_AGING_CLASSIFICATIONS = {
  title: 'Hiszpańskie klasyfikacje wiekowe',
  description: 'Unikalne dla Hiszpanii oznaczenia określające minimalny czas dojrzewania.',
  levels: [
    {
      level: 'Joven (Vino Joven)',
      description: 'Młode wino, bez lub z krótkim kontaktem z dębem.',
      aging: 'Bez wymagań',
    },
    {
      level: 'Crianza',
      description: 'Minimum 24 miesiące dojrzewania, w tym 6 miesięcy w beczce.',
      aging: '24 miesiące (6 w dębie)',
    },
    {
      level: 'Reserva',
      description: 'Minimum 36 miesięcy dojrzewania, w tym 12 miesięcy w beczce.',
      aging: '36 miesięcy (12 w dębie)',
    },
    {
      level: 'Gran Reserva',
      description: 'Minimum 60 miesięcy dojrzewania, w tym 18 miesięcy w beczce. Tylko najlepsze roczniki.',
      aging: '60 miesięcy (18 w dębie)',
    },
  ],
};

export const PRESTIGE_CLASSIFICATIONS: PrestigeClassification[] = [
  {
    id: 'bordeaux-1855',
    name: 'Klasyfikacja Bordeaux 1855',
    region: 'Bordeaux, Francja',
    year: 1855,
    description: 'Historyczna klasyfikacja powstała na Wystawę Światową w Paryżu. Obejmuje Médoc, Graves (Haut-Brion) i Sauternes.',
    levels: [
      'Premier Cru (5 château: Lafite, Latour, Margaux, Haut-Brion, Mouton)',
      'Deuxième Cru (14 château)',
      'Troisième Cru (14 château)',
      'Quatrième Cru (10 château)',
      'Cinquième Cru (18 château)',
    ],
  },
  {
    id: 'burgundy-cru',
    name: 'Klasyfikacja Burgundzka',
    region: 'Burgundia, Francja',
    description: 'System oparty na "climats" - precyzyjnie wydzielonych parcelach o różnej jakości.',
    levels: [
      'Grand Cru - 33 najlepsze winnice, tylko 1% produkcji regionu',
      'Premier Cru - ponad 600 parcel, 10% produkcji',
      'Village - wina z konkretnej wioski',
      'Régionale (Bourgogne) - najbardziej podstawowe',
    ],
  },
  {
    id: 'saint-emilion',
    name: 'Klasyfikacja Saint-Émilion',
    region: 'Saint-Émilion, Bordeaux',
    year: 1955,
    description: 'W przeciwieństwie do 1855, ta klasyfikacja jest aktualizowana co 10 lat.',
    levels: [
      'Premier Grand Cru Classé A (Château Ausone, Cheval Blanc, Pavie, Angélus)',
      'Premier Grand Cru Classé B (14 château)',
      'Grand Cru Classé (64 château)',
    ],
  },
];

export const LABEL_READING_GUIDE = {
  title: 'Jak czytać etykietę wina',
  sections: [
    {
      element: 'Nazwa producenta / Château',
      description: 'Nazwa winnicy, producenta lub domu winiarskiego.',
      importance: 'Wysoka - wskaźnik stylu i jakości',
    },
    {
      element: 'Apelacja / Region',
      description: 'Kontrolowane miejsce pochodzenia (AOC, DOC, DO itp.)',
      importance: 'Bardzo wysoka - określa przepisy produkcji',
    },
    {
      element: 'Rocznik (Vintage)',
      description: 'Rok zbiorów winogron',
      importance: 'Zmienna - w niektórych regionach kluczowa (Bordeaux, Burgundia)',
    },
    {
      element: 'Szczep (Grape Variety)',
      description: 'Odmiana winogron. Nowy Świat zazwyczaj podaje, tradycyjna Europa często nie.',
      importance: 'Pomaga określić styl wina',
    },
    {
      element: 'Zawartość alkoholu (%)',
      description: 'Obowiązkowe. Wskazuje na ciężkość wina.',
      importance: 'Średnia - wyższa = pełniejsze wino',
    },
    {
      element: 'Klasyfikacja (Cru, Reserva itp.)',
      description: 'Dodatkowe oznaczenia jakości lub dojrzewania',
      importance: 'Wysoka w tradycyjnych regionach',
    },
    {
      element: 'Pojemność',
      description: 'Standardowa butelka: 750ml',
      importance: 'Niska',
    },
    {
      element: '"Mis en bouteille au château"',
      description: 'Butelkowane w posiadłości - wskaźnik jakości',
      importance: 'Średnia',
    },
  ],
};
