"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, MapPin } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const tickerItems = [
  "Espresso 8 zł",
  "Cappuccino 14 zł",
  "Latte Macchiato",
  "Domowy sernik",
  "Świeże wypieki",
  "Włoskie delikatesy",
  "Caffè Freddo",
  "Specialty beans",
  "Bombon",
  "Frappe",
];

export const CafeHero: React.FC = () => {
  return (
    <section className="relative bg-[#f3eee8] dark:bg-brand-950 border-b border-brand-100 dark:border-white/5 overflow-hidden">
      {/* Editorial background */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f7f2ec] via-[#f3eee8] to-[#ebe2d5] dark:from-brand-950 dark:via-brand-950 dark:to-[#1a1410]" />

        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #1c1917 0, #1c1917 1px, transparent 1px, transparent 14px)",
          }}
        />

        {/* Giant outlined wordmark */}
        <div className="absolute inset-x-0 -bottom-[10%] md:-bottom-[18%] flex items-end justify-center">
          <h2
            aria-hidden="true"
            className="font-serif italic font-bold leading-none tracking-tighter text-transparent whitespace-nowrap"
            style={{
              fontSize: "clamp(18rem, 34vw, 46rem)",
              WebkitTextStroke: "1.5px rgba(163,127,91,0.18)",
            }}
          >
            Caffè
          </h2>
        </div>

        {/* Live status badge */}
        <div className="absolute top-8 right-6 md:right-12 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-brand-500/60 dark:text-white/30 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Zapraszamy dziś
        </div>

        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-300/40 dark:via-white/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 lg:px-12 pt-20 md:pt-24 pb-40 md:pb-48 min-h-[88vh] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center w-full">

          {/* Text column */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-4 mb-10 md:mb-14"
            >
              <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 dark:text-white/40 font-medium">
                Koszalin · Od 2003
              </span>
              <span className="h-px flex-1 max-w-[60px] bg-brand-300/50 dark:bg-white/15" />
              <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 dark:text-white/40 font-medium">
                Kawiarnia &amp; Delikatesy
              </span>
            </motion.div>

            <div className="overflow-hidden mb-6">
              <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
                className="text-[clamp(3rem,7.5vw,6rem)] font-serif text-brand-900 dark:text-white leading-[0.98] tracking-[-0.02em]"
              >
                Prawdziwa<br />
                <span className="italic text-brand-700 dark:text-brand-300">włoska</span> kawiarnia.
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
              className="text-base md:text-[17px] text-brand-600 dark:text-white/50 leading-relaxed mb-10 md:mb-12 max-w-md"
            >
              Espresso, świeże wypieki i włoskie delikatesy przy ul. Biskupa Domina w Koszalinie.
              Parzymy kawę specialty od ponad dwudziestu lat.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
              className="flex flex-wrap items-center gap-6 md:gap-10"
            >
              <Link
                href="#menu"
                className="group relative inline-flex items-center gap-3 bg-brand-900 dark:bg-white text-white dark:text-brand-950 pl-7 pr-5 py-4 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-brand-700 dark:hover:bg-brand-100 transition-colors duration-300 overflow-hidden"
              >
                <span>Zobacz kartę</span>
                <span className="w-px h-5 bg-white/20 dark:bg-brand-950/20 mx-1" />
                <ArrowUpRight
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2}
                />
              </Link>

              <Link
                href="#location"
                className="group inline-flex items-center gap-2 text-brand-600 dark:text-white/50 hover:text-brand-900 dark:hover:text-white transition-colors duration-300 text-[12px] uppercase tracking-[0.18em] font-semibold border-b border-brand-300 dark:border-white/20 pb-1"
              >
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                Jak dojechać
              </Link>
            </motion.div>

            {/* Shop signal strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-12 md:mt-16 grid grid-cols-3 gap-6 max-w-md"
            >
              {[
                { n: "Od 2003", l: "Na mapie Koszalina" },
                { n: "Pn–Pt", l: "09:00 – 16:00" },
                { n: "So", l: "11:00 – 14:00" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-serif text-xl md:text-2xl text-brand-900 dark:text-white tracking-tight">
                    {s.n}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-brand-500 dark:text-white/35 mt-1 font-medium">
                    {s.l}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — offset image stack */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative hidden lg:block h-[560px]"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: EASE }}
              className="absolute top-0 right-0 w-[72%] h-[68%] overflow-hidden shadow-[0_30px_60px_-20px_rgba(28,25,23,0.25)] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
            >
              <Image
                src="/assets/kawiarnia.jpg"
                alt="Wnętrze kawiarni Il Buon Caffe"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 0px, 40vw"
              />
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white">
                Sala
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.45, ease: EASE }}
              className="absolute bottom-8 left-0 w-[52%] h-[44%] overflow-hidden shadow-[0_30px_60px_-20px_rgba(28,25,23,0.3)] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
            >
              <Image
                src="https://media.ilbuoncaffe.pl/about-us/wypieki.jpg"
                alt="Świeże wypieki"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 0px, 30vw"
              />
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white">
                Wypieki
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.6, ease: EASE }}
              className="absolute bottom-0 right-4 w-[38%] h-[32%] overflow-hidden shadow-[0_20px_40px_-15px_rgba(28,25,23,0.3)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] bg-brand-900/5"
            >
              <div className="absolute top-2 left-2 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white">
                Delikatesy
              </div>
            </motion.div>

          </motion.div>

        </div>
      </div>

      {/* Bottom marquee */}
      <div className="absolute bottom-0 inset-x-0 border-t border-brand-200/60 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-sm py-5 overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap animate-marquee-left" style={{ ["--marquee-duration" as string]: "45s" }}>
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="flex items-center gap-12 text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-700 dark:text-white/60">
              {item}
              <span className="text-brand-400/50 dark:text-white/20">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CafeHero;
