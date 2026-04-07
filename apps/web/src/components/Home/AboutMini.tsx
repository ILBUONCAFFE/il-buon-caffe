"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const AboutMini = () => {
  return (
    <section className="relative bg-brand-900 overflow-hidden py-28 md:py-40">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="block text-[11px] uppercase tracking-[0.3em] text-white/25 font-medium mb-10 text-center"
          >
            O nas
          </motion.span>

          {/* Heading — clip reveal */}
          <div className="mb-10 text-center">
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE }}
                className="text-3xl sm:text-4xl md:text-5xl font-serif text-white leading-[1.05]"
              >
                Pasja do włoskiego
              </motion.h2>
            </div>
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
                className="text-3xl sm:text-4xl md:text-5xl font-handwriting text-brand-400 leading-[1.15]"
              >
                rzemiosła
              </motion.h2>
            </div>
          </div>

          {/* Body text */}
          <div className="space-y-5 text-center mb-12">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8, ease: EASE_OUT }}
              className="text-white/45 text-base md:text-lg leading-relaxed"
            >
              Od 2003 roku z pasją przenosimy autentyczny smak Włoch prosto do
              Twojego domu, łącząc rzemieślniczą tradycję z najwyższą jakością.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8, ease: EASE_OUT }}
              className="text-white/35 text-base md:text-lg leading-relaxed"
            >
              W naszej ofercie znajdziesz starannie wyselekcjonowane wina od
              małych winiarzy, doskonałe oliwy tłoczone na zimno, tradycyjne
              słodycze oraz świeżo paloną kawę.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8, ease: EASE_OUT }}
              className="text-white/30 text-base leading-relaxed"
            >
              Każdy specjał, który trafia do naszego sklepu, musi najpierw
              zachwycić nasze własne podniebienia, ponieważ w kwestii kulinariów
              nie uznajemy żadnych kompromisów.
            </motion.p>
          </div>

          {/* Divider + link */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
            className="origin-center h-px bg-white/10 mb-8 max-w-xs mx-auto"
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7, ease: EASE_OUT }}
            className="text-center"
          >
            <Link
              href="/sklep"
              className="group inline-flex items-center gap-2.5 text-white/50 hover:text-white transition-colors duration-500"
            >
              <span className="relative text-sm font-bold uppercase tracking-[0.2em]">
                Ponad 300 produktów
                <span className="absolute -bottom-1 left-0 h-px bg-current w-0 group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
              </span>
              <ArrowUpRight
                className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.5}
              />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
