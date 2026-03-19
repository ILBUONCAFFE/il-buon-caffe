"use client";

import React from "react";
import { motion } from "motion/react";

const MarqueeItem = ({ text }: { text: string }) => {
  return (
    <div className="flex items-center gap-4 px-4 overflow-hidden">
      <span className="text-3xl md:text-5xl lg:text-6xl font-serif text-brand-900/10 whitespace-nowrap uppercase tracking-widest font-bold">
        {text}
      </span>
      <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-brand-700/20" />
    </div>
  );
};

export const Marquee = () => {
  const content = [
    "Włoska Tradycja",
    "Najwyższa Jakość",
    "Est. 2003",
    "Il Buon Caffe",
    "Kawa Specialty",
    "Wyborne Wina",
  ];

  return (
    <section className="py-12 md:py-20 bg-white overflow-hidden border-b border-brand-100/50">
      <div className="flex select-none">
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-100%" }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex flex-shrink-0"
        >
          {content.map((item, i) => (
            <MarqueeItem key={`1-${i}`} text={item} />
          ))}
        </motion.div>
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-100%" }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex flex-shrink-0"
        >
          {content.map((item, i) => (
            <MarqueeItem key={`2-${i}`} text={item} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};
