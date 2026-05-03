import { db } from '@/db';
import { products, categories, DbProduct } from '@/db/schema';
import { eq, desc, asc, and, ilike, or, gte, lt, sql, SQL, containsLikePattern, prefixLikePattern, suffixLikePattern } from '@repo/db/orm';
import type { Product } from '@/types';
import type { SortOption, ProductFilters, FilteredProductsResult, WineFilterOptions, WineFilterOption } from '@/types/filters';
import { categoryFilterSlugs, normalizeCategorySlug } from '@/lib/categories';

// Re-export shared types for backwards compatibility
export type { SortOption, PriceRange, ProductFilters, FilteredProductsResult, WineFilterOptions, WineFilterOption } from '@/types/filters';

// ============================================
// HELPERS
// ============================================

// Suppress DB error logs during Next.js build when DATABASE_URL is not set —
// those errors are expected (no DB access at build time) and already handled
// by each method's catch block returning safe empty values.
function logDbError(label: string, error: unknown) {
  if (process.env.DATABASE_URL) console.error(label, error);
}

function normalizeUnsplashImageUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isUnsplash = hostname === 'images.unsplash.com' || hostname === 'plus.unsplash.com';

    if (!isUnsplash) {
      return rawUrl;
    }

    const widthParam = Number(parsed.searchParams.get('w') || '0');
    if (!Number.isFinite(widthParam) || widthParam < 1600) {
      parsed.searchParams.set('w', '1600');
    }

    const qualityParam = Number(parsed.searchParams.get('q') || '0');
    if (!Number.isFinite(qualityParam) || qualityParam < 90) {
      parsed.searchParams.set('q', '90');
    }

    if (!parsed.searchParams.has('auto')) {
      parsed.searchParams.set('auto', 'format');
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeProductImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return normalizeUnsplashImageUrl(imageUrl);

  if (imageUrl.startsWith('/api/uploads/image/')) {
    const key = imageUrl.replace(/^\/api\/uploads\/image\//, '');
    const mediaOrigin = (
      process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_R2_MEDIA_URL ||
      'https://media.ilbuoncaffe.pl'
    ).replace(/\/+$/, '');
    return `${mediaOrigin}/${key}`;
  }

  if (imageUrl.startsWith('/api/uploads/')) {
    const apiOrigin = (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.INTERNAL_API_URL ||
      'https://api.ilbuoncaffe.pl'
    ).replace(/\/+$/, '');
    return `${apiOrigin}${imageUrl}`;
  }

  return imageUrl;
}

function mapDbProductToProduct(dbProduct: DbProduct, categorySlug?: string): Product {
  const normalizedImageUrl = normalizeProductImageUrl(dbProduct.imageUrl);
  const normalizedCategory = normalizeCategorySlug(categorySlug);

  return {
    sku: dbProduct.sku,
    name: dbProduct.name,
    description: dbProduct.description || undefined,
    price: parseFloat(dbProduct.price),
    category: normalizedCategory || 'all',
    imageUrl: normalizedImageUrl,
    image: normalizedImageUrl,
    stock: dbProduct.stock,
    isNew: dbProduct.isNew,
    isArchived: !dbProduct.isActive,
    origin: dbProduct.origin || undefined,
    year: dbProduct.year || undefined,
    weight: dbProduct.weight || undefined,
    slug: dbProduct.slug,
    // Wine cascading fields
    originCountry: dbProduct.originCountry || undefined,
    originRegion: dbProduct.originRegion || undefined,
    grapeVariety: dbProduct.grapeVariety || undefined,
    coffeeDetails: (dbProduct.coffeeDetails as Record<string, unknown>) || undefined,
    metaTitle: dbProduct.metaTitle || undefined,
    metaDescription: dbProduct.metaDescription || undefined,
    createdAt: dbProduct.createdAt,
    updatedAt: dbProduct.updatedAt,
  };
}

// ============================================
// PRODUCT SERVICE
// ============================================

export const productService = {
  /**
   * Advanced filtered query — all filtering happens in PostgreSQL
   * Uses pg_trgm indexes for text search, composite indexes for category+price
   * Supports cascading wine filters: country → region → grape
   */
  async getFiltered(filters: ProductFilters = {}): Promise<FilteredProductsResult> {
    const {
      category,
      search,
      sort = 'featured',
      priceRanges,
      origins,
      originCountry,
      originRegion,
      grapeVariety,
      limit = 100,
      offset = 0,
    } = filters;

    try {
      // ── Build WHERE conditions ──────────────────────
      const conditions: SQL[] = [eq(products.isActive, true)];

      // Category filter — inline subquery avoids a serial round-trip before the parallel batch.
      // PostgreSQL resolves the subquery once and caches it within the query plan.
      const categorySlugs = categoryFilterSlugs(category);
      const categorySlugSql = sql.join(categorySlugs.map((slug) => sql`${slug}`), sql`, `);
      const categoryFilter = category && category !== 'all'
        ? sql`${products.categoryId} IN (SELECT id FROM categories WHERE slug IN (${categorySlugSql}))`
        : undefined;

      if (categoryFilter) {
        conditions.push(categoryFilter);
      }

      // Text search (uses products_name_trgm_idx, products_description_trgm_idx, products_origin_trgm_idx)
      if (search && search.trim()) {
        const searchTerm = containsLikePattern(search.trim());
        conditions.push(
          or(
            ilike(products.name, searchTerm),
            ilike(products.description, searchTerm),
            ilike(products.origin, searchTerm),
            ilike(products.originCountry, searchTerm),
            ilike(products.originRegion, searchTerm),
            ilike(products.grapeVariety, searchTerm)
          )!
        );
      }

      // Price range filter (uses products_price_idx / products_active_category_price_idx)
      if (priceRanges && priceRanges.length > 0) {
        const priceConditions = priceRanges.map(range => {
          if (range.max === Infinity || range.max >= 999999) {
            return gte(products.price, range.min.toString());
          }
          return and(
            gte(products.price, range.min.toString()),
            lt(products.price, range.max.toString())
          )!;
        });

        if (priceConditions.length === 1) {
          conditions.push(priceConditions[0]!);
        } else {
          conditions.push(or(...priceConditions)!);
        }
      }

      // Origin filter — legacy (uses products_origin_idx)
      if (origins && origins.length > 0) {
        const originConditions = origins.map(origin =>
          ilike(products.origin, prefixLikePattern(origin))
        );
        conditions.push(or(...originConditions)!);
      }

      // ── Wine Cascading Filters ──────────────────────
      // Country filter (level 1)
      if (originCountry) {
        conditions.push(eq(products.originCountry, originCountry));
      }
      // Region filter (level 2)
      if (originRegion) {
        conditions.push(eq(products.originRegion, originRegion));
      }
      // Grape variety filter (level 3 — uses ILIKE for comma-separated matching)
      if (grapeVariety) {
        conditions.push(ilike(products.grapeVariety, containsLikePattern(grapeVariety)));
      }

      // ── Determine ORDER BY ──────────────────────
      let orderBy;
      switch (sort) {
        case 'price-asc':
          orderBy = asc(products.price);
          break;
        case 'price-desc':
          orderBy = desc(products.price);
          break;
        case 'newest':
          orderBy = desc(products.createdAt);
          break;
        case 'featured':
        default:
          orderBy = desc(products.isFeatured);
          break;
      }

      const whereClause = and(...conditions)!;

      // ── Execute all queries in a single parallel batch ──────────────────
      const [mainResults, countResult, originsResult, priceResult, wineFilterOpts] = await Promise.all([
        // 1. Filtered + sorted + paginated products
        db
          .select({
            product: products,
            categorySlug: categories.slug,
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(whereClause)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),

        // 2. Total count for pagination
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(whereClause),

        // 3. Available origins with counts (for sidebar filter)
        // Uses base active+category conditions WITHOUT origin filter so user sees all available origins
        db
          .select({
            origin: sql<string>`split_part(${products.origin}, ',', 1)`,
            count: sql<number>`count(*)::int`,
          })
          .from(products)
          .where(and(
            eq(products.isActive, true),
            ...(categoryFilter ? [categoryFilter] : []),
            sql`${products.origin} IS NOT NULL AND ${products.origin} != ''`
          ))
          .groupBy(sql`split_part(${products.origin}, ',', 1)`)
          .orderBy(sql`split_part(${products.origin}, ',', 1)`),

        // 4. Price range for active products (for slider / info)
        db
          .select({
            minPrice: sql<number>`min(${products.price})::numeric`,
            maxPrice: sql<number>`max(${products.price})::numeric`,
          })
          .from(products)
          .where(and(
            eq(products.isActive, true),
            ...(categoryFilter ? [categoryFilter] : []),
          )),

        // 5. Wine cascading filter options
        this._getWineFilterOptions(category ?? null, originCountry, originRegion),
      ]);

      return {
        products: mainResults.map(r => mapDbProductToProduct(r.product, r.categorySlug || undefined)),
        totalCount: countResult[0]?.count ?? 0,
        availableOrigins: originsResult
          .filter(r => r.origin && r.origin.trim())
          .map(r => ({ origin: r.origin.trim(), count: r.count })),
        priceRange: {
          min: priceResult[0]?.minPrice ?? 0,
          max: priceResult[0]?.maxPrice ?? 0,
        },
        wineFilterOptions: wineFilterOpts,
      };
    } catch (error) {
      logDbError('[productService.getFiltered]', error);
      return { products: [], totalCount: 0, availableOrigins: [], priceRange: { min: 0, max: 0 } };
    }
  },

  /**
   * Get cascading wine filter options.
   * Each level only shows options that exist given the parent selection.
   * 
   * Level 1 (countries): all distinct countries for active wines
   * Level 2 (regions): distinct regions WHERE country = selected country
   * Level 3 (grapes): distinct grapes WHERE country + region match
   */
  async _getWineFilterOptions(
    categorySlug: string | null,
    selectedCountry?: string,
    selectedRegion?: string,
  ): Promise<WineFilterOptions> {
    try {
      // Base condition: active products, optionally wine category (subquery, same pattern as getFiltered)
      const categorySlugs = categoryFilterSlugs(categorySlug);
      const categorySlugSql = sql.join(categorySlugs.map((slug) => sql`${slug}`), sql`, `);
      const categoryFilter = categorySlug
        ? sql`${products.categoryId} IN (SELECT id FROM categories WHERE slug IN (${categorySlugSql}))`
        : undefined;

      const baseConds: SQL[] = [
        eq(products.isActive, true),
        sql`${products.originCountry} IS NOT NULL AND ${products.originCountry} != ''`,
      ];
      if (categoryFilter) {
        baseConds.push(categoryFilter);
      }

      // Level 1: Countries (always show all available countries)
      const countriesQuery = db
        .select({
          value: products.originCountry,
          count: sql<number>`count(*)::int`,
        })
        .from(products)
        .where(and(...baseConds))
        .groupBy(products.originCountry)
        .orderBy(products.originCountry);

      // Level 2: Regions (filtered by selected country)
      const regionConds = [...baseConds];
      if (selectedCountry) {
        regionConds.push(eq(products.originCountry, selectedCountry));
      }
      regionConds.push(sql`${products.originRegion} IS NOT NULL AND ${products.originRegion} != ''`);
      
      const regionsQuery = db
        .select({
          value: products.originRegion,
          count: sql<number>`count(*)::int`,
        })
        .from(products)
        .where(and(...regionConds))
        .groupBy(products.originRegion)
        .orderBy(products.originRegion);

      // Level 3: Grape varieties — using parameterized SQL with CROSS JOIN for proper unnest
      // Each grape in a comma-separated list gets its own row for accurate counting

      // Build WHERE conditions as parameterized SQL fragments
      const grapeConds: SQL[] = [
        sql`p.is_active = true`,
        sql`p.grape_variety IS NOT NULL AND p.grape_variety != ''`,
      ];
      if (categorySlug) {
        grapeConds.push(sql`p.category_id IN (SELECT id FROM categories WHERE slug IN (${categorySlugSql}))`);
      }
      if (selectedCountry) {
        grapeConds.push(sql`p.origin_country = ${selectedCountry}`);
      }
      if (selectedRegion) {
        grapeConds.push(sql`p.origin_region = ${selectedRegion}`);
      }

      // Combine conditions with AND
      const grapeWhereClause = grapeConds.reduce((acc, cond, idx) =>
        idx === 0 ? cond : sql`${acc} AND ${cond}`
      );

      // Proper unnest via CROSS JOIN — each grape gets its own row,
      // so "Monastrell, Syrah" becomes two rows and count is accurate per grape
      const grapesRawQuery = sql`
        SELECT trim(g.grape) AS value, count(*)::int AS count
        FROM products p
        CROSS JOIN unnest(string_to_array(p.grape_variety, ',')) AS g(grape)
        WHERE ${grapeWhereClause}
        GROUP BY trim(g.grape)
        HAVING trim(g.grape) != ''
        ORDER BY trim(g.grape)
      `;

      const [countriesResult, regionsResult, grapesRawResult] = await Promise.all([
        countriesQuery,
        regionsQuery,
        db.execute(grapesRawQuery),
      ]);

      // Parse raw SQL result for grapes — handle both NeonQueryResult and array shapes
      const rawRows = (grapesRawResult as any).rows ?? grapesRawResult;
      const grapesResult = (Array.isArray(rawRows) ? rawRows : []) as { value: string; count: number }[];

      return {
        countries: countriesResult
          .filter(r => r.value && r.value.trim())
          .map(r => ({ value: r.value!.trim(), count: r.count })),
        regions: regionsResult
          .filter(r => r.value && r.value.trim())
          .map(r => ({ value: r.value!.trim(), count: r.count })),
        grapes: grapesResult
          .filter(r => r.value && r.value.trim())
          .map(r => ({ value: r.value.trim(), count: Number(r.count) })),
      };
    } catch (error) {
      logDbError('[productService._getWineFilterOptions]', error);
      return { countries: [], regions: [], grapes: [] };
    }
  },

  /**
   * Fetch all active products (backwards compatible)
   */
  async getAll(options: { category?: string; search?: string; sort?: SortOption; limit?: number; offset?: number } = {}): Promise<Product[]> {
    const {
      category,
      search,
      sort = 'featured',
      limit,
      offset = 0,
    } = options;

    try {
      const conditions: SQL[] = [eq(products.isActive, true)];

      if (category && category !== 'all') {
        const categorySlugs = categoryFilterSlugs(category);
        const categorySlugSql = sql.join(categorySlugs.map((slug) => sql`${slug}`), sql`, `);
        conditions.push(
          sql`${products.categoryId} IN (SELECT id FROM categories WHERE slug IN (${categorySlugSql}))`
        );
      }

      if (search && search.trim()) {
        const searchTerm = containsLikePattern(search.trim());
        conditions.push(
          or(
            ilike(products.name, searchTerm),
            ilike(products.description, searchTerm),
            ilike(products.origin, searchTerm),
            ilike(products.originCountry, searchTerm),
            ilike(products.originRegion, searchTerm),
            ilike(products.grapeVariety, searchTerm)
          )!
        );
      }

      const orderBy = (() => {
        switch (sort) {
          case 'price-asc':
            return asc(products.price);
          case 'price-desc':
            return desc(products.price);
          case 'newest':
            return desc(products.createdAt);
          case 'featured':
          default:
            return desc(products.isFeatured);
        }
      })();

      const whereClause = and(...conditions)!;

      const query = db
        .select({
          product: products,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause)
        .orderBy(orderBy)
        .offset(offset);

      const results = typeof limit === 'number' ? await query.limit(limit) : await query;

      return results.map(r => mapDbProductToProduct(r.product, r.categorySlug || undefined));
    } catch (error) {
      logDbError('[productService.getAll]', error);
      return [];
    }
  },

  /**
   * Fetch products by category
   */
  async getByCategory(categorySlug: string): Promise<Product[]> {
    return this.getAll({ category: categorySlug });
  },

  /**
   * Fetch single product by SKU
   */
  async getBySku(sku: string): Promise<Product | null> {
    try {
      const results = await db
        .select({
          product: products,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.sku, sku))
        .limit(1);

      if (results.length === 0) return null;

      return mapDbProductToProduct(results[0].product, results[0].categorySlug || undefined);
    } catch (error) {
      logDbError('[productService.getBySku]', error);
      return null;
    }
  },

  /**
   * Fetch single product by slug
   * Supports both exact match and suffix match (ignoring SKU prefix)
   */
  async getBySlug(slug: string): Promise<Product | null> {
    try {
      // 1. Try exact match first
      let results = await db
        .select({
          product: products,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.slug, slug))
        .limit(1);

      // 2. If not found, try finding by suffix (e.g. "coffee" matches "001-coffee")
      if (results.length === 0) {
        results = await db
          .select({
            product: products,
            categorySlug: categories.slug,
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(ilike(products.slug, suffixLikePattern(slug))) // Suffix match
          .limit(1);
      }

      if (results.length === 0) return null;

      return mapDbProductToProduct(results[0].product, results[0].categorySlug || undefined);
    } catch (error) {
      logDbError('[productService.getBySlug]', error);
      return null;
    }
  },

  /**
   * Fetch all categories
   */
  async getCategories() {
    try {
      const results = await db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder));

      return results;
    } catch (error) {
      logDbError('[productService.getCategories]', error);
      return [];
    }
  },

  /**
   * Search products — multi-token: splits by whitespace, each token must match
   * at least one searchable field (name, description, origin, country, region, grape).
   */
  async search(query: string): Promise<Product[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const tokens = trimmed.split(/\s+/).filter((t) => t.length >= 2).slice(0, 6);
    if (tokens.length === 0) return this.getAll({ search: trimmed });

    try {
      const conditions: SQL[] = [eq(products.isActive, true)];
      for (const token of tokens) {
        const pattern = containsLikePattern(token);
        conditions.push(
          or(
            ilike(products.name, pattern),
            ilike(products.description, pattern),
            ilike(products.origin, pattern),
            ilike(products.originCountry, pattern),
            ilike(products.originRegion, pattern),
            ilike(products.grapeVariety, pattern),
            ilike(products.sku, pattern),
          )!
        );
      }

      const rows = await db
        .select({ product: products, categorySlug: categories.slug })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(products.stock), asc(products.name))
        .limit(20);

      const nameLower = trimmed.toLowerCase();
      return rows
        .map(({ product, categorySlug }) => mapDbProductToProduct(product as DbProduct, categorySlug || undefined))
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(nameLower) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(nameLower) ? 0 : 1;
          return aStarts - bStarts;
        });
    } catch (error) {
      logDbError('[productService.search]', error);
      return [];
    }
  },

  /**
   * Get featured products
   */
  async getFeatured(limit = 6): Promise<Product[]> {
    try {
      const results = await db
        .select({
          product: products,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
        .orderBy(desc(products.createdAt))
        .limit(limit);

      return results.map(r => mapDbProductToProduct(r.product, r.categorySlug || undefined));
    } catch (error) {
      logDbError('[productService.getFeatured]', error);
      return [];
    }
  },

  /**
   * Get new products
   */
  async getNew(limit = 6): Promise<Product[]> {
    try {
      const results = await db
        .select({
          product: products,
          categorySlug: categories.slug,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.isActive, true), eq(products.isNew, true)))
        .orderBy(desc(products.createdAt))
        .limit(limit);

      return results.map(r => mapDbProductToProduct(r.product, r.categorySlug || undefined));
    } catch (error) {
      logDbError('[productService.getNew]', error);
      return [];
    }
  },
};
