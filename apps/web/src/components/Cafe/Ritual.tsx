"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PARAGRAPHS = [
  {
    text: "Nie spieszymy się. Każde espresso ma swój czas — od zmielenia do podania. Każdy sernik swój poranek w piecu. Tu nie ma skrótów.",
    opacity: "text-white/60",
  },
  {
    text: "Produkty na półkach wybieramy tak, jak wybiera się wino na kolację — osobiście, z namysłem, bez kompromisów. Jeśli nie zachwyci nas, nie trafi do Ciebie.",
    opacity: "text-white/45",
  },
  {
    text: "Wpadnij na espresso i wróć do domu z butelką wina albo oliwą, która zmieni Twoją kuchnię. Wszystko, co mamy na półkach, możesz kupić na miejscu.",
    opacity: "text-white/30",
  },
];

export const Ritual: React.FC = () => {
  return (
    <section className="relative bg-brand-900 overflow-hidden py-28 md:py-40">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand-700/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Label */}
          <motion.span
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="block text-[11px] uppercase tracking-[0.3em] text-white/25 font-medium mb-10 text-center"
          >
            Nasz rytuał
          </motion.span>

          {/* Heading */}
          <div className="mb-12 text-center">
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%", filter: "blur(8px)" }}
                whileInView={{ y: "0%", filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE }}
                className="text-3xl sm:text-4xl md:text-5xl font-serif text-white leading-[1.1]"
              >
                Bez kompromisów,
              </motion.h2>
            </div>
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%", filter: "blur(8px)" }}
                whileInView={{ y: "0%", filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
                className="text-3xl sm:text-4xl md:text-5xl font-handwriting text-brand-400 leading-[1.2]"
              >
                od dwudziestu lat.
              </motion.h2>
            </div>
          </div>

          {/* Paragraphs — decreasing opacity */}
          <div className="space-y-6 text-center mb-14">
            {PARAGRAPHS.map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }}
                className={`text-base md:text-lg leading-relaxed ${para.opacity}`}
              >
                {para.text}
              </motion.p>
            ))}
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: EASE }}
            className="origin-center h-px bg-white/10 max-w-xs mx-auto mb-10"
          />

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
            className="text-center"
          >
            <Link
              href="/sklep"
              className="group inline-flex items-center gap-3"
            >
              <span className="text-brand-400 text-sm font-bold uppercase tracking-[0.15em] transition-colors duration-300 group-hover:text-brand-200">
                Zabierz smak do domu
              </span>
              <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:border-brand-300 group-hover:translate-x-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-white/50 transition-colors duration-300 group-hover:text-brand-300" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
