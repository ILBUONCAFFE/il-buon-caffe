"use client";

import React from "react";
import { motion } from "motion/react";
import { CAFE_MENU } from "@/lib/constants";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const formatPrice = (price: string): string => {
  return price.replace(/\s*zł\s*$/i, "").replace(".", ",");
};

const MenuRow: React.FC<{ name: string; price: string; description?: string }> = ({
  name,
  price,
  description,
}) => (
  <li className="py-4 group">
    <div className="flex items-baseline gap-3">
      <span className="font-serif text-base md:text-lg text-brand-900 dark:text-white shrink-0 group-hover:italic transition-all duration-300">
        {name}
      </span>
      <span
        aria-hidden
        className="flex-1 border-b border-dotted border-brand-900/25 dark:border-white/20 translate-y-[-4px] min-w-[24px]"
      />
      <span className="font-mono tabular-nums text-base md:text-lg text-brand-900 dark:text-white shrink-0">
        {price}
      </span>
    </div>
    {description && (
      <p className="mt-1.5 text-sm text-brand-700/70 dark:text-white/45 leading-snug max-w-[36ch]">
        {description}
      </p>
    )}
  </li>
);

export const MenuCard: React.FC = () => {
  return (
    <section
      id="menu"
      className="relative bg-[#f3eee8] dark:bg-brand-950 py-24 md:py-36 scroll-mt-20 overflow-hidden border-b border-brand-100 dark:border-white/5"
    >
      {/* Subtle pinstripe */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #1c1917 0, #1c1917 1px, transparent 1px, transparent 14px)",
        }}
      />

      <div className="relative container mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-16 md:mb-24 flex items-end justify-between gap-8 flex-wrap"
        >
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 dark:text-white/40 font-medium">
                § 01 — Karta
              </span>
              <span className="h-px w-12 bg-brand-300/50 dark:bg-white/15" />
            </div>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] text-brand-900 dark:text-white tracking-[-0.02em] leading-[0.98]">
              Co <span className="italic text-brand-700 dark:text-brand-300">serwujemy</span>
            </h2>
          </div>

          <div className="max-w-xs text-right hidden md:block">
            <p className="text-[11px] uppercase tracking-[0.25em] text-brand-500 dark:text-white/40 font-medium mb-2">
              Parzymy od 2003
            </p>
            <p className="font-serif italic text-brand-700 dark:text-white/60 text-base leading-snug">
              Ziarna palone pod nasz profil. Mleko od lokalnego dostawcy.
            </p>
          </div>
        </motion.header>

        {/* Menu columns */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 lg:gap-16"
        >
          {CAFE_MENU.map((category, idx) => (
            <div key={category.category} className="relative">
              {/* Section number outlined */}
              <div
                aria-hidden
                className="absolute -top-6 -left-2 font-serif italic font-bold leading-none text-transparent select-none pointer-events-none"
                style={{
                  fontSize: "6rem",
                  WebkitTextStroke: "1px rgba(163,127,91,0.2)",
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </div>

              <div className="relative">
                <h3 className="font-serif text-2xl md:text-3xl text-brand-900 dark:text-white mb-5 leading-tight">
                  {category.category}
                </h3>
                <div className="h-[2px] bg-brand-900 dark:bg-white w-10 mb-2" />
                <div className="h-px bg-brand-300 dark:bg-white/15 mb-2" />
                <ul className="divide-y divide-brand-900/10 dark:divide-white/10">
                  {category.items.map((item) => (
                    <MenuRow
                      key={item.name}
                      name={item.name}
                      price={formatPrice(item.price)}
                      description={
                        item.description && item.description !== "Oryginalne"
                          ? item.description
                          : undefined
                      }
                    />
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-500 dark:text-white/35 tabular-nums">
                  Ceny w zł · VAT wliczony
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MenuCard;
