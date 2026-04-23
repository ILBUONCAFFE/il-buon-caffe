"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

const R2 = process.env.NEXT_PUBLIC_R2_MEDIA_URL || "https://media.ilbuoncaffe.pl";
const EASE = [0.16, 1, 0.3, 1] as const;

const images = [
  { src: `${R2}/categories/kawa.webp`, alt: "Kawa specialty" },
  { src: `${R2}/categories/wino.webp`, alt: "Włoskie wina" },
  { src: `${R2}/categories/delikatesy.webp`, alt: "Włoskie delikatesy" },
];

export const Hero = () => (
  <section className="relative min-h-[88vh] bg-white dark:bg-brand-950 flex items-center border-b border-brand-100 dark:border-white/5 overflow-hidden">

    {/* ── Animated gradient orbs ── */}
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Orb 1 — warm amber, top-left */}
      <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full animate-orb-1"
        style={{ background: "radial-gradient(circle, rgba(163,127,91,0.18) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      {/* Orb 2 — deep espresso, bottom-right */}
      <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full animate-orb-2"
        style={{ background: "radial-gradient(circle, rgba(88,65,49,0.14) 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      {/* Orb 3 — gold center, subtle */}
      <div className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full animate-orb-3"
        style={{ background: "radial-gradient(circle, rgba(184,156,125,0.12) 0%, transparent 65%)", filter: "blur(50px)" }}
      />
      {/* Dark mode — stronger glows */}
      <div className="hidden dark:block absolute -top-[15%] -left-[5%] w-[50vw] h-[50vw] rounded-full animate-orb-1"
        style={{ background: "radial-gradient(circle, rgba(163,127,91,0.22) 0%, transparent 70%)", filter: "blur(90px)" }}
      />
      <div className="hidden dark:block absolute -bottom-[15%] -right-[5%] w-[45vw] h-[45vw] rounded-full animate-orb-2"
        style={{ background: "radial-gradient(circle, rgba(111,80,56,0.18) 0%, transparent 70%)", filter: "blur(110px)" }}
      />
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.055] mix-blend-overlay animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />
    </div>

    <div className="relative z-10 container mx-auto px-6 lg:px-12 py-20 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

        {/* Left — text */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-[11px] uppercase tracking-[0.3em] text-brand-400 dark:text-white/25 font-medium mb-8 md:mb-10"
          >
            Il Buon Caffe · Koszalin · Od 2003
          </motion.p>

          <div className="overflow-hidden mb-5">
            <motion.h1
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
              className="text-[clamp(2.8rem,7vw,5.5rem)] font-serif text-brand-900 dark:text-white leading-[1.05] tracking-tight"
            >
              Włoskie smaki<br />w Twoim domu.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
            className="text-base md:text-[17px] text-brand-500 dark:text-white/35 leading-relaxed mb-10 md:mb-12 max-w-sm"
          >
            Kawa specialty, włoskie wina, oliwy i delikatesy. Dostawa do całej Polski.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="flex items-center gap-6 md:gap-8"
          >
            <Link
              href="/sklep"
              className="group inline-flex items-center gap-2.5 bg-brand-900 dark:bg-white text-white dark:text-brand-950 px-7 py-3.5 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-brand-700 dark:hover:bg-brand-100 transition-colors duration-300"
            >
              Przeglądaj sklep
              <ArrowUpRight
                className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.5}
              />
            </Link>

            <Link
              href="/kawiarnia"
              className="group inline-flex items-center gap-2 text-brand-400 dark:text-white/25 hover:text-brand-900 dark:hover:text-white/80 transition-colors duration-300 text-[12px] uppercase tracking-[0.18em] font-medium"
            >
              Kawiarnia
              <ArrowUpRight
                className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.5}
              />
            </Link>
          </motion.div>
        </div>

        {/* Right — staggered image mosaic (desktop only) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hidden lg:grid grid-cols-2 gap-3 h-[520px]"
        >
          {/* Tall left card */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: EASE }}
            className="relative rounded-sm overflow-hidden bg-brand-100 dark:bg-brand-900 h-full"
          >
            <Image src={images[0].src} alt={images[0].alt} fill className="object-cover" priority />
          </motion.div>

          {/* Right column — two stacked, offset down */}
          <div className="flex flex-col gap-3 mt-12">
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.42, ease: EASE }}
              className="relative rounded-sm overflow-hidden bg-brand-100 dark:bg-brand-900 flex-1"
            >
              <Image src={images[1].src} alt={images[1].alt} fill className="object-cover" priority />
            </motion.div>
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.54, ease: EASE }}
              className="relative rounded-sm overflow-hidden bg-brand-100 dark:bg-brand-900 flex-1"
            >
              <Image src={images[2].src} alt={images[2].alt} fill className="object-cover" />
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  </section>
);
