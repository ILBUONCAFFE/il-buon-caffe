"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const CafeHero: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[88vh] md:min-h-screen overflow-hidden bg-brand-900"
    >
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <Image
          src="/assets/kawiarnia.jpg"
          alt="Wnętrze kawiarni Il Buon Caffe w Koszalinie"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/30 to-brand-900/10" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="relative z-10 flex min-h-[88vh] md:min-h-screen items-end"
      >
        <div className="container mx-auto px-6 lg:px-12 pb-16 md:pb-24">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="font-mono text-xs md:text-sm tracking-[0.25em] uppercase text-brand-300 mb-5"
            >
              Koszalin · od 2003
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight leading-[1.02]"
            >
              Il Buon Caffe
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="mt-6 text-lg md:text-xl text-white/80 max-w-xl leading-relaxed"
            >
              Kawiarnia & delikatesy przy ul. Biskupa Domina.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
              className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60 font-mono tabular-nums"
            >
              <span>Pn–Pt 09:00–16:00</span>
              <span aria-hidden className="text-brand-300/50">·</span>
              <span>So 11:00–14:00</span>
              <span aria-hidden className="text-brand-300/50">·</span>
              <a href="tel:+48664937937" className="hover:text-brand-300 transition-colors">
                +48 664 937 937
              </a>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CafeHero;
