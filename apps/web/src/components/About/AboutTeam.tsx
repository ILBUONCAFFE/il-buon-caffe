"use client";

import React from "react";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Redesigned as an honest, personal "founders / family" section.
// No role badges, no org-chart language — just direct prose.
export const AboutTeam: React.FC = () => {
  return (
    <section className="relative bg-brand-beige py-28 md:py-40 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-[10px] uppercase tracking-[0.3em] text-brand-400 font-semibold mb-16 md:mb-20"
        >
          Firma rodzinna
        </motion.p>

        {/* First paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-2xl md:text-3xl font-serif text-brand-900 leading-[1.5] mb-8"
        >
          Prowadzimy Il Buon Caffe razem od ponad dwudziestu lat. Nie franczyzę,
          nie sieć — jedno konkretne miejsce w Koszalinie.
        </motion.p>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
          className="h-px bg-brand-200 mb-8 origin-left"
        />

        {/* Second paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
          className="text-base md:text-lg leading-[1.85] text-brand-500 max-w-xl mb-6"
        >
          Jedno z nas parzy kawę. Drugie piecze chleb. Razem decydujemy, co
          trafia na półkę — i żadne z nas nie odpowiada przed nikim poza
          gośćmi, którzy tu przychodzą.
        </motion.p>

        {/* Third paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          className="text-base md:text-lg leading-[1.85] text-brand-500 max-w-xl"
        >
          Przez wszystkie te lata nie wzięliśmy ani złotówki od inwestorów.
          Nie musieliśmy tłumaczyć nikomu, jakie mamy wyniki kwartalne.
          Zamiast tego — codziennie rano wstajemy wcześnie, żeby chleb był
          gotowy przed otwarciem.
        </motion.p>

        {/* Closing statement — typographic */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          className="mt-16 md:mt-24 text-[11px] uppercase tracking-[0.25em] text-brand-300 font-medium"
        >
          Bez inwestorów.&nbsp;&nbsp;Bez franczyzy.&nbsp;&nbsp;Bez kompromisów.
        </motion.p>
      </div>
    </section>
  );
};
