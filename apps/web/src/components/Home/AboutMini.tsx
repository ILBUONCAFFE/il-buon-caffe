"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { AnimatedText } from "@/components/ui/AnimatedText";

const stats = [
  { value: "2003", label: "Rok założenia" },
  { value: "20+", label: "Lat doświadczenia" },
  { value: "300+", label: "Produktów" },
];

export const AboutMini = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 bg-brand-50 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div ref={imageRef} className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-brand-200">
              <motion.div style={{ y: imageY }} className="absolute -inset-[10%]">
                <Image
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop"
                  alt="Wnętrze kawiarni Il Buon Caffe w Koszalinie — przytulna włoska kawiarnia"
                  fill
                  className="object-cover brightness-90 saturate-[1.1]"
                  style={{ filter: "sepia(0.18) saturate(1.1) brightness(0.9)" }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </motion.div>
              {/* Warm brand colour overlay */}
              <div className="absolute inset-0 bg-brand-800/10 mix-blend-multiply pointer-events-none" />

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-8 right-8 bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-brand-400 font-bold mb-1">Est.</p>
                <p className="text-4xl font-serif text-brand-900 leading-none">2003</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Right — Text */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-brand-600 mb-8"
            >
              O nas
            </motion.span>

            <div className="mb-8">
              <AnimatedText
                text="Smak Włoch"
                el="h2"
                className="text-5xl md:text-6xl lg:text-7xl font-serif text-brand-900 leading-[0.95]"
                delayChildren={0.1}
              />
              <AnimatedText
                text="w każdej chwili"
                el="h2"
                className="text-5xl md:text-6xl lg:text-7xl font-serif text-brand-400 italic leading-[0.95]"
                delayChildren={0.3}
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-brand-600 text-lg leading-relaxed mb-6 max-w-lg"
            >
              Od 2003 roku sprowadzamy do Polski to, co we Włoszech najlepsze.
              Wina od małych winiarzy, oliwy tłoczone na zimno, migdały i słodycze
              z rodzinnych manufaktur — oraz kawy specialty od mistrzów palenia.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-brand-500 text-base leading-relaxed mb-12 max-w-lg"
            >
              Każdy produkt w naszym sklepie przeszedł przez nasze ręce i nasze
              kubki smakowe. Nie handlujemy — dobieramy.
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="grid grid-cols-3 gap-6 mb-12"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-brand-200 pl-4">
                  <p className="text-3xl font-serif text-brand-900 leading-none mb-1">{stat.value}</p>
                  <p className="text-xs text-brand-500 uppercase tracking-[0.15em]">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Link
                href="/sklep"
                className="group inline-flex items-center gap-3 px-7 py-4 bg-brand-900 text-white rounded-full font-semibold text-sm hover:bg-brand-700 transition-colors"
              >
                <span>Odkryj asortyment</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
