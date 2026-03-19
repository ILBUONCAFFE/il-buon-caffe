// ============================================
// WINE ENCYCLOPEDIA - WINERIES
// ============================================

import { Winery } from '@/types/wineEncyclopedia';

// Placeholder wineries - replace with actual wineries you sell
// These are example entries that can be updated with real data

export const WINERIES: Winery[] = [
  {
    id: 'antinori',
    slug: 'antinori',
    name: 'Marchesi Antinori',
    region: 'Toskania',
    country: 'Włochy',
    description: 'Jedna z najstarszych i najbardziej prestiżowych rodzin winiarskich na świecie. Antinori produkują wina od 1385 roku - to ponad 600 lat tradycji.',
    history: 'Rodzina Antinori zajmuje się winiarstwem od 26 pokoleń. To oni stworzyli pierwszy Super Toskan - Tignanello w 1971 roku, rewolucjonizując włoskie winiarstwo.',
    philosophy: 'Łączenie tradycji z innowacją. Poszanowanie terroir przy wykorzystaniu nowoczesnych technik.',
    grapes: ['sangiovese', 'cabernet-sauvignon', 'merlot'],
    certifications: [],
    founded: 1385,
    winemaker: 'Renzo Cotarella',
    annualProduction: 'Ponad 2 miliony skrzynek',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnica Antinori',
    },
    website: 'https://www.antinori.it',
    productSkus: [], // Dodaj SKU produktów ze sklepu
  },
  {
    id: 'gaja',
    slug: 'gaja',
    name: 'Gaja',
    region: 'Piemont',
    country: 'Włochy',
    description: 'Angelo Gaja to legenda Piemontu. Jego wina zdefiniowały nowoczesne Barbaresco i podniosły status Nebbiolo do rangi światowej.',
    history: 'Rodzina Gaja założyła winnicę w 1859 roku. Angelo przejął stery w 1961 i wprowadził rewolucyjne zmiany - od niższych plonów po beczki barriques.',
    philosophy: 'Perfekcjonizm bez kompromisów. "Jakość jest nawykiem, nie aktem."',
    grapes: ['nebbiolo', 'barbera', 'chardonnay'],
    certifications: ['Organic in conversion'],
    founded: 1859,
    winemaker: 'Angelo Gaja & Gaia Gaja',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Winnica Gaja',
    },
    website: 'https://www.gaia.com',
    productSkus: [],
  },
  {
    id: 'ornellaia',
    slug: 'ornellaia',
    name: 'Tenuta dell\'Ornellaia',
    region: 'Toskania (Bolgheri)',
    country: 'Włochy',
    description: 'Ikona Super Toskanów z Bolgheri. Ornellaia łączy elegancję bordoską z toskańskim słońcem.',
    history: 'Założona w 1981 przez Lodovico Antinori (brata Piero). Pierwszy rocznik 1985 natychmiast zdobył uznanie krytyków.',
    philosophy: 'Wyrażenie terroir Bolgheri przez bordoskie szczepy. Każdy rocznik ma swoim "vendemmia d\'artista" - etykietę zaprojektowaną przez innego artystę.',
    grapes: ['cabernet-sauvignon', 'merlot', 'cabernet-franc'],
    founded: 1981,
    winemaker: 'Axel Heinz',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Tenuta dell\'Ornellaia',
    },
    website: 'https://www.ornellaia.com',
    productSkus: [],
  },
  {
    id: 'planeta',
    slug: 'planeta',
    name: 'Planeta',
    region: 'Sycylia',
    country: 'Włochy',
    description: 'Rodzina Planeta zrewolucjonizowała sycylijskie winiarstwo, pokazując potencjał wyspy dla win światowej klasy.',
    history: 'Rodzina uprawia winogrona od XVII wieku. Nowoczesna winnica powstała w 1995 roku pod kierunkiem Diego Planety.',
    philosophy: 'Każda z 6 winnic Planety reprezentuje inny terroir Sycylii - od Etny po Vittorię.',
    grapes: ['nero-davola', 'chardonnay', 'fiano'],
    certifications: ['Organic'],
    founded: 1995,
    winemaker: 'Alessio Planeta',
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Planeta Sicilia',
    },
    website: 'https://www.planeta.it',
    productSkus: [],
  },
  {
    id: 'marques-de-riscal',
    slug: 'marques-de-riscal',
    name: 'Marqués de Riscal',
    region: 'Rioja',
    country: 'Hiszpania',
    description: 'Najstarsza winnica Rioja, założona w 1858. Budynek autorstwa Franka Gehry\'ego jest ikoną nowoczesnej architektury.',
    history: 'Guillermo Hurtado de Amézaga wprowadził bordoskie szczepy i techniki do Rioja. Pierwszy Gran Reserva powstał w 1862.',
    philosophy: 'Tradycja i innowacja. Klasyczne wina Rioja obok eksperymentalnych cuvées.',
    grapes: ['tempranillo', 'graciano', 'mazuelo'],
    founded: 1858,
    image: {
      url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=1200',
      alt: 'Marqués de Riscal',
    },
    website: 'https://www.marquesderiscal.com',
    productSkus: [],
  },
  {
    id: 'louis-jadot',
    slug: 'louis-jadot',
    name: 'Maison Louis Jadot',
    region: 'Burgundia',
    country: 'Francja',
    description: 'Jedna z najważniejszych domów burgundzkich. Od win wiejskich po Grand Cru - Jadot reprezentuje kwintesencję Burgundii.',
    history: 'Założona w 1859 przez Louisa Henry\'ego Denis Jadot. Dziś posiada ponad 240 hektarów w najlepszych climats.',
    philosophy: 'Ekspresja terroir bez manipulacji. Minimalna interwencja w winnicy i piwnicy.',
    grapes: ['pinot-noir', 'chardonnay'],
    founded: 1859,
    winemaker: 'Frédéric Barnier',
    image: {
      url: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=1200',
      alt: 'Louis Jadot Burgundy',
    },
    website: 'https://www.louisjadot.com',
    productSkus: [],
  },
];

export const getWineryBySlug = (slug: string): Winery | undefined => {
  return WINERIES.find((winery) => winery.slug === slug);
};

export const getWineriesByCountry = (country: string): Winery[] => {
  return WINERIES.filter((winery) => winery.country === country);
};

export const getWineriesByRegion = (region: string): Winery[] => {
  return WINERIES.filter((winery) => winery.region.includes(region));
};

// Placeholder for linking wineries to products
export const getWineryProducts = (wineryId: string, allProducts: { sku: string; name: string }[]): { sku: string; name: string }[] => {
  const winery = WINERIES.find((w) => w.id === wineryId);
  if (!winery || !winery.productSkus || winery.productSkus.length === 0) {
    return [];
  }
  return allProducts.filter((product) => winery.productSkus?.includes(product.sku));
};
