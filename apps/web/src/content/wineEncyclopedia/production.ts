// ============================================
// WINE ENCYCLOPEDIA - PRODUCTION PROCESS
// ============================================

import { ProductionStep, SpecialMethod } from '@/types/wineEncyclopedia';

export const PRODUCTION_STEPS: ProductionStep[] = [
  {
    id: 'harvest',
    order: 1,
    name: 'Harvest',
    namePl: 'Zbiory',
    description: 'Moment zbiorów to kluczowa decyzja. Winogrona muszą osiągnąć idealną dojrzałość - balans cukrów, kwasów i fenoli.',
    duration: '2-4 tygodnie (zależnie od regionu i odmiany)',
    variations: [
      { method: 'Zbiór ręczny', description: 'Droższy, ale precyzyjny - selekcja zdrowych gron, wymagany dla win musujących.' },
      { method: 'Zbiór mechaniczny', description: 'Szybszy i tańszy, używany dla dużych wolumenów.' },
    ],
  },
  {
    id: 'sorting',
    order: 2,
    name: 'Sorting',
    namePl: 'Sortowanie',
    description: 'Selekcja zdrowych gron, usuwanie liści, niedojrzałych i zepsutych winogron.',
    variations: [
      { method: 'Stół sortowniczy', description: 'Ręczna selekcja na taśmie.' },
      { method: 'Sortowanie optyczne', description: 'Nowoczesne lasery i kamery sortują winogrona.' },
    ],
  },
  {
    id: 'destemming-crushing',
    order: 3,
    name: 'Destemming & Crushing',
    namePl: 'Odszypułkowanie i zgniatanie',
    description: 'Winogrona są oddzielane od szypułek i delikatnie rozbijane, by uwolnić sok.',
    variations: [
      { method: 'Whole cluster', description: 'Część producentów (Burgundia) fermentuje z szypułkami dla dodatkowej struktury.' },
      { method: 'Foot treading', description: 'Tradycyjne deptanie winogron (Porto) - bardzo delikatne.' },
    ],
  },
  {
    id: 'maceration',
    order: 4,
    name: 'Maceration',
    namePl: 'Maceracja',
    description: 'Kontakt soku ze skórkami. Dla win czerwonych trwa dni-tygodnie (ekstrakcja koloru, tanin), dla białych może być krótka lub żadna.',
    duration: 'Białe: 0-24h | Czerwone: 5-30 dni | Pomarańczowe: tygodnie-miesiące',
    variations: [
      { method: 'Cold maceration', description: 'Przed fermentacją, w niskiej temperaturze - ekstrakcja aromatów.' },
      { method: 'Extended maceration', description: 'Po fermentacji - zmiękczenie tanin.' },
    ],
  },
  {
    id: 'fermentation',
    order: 5,
    name: 'Alcoholic Fermentation',
    namePl: 'Fermentacja alkoholowa',
    description: 'Drożdże przekształcają cukry w alkohol i CO₂. Temperatura i typ drożdży wpływają na profil aromatyczny.',
    duration: '1-4 tygodnie',
    variations: [
      { method: 'Drożdże kultywowane', description: 'Kontrola, przewidywalność, specyficzne profile.' },
      { method: 'Drożdże dzikie (natural)', description: 'Większa złożoność, ale ryzyko wad.' },
    ],
  },
  {
    id: 'pressing',
    order: 6,
    name: 'Pressing',
    namePl: 'Tłoczenie',
    description: 'Oddzielenie wina od stałych części (skórek, nasion). Prasa pneumatyczna jest delikatniejsza niż stara prasa koszowa.',
    variations: [
      { method: 'Free-run wine', description: 'Wino spływające bez tłoczenia - najwyższa jakość.' },
      { method: 'Press wine', description: 'Wino z tłoczenia - więcej tanin i ekstrakcji.' },
    ],
  },
  {
    id: 'malolactic',
    order: 7,
    name: 'Malolactic Fermentation',
    namePl: 'Fermentacja malolaktyczna',
    description: 'Bakterie przekształcają ostry kwas jabłkowy w łagodny kwas mlekowy. Obowiązkowe dla czerwonych, opcjonalne dla białych.',
    variations: [
      { method: 'Pełna MLF', description: 'Maślany charakter (Chardonnay burgundzkie).' },
      { method: 'Blokowana MLF', description: 'Zachowanie świeżości (Sauvignon Blanc, Riesling).' },
    ],
  },
  {
    id: 'aging',
    order: 8,
    name: 'Aging / Maturation',
    namePl: 'Dojrzewanie',
    description: 'Wino może dojrzewać w stali nierdzewnej (zachowanie świeżości), dębie (dodanie tonów wanilii, przypraw) lub butelce.',
    duration: 'Od kilku miesięcy do wielu lat',
    variations: [
      { method: 'Stal nierdzewna', description: 'Neutralna, zachowuje owocowość.' },
      { method: 'Dąb francuski', description: 'Eleganckie taniny, wanilia, przyprawy.' },
      { method: 'Dąb amerykański', description: 'Intensywniejsze nuty kokosa i wanilii.' },
      { method: 'Beczki używane', description: 'Mniejszy wpływ dębu, subtelniejsza integracja.' },
    ],
  },
  {
    id: 'fining-filtration',
    order: 9,
    name: 'Fining & Filtration',
    namePl: 'Klarowanie i filtracja',
    description: 'Usuwanie zmętnień i cząstek stałych dla stabilności i klarowności wina.',
    variations: [
      { method: 'Fining', description: 'Dodanie środków klarujących (bentonit, białko jaja) wiążących zmętnienia.' },
      { method: 'Filtration', description: 'Fizyczne przesączanie.' },
      { method: 'Unfined/Unfiltered', description: 'Wina naturalne często pomijają ten krok.' },
    ],
  },
  {
    id: 'bottling',
    order: 10,
    name: 'Bottling',
    namePl: 'Butelkowanie',
    description: 'Wino jest przelewane do butelek i zamykane korkiem, zakrętką lub kapslami.',
    variations: [
      { method: 'Korek naturalny', description: 'Tradycja, oddychanie, ryzyko TCA.' },
      { method: 'Zakrętka śrubowa', description: 'Zero ryzyka TCA, idealne dla win pijanych młodych.' },
      { method: 'Korek syntetyczny', description: 'Kompromis - brak TCA, mniejszy oddech.' },
    ],
  },
];

export const SPECIAL_METHODS: SpecialMethod[] = [
  {
    id: 'traditional-method',
    name: 'Traditional Method',
    namePl: 'Metoda Tradycyjna (Champenoise)',
    description: 'Druga fermentacja w butelce, nadająca trwałe bąbelki i nuty drożdżowe.',
    usedFor: ['Champagne', 'Cava', 'Franciacorta', 'Crémant'],
    process: [
      'Pierwsza fermentacja → wino bazowe',
      'Assemblage (blend) różnych win i roczników',
      'Dodanie tirage (drożdże + cukier) do butelki',
      'Druga fermentacja w butelce → CO₂ rozpuszcza się w winie',
      'Leżakowanie na osadzie (sur lie) - od 15 miesięcy do wielu lat',
      'Remuage - obracanie butelek, by osad zebrał się w szyjce',
      'Dégorgement - zamrożenie szyjki i usunięcie osadu',
      'Dosage - dodanie płynu uzupełniającego (likier de expedition)',
    ],
  },
  {
    id: 'charmat-method',
    name: 'Charmat Method (Tank Method)',
    namePl: 'Metoda Charmat',
    description: 'Druga fermentacja w zbiornikach ciśnieniowych - szybsza i tańsza.',
    usedFor: ['Prosecco', 'Lambrusco', 'większość niedrogich musujących'],
    process: [
      'Pierwsza fermentacja → wino bazowe',
      'Druga fermentacja w dużym zbiorniku ciśnieniowym',
      'Filtracja i butelkowanie pod ciśnieniem',
    ],
  },
  {
    id: 'carbonic-maceration',
    name: 'Carbonic Maceration',
    namePl: 'Maceracja Węglowa',
    description: 'Całe, nierozdrobnione winogrona fermentują w środowisku CO₂ - daje bardzo owocowe, mało taniczne wina.',
    usedFor: ['Beaujolais Nouveau', 'Beaujolais Villages'],
    process: [
      'Całe grona umieszczane w kadzi wypełnionej CO₂',
      'Fermentacja wewnątrzkomórkowa (w skórce)',
      'Intensywne aromaty bananów, gumy do żucia, truskawek',
      'Minimalne taniny',
    ],
  },
  {
    id: 'appassimento',
    name: 'Appassimento (Passito)',
    namePl: 'Appassimento',
    description: 'Suszenie winogron przed fermentacją dla koncentracji cukrów i smaków.',
    usedFor: ['Amarone della Valpolicella', 'Recioto', 'Vin Santo', 'Sforzato'],
    process: [
      'Zbiór dojrzałych winogron',
      'Suszenie na słomianych matach przez 3-4 miesiące',
      'Utrata 30-40% masy (woda) = koncentracja',
      'Fermentacja skoncentrowanego moszczu',
      'Wina o wysokim alkoholu, głębi i słodycz (lub wytrawne jak Amarone)',
    ],
  },
  {
    id: 'botrytis',
    name: 'Botrytis (Noble Rot)',
    namePl: 'Botrytis (Szlachetna Pleśń)',
    description: 'Grzyb Botrytis cinerea w idealnych warunkach koncentruje cukry i aromaty, tworząc najszlachetniejsze wina słodkie.',
    usedFor: ['Sauternes', 'Tokaji Aszú', 'Trockenbeerenauslese (TBA)'],
    process: [
      'Wilgotne poranki + suche popołudnia = warunki dla botrytis',
      'Grzyb perforuje skórkę → odparowanie wody',
      'Koncentracja cukrów do 300-400 g/l',
      'Winogrona wyglądają jak rodzynki',
      'Zbiór selekcyjny (wiele przejść przez winnicę)',
      'Fermentacja do wysokiego cukru resztkowego',
    ],
  },
  {
    id: 'ice-wine',
    name: 'Ice Wine (Eiswein)',
    namePl: 'Wino Lodowe',
    description: 'Winogrona zamarzają naturalnie na winorośli, koncentrując cukry i kwasy.',
    usedFor: ['Eiswein (Niemcy, Austria)', 'Icewine (Kanada)'],
    process: [
      'Winogrona pozostają na winorośli do zimy',
      'Zbiór przy temperaturze -7°C lub niższej',
      'Tłoczenie zamrożonych winogron',
      'Woda zamarzła w kryształki, wyciska się skoncentrowany sok',
      'Bardzo niskie plony, wysoka cena',
    ],
  },
  {
    id: 'solera',
    name: 'Solera System',
    namePl: 'System Solera',
    description: 'Dynamiczny system dojrzewania stosowany w produkcji Sherry, zapewniający konsekwentny styl przez dziesięciolecia.',
    usedFor: ['Sherry', 'Marsala', 'niektóre Porto Tawny'],
    process: [
      'Beczki ułożone w rzędy (criaderas) według wieku',
      'Najstarsze wino (dolny rząd = solera) częściowo butelkowane',
      'Uzupełniane młodszym winem z wyższych rzędów',
      'Cykl powtarzany co kilka miesięcy',
      'Wino to blend wielu roczników (wieloletnia ciągłość)',
    ],
  },
  {
    id: 'qvevri',
    name: 'Qvevri (Amphora)',
    namePl: 'Qvevri (Amfora)',
    description: 'Fermentacja i dojrzewanie w glinianych naczyniach zakopanych w ziemi - metoda licząca 8000 lat.',
    usedFor: ['Wina gruzińskie', 'Wina naturalne na całym świecie'],
    process: [
      'Gliniane naczynie (qvevri) zakopane w ziemi',
      'Winogrona z całymi skórkami, nasionami, czasem szypułkami',
      'Długa maceracja (miesiące)',
      'Stała temperatura dzięki ziemi',
      'Wina często pomarańczowe, taniczne, kompleksowe',
    ],
  },
];

export const BIODYNAMIC_ORGANIC = {
  organic: {
    title: 'Winiarstwo ekologiczne (Organic)',
    description: 'Uprawa bez syntetycznych pestycydów i nawozów sztucznych.',
    practices: [
      'Brak herbicydów syntetycznych',
      'Brak pestycydów syntetycznych',
      'Naturalne nawozy (kompost, obornik)',
      'Ograniczone użycie siarki w piwnicy',
    ],
    certifications: ['EU Organic', 'USDA Organic', 'Ecocert'],
  },
  biodynamic: {
    title: 'Winiarstwo biodynamiczne',
    description: 'Holistyczne podejście traktujące winnicę jako ekosystem, z wykorzystaniem kalendarza księżycowego.',
    practices: [
      'Wszystkie praktyki ekologiczne +',
      'Preparaty biodynamiczne (501, 500)',
      'Kalendarz księżycowy kieruje pracami',
      'Winnica jako zamknięty ekosystem',
      'Często hodowla zwierząt na farmie',
    ],
    certifications: ['Demeter', 'Biodyvin'],
  },
  natural: {
    title: 'Wina naturalne',
    description: 'Minimalna interwencja - brak lub minimalne siarki, dzikie drożdże, brak filtracji.',
    practices: [
      'Dzikie drożdże (spontaniczna fermentacja)',
      'Brak lub minimalne siarki (<10 mg/l)',
      'Brak klarowania i filtracji',
      'Może być niestabilne i mętne',
    ],
    certifications: ['Brak oficjalnej certyfikacji - termin niezdefiniowany prawnie'],
  },
};
