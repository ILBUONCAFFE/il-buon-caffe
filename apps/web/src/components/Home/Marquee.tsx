"use client";

import React from "react";
import { motion } from "motion/react";

// ── Single marquee row ─────────────────────────────────────────────
const MarqueeRow = ({
  items,
  duration,
  reverse,
  outlined,
  className,
}: {
  items: string[];
  duration: number;
  reverse?: boolean;
  outlined?: boolean;
  className?: string;
}) => (
  <div className={`flex overflow-hidden select-none ${className ?? ""}`}>
    {[0, 1].map((copy) => (
      <motion.div
        key={copy}
        initial={{ x: reverse ? "-100%" : "0%" }}
        animate={{ x: reverse ? "0%" : "-100%" }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        className="flex flex-shrink-0"
      >
        {items.map((text, i) => (
          <span
            key={`${copy}-${i}`}
            className="flex items-center gap-5 md:gap-8 px-5 md:px-8"
          >
            <span
              className={`whitespace-nowrap ${outlined ? "[-webkit-text-stroke:1.5px_rgba(255,255,255,0.18)] md:[-webkit-text-stroke:2px_rgba(255,255,255,0.18)] text-transparent" : ""}`}
            >
              {text}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
          </span>
        ))}
      </motion.div>
    ))}
  </div>
);

// ── Content ────────────────────────────────────────────────────────
const ROW_TOP = [
  "Kawa Specialty",
  "Wina Włoskie",
  "Oliwy Extra Virgin",
  "Makarony Rzemieślnicze",
  "Słodycze",
  "Oliwki & Przetwory",
];

const ROW_BOTTOM = [
  "Espresso",
  "Chianti",
  "Taggiasca",
  "Pappardelle",
  "Cantuccini",
  "Bruschetta",
  "Amarone",
  "Pesto Genovese",
];

export const Marquee = () => (
  <section className="py-10 md:py-14 bg-brand-950 overflow-hidden">
    {/* Top row — large outlined serif, scrolls left */}
    <MarqueeRow
      items={ROW_TOP}
      duration={35}
      outlined
      className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight mb-3 md:mb-4"
    />

    {/* Bottom row — small caps, opposite direction, muted */}
    <MarqueeRow
      items={ROW_BOTTOM}
      duration={25}
      reverse
      className="text-[11px] md:text-sm uppercase tracking-[0.25em] font-medium text-white/20"
    />
  </section>
);
