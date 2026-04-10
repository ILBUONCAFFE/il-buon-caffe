"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

export const AgeVerificationModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef as React.RefObject<HTMLElement>, isVisible, {
    initialFocusSelector: '[data-initial-focus]',
  });

  useEffect(() => {
    const handleOpen = () => {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    };
    window.addEventListener("open-age-verification", handleOpen);
    return () => window.removeEventListener("open-age-verification", handleOpen);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    
    // Only run on shop pages
    if (!pathname.startsWith('/sklep')) {
       setIsVisible(false);
       return;
    }

    // Check local storage
    const verified = localStorage.getItem("age-verified");
    
    // Only show if user hasn't made a choice yet
    if (verified === null) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [pathname]);

  const handleVerify = () => {
    localStorage.setItem("age-verified", "true");
    window.dispatchEvent(new Event("age-verification-changed"));
    setIsVisible(false);
    document.body.style.overflow = "unset";
  };

  const handleDeny = () => {
    localStorage.setItem("age-verified", "false");
    window.dispatchEvent(new Event("age-verification-changed"));
    setIsVisible(false);
    document.body.style.overflow = "unset";
  };

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100]"
        >
          {/* Full-screen container */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-verification-title"
            className="h-full w-full flex flex-col md:flex-row"
          >
            {/* ── Left panel: the question ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative flex-1 flex flex-col justify-between bg-brand-950 text-white p-8 md:p-16 lg:p-20 min-h-[60vh] md:min-h-0"
            >
              {/* Top: brand name */}
              <div>
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="block text-[11px] uppercase tracking-[0.35em] text-white/30 font-medium"
                >
                  Il Buon Caffe
                </motion.span>
              </div>

              {/* Center: big "18" + question */}
              <div className="flex-1 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <span
                    className="block font-serif leading-none select-none"
                    style={{ fontSize: 'clamp(6rem, 18vw, 14rem)' }}
                    aria-hidden="true"
                  >
                    18
                  </span>
                </motion.div>

                {/* Thin rule */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="origin-left h-px bg-white/15 my-6 md:my-8 max-w-md"
                />

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <h2
                    id="age-verification-title"
                    className="text-lg md:text-xl font-serif text-white/90 mb-3 max-w-sm"
                  >
                    Czy masz ukończone 18 lat?
                  </h2>
                  <p className="text-sm text-white/35 max-w-sm leading-relaxed">
                    Nasza oferta zawiera napoje alkoholowe.
                    <br />
                    Kontynuując, potwierdzasz swój wiek.
                  </p>
                </motion.div>
              </div>

              {/* Bottom: the two responses */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex items-center gap-6 pt-6"
              >
                <button
                  onClick={handleVerify}
                  data-initial-focus
                  className="group relative text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:text-brand-300"
                >
                  Tak, wchodzę
                  <span className="absolute -bottom-1 left-0 w-full h-px bg-white/50 group-hover:bg-brand-300 transition-colors" />
                </button>

                <span className="text-white/15 text-xs select-none">/</span>

                <button
                  onClick={handleDeny}
                  className="text-sm font-medium uppercase tracking-[0.2em] text-white/30 transition-colors hover:text-white/60"
                >
                  Nie
                </button>
              </motion.div>
            </motion.div>

            {/* ── Right panel: image ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden md:block md:w-[45%] lg:w-[40%] relative overflow-hidden"
            >
              <motion.img
                initial={{ scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200&auto=format&fit=crop"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* subtle vignette */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-950/40 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/30 via-transparent to-brand-950/20" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
