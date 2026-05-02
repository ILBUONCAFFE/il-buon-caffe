import { notFound } from "next/navigation";
import GrapeVarietiesSection from "@/components/WineEncyclopedia/GrapeVarietiesSection";
import WineRegionsSection from "@/components/WineEncyclopedia/WineRegionsSection";

type SectionSlug = 'szczepy' | 'regiony' | 'podstawy' | 'degustacja' | 'serwowanie' |
                   'przechowywanie' | 'produkcja' | 'klasyfikacje' |
                   'roczniki' | 'slownik' | 'winnice';

const sectionMetadata: Record<SectionSlug, { title: string; description: string }> = {
  szczepy: {
    title: "Szczepy Winogron | Encyklopedia Wina | Il Buon Caffe",
    description: "Poznaj najważniejsze odmiany winogron - od Cabernet Sauvignon po Chardonnay. Charakterystyki, pochodzenie i aromaty.",
  },
  regiony: {
    title: "Regiony Winiarskie | Encyklopedia Wina | Il Buon Caffe",
    description: "Odkryj najważniejsze regiony winiarskie świata - Bordeaux, Toskania, Rioja, Napa Valley i więcej. Terroir, klimat i flagowe wina.",
  },
  podstawy: {
    title: "Podstawy Wiedzy o Winie | Encyklopedia Wina | Il Buon Caffe",
    description: "Wprowadzenie do świata wina - historia winiarstwa, typy win, podstawy klasyfikacji i czytania etykiet.",
  },
  degustacja: {
    title: "Sztuka Degustacji Wina | Encyklopedia Wina | Il Buon Caffe",
    description: "Profesjonalna degustacja wina - 5 kroków degustacji, koło aromatów, rozpoznawanie wad i ocena jakości wina.",
  },
  serwowanie: {
    title: "Serwowanie Wina | Encyklopedia Wina | Il Buon Caffe",
    description: "Jak prawidłowo serwować wino - temperatury podawania, typy kieliszków, dekantacja i techniki otwierania butelek.",
  },
  przechowywanie: {
    title: "Przechowywanie Wina | Encyklopedia Wina | Il Buon Caffe",
    description: "Jak przechowywać wino - optymalne warunki, potencjał starzenia różnych win i budowa domowej piwniczki.",
  },
  produkcja: {
    title: "Produkcja Wina | Encyklopedia Wina | Il Buon Caffe",
    description: "Proces produkcji wina od zbiorów po butelkowanie. Metody specjalne: szampańska, appassimento, solera.",
  },
  klasyfikacje: {
    title: "Klasyfikacje Win | Encyklopedia Wina | Il Buon Caffe",
    description: "Systemy klasyfikacji win - AOC, DOC, Prädikat. Klasyfikacja Bordeaux 1855, Premier Cru Burgundii i inne.",
  },
  roczniki: {
    title: "Roczniki Win | Encyklopedia Wina | Il Buon Caffe",
    description: "Przewodnik po rocznikach win z głównych regionów świata. Oceny i okna picia najlepszych roczników.",
  },
  slownik: {
    title: "Słownik Wina | Encyklopedia Wina | Il Buon Caffe",
    description: "Kompletny słownik terminów winiarskich od A do Z. Ponad 80 pojęć z polskimi tłumaczeniami.",
  },
  winnice: {
    title: "Winnice i Producenci | Encyklopedia Wina | Il Buon Caffe",
    description: "Profile winnic i producentów win dostępnych w naszym sklepie. Historia, filozofia i flagowe wina.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = sectionMetadata[section as SectionSlug];
  if (!meta) {
    return {
      title: "Encyklopedia Wina | Il Buon Caffe",
      description: "Kompletna baza wiedzy o winie.",
    };
  }
  return {
    title: meta.title,
    description: meta.description,
  };
}

export function generateStaticParams() {
  // Import categories dynamically to get all available sections
  // Exclude 'szczepy' and 'regiony' as they have dedicated page.tsx files
  const sections = Object.keys(sectionMetadata).filter(
    (section) => section !== 'szczepy' && section !== 'regiony'
  );
  return sections.map((section) => ({ section }));
}

export default async function WineSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;

  switch (section) {
    case 'szczepy':
      return <GrapeVarietiesSection />;
    case 'regiony':
      return <WineRegionsSection />;
    case 'podstawy':
    case 'degustacja':
    case 'serwowanie':
    case 'przechowywanie':
    case 'produkcja':
    case 'klasyfikacje':
    case 'roczniki':
    case 'slownik':
    case 'winnice':
      return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-serif text-brand-900 mb-4">
              {sectionMetadata[section as SectionSlug]?.title.split(' | ')[0]}
            </h1>
            <p className="text-brand-700">Ta sekcja jest w trakcie budowy.</p>
          </div>
        </div>
      );
    default:
      notFound();
  }
}
