"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { CafeHeroButtons } from "./CafeHeroButtons";
import { ScrollRevealSentence } from "./ScrollRevealSentence";
import { TastingMenu } from "./TastingMenu";
import { DayTimeline } from "./DayTimeline";
import { Ritual } from "./Ritual";
import { Location } from "./Location";

const CafeClient: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  return (
    <div className="bg-brand-beige min-h-screen">
      
      {/* ===== HERO SECTION ===== */}
      <section 
        ref={containerRef} 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background */}
        <motion.div 
          style={{ y: heroY, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/90 z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(255,255,255,0.08),transparent_60%)] z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_120%,rgba(0,0,0,0.7),transparent_60%)] z-10" />
          <Image
            src="/assets/kawiarnia.jpg"
            alt="Wnętrze kawiarni Il Buon Caffe"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>

        {/* Content */}
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-20 text-center px-6 max-w-5xl"
        >
          {/* Title */}
          <h1 className="mb-8 leading-[1.08]">
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-medium text-white tracking-tight">
              Kawiarnia
            </span>
            <span className="block mt-1 md:mt-0.5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-handwriting leading-[1.12] text-brand-300">
              & Delikatesy
            </span>
          </h1>

          {/* Quote */}
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-12">
            "Kawa to język, w którym milczenie smakuje najlepiej."
          </p>

          {/* Tabs */}
          <div className="w-full flex justify-center">
            <CafeHeroButtons />
          </div>
        </motion.div>

        {/* Bottom fade to page background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-brand-900 via-brand-900/70 to-transparent z-10" />
      </section>

      {/* ===== SCROLL REVEAL SENTENCE ===== */}
      <ScrollRevealSentence />

      {/* ===== TASTING MENU ===== */}
      <TastingMenu />

      {/* ===== DAY TIMELINE ===== */}
      <DayTimeline />

      {/* ===== RITUAL / MANIFESTO ===== */}
      <Ritual />

      {/* ===== LOCATION ===== */}
      <Location />
    </div>
  );
};

export default CafeClient;
