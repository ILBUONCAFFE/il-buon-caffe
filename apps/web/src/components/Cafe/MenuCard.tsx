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
  <li className="py-3">
    <div className="flex items-baseline gap-3">
      <span className="font-serif text-base md:text-lg text-brand-900 shrink-0">
        {name}
      </span>
      <span
        aria-hidden
        className="flex-1 border-b border-dotted border-brand-900/25 translate-y-[-4px] min-w-[24px]"
      />
      <span className="font-mono tabular-nums text-base md:text-lg text-brand-900 shrink-0">
        {price}
      </span>
    </div>
    {description && (
      <p className="mt-1 text-sm text-brand-700/70 leading-snug max-w-[34ch]">
        {description}
      </p>
    )}
  </li>
);

export const MenuCard: React.FC = () => {
  return (
    <section
      id="menu"
      className="relative bg-brand-beige py-24 md:py-32 scroll-mt-20"
    >
      <div className="container mx-auto px-6 lg:px-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-14 md:mb-20 max-w-3xl"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-brand-700/60 mb-4">
            Karta
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-brand-900 tracking-tight leading-tight">
            Co serwujemy
          </h2>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 lg:gap-16"
        >
          {CAFE_MENU.map((category) => (
            <div key={category.category}>
              <h3 className="font-serif italic text-xl md:text-2xl text-brand-900 mb-4">
                {category.category}
              </h3>
              <div className="h-px bg-brand-300 mb-2" />
              <ul className="divide-y divide-brand-900/10">
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
              <p className="mt-3 font-mono text-xs text-brand-700/50 tabular-nums">
                ceny w zł
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MenuCard;
