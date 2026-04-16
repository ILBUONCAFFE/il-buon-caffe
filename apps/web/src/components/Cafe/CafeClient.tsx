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
    <div className="bg-brand-beige min-h-screen">
      <CafeHero />
      <MenuCard />
      <Inside />
      <Visit />

      <section className="bg-brand-beige pb-24 md:pb-32">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-center font-serif italic text-base md:text-lg text-brand-700/70 max-w-xl mx-auto leading-relaxed"
          >
            „Najlepsza kawa to ta, którą pijesz nie spiesząc się."
          </motion.p>
        </div>
      </section>
    </div>
  );
};

export default CafeClient;
