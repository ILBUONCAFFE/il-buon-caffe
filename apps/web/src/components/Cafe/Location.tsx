"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Clock,
  MapPin,
  Phone,
  Instagram,
  Facebook,
  ShoppingBag,
  Navigation,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const Location: React.FC = () => {
  return (
    <section
      id="location"
      className="relative bg-brand-950 overflow-hidden scroll-mt-40 md:scroll-mt-48"
    >
      {/* Full-bleed map as backdrop */}
      <div className="absolute inset-0 z-0">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2334.5129280751567!2d16.178687613014777!3d54.18870151124879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4701cd19ce8013ef%3A0x217844af23dcbb8a!2sKawiarnia%20%26%20Delikatesy%20Il%20Boun%20Caffe!5e0!3m2!1spl!2spl!4v1774121913838!5m2!1spl!2spl"
          width="100%"
          height="100%"
          style={{
            border: 0,
            filter: "grayscale(0.85) contrast(1.1) brightness(0.25)",
          }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full scale-110"
          tabIndex={-1}
        />
        {/* Extra darken overlay */}
        <div className="absolute inset-0 bg-brand-950/70" />
      </div>

      <div className="relative z-10 container mx-auto px-6 lg:px-12 py-24 md:py-32">
        {/* Big typographic address */}
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
          className="mb-16 md:mb-20"
        >
          <span className="block text-[11px] uppercase tracking-[0.3em] text-white/25 font-medium mb-6">
            Kawiarnia & Sklep
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-4">
            ul. Biskupa Czesława Domina 3/6
          </h2>
          <p className="text-xl md:text-2xl text-white/30 font-serif">
            75-065 Koszalin
          </p>
        </motion.div>

        {/* Info strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.15, ease: EASE }}
        >
          {/* Divider */}
          <div className="h-px bg-white/10 mb-10" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {/* Hours */}
            <div className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-[11px] uppercase tracking-[0.15em] text-white/30 font-medium mb-2">
                  Godziny
                </span>
                <p className="text-white/70 text-sm leading-relaxed">
                  Pn–Pt 9:00–16:00
                </p>
                <p className="text-white/70 text-sm">Sob 11:00–14:00</p>
                <p className="text-white/40 text-sm">Nd — zamknięte</p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-start gap-4">
              <Phone className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-[11px] uppercase tracking-[0.15em] text-white/30 font-medium mb-2">
                  Kontakt
                </span>
                <p className="text-white/70 text-sm">+48 664 937 937</p>
                <p className="text-white/50 text-sm">kontakt@ilbuoncaffe.pl</p>
              </div>
            </div>

            {/* Shop note */}
            <div className="flex items-start gap-4">
              <ShoppingBag className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-[11px] uppercase tracking-[0.15em] text-white/30 font-medium mb-2">
                  Sklep stacjonarny
                </span>
                <p className="text-white/70 text-sm leading-relaxed">
                  Wina, oliwy, delikatesy — do kupienia na miejscu bez zamawiania
                  online
                </p>
              </div>
            </div>

            {/* Social */}
            <div className="flex items-start gap-4">
              <Instagram className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-[11px] uppercase tracking-[0.15em] text-white/30 font-medium mb-2">
                  Śledź nas
                </span>
                <div className="flex gap-3">
                  <a
                    href="https://www.instagram.com/il_buoncaffe/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 text-sm hover:text-white transition-colors duration-300"
                  >
                    Instagram
                  </a>
                  <span className="text-white/20">·</span>
                  <a
                    href="https://www.facebook.com/IlBuonCaffeKoszalin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 text-sm hover:text-white transition-colors duration-300"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 mt-10 mb-8" />
        </motion.div>

        {/* Bottom actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
          className="flex flex-wrap gap-4"
        >
          <a
            href="https://www.google.com/maps/search/?api=1&query=Il+Buon+Caffe,+ul.+Biskupa+Czes%C5%82awa+Domina+3%2F6,+75-065+Koszalin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white text-brand-900 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-brand-100 transition-colors duration-300"
          >
            <Navigation className="w-4 h-4" />
            <span>Nawiguj</span>
          </a>
          <a
            href="tel:+48664937937"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white/[0.06] border border-white/10 text-white/70 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all duration-300"
          >
            <Phone className="w-4 h-4" />
            <span>Zadzwoń</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
};
