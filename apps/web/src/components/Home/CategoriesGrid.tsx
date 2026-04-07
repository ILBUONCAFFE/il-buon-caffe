"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedText } from "@/components/ui/AnimatedText";

interface Category {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image: string;
}

const categories: Category[] = [
  {
    id: "coffee",
    title: "Kawa",
    subtitle: "Speciality",
    href: "/sklep/kawa",
    image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "wine",
    title: "Wina",
    subtitle: "i Alkohole",
    href: "/sklep/wino",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "deli",
    title: "Delikatesy",
    subtitle: "Włoskie",
    href: "/sklep/spizarnia",
    image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "accessories",
    title: "Akcesoria",
    subtitle: "Baristy",
    href: "/sklep",
    image: "https://images.unsplash.com/photo-1544244222-38db31cdaaf4?q=80&w=1200&auto=format&fit=crop",
  },
];

const CategoryCard = ({ 
  category, 
  index 
}: { 
  category: Category; 
  index: number;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  // Parallax for the image inside
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  
  // Staggered reveal based on index
  const isEven = index % 2 === 0;

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1] 
      }}
      className={cn(
        "group relative",
        isEven ? "md:mt-0" : "md:mt-32"
      )}
    >
      <Link href={category.href} className="block">
        {/* Image Container with Clip Effect */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-brand-900">
          <motion.div 
            style={{ y: imageY }}
            className="absolute -inset-[20%]"
          >
            <Image
              src={category.image}
              alt={category.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
          
          {/* Floating Arrow */}
          <div className="absolute top-6 right-6 w-14 h-14 rounded-full bg-white/0 border-2 border-white/30 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500">
            <ArrowUpRight className="w-6 h-6 text-white" />
          </div>

          {/* Number Badge */}
          <div className="absolute bottom-6 left-6">
            <span className="text-[120px] md:text-[180px] font-serif leading-none text-white/10 select-none">
              0{index + 1}
            </span>
          </div>
        </div>

        {/* Text Content - Below Image */}
        <div className="mt-6 px-2">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              {category.subtitle}
            </span>
            <div className="flex-1 h-[1px] bg-brand-200" />
          </div>
          
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-serif text-brand-900 group-hover:text-brand-600 transition-colors duration-300">
            {category.title}
          </h3>
        </div>
      </Link>
    </motion.div>
  );
};

export const CategoriesGrid = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Big title parallax
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 bg-white overflow-x-hidden">
      {/* Large Background Text */}
      <motion.div 
        style={{ y: titleY }}
        className="absolute top-1/4 left-0 right-0 pointer-events-none select-none hidden lg:block"
      >
        <h2 className="text-[20vw] font-serif text-brand-50 leading-none whitespace-nowrap text-center">
          Odkryj
        </h2>
      </motion.div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <div className="mb-20 md:mb-32 max-w-3xl">
          <motion.span 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-brand-700 mb-6"
          >
            Kategorie
          </motion.span>
          
          <div className="mb-6">
            <AnimatedText
              text="Nasz świat"
              el="h2"
              className="text-5xl md:text-7xl lg:text-8xl font-serif text-brand-900 leading-[0.9]"
              delayChildren={0.1}
            />
            <AnimatedText
              text="smaków"
              el="h2"
              className="block text-5xl md:text-7xl lg:text-8xl font-serif text-brand-300 italic leading-[0.9]"
              delayChildren={0.3}
            />
          </div>
          
          <AnimatedText
            text="Od wyselekcjonowanych ziaren kawy po wykwintne wina. Wszystko, czego potrzebujesz, by celebrować chwile."
            className="text-brand-600 text-lg md:text-xl max-w-xl"
            delayChildren={0.5}
          />
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16">
          {categories.map((category, index) => (
            <CategoryCard 
              key={category.id} 
              category={category} 
              index={index} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};
