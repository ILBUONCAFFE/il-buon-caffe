"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "motion/react";
import { Heart, Star, Plus } from "lucide-react";
import type { Product } from "@/types";
import type { ViewMode } from "./constants";
import { SHOP_ENABLED } from "@/config/launch";

export const ProductCard: React.FC<{
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

  const resolvedCategorySlug =
    product.category && product.category !== "all" ? product.category : categorySlug || "wszystko";

  const productUrl = `/sklep/${resolvedCategorySlug}/${productSlug}`;

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
