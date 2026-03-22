"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { EASE } from "./animations";
import { Divider } from "./Divider";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

// ─── Main Component ───
export function AuthForms() {
  const searchParams = useSearchParams();

  // State
  const [isSignUp, setIsSignUp] = useState(false);

  // Height animation for form transitions
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (!contentRef.current) return;

    const measure = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    };

    // Measure immediately
    measure();

    // Watch for content changes
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [isSignUp]);

  // Effects
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "register") setIsSignUp(true);
  }, [searchParams]);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <main className="w-full min-h-dvh grid place-items-center relative px-4 py-12 sm:py-16 overflow-x-hidden">
      {/* ── FULL-SCREEN BACKGROUND ── */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: "easeOut" }}
        >
          <Image
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670&auto=format&fit=crop"
            alt="Ziarna palonej kawy"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </motion.div>

        {/* Gradient overlays — matching Hero.tsx */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(12,10,9,0.6)_100%)]" />

        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* ── GLASSMORPHISM CARD ── */}
      {/* Outer shell: animates position/scale but NEVER opacity — keeps backdrop-blur working from frame 1 */}
      <motion.div
        initial={{ y: 30, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 w-full max-w-[460px] mx-4 sm:mx-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/40"
      >
        {/* Inner content: fades in independently — opacity here doesn't break parent's backdrop-blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative p-6 sm:p-8"
        >
          {/* Subtle glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-b from-brand-400/[0.05] via-transparent to-brand-400/[0.03] rounded-3xl blur-xl pointer-events-none" />

          {/* Logo + Brand */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="flex flex-col items-center mb-5 relative"
          >
            <Link href="/" className="flex flex-col items-center group">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 blur-lg group-hover:bg-white/20 transition-all duration-500" />
                <Image
                  src="/assets/logo.png"
                  alt="Il Buon Caffe"
                  width={56}
                  height={56}
                  className="relative object-contain drop-shadow-xl brightness-0 invert"
                />
              </motion.div>
              <span className="mt-3 text-sm font-serif font-bold text-white tracking-tight">
                Il Buon Caffe
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                Est. 2003
              </span>
            </Link>
          </motion.div>

          {/* Form Content — height-animated wrapper */}
          {/* We use negative margins + padding to expand the bounds of overflow:hidden,
              so button hover scales and focus rings don't get clipped. */}
          <motion.div
            animate={{ height: typeof contentHeight === "number" ? contentHeight + 6 : "auto" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
            className="w-full"
          >
            <div ref={contentRef}>
              <AnimatePresence mode="wait" initial={false}>
                {isSignUp ? (
                  <RegisterForm key="register" onToggleMode={toggleMode} />
                ) : (
                  <LoginForm key="login" onToggleMode={toggleMode} />
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Bottom toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-3 text-center relative"
          >
            <Divider text="lub" />

            <p className="text-white/40 text-[13px]">
              {isSignUp ? "Masz już konto?" : "Nie masz jeszcze konta?"}
              <button
                onClick={toggleMode}
                className="ml-2 text-brand-400 hover:text-brand-300 font-bold transition-colors"
                type="button"
              >
                {isSignUp ? "Zaloguj się" : "Stwórz konto"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}
