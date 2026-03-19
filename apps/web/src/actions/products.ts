'use server';

import { unstable_cache } from 'next/cache';
import { productService, type ProductFilters, type FilteredProductsResult } from '@/services/productService';
import type { Product } from '@/types';

// Cache TTL: 60s for listings, 120s for single products, 300s for categories
const LIST_TTL = 60;
const PRODUCT_TTL = 120;
const CATEGORY_TTL = 300;

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

export async function searchProducts(query: string): Promise<Product[]> {
  return productService.search(query);
}

export async function getCategories() {
  return cachedGetCategories();
}
