"use client";

import React from "react";
import { Search, X, Check, Globe, MapPin, Grape } from "lucide-react";
import type { Category } from "@/types";
import type { WineFilterOptions } from "@/types/filters";
import { CATEGORIES, PRICE_RANGES } from "./constants";
import { FilterSection } from "./FilterSection";
import { CheckboxItem } from "./CheckboxItem";
import { WineSelectDropdown } from "./WineSelectDropdown";

export interface FilterContentProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isCategoryOpen: boolean;
  setIsCategoryOpen: (value: boolean) => void;
  selectedCategory: Category;
  handleCategorySelect: (slug: string) => void;
  isPriceOpen: boolean;
  setIsPriceOpen: (value: boolean) => void;
  priceFilters: string[];
  togglePrice: (id: string) => void;
  isOriginOpen: boolean;
  setIsOriginOpen: (value: boolean) => void;
  availableOrigins: { origin: string; count: number }[];
  selectedOrigins: string[];
  toggleOrigin: (origin: string) => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  isAdult: boolean;
  // Wine cascade filters
  isWineFiltersOpen: boolean;
  setIsWineFiltersOpen: (value: boolean) => void;
  wineFilterOptions: WineFilterOptions;
  selectedCountry: string | null;
  setSelectedCountry: (value: string | null) => void;
  selectedRegion: string | null;
  setSelectedRegion: (value: string | null) => void;
  selectedGrape: string | null;
  setSelectedGrape: (value: string | null) => void;
  showWineFilters: boolean;
}

export const FilterContent: React.FC<FilterContentProps> = ({
  searchQuery,
  setSearchQuery,
  isCategoryOpen,
  setIsCategoryOpen,
  selectedCategory,
  handleCategorySelect,
  isPriceOpen,
  setIsPriceOpen,
  priceFilters,
  togglePrice,
  isOriginOpen,
  setIsOriginOpen,
  availableOrigins,
  selectedOrigins,
  toggleOrigin,
  hasActiveFilters,
  clearAllFilters,
  isAdult,
  // Wine cascade filters
  isWineFiltersOpen,
  setIsWineFiltersOpen,
  wineFilterOptions,
  selectedCountry,
  setSelectedCountry,
  selectedRegion,
  setSelectedRegion,
  selectedGrape,
  setSelectedGrape,
  showWineFilters,
}) => (
  <>
    {/* Search */}
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          aria-label="Szukaj produktów"
          placeholder="Szukaj produktów..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-brand-50 border border-brand-100 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none transition-all placeholder:text-brand-400"
        />
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="Wyczyść wyszukiwanie"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-brand-200 flex items-center justify-center hover:bg-brand-300 transition-colors"
          >
            <X size={12} aria-hidden="true" className="text-brand-600" />
          </button>
        )}
      </div>
    </div>

    {/* Clear All */}
    {hasActiveFilters && (
      <button
        onClick={clearAllFilters}
        className="w-full text-center text-xs font-bold uppercase tracking-wider text-brand-700 hover:text-brand-700 mb-4 py-2 border border-brand-200 rounded-lg hover:bg-brand-50 transition-all"
      >
        Wyczyść filtry
      </button>
    )}

    {/* Categories */}
    <FilterSection
      title="Kategorie"
      isOpen={isCategoryOpen}
      onToggle={() => setIsCategoryOpen(!isCategoryOpen)}
    >
      <div className="space-y-1 pt-1">
        {CATEGORIES.filter(c => isAdult || c.id !== 'wino').map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              handleCategorySelect(cat.id === "all" ? "" : cat.slug)
            }
            className={`
              w-full text-left py-2.5 px-3 rounded-lg text-sm transition-all flex items-center gap-3
              ${
                selectedCategory === cat.id
                  ? "bg-brand-900 text-white font-medium"
                  : "text-brand-600 hover:bg-brand-50 hover:text-brand-900"
              }
            `}
          >
            <span
              className={
                selectedCategory === cat.id ? "text-brand-300" : "text-brand-400"
              }
            >
              {cat.icon}
            </span>
            {cat.name}
            {selectedCategory === cat.id && (
              <Check size={14} className="ml-auto" />
            )}
          </button>
        ))}
      </div>
    </FilterSection>

    {/* Price */}
    <FilterSection
      title="Cena"
      isOpen={isPriceOpen}
      onToggle={() => setIsPriceOpen(!isPriceOpen)}
    >
      <div className="flex flex-col pt-1">
        {PRICE_RANGES.map((range) => (
          <CheckboxItem
            key={range.id}
            label={range.label}
            checked={priceFilters.includes(range.id)}
            onChange={() => togglePrice(range.id)}
          />
        ))}
      </div>
    </FilterSection>

    {/* Origin — counts now come from the database! */}
    {availableOrigins.length > 0 && (
      <FilterSection
        title="Pochodzenie"
        isOpen={isOriginOpen}
        onToggle={() => setIsOriginOpen(!isOriginOpen)}
      >
        <div className="flex flex-col pt-1 max-h-52 overflow-y-auto wine-filter-scroll">
          {availableOrigins.map((item) => (
            <CheckboxItem
              key={item.origin}
              label={item.origin}
              checked={selectedOrigins.includes(item.origin)}
              onChange={() => toggleOrigin(item.origin)}
              count={item.count}
            />
          ))}
        </div>
      </FilterSection>
    )}

    {/* Wine Cascading Filters — Country -> Region -> Grape */}
    {showWineFilters && (
      <FilterSection
        title="Filtry win"
        isOpen={isWineFiltersOpen}
        onToggle={() => setIsWineFiltersOpen(!isWineFiltersOpen)}
      >
        <div className="flex flex-col gap-6 pt-2">
          <WineSelectDropdown
            label="Kraj"
            icon={<Globe size={13} />}
            placeholder="Wybierz kraj..."
            options={wineFilterOptions.countries}
            value={selectedCountry}
            onChange={setSelectedCountry}
          />

          <WineSelectDropdown
            label="Region"
            icon={<MapPin size={13} />}
            placeholder="Wybierz region..."
            options={wineFilterOptions.regions}
            value={selectedRegion}
            onChange={setSelectedRegion}
            disabled={!selectedCountry}
          />

          <WineSelectDropdown
            label="Szczep"
            icon={<Grape size={13} />}
            placeholder="Wybierz szczep..."
            options={wineFilterOptions.grapes}
            value={selectedGrape}
            onChange={setSelectedGrape}
            disabled={!selectedCountry}
          />
        </div>
      </FilterSection>
    )}
  </>
);
