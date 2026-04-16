"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const Inside: React.FC = () => {
  return (
    <section className="relative bg-brand-beige pb-24 md:pb-32">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          <div className="md:col-span-2 relative aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-brand-900/5">
            <Image
              src="/assets/kawiarnia.jpg"
              alt="Wnętrze kawiarni Il Buon Caffe"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
            <div className="relative aspect-[4/3] md:aspect-[5/4] overflow-hidden bg-brand-900/5">
              <Image
                src="/assets/about-bakery.png"
                alt="Świeże wypieki w Il Buon Caffe"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-[4/3] md:aspect-[5/4] overflow-hidden bg-brand-900/5">
              <Image
                src="/assets/about-deli.png"
                alt="Włoskie delikatesy w Il Buon Caffe"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          className="mt-6 md:mt-8 max-w-xl text-base md:text-lg text-brand-700 leading-relaxed font-serif italic"
        >
          Lokal działa od 2003 roku. Espresso, świeże wypieki, włoskie delikatesy — kupisz wszystko na miejscu.
        </motion.p>
      </div>
    </section>
  );
};

export default Inside;
