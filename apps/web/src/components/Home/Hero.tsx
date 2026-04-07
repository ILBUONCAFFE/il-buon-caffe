"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { AnimatedText } from "@/components/ui/AnimatedText";

export const Hero = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);

  return (
    <section ref={containerRef} className="relative min-h-screen w-full flex items-center overflow-hidden">
      {/* Background Image - Coffee with lavender */}
      <motion.div style={{ y }} className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670&auto=format&fit=crop"
          alt="Kawa serwowana w kawiarni Il Buon Caffe w Koszalinie"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 w-full">
        <div className="container mx-auto px-6 lg:px-12 py-32">
          <motion.div
            className="max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* SEO H1 — visually hidden, semantic for search engines */}
            <h1 className="sr-only">Il Buon Caffe – Twoja Kawiarnia w Koszalinie</h1>

            {/* Badge */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 bg-white/10 border border-white/20 rounded-full text-xs tracking-widest uppercase text-white/80">
                Est. 2003 · Koszalin
              </span>
            </motion.div>

            {/* Heading — decorative, aria-hidden; SEO h1 is sr-only above */}
            <div className="mb-6" aria-hidden="true">
              <AnimatedText
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif text-white leading-[0.95]"
                text="Il Buon"
                el="div"
                delayChildren={0.1}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif leading-[0.95] text-brand-400 italic"
              >
                Caffe
              </motion.div>
            </div>

            {/* Subheading */}
            <AnimatedText
              className="text-xl md:text-2xl text-white/70 max-w-xl mb-10 leading-relaxed"
              text="Włoskie wina, oliwy, migdały, słodycze i kawa specialty. Wysyłka na terenie całej Polski."
              delayChildren={0.6}
            />

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <motion.div
                whileHover={{ y: -4, scale: 1.03 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
              >
                <Link
                  href="/sklep"
                  className="group relative inline-flex items-center gap-2 px-7 py-4 bg-white text-brand-900 rounded-full font-semibold text-sm transition-all duration-300 shadow-lg shadow-black/25 hover:shadow-black/35 overflow-hidden"
                >
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_20%,rgba(255,255,255,0.8),transparent_60%)] opacity-0"
                    whileHover={{ opacity: 0.7 }}
                    transition={{ duration: 0.35 }}
                  />
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0"
                    whileHover={{ x: "200%", opacity: 0.8 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className="relative z-10">Odkryj sklep</span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1.5" />
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                <Link
                  href="/kawiarnia"
                  className="group relative inline-flex items-center gap-2 px-7 py-4 bg-white/5 border border-white/50 text-white rounded-full font-semibold text-sm transition-all duration-300 hover:bg-white/10 hover:border-white/70 overflow-hidden"
                >
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(255,255,255,0.35),transparent_65%)] opacity-0"
                    whileHover={{ opacity: 0.6 }}
                    transition={{ duration: 0.35 }}
                  />
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0"
                    whileHover={{ x: "200%", opacity: 0.7 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className="relative z-10">Nasza kawiarnia</span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to page background */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10" />
    </section>
  );
};
