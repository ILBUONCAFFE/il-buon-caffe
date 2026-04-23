"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const R2_MEDIA_BASE = process.env.NEXT_PUBLIC_R2_MEDIA_URL || "https://media.ilbuoncaffe.pl";

const CHAPTERS = [
  {
    year: "2003",
    title: "Kawiarnia\nprzy Domina",
    body: [
      "Jeden lokal, jedna maszyna do espresso, włoskie ziarna. Żadnego wielkiego planu. Chcieliśmy po prostu parzyć kawę tak, jak pije się ją we Włoszech — mocną, wyraźną, z charakterem.",
      "Okazało się, że właśnie tego ludzie szukali. Nie kolejnej sieciówki, ale miejsca, w którym kawa pachnie na cały pasaż, a barista wie, co robi.",
    ],
    image: "/assets/kawiarnia.jpg",
    imageAlt: "Wnętrze kawiarni Il Buon Caffe, Koszalin",
  },
  {
    year: "2010",
    title: "Doszły\nwypieki",
    body: [
      "Do dobrej kawy dołączyły domowe wypieki. Katarzyna zaczęła ręcznie wypiekać rzemieślnicze chleby, i to jej praca każdego ranka nadawała rytm kawiarni.",
      "Dziś już u nas nie pieczemy bochenków, ale domowa tradycja przetrwała — teraz to Darek przygotowuje swój autorski, domowy sernik, którego pieczenia uczyła go właśnie Katarzyna.",
    ],
    image: `${R2_MEDIA_BASE}/about-us/wypieki.jpg`,
    imageAlt: "Rzemieślnicze wypieki Il Buon Caffe",
  },
  {
    year: "2020",
    title: "Powstały\ndelikatesy",
    body: [
      "Pandemia zamknęła kawiarnię. Zamiast czekać, zmieniliśmy lokal — obok kawy i wypieków na półkach pojawiły się wina od małych winiarzy, oliwy, makarony rzemieślnicze.",
      "Każdy produkt musi najpierw przejść przez nasze ręce i podniebienia. Jeśli nas nie przekona — nie trafi na półkę.",
    ],
  },
] as const;

const ChapterColumn = ({
  chapter,
  index,
}: {
  chapter: {
    year: string;
    title: string;
    body: readonly string[];
    image?: string;
    imageAlt?: string;
  };
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 30%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.07, 1]);

  return (
    <motion.article
      ref={ref}
      style={{ opacity, y }}
      transition={{ ease: EASE }}
      className="flex flex-col"
    >
      {/* Year */}
      <span
        className="text-[10px] uppercase tracking-[0.3em] text-brand-400 font-semibold mb-6"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {chapter.year}
      </span>

      {/* Title */}
      <h2 className="font-serif text-white text-3xl lg:text-[2.2rem] leading-[1.05] mb-7 tracking-tight whitespace-pre-line">
        {chapter.title}
      </h2>

      {/* Body text */}
      <div className="flex-1 space-y-4">
        {chapter.body.map((para, i) => (
          <p
            key={i}
            className="text-white/50 text-[15px] leading-[1.9]"
          >
            {para}
          </p>
        ))}
      </div>

      {/* Image — sits at the bottom of each column */}
      {chapter.image && (
        <motion.div
          style={{ scale: imgScale }}
          className="mt-10 relative aspect-[4/5] w-full overflow-hidden"
        >
          <Image
            src={chapter.image}
            alt={chapter.imageAlt || ""}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
        </motion.div>
      )}
    </motion.article>
  );
};

export const AboutStory: React.FC = () => {
  return (
    <section className="relative bg-brand-950 overflow-hidden">
      {/* Grain overlay */}
      <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.18] mix-blend-overlay pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 lg:px-12 max-w-7xl pt-24 md:pt-32 pb-24 md:pb-36">
        {/* Section header */}
        <div className="flex items-center gap-8 mb-20 md:mb-28">
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-400/70 font-semibold flex-shrink-0">
            Kronika
          </span>
          <div className="h-px flex-1 bg-white/[0.1]" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-400/30 font-semibold flex-shrink-0">
            2003 — dziś
          </span>
        </div>

        {/* Three-column newspaper grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x md:divide-white/[0.08]">
          {CHAPTERS.map((chapter, idx) => (
            <div
              key={chapter.year}
              className={
                idx > 0
                  ? "md:pl-10 lg:pl-14 mt-16 md:mt-0"
                  : "md:pr-10 lg:pr-14"
              }
            >
              {/* Mobile top rule between chapters */}
              {idx > 0 && (
                <div className="h-px bg-white/[0.1] mb-16 md:hidden" />
              )}
              <ChapterColumn chapter={chapter} index={idx} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
