"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { getFeaturedProducts } from "@/actions/products";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { CATEGORY_NAMES } from "@/lib/constants";
import { SHOP_ENABLED } from "@/config/launch";
import { InView } from "@/components/ui/InView";

// ── Product card ───────────────────────────────────────────────────
const ProductCard = ({
  product,
  index,
}: {
  product: Product;
  index: number;
}) => {
  const { addToCart } = useCart();

  const categoryName = product.category
    ? CATEGORY_NAMES[product.category] || product.category
    : "";

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
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const imageUrl =
    product.imageUrl ||
    product.image ||
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800";

  return (
    <InView
      className="animate-reveal-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative flex-shrink-0 w-[280px] md:w-[340px] group select-none">
        <Link
          href={`/sklep/${productSlug}`}
          className="block"
        >
          {/* Image */}
          <div className="relative aspect-[3/4] rounded-xl bg-white border border-brand-100 overflow-hidden mb-5 transition-all duration-500 group-hover:border-brand-200 group-hover:shadow-lg group-hover:shadow-brand-900/5">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-3 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 280px, 340px"
              draggable={false}
              priority={index < 3}
            />

            {/* New badge */}
            {product.isNew && (
              <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-500">
                Nowe
              </span>
            )}

            {/* Add to cart — hover only */}
            {SHOP_ENABLED && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart(product);
                }}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-brand-900 text-white flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 hover:bg-brand-700"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-serif text-brand-900 leading-snug truncate transition-colors duration-300 group-hover:text-brand-600">
                {product.name}
              </h3>
              <span className="text-[11px] uppercase tracking-[0.15em] text-brand-400 mt-1 block">
                {product.origin?.split(",")[0] || categoryName}
              </span>
            </div>
            <span className="text-base font-mono text-brand-700 font-medium whitespace-nowrap pt-0.5">
              {product.price.toFixed(0)} zł
            </span>
          </div>
        </Link>
      </div>
    </InView>
  );
};

// ── Skeleton ───────────────────────────────────────────────────────
const CardSkeleton = ({ index }: { index: number }) => (
  <div
    className="w-[280px] md:w-[340px] flex-shrink-0"
    style={{ animationDelay: `${index * 150}ms` }}
  >
    <div className="aspect-[3/4] rounded-xl bg-brand-100/50 animate-pulse mb-5" />
    <div className="h-4 w-2/3 bg-brand-100 rounded animate-pulse mb-2" />
    <div className="h-3 w-1/3 bg-brand-100/50 rounded animate-pulse" />
  </div>
);

// ── Main section ───────────────────────────────────────────────────
export const FeaturedProducts = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getFeaturedProducts(10)
      .then(setProducts)
      .catch(() => {});
  }, []);

  return (
    <section className="bg-brand-50 overflow-hidden py-24 md:py-32">
      {/* Header */}
      <div className="container mx-auto px-6 lg:px-12 mb-12 md:mb-16 flex items-end justify-between">
        <InView className="animate-reveal-up">
          <span className="text-[11px] uppercase tracking-[0.3em] text-brand-400 font-medium">
            Wyróżnione
          </span>
        </InView>

        <InView className="animate-reveal-up" style={{ animationDelay: "100ms" }}>
          <Link
            href="/sklep"
            className="group inline-flex items-center gap-2 text-brand-500 hover:text-brand-900 transition-colors duration-500"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">
              Cały sklep
            </span>
            <ArrowUpRight
              className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2}
            />
          </Link>
        </InView>
      </div>

      {/* Horizontal scroll — native CSS */}
      <div
        ref={containerRef}
        className="pl-6 lg:pl-12 overflow-x-auto scrollbar-hide scroll-smooth"
      >
        <div className="flex gap-6 md:gap-8 w-max pr-12 pb-4">
          {products.length === 0
            ? [...Array(5)].map((_, i) => (
                <CardSkeleton key={i} index={i} />
              ))
            : products.map((product, i) => (
                <ProductCard
                  key={product.sku}
                  product={product}
                  index={i}
                />
              ))}
        </div>
      </div>
    </section>
  );
};
