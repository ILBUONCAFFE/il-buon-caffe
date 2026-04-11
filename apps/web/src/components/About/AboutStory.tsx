"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const CHAPTERS = [
  {
    year: "2003",
    title: "Kawiarnia przy Domina",
    text: "W Koszalinie otworzyliśmy mały lokal z jedną porządną maszyną do espresso i włoskimi ziarnami. Żadnego wielkiego planu — chcieliśmy po prostu parzyć kawę tak, jak pije się ją we Włoszech. Okazało się, że ludzie tego szukali. Nie kolejnej sieciówki, ale miejsca, w którym kawa pachnie na cały pasaż, a barista wie, co robi.",
  },
  {
    year: "2010",
    title: "Doszła piekarnia",
    text: "Do kawy doszły wypieki. Chleby na zakwasie, rogale maślane, ciasta — wszystko robione ręcznie, każdego ranka, od zera. Bez gotowych mieszanek. Goście zaczęli przychodzić po kawę i wychodzić z torbą wypieków. Włosi mieszkający w Koszalinie mówili, że smakuje jak u nich.",
  },
  {
    year: "2020",
    title: "Powstały delikatesy",
    text: "Pandemia zamknęła kawiarnię. Zamiast czekać, zmieniliśmy lokal — obok kawy i wypieków na półkach pojawiły się wina od małych winiarzy, oliwy, makarony rzemieślnicze i produkty przywożone z Włoch. Każdy produkt musi najpierw przejść przez nasze ręce i podniebienia. Jeśli nas nie przekona — nie będziemy go sprzedawać.",
  },
];

const Chapter = ({ chapter }: { chapter: (typeof CHAPTERS)[number] }) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 40%"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const yearOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 0.12]);
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative">
      {/* Horizontal accent line that grows */}
      <motion.div
        style={{ scaleX: lineScale, transformOrigin: "left" }}
        className="h-px bg-white/10 mb-10 md:mb-14"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
        {/* Year */}
        <motion.div style={{ opacity: yearOpacity }} className="lg:col-span-3">
          <span className="text-6xl lg:text-7xl font-serif font-bold text-white leading-none">
            {chapter.year}
          </span>
        </motion.div>

        {/* Content */}
        <motion.div style={{ opacity, y }} className="lg:col-span-9">
          <h3 className="text-xl md:text-2xl font-serif text-white mb-4 leading-tight">
            {chapter.title}
          </h3>
          <p className="text-base leading-[1.8] text-white/40 max-w-xl">
            {chapter.text}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export const AboutStory: React.FC = () => {
  return (
    <section className="relative bg-brand-900 py-24 md:py-36">
      <div className="container mx-auto px-6 lg:px-12 max-w-5xl">
        <div className="space-y-20 md:space-y-32">
          {CHAPTERS.map((chapter) => (
            <Chapter key={chapter.year} chapter={chapter} />
          ))}
        </div>
      </div>
    </section>
  );
};
