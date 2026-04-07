"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Clock, ArrowRight } from "lucide-react";

export const CafeBanner = () => {
  return (
    <section className="bg-brand-900 border-t border-white/10">
      <div className="container mx-auto px-6 lg:px-12 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          {/* Left: label + info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-brand-400 flex-shrink-0">
              Kawiarnia stacjonarna
            </span>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-white/50">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-400/70 flex-shrink-0" aria-hidden="true" />
                ul. Biskupa Czesława Domina 3/6, Koszalin
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400/70 flex-shrink-0" aria-hidden="true" />
                Pn–Pt 09:00–16:00 · Sob 11:00–14:00
              </span>
            </div>
          </div>

          {/* Right: CTA */}
          <Link
            href="/kawiarnia"
            className="group inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            <span>Więcej o kawiarni</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
