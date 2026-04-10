"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const SENTENCE = "Miejsce, gdzie kawa jest rytuałem, a czas — luksusem.";
const WORDS = SENTENCE.split(" ");

const Word = ({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: import("motion/react").MotionValue<number>;
}) => {
  // Each word gets its own slice of the scroll progress
  const start = index / total;
  const end = start + 1 / total;

  const opacity = useTransform(progress, [start, end], [0.08, 1]);
  const blur = useTransform(progress, [start, end], [8, 0]);
  const y = useTransform(progress, [start, end], [6, 0]);

  return (
    <motion.span
      style={{
        opacity,
        filter: useTransform(blur, (v) => `blur(${v}px)`),
        y,
      }}
      className="inline-block mr-[0.3em] last:mr-0"
    >
      {word}
    </motion.span>
  );
};

export const ScrollRevealSentence: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Map scroll to a 0→1 progress that activates in the middle of the viewport
  const progress = useTransform(scrollYProgress, [0.2, 0.65], [0, 1]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden"
    >
      {/* Gradient: dark top (from hero) → warm bottom (to menu) */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900 via-brand-900 to-brand-beige" />

      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-700/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 text-center">
        <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.2] tracking-tight">
          {WORDS.map((word, i) => (
            <Word
              key={i}
              word={word}
              index={i}
              total={WORDS.length}
              progress={progress}
            />
          ))}
        </p>
      </div>
    </section>
  );
};
