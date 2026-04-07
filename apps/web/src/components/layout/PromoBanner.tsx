"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "promo_banner_dismissed_v1";

export const PromoBanner = () => {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Sync banner height as CSS custom property so Navbar can offset itself
  useEffect(() => {
    const update = () => {
      const h = bannerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--promo-banner-h", `${h}px`);
    };

    const ro = new ResizeObserver(update);
    if (bannerRef.current) ro.observe(bannerRef.current);
    update();
    return () => ro.disconnect();
  }, [visible]);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
    // Reset var on unmount just in case
    return () => {
      document.documentElement.style.setProperty("--promo-banner-h", "0px");
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={bannerRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden fixed top-0 left-0 right-0 z-[60]"
        >
          {/* Main bar */}
          <div className="relative bg-brand-950 border-b border-white/[0.06] overflow-hidden">

            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(180,130,80,0.12),transparent)] pointer-events-none" />

            {/* Horizontal shimmer line at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-600/40 to-transparent pointer-events-none" />

            <div className="relative container mx-auto px-6 lg:px-12">
              <div className="flex items-center justify-between py-2 gap-4">

                {/* Left spacer (balances the close button) */}
                <div className="w-6 shrink-0" />

                {/* Center content */}
                <div className="flex-1 flex items-center justify-center gap-3 min-w-0">

                  {/* Message */}
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-[11px] sm:text-xs tracking-[0.12em] text-white/60 text-center whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    <span className="text-white/90 font-medium">Sklep online</span>
                    <span className="mx-2 text-white/20">—</span>
                    <span>Planowane uruchomienie:</span>
                    <span className="ml-1.5 text-brand-400 font-semibold">Lato 2026</span>
                  </motion.p>

                  {/* CTA link */}
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                    className="hidden md:flex"
                  >
                    <Link
                      href="/sklep"
                      className="group flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500 hover:text-brand-300 transition-colors duration-200 shrink-0"
                    >
                      Zobacz ofertę
                      <ArrowRight className="w-2.5 h-2.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                </div>

                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={dismiss}
                  aria-label="Zamknij baner"
                  className="w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all duration-200 shrink-0"
                >
                  <X className="w-3 h-3" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
