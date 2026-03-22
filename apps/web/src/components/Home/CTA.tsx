"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { MapPin, Clock, Phone, ArrowRight } from "lucide-react";

export const CTA = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 min-h-screen flex flex-col justify-center bg-brand-900 overflow-hidden">
      {/* Background Image with Parallax */}
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2000&auto=format&fit=crop"
          alt="Przytulne wnętrze kawiarni Il Buon Caffe w Koszalinie"
          fill
          className="object-cover opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/95 to-brand-900/80" />
      </motion.div>

      {/* Content */}
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-400 mb-4">
              Odwiedź nas
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight mb-6">
              Zapraszamy do{" "}
              <span className="text-brand-300 italic">naszej kawiarni</span>
            </h2>
            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-lg">
              Przyjdź na doskonałą kawę, wypróbuj nasze wypieki i odkryj 
              bogactwo włoskich delikatesów. Czekamy na Ciebie!
            </p>

            {/* Contact Info */}
            <div className="space-y-4 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <p className="text-white font-medium">ul. Bpa Czesława Domina 3/6</p>
                  <p className="text-white/50">75-065 Koszalin</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Pn-Pt: 09:00 - 16:00</p>
                  <p className="text-white/50">Sob: 11:00 - 14:00</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <p className="text-white font-medium">+48 94 123 45 67</p>
                  <p className="text-white/50">kontakt@ilbuoncaffe.pl</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/kawiarnia"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-brand-900 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-brand-100 transition-colors"
              >
                <span>Zobacz menu</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Il+Buon+Caffe,+ul.+Bpa+Czes%C5%82awa+Domina+3%2F6,+75-065+Koszalin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-transparent border border-white/30 text-white rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>Pokaż na mapie</span>
              </a>
            </div>
          </motion.div>

          {/* Right - Map Embed */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2334.5129280751567!2d16.178687613014777!3d54.18870151124879!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4701cd19ce8013ef%3A0x217844af23dcbb8a!2sKawiarnia%20%26%20Delikatesy%20Il%20Boun%20Caffe!5e0!3m2!1spl!2spl!4v1774121913838!5m2!1spl!2spl"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(0.8) contrast(1.1)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0"
              />
              
              {/* Map overlay badge */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                <p className="font-serif font-bold text-brand-900">Il Buon Caffe</p>
                <p className="text-xs text-brand-700">Koszalin, Polska</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
