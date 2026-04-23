"use client";

import React from "react";
import { motion } from "motion/react";
import { Clock, Phone, Instagram, Facebook, Navigation, Mail, ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HOURS = [
  { label: "Pon – Pt", value: "09:00 – 16:00" },
  { label: "Sobota", value: "11:00 – 14:00" },
  { label: "Niedziela", value: "Zamknięte" },
];

export const Visit: React.FC = () => {
  return (
    <section
      id="location"
      className="relative bg-[#f3eee8] dark:bg-brand-950 py-24 md:py-32 scroll-mt-40 md:scroll-mt-48 overflow-hidden"
    >
      {/* Outlined wordmark bg */}
      <div
        aria-hidden
        className="absolute inset-x-0 -bottom-[20%] flex items-end justify-center pointer-events-none select-none"
      >
        <span
          className="font-serif italic font-bold leading-none tracking-tighter text-transparent whitespace-nowrap"
          style={{
            fontSize: "clamp(14rem, 26vw, 36rem)",
            WebkitTextStroke: "1.5px rgba(163,127,91,0.14)",
          }}
        >
          Koszalin
        </span>
      </div>

      <div className="relative container mx-auto px-6 lg:px-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-14 md:mb-20 max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[11px] uppercase tracking-[0.3em] text-brand-500 dark:text-white/40 font-medium">
              § 03 — Odwiedź
            </span>
            <span className="h-px w-12 bg-brand-300/50 dark:bg-white/15" />
          </div>
          <h2 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] text-brand-900 dark:text-white tracking-[-0.02em] leading-[0.98]">
            ul. Biskupa <span className="italic text-brand-700 dark:text-brand-300">Domina</span> 3/6
          </h2>
          <p className="mt-6 text-base md:text-[17px] text-brand-600 dark:text-white/50 max-w-md leading-relaxed">
            Centrum Koszalina, dwie minuty od Rynku. Parking płatny wzdłuż ulicy.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative lg:col-span-7 aspect-[4/3] lg:aspect-auto lg:min-h-[520px] overflow-hidden bg-brand-900/5 shadow-[0_30px_60px_-20px_rgba(28,25,23,0.25)]"
          >
            <iframe
              title="Mapa Il Buon Caffe — Koszalin"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2334.5129280751567!2d16.178687613014777!3d54.18870151124879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4701cd19ce8013ef%3A0x217844af23dcbb8a!2sKawiarnia%20%26%20Delikatesy%20Il%20Boun%20Caffe!5e0!3m2!1spl!2spl!4v1774121913838!5m2!1spl!2spl"
              width="100%"
              height="100%"
              style={{ border: 0, filter: "grayscale(0.8) contrast(1.1) brightness(0.98)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full"
            />
            {/* Pin card overlay */}
            <div className="absolute top-4 left-4 bg-white/95 dark:bg-brand-950/95 backdrop-blur-sm px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              75-065 Koszalin
            </div>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Il+Buon+Caffe+Koszalin"
              target="_blank"
              rel="noopener noreferrer"
              className="group absolute bottom-4 right-4 inline-flex items-center gap-2 bg-brand-900 dark:bg-white text-white dark:text-brand-950 pl-5 pr-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] hover:bg-brand-700 dark:hover:bg-brand-100 transition-colors shadow-xl"
            >
              <Navigation className="w-3.5 h-3.5" strokeWidth={2} />
              Wyznacz trasę
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
            </a>
          </motion.div>

          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="lg:col-span-5 flex flex-col gap-8 bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-brand-100 dark:border-white/10 p-8 md:p-10"
          >
            {/* Hours */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0" aria-hidden />
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-brand-500 dark:text-white/40 font-medium">
                  Godziny otwarcia
                </p>
              </div>
              <ul className="divide-y divide-brand-900/10 dark:divide-white/10 border-y border-brand-900/10 dark:border-white/10">
                {HOURS.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 py-3.5"
                  >
                    <span className="font-serif text-brand-900 dark:text-white text-base md:text-lg">
                      {row.label}
                    </span>
                    <span className="font-mono tabular-nums text-brand-900 dark:text-white text-sm md:text-base">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-4">
              <a
                href="tel:+48664937937"
                className="group flex items-center justify-between gap-3 text-brand-900 dark:text-white hover:text-brand-700 dark:hover:text-brand-300 transition-colors border-b border-brand-900/10 dark:border-white/10 pb-3"
              >
                <span className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0" aria-hidden />
                  <span className="font-mono tabular-nums text-base md:text-lg">+48 664 937 937</span>
                </span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
              </a>
              <a
                href="mailto:kontakt@ilbuoncaffe.pl"
                className="group flex items-center justify-between gap-3 text-brand-900 dark:text-white hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0" aria-hidden />
                  <span className="text-base md:text-lg">kontakt@ilbuoncaffe.pl</span>
                </span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
              </a>
            </div>

            {/* Socials */}
            <div className="flex items-center justify-between pt-4 border-t border-brand-900/10 dark:border-white/10">
              <span className="text-[10px] uppercase tracking-[0.25em] text-brand-500 dark:text-white/40 font-medium">
                Śledź nas
              </span>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.instagram.com/il_buoncaffe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-brand-700 dark:text-white/60 hover:text-brand-900 dark:hover:text-white transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.facebook.com/IlBuonCaffeKoszalin"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-brand-700 dark:text-white/60 hover:text-brand-900 dark:hover:text-white transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Visit;
