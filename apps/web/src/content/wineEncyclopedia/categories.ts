// ============================================
// WINE ENCYCLOPEDIA - CATEGORIES
// ============================================

import { EncyclopediaCategory } from '@/types/wineEncyclopedia';

export const WINE_ENCYCLOPEDIA_CATEGORIES: EncyclopediaCategory[] = [
  {
    id: 'basics',
    slug: 'podstawy',
    name: 'Wine Basics',
    namePl: 'Podstawy Wiedzy o Winie',
    description: 'Wprowadzenie do świata wina: historia, klasyfikacja, rodzaje win',
    icon: 'BookOpen',
    image: {
      url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
      alt: 'Kieliszki wina',
    },
    articleCount: 8,
  },
  {
    id: 'grapes',
    slug: 'szczepy',
    name: 'Grape Varieties',
    namePl: 'Szczepy Winogron',
    description: 'Odkryj charakterystykę najpopularniejszych szczepów czerwonych i białych',
    icon: 'Grape',
    image: {
      url: 'https://images.unsplash.com/photo-1596142046671-34bcc9f25506?w=800',
      alt: 'Winogrona na winorośli',
    },
    articleCount: 36,
  },
  {
    id: 'regions',
    slug: 'regiony',
    name: 'Wine Regions',
    namePl: 'Regiony Winiarskie',
    description: 'Podróż przez najważniejsze regiony winiarskie świata',
    icon: 'Globe',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800',
      alt: 'Toskańskie winnice',
    },
    articleCount: 45,
  },
  {
    id: 'tasting',
    slug: 'degustacja',
    name: 'Wine Tasting',
    namePl: 'Sztuka Degustacji',
    description: 'Naucz się profesjonalnie oceniać i opisywać wino',
    icon: 'Wine',
    image: {
      url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      alt: 'Degustacja wina',
    },
    articleCount: 12,
  },
  {
    id: 'serving',
    slug: 'serwowanie',
    name: 'Serving Wine',
    namePl: 'Serwowanie Wina',
    description: 'Temperatura, kieliszki, dekantacja - jak podać wino idealnie',
    icon: 'GlassWater',
    image: {
      url: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800',
      alt: 'Nalewanie wina do kieliszka',
    },
    articleCount: 8,
  },
  {
    id: 'storage',
    slug: 'przechowywanie',
    name: 'Wine Storage',
    namePl: 'Przechowywanie i Leżakowanie',
    description: 'Jak prawidłowo przechowywać wino i budować kolekcję',
    icon: 'Archive',
    image: {
      url: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32e6?w=800',
      alt: 'Piwniczka z winami',
    },
    articleCount: 6,
  },
  {
    id: 'production',
    slug: 'produkcja',
    name: 'Wine Production',
    namePl: 'Proces Produkcji',
    description: 'Od winnicy do butelki - jak powstaje wino',
    icon: 'Factory',
    image: {
      url: 'https://images.unsplash.com/photo-1504279577054-acfeccf8fc52?w=800',
      alt: 'Beczki w winnicy',
    },
    articleCount: 10,
  },
  {
    id: 'classifications',
    slug: 'klasyfikacje',
    name: 'Classifications',
    namePl: 'Klasyfikacje i Oznaczenia',
    description: 'Systemy klasyfikacji win i jak czytać etykiety',
    icon: 'Award',
    image: {
      url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800',
      alt: 'Etykiety win',
    },
    articleCount: 8,
  },
  {
    id: 'vintages',
    slug: 'roczniki',
    name: 'Vintages',
    namePl: 'Roczniki',
    description: 'Tabele roczników i znaczenie roku produkcji',
    icon: 'Calendar',
    image: {
      url: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800',
      alt: 'Stare butelki wina',
    },
    articleCount: 5,
  },
  {
    id: 'glossary',
    slug: 'slownik',
    name: 'Glossary',
    namePl: 'Słownik Pojęć',
    description: 'A-Z terminów winiarskich z definicjami',
    icon: 'BookA',
    image: {
      url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
      alt: 'Książka o winie',
    },
    articleCount: 200,
  },
  {
    id: 'wineries',
    slug: 'winnice',
    name: 'Wineries',
    namePl: 'Winnice',
    description: 'Profile winnic, których wina znajdziesz w naszym sklepie',
    icon: 'Home',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800',
      alt: 'Włoska winnica',
    },
    articleCount: 12,
  },
];

export const getWineCategory = (slug: string): EncyclopediaCategory | undefined => {
  return WINE_ENCYCLOPEDIA_CATEGORIES.find((cat) => cat.slug === slug);
};

export const getWineCategoryById = (id: string): EncyclopediaCategory | undefined => {
  return WINE_ENCYCLOPEDIA_CATEGORIES.find((cat) => cat.id === id);
};
