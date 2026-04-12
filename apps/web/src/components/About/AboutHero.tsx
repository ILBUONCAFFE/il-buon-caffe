"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const AboutHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "38%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-end justify-start overflow-hidden bg-brand-950"
    >
      {/* Background Image with Parallax */}
      <motion.div
        style={{ y: imgY, scale: imgScale }}
        className="absolute inset-0 w-full h-full"
      >
        <Image
          src="/assets/kawiarnia.jpg"
          alt="Wnętrze kawiarni Il Buon Caffe w Koszalinie"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Layered gradient: lighter top, heavy bottom-left */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/50 to-brand-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/60 via-transparent to-transparent" />
      </motion.div>

      {/* Content — bottom-left aligned, editorial style */}
      <motion.div
        style={{ y: contentY, opacity }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pb-20 md:pb-28"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
          className="text-brand-400 uppercase tracking-[0.28em] text-[11px] font-semibold mb-5"
        >
          Koszalin&nbsp;&nbsp;·&nbsp;&nbsp;od 2003
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif text-white leading-[1.0] tracking-tight mb-8 max-w-3xl"
        >
          Nie planowaliśmy tego.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.65, ease: EASE }}
          className="text-lg md:text-xl text-white/55 max-w-sm leading-relaxed"
        >
          Chcieliśmy parzyć kawę tak,
          <br />
          jak pije się ją we Włoszech.
        </motion.p>
      </motion.div>

      {/* Vertical scroll indicator line */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 1.2, delay: 1.1, ease: EASE }}
        className="absolute bottom-0 right-16 md:right-24 w-px h-20 bg-gradient-to-b from-white/30 to-white/0 origin-top"
      />
    </section>
  );
};
