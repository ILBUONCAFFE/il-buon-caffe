"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const MOMENTS = [
  {
    time: "9:00",
    label: "Poranek",
    headline: "Pierwszy rytuał",
    text: "Świeżo zmielone ziarna, zapach rozchodzi się po lokalu. Espresso w grubościennej filiżance — gorące, gęste, idealne. Dzień zaczyna się dobrze.",
    gradient: "from-amber-900/40 via-brand-900 to-brand-900",
    accent: "text-amber-300",
    dotColor: "bg-amber-400",
    lineColor: "from-amber-400/60",
  },
  {
    time: "12:00",
    label: "Południe",
    headline: "Sernik dnia",
    text: "Wypiekany rano przez właściciela, z wanilią i skórką cytrynową. Każdego dnia inny, każdego dnia ktoś pyta — czy jeszcze jest?",
    gradient: "from-brand-900 via-brand-900 to-brand-900",
    accent: "text-brand-300",
    dotColor: "bg-brand-400",
    lineColor: "from-brand-400/60",
  },
  {
    time: "15:00",
    label: "Popołudnie",
    headline: "Ostatni specjał",
    text: "Cisza przed zamknięciem. Caffe Freddo z lodami, słońce pada przez witrynę. Po drodze do wyjścia — butelka oliwy albo wino na wieczór. Chwila, dla której warto było tu przyjść.",
    gradient: "from-brand-900 via-brand-900 to-brand-900/80",
    accent: "text-rose-300",
    dotColor: "bg-rose-400",
    lineColor: "from-rose-400/60",
  },
];

const Moment = ({
  moment,
  index,
}: {
  moment: (typeof MOMENTS)[number];
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.6], [60, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.6], [12, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, filter: useTransform(blur, (v) => `blur(${v}px)`) }}
      className="relative grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start"
    >
      {/* Timeline column */}
      <div className="md:col-span-3 lg:col-span-2 flex md:flex-col items-center md:items-end gap-4 md:gap-2 md:pt-1">
        <span className={`font-mono text-3xl md:text-4xl font-bold tracking-tight ${moment.accent}`}>
          {moment.time}
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium">
          {moment.label}
        </span>
      </div>

      {/* Dot + line */}
      <div className="hidden md:flex md:col-span-1 flex-col items-center pt-3">
        <div className={`w-3 h-3 rounded-full ${moment.dotColor} shadow-lg`} />
        {index < MOMENTS.length - 1 && (
          <div className={`w-px flex-1 min-h-[80px] bg-gradient-to-b ${moment.lineColor} to-transparent mt-2`} />
        )}
      </div>

      {/* Content */}
      <div className="md:col-span-8 lg:col-span-9">
        <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif text-white mb-4 leading-tight">
          {moment.headline}
        </h3>
        <p className="text-base md:text-lg text-white/45 leading-relaxed max-w-xl">
          {moment.text}
        </p>
      </div>
    </motion.div>
  );
};

export const DayTimeline: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Progress bar width tied to section scroll
  const progressWidth = useTransform(scrollYProgress, [0.1, 0.85], ["0%", "100%"]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-brand-900 py-24 md:py-32 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[150px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-rose-900/10 rounded-full blur-[130px] pointer-events-none translate-x-1/3" />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
          className="mb-20 md:mb-28"
        >
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/25 font-medium mb-5">
            Jeden dzień
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white">
            Scena dnia
          </h2>
        </motion.div>

        {/* Moments */}
        <div className="space-y-20 md:space-y-28">
          {MOMENTS.map((moment, i) => (
            <Moment key={moment.time} moment={moment} index={i} />
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-20 md:mt-28">
          <div className="h-px bg-white/10 relative overflow-hidden">
            <motion.div
              style={{ width: progressWidth }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400/60 via-brand-400/60 to-rose-400/60"
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-medium">Otwarcie</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-medium">Zamknięcie</span>
          </div>
        </div>
      </div>
    </section>
  );
};
