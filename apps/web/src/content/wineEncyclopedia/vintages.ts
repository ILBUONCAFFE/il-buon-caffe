// ============================================
// WINE ENCYCLOPEDIA - VINTAGES
// ============================================

import { VintageChart, VintageRating } from '@/types/wineEncyclopedia';

// Rating scale: 1=Poor, 2=Below Average, 3=Good, 4=Very Good, 5=Exceptional

export const VINTAGE_CHARTS: VintageChart[] = [
  {
    regionId: 'bordeaux-red',
    regionName: 'Bordeaux (Czerwone)',
    vintages: [
      { year: 2022, rating: 5, notes: 'Wyjątkowy rocznik - upał, ale dojrzałe taniny', drinkingWindow: { start: 2027, end: 2055 } },
      { year: 2021, rating: 3, notes: 'Trudny rocznik, lżejsze wina', drinkingWindow: { start: 2024, end: 2035 } },
      { year: 2020, rating: 5, notes: 'Klasyczny, elegancki rocznik porównywalny z 2019', drinkingWindow: { start: 2026, end: 2055 } },
      { year: 2019, rating: 5, notes: 'Spektakularny - głębia i świeżość', drinkingWindow: { start: 2025, end: 2055 } },
      { year: 2018, rating: 5, notes: 'Potężny, słoneczny rocznik', drinkingWindow: { start: 2025, end: 2050 } },
      { year: 2017, rating: 3, notes: 'Mróz zredukował plony, różna jakość', drinkingWindow: { start: 2023, end: 2035 } },
      { year: 2016, rating: 5, notes: 'Idealny rocznik - balans i elegancja', drinkingWindow: { start: 2026, end: 2060 } },
      { year: 2015, rating: 5, notes: 'Wspaniały, ciepły rocznik', drinkingWindow: { start: 2023, end: 2050 } },
      { year: 2014, rating: 3, notes: 'Dobry, nie wybitny', drinkingWindow: { start: 2020, end: 2035 } },
      { year: 2010, rating: 5, notes: 'Jeden z najlepszych roczników XXI wieku', drinkingWindow: { start: 2022, end: 2060 } },
      { year: 2009, rating: 5, notes: 'Bogaty, hedonistyczny styl', drinkingWindow: { start: 2020, end: 2050 } },
      { year: 2005, rating: 5, notes: 'Klasyczny, strukturalny rocznik', drinkingWindow: { start: 2018, end: 2055 } },
      { year: 2000, rating: 4, notes: 'Milenijny rocznik - bardzo dobry', drinkingWindow: { start: 2010, end: 2040 } },
    ],
  },
  {
    regionId: 'burgundy-red',
    regionName: 'Burgundia (Pinot Noir)',
    vintages: [
      { year: 2022, rating: 4, notes: 'Upał, ale udane wina', drinkingWindow: { start: 2027, end: 2045 } },
      { year: 2021, rating: 4, notes: 'Klasyczny, świeży styl', drinkingWindow: { start: 2025, end: 2040 } },
      { year: 2020, rating: 5, notes: 'Wybitny - koncentracja i elegancja', drinkingWindow: { start: 2026, end: 2050 } },
      { year: 2019, rating: 5, notes: 'Świetny rocznik, dojrzałe owoce', drinkingWindow: { start: 2025, end: 2045 } },
      { year: 2018, rating: 4, notes: 'Słoneczny, ciepły styl', drinkingWindow: { start: 2024, end: 2040 } },
      { year: 2017, rating: 3, notes: 'Mróz zniszczył część upraw', drinkingWindow: { start: 2022, end: 2032 } },
      { year: 2016, rating: 4, notes: 'Mały rocznik, dobra jakość', drinkingWindow: { start: 2023, end: 2038 } },
      { year: 2015, rating: 5, notes: 'Klasyczny, pełny rocznik', drinkingWindow: { start: 2022, end: 2045 } },
      { year: 2010, rating: 5, notes: 'Najlepszy od dekady', drinkingWindow: { start: 2018, end: 2045 } },
      { year: 2005, rating: 5, notes: 'Legendarny rocznik', drinkingWindow: { start: 2015, end: 2045 } },
    ],
  },
  {
    regionId: 'burgundy-white',
    regionName: 'Burgundia (Chardonnay)',
    vintages: [
      { year: 2022, rating: 4, notes: 'Bardzo dojrzałe, bogate wina' },
      { year: 2021, rating: 4, notes: 'Klasyczny styl z dobrą kwasowością' },
      { year: 2020, rating: 5, notes: 'Wybitna kombinacja dojrzałości i świeżości' },
      { year: 2019, rating: 5, notes: 'Bogaty, słoneczny rocznik' },
      { year: 2018, rating: 4, notes: 'Pełne, ciepły styl' },
      { year: 2017, rating: 5, notes: 'Świeży, elegancki - bardzo udany pomimo mrozów' },
      { year: 2014, rating: 5, notes: 'Klasyczny rocznik - równowaga i długowieczność' },
    ],
  },
  {
    regionId: 'champagne',
    regionName: 'Szampania',
    vintages: [
      { year: 2019, rating: 4, notes: 'Ciepły rocznik, dojrzałe owoce' },
      { year: 2018, rating: 4, notes: 'Słoneczny, ale zbalansowany' },
      { year: 2016, rating: 4, notes: 'Klasyczny, elegancki Champagne' },
      { year: 2015, rating: 4, notes: 'Bogaty, pełny styl' },
      { year: 2012, rating: 5, notes: 'Wybitny rocznik - głębia i finezja' },
      { year: 2008, rating: 5, notes: 'Legendarny - świeżość i kompleksowość' },
      { year: 2002, rating: 5, notes: 'Klasyczny milezymowy Champagne' },
    ],
  },
  {
    regionId: 'piedmont',
    regionName: 'Piemont (Barolo, Barbaresco)',
    vintages: [
      { year: 2022, rating: 3, notes: 'Grad i susza - trudny rok' },
      { year: 2021, rating: 4, notes: 'Klasyczny styl, dobra kwasowość' },
      { year: 2020, rating: 5, notes: 'Wybitny - balans i elegancja' },
      { year: 2019, rating: 4, notes: 'Ciepły, ale udany' },
      { year: 2018, rating: 3, notes: 'Dużo deszczu, różna jakość' },
      { year: 2017, rating: 4, notes: 'Skąpy rocznik, skoncentrowane wina' },
      { year: 2016, rating: 5, notes: 'Spektakularny - porównywalny z 2010' },
      { year: 2015, rating: 4, notes: 'Słoneczny, pełny styl' },
      { year: 2014, rating: 4, notes: 'Świeży, klasyczny Nebbiolo' },
      { year: 2013, rating: 4, notes: 'Solidny rocznik' },
      { year: 2010, rating: 5, notes: 'Legendarny - potęga i elegancja' },
    ],
  },
  {
    regionId: 'tuscany',
    regionName: 'Toskania (Brunello, Chianti Classico)',
    vintages: [
      { year: 2022, rating: 3, notes: 'Upał i susza' },
      { year: 2021, rating: 4, notes: 'Klasyczny styl' },
      { year: 2020, rating: 4, notes: 'Ciepły, dojrzały' },
      { year: 2019, rating: 5, notes: 'Wybitny rocznik dla Brunello' },
      { year: 2016, rating: 5, notes: 'Świetny dla Brunello' },
      { year: 2015, rating: 5, notes: 'Doskonały - głębia i balans' },
      { year: 2010, rating: 5, notes: 'Klasyczny, strukturalny rocznik Brunello' },
    ],
  },
  {
    regionId: 'rioja',
    regionName: 'Rioja',
    vintages: [
      { year: 2022, rating: 3, notes: 'Susza' },
      { year: 2021, rating: 4, notes: 'Klasyczny rok' },
      { year: 2020, rating: 5, notes: 'Wybitny - świeżość i głębia' },
      { year: 2019, rating: 4, notes: 'Bardzo dobry' },
      { year: 2018, rating: 4, notes: 'Udany, ciepły rok' },
      { year: 2017, rating: 4, notes: 'Świeży i elegancki' },
      { year: 2016, rating: 4, notes: 'Klasyczny styl Rioja' },
      { year: 2015, rating: 4, notes: 'Pełny, dojrzały' },
      { year: 2010, rating: 5, notes: 'Wybitny - długowieczny' },
      { year: 2005, rating: 5, notes: 'Klasyczny rocznik' },
      { year: 2001, rating: 5, notes: 'Świetny rocznik Gran Reserva' },
    ],
  },
  {
    regionId: 'port',
    regionName: 'Porto Vintage',
    vintages: [
      { year: 2022, rating: 3, notes: 'Nie deklarowany' },
      { year: 2021, rating: 3, notes: 'Nie deklarowany' },
      { year: 2020, rating: 3, notes: 'Nie deklarowany' },
      { year: 2019, rating: 3, notes: 'Nie deklarowany' },
      { year: 2018, rating: 3, notes: 'Nie deklarowany' },
      { year: 2017, rating: 5, notes: 'Deklarowany - klasyczny rocznik' },
      { year: 2016, rating: 5, notes: 'Deklarowany - wybitny' },
      { year: 2011, rating: 5, notes: 'Deklarowany - bardzo udany' },
      { year: 2007, rating: 4, notes: 'Częściowo deklarowany' },
      { year: 2003, rating: 5, notes: 'Deklarowany' },
      { year: 2000, rating: 5, notes: 'Deklarowany - milenijny' },
    ],
  },
];

export const VINTAGE_IMPORTANCE = {
  title: 'Znaczenie rocznika',
  content: `
    <p>Rocznik to rok, w którym winogrona zostały zebrane. Warunki pogodowe w danym roku 
    mają ogromny wpływ na jakość i styl wina.</p>
    
    <h3>Kiedy rocznik ma znaczenie</h3>
    <ul>
      <li><strong>Regiony o zmiennym klimacie</strong> - Bordeaux, Burgundia, Szampania, 
      północne Włochy. Różnice między rocznikami mogą być dramatyczne.</li>
      <li><strong>Wina o potencjale do leżakowania</strong> - rocznik wpływa na to, 
      kiedy wino osiągnie szczyt.</li>
      <li><strong>Wina kolekcjonerskie</strong> - wartość inwestycyjna zależy od rocznika.</li>
    </ul>
    
    <h3>Kiedy rocznik ma mniejsze znaczenie</h3>
    <ul>
      <li><strong>Regiony o stałym klimacie</strong> - większość Nowego Świata 
      (California, Australia, Chile) ma stabilniejsze warunki.</li>
      <li><strong>Wina do picia młodych</strong> - Prosecco, Vinho Verde, proste wina dzienne.</li>
      <li><strong>Champagne Non-Vintage</strong> - blend wielu roczników dla konsekwentnego stylu.</li>
    </ul>
  `,
};

export const getVintageChart = (regionId: string): VintageChart | undefined => {
  return VINTAGE_CHARTS.find((chart) => chart.regionId === regionId);
};

export const getVintageRating = (regionId: string, year: number): VintageRating | undefined => {
  const chart = VINTAGE_CHARTS.find((c) => c.regionId === regionId);
  return chart?.vintages.find((v) => v.year === year);
};
