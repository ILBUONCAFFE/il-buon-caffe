"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "motion/react";

const STATEMENTS = [
  "Każdy produkt próbujemy sami, zanim trafi na półkę.",
  "Znamy ludzi, od których kupujemy.",
  "Wypieki robimy od zera, każdego ranka.",
  "Nie sprzedajemy rzeczy, które sami byśmy nie kupili.",
  "Włosi robią u nas zakupy. To mówi więcej niż certyfikat.",
];

const RevealLine = ({
  text,
  index,
  total,
  progress,
}: {
  text: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) => {
  // Each line gets a staggered slice of the total progress
  const gap = 0.08;
  const sliceWidth = (1 - gap * (total - 1)) / total;
  const start = index * (sliceWidth + gap);
  const mid = start + sliceWidth * 0.7;

  const opacity = useTransform(progress, [start, mid], [0.04, 1]);
  const y = useTransform(progress, [start, mid], [16, 0]);
  const blurVal = useTransform(progress, [start, mid], [4, 0]);
  const filterStr = useTransform(blurVal, (v) => `blur(${v}px)`);

  return (
    <motion.p
      style={{ opacity, y, filter: filterStr }}
      className="text-xl sm:text-2xl md:text-3xl font-serif text-white leading-[1.45] tracking-tight"
    >
      {text}
    </motion.p>
  );
};

export const AboutValues: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const progress = useTransform(scrollYProgress, [0.05, 0.85], [0, 1]);

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: "250vh" }}
    >
      {/* Smooth gradient — inline with many stops to prevent banding */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            #f3eee8 0%,
            #e6dcd3 8%,
            #c4a882 16%,
            #8a6446 26%,
            #4a3525 38%,
            #2a1f17 50%,
            #1c1917 65%,
            #1c1917 100%
          )`,
        }}
      />

      {/* Sticky container — pinned in viewport while user scrolls */}
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div className="relative z-10 max-w-2xl mx-auto px-6 lg:px-12 space-y-5 md:space-y-7">
          {STATEMENTS.map((text, i) => (
            <RevealLine
              key={i}
              text={text}
              index={i}
              total={STATEMENTS.length}
              progress={progress}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
