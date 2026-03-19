// ============================================
// WINE ENCYCLOPEDIA - BASICS
// ============================================

import { WineBasicsSection, WineTypeInfo } from '@/types/wineEncyclopedia';

export const WINE_BASICS_INTRO: WineBasicsSection = {
  id: 'what-is-wine',
  title: 'Czym jest wino?',
  subtitle: 'Podstawy wiedzy o napoju bogów',
  content: `
    <p>Wino to napój alkoholowy powstający w wyniku fermentacji soku winogronowego. 
    To jedna z najstarszych używek znanych ludzkości, której historia sięga ponad 8000 lat.</p>
    
    <p>W najprostszym ujęciu, wino powstaje gdy drożdże przekształcają cukry zawarte 
    w winogronach w alkohol i dwutlenek węgla. Ten naturalny proces fermentacji, 
    wspomagany przez rękę człowieka, daje nam niezliczone style i smaki win.</p>
    
    <h3>Skład wina</h3>
    <ul>
      <li><strong>Woda</strong> - stanowi około 85% objętości wina</li>
      <li><strong>Alkohol etylowy</strong> - zazwyczaj 11-15% objętości</li>
      <li><strong>Kwasy organiczne</strong> - nadają świeżość i strukturę</li>
      <li><strong>Cukry resztkowe</strong> - od 0 g/l (wina wytrawne) do ponad 200 g/l (wina słodkie)</li>
      <li><strong>Taniny</strong> - polifenole nadające strukturę winom czerwonym</li>
      <li><strong>Związki aromatyczne</strong> - setki substancji tworzących bukiet</li>
    </ul>
  `,
  image: {
    url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200',
    alt: 'Kieliszki różnych win',
  },
  relatedLinks: [
    { label: 'Historia wina', href: '/wino/podstawy/historia' },
    { label: 'Typy win', href: '/wino/podstawy/typy' },
  ],
};

export const WINE_HISTORY: WineBasicsSection = {
  id: 'wine-history',
  title: 'Historia wina',
  subtitle: 'Od starożytnej Gruzji po współczesne winiarstwo',
  content: `
    <p>Najstarsze ślady produkcji wina odkryto w Gruzji i datowane są na około 6000 lat p.n.e. 
    To właśnie w rejonie Kaukazu winorośl <em>Vitis vinifera</em> została po raz pierwszy udomowiona.</p>
    
    <h3>Starożytność</h3>
    <p>Egipcjanie, Grecy i Rzymianie rozwinęli winiarstwo do wysokiego poziomu. 
    Wino było napojem elit, składnikiem rytuałów religijnych i walutą handlową. 
    Rzymianie zasadzili winorośl w całej Europie, tworząc fundamenty dla regionów, 
    które dziś uważamy za klasyczne.</p>
    
    <h3>Średniowiecze</h3>
    <p>Klasztory i opactwa stały się centrami wiedzy winiarskiej. Mnisi cystersi 
    w Burgundii jako pierwsi zaczęli mapować terroir i wydzielać najlepsze parcele - 
    przodkowie dzisiejszych Grand Cru.</p>
    
    <h3>Era nowożytna</h3>
    <p>XIX wiek przyniósł rewolucję: butelka szklana, korek, klasyfikacja Bordeaux 1855, 
    ale też katastrofę filoksery, która zniszczyła europejskie winnice. 
    XX wiek to odrodzenie i globalizacja - wino zaczęto produkować na wszystkich kontynentach.</p>
  `,
  image: {
    url: 'https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?w=1200',
    alt: 'Stare wino w piwnicy',
  },
};

export const WINE_TYPES: WineTypeInfo[] = [
  {
    id: 'czerwone',
    name: 'Red Wine',
    namePl: 'Wino Czerwone',
    description: 'Wina produkowane z fermentacją skórek winogron, które nadają im kolor, taniny i charakterystyczne aromaty.',
    characteristics: [
      'Fermentacja ze skórkami (maceracja)',
      'Taniny nadające strukturę',
      'Aromaty ciemnych owoców, przypraw',
      'Potencjał do długiego dojrzewania',
    ],
    servingTemp: { min: 16, max: 18 },
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      alt: 'Czerwone wino w kieliszku',
    },
    popularExamples: ['Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Sangiovese'],
  },
  {
    id: 'białe',
    name: 'White Wine',
    namePl: 'Wino Białe',
    description: 'Wina produkowane bez kontaktu ze skórkami, zazwyczaj z białych odmian winogron.',
    characteristics: [
      'Fermentacja samego soku (bez skórek)',
      'Brak lub minimalne taniny',
      'Aromaty cytrusów, owoców, kwiatów',
      'Świeżość i kwasowość',
    ],
    servingTemp: { min: 8, max: 12 },
    image: {
      url: 'https://images.unsplash.com/photo-1566995541428-f2246c17cda1?w=800',
      alt: 'Białe wino w kieliszku',
    },
    popularExamples: ['Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio'],
  },
  {
    id: 'różowe',
    name: 'Rosé Wine',
    namePl: 'Wino Różowe',
    description: 'Wina o delikatnym kolorze, produkowane metodą krótkiej maceracji lub saignée.',
    characteristics: [
      'Krótki kontakt ze skórkami (2-24h)',
      'Świeżość wina białego + owoce wina czerwonego',
      'Idealne na lato',
      'Najbardziej popularne z Prowansji',
    ],
    servingTemp: { min: 8, max: 10 },
    image: {
      url: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=800',
      alt: 'Różowe wino w kieliszku',
    },
    popularExamples: ['Côtes de Provence Rosé', 'Tavel', 'White Zinfandel'],
  },
  {
    id: 'musujące',
    name: 'Sparkling Wine',
    namePl: 'Wino Musujące',
    description: 'Wina zawierające dwutlenek węgla, nadający im charakterystyczne bąbelki.',
    characteristics: [
      'Bąbelki CO₂ (druga fermentacja)',
      'Metoda tradycyjna lub Charmat',
      'Od półwytrawnych do bardzo wytrawnych (Brut Nature)',
      'Idealne na celebrację i aperitif',
    ],
    servingTemp: { min: 6, max: 8 },
    image: {
      url: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800',
      alt: 'Szampan w kieliszkach',
    },
    popularExamples: ['Champagne', 'Prosecco', 'Cava', 'Franciacorta', 'Crémant'],
  },
  {
    id: 'słodkie',
    name: 'Sweet Wine',
    namePl: 'Wino Słodkie i Desertowe',
    description: 'Wina o wysokiej zawartości cukru resztkowego, często podawane do deserów.',
    characteristics: [
      'Wysoki cukier resztkowy (>45 g/l)',
      'Produkowane różnymi metodami (botrytis, suszenie, mrożenie)',
      'Intensywne aromaty',
      'Świetny potencjał do leżakowania',
    ],
    servingTemp: { min: 6, max: 10 },
    image: {
      url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800',
      alt: 'Wino słodkie desertowe',
    },
    popularExamples: ['Sauternes', 'Tokaji Aszú', 'Eiswein', 'Vin Santo'],
  },
  {
    id: 'wzmacniane',
    name: 'Fortified Wine',
    namePl: 'Wino Wzmacniane',
    description: 'Wina z dodatkiem alkoholu (spirytusu), co podwyższa ich moc do 15-22%.',
    characteristics: [
      'Wyższa zawartość alkoholu (15-22%)',
      'Dodanie spirytusu winnego',
      'Długowieczne',
      'Od wytrawnych do bardzo słodkich',
    ],
    servingTemp: { min: 12, max: 16 },
    image: {
      url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800',
      alt: 'Porto w kieliszku',
    },
    popularExamples: ['Porto', 'Sherry', 'Madeira', 'Marsala'],
  },
  {
    id: 'pomarańczowe',
    name: 'Orange Wine',
    namePl: 'Wino Pomarańczowe',
    description: 'Wino białe produkowane metodą win czerwonych - z długim kontaktem ze skórkami.',
    characteristics: [
      'Białe winogrona, metoda czerwona',
      'Długa maceracja (tygodnie/miesiące)',
      'Pomarańczowy/bursztynowy kolor',
      'Taniny i złożoność strukturalna',
    ],
    servingTemp: { min: 12, max: 14 },
    image: {
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      alt: 'Wino pomarańczowe',
    },
    popularExamples: ['Gravner Ribolla', 'Radikon', 'Josko Gravner', 'Gruzińskie qvevri'],
  },
  {
    id: 'naturalne',
    name: 'Natural Wine',
    namePl: 'Wino Naturalne i Biodynamiczne',
    description: 'Wina produkowane z minimalną interwencją, bez dodatków chemicznych.',
    characteristics: [
      'Minimalna interwencja w winnicy i piwnicy',
      'Brak lub minimalna siarka',
      'Dzikie drożdże',
      'Certyfikaty bio/biodynamiczne',
    ],
    servingTemp: { min: 12, max: 16 },
    image: {
      url: 'https://images.unsplash.com/photo-1566275529824-cca6d008f3da?w=800',
      alt: 'Naturalne wino',
    },
    popularExamples: ['Frank Cornelissen', 'Cos', 'Domaine Ganevat', 'Gut Oggau'],
  },
];

export const WINE_CLASSIFICATION: WineBasicsSection = {
  id: 'wine-classification',
  title: 'Klasyfikacja win',
  subtitle: 'Jak dzielimy i kategoryzujemy wina',
  content: `
    <p>Wina można klasyfikować na wiele sposobów: według koloru, słodkości, 
    metody produkcji, regionu pochodzenia czy szczepów winogron.</p>
    
    <h3>Według koloru</h3>
    <ul>
      <li>Wina czerwone</li>
      <li>Wina białe</li>
      <li>Wina różowe (rosé)</li>
      <li>Wina pomarańczowe (orange)</li>
    </ul>
    
    <h3>Według zawartości cukru</h3>
    <ul>
      <li><strong>Wytrawne</strong> - do 4 g/l cukru</li>
      <li><strong>Półwytrawne</strong> - 4-12 g/l cukru</li>
      <li><strong>Półsłodkie</strong> - 12-45 g/l cukru</li>
      <li><strong>Słodkie</strong> - powyżej 45 g/l cukru</li>
    </ul>
    
    <h3>Według zawartości CO₂</h3>
    <ul>
      <li><strong>Wina spokojne</strong> - bez bąbelków</li>
      <li><strong>Wina musujące</strong> - Champagne, Prosecco, Cava</li>
      <li><strong>Wina perlistre (pétillant)</strong> - delikatna perlage</li>
    </ul>
  `,
  image: {
    url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=1200',
    alt: 'Różne rodzaje win',
  },
};

export const getAllWineBasicsContent = (): WineBasicsSection[] => {
  return [WINE_BASICS_INTRO, WINE_HISTORY, WINE_CLASSIFICATION];
};
