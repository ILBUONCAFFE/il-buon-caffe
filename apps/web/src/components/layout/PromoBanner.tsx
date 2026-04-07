"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const STORAGE_KEY = "promo_banner_dismissed_v1";

export const PromoBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="bg-brand-900 text-white">
            <div className="container mx-auto px-6 lg:px-12">
              <div className="flex items-center justify-between py-2.5 gap-4">
                <div className="flex-1" />

                <p className="text-xs tracking-[0.15em] text-white/70 text-center">
                  <span className="text-brand-400 font-semibold">Sklep online</span>
                  <span className="mx-3 text-white/30">·</span>
                  Planowane uruchomienie: Lato 2026
                </p>

                <div className="flex-1 flex justify-end">
                  <button
                    onClick={dismiss}
                    aria-label="Zamknij baner"
                    className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
