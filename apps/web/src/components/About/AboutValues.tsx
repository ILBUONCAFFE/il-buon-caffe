"use client";

import React from "react";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const RULES = [
  {
    num: "I",
    text: "Każdy produkt próbujemy sami, zanim trafi na półkę.",
  },
  {
    num: "II",
    text: "Znamy ludzi, od których kupujemy — małe zakłady, rodzinne winiarnie, rzemieślnicze piekarnie.",
  },
  {
    num: "III",
    text: "Wypieki robimy od zera, każdego ranka. Bez gotowych mieszanek.",
  },
  {
    num: "IV",
    text: "Nie sprzedajemy rzeczy, których sami byśmy nie kupili.",
  },
  {
    num: "V",
    text: "Włosi robią u nas zakupy. To mówi więcej niż jakikolwiek certyfikat.",
  },
] as const;

export const AboutValues: React.FC = () => {
  return (
    <section className="relative bg-brand-beige overflow-hidden">
      {/* Top border from team section */}
      <div className="h-px bg-brand-200" />

      <div className="container mx-auto px-6 lg:px-12 max-w-3xl py-28 md:py-40">
        {/* Notice header — styled like a framed sign */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="text-center mb-14 md:mb-16"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-brand-400 font-semibold mb-5">
            Il Buon Caffe
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-brand-900 tracking-tight">
            Zasady domu
          </h2>
        </motion.div>

        {/* Top double rule */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
          className="origin-left mb-1"
        >
          <div className="h-px bg-brand-800" />
        </motion.div>
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.06, ease: EASE }}
          className="origin-left mb-12 md:mb-14 mt-[3px]"
        >
          <div className="h-px bg-brand-800/30" />
        </motion.div>

        {/* Rules list */}
        <div className="space-y-0">
          {RULES.map((rule, i) => (
            <motion.div
              key={rule.num}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: EASE }}
              className="group"
            >
              {/* Rule row */}
              <div className="flex items-baseline gap-6 md:gap-8 py-5 md:py-6 border-b border-brand-200 last:border-none">
                {/* Roman numeral */}
                <span className="font-serif text-brand-300 text-sm w-6 flex-shrink-0 text-right select-none">
                  {rule.num}.
                </span>

                {/* Rule text */}
                <p className="font-serif text-brand-800 text-lg md:text-xl leading-[1.55]">
                  {rule.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom double rule */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
          className="origin-left mt-1"
        >
          <div className="h-px bg-brand-800/30" />
        </motion.div>
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.06, ease: EASE }}
          className="origin-left mt-[3px]"
        >
          <div className="h-px bg-brand-800" />
        </motion.div>

        {/* Footer of the notice */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-center text-[10px] uppercase tracking-[0.3em] text-brand-400 font-medium mt-10"
        >
          Koszalin&nbsp;&nbsp;·&nbsp;&nbsp;2003&nbsp;&nbsp;·&nbsp;&nbsp;il buon caffe
        </motion.p>
      </div>
    </section>
  );
};
