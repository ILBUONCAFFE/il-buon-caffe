"use client";

import React, { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Clip-path line reveal ──────────────────────────────────────────
const ClipReveal = ({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) => {
  const [isRevealed, setIsRevealed] = React.useState(false);

  return (
    <div
      className={`${isRevealed ? "overflow-visible" : "overflow-hidden"} pb-[0.24em] -mb-[0.24em] ${className ?? ""}`}
    >
      <motion.div
        initial={{ y: "120%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.4, delay, ease: EASE }}
        onAnimationComplete={() => setIsRevealed(true)}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ── Spinning circular text (SVG textPath) ──────────────────────────
const SpinningBadge = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7, rotate: -30 }}
    animate={{ opacity: 1, scale: 1, rotate: 0 }}
    transition={{ duration: 1.4, delay: 1.2, ease: EASE_OUT }}
  >
    <Link
      href="/sklep"
      className="group relative block w-28 h-28 lg:w-36 lg:h-36"
    >
      {/* Rotating text ring */}
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        <defs>
          <path
            id="heroCirclePath"
            d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
          />
        </defs>
        <text
          className="uppercase"
          fill="rgba(255,255,255,0.3)"
          fontSize="7.8"
          letterSpacing="0.22em"
        >
          <textPath href="#heroCirclePath">
            Kawa · Wino · Oliwy · Delikatesy · Est. 2003 ·{" "}
          </textPath>
        </text>
      </motion.svg>

      {/* Center arrow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border border-white/15 flex items-center justify-center transition-all duration-500 group-hover:border-white/40 group-hover:bg-white/5 group-hover:scale-110">
          <ArrowUpRight
            className="w-4 h-4 lg:w-5 lg:h-5 text-white/40 transition-all duration-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={1.5}
          />
        </div>
      </div>
    </Link>
  </motion.div>
);

export const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Scroll-driven parallax ──
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const imageScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.08]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.35], [0, -100]);

  // ── Mouse-reactive parallax ──
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const cfg = { stiffness: 30, damping: 28, mass: 1.2 };
  const textX = useSpring(useTransform(mx, [0, 1], [14, -14]), cfg);
  const textY = useSpring(useTransform(my, [0, 1], [8, -8]), cfg);

  const onMouse = useCallback(
    (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth);
      my.set(e.clientY / window.innerHeight);
    },
    [mx, my]
  );

  useEffect(() => {
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, [onMouse]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-[#0a0705]"
    >
      {/* ── Background animation ── */}
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="absolute inset-0 bg-[#0c0806]"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 4, ease: EASE_OUT }}
          className="w-full h-full relative overflow-hidden"
        >
          {/* Base: Warm, dimly lit enoteca atmosphere */}
          <div className="absolute inset-0 bg-[#0c0806]" />

          {/* Golden Hour Core Wash: Deep amber/orange sun glow diffused through glass */}
          <motion.div
            animate={{
              scale: [1, 1.05, 0.98, 1],
              opacity: [0.35, 0.45, 0.35],
              y: ["0%", "-2%", "1%", "0%"]
            }}
            transition={{ duration: 20, ease: "easeInOut", repeat: Infinity }}
            className="absolute top-[-10%] right-[-5%] w-[80vw] h-[90vh] bg-[radial-gradient(ellipse_at_center,rgba(163,127,91,0.45)_0%,rgba(196,91,20,0.15)_40%,transparent_70%)] blur-[60px] mix-blend-screen pointer-events-none origin-center"
          />

          {/* Architectural Shadows: Heavy, organic occlusion acting like stone walls or wine racks */}
          <motion.div
            animate={{
              x: ["0%", "-3%", "1%", "0%"],
              scale: [1, 1.02, 0.99, 1]
            }}
            transition={{ duration: 28, ease: "easeInOut", repeat: Infinity }}
            className="absolute top-[10%] right-[15%] w-[50vw] h-[100vh] bg-[#060403] rounded-[40%_60%_70%_30%/50%_40%_60%_50%] blur-[80px] opacity-95 pointer-events-none origin-bottom"
          />

          {/* Primary Window Light Slit: Sharp, blinding ray of setting sun */}
          <motion.div
            animate={{ opacity: [0.6, 0.85, 0.6], x: [-5, 10, -5] }}
            transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
            className="absolute top-[-20%] right-[25%] w-[2px] h-[150vh] bg-gradient-to-b from-transparent via-brand-200/80 to-transparent rotate-[32deg] blur-[1px] mix-blend-color-dodge shadow-[0_0_20px_rgba(209,190,168,0.5)] pointer-events-none"
          />

          {/* Secondary Light Ray: Softer, scattered from the window edge */}
          <motion.div
            animate={{ opacity: [0.2, 0.4, 0.2], x: [10, -5, 10] }}
            transition={{ duration: 15, ease: "easeInOut", repeat: Infinity, delay: 1 }}
            className="absolute top-[-15%] right-[22%] w-[12vw] h-[140vh] bg-gradient-to-b from-transparent via-brand-400/20 to-transparent rotate-[32deg] blur-[30px] mix-blend-color-dodge pointer-events-none"
          />

          {/* Tertiary Heat: The deep red underglow of late dusk hitting wood/leather */}
          <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 25, ease: "easeInOut", repeat: Infinity, delay: 3 }}
            className="absolute bottom-[-10%] right-[20%] w-[60vw] h-[60vh] bg-[radial-gradient(circle_at_center,rgba(102,30,5,0.4)_0%,transparent_60%)] blur-[50px] mix-blend-color-dodge pointer-events-none"
          />

          {/* Floating Dust Bokeh: Slow moving particles catching the light */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: "120%", opacity: 0, scale: i % 2 === 0 ? 0.8 : 1.2 }}
              animate={{ 
                y: "-50%", 
                opacity: [0, 0.6, 0.8, 0],
                x: [0, (i % 2 === 0 ? 60 : -60), 0]
              }}
              transition={{
                duration: 20 + i * 5,
                repeat: Infinity,
                ease: "linear",
                delay: i * 3.5
              }}
              className="absolute mix-blend-screen pointer-events-none rounded-full blur-[24px] bg-[radial-gradient(circle_at_center,rgba(209,190,168,0.3)_0%,transparent_70%)]"
              style={{
                right: `${15 + i * 8}%`,
                width: `${15 + (i % 3) * 5}vw`,
                height: `${15 + (i % 3) * 5}vw`,
              }}
            />
          ))}

          {/* Deep Vignette / Text Canvas Mask: Ensures left and bottom are submerged in deep shadow for readability */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,transparent_0%,#0a0705_85%)] pointer-events-none" />
          <div className="absolute w-[70%] h-full left-0 top-0 bg-gradient-to-r from-[#070403] via-[#070403]/90 to-transparent pointer-events-none" />
        </motion.div>
      </motion.div>

      {/* ── Film grain ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04] mix-blend-overlay animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Main content ── */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-10 h-full flex items-center"
      >
        <motion.div
          style={{ x: textX, y: textY }}
          className="container mx-auto px-6 lg:px-12"
        >
          <div className="flex items-end justify-between gap-8">
            {/* Left: typography + links */}
            <div className="max-w-4xl">
              {/* Animated rule */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.8, delay: 0.15, ease: EASE }}
                className="origin-left w-14 md:w-20 h-px bg-white/25 mb-8 md:mb-10"
              />

              {/* Hidden SEO h1 */}
              <h1 className="sr-only">
                Il Buon Caffe – Włoskie Delikatesy i Kawiarnia w Koszalinie
              </h1>

              {/* Title block */}
              <div aria-hidden="true" className="mb-4 md:mb-5 select-none">
                <ClipReveal delay={0.25}>
                  <span className="block text-[clamp(4rem,13vw,14rem)] font-serif text-white leading-[0.82] tracking-[-0.035em]">
                    Il Buon
                  </span>
                </ClipReveal>

                <ClipReveal delay={0.4} className="ml-1 md:ml-3 lg:ml-5 pb-[0.56em] -mb-[0.5em]">
                  <span className="block text-[clamp(3rem,10vw,10.5rem)] font-handwriting text-brand-400 leading-[1.14]">
                    Caffe
                  </span>
                </ClipReveal>
              </div>

              {/* Descriptor */}
              <div className="overflow-hidden mt-2 md:mt-3 mb-10 md:mb-12">
                <motion.p
                  initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
                  animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 1.2, delay: 0.65, ease: EASE_OUT }}
                  className="text-[15px] md:text-base text-white/35 max-w-md leading-[1.7] tracking-wide font-light"
                >
                  Włoskie wina, oliwy i kawa specialty.
                  <br className="hidden sm:block" /> Od 2003 roku
                  w&nbsp;Koszalinie.
                </motion.p>
              </div>

              {/* Links */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.85, ease: EASE_OUT }}
                className="flex items-center gap-8 md:gap-10"
              >
                <Link
                  href="/sklep"
                  className="group inline-flex items-center gap-2.5 text-white transition-colors duration-500 hover:text-brand-300"
                >
                  <span className="relative text-sm font-bold uppercase tracking-[0.2em]">
                    Sklep
                    <span className="absolute -bottom-1 left-0 h-px bg-current w-0 group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                  </span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </Link>

                <Link
                  href="/kawiarnia"
                  className="group inline-flex items-center gap-2.5 text-white/35 transition-colors duration-500 hover:text-white/80"
                >
                  <span className="relative text-sm font-bold uppercase tracking-[0.2em]">
                    Kawiarnia
                    <span className="absolute -bottom-1 left-0 h-px bg-current w-0 group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                  </span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </Link>
              </motion.div>
            </div>

            {/* Right: spinning circular text badge */}
            <div className="hidden md:block flex-shrink-0 mb-2">
              <SpinningBadge />
            </div>
          </div>

          {/* Coordinates — subtle detail */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="hidden lg:block mt-16 text-[10px] uppercase tracking-[0.4em] text-white/15 font-medium"
          >
            54º 11' 19.306" N &nbsp; 16º 10' 52.717" E
          </motion.span>
        </motion.div>
      </motion.div>

      {/* ── Bottom gradient bleed into next section ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[2] pointer-events-none" />
    </section>
  );
};
