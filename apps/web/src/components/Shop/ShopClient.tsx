"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { getFilteredProducts } from "@/actions/products";
import { Product, Category } from "@/types";
import type { FilteredProductsResult, PriceRange, WineFilterOptions } from "@/types/filters";
import {
  Search,
  X,
  ChevronDown,
  Plus,
  Check,
  Grid2X2,
  LayoutList,
  Filter,
  Heart,
  Star,
  Sparkles,
  ArrowRight,
  Coffee,
  Wine,
  Cookie,
  ShoppingBag,
  Grape,
  MapPin,
  Globe,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

// ============================================
// TYPES & CONSTANTS
// ============================================

type SortOption = "featured" | "price-asc" | "price-desc" | "newest";
type ViewMode = "grid" | "list";

interface CategoryConfig {
  id: Category;
  name: string;
  slug: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "all", name: "Wszystko", slug: "", icon: <Sparkles size={18} /> },
  { id: "kawa", name: "Kawa", slug: "kawa", icon: <Coffee size={18} /> },
  { id: "wino", name: "Wina", slug: "wino", icon: <Wine size={18} /> },
  { id: "slodycze", name: "Słodycze", slug: "slodycze", icon: <Cookie size={18} /> },
  { id: "spizarnia", name: "Delikatesy", slug: "spizarnia", icon: <ShoppingBag size={18} /> },
];

const PRICE_RANGES = [
  { id: "0-50", label: "Do 50 zł", min: 0, max: 50 },
  { id: "50-100", label: "50 - 100 zł", min: 50, max: 100 },
  { id: "100-200", label: "100 - 200 zł", min: 100, max: 200 },
  { id: "200+", label: "Powyżej 200 zł", min: 200, max: Infinity },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Polecane" },
  { value: "newest", label: "Najnowsze" },
  { value: "price-asc", label: "Cena: rosnąco" },
  { value: "price-desc", label: "Cena: malejąco" },
];

// ============================================
// DEBOUNCE HOOK
// ============================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// SUBCOMPONENTS
// ============================================

const FilterSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, children }) => {
  const sectionId = `filter-section-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  const [isAnimating, setIsAnimating] = useState(false);
  return (
  <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-brand-100 hover:shadow-md transition-shadow">
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={sectionId}
      className="flex items-center justify-between w-full group outline-none"
    >
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 group-hover:text-brand-900 transition-colors">
        {title}
      </h3>
      <div 
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isOpen ? "bg-brand-50" : "group-hover:bg-brand-50"
        }`}
      >
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-brand-400 group-hover:text-brand-700 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>
    </button>

    <motion.div
      id={sectionId}
      initial={false}
      animate={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
        marginTop: isOpen ? 16 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
      className={isAnimating ? "overflow-hidden" : ""}
    >
      {children}
    </motion.div>
  </div>
);
};

const CheckboxItem: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = ({ label, checked, onChange, count }) => (
  <label
    className="flex items-center gap-3 cursor-pointer group mb-1.5 select-none py-1.5 px-2 rounded-lg hover:bg-brand-50 transition-colors focus-within:ring-2 focus-within:ring-brand-700"
  >
    <input 
        type="checkbox" 
        className="sr-only" 
        checked={checked} 
        onChange={onChange}
    />
    <div
      className={`
      w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all duration-300
      ${
        checked
          ? "bg-brand-800 border-brand-800 scale-100"
          : "bg-white border-brand-300 group-hover:border-brand-700"
      }
    `}
    >
      {checked && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Check size={12} className="text-white" strokeWidth={3} />
        </motion.div>
      )}
    </div>
    <span
      className={`text-sm transition-colors flex-1 ${
        checked
          ? "text-brand-900 font-medium"
          : "text-brand-600 group-hover:text-brand-900"
      }`}
    >
      {label}
    </span>
    {count !== undefined && (
      <span className="text-xs text-brand-400 tabular-nums bg-brand-100 px-2 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </label>
);

const FilterChip: React.FC<{
  label: string;
  onRemove: () => void;
}> = ({ label, onRemove }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    onClick={onRemove}
    aria-label={`Usu\u0144 filtr: ${label}`}
    className="inline-flex items-center bg-white border border-brand-200 text-brand-700 shadow-sm rounded-full px-4 py-1.5 text-xs font-medium hover:border-brand-900 hover:text-brand-900 transition-all gap-2"
  >
    {label}
    <X size={12} aria-hidden="true" />
  </motion.button>
);

// ============================================
// WINE CASCADE FILTER — CUSTOM SELECT DROPDOWNS
// ============================================

const WineSelectDropdown: React.FC<{
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  options: { value: string; count: number }[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}> = ({ label, icon, placeholder, options, value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (disabled) {
    return (
      <div className="opacity-40 pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-400 mb-2 flex items-center gap-2">
          {icon}
          {label}
        </div>
        <div className="w-full border border-dashed border-brand-200 rounded-xl py-3 px-4 text-sm text-brand-300 bg-brand-50/30">
          Wybierz kraj
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </div>

      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={value ? `${label}: ${value}` : `${label}: ${placeholder}`}
        className={`
          w-full flex items-center justify-between gap-2 border rounded-xl py-3 px-4 text-sm transition-all duration-300
          ${isOpen
            ? "border-brand-900 ring-4 ring-brand-900/10 bg-white"
            : value
              ? "border-brand-300 bg-white hover:border-brand-500 shadow-sm"
              : "border-brand-100 bg-brand-50/50 backdrop-blur-sm hover:border-brand-300 hover:bg-white"
          }
        `}
      >
        <span className={value ? "text-brand-900 font-medium" : "text-brand-400"}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Wyczyść ${label}`}
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onChange(null); setIsOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(null); setIsOpen(false); } }}
              className="w-5 h-5 rounded-full bg-brand-100 hover:bg-brand-200 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            >
              <X size={10} className="text-brand-700" />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-brand-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-brand-200 rounded-xl shadow-xl shadow-brand-900/8 overflow-hidden"
          >
            <div role="listbox" aria-label={label} className="max-h-[200px] overflow-y-auto wine-filter-scroll py-1">
              {options.length === 0 ? (
                <p className="text-xs text-brand-600 text-center py-6">Brak opcji</p>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={value === opt.value}
                    onClick={() => {
                      onChange(value === opt.value ? null : opt.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                      ${value === opt.value
                        ? "bg-brand-900 text-white"
                        : "text-brand-700 hover:bg-brand-50"
                      }
                    `}
                  >
                    <span>{opt.value}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] tabular-nums ${value === opt.value ? "text-brand-300" : "text-brand-400"}`}>
                        {opt.count}
                      </span>
                      {value === opt.value && <Check size={13} aria-hidden="true" className="text-white" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductCard: React.FC<{
  product: Product;
  viewMode: ViewMode;
  onQuickAdd: () => void;
  categorySlug: string;
  index: number;
  isAdult: boolean;
}> = ({ product, viewMode, onQuickAdd, categorySlug, index, isAdult }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Check if product is restricted
  const isRestricted = product.category === 'wino' && !isAdult;

  const handleRestrictedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new Event("open-age-verification"));
  };

  const productSlug = product.name
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/[^a-z0-9\s-]/g, "") // remove other special chars
    .trim()
    .replace(/\s+/g, "-");
  const productUrl = `/sklep/${categorySlug || "wszystko"}/${productSlug}`;

  const imageUrl =
    product.imageUrl ||
    product.image ||
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600";
  
  // Custom restricted overlay component
  const RestrictedOverlay = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-50/60 backdrop-blur-sm rounded-2xl border border-brand-200/50 p-4 text-center transition-all duration-300 group-hover:bg-brand-50/40">
      <div className="w-12 h-12 rounded-full bg-brand-900 text-white flex items-center justify-center mb-3 shadow-lg">
        <span className="font-serif font-bold text-lg">18+</span>
      </div>
      <p className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-2">
        Treść dostępna dla pełnoletnich
      </p>
      <button 
        className="text-[10px] underline text-brand-600 hover:text-brand-900 transition-colors"
      >
        Potwierdź wiek
      </button>
    </div>
  );

  if (viewMode === "list") {
    return (
      <div
        onClick={isRestricted ? handleRestrictedClick : () => router.push(productUrl)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex gap-6 p-5 bg-white rounded-2xl hover:shadow-xl transition-all duration-500 cursor-pointer border border-brand-100 hover:border-brand-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isRestricted) handleRestrictedClick(e as any);
            else router.push(productUrl);
          }
        }}
      >
        {isRestricted && <RestrictedOverlay />}
        
        <div 
          className={`w-36 h-36 rounded-xl flex-shrink-0 bg-gradient-to-b from-brand-50 to-brand-100/50 relative transition-all duration-300 group-hover:shadow-lg ${isRestricted ? 'blur-sm opacity-50' : ''}`}
        >
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
          />
          {product.isNew && !isRestricted && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
              New
            </span>
          )}
        </div>

        <div className={`flex-1 flex flex-col justify-center min-w-0 py-1 ${isRestricted ? 'blur-[2px] opacity-50' : ''}`}>
          <p className="text-xs uppercase tracking-[0.12em] text-brand-500 mb-1.5 font-semibold">
            {product.origin?.split(",")[0] || product.category}
          </p>
          <h3 className="font-serif text-2xl text-brand-900 mb-2 group-hover:text-brand-700 transition-colors leading-tight">
            {product.name}
          </h3>
          <p className="text-sm text-brand-600 line-clamp-3 mb-4 leading-relaxed">  
            {product.description}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <span className="font-bold text-brand-900 text-2xl">
              {product.price.toFixed(2)}{" "}
              <span className="text-base font-normal text-brand-600">zł</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isRestricted) onQuickAdd();
              }}
              disabled={isRestricted}
              aria-label={`Dodaj ${product.name} do koszyka`}
              className="px-6 py-2.5 bg-brand-900 text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Do koszyka
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isRestricted ? handleRestrictedClick : () => router.push(productUrl)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer flex flex-col h-full overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isRestricted) handleRestrictedClick(e as any);
          else router.push(productUrl);
        }
      }}
    >
       {/* Height constraint wrapper to ensure overlay fits */}
       {isRestricted && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-50/60 backdrop-blur-md border border-brand-200/50 p-4 text-center transition-all duration-300 group-hover:bg-brand-50/40">
            <div className="w-16 h-16 rounded-full bg-brand-900 text-white flex items-center justify-center mb-4 shadow-xl">
              <span className="font-serif font-bold text-xl">18+</span>
            </div>
            <p className="text-sm font-bold text-brand-900 uppercase tracking-wider mb-2">
              Tylko dla dorosłych
            </p>
            <span className="text-xs text-brand-600 underline">
              Kliknij, aby potwierdzić wiek
            </span>
          </div>
        )}

      <div 
        className={`relative aspect-[3/4] rounded-2xl mb-5 bg-gradient-to-b from-brand-50 to-brand-100/50 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl overflow-hidden ${isRestricted ? 'blur-sm opacity-40' : ''}`}
      >
        {/* Image */}
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-contain p-3 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
        />

        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 rounded-2xl bg-brand-900/0 group-hover:bg-brand-900/5 transition-colors duration-700 pointer-events-none" />

        {!isRestricted && (
          <>
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.isNew && (
                <span className="px-3 py-1 bg-brand-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                  Nowość
                </span>
              )}
            </div>

            {/* Wishlist button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              aria-label={isLiked ? `Usu\u0144 ${product.name} z ulubionych` : `Dodaj ${product.name} do ulubionych`}
              aria-pressed={isLiked}
              className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                isLiked
                  ? "bg-red-500 text-white"
                  : "bg-white/90 backdrop-blur-sm text-brand-700 opacity-0 group-hover:opacity-100"
              }`}
            >
              <Heart size={16} aria-hidden="true" fill={isLiked ? "currentColor" : "none"} />
            </button>

            {/* Quick add button */}
            <div className={`absolute inset-x-0 bottom-0 p-4 transition-transform duration-300 flex justify-center ${isHovered ? 'translate-y-0' : 'translate-y-full'}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdd();
                }}
                aria-label={`Dodaj ${product.name} do koszyka`}
                className="px-6 py-2.5 bg-white text-brand-900 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg hover:bg-brand-900 hover:text-white transition-all flex items-center gap-2"
              >
                <Plus size={14} aria-hidden="true" />
                Dodaj do koszyka
              </button>
            </div>
          </>
        )}
      </div>

      <div className={`flex flex-col flex-1 gap-2 px-1 ${isRestricted ? 'blur-[1px] opacity-40' : ''}`}>
        <p className="text-xs uppercase tracking-[0.12em] text-brand-500 font-semibold">
          {product.origin?.split(",")[0] || product.category}
        </p>
        <h3 className="font-serif text-xl text-brand-900 leading-snug group-hover:text-brand-700 transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-brand-600 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                className={
                  i < 4 ? "text-amber-400 fill-amber-400" : "text-brand-200"
                }
              />
            ))}
          </div>
          <span className="text-xs text-brand-600">(24)</span>
        </div>
        <div className="mt-auto pt-4">
          <span className="font-bold text-brand-900 text-xl">
            {product.price.toFixed(2)}{" "}
            <span className="text-base font-normal text-brand-600">zł</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const SortDropdown: React.FC<{
  current: SortOption;
  onChange: (value: SortOption) => void;
}> = ({ current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === current)?.label;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Sortuj: ${currentLabel}`}
        className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900 transition-colors outline-none bg-white border border-brand-200 rounded-full px-4 py-2 hover:border-brand-300"
      >
        <span className="text-brand-600" aria-hidden="true">Sortuj:</span>
        <span className="font-medium" aria-hidden="true">{currentLabel}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-brand-700 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            role="listbox"
            aria-label="Opcje sortowania"
            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-brand-100 py-2 z-50"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="option"
                aria-selected={current === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                  ${
                    current === opt.value
                      ? "text-brand-900 font-medium bg-brand-50"
                      : "text-brand-600 hover:bg-brand-50 hover:text-brand-900"
                  }
                `}
              >
                {opt.label}
                {current === opt.value && (
                  <Check size={14} aria-hidden="true" className="text-brand-600" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// FILTER CONTENT COMPONENT
// ============================================

interface FilterContentProps {
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

const FilterContent: React.FC<FilterContentProps> = ({
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

    {/* Wine Cascading Filters — Country → Region → Grape */}
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

  // ── Derived values from server response ──
  const filteredProducts = filteredResult.products.filter(p => !p.isArchived);
  const availableOrigins = filteredResult.availableOrigins;
  const wineFilterOptions: WineFilterOptions = filteredResult.wineFilterOptions || { countries: [], regions: [], grapes: [] };

  // Show wine filters when viewing wine category OR when wine filter options have data
  const showWineFilters = (selectedCategory === 'wino' || selectedCategory === 'all') && wineFilterOptions.countries.length > 0;

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

  const hasActiveFilters: boolean =
    priceFilters.length > 0 || selectedOrigins.length > 0 || searchQuery.length > 0 ||
    selectedCountry !== null || selectedRegion !== null || selectedGrape !== null;

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Header — Premium Redesign */}
      <div className="relative bg-brand-900 text-white pt-24 pb-14 md:pt-32 md:pb-20 overflow-hidden">
        {/* Category-aware background image (wine gets a special one) */}
        {selectedCategory === "wino" && (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2000&auto=format&fit=crop"
                alt=""
                fill
                className="object-cover opacity-25"
                sizes="100vw"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-900/40 via-brand-900/70 to-brand-900 z-[1]" />
          </>
        )}
        {selectedCategory === "kawa" && (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=2000&auto=format&fit=crop"
                alt=""
                fill
                className="object-cover opacity-20"
                sizes="100vw"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-900/40 via-brand-900/70 to-brand-900 z-[1]" />
          </>
        )}

        {/* Decorative gradient orb */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-700/20 rounded-full blur-[120px] pointer-events-none z-[1]" />

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-10">
            {/* Left — Title & Description */}
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 mb-6"
              >
                <span className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  {activeCategoryConfig?.icon}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-brand-400">
                  Sklep Online
                </span>
              </motion.div>

              <motion.h1
                key={selectedCategory}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl md:text-6xl lg:text-7xl font-serif mb-5 leading-[0.95]"
              >
                {activeCategoryConfig?.name || "Sklep"}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-white/60 max-w-xl text-lg leading-relaxed"
              >
                {selectedCategory === "wino"
                  ? "Kolekcja wyselekcjonowanych win z Włoch i Hiszpanii. Każda butelka opowiada swoją historię terroir."
                  : selectedCategory === "kawa"
                  ? "Speciality coffee z najlepszych plantacji. Palone na zamówienie, aby zachować pełnię aromatu."
                  : selectedCategory === "slodycze"
                  ? "Artyzanalne słodycze i czekolady, które zachwycą nawet najbardziej wymagających smakoszy."
                  : selectedCategory === "spizarnia"
                  ? "Oliwy, wędliny, sosy i przetwory — smak Południa zamknięty w każdym słoiku."
                  : "Odkryj naszą kolekcję wyselekcjonowanych włoskich i hiszpańskich specjałów."}
              </motion.p>
            </div>

            {/* Right — Stats (visible for wine) */}
            {selectedCategory === "wino" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-4 flex gap-8 lg:justify-end"
              >
                {[
                  { value: "4", label: "regiony" },
                  { value: "IT · ES", label: "pochodzenie" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center lg:text-right">
                    <span className="block text-3xl md:text-4xl font-serif text-white leading-none mb-1">
                      {stat.value}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-medium">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Animated Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="origin-left h-[1px] bg-gradient-to-r from-white/20 via-white/10 to-transparent mb-8"
          />

          {/* Category Pills — Redesigned */}
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                onClick={() => handleCategorySelect(cat.slug)}
                aria-pressed={selectedCategory === cat.id}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border
                  ${
                    selectedCategory === cat.id
                      ? "bg-white text-brand-900 border-white shadow-lg shadow-white/10"
                      : "bg-white/[0.05] text-white/70 border-white/[0.08] hover:bg-white/[0.1] hover:border-white/20 hover:text-white backdrop-blur-sm"
                  }
                `}
              >
                <span aria-hidden="true" className="opacity-70">{cat.icon}</span>
                {cat.name}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Mobile Filter Overlay */}
          <AnimatePresence>
            {isMobileFiltersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                  onClick={() => setIsMobileFiltersOpen(false)}
                />
                <motion.aside
                  id="mobile-filters-panel"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween", duration: 0.3 }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mobile-filters-title"
                  data-lenis-prevent
                  className="fixed inset-y-0 left-0 w-80 bg-white z-50 p-6 overflow-y-auto lg:hidden"
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
                </motion.aside>
              </>
            )}
          </AnimatePresence>

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
                  {filteredResult.totalCount === 1 ? "produkt" : "produktów"}
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
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products Grid */}
            <div className="min-h-[70vh]">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    role="status"
                    aria-label="Ładowanie produktów"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                        : "flex flex-col gap-4"
                    }
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
                  </motion.div>
                ) : filteredProducts.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="py-20 text-center bg-white rounded-2xl border border-brand-100"
                  >
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="products"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14"
                        : "flex flex-col gap-4"
                    }
                  >
                    {filteredProducts.map((product, idx) => (
                      <ProductCard
                        key={product.sku}
                        product={product}
                        viewMode={viewMode}
                        onQuickAdd={() => addToCart(product)}
                        categorySlug={activeCategoryConfig?.slug || "wszystko"}
                        index={idx}
                        isAdult={isAdult}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
