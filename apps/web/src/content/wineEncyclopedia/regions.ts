// ============================================
// WINE ENCYCLOPEDIA - WINE REGIONS
// ============================================

import { WineRegion } from '@/types/wineEncyclopedia';

// --- FRANCE ---

export const FRENCH_REGIONS: WineRegion[] = [
  {
    id: 'bordeaux',
    slug: 'bordeaux',
    name: 'Bordeaux',
    namePl: 'Bordeaux',
    level: 'region',
    country: 'Francja',
    description: 'Najsłynniejszy region winiarski świata. Bordeaux to synonim eleganckich czerwonych blendów opartych na Cabernet Sauvignon i Merlot, a także prestiżowych słodkich win z Sauternes.',
    history: 'Historia winiarstwa w Bordeaux sięga czasów rzymskich. Prawdziwy rozkwit nastąpił w XVII-XVIII wieku dzięki handlowi z Anglią. Klasyfikacja z 1855 roku ustaliła hierarchię, która przetrwała do dziś.',
    climate: {
      type: 'Oceaniczny umiarkowany',
      avgTemp: { summer: 20, winter: 6 },
      rainfall: 900,
      specialFactors: ['Wpływ Zatoki Biskajskiej', 'Rzeki Gironde, Dordogne i Garonne'],
    },
    terroir: 'Żwirowe gleby w Médoc, gliniaste w Pomerol, wapienne w Saint-Émilion',
    keyGrapes: ['cabernet-sauvignon', 'merlot', 'cabernet-franc', 'sauvignon-blanc', 'semillon'],
    appellations: ['Médoc', 'Pauillac', 'Margaux', 'Saint-Julien', 'Saint-Estèphe', 'Pomerol', 'Saint-Émilion', 'Pessac-Léognan', 'Sauternes', 'Graves'],
    notableWines: ['Château Lafite Rothschild', 'Château Margaux', 'Château Latour', 'Château Pétrus', 'Château d\'Yquem'],
    classification: 'AOC',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Zamek w Bordeaux',
    },
    mapCoordinates: { lat: 44.837912, lng: -0.579541 },
  },
  {
    id: 'burgundy',
    slug: 'burgundia',
    name: 'Burgundy',
    namePl: 'Burgundia',
    level: 'region',
    country: 'Francja',
    description: 'Kolebka Pinot Noir i Chardonnay. Burgundia to mozaika tysięcy climats (pojedynczych winnic), gdzie terroir jest absolutnym priorytetem.',
    history: 'Mnisi z Cîteaux i Cluny w średniowieczu jako pierwsi zaczęli mapować najlepsze parcele. System Grand Cru i Premier Cru to efekt wieków obserwacji.',
    climate: {
      type: 'Kontynentalny',
      avgTemp: { summer: 19, winter: 2 },
      rainfall: 700,
      specialFactors: ['Duże różnice temperatur', 'Ryzyko przymrozków wiosennych'],
    },
    terroir: 'Gleby wapienne, margle kimerydzkie (Chablis), różnorodne ekspozycje stoków',
    keyGrapes: ['pinot-noir', 'chardonnay'],
    appellations: ['Côte de Nuits', 'Côte de Beaune', 'Chablis', 'Côte Chalonnaise', 'Mâconnais', 'Beaujolais'],
    notableWines: ['Romanée-Conti', 'La Tâche', 'Montrachet', 'Chablis Grand Cru', 'Chambertin'],
    classification: 'AOC (Village, Premier Cru, Grand Cru)',
    image: {
      url: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=1200',
      alt: 'Winnice Burgundii',
    },
    mapCoordinates: { lat: 47.046875, lng: 4.831428 },
  },
  {
    id: 'champagne',
    slug: 'szampania',
    name: 'Champagne',
    namePl: 'Szampania',
    level: 'region',
    country: 'Francja',
    description: 'Jedyny region na świecie, którego wina mogą nosić nazwę "Champagne". Metoda tradycyjna, kredowe gleby i chłodny klimat tworzą najbardziej prestiżowe wino musujące.',
    history: 'Dom Pérignon nie wynalazł szampana, ale udoskonalił metodę. XVIII-wieczni kupcy uczynili z niego symbol luksusu.',
    climate: {
      type: 'Kontynentalny chłodny',
      avgTemp: { summer: 18, winter: 3 },
      rainfall: 650,
      specialFactors: ['Najdalej na północ wysunięta winnica Francji', 'Gleby kredowe'],
    },
    terroir: 'Kreda (craie) zapewnia drenaż i minerały, zimna temperatura daje wysoką kwasowość',
    keyGrapes: ['chardonnay', 'pinot-noir', 'pinot-meunier'],
    appellations: ['Côte des Blancs', 'Montagne de Reims', 'Vallée de la Marne'],
    notableWines: ['Dom Pérignon', 'Krug', 'Cristal', 'Salon', 'Bollinger'],
    classification: 'AOC Champagne',
    image: {
      url: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1200',
      alt: 'Szampan w kieliszkach',
    },
    mapCoordinates: { lat: 49.258329, lng: 4.039537 },
  },
  {
    id: 'rhone',
    slug: 'dolina-rodanu',
    name: 'Rhône Valley',
    namePl: 'Dolina Rodanu',
    level: 'region',
    country: 'Francja',
    description: 'Dwa oblicza jednej rzeki: północ z eleganckimi Syrah (Hermitage, Côte-Rôtie), południe z mocnymi blendami (Châteauneuf-du-Pape).',
    climate: {
      type: 'Kontynentalny (północ) / Śródziemnomorski (południe)',
      avgTemp: { summer: 24, winter: 5 },
      rainfall: 600,
      specialFactors: ['Wiatr Mistral', 'Strome stoki na północy'],
    },
    terroir: 'Granit na północy, otoczaki (galets) na południu',
    keyGrapes: ['syrah', 'grenache', 'mourvedre', 'viognier', 'marsanne', 'roussanne'],
    appellations: ['Hermitage', 'Côte-Rôtie', 'Condrieu', 'Châteauneuf-du-Pape', 'Gigondas', 'Côtes du Rhône'],
    notableWines: ['E. Guigal La Mouline', 'Chapoutier Hermitage', 'Château Rayas'],
    classification: 'AOC',
    image: {
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
      alt: 'Winnice Doliny Rodanu',
    },
    mapCoordinates: { lat: 44.073375, lng: 4.820374 },
  },
];

// --- ITALY ---

export const ITALIAN_REGIONS: WineRegion[] = [
  {
    id: 'piedmont',
    slug: 'piemont',
    name: 'Piedmont',
    namePl: 'Piemont',
    level: 'region',
    country: 'Włochy',
    description: 'Dom Barolo i Barbaresco - najszlachetniejszych włoskich win. Nebbiolo króluje na wzgórzach Langhe, obok Barbery i Dolcetto.',
    history: 'Winiarstwo w Piemoncie rozkwitło w XIX wieku. Hrabia Cavour i marchiz Falletti uczynili z Barolo "wino królów i króla win".',
    climate: {
      type: 'Kontynentalny',
      avgTemp: { summer: 23, winter: 2 },
      rainfall: 750,
      specialFactors: ['Mgły jesienne (nebbia = Nebbiolo)', 'Alpy chronią przed zimnem'],
    },
    terroir: 'Wapienne gleby, ekspozycje południowe i południowo-zachodnie',
    keyGrapes: ['nebbiolo', 'barbera', 'dolcetto', 'moscato'],
    appellations: ['Barolo', 'Barbaresco', 'Langhe', 'Roero', 'Gavi', 'Asti'],
    notableWines: ['Giacomo Conterno Barolo', 'Bruno Giacosa Barbaresco', 'Gaja'],
    classification: 'DOCG/DOC',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnice Piemontu',
    },
    mapCoordinates: { lat: 44.697971, lng: 8.035006 },
  },
  {
    id: 'tuscany',
    slug: 'toskania',
    name: 'Tuscany',
    namePl: 'Toskania',
    level: 'region',
    country: 'Włochy',
    description: 'Serce Włoch, kraina Sangiovese. Od klasycznego Chianti po potężne Brunello di Montalcino i buntownicze Super Toskany.',
    history: 'Toskania była winiarskim centrum już w czasach Etrusków. Medyceusze uczynili florenckie wina sławnym towarem eksportowym.',
    climate: {
      type: 'Śródziemnomorski',
      avgTemp: { summer: 25, winter: 6 },
      rainfall: 800,
      specialFactors: ['Różnorodne wysokości', 'Wpływ morza na wybrzeżu'],
    },
    terroir: 'Galestro (łupek), albarese (wapień), gleby żelaziste na wybrzeżu',
    keyGrapes: ['sangiovese', 'cabernet-sauvignon', 'merlot', 'vermentino'],
    appellations: ['Chianti Classico', 'Brunello di Montalcino', 'Vino Nobile di Montepulciano', 'Bolgheri', 'Vernaccia di San Gimignano'],
    notableWines: ['Biondi-Santi Brunello', 'Tignanello', 'Sassicaia', 'Ornellaia', 'Solaia'],
    classification: 'DOCG/DOC',
    image: {
      url: 'https://images.unsplash.com/photo-1523528283115-9bf9b1699245?w=1200',
      alt: 'Toskańskie wzgórza',
    },
    mapCoordinates: { lat: 43.349442, lng: 11.242856 },
  },
  {
    id: 'veneto',
    slug: 'wenecja-euganejska',
    name: 'Veneto',
    namePl: 'Wenecja Euganejska',
    level: 'region',
    country: 'Włochy',
    description: 'Od lekkich Soave i najpopularniejszego Prosecco po potężne Amarone - najbardziej produkcyjny region Włoch.',
    climate: {
      type: 'Kontynentalny z wpływem morza',
      avgTemp: { summer: 24, winter: 3 },
      rainfall: 800,
    },
    terroir: 'Wulkaniczne gleby (Soave), moreny lodowcowe (Valpolicella)',
    keyGrapes: ['corvina', 'rondinella', 'glera', 'garganega'],
    appellations: ['Prosecco', 'Amarone della Valpolicella', 'Soave', 'Valpolicella', 'Bardolino'],
    notableWines: ['Quintarelli Amarone', 'Allegrini', 'Pieropan Soave'],
    classification: 'DOCG/DOC',
    image: {
      url: 'https://images.unsplash.com/photo-1523528283115-9bf9b1699245?w=1200',
      alt: 'Winnice Veneto',
    },
    mapCoordinates: { lat: 45.434336, lng: 12.338784 },
  },
];

// --- SPAIN ---

export const SPANISH_REGIONS: WineRegion[] = [
  {
    id: 'rioja',
    slug: 'rioja',
    name: 'Rioja',
    namePl: 'Rioja',
    level: 'region',
    country: 'Hiszpania',
    description: 'Najbardziej prestiżowy region Hiszpanii. Tempranillo dojrzewający w dębowych beczkach to podpis Rioja.',
    history: 'Francuscy winiarze uciekający przed filokserą w XIX wieku przywieźli tu techniki z Bordeaux, rozpoczynając złotą erę Rioja.',
    climate: {
      type: 'Kontynentalny z wpływem atlantyckim',
      avgTemp: { summer: 21, winter: 6 },
      rainfall: 450,
    },
    terroir: 'Gleby wapienne, gliniaste i żelaziste w różnych subregionach',
    keyGrapes: ['tempranillo', 'garnacha', 'graciano', 'viura'],
    appellations: ['Rioja Alta', 'Rioja Alavesa', 'Rioja Oriental'],
    notableWines: ['Marqués de Riscal', 'López de Heredia Viña Tondonia', 'La Rioja Alta Gran Reserva'],
    classification: 'DOCa (Crianza, Reserva, Gran Reserva)',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnice Rioja',
    },
    mapCoordinates: { lat: 42.465140, lng: -2.449750 },
  },
  {
    id: 'ribera-del-duero',
    slug: 'ribera-del-duero',
    name: 'Ribera del Duero',
    namePl: 'Ribera del Duero',
    level: 'region',
    country: 'Hiszpania',
    description: 'Wysoko położony region dający potężne wina z Tempranillo (tu zwanego Tinto Fino). Bardziej nowoczesne podejście niż w Rioja.',
    climate: {
      type: 'Kontynentalny ekstremalny',
      avgTemp: { summer: 22, winter: 4 },
      rainfall: 450,
      specialFactors: ['Duże amplitudy temperatur dzień/noc', 'Bardzo suche lata'],
    },
    terroir: 'Wapienne i piaszczyste gleby na wysokości 700-1000 m n.p.m.',
    keyGrapes: ['tempranillo'],
    appellations: ['Ribera del Duero DO'],
    notableWines: ['Vega Sicilia Único', 'Pingus', 'Pesquera', 'Emilio Moro'],
    classification: 'DO',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnice Ribera del Duero',
    },
    mapCoordinates: { lat: 41.645490, lng: -3.690550 },
  },
];

// --- OTHER REGIONS ---

export const OTHER_REGIONS: WineRegion[] = [
  {
    id: 'napa-valley',
    slug: 'napa-valley',
    name: 'Napa Valley',
    namePl: 'Dolina Napa',
    level: 'region',
    country: 'USA',
    description: 'Najbardziej prestiżowy region winiarski USA. Potężne Cabernet Sauvignon i Chardonnay światowej klasy.',
    climate: {
      type: 'Śródziemnomorski',
      avgTemp: { summer: 27, winter: 9 },
      rainfall: 800,
    },
    terroir: 'Różnorodne gleby wulkaniczne i aluwalne',
    keyGrapes: ['cabernet-sauvignon', 'chardonnay', 'merlot'],
    appellations: ['Oakville', 'Rutherford', 'Stags Leap', 'Howell Mountain'],
    notableWines: ['Opus One', 'Screaming Eagle', 'Harlan Estate', 'Caymus'],
    classification: 'AVA',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Dolina Napa',
    },
    mapCoordinates: { lat: 38.297539, lng: -122.286865 },
  },
  {
    id: 'mendoza',
    slug: 'mendoza',
    name: 'Mendoza',
    namePl: 'Mendoza',
    level: 'region',
    country: 'Argentyna',
    description: 'Stolica Malbeca. U podnóża Andów, na pustyni nawadnianej wodą z lodowców, powstają jedne z najbardziej wartościowych win Ameryki Południowej.',
    climate: {
      type: 'Pustynny z dużymi amplitudami',
      avgTemp: { summer: 24, winter: 8 },
      rainfall: 200,
      specialFactors: ['Nawadnianie z Andów', 'Wysokość 800-1500 m n.p.m.', 'Intensywne promieniowanie UV'],
    },
    terroir: 'Aluwialne gleby u podnóża Andów',
    keyGrapes: ['malbec', 'cabernet-sauvignon', 'torrontes'],
    appellations: ['Uco Valley', 'Luján de Cuyo', 'Maipú'],
    notableWines: ['Catena Zapata', 'Achaval-Ferrer', 'Zuccardi', 'Cheval des Andes'],
    classification: 'DOC/IG',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnice Mendozy',
    },
    mapCoordinates: { lat: -32.890170, lng: -68.844950 },
  },
  {
    id: 'mosel',
    slug: 'mosel',
    name: 'Mosel',
    namePl: 'Mozela',
    level: 'region',
    country: 'Niemcy',
    description: 'Najsłynniejszy region Rieslingów. Strome zbocza nad rzeką Mozelą, łupkowe gleby i chłodny klimat dają wina o niezwykłej elegancji i świeżości.',
    climate: {
      type: 'Kontynentalny chłodny',
      avgTemp: { summer: 17, winter: 2 },
      rainfall: 650,
      specialFactors: ['Strome zbocza (do 65°)', 'Rzeka reguluje temperaturę'],
    },
    terroir: 'Łupek dający charakterystyczną mineralność',
    keyGrapes: ['riesling'],
    appellations: ['Mosel', 'Saar', 'Ruwer'],
    notableWines: ['Egon Müller', 'JJ Prüm', 'Fritz Haag', 'Markus Molitor'],
    classification: 'Prädikatswein',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnice nad Mozelą',
    },
    mapCoordinates: { lat: 49.912240, lng: 6.925800 },
  },
];

export const ALL_WINE_REGIONS: WineRegion[] = [
  ...FRENCH_REGIONS,
  ...ITALIAN_REGIONS,
  ...SPANISH_REGIONS,
  ...OTHER_REGIONS,
];

export const getRegionBySlug = (slug: string): WineRegion | undefined => {
  return ALL_WINE_REGIONS.find((region) => region.slug === slug);
};

export const getRegionsByCountry = (country: string): WineRegion[] => {
  return ALL_WINE_REGIONS.filter((region) => region.country === country);
};

export const WINE_COUNTRIES = [
  { id: 'france', name: 'Francja', flag: '🇫🇷', regionCount: 4 },
  { id: 'italy', name: 'Włochy', flag: '🇮🇹', regionCount: 3 },
  { id: 'spain', name: 'Hiszpania', flag: '🇪🇸', regionCount: 2 },
  { id: 'usa', name: 'USA', flag: '🇺🇸', regionCount: 1 },
  { id: 'argentina', name: 'Argentyna', flag: '🇦🇷', regionCount: 1 },
  { id: 'germany', name: 'Niemcy', flag: '🇩🇪', regionCount: 1 },
];
