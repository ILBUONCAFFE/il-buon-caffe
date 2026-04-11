"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export const AboutQuote: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0.2, 0.45], [0.94, 1]);
  const opacity = useTransform(scrollYProgress, [0.15, 0.4, 0.75, 0.9], [0, 1, 1, 0]);
  const subtitleOpacity = useTransform(scrollYProgress, [0.35, 0.5], [0, 0.2]);

  return (
    <section
      ref={containerRef}
      className="relative py-36 md:py-48 overflow-hidden bg-brand-900"
    >
      <motion.div
        style={{ scale, opacity }}
        className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 text-center"
      >
        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-serif text-white leading-[1.25]">
          Jeśli nie zachwyci nas,
          <br />
          nie trafi do Ciebie.
        </p>

        <motion.span
          style={{ opacity: subtitleOpacity }}
          className="block mt-10 text-xs uppercase tracking-[0.3em] text-white font-medium"
        >
          Od 2003
        </motion.span>
      </motion.div>
    </section>
  );
};
