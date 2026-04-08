'use server';

import { unstable_cache } from 'next/cache';
import { productService, type ProductFilters, type FilteredProductsResult } from '@/services/productService';
import type { Product } from '@/types';

// Cache TTL — admin revalidateTag('products') handles manual invalidation,
// so longer TTLs are safe: there's no need to re-hit Neon on every page load.
const LIST_TTL = 600;      // 10 min — safe: admin revalidateTag('products') handles manual invalidation
const PRODUCT_TTL = 3600;  // 1 hour
const CATEGORY_TTL = 7200; // 2 hours

// ── Cached data functions (unstable_cache requires serializable args) ──

const cachedGetFiltered = unstable_cache(
  async (filtersJson: string) => {
    const filters = JSON.parse(filtersJson) as ProductFilters;
    return productService.getFiltered(filters);
  },
  ['filtered-products'],
  { revalidate: LIST_TTL, tags: ['products'] },
);

const cachedGetAll = unstable_cache(
  async () => productService.getAll(),
  ['all-products'],
  { revalidate: LIST_TTL, tags: ['products'] },
);

const cachedGetFeatured = unstable_cache(
  async (limit: number) => productService.getFeatured(limit),
  ['featured-products'],
  { revalidate: LIST_TTL, tags: ['products'] },
);

const cachedGetBySku = unstable_cache(
  async (sku: string) => productService.getBySku(sku),
  ['product-by-sku'],
  { revalidate: PRODUCT_TTL, tags: ['products'] },
);

const cachedGetBySlug = unstable_cache(
  async (slug: string) => productService.getBySlug(slug),
  ['product-by-slug'],
  { revalidate: PRODUCT_TTL, tags: ['products'] },
);

const cachedGetCategories = unstable_cache(
  async () => productService.getCategories(),
  ['categories'],
  { revalidate: CATEGORY_TTL, tags: ['categories'] },
);

// ── Public server actions ──

export async function getFilteredProducts(filters: ProductFilters): Promise<FilteredProductsResult> {
  return cachedGetFiltered(JSON.stringify(filters));
}

export async function getProducts(): Promise<Product[]> {
  return cachedGetAll();
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return cachedGetFeatured(limit);
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  return cachedGetBySku(sku);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return cachedGetBySlug(slug);
}

const cachedSearch = unstable_cache(
  async (query: string) => productService.search(query),
  ['search-products'],
  { revalidate: 60, tags: ['products'] },
);

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return cachedSearch(q);
}

export async function getCategories() {
  return cachedGetCategories();
}
