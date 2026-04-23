"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const R2 = process.env.NEXT_PUBLIC_R2_MEDIA_URL || "https://media.ilbuoncaffe.pl";

const categories = [
  {
    title: "Kawa",
    subtitle: "Specialty",
    href: "/sklep/kawa",
    image: `${R2}/categories/kawa.webp`,
  },
  {
    title: "Wina",
    subtitle: "i Alkohole",
    href: "/sklep/wino",
    image: `${R2}/categories/wino.webp`,
  },
  {
    title: "Delikatesy",
    subtitle: "Włoskie i Hiszpańskie",
    href: "/sklep/spizarnia",
    image: `${R2}/categories/delikatesy.webp`,
  },
];

export const CategoriesGrid = () => (
  <section className="bg-brand-50 dark:bg-brand-950 py-20 md:py-28 border-b border-brand-100 dark:border-white/5">
    <div className="container mx-auto px-6 lg:px-12">

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex items-end justify-between mb-10 md:mb-12"
      >
        <h2 className="text-2xl md:text-3xl font-serif text-brand-900 dark:text-white">
          Kategorie
        </h2>
        <Link
          href="/sklep"
          className="group inline-flex items-center gap-1.5 text-brand-400 dark:text-white/30 hover:text-brand-900 dark:hover:text-white transition-colors duration-300 text-[11px] uppercase tracking-[0.2em] font-medium"
        >
          Wszystkie
          <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.href}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
          >
            <Link
              href={cat.href}
              className="group block relative aspect-[4/3] overflow-hidden rounded-sm bg-brand-200 dark:bg-brand-900"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 mb-1">
                    {cat.subtitle}
                  </p>
                  <h3 className="text-xl md:text-2xl font-serif text-white">
                    {cat.title}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:border-white/50 group-hover:bg-white/10">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
