"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { getFilteredProducts } from "@/actions/products";
import { Product, Category } from "@/types";
import type { FilteredProductsResult, PriceRange, WineFilterOptions } from "@/types/filters";
import {
  Search,
  X,
  Grid2X2,
  LayoutList,
  Filter,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

import type { SortOption, ViewMode } from "./constants";
import { CATEGORIES, PRICE_RANGES } from "./constants";
import { useDebounce } from "./useDebounce";
import { FilterChip } from "./FilterChip";
import { ProductCard } from "./ProductCard";
import { SortDropdown } from "./SortDropdown";
import { FilterContent } from "./FilterContent";

// ============================================
// MAIN COMPONENT
// ============================================

export interface ShopClientProps {
  initialData?: FilteredProductsResult;
}

export const ShopClient = ({ initialData }: ShopClientProps) => {
  const router = useRouter();
  const params = useParams();
  const categorySlug = params.category as string | undefined;

  // ── Server data ──
  const [filteredResult, setFilteredResult] = useState<FilteredProductsResult>(
    initialData || {
      products: [],
      totalCount: 0,
      availableOrigins: [],
      priceRange: { min: 0, max: 0 },
      wineFilterOptions: { countries: [], regions: [], grapes: [] },
    }
  );
  const [isLoading, setIsLoading] = useState(!initialData);

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);

  // ── Wine cascading filter state ──
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedGrape, setSelectedGrape] = useState<string | null>(null);

  // ── UI state ──
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isOriginOpen, setIsOriginOpen] = useState(true);
  const [isWineFiltersOpen, setIsWineFiltersOpen] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // ── Category from URL ──
  const initialCategory = useMemo(() => {
    if (!categorySlug) return "all" as Category;
    const found = CATEGORIES.find((c) => c.slug === categorySlug);
    return (found?.id || "all") as Category;
  }, [categorySlug]);

  const [selectedCategory, setSelectedCategory] = useState<Category>(initialCategory);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // ── Age verification ──
  const [isAdult, setIsAdult] = useState(false);

  useEffect(() => {
    const checkAge = () => {
      const verified = localStorage.getItem("age-verified");
      setIsAdult(verified === "true");
    };
    checkAge();

    const handleStorageChange = () => checkAge();
    window.addEventListener("age-verification-changed", handleStorageChange);
    return () => window.removeEventListener("age-verification-changed", handleStorageChange);
  }, []);

  // ── Debounce search (300ms delay) ──
  const debouncedSearch = useDebounce(searchQuery, 300);

  const activeCategoryConfig = useMemo(
    () => CATEGORIES.find((c) => c.id === selectedCategory),
    [selectedCategory]
  );

  const filteredCategories = CATEGORIES;

  // ── BUILD FILTERS & FETCH FROM DB ──
  // This is the core — every filter change triggers a new DB query
  // Skip the first fetch if initialData was provided by the server
  const isInitialRender = useRef(!!initialData);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const fetchFiltered = async () => {
      setIsLoading(true);
      try {
        // Convert price filter IDs to PriceRange objects for the DB query
        const priceRanges: PriceRange[] = priceFilters
          .map(id => {
            const range = PRICE_RANGES.find(r => r.id === id);
            if (!range) return null;
            return { min: range.min, max: range.max === Infinity ? 999999 : range.max };
          })
          .filter(Boolean) as PriceRange[];

        const result = await getFilteredProducts({
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          search: debouncedSearch || undefined,
          sort: sortOption,
          priceRanges: priceRanges.length > 0 ? priceRanges : undefined,
          origins: selectedOrigins.length > 0 ? selectedOrigins : undefined,
          // Wine cascading filters
          originCountry: selectedCountry || undefined,
          originRegion: selectedRegion || undefined,
          grapeVariety: selectedGrape || undefined,
        });

        setFilteredResult(result);
      } catch (error) {
        console.error("Failed to load filtered products", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiltered();
  }, [selectedCategory, debouncedSearch, sortOption, priceFilters, selectedOrigins, selectedCountry, selectedRegion, selectedGrape]);

  // ── Derived values from server response (memoized) ──
  const filteredProducts = useMemo(
    () => filteredResult.products.filter(p => !p.isArchived),
    [filteredResult.products]
  );
  const availableOrigins = useMemo(
    () => filteredResult.availableOrigins,
    [filteredResult.availableOrigins]
  );
  const wineFilterOptions: WineFilterOptions = useMemo(
    () => filteredResult.wineFilterOptions || { countries: [], regions: [], grapes: [] },
    [filteredResult.wineFilterOptions]
  );

  // Show wine filters when viewing wine category OR when wine filter options have data
  const showWineFilters = useMemo(
    () => (selectedCategory === 'wino' || selectedCategory === 'all') && wineFilterOptions.countries.length > 0,
    [selectedCategory, wineFilterOptions.countries.length]
  );

  // ── Handlers ──
  const togglePrice = useCallback((id: string) => {
    setPriceFilters((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const toggleOrigin = useCallback((origin: string) => {
    setSelectedOrigins((prev) =>
      prev.includes(origin)
        ? prev.filter((o) => o !== origin)
        : [...prev, origin]
    );
  }, []);

  // ── Wine cascade handlers ──
  // When country changes, reset region and grape
  const handleCountryChange = useCallback((value: string | null) => {
    setSelectedCountry(value);
    setSelectedRegion(null);
    setSelectedGrape(null);
  }, []);

  // When region changes, reset grape
  const handleRegionChange = useCallback((value: string | null) => {
    setSelectedRegion(value);
    setSelectedGrape(null);
  }, []);

  const handleGrapeChange = useCallback((value: string | null) => {
    setSelectedGrape(value);
  }, []);

  const clearAllFilters = useCallback(() => {
    setPriceFilters([]);
    setSelectedOrigins([]);
    setSearchQuery("");
    setSelectedCategory("all");
    // Clear wine cascading filters
    setSelectedCountry(null);
    setSelectedRegion(null);
    setSelectedGrape(null);
  }, []);

  const { addToCart } = useCart();

  const handleCategorySelect = useCallback((slug: string) => {
    const found = CATEGORIES.find((c) => c.slug === slug);
    setSelectedCategory((found?.id || "all") as Category);
  }, []);

  const hasActiveFilters = useMemo(
    () => priceFilters.length > 0 || selectedOrigins.length > 0 || searchQuery.length > 0 ||
      selectedCountry !== null || selectedRegion !== null || selectedGrape !== null,
    [priceFilters.length, selectedOrigins.length, searchQuery.length, selectedCountry, selectedRegion, selectedGrape]
  );

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Header */}
      <div className="relative bg-brand-950 text-white pt-24 pb-14 md:pt-32 md:pb-18 overflow-hidden">
        {/* Category-aware background image */}
        {selectedCategory === "wino" && (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2000&auto=format&fit=crop"
                alt=""
                fill
                className="object-cover opacity-20"
                sizes="100vw"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-950/50 via-brand-950/80 to-brand-950 z-[1]" />
          </>
        )}
        {selectedCategory === "kawa" && (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=2000&auto=format&fit=crop"
                alt=""
                fill
                className="object-cover opacity-15"
                sizes="100vw"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-950/50 via-brand-950/80 to-brand-950 z-[1]" />
          </>
        )}

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="mb-10">
            <span className="block text-[11px] uppercase tracking-[0.3em] text-white/25 font-medium mb-6 animate-fade-in-up">
              Sklep
            </span>

            <h1
              key={selectedCategory}
              className="text-5xl md:text-6xl lg:text-7xl font-serif mb-5 leading-[0.95] animate-fade-in-up"
            >
              {activeCategoryConfig?.name || "Sklep"}
            </h1>

            <p className="text-white/35 max-w-lg text-base leading-relaxed animate-fade-in-up delay-100">
              {selectedCategory === "wino"
                ? "Wyselekcjonowane wina z Włoch i Hiszpanii. Od małych, rodzinnych winiarzy."
                : selectedCategory === "kawa"
                ? "Świeżo palona kawa specialty z najlepszych plantacji."
                : selectedCategory === "slodycze"
                ? "Tradycyjne włoskie słodycze i czekolady rzemieślnicze."
                : selectedCategory === "spizarnia"
                ? "Oliwy extra virgin, przetwory, makarony i przysmaki z Południa."
                : "Ponad 300 wyselekcjonowanych włoskich i hiszpańskich specjałów."}
            </p>
          </div>

          {/* Divider */}
          <div className="origin-left h-px bg-white/10 mb-8 animate-scale-x-left" />

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.slug)}
                aria-pressed={selectedCategory === cat.id}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border animate-fade-in-up
                  ${
                    selectedCategory === cat.id
                      ? "bg-white text-brand-900 border-white"
                      : "bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-white/[0.08] hover:border-white/15 hover:text-white/80"
                  }
                `}
                style={{ animationDelay: `${200 + i * 40}ms` }}
              >
                <span aria-hidden="true" className="opacity-60">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Mobile Filter Overlay */}
          {isMobileFiltersOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
              <aside
                id="mobile-filters-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-filters-title"
                className="fixed inset-y-0 left-0 w-80 bg-white z-50 p-6 overflow-y-auto lg:hidden animate-[slide-in-left_0.3s_ease-out]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 id="mobile-filters-title" className="font-serif text-2xl text-brand-900">
                    Filtry
                  </h2>
                  <button
                    onClick={() => setIsMobileFiltersOpen(false)}
                    aria-label="Zamknij filtry"
                    className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition-colors"
                  >
                    <X size={20} aria-hidden="true" className="text-brand-700" />
                  </button>
                </div>

                {/* Mobile Filter Content */}
                <FilterContent
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  isCategoryOpen={isCategoryOpen}
                  setIsCategoryOpen={setIsCategoryOpen}
                  selectedCategory={selectedCategory}
                  handleCategorySelect={handleCategorySelect}
                  isPriceOpen={isPriceOpen}
                  setIsPriceOpen={setIsPriceOpen}
                  priceFilters={priceFilters}
                  isAdult={isAdult}
                  togglePrice={togglePrice}
                  isOriginOpen={isOriginOpen}
                  setIsOriginOpen={setIsOriginOpen}
                  availableOrigins={availableOrigins}
                  selectedOrigins={selectedOrigins}
                  toggleOrigin={toggleOrigin}
                  hasActiveFilters={hasActiveFilters}
                  clearAllFilters={clearAllFilters}
                  isWineFiltersOpen={isWineFiltersOpen}
                  setIsWineFiltersOpen={setIsWineFiltersOpen}
                  wineFilterOptions={wineFilterOptions}
                  selectedCountry={selectedCountry}
                  setSelectedCountry={handleCountryChange}
                  selectedRegion={selectedRegion}
                  setSelectedRegion={handleRegionChange}
                  selectedGrape={selectedGrape}
                  setSelectedGrape={handleGrapeChange}
                  showWineFilters={showWineFilters}
                />
              </aside>
            </>
          )}

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0 self-start sticky top-28">
            <div data-lenis-prevent className="max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain filter-sidebar-scroll px-1 pb-8">
              <FilterContent
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isCategoryOpen={isCategoryOpen}
                setIsCategoryOpen={setIsCategoryOpen}
                selectedCategory={selectedCategory}
                handleCategorySelect={handleCategorySelect}
                isPriceOpen={isPriceOpen}
                setIsPriceOpen={setIsPriceOpen}
                priceFilters={priceFilters}
                isAdult={isAdult}
                togglePrice={togglePrice}
                isOriginOpen={isOriginOpen}
                setIsOriginOpen={setIsOriginOpen}
                availableOrigins={availableOrigins}
                selectedOrigins={selectedOrigins}
                toggleOrigin={toggleOrigin}
                hasActiveFilters={hasActiveFilters}
                clearAllFilters={clearAllFilters}
                isWineFiltersOpen={isWineFiltersOpen}
                setIsWineFiltersOpen={setIsWineFiltersOpen}
                wineFilterOptions={wineFilterOptions}
                selectedCountry={selectedCountry}
                setSelectedCountry={handleCountryChange}
                selectedRegion={selectedRegion}
                setSelectedRegion={handleRegionChange}
                selectedGrape={selectedGrape}
                setSelectedGrape={handleGrapeChange}
                showWineFilters={showWineFilters}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden flex items-center gap-2 text-sm font-medium text-brand-700 bg-brand-50 px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  aria-expanded={isMobileFiltersOpen}
                  aria-controls="mobile-filters-panel"
                >
                  <Filter size={16} aria-hidden="true" /> Filtry
                </button>

                <p className="text-sm text-brand-700">
                  <span className="font-bold text-brand-900">
                    {filteredResult.totalCount}
                  </span>{" "}
                  {filteredResult.totalCount === 1 ? "produkt" : "produkt\u00f3w"}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <SortDropdown current={sortOption} onChange={setSortOption} />

                <div className="hidden sm:flex items-center border border-brand-200 rounded-lg p-1 bg-brand-50">
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Widok siatki"
                    aria-pressed={viewMode === "grid"}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === "grid"
                        ? "bg-white text-brand-900 shadow-sm"
                        : "text-brand-400 hover:text-brand-700"
                    }`}
                  >
                    <Grid2X2 size={16} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="Widok listy"
                    aria-pressed={viewMode === "list"}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === "list"
                        ? "bg-white text-brand-900 shadow-sm"
                        : "text-brand-400 hover:text-brand-700"
                    }`}
                  >
                    <LayoutList size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-6 animate-fade-in">
                {priceFilters.map((id) => (
                  <FilterChip
                    key={id}
                    label={PRICE_RANGES.find((r) => r.id === id)?.label || id}
                    onRemove={() => togglePrice(id)}
                  />
                ))}
                {selectedOrigins.map((origin) => (
                  <FilterChip
                    key={origin}
                    label={origin}
                    onRemove={() => toggleOrigin(origin)}
                  />
                ))}
                {selectedCountry && (
                  <FilterChip
                    label={`Kraj: ${selectedCountry}`}
                    onRemove={() => handleCountryChange(null)}
                  />
                )}
                {selectedRegion && (
                  <FilterChip
                    label={`Region: ${selectedRegion}`}
                    onRemove={() => handleRegionChange(null)}
                  />
                )}
                {selectedGrape && (
                  <FilterChip
                    label={`Szczep: ${selectedGrape}`}
                    onRemove={() => handleGrapeChange(null)}
                  />
                )}
                {searchQuery && (
                  <FilterChip
                    label={`"${searchQuery}"`}
                    onRemove={() => setSearchQuery("")}
                  />
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-brand-700 hover:text-brand-700 underline underline-offset-2 px-2"
                >
                  Wyczyść wszystko
                </button>
              </div>
            )}

            {/* Products Grid */}
            <div className="min-h-[70vh]">
              {isLoading ? (
                <div
                  role="status"
                  aria-label="Ładowanie produktów"
                  className={`animate-fade-in ${
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                      : "flex flex-col gap-4"
                  }`}
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      {viewMode === "grid" ? (
                        <>
                          <div className="bg-brand-100 rounded-2xl aspect-[3/4] mb-4" />
                          <div className="h-3 bg-brand-100 rounded w-1/3 mb-2" />
                          <div className="h-5 bg-brand-100 rounded w-3/4 mb-2" />
                          <div className="h-4 bg-brand-100 rounded w-1/4" />
                        </>
                      ) : (
                        <div className="flex gap-6 p-5 bg-white rounded-2xl border border-brand-100">
                          <div className="w-36 h-36 bg-brand-100 rounded-xl" />
                          <div className="flex-1 py-2">
                            <div className="h-3 bg-brand-100 rounded w-1/4 mb-3" />
                            <div className="h-6 bg-brand-100 rounded w-2/3 mb-3" />
                            <div className="h-4 bg-brand-100 rounded w-full mb-4" />
                            <div className="h-5 bg-brand-100 rounded w-1/4" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-brand-100 animate-fade-in-up">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-100 flex items-center justify-center">
                    <Search size={32} className="text-brand-400" />
                  </div>
                  <h3 className="text-2xl font-serif text-brand-900 mb-2">
                    Brak wyników
                  </h3>
                  <p className="text-brand-700 mb-8 max-w-md mx-auto">
                    Nie znaleźliśmy produktów spełniających Twoje kryteria. Spróbuj
                    zmienić filtry lub wyszukać coś innego.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-8 py-3 bg-brand-900 text-white text-sm font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 transition-all inline-flex items-center gap-2"
                  >
                    Wyczyść filtry
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className={`animate-fade-in ${
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14"
                      : "flex flex-col gap-4"
                  }`}
                >
                  {filteredProducts.map((product, idx) => (
                    <ProductCard
                      key={product.sku}
                      product={product}
                      viewMode={viewMode}
                      onQuickAdd={() => addToCart(product)}
                      index={idx}
                      isAdult={isAdult}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
