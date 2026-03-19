
import { CafeMenuItem, Article } from '@/types';

export const HERO_IMAGE = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2574&auto=format&fit=crop";

// Products are now fetched from Neon database via productService
// No more hardcoded PRODUCTS array

export const CAFE_MENU: CafeMenuItem[] = [
  {
    category: "Klasyki Kawowe",
    items: [
      { name: "Espresso", price: "8.00 zł", description: "Oryginalne" },
      { name: "Macchiato", price: "8.50 zł", description: "Espresso z odrobiną mlecznego kremu" },
      { name: "Americano", price: "12.00 zł", description: "Czarna kawa" },
      { name: "Caffe Classico", price: "13.00 zł", description: "Biała kawa" },
      { name: "Cappuccino", price: "14.00 zł", description: "Espresso z puszystym mlecznym kremem" },
      { name: "Cappuccino XL", price: "17.50 zł", description: "Podwójne espresso z puszystym mlecznym kremem" },
      { name: "Caffe Latte", price: "15.50 zł", description: "Espresso z gorącym mlekiem" },
      { name: "Latte Macchiato", price: "15.00 zł", description: "Espresso ze spienionym mlekiem" },
      { name: "Latte Macchiato Doppio", price: "17.50 zł", description: "Podwójne espresso ze spienionym mlekiem" },
    ]
  },
  {
    category: "Specjały & Na Zimno",
    items: [
      { name: "Bombon", price: "13.50 zł", description: "Przedłużone espresso z zagęszczonym słodkim mlekiem" },
      { name: "American Latte", price: "16.00 zł", description: "Espresso ze spienionym mlekiem i syropem smakowym" },
      { name: "Caffe Freddo", price: "22.00 zł", description: "Schłodzona kawa z mlekiem, lodami waniliowymi i syropem" },
      { name: "Frappe", price: "16.00 zł", description: "Espresso z zimnym mlekiem i kostkami lodu" },
      { name: "Lody z Espresso", price: "18.00 zł", description: "Espresso z porcją lodów" },
    ]
  },
  {
    category: "Czekolada & Deser",
    items: [
      { name: "Czekolada", price: "12.00 zł", description: "Gęsta, na gorąco" },
      { name: "Herbata", price: "12.00 zł", description: "Czarna, zielona, owocowa" },
      { name: "Domowy Sernik", price: "18.00 zł", description: "Wypiekany na miejscu przez właściciela (zapytaj o dostępność)" },
    ]
  }
];

export const ENCYCLOPEDIA_ENTRIES: Article[] = [
  {
    id: 1,
    title: "Droga Ziarna: Od Etiopii do Filiżanki",
    subtitle: "Podróż przez historię i proces obróbki kawy, który definiuje jej smak.",
    category: "Wiedza",
    readTime: "5 min",
    image: "https://images.unsplash.com/photo-1524350876685-274059332603?q=80&w=2671&auto=format&fit=crop",
    content: `
      <p>Kawa to coś więcej niż poranny rytuał. To roślina o niezwykłej historii, której korzenie sięgają starożytnej Etiopii. Legenda głosi, że pasterz Kaldi zauważył, iż jego kozy stają się niezwykle pobudzone po zjedzeniu czerwonych owoców pewnego krzewu. Tak narodziła się legenda kawy.</p>
      
      <h3>Terroir i jego znaczenie</h3>
      <p>Podobnie jak w przypadku wina, smak kawy jest ściśle powiązany z miejscem jej uprawy. Wysokość n.p.m., skład gleby, opady deszczu i nasłonecznienie tworzą unikalny profil sensoryczny zwany <em>terroir</em>.</p>
      
      <ul>
        <li><strong>Etiopia:</strong> Owoce cytrusowe, jaśmin, bergamotka.</li>
        <li><strong>Brazylia:</strong> Czekolada, orzechy, niska kwasowość.</li>
        <li><strong>Kenia:</strong> Czarna porzeczka, pomidor, wysoka kwasowość winna.</li>
      </ul>

      <h3>Proces Obróbki</h3>
      <p>To, co dzieje się z wiśnią kawowca po zerwaniu, ma kluczowe znaczenie. Metoda "Natural" (suszenie całych owoców) nadaje kawie słodycz i body. Metoda "Washed" (myta) podkreśla kwasowość i czystość smaku.</p>
    `
  },
  {
    id: 2,
    title: "Sztuka Dekantacji Wina",
    subtitle: "Dlaczego niektóre wina potrzebują powietrza, aby w pełni rozkwitnąć?",
    category: "Proces",
    readTime: "3 min",
    image: "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?q=80&w=2670&auto=format&fit=crop",
    content: `
      <p>Dekantacja to proces przelewania wina z butelki do karafki (dekantera). Ma ona dwa główne cele: oddzielenie osadu w starszych winach oraz napowietrzenie (aerację) win młodych.</p>
      
      <h3>Kiedy dekantować?</h3>
      <p>Młode, taniczne wina czerwone (jak Cabernet Sauvignon czy Barolo) często są "zamknięte" zaraz po otwarciu. Kontakt z tlenem pozwala uwolnić aromaty i zmiękczyć ostre taniny. Starsze wina wymagają ostrożności – zbyt duża ilość tlenu może zabić ich delikatny bukiet.</p>
      
      <h3>Kształt ma znaczenie</h3>
      <p>Szerokie karafki są idealne dla młodych win, zapewniając maksymalną powierzchnię kontaktu z powietrzem. Wąskie karafki służą głównie do separacji osadu w starych rocznikach, chroniąc wino przed nadmiernym utlenieniem.</p>
    `
  },
  {
    id: 3,
    title: "Toskania: Kraina Słońca i Wina",
    subtitle: "Przewodnik po jednym z najważniejszych regionów winiarskich świata.",
    category: "Regiony",
    readTime: "7 min",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2670&auto=format&fit=crop",
    content: `
      <p>Toskania to serce włoskiego winiarstwa. Malownicze wzgórza, cyprysowe aleje i kamienne miasteczka to tło dla produkcji jednych z najbardziej cenionych win na świecie.</p>
      
      <h3>Sangiovese - Król Toskanii</h3>
      <p>Głównym szczepem regionu jest Sangiovese. To z niego powstaje słynne Chianti Classico, Brunello di Montalcino oraz Vino Nobile di Montepulciano. Wina te charakteryzują się wysoką kwasowością, solidną strukturą tanin i aromatami wiśni, fiołków oraz ziół.</p>
      
      <h3>Super Toskany</h3>
      <p>W latach 70. buntowniczy winiarze zaczęli łamać tradycyjne reguły apelacji, dodając do Sangiovese szczepy międzynarodowe jak Cabernet Sauvignon czy Merlot. Tak powstały "Super Toskany" (np. Tignanello, Sassicaia) – wina potężne, eleganckie i niezwykle długowieczne.</p>
    `
  }
];

export const ENCYCLOPEDIA_CATEGORIES = [
  {
    id: "pasta",
    label: "Makarony",
    description: "Rodzaje, mąki i al dente",
    heroImage:
      "https://images.unsplash.com/photo-1529042410759-befb1204b468?q=80&w=2400&auto=format&fit=crop",
    title: "Makarony",
    subtitle: "Wszystko o makaronach: rodzaje, mąki, kształty i idealne gotowanie al dente.",
    points: [
      "Długie (spaghetti, linguine) – najlepsze do sosów na bazie oliwy i pomidorów.",
      "Krótkie (penne, rigatoni) – idealne do gęstych sosów i zapiekanek.",
      "Jajeczne (tagliatelle) – świetne do sosów śmietanowych i ragù.",
    ],
    highlights: [
      "Al dente to klucz do smaku i struktury.",
      "Dobre makarony powstają z semoliny z pszenicy durum.",
      "Sos i makaron łącz w ostatniej minucie na patelni.",
    ],
  },
  {
    id: "wine",
    label: "Wina",
    description: "Szczepy, regiony, dekantacja",
    heroImage:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2400&auto=format&fit=crop",
    title: "Wina",
    subtitle: "Podstawy winiarstwa: szczepy, regiony, łączenie z jedzeniem i dekantacja.",
    points: [
      "Czerwone: Sangiovese, Nebbiolo, Cabernet – taniny i głębia.",
      "Białe: Chardonnay, Sauvignon Blanc – świeżość i mineralność.",
      "Musujące: Prosecco i Franciacorta – idealne na aperitif.",
    ],
    highlights: [
      "Dekantacja uwalnia aromaty, szczególnie w młodych winach.",
      "Temperatura podania potrafi zmienić odbiór wina.",
      "Dobieraj wino do sosu, nie do rodzaju mięsa.",
    ],
  },
  {
    id: "coffee",
    label: "Kawa",
    description: "Ziarna, palenie, parzenie",
    heroImage:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=2400&auto=format&fit=crop",
    title: "Kawa",
    subtitle: "Ziarno, palenie, metody parzenia i jak wydobyć najlepszy smak.",
    points: [
      "Jasne palenie podkreśla nuty owocowe i kwasowość.",
      "Średnie palenie to balans słodyczy i body.",
      "Mielenie dopasuj do metody – espresso wymaga najdrobniejszego.",
    ],
    highlights: [
      "Najlepszy smak 2–21 dni po paleniu.",
      "Woda to 98% naparu – używaj filtrowanej.",
      "Stała receptura daje powtarzalny wynik.",
    ],
  },
  {
    id: "olive",
    label: "Oliwy",
    description: "Extra virgin i terroir",
    heroImage:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=2400&auto=format&fit=crop",
    title: "Oliwy",
    subtitle: "Extra virgin, terroir i jak rozpoznać naprawdę dobrą oliwę.",
    points: [
      "Extra virgin ma niską kwasowość i wyraźny aromat.",
      "Oliwy jednoszczepowe podkreślają charakter regionu.",
      "Przechowuj w ciemności i chłodzie – światło niszczy aromat.",
    ],
    highlights: [
      "Dobra oliwa powinna delikatnie szczypać w gardle.",
      "Sezon zbioru i świeżość to kluczowe parametry.",
      "Idealna do sałat, pieczywa i wykończenia dań.",
    ],
  },
] as const;

export const CATEGORY_NAMES: Record<string, string> = {
  coffee: 'Kawa',
  alcohol: 'Wina',
  wino: 'Wina', 
  sweets: 'Słodycze',
  pantry: 'Delikatesy',
  all: 'Wszystkie',
};
