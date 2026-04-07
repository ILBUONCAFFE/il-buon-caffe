"use client";

import React from "react";
import { motion } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];

const points = [
  { value: "300+", label: "Produktów w ofercie" },
  { value: "24h", label: "Czas realizacji" },
  { value: "150 zł", label: "Darmowa dostawa od" },
  { value: "2003", label: "Rok założenia" },
];

export const WhyUs = () => (
  <section className="bg-brand-50 py-20 md:py-28 overflow-hidden">
    <div className="container mx-auto px-6 lg:px-12">
      {/* Animated top line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
        className="origin-left h-px bg-brand-200 mb-14 md:mb-20"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
        {points.map((point, i) => (
          <motion.div
            key={point.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              ease: EASE_OUT,
            }}
            className="text-center md:text-left"
          >
            <span className="block text-4xl md:text-5xl lg:text-6xl font-serif text-brand-900 leading-none tracking-tight mb-3">
              {point.value}
            </span>
            <span className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-brand-400 font-medium">
              {point.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Bottom line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
        className="origin-right h-px bg-brand-200 mt-14 md:mt-20"
      />
    </div>
  </section>
);
