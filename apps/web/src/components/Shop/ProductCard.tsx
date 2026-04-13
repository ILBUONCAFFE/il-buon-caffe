"use client";

import React, { useState, memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { Product } from "@/types";
import type { ViewMode } from "./constants";
import { SHOP_ENABLED } from "@/config/launch";

export const ProductCard: React.FC<{
  product: Product;
  viewMode: ViewMode;
  onQuickAdd: () => void;
  index: number;
  isAdult: boolean;
}> = memo(({ product, viewMode, onQuickAdd, index, isAdult }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  // Check if product is restricted
  const isRestricted = product.category === 'wino' && !isAdult;

  const handleRestrictedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new Event("open-age-verification"));
  };

  const productSlug =
    product.slug ||
    product.name
      .toLowerCase()
      .replace(/\u0105/g, "a")
      .replace(/\u0107/g, "c")
      .replace(/\u0119/g, "e")
      .replace(/\u0142/g, "l")
      .replace(/\u0144/g, "n")
      .replace(/\u00f3/g, "o")
      .replace(/\u015b/g, "s")
      .replace(/\u017a/g, "z")
      .replace(/\u017c/g, "z")
      .replace(/[^a-z0-9\s-]/g, "") // remove other special chars
      .trim()
      .replace(/\s+/g, "-");

  const productUrl = `/sklep/${productSlug}`;

  const imageUrl =
    product.imageUrl ||
    product.image ||
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600";

  // Custom restricted overlay component
  const RestrictedOverlay = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-900 p-4">
      <span className="font-serif font-bold text-3xl text-white mb-2">18+</span>
      <p className="text-[10px] font-bold text-brand-100 uppercase tracking-[0.1em] mb-3">
        Dla pełnoletnich
      </p>
      <button
        className="text-[10px] uppercase font-bold tracking-wider underline text-white hover:text-brand-200 transition-colors"
      >
        Otwórz
      </button>
    </div>
  );

  if (viewMode === "list") {
    return (
      <div
        onClick={isRestricted ? handleRestrictedClick : () => router.push(productUrl)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex gap-6 p-5 bg-white transition-colors cursor-pointer border-b border-brand-100 hover:border-brand-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
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
          className={`w-36 h-36 flex-shrink-0 bg-brand-50/50 relative transition-colors group-hover:bg-brand-50 ${isRestricted ? 'opacity-20' : ''}`}
        >
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-3 transition-transform duration-300"
            sizes="144px"
          />
          {product.isNew && !isRestricted && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
              Nowość
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
            {SHOP_ENABLED && (
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
            )}
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
      className="group relative cursor-pointer flex flex-col h-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
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
          <div className="absolute z-20 w-full aspect-[3/4] top-0 flex flex-col items-center justify-center bg-brand-900 border border-brand-900 p-4 text-center">
            <span className="font-serif font-bold text-4xl text-white mb-2">18+</span>
            <p className="text-[11px] font-bold text-brand-100 uppercase tracking-[0.1em] mb-4">
              Tylko dla dorosłych
            </p>
            <span className="text-[10px] uppercase font-bold tracking-wider underline text-white">
              Kliknij
            </span>
          </div>
        )}

      <div
        className={`relative aspect-[3/4] mb-5 bg-brand-50/50 transition-colors group-hover:bg-brand-50 overflow-hidden ${isRestricted ? 'opacity-20' : ''}`}
      >
        {/* Image */}
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-contain p-3 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

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

            {/* Quick add button — hidden when shop is disabled */}
            {SHOP_ENABLED && (
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
            )}
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
        <div className="mt-auto pt-3">
          <span className="font-bold text-brand-900 text-xl">
            {product.price.toFixed(2)}{" "}
            <span className="text-base font-normal text-brand-600">zł</span>
          </span>
        </div>
      </div>
    </div>
  );
});
