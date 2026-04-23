"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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

  const wordmarkText = useMemo(() => {
    switch (selectedCategory) {
      case "wino": return "Vino";
      case "kawa": return "Caffè";
      case "slodycze": return "Dolci";
      case "spizarnia": return "Dispensa";
      default: return "Sklep";
    }
  }, [selectedCategory]);

  const heroLead = useMemo(() => {
    switch (selectedCategory) {
      case "wino": return "Wyselekcjonowane wina z Włoch i Hiszpanii. Od małych, rodzinnych winiarzy.";
      case "kawa": return "Świeżo palona kawa specialty z najlepszych plantacji.";
      case "slodycze": return "Tradycyjne włoskie słodycze i czekolady rzemieślnicze.";
      case "spizarnia": return "Oliwy extra virgin, przetwory, makarony i przysmaki z Południa.";
      default: return "Ponad 300 wyselekcjonowanych włoskich i hiszpańskich specjałów.";
    }
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-[#f3eee8]">
      {/* Editorial Hero */}
      <section className="relative bg-[#f3eee8] border-b border-brand-100 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f7f2ec] via-[#f3eee8] to-[#ebe2d5]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #1c1917 0, #1c1917 1px, transparent 1px, transparent 14px)",
            }}
          />
          <div className="absolute inset-x-0 -bottom-[30%] md:-bottom-[40%] flex items-end justify-center">
            <h2
              aria-hidden="true"
              className="font-serif italic font-bold leading-none tracking-tighter text-transparent whitespace-nowrap transition-all duration-500"
              style={{
                fontSize: "clamp(14rem, 26vw, 36rem)",
                WebkitTextStroke: "1.5px rgba(163,127,91,0.18)",
              }}
            >
              {wordmarkText}
            </h2>
          </div>
          <div className="absolute top-8 right-6 md:right-12 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-brand-500/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Dostawa 24h
          </div>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-300/40 to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-6 lg:px-12 pt-24 md:pt-28 pb-12 md:pb-16">
          <div className="flex items-center gap-4 mb-10 md:mb-14">
            <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 font-medium">
              § Sklep online
            </span>
            <span className="h-px flex-1 max-w-[60px] bg-brand-300/50" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 font-medium tabular-nums">
              {filteredResult.totalCount} {filteredResult.totalCount === 1 ? "produkt" : "produktów"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <div className="overflow-hidden mb-6">
                <h1
                  key={selectedCategory}
                  className="text-[clamp(3rem,7.5vw,6rem)] font-serif text-brand-900 leading-[0.98] tracking-[-0.02em]"
                >
                  {activeCategoryConfig?.name || "Wszystko"}
                </h1>
              </div>
              <p className="text-base md:text-[17px] text-brand-600 leading-relaxed max-w-xl">
                {heroLead}
              </p>
            </div>

            <div className="lg:col-span-4 hidden lg:block">
              <p className="font-serif italic text-brand-700 text-lg leading-snug">
                Prosto od producentów z Włoch i Hiszpanii — zamawiasz dziś, jutro u Ciebie.
              </p>
            </div>
          </div>

          {/* Category nav */}
          <div className="mt-14 md:mt-20 border-t border-brand-200/60 pt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brand-500 font-semibold">
              Kategorie —
            </span>
            {filteredCategories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.slug)}
                  aria-pressed={active}
                  className={`group relative text-[12px] uppercase tracking-[0.18em] font-semibold transition-colors duration-200 pb-1 ${
                    active
                      ? "text-brand-900 border-b-2 border-brand-900"
                      : "text-brand-500 hover:text-brand-900 border-b border-transparent"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Mobile Filter Overlay */}
          {isMobileFiltersOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
              <aside
                id="mobile-filters-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-filters-title"
                className="fixed inset-y-0 left-0 w-80 bg-[#f7f2ec]  z-50 p-6 overflow-y-auto lg:hidden border-r border-brand-200 "
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 id="mobile-filters-title" className="font-serif text-2xl text-brand-900 ">
                    Filtry
                  </h2>
                  <button
                    onClick={() => setIsMobileFiltersOpen(false)}
                    aria-label="Zamknij filtry"
                    className="w-10 h-10 border border-brand-200  flex items-center justify-center hover:bg-brand-200/50 :bg-white/5 transition-colors"
                  >
                    <X size={18} aria-hidden="true" className="text-brand-700 " />
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-brand-200/60  pb-4">
              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-900  border-b border-brand-300  hover:border-brand-900 :border-white transition-colors pb-1"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  aria-expanded={isMobileFiltersOpen}
                  aria-controls="mobile-filters-panel"
                >
                  <Filter size={14} aria-hidden="true" /> Filtry
                </button>

                <p className="text-[11px] uppercase tracking-[0.22em] text-brand-500  font-medium tabular-nums">
                  <span className="font-bold text-brand-900  font-serif text-base normal-case tracking-normal">
                    {filteredResult.totalCount}
                  </span>{" "}
                  {filteredResult.totalCount === 1 ? "produkt" : "produkt\u00f3w"}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <SortDropdown current={sortOption} onChange={setSortOption} />

                <div className="hidden sm:flex items-center border border-brand-200  bg-white/50 ">
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Widok siatki"
                    aria-pressed={viewMode === "grid"}
                    className={`p-2.5 transition-colors ${
                      viewMode === "grid"
                        ? "bg-brand-900  text-white "
                        : "text-brand-400  hover:text-brand-700 :text-white"
                    }`}
                  >
                    <Grid2X2 size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="Widok listy"
                    aria-pressed={viewMode === "list"}
                    className={`p-2.5 transition-colors ${
                      viewMode === "list"
                        ? "bg-brand-900  text-white "
                        : "text-brand-400  hover:text-brand-700 :text-white"
                    }`}
                  >
                    <LayoutList size={14} aria-hidden="true" />
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
                  className={`${
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                      : "flex flex-col gap-4"
                  }`}
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      {viewMode === "grid" ? (
                        <>
                          <div className="bg-brand-200/50  aspect-[3/4] mb-4" />
                          <div className="h-3 bg-brand-200/50  w-1/3 mb-2" />
                          <div className="h-5 bg-brand-200/50  w-3/4 mb-2" />
                          <div className="h-4 bg-brand-200/50  w-1/4" />
                        </>
                      ) : (
                        <div className="flex gap-6 p-5 border border-brand-200/60  bg-white/40 ">
                          <div className="w-36 h-36 bg-brand-200/50 " />
                          <div className="flex-1 py-2">
                            <div className="h-3 bg-brand-200/50  w-1/4 mb-3" />
                            <div className="h-6 bg-brand-200/50  w-2/3 mb-3" />
                            <div className="h-4 bg-brand-200/50  w-full mb-4" />
                            <div className="h-5 bg-brand-200/50  w-1/4" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-24 text-center border border-brand-200/60  bg-white/40 ">
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-brand-500  font-medium mb-6">
                    <Search size={14} aria-hidden="true" /> Brak wyników
                  </div>
                  <h3 className="font-serif text-3xl md:text-4xl text-brand-900  mb-4 tracking-[-0.01em]">
                    Nic nie pasuje <span className="italic text-brand-700 ">do filtrów</span>
                  </h3>
                  <p className="text-brand-600  mb-10 max-w-md mx-auto leading-relaxed">
                    Spróbuj zmienić kryteria albo wyczyść filtry, żeby zobaczyć całą ofertę.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="group inline-flex items-center gap-3 bg-brand-900  text-white  pl-7 pr-5 py-4 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-brand-700 :bg-brand-100 transition-colors"
                  >
                    Wyczyść filtry
                    <span className="w-px h-5 bg-white/20  mx-1" />
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                </div>
              ) : (
                <div
                  className={`${
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
