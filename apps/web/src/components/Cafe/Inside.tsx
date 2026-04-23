"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STATS = [
  { n: "21", l: "Lat w Koszalinie" },
  { n: "3", l: "Strefy: kawa · wypieki · deli" },
  { n: "100%", l: "Wypieki z własnej kuchni" },
];

export const Inside: React.FC = () => {
  return (
    <section className="relative bg-[#f3eee8] dark:bg-brand-950 py-24 md:py-32 border-b border-brand-100 dark:border-white/5">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-14 md:mb-20 max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 dark:text-white/40 font-medium">
              § 02 — Wnętrze
            </span>
            <span className="h-px w-12 bg-brand-300/50 dark:bg-white/15" />
          </div>
          <h2 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] text-brand-900 dark:text-white tracking-[-0.02em] leading-[0.98]">
            Trzy pokoje pod <span className="italic text-brand-700 dark:text-brand-300">jednym dachem</span>
          </h2>
        </motion.header>

        {/* Image grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5"
        >
          {/* Main wide */}
          <div className="md:col-span-4 md:row-span-2 relative aspect-[4/3] md:aspect-auto md:min-h-[520px] overflow-hidden bg-brand-900/5 shadow-[0_30px_60px_-20px_rgba(28,25,23,0.2)]">
            <Image
              src="/assets/kawiarnia.jpg"
              alt="Wnętrze kawiarni Il Buon Caffe"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
            <div className="absolute top-4 left-4 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white">
              Sala główna
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-end">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/80">
                01 / 03
              </span>
            </div>
          </div>

          {/* Bakery */}
          <div className="md:col-span-2 relative aspect-[4/3] md:aspect-auto md:min-h-[250px] overflow-hidden bg-brand-900/5 shadow-[0_30px_60px_-20px_rgba(28,25,23,0.2)]">
            <Image
              src="https://media.ilbuoncaffe.pl/about-us/wypieki.jpg"
              alt="Świeże wypieki w Il Buon Caffe"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute top-3 left-3 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white">
              Wypieki
            </div>
            <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 drop-shadow-md">
              02 / 03
            </span>
          </div>

          {/* Deli */}
          <div className="md:col-span-2 relative aspect-[4/3] md:aspect-auto md:min-h-[250px] overflow-hidden bg-brand-900/5 shadow-[0_30px_60px_-20px_rgba(28,25,23,0.2)]">
            <div className="absolute top-3 left-3 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white">
              Delikatesy
            </div>
            <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 drop-shadow-md">
              03 / 03
            </span>
          </div>
        </motion.div>

        {/* Bottom row: copy + stats */}
        <div className="mt-14 md:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="lg:col-span-6"
          >
            <p className="font-serif text-xl md:text-2xl text-brand-900 dark:text-white leading-snug">
              Kawiarnia, piekarnia i sklep z włoskimi delikatesami — w jednym miejscu, od 2003 roku.
              Wchodzisz po kawę, wychodzisz z torbą parmezanu i domowym sernikiem.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="lg:col-span-6 grid grid-cols-3 gap-6 lg:pl-8 lg:border-l lg:border-brand-300/40 dark:lg:border-white/10"
          >
            {STATS.map((s) => (
              <div key={s.l}>
                <div className="font-serif text-3xl md:text-4xl text-brand-900 dark:text-white tracking-tight">
                  {s.n}
                </div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-brand-500 dark:text-white/35 mt-2 font-medium leading-snug">
                  {s.l}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Inside;
