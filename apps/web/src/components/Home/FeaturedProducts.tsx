"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { getFeaturedProducts } from "@/actions/products";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { CATEGORY_NAMES } from "@/lib/constants";
import { SHOP_ENABLED } from "@/config/launch";

const EASE = [0.16, 1, 0.3, 1] as const;

const toSlug = (product: Product) =>
  product.slug ||
  product.name
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

// ── Product card ───────────────────────────────────────────────────
const ProductCard = ({ product, index }: { product: Product; index: number }) => {
  const { addToCart } = useCart();

  const categoryName = product.category
    ? CATEGORY_NAMES[product.category] || product.category
    : "";

  const imageUrl =
    product.imageUrl ||
    product.image ||
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: EASE }}
    >
      <Link href={`/sklep/${toSlug(product)}`} className="group block">
        {/* Image */}
        <div className="relative aspect-square rounded-sm overflow-hidden bg-white dark:bg-brand-900 border border-brand-100 dark:border-white/5 mb-4 transition-all duration-500 group-hover:border-brand-200 dark:group-hover:border-white/10 group-hover:shadow-md group-hover:shadow-brand-900/5">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={index < 4}
          />

          {product.isNew && (
            <span className="absolute top-3 left-3 text-[9px] uppercase tracking-[0.2em] font-bold text-brand-500">
              Nowe
            </span>
          )}

          {SHOP_ENABLED && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product);
              }}
              className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-brand-900 dark:bg-white text-white dark:text-brand-950 flex items-center justify-center opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-brand-700 dark:hover:bg-brand-100"
              aria-label={`Dodaj ${product.name} do koszyka`}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Info */}
        <div>
          {categoryName && (
            <p className="text-[10px] uppercase tracking-[0.22em] text-brand-400 dark:text-white/25 font-medium mb-1">
              {categoryName}
            </p>
          )}
          <h3 className="text-sm font-medium text-brand-900 dark:text-white/85 leading-snug mb-2 group-hover:text-brand-700 dark:group-hover:text-white transition-colors duration-300 line-clamp-2">
            {product.name}
          </h3>
          {product.price != null && (
            <p className="text-sm font-bold text-brand-900 dark:text-white">
              {Number(product.price).toFixed(2).replace(".", ",")} zł
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

// ── Skeleton ───────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div>
    <div className="aspect-square rounded-sm bg-brand-100 dark:bg-brand-900 animate-pulse mb-4" />
    <div className="h-2.5 w-1/4 bg-brand-100 dark:bg-white/5 rounded animate-pulse mb-2" />
    <div className="h-3.5 w-3/4 bg-brand-100 dark:bg-white/5 rounded animate-pulse mb-2" />
    <div className="h-3.5 w-1/3 bg-brand-100 dark:bg-white/5 rounded animate-pulse" />
  </div>
);

// ── Main section ───────────────────────────────────────────────────
export const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getFeaturedProducts(8)
      .then((p) => { setProducts(p); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <section className="bg-white dark:bg-brand-950 py-20 md:py-28 border-b border-brand-100 dark:border-white/5">
      <div className="container mx-auto px-6 lg:px-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-end justify-between mb-10 md:mb-14"
        >
          <h2 className="text-2xl md:text-3xl font-serif text-brand-900 dark:text-white">
            Wyróżnione produkty
          </h2>
          <Link
            href="/sklep"
            className="group inline-flex items-center gap-1.5 text-brand-400 dark:text-white/30 hover:text-brand-900 dark:hover:text-white transition-colors duration-300 text-[11px] uppercase tracking-[0.2em] font-medium"
          >
            Cały sklep
            <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
          </Link>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-12">
          {!loaded
            ? [...Array(8)].map((_, i) => <CardSkeleton key={i} />)
            : products.map((product, i) => (
                <ProductCard key={product.sku} product={product} index={i} />
              ))}
        </div>

        {/* CTA */}
        {loaded && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-14 md:mt-16 text-center"
          >
            <Link
              href="/sklep"
              className="inline-flex items-center gap-2.5 border border-brand-200 dark:border-white/10 text-brand-700 dark:text-white/60 px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-brand-900 hover:border-brand-900 hover:text-white dark:hover:bg-white dark:hover:border-white dark:hover:text-brand-950 transition-all duration-300"
            >
              Zobacz wszystkie produkty
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </motion.div>
        )}

      </div>
    </section>
  );
};
