"use client";

import React from "react";
import { motion } from "motion/react";
import { Clock, MapPin, Phone, Instagram, Facebook, Navigation, Mail } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HOURS = [
  { label: "Poniedziałek – Piątek", value: "09:00 – 16:00" },
  { label: "Sobota", value: "11:00 – 14:00" },
  { label: "Niedziela", value: "Zamknięte" },
];

export const Visit: React.FC = () => {
  return (
    <section
      id="location"
      className="relative bg-brand-beige py-24 md:py-32 scroll-mt-40 md:scroll-mt-48"
    >
      <div className="container mx-auto px-6 lg:px-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-12 md:mb-16 max-w-3xl"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-brand-700/60 mb-4">
            Odwiedź nas
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-brand-900 tracking-tight leading-tight">
            Gdzie nas znajdziesz
          </h2>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative lg:col-span-3 aspect-[4/3] lg:aspect-auto lg:min-h-[460px] overflow-hidden bg-brand-900/5"
          >
            <iframe
              title="Mapa Il Buon Caffe — Koszalin"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2334.5129280751567!2d16.178687613014777!3d54.18870151124879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4701cd19ce8013ef%3A0x217844af23dcbb8a!2sKawiarnia%20%26%20Delikatesy%20Il%20Boun%20Caffe!5e0!3m2!1spl!2spl!4v1774121913838!5m2!1spl!2spl"
              width="100%"
              height="100%"
              style={{ border: 0, filter: "grayscale(0.6) contrast(1.05) brightness(0.95)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="lg:col-span-2 flex flex-col gap-8"
          >
            <div>
              <div className="flex items-start gap-3 mb-2">
                <MapPin className="w-5 h-5 text-brand-300 mt-1 shrink-0" aria-hidden />
                <p className="font-serif text-xl md:text-2xl text-brand-900 leading-snug">
                  ul. Biskupa Czesława Domina 3/6<br />
                  75-065 Koszalin
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-brand-300 shrink-0" aria-hidden />
                <p className="font-mono text-xs tracking-[0.2em] uppercase text-brand-700/60">
                  Godziny otwarcia
                </p>
              </div>
              <ul className="divide-y divide-brand-900/10 border-y border-brand-900/10">
                {HOURS.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="text-brand-900 text-sm md:text-base">{row.label}</span>
                    <span className="font-mono tabular-nums text-brand-900 text-sm md:text-base">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 text-sm md:text-base">
              <a
                href="tel:+48664937937"
                className="flex items-center gap-3 text-brand-900 hover:text-brand-700 transition-colors"
              >
                <Phone className="w-4 h-4 text-brand-300 shrink-0" aria-hidden />
                <span className="font-mono tabular-nums">+48 664 937 937</span>
              </a>
              <a
                href="mailto:kontakt@ilbuoncaffe.pl"
                className="flex items-center gap-3 text-brand-900 hover:text-brand-700 transition-colors"
              >
                <Mail className="w-4 h-4 text-brand-300 shrink-0" aria-hidden />
                <span>kontakt@ilbuoncaffe.pl</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Il+Buon+Caffe+Koszalin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-900 text-brand-beige px-5 py-3 text-sm font-medium tracking-wide hover:bg-brand-700 transition-colors"
              >
                <Navigation className="w-4 h-4" aria-hidden />
                Wyznacz trasę
              </a>
              <div className="flex items-center gap-3 ml-auto lg:ml-0">
                <a
                  href="https://www.instagram.com/il_buoncaffe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-brand-700 hover:text-brand-300 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.facebook.com/IlBuonCaffeKoszalin"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-brand-700 hover:text-brand-300 transition-colors"
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
