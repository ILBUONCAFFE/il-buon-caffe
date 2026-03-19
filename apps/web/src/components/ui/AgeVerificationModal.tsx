"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { motion, AnimatePresence } from "motion/react";
import { Wine, ShieldCheck, XCircle } from "lucide-react";
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-900/40 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-verification-title"
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Border accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-700 to-transparent" />

            <div className="p-8 md:p-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-900">
                  <Wine size={32} />
                </div>
              </div>

              <h2 id="age-verification-title" className="text-3xl md:text-3xl font-serif text-brand-950 mb-3">
                Witaj w Il Buon Caffe
              </h2>
              
              <p className="text-brand-600 mb-8 leading-relaxed">
                Nasza oferta obejmuje alkohole. Zgodnie z prawem, treści te są dostępne wyłącznie dla osób pełnoletnich.
                <br className="hidden md:block" />
                <span className="font-semibold block mt-2">Czy masz ukończone 18 lat?</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleDeny}
                  className="px-6 py-3 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 hover:text-brand-800 transition-colors font-medium text-sm w-full sm:w-auto"
                >
                  Nie mam
                </button>
                <button
                  onClick={handleVerify}
                  data-initial-focus
                  className="px-8 py-3 rounded-xl bg-brand-900 text-white hover:bg-brand-800 transition-all font-medium text-sm shadow-lg hover:shadow-brand-900/20 w-full sm:w-auto flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck size={16} />
                  <span>Tak, mam 18 lat</span>
                </button>
              </div>

              <p className="mt-6 text-xs text-brand-400 uppercase tracking-widest">
                Odpowiedzialna sprzedaż alkoholu
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
