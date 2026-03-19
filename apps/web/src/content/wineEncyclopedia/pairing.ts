// ============================================
// WINE ENCYCLOPEDIA - FOOD PAIRING
// ============================================

import { FoodPairingRule, FoodPairingCategory } from '@/types/wineEncyclopedia';

export const PAIRING_RULES: FoodPairingRule[] = [
  {
    id: 'intensity-match',
    title: 'Zasada intensywności',
    description: 'Dopasuj intensywność wina do intensywności potrawy. Lekkie dania = lekkie wina, ciężkie dania = pełne wina.',
    examples: [
      'Sałatka z kozim serem → Sauvignon Blanc',
      'Grillowany stek → Cabernet Sauvignon',
      'Pasta z pesto → Vermentino',
    ],
  },
  {
    id: 'regionality',
    title: 'Zasada regionalności',
    description: 'Co rośnie razem, pasuje do siebie. Wina i potrawy z tego samego regionu często tworzą idealne pary.',
    examples: [
      'Chianti + bistecca alla fiorentina',
      'Muscadet + ostrygi z Bretanii',
      'Rioja + tapas i jamon',
    ],
  },
  {
    id: 'complement-contrast',
    title: 'Komplementarność vs kontrast',
    description: 'Możesz albo dopasować podobne smaki (komplementarność), albo stworzyć ciekawy kontrast.',
    examples: [
      'Komplementarność: Chardonnay z dębu + homary w maśle',
      'Kontrast: Sauternes (słodkie) + foie gras (tłuste, słone)',
      'Kontrast: Riesling (kwasowość) + pikantne curry',
    ],
  },
  {
    id: 'sauce-not-protein',
    title: 'Dobieraj wino do sosu, nie do mięsa',
    description: 'Sos często ma silniejszy wpływ na parowanie niż samo mięso. Kurczak w sosie śmietanowym wymaga innego wina niż kurczak z grilla.',
    examples: [
      'Kurczak w sosie pomidorowym → Chianti',
      'Kurczak w sosie śmietanowym → Chardonnay',
      'Kurczak z grilla z ziołami → Rosé',
    ],
  },
  {
    id: 'tanin-fat',
    title: 'Taniny kochają tłuszcz',
    description: 'Taniczne wina świetnie komponują się z tłustymi potrawami - tłuszcz zmiękcza taniny, a taniny "czyszczą" podniebienie.',
    examples: [
      'Barolo + brasato al Barolo',
      'Cabernet Sauvignon + ribeye steak',
      'Nebbiolo + trufa biała z masłem',
    ],
  },
  {
    id: 'acid-acid',
    title: 'Kwasowość vs kwasowość',
    description: 'Wino powinno być co najmniej tak kwaśne jak potrawa, inaczej będzie wydawać się płaskie.',
    examples: [
      'Sauvignon Blanc + sałatka z cytryną',
      'Sangiovese + pasta z pomidorami',
      'Riesling + ceviche',
    ],
  },
  {
    id: 'sweet-sweet',
    title: 'Wino słodsze niż deser',
    description: 'Do deserów wybierz wino słodsze niż samo danie, inaczej wino wyda się gorzkie.',
    examples: [
      'Sauternes + tarta jabłkowa',
      'Tokaji Aszú + ciasto z owocami',
      'Port Ruby + czekoladowy fondant',
    ],
  },
];

export const PAIRING_CATEGORIES: FoodPairingCategory[] = [
  {
    id: 'red-meat',
    category: 'Red Meat',
    categoryPl: 'Mięso czerwone',
    description: 'Wołowina, jagnięcina, dziczyzna - intensywne smaki wymagają pełnych, tanicznych win.',
    pairings: [
      {
        dish: 'Stek z grilla (ribeye, T-bone)',
        wineTypes: ['czerwone'],
        grapeVarieties: ['cabernet-sauvignon', 'malbec', 'syrah'],
        notes: 'Taniny "tną" tłuszcz, tworzą idealną harmonię',
      },
      {
        dish: 'Jagnięcina z rozmarynem',
        wineTypes: ['czerwone'],
        grapeVarieties: ['cabernet-sauvignon', 'tempranillo', 'nebbiolo'],
        specificWines: ['Rioja Reserva', 'Barolo'],
      },
      {
        dish: 'Dziczyzna (sarna, dzik)',
        wineTypes: ['czerwone'],
        grapeVarieties: ['syrah', 'nebbiolo', 'pinot-noir'],
        notes: 'Pinot Noir dla delikatniejszej dziczyzny, Syrah dla intensywniejszej',
      },
      {
        dish: 'Burger wołowy',
        wineTypes: ['czerwone'],
        grapeVarieties: ['malbec', 'syrah', 'sangiovese'],
        notes: 'Średnio pełne wina, niekoniecznie najdroższe',
      },
    ],
  },
  {
    id: 'poultry',
    category: 'Poultry',
    categoryPl: 'Drób',
    description: 'Kurczak, kaczka, indyk - wszechstronność pozwala na parowanie z białymi, różowymi i lekkimi czerwonymi.',
    pairings: [
      {
        dish: 'Pieczony kurczak z ziołami',
        wineTypes: ['białe', 'różowe', 'czerwone'],
        grapeVarieties: ['chardonnay', 'pinot-noir'],
        notes: 'Chardonnay bez dębu lub lekki Pinot Noir',
      },
      {
        dish: 'Kaczka z pomarańczą',
        wineTypes: ['czerwone'],
        grapeVarieties: ['pinot-noir', 'sangiovese'],
        notes: 'Owocowość wina komponuje się z sosem',
      },
      {
        dish: 'Indyk świąteczny',
        wineTypes: ['białe', 'czerwone'],
        grapeVarieties: ['chardonnay', 'pinot-noir', 'gewurztraminer'],
        notes: 'Gewürztraminer wyjątkowo z dodatkami jak żurawina',
      },
    ],
  },
  {
    id: 'seafood',
    category: 'Seafood',
    categoryPl: 'Ryby i owoce morza',
    description: 'Od delikatnych ryb po intensywne małże - parowaie zależy od sposobu przygotowania.',
    pairings: [
      {
        dish: 'Ostrygi na surowo',
        wineTypes: ['białe', 'musujące'],
        grapeVarieties: ['sauvignon-blanc'],
        specificWines: ['Muscadet', 'Chablis', 'Champagne Brut'],
        notes: 'Wysoką kwasowość i mineralność',
      },
      {
        dish: 'Łosoś pieczony',
        wineTypes: ['białe', 'czerwone'],
        grapeVarieties: ['chardonnay', 'pinot-noir'],
        notes: 'Tłustość łososia pozwala na lekkie czerwone',
      },
      {
        dish: 'Krewetki z czosnkiem',
        wineTypes: ['białe', 'różowe'],
        grapeVarieties: ['sauvignon-blanc', 'viognier'],
        specificWines: ['Côtes de Provence Rosé'],
      },
      {
        dish: 'Homary w maśle',
        wineTypes: ['białe'],
        grapeVarieties: ['chardonnay'],
        notes: 'Chardonnay z dębu - masło + masło = idealne',
      },
    ],
  },
  {
    id: 'pasta-pizza',
    category: 'Pasta & Pizza',
    categoryPl: 'Pasta i pizza',
    description: 'Klasyki włoskiej kuchni - dobieraj wino do sosu, nie do samego makaronu.',
    pairings: [
      {
        dish: 'Pasta z pomidorami (marinara, arrabiata)',
        wineTypes: ['czerwone'],
        grapeVarieties: ['sangiovese'],
        specificWines: ['Chianti Classico', 'Montepulciano d\'Abruzzo'],
      },
      {
        dish: 'Pasta carbonara/alfredo',
        wineTypes: ['białe'],
        grapeVarieties: ['chardonnay'],
        notes: 'Kremowość sosu wymaga pełnego białego',
      },
      {
        dish: 'Pizza margherita',
        wineTypes: ['czerwone', 'różowe'],
        grapeVarieties: ['sangiovese'],
        specificWines: ['Chianti', 'Montepulciano'],
      },
      {
        dish: 'Lasagne bolognese',
        wineTypes: ['czerwone'],
        grapeVarieties: ['sangiovese', 'nebbiolo'],
        specificWines: ['Chianti Riserva', 'Barbaresco'],
      },
    ],
  },
  {
    id: 'cheese',
    category: 'Cheese',
    categoryPl: 'Sery',
    description: 'Sery to świetni partnerzy dla wina, ale różne style serów wymagają różnych win.',
    pairings: [
      {
        dish: 'Ser kozi świeży (chèvre)',
        wineTypes: ['białe'],
        grapeVarieties: ['sauvignon-blanc'],
        specificWines: ['Sancerre', 'Pouilly-Fumé'],
        notes: 'Klasyczne regionalne połączenie',
      },
      {
        dish: 'Brie, Camembert',
        wineTypes: ['białe', 'musujące'],
        grapeVarieties: ['chardonnay'],
        specificWines: ['Champagne', 'Burgundy białe'],
      },
      {
        dish: 'Parmezan (Parmigiano Reggiano)',
        wineTypes: ['czerwone'],
        grapeVarieties: ['sangiovese', 'nebbiolo'],
        specificWines: ['Amarone', 'Barolo'],
      },
      {
        dish: 'Blue cheese (Roquefort, Gorgonzola)',
        wineTypes: ['słodkie', 'wzmacniane'],
        specificWines: ['Sauternes', 'Port', 'Tokaji'],
        notes: 'Słodycz wina balansuje słoność sera',
      },
    ],
  },
  {
    id: 'desserts',
    category: 'Desserts',
    categoryPl: 'Desery',
    description: 'Zasada kardynalna: wino musi być słodsze niż deser.',
    pairings: [
      {
        dish: 'Czekoladowy fondant',
        wineTypes: ['wzmacniane', 'słodkie'],
        specificWines: ['Port Ruby', 'Banyuls', 'Maury'],
      },
      {
        dish: 'Crème brûlée',
        wineTypes: ['słodkie'],
        specificWines: ['Sauternes', 'Tokaji Aszú'],
      },
      {
        dish: 'Tarta owocowa',
        wineTypes: ['słodkie', 'musujące'],
        specificWines: ['Moscato d\'Asti', 'Late Harvest Riesling'],
      },
      {
        dish: 'Tiramisu',
        wineTypes: ['słodkie', 'wzmacniane'],
        specificWines: ['Vin Santo', 'Marsala'],
        notes: 'Włoskie desery z włoskimi winami',
      },
    ],
  },
  {
    id: 'asian',
    category: 'Asian Cuisine',
    categoryPl: 'Kuchnia azjatycka',
    description: 'Pikantność i złożoność kuchni azjatyckiej wymaga aromatycznych, często półsłodkich win.',
    pairings: [
      {
        dish: 'Sushi i sashimi',
        wineTypes: ['białe', 'musujące'],
        grapeVarieties: ['riesling', 'sauvignon-blanc'],
        specificWines: ['Champagne', 'Chablis'],
        notes: 'Minimalistyczne, świeże wina',
      },
      {
        dish: 'Thai curry (czerwone/zielone)',
        wineTypes: ['białe'],
        grapeVarieties: ['riesling', 'gewurztraminer'],
        notes: 'Półwytrawny Riesling balansuje pikantność',
      },
      {
        dish: 'Pekin duck',
        wineTypes: ['czerwone'],
        grapeVarieties: ['pinot-noir'],
        specificWines: ['Burgundy Rouge'],
      },
      {
        dish: 'Dim sum',
        wineTypes: ['białe', 'musujące'],
        grapeVarieties: ['riesling'],
        specificWines: ['Prosecco', 'Crémant'],
      },
    ],
  },
];

export const OCCASION_PAIRINGS = {
  romanticDinner: {
    title: 'Kolacja romantyczna',
    suggestions: [
      { wine: 'Champagne Rosé', reason: 'Elegancja i celebracja' },
      { wine: 'Burgundy Rouge (Volnay, Chambolle-Musigny)', reason: 'Delikatność i romantyzm' },
      { wine: 'Barolo', reason: 'Dla impresji i głębi' },
    ],
  },
  bbqParty: {
    title: 'Grill / BBQ',
    suggestions: [
      { wine: 'Malbec argentyński', reason: 'Stworzony do grillowanego mięsa' },
      { wine: 'Zinfandel kalifornijski', reason: 'Owocowość i przyprawy' },
      { wine: 'Côtes du Rhône', reason: 'Przystępny, uniwersalny' },
    ],
  },
  holiday: {
    title: 'Święta i celebracje',
    suggestions: [
      { wine: 'Champagne', reason: 'Klasyka celebracji' },
      { wine: 'Amarone', reason: 'Bogactwo na zimowe wieczory' },
      { wine: 'Tokaji Aszú', reason: 'Do deserów świątecznych' },
    ],
  },
  aperitif: {
    title: 'Aperitif',
    suggestions: [
      { wine: 'Prosecco', reason: 'Lekki, orzeźwiający start' },
      { wine: 'Sherry Fino/Manzanilla', reason: 'Wyrafinowany, pobudzający apetyt' },
      { wine: 'Champagne Brut', reason: 'Klasyczny wybór' },
    ],
  },
};
