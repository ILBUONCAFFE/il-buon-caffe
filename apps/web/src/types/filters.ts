/**
 * Shared types for product filtering.
 * This file can be safely imported from both client and server components.
 */

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export interface PriceRange {
  min: number;
  max: number;
}

export interface ProductFilters {
  category?: string;        // category slug (e.g., 'kawa', 'wino')
  search?: string;           // text search query
  sort?: SortOption;
  priceRanges?: PriceRange[]; // array of {min, max} pairs
  origins?: string[];        // array of origin country names (legacy)
  // ── Wine cascading filters ──
  originCountry?: string;    // e.g., "Hiszpania"
  originRegion?: string;     // e.g., "Yecla"
  grapeVariety?: string;     // e.g., "Monastrell"
  limit?: number;
  offset?: number;
}

export interface WineFilterOption {
  value: string;
  count: number;
}

/** Result of cascading wine filter options query */
export interface WineFilterOptions {
  countries: WineFilterOption[];
  regions: WineFilterOption[];
  grapes: WineFilterOption[];
}

export interface FilteredProductsResult {
  products: import('@/types').Product[];
  totalCount: number;
  availableOrigins: { origin: string; count: number }[];
  priceRange: { min: number; max: number };
  // Wine cascading filter options — dynamically computed based on current selections
  wineFilterOptions?: WineFilterOptions;
}
