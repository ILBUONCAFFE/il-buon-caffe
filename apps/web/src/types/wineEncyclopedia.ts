// ============================================
// WINE ENCYCLOPEDIA TYPES
// ============================================

// --- Base Types ---

export interface WineImage {
  url: string;
  alt: string;
  credit?: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string[];
}

// --- Wine Basics ---

export type WineType = 
  | 'czerwone' 
  | 'białe' 
  | 'różowe' 
  | 'musujące' 
  | 'słodkie' 
  | 'wzmacniane' 
  | 'pomarańczowe' 
  | 'naturalne';

export interface WineTypeInfo {
  id: WineType;
  name: string;
  namePl: string;
  description: string;
  characteristics: string[];
  servingTemp: { min: number; max: number };
  image: WineImage;
  popularExamples: string[];
}

export interface WineBasicsSection {
  id: string;
  title: string;
  subtitle: string;
  content: string; // HTML content
  image?: WineImage;
  relatedLinks?: { label: string; href: string }[];
}

// --- Grape Varieties ---

export type GrapeColor = 'czerwony' | 'biały';

export interface FlavorProfile {
  primary: string[];    // Primary fruit/floral notes
  secondary: string[];  // Fermentation notes
  tertiary: string[];   // Aging notes (oak, bottle)
}

export interface GrapeVariety {
  id: string;
  slug: string;
  name: string;
  alternateNames?: string[];
  color: GrapeColor;
  origin: string;
  primaryRegions: string[];
  description: string;
  characteristics: {
    body: 1 | 2 | 3 | 4 | 5;      // Light to Full
    tannins?: 1 | 2 | 3 | 4 | 5;  // Low to High (red only)
    acidity: 1 | 2 | 3 | 4 | 5;   // Low to High
    sweetness: 1 | 2 | 3 | 4 | 5; // Dry to Sweet
  };
  flavorProfile: FlavorProfile;
  agingPotential: string;
  servingTemp: { min: number; max: number };
  image: WineImage;
  famousWines?: string[];
  seo?: SeoMeta;
}

// --- Wine Regions ---

export type RegionLevel = 'country' | 'region' | 'subregion' | 'appellation';

export interface ClimateInfo {
  type: string; // e.g., "Continental", "Mediterranean", "Maritime"
  avgTemp?: { summer: number; winter: number };
  rainfall?: number; // mm per year
  specialFactors?: string[];
}

export interface WineRegion {
  id: string;
  slug: string;
  name: string;
  namePl?: string;
  level: RegionLevel;
  parentId?: string; // For hierarchical structure
  country: string;
  description: string;
  history?: string;
  climate?: ClimateInfo;
  terroir?: string;
  keyGrapes: string[]; // GrapeVariety slugs
  appellations?: string[];
  notableWines?: string[];
  classification?: string; // e.g., "DOCG", "AOC", "DO"
  image: WineImage;
  mapCoordinates?: { lat: number; lng: number };
  seo?: SeoMeta;
}

// --- Tasting Guide ---

export interface TastingStep {
  id: string;
  name: string;
  namePl: string;
  order: number;
  description: string;
  tips: string[];
  image?: WineImage;
}

export interface AromaCategory {
  id: string;
  category: string;
  categoryPl: string;
  aromas: { name: string; namePl: string; description?: string }[];
}

export interface WineFault {
  id: string;
  name: string;
  namePl: string;
  cause: string;
  detection: string;
  prevention?: string;
}

// --- Serving Guide ---

export interface GlassType {
  id: string;
  name: string;
  namePl: string;
  description: string;
  bestFor: WineType[];
  image?: WineImage;
}

export interface ServingTemperature {
  wineType: string;
  minTemp: number;
  maxTemp: number;
  notes?: string;
}

export interface DecantingGuide {
  wineType: string;
  shouldDecant: boolean;
  duration?: string; // e.g., "30 min - 2h"
  reason?: string;
}

// --- Storage Guide ---

export interface StorageCondition {
  factor: string;
  ideal: string;
  importance: string;
  consequences: string;
}

export interface AgingPotential {
  wineType: string;
  minYears: number;
  maxYears: number;
  peakYears?: string;
  notes?: string;
}

// --- Production Process ---

export interface ProductionStep {
  id: string;
  order: number;
  name: string;
  namePl: string;
  description: string;
  duration?: string;
  image?: WineImage;
  variations?: { method: string; description: string }[];
}

export interface SpecialMethod {
  id: string;
  name: string;
  namePl: string;
  description: string;
  usedFor: string[];
  process: string[];
  examples?: string[];
  image?: WineImage;
}

// --- Classifications ---

export interface ClassificationSystem {
  id: string;
  country: string;
  name: string;
  levels: {
    level: string;
    description: string;
    requirements?: string[];
  }[];
  description: string;
  image?: WineImage;
}

export interface PrestigeClassification {
  id: string;
  name: string;
  region: string;
  year?: number;
  description: string;
  levels?: string[];
}

// --- Vintages ---

export interface VintageRating {
  year: number;
  rating: 1 | 2 | 3 | 4 | 5; // Poor to Exceptional
  notes?: string;
  drinkingWindow?: { start: number; end: number };
}

export interface VintageChart {
  regionId: string;
  regionName: string;
  vintages: VintageRating[];
}

// --- Glossary ---

export interface GlossaryTerm {
  id: string;
  term: string;
  termPl?: string;
  definition: string;
  category?: string; // e.g., "Degustacja", "Produkcja", "Regiony"
  relatedTerms?: string[];
  pronunciation?: string;
}

// --- Wineries ---

export interface Winery {
  id: string;
  slug: string;
  name: string;
  region: string;
  country: string;
  description: string;
  history?: string;
  philosophy?: string;
  grapes: string[]; // Grape slugs
  certifications?: string[]; // e.g., "Organic", "Biodynamic"
  founded?: number;
  owner?: string;
  winemaker?: string;
  annualProduction?: string;
  image: WineImage;
  logo?: WineImage;
  website?: string;
  productSkus?: string[]; // Links to shop products
  seo?: SeoMeta;
}

// --- Encyclopedia Categories ---

export interface EncyclopediaCategory {
  id: string;
  slug: string;
  name: string;
  namePl: string;
  description: string;
  icon: string; // Lucide icon name
  image: WineImage;
  articleCount?: number;
}

// --- Search ---

export interface SearchResult {
  type: 'grape' | 'region' | 'winery' | 'term' | 'article';
  id: string;
  title: string;
  description: string;
  url: string;
  image?: string;
}

// --- Navigation ---

export interface EncyclopediaNavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  children?: EncyclopediaNavItem[];
}
