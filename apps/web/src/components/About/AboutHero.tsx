"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const AboutHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const yearOpacity = useTransform(scrollYProgress, [0, 0.4], [0.07, 0.03]);
  const yearScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.92]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);
  const contentOpacity = useTransform(scrollYProgress, [0.15, 0.45], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-900"
    >
      {/* Giant year — background texture */}
      <motion.div
        style={{ opacity: yearOpacity, scale: yearScale }}
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
      >
        <span className="text-[30vw] md:text-[24vw] font-serif font-bold text-white leading-none">
          2003
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 max-w-3xl mx-auto px-6 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: EASE }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.15] tracking-tight mb-8"
        >
          Nie planowaliśmy tego.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
          className="text-base md:text-lg text-white/30 max-w-lg mx-auto leading-relaxed"
        >
          Chcieliśmy tylko parzyć porządną kawę.
          <br />
          Reszta wynikła po drodze.
        </motion.p>
      </motion.div>
    </section>
  );
};
