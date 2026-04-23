"use client";

import React from "react";
import { motion } from "motion/react";
import { CafeHero } from "./CafeHero";
import { MenuCard } from "./MenuCard";
import { Inside } from "./Inside";
import { Visit } from "./Location";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CafeClient: React.FC = () => {
  return (
    <div className="bg-[#f3eee8] dark:bg-brand-950 min-h-screen">
      <CafeHero />
      <MenuCard />
      <Inside />
      <Visit />

      <section className="bg-[#f3eee8] dark:bg-brand-950 py-24 md:py-32 border-t border-brand-100 dark:border-white/5">
        <div className="container mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="inline-block text-[11px] uppercase tracking-[0.3em] text-brand-500 dark:text-white/40 font-medium mb-6">
              — Post scriptum —
            </span>
            <p className="font-serif italic text-2xl md:text-3xl text-brand-900 dark:text-white max-w-2xl mx-auto leading-snug">
              „Najlepsza kawa to ta, którą pijesz nie spiesząc się."
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CafeClient;
