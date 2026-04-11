"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const AboutTeam: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const dividerWidth = useTransform(scrollYProgress, [0.2, 0.6], ["0%", "100%"]);

  return (
    <section ref={containerRef} className="relative bg-brand-beige py-28 md:py-40">
      {/* Top transition from dark */}
      <div
        className="absolute top-0 left-0 right-0 h-32 -translate-y-full"
        style={{
          background: "linear-gradient(to bottom, #1c1917, #f3eee8)",
        }}
      />

      <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
        {/* Section intro */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-xs uppercase tracking-[0.25em] text-brand-400 mb-16 md:mb-24"
        >
          Firma rodzinna od 2003
        </motion.p>

        {/* First person — coffee & deli */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-14 md:mb-20"
        >
          <h3 className="text-2xl md:text-3xl font-serif text-brand-900 leading-tight mb-5">
            Kawa i delikatesy
          </h3>
          <p className="text-base md:text-lg leading-[1.8] text-brand-500 max-w-xl">
            Parzy kawę od 2003 roku. Dobiera ziarna, testuje palenia, wybiera wina
            i oliwy na półki. Jeśli coś tu jest — to dlatego, że sam to próbował
            i uznał, że warto.
          </p>
        </motion.div>

        {/* Animated divider */}
        <div className="relative h-px bg-brand-200 mb-14 md:mb-20">
          <motion.div
            style={{ width: dividerWidth }}
            className="absolute inset-y-0 left-0 bg-brand-400/60"
          />
        </div>

        {/* Second person — bakery */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
        >
          <h3 className="text-2xl md:text-3xl font-serif text-brand-900 leading-tight mb-5">
            Piekarnia i wypieki
          </h3>
          <p className="text-base md:text-lg leading-[1.8] text-brand-500 max-w-xl">
            Chleby, bułki, ciasta, ciastka — wszystko robione ręcznie, od zera,
            każdego ranka. Bez mieszanek, bez skrótów. Ludzie wracają po jej
            sernik, bo smakuje jak domowy. Bo taki jest.
          </p>
        </motion.div>

        {/* Closing line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="mt-20 md:mt-28 text-sm text-brand-300"
        >
          Bez inwestorów. Bez franczyzy. Bez kompromisów.
        </motion.p>
      </div>
    </section>
  );
};
