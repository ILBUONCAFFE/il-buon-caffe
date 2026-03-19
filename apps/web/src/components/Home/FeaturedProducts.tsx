"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Plus, Heart } from "lucide-react";
import { getFeaturedProducts } from "@/actions/products";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import Lenis from "lenis";
import { CATEGORY_NAMES } from "@/lib/constants";
import { AnimatedText } from "@/components/ui/AnimatedText";

const ProductCard = ({ product, index }: { product: Product; index: number }) => {
  const { addToCart } = useCart();
  const [isLiked, setIsLiked] = useState(false);
  
  const categoryName = product.category ? (CATEGORY_NAMES[product.category] || product.category) : '';
  
  const productSlug = `${product.sku}-${product.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")}`;

  const imageUrl = product.imageUrl || product.image || "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800";

  return (
    <motion.div 
      className="relative flex-shrink-0 w-[300px] md:w-[400px] group select-none"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-100px" }}
    >
      <Link href={`/sklep/wszystko/${productSlug}`} className="block h-full cursor-pointer">
        {/* Image Container - unosi się na hover */}
        <div className="relative aspect-[4/5] rounded-[2.5rem] bg-gradient-to-b from-brand-100 to-brand-200/50 mb-6 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl">
          {/* Badges */}
          <div className="absolute top-6 left-6 z-20 flex gap-2">
            {product.isNew && (
              <span className="px-3 py-1 bg-white/90 backdrop-blur text-brand-900 text-xs font-bold uppercase tracking-wider rounded-full">
                Nowość
              </span>
            )}
          </div>

          {/* Image - object-contain = cały produkt widoczny */}
          <div className="absolute inset-0 overflow-hidden rounded-[2.5rem]">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-4 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
              sizes="(max-width: 768px) 100vw, 33vw"
              draggable={false}
              priority={index < 2}
            />
          </div>

          {/* Subtle overlay on hover */}
          <div className="absolute inset-0 rounded-[2.5rem] bg-brand-900/0 group-hover:bg-brand-900/5 transition-colors duration-700 pointer-events-none" />

          {/* Action buttons */}
          <div className="absolute top-6 right-6 z-20 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg",
                isLiked ? "bg-red-500 text-white" : "bg-white text-brand-900 hover:bg-brand-900 hover:text-white"
              )}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="absolute bottom-6 right-6 z-20 translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product);
              }}
              className="w-14 h-14 bg-white text-brand-900 rounded-full flex items-center justify-center hover:bg-brand-900 hover:text-white transition-colors shadow-xl"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="px-2">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-2xl font-serif text-brand-900 leading-tight group-hover:text-brand-600 transition-colors">
              {product.name}
            </h3>
            <span className="text-lg font-bold text-brand-900">
              {product.price.toFixed(2)} zł
            </span>
          </div>
          <p className="text-brand-700 text-sm uppercase tracking-widest line-clamp-1">
            {product.origin?.split(',')[0] || categoryName || "Il Buon Caffe"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export const FeaturedProducts = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Initialize horizontal Lenis for this container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const horizontalLenis = new Lenis({
      wrapper: containerRef.current,
      content: containerRef.current.firstElementChild as HTMLElement,
      orientation: 'horizontal',
      gestureOrientation: 'both', // Allow both vertical scroll gesture to trigger horizontal scroll
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      horizontalLenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      horizontalLenis.destroy();
    };
  }, []);
  
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const data = await getFeaturedProducts(10);
        setProducts(data);
      } catch (error) {
        console.error("Failed to load featured products", error);
      }
    };
    loadFeatured();
  }, []);

  return (
    <section ref={sectionRef} className="py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 mb-16 flex items-end justify-between">
         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
         >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-brand-700 mb-6 pl-1">
              Sklep
            </span>
            <div className="flex flex-col gap-2">
              <AnimatedText 
                text="Wybrane"
                el="h2"
                className="text-5xl md:text-7xl font-serif text-brand-900 leading-none"
                delayChildren={0.2}
              />
              <AnimatedText 
                text="Produkty"
                el="h2"
                className="text-5xl md:text-7xl font-serif leading-none text-brand-300 italic"
                delayChildren={0.4}
              />
            </div>
         </motion.div>
         
         <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden md:block"
         >
            <Link href="/sklep" className="group flex items-center gap-4 text-brand-900 font-medium">
                <span className="uppercase tracking-widest text-xs">Zobacz wszystkie</span>
                <div className="w-12 h-12 rounded-full border border-brand-200 flex items-center justify-center group-hover:bg-brand-900 group-hover:border-brand-900 group-hover:text-white transition-all">
                    <ArrowRight size={16} />
                </div>
            </Link>
         </motion.div>
      </div>

        {/* Horizontal Lenis Slider */}
      <motion.div 
        ref={containerRef} 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="pl-6 lg:pl-12 overflow-x-auto scrollbar-hide"
      >
        <div 
            className="flex gap-8 md:gap-12 w-max pr-12 pb-8"
        >
            {products.length === 0 ? (
                // Skeletons
                [...Array(4)].map((_, i) => (
                    <div key={i} className="w-[300px] md:w-[400px] aspect-[4/5] bg-brand-50 rounded-[2.5rem] animate-pulse" />
                ))
            ) : (
                products.map((product, i) => (
                    <ProductCard key={product.sku} product={product} index={i} />
                ))
            )}
            
            {/* View All Card */}
            <motion.div 
                className="w-[200px] md:w-[300px] aspect-[4/5] flex items-center justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                <Link href="/sklep" className="group flex flex-col items-center gap-6 text-brand-900">
                    <div className="w-24 h-24 rounded-full border-2 border-brand-200 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-900 group-hover:border-brand-900 group-hover:text-white transition-all duration-300">
                        <ArrowRight size={32} />
                    </div>
                    <span className="font-serif text-3xl">Odkryj więcej</span>
                </Link>
            </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
