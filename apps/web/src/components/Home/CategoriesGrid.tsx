"use client";

import React, { useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Category {
  title: string;
  subtitle: string;
  href: string;
  image: string;
}

const R2_MEDIA_BASE = process.env.NEXT_PUBLIC_R2_MEDIA_URL || "https://media.ilbuoncaffe.pl";

const categories: Category[] = [
  {
    title: "Kawa",
    subtitle: "Specialty",
    href: "/sklep/kawa",
    image: `${R2_MEDIA_BASE}/categories/kawa.webp`,
  },
  {
    title: "Wina",
    subtitle: "i Alkohole",
    href: "/sklep/wino",
    image: `${R2_MEDIA_BASE}/categories/wino.webp`,
  },
  {
    title: "Delikatesy",
    subtitle: "Włoskie",
    href: "/sklep/spizarnia",
    image: `${R2_MEDIA_BASE}/categories/delikatesy.webp`,
  },
  {
    title: "Akcesoria",
    subtitle: "Baristy",
    href: "/sklep",
    image: `${R2_MEDIA_BASE}/categories/akcesoria.webp`,
  },
];

// ── Category row ───────────────────────────────────────────────────
const CategoryRow = ({
  category,
  index,
  onHover,
  onMove,
  onLeave,
}: {
  category: Category;
  index: number;
  onHover: (idx: number) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.8, delay: index * 0.08, ease: EASE }}
  >
    <Link
      href={category.href}
      onMouseEnter={() => onHover(index)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group flex items-center justify-between py-8 md:py-10 lg:py-12 border-b border-white/8 transition-colors duration-500 hover:border-white/20"
    >
      {/* Left: number + name */}
      <div className="flex items-baseline gap-4 md:gap-8">
        <span className="text-[11px] font-mono text-white/20 tracking-wider tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="flex items-baseline gap-3 md:gap-4">
          <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-white/85 transition-colors duration-500 group-hover:text-white">
            {category.title}
          </h3>
          <span className="text-sm md:text-base font-handwriting text-white/25 transition-colors duration-500 group-hover:text-brand-400">
            {category.subtitle}
          </span>
        </div>
      </div>

      {/* Right: arrow */}
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 group-hover:border-white/30 group-hover:bg-white/5">
        <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-white/30 transition-all duration-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  </motion.div>
);

// ── Floating cursor image ──────────────────────────────────────────
const CursorImage = ({
  image,
  x,
  y,
}: {
  image: string;
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
}) => (
  <motion.div
    className="fixed top-0 left-0 z-50 pointer-events-none hidden lg:block"
    style={{ x, y }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: -3 }}
      exit={{ opacity: 0, scale: 0.7, rotate: 4 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-[280px] h-[360px] rounded-xl overflow-hidden shadow-2xl shadow-black/40 -translate-x-1/2 -translate-y-1/2"
    >
      <Image
        src={image}
        alt=""
        fill
        className="object-cover"
        sizes="280px"
      />
    </motion.div>
  </motion.div>
);

// ── Main section ───────────────────────────────────────────────────
export const CategoriesGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springCfg = { stiffness: 150, damping: 20, mass: 0.5 };
  const cursorX = useSpring(rawX, springCfg);
  const cursorY = useSpring(rawY, springCfg);

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    },
    [rawX, rawY]
  );

  const handleHover = useCallback((idx: number) => setHoveredIdx(idx), []);
  const handleLeave = useCallback(() => setHoveredIdx(null), []);

  return (
    <section ref={containerRef} className="relative bg-brand-950 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 py-24 md:py-32 lg:py-40">
        {/* Minimal header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-12 md:mb-16"
        >
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/30 font-medium">
            Kategorie
          </span>
        </motion.div>

        {/* Top border */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
          className="origin-left h-px bg-white/10 mb-0"
        />

        {/* Category rows */}
        {categories.map((cat, i) => (
          <CategoryRow
            key={cat.title}
            category={cat}
            index={i}
            onHover={handleHover}
            onMove={handleMove}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {/* Floating image that follows cursor */}
      <AnimatePresence>
        {hoveredIdx !== null && (
          <CursorImage
            key={hoveredIdx}
            image={categories[hoveredIdx].image}
            x={cursorX}
            y={cursorY}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
