"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Truck, Shield, Award, Leaf, Heart, Clock } from "lucide-react";
import { AnimatedText } from "@/components/ui/AnimatedText";

const benefits = [
  {
    icon: Truck,
    title: "Darmowa dostawa",
    description: "Przy zamówieniach powyżej 150 zł wysyłka jest zawsze gratis.",
    stat: "150+",
    statSuffix: "zł",
  },
  {
    icon: Shield,
    title: "Gwarancja jakości",
    description: "Każdy produkt przechodzi rygorystyczną selekcję smaku.",
    stat: "100",
    statSuffix: "%",
  },
  {
    icon: Award,
    title: "Doświadczenie",
    description: "Od ponad dwóch dekad budujemy markę, której ufają tysiące.",
    stat: "20",
    statSuffix: "+",
  },
  {
    icon: Clock,
    title: "Szybka wysyłka",
    description: "Realizujemy zamówienia w ciągu jednego dnia roboczego.",
    stat: "24",
    statSuffix: "h",
  },
  {
    icon: Leaf,
    title: "Świeżość",
    description: "Kawa palona na zamówienie — nigdy nie czeka na półce.",
    stat: "100",
    statSuffix: "%",
  },
  {
    icon: Heart,
    title: "Pasja",
    description: "Za każdym produktem stoi człowiek zakochany w rzemiośle.",
    stat: "∞",
    statSuffix: "",
  },
];

const BenefitCard = ({
  benefit,
  index,
}: {
  benefit: (typeof benefits)[0];
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative"
    >
      <div className="relative h-full rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm p-8 md:p-10 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-700">

        {/* Stat Row */}
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-5xl md:text-6xl font-serif text-white leading-none tracking-tight">
            {benefit.stat}
          </span>
          <span className="text-2xl md:text-3xl font-serif text-brand-400 italic leading-none">
            {benefit.statSuffix}
          </span>
        </div>

        {/* Divider */}
        <div className="w-8 h-[1px] bg-white/20 mb-6 group-hover:w-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" />

        {/* Title + Icon */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg md:text-xl font-semibold text-white/90 leading-snug">
            {benefit.title}
          </h3>
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:bg-brand-400/20 group-hover:border-brand-400/30 transition-all duration-500">
            <benefit.icon className="w-[18px] h-[18px] text-brand-400/80 group-hover:text-brand-400 transition-colors duration-500" />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors duration-500">
          {benefit.description}
        </p>
      </div>
    </motion.div>
  );
};

export const WhyUs = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-brand-900 overflow-x-hidden"
    >
      {/* Subtle gradient orbs */}
      <motion.div
        style={{ y: bgY }}
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-700/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4"
      />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/4" />

      {/* Decorative large text in the background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[22vw] font-serif text-white/[0.02] leading-none whitespace-nowrap">
          Qualità
        </span>
      </div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        {/* Header — left-aligned editorial style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-20 md:mb-28">
          {/* Left: Title */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-brand-400 mb-8"
            >
              Dlaczego My
            </motion.span>

            <AnimatedText
              text="Jakość,"
              el="h2"
              className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-[0.95]"
              delayChildren={0.1}
            />
            <AnimatedText
              text="której zaufasz"
              el="h2"
              className="text-5xl md:text-7xl lg:text-8xl font-serif text-brand-400 italic leading-[0.95]"
              delayChildren={0.3}
            />
          </div>

          {/* Right: Description + decorative line */}
          <div className="flex flex-col justify-end">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="origin-left h-[1px] bg-gradient-to-r from-brand-400/50 to-transparent mb-8 hidden lg:block"
            />
            <AnimatedText
              text="Od 2003 roku tworzymy miejsce, gdzie spotyka się rzemiosło z pasją. Każdy produkt w naszym sklepie jest dowodem na to, że jakość i smak mogą iść w parze."
              className="text-white/50 text-lg md:text-xl leading-relaxed max-w-xl"
              delayChildren={0.5}
            />
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard key={benefit.title} benefit={benefit} index={index} />
          ))}
        </div>

        {/* Bottom subtle note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-20 md:mt-28"
        >
          <p className="text-white/20 text-xs uppercase tracking-[0.25em]">
            Dołącz do tysięcy zadowolonych klientów
          </p>
        </motion.div>
      </div>
    </section>
  );
};
