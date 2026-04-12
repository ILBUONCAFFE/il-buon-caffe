"use client";

import React from "react";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Repurposed as the editorial standfirst / opening paragraph
export const AboutQuote: React.FC = () => {
  return (
    <section className="relative bg-brand-beige overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 max-w-5xl py-24 md:py-36">
        {/* Top rule with label */}
        <div className="flex items-center gap-8 mb-16 md:mb-20">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: EASE }}
            className="h-px flex-1 bg-brand-300 origin-left"
          />
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-[10px] uppercase tracking-[0.3em] text-brand-400 font-semibold flex-shrink-0"
          >
            O nas
          </motion.span>
        </div>

        {/* The standfirst — big editorial paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
          className="text-2xl sm:text-3xl md:text-4xl font-serif text-brand-800 leading-[1.45] tracking-tight"
        >
          Kawiarnia, piekarnia, delikatesy. Żadnej z tych rzeczy nie planowaliśmy
          z góry. Codziennie robiliśmy to, co wychodziło nam najlepiej — i pewnego
          dnia okazało się, że to właśnie jest nasze miejsce.
        </motion.p>

        {/* Small attribution */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 md:mt-16 flex items-center gap-4"
        >
          <div className="h-px w-8 bg-brand-400" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-brand-400 font-medium">
            Il Buon Caffe, Koszalin
          </span>
        </motion.div>
      </div>
    </section>
  );
};
