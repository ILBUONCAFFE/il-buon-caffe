"use client";

import React, { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SHADOW_VOLUMES = [
  {
    top: "-14%",
    right: "-8%",
    width: "56vw",
    height: "82vh",
    blur: "96px",
    radius: "46% 54% 58% 42% / 52% 46% 54% 48%",
    opacity: 0.92,
    duration: 34,
    delay: 0,
    drift: -18,
  },
  {
    top: "18%",
    right: "12%",
    width: "44vw",
    height: "48vh",
    blur: "82px",
    radius: "62% 38% 49% 51% / 45% 56% 44% 55%",
    opacity: 0.7,
    duration: 29,
    delay: 2,
    drift: 14,
  },
  {
    top: "46%",
    right: "30%",
    width: "36vw",
    height: "34vh",
    blur: "72px",
    radius: "42% 58% 38% 62% / 63% 43% 57% 37%",
    opacity: 0.54,
    duration: 27,
    delay: 5,
    drift: -10,
  },
] as const;

const LIGHT_SHAFTS = [
  {
    top: "-28%",
    right: "20%",
    width: "2px",
    height: "170vh",
    angle: "34deg",
    blur: "0px",
    glow: "rgba(236, 206, 165, 0.62)",
    duration: 14,
    delay: 0,
    travel: 12,
    opacity: [0.45, 0.9, 0.5],
  },
  {
    top: "-22%",
    right: "17%",
    width: "8vw",
    height: "150vh",
    angle: "34deg",
    blur: "26px",
    glow: "rgba(194, 138, 77, 0.24)",
    duration: 18,
    delay: 1.5,
    travel: -18,
    opacity: [0.12, 0.34, 0.14],
  },
  {
    top: "-18%",
    right: "24%",
    width: "14vw",
    height: "138vh",
    angle: "34deg",
    blur: "42px",
    glow: "rgba(131, 87, 47, 0.2)",
    duration: 22,
    delay: 3,
    travel: 10,
    opacity: [0.08, 0.2, 0.1],
  },
];

const DUST_MOTES = [
  {
    top: "16%",
    left: "56%",
    size: "13vw",
    blur: "18px",
    duration: 28,
    delay: 0,
    drift: 56,
    opacity: 0.56,
  },
  {
    top: "28%",
    left: "67%",
    size: "9vw",
    blur: "16px",
    duration: 32,
    delay: 3,
    drift: -44,
    opacity: 0.5,
  },
  {
    top: "38%",
    left: "74%",
    size: "11vw",
    blur: "22px",
    duration: 34,
    delay: 7,
    drift: 36,
    opacity: 0.42,
  },
  {
    top: "50%",
    left: "61%",
    size: "15vw",
    blur: "26px",
    duration: 30,
    delay: 1.5,
    drift: -30,
    opacity: 0.38,
  },
  {
    top: "62%",
    left: "70%",
    size: "10vw",
    blur: "20px",
    duration: 36,
    delay: 5,
    drift: 48,
    opacity: 0.34,
  },
] as const;

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
  const reduceMotion = useReducedMotion();

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
  const atmosphereX = useSpring(
    useTransform(mx, [0, 1], [-16, 16]),
    { stiffness: 22, damping: 30, mass: 1.1 }
  );
  const atmosphereY = useSpring(
    useTransform(my, [0, 1], [-10, 10]),
    { stiffness: 22, damping: 30, mass: 1.1 }
  );
  const warmLightX = useSpring(
    useTransform(mx, [0, 1], [-26, 26]),
    { stiffness: 20, damping: 28, mass: 1.2 }
  );
  const warmLightY = useSpring(
    useTransform(my, [0, 1], [14, -14]),
    { stiffness: 20, damping: 28, mass: 1.2 }
  );
  const hazeRotate = useSpring(
    useTransform(mx, [0, 1], [-3.2, 3.2]),
    { stiffness: 20, damping: 28, mass: 1.2 }
  );
  const backgroundLoop = reduceMotion ? 0 : Infinity;

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
        className="absolute inset-0 bg-[#080503]"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.8, ease: EASE_OUT }}
          className="w-full h-full relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[#080503]" />

          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(132% 116% at 78% 14%, rgba(227, 170, 99, 0.4) 0%, rgba(127, 75, 35, 0.27) 29%, rgba(36, 19, 12, 0.76) 58%, rgba(8, 5, 3, 1) 100%), linear-gradient(112deg, #060302 0%, #090503 34%, #1a0f09 61%, #2a170d 100%)",
            }}
          />

          <motion.div
            style={{ x: atmosphereX, y: atmosphereY }}
            className="absolute inset-0 pointer-events-none"
          >
            <motion.div
              animate={
                reduceMotion
                  ? { opacity: 0.42, scale: 1, y: "0%" }
                  : {
                      opacity: [0.34, 0.48, 0.38],
                      scale: [1, 1.04, 0.98, 1],
                      y: ["0%", "-3%", "1%", "0%"],
                    }
              }
              transition={{
                duration: 26,
                ease: "easeInOut",
                repeat: backgroundLoop,
              }}
              className="absolute -top-[18%] right-[-4%] w-[84vw] h-[95vh] rounded-[56%_44%_58%_42%/45%_56%_44%_55%] blur-[68px] mix-blend-screen"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(244, 206, 152, 0.42) 0%, rgba(214, 137, 66, 0.18) 34%, rgba(120, 62, 30, 0.08) 58%, transparent 74%)",
              }}
            />

            <motion.div
              animate={
                reduceMotion
                  ? { opacity: 0.28, scale: 1 }
                  : {
                      opacity: [0.2, 0.34, 0.24],
                      scale: [0.95, 1.08, 1],
                    }
              }
              transition={{
                duration: 22,
                ease: "easeInOut",
                repeat: backgroundLoop,
                delay: 1,
              }}
              className="absolute bottom-[-22%] right-[14%] w-[68vw] h-[55vh] blur-[54px] mix-blend-color-dodge"
              style={{
                x: warmLightX,
                y: warmLightY,
                background:
                  "radial-gradient(circle at center, rgba(136, 61, 27, 0.34) 0%, rgba(76, 31, 14, 0.24) 38%, transparent 70%)",
              }}
            />
          </motion.div>

          {SHADOW_VOLUMES.map((shape, index) => (
            <motion.div
              key={`shadow-volume-${index}`}
              animate={
                reduceMotion
                  ? { x: 0, scale: 1, opacity: shape.opacity }
                  : {
                      x: [0, shape.drift, shape.drift * -0.55, 0],
                      scale: [1, 1.03, 0.99, 1],
                      opacity: [shape.opacity * 0.9, shape.opacity, shape.opacity * 0.88],
                    }
              }
              transition={{
                duration: shape.duration,
                ease: "easeInOut",
                repeat: backgroundLoop,
                delay: shape.delay,
              }}
              className="absolute pointer-events-none"
              style={{
                top: shape.top,
                right: shape.right,
                width: shape.width,
                height: shape.height,
                borderRadius: shape.radius,
                filter: `blur(${shape.blur})`,
                background:
                  "radial-gradient(ellipse at center, rgba(17, 9, 6, 0.95) 0%, rgba(8, 5, 3, 0.9) 45%, rgba(6, 4, 3, 0.15) 82%)",
              }}
            />
          ))}

          <motion.div
            animate={
              reduceMotion
                ? { opacity: 0.24 }
                : {
                    opacity: [0.18, 0.28, 0.22],
                    scale: [1, 1.03, 1],
                  }
            }
            transition={{
              duration: 30,
              ease: "easeInOut",
              repeat: backgroundLoop,
              delay: 1.2,
            }}
            className="absolute top-[-30%] right-[-14%] w-[92vw] h-[132vh] pointer-events-none blur-[46px] mix-blend-screen"
            style={{
              rotate: hazeRotate,
              background:
                "conic-gradient(from 170deg at 66% 46%, rgba(255, 224, 176, 0.2) 0deg, rgba(201, 122, 58, 0.14) 72deg, rgba(58, 30, 17, 0.04) 178deg, rgba(151, 96, 54, 0.16) 288deg, rgba(255, 224, 176, 0.2) 360deg)",
            }}
          />

          {LIGHT_SHAFTS.map((shaft, index) => (
            <motion.div
              key={`light-shaft-${index}`}
              animate={
                reduceMotion
                  ? { x: 0, opacity: shaft.opacity[1] }
                  : {
                      x: [0, shaft.travel, shaft.travel * -0.35, 0],
                      opacity: shaft.opacity,
                    }
              }
              transition={{
                duration: shaft.duration,
                ease: "easeInOut",
                repeat: backgroundLoop,
                delay: shaft.delay,
              }}
              className="absolute pointer-events-none mix-blend-color-dodge"
              style={{
                top: shaft.top,
                right: shaft.right,
                width: shaft.width,
                height: shaft.height,
                transform: `rotate(${shaft.angle})`,
                filter: `blur(${shaft.blur})`,
                background: `linear-gradient(to bottom, transparent 0%, ${shaft.glow} 46%, transparent 100%)`,
                boxShadow:
                  shaft.width === "2px"
                    ? "0 0 26px rgba(255, 223, 176, 0.55)"
                    : "none",
              }}
            />
          ))}

          <div
            className="absolute inset-0 opacity-[0.12] mix-blend-soft-light pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(236, 214, 182, 0.08) 0px, rgba(236, 214, 182, 0.08) 1px, transparent 1px, transparent 44px), repeating-linear-gradient(0deg, rgba(92, 57, 34, 0.18) 0px, rgba(92, 57, 34, 0.18) 1px, transparent 1px, transparent 22px)",
              backgroundSize: "100% 100%, 100% 100%",
            }}
          />

          <motion.div
            animate={
              reduceMotion
                ? { opacity: 0.14 }
                : { opacity: [0.1, 0.18, 0.12], y: ["0%", "-2%", "0%"] }
            }
            transition={{
              duration: 24,
              ease: "easeInOut",
              repeat: backgroundLoop,
            }}
            className="absolute inset-0 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 72% 22%, rgba(255, 240, 215, 0.16) 0%, transparent 42%), radial-gradient(circle at 85% 42%, rgba(216, 169, 114, 0.1) 0%, transparent 38%), radial-gradient(circle at 64% 62%, rgba(140, 88, 50, 0.08) 0%, transparent 36%)",
            }}
          />

          {DUST_MOTES.map((particle, index) => (
            <motion.div
              key={`dust-${index}`}
              initial={{ y: "18%", opacity: 0 }}
              animate={
                reduceMotion
                  ? { y: "0%", opacity: particle.opacity * 0.45, x: 0, scale: 1 }
                  : {
                      y: ["20%", "-36%", "-56%"],
                      x: [0, particle.drift, particle.drift * -0.22],
                      opacity: [0, particle.opacity, particle.opacity * 0.72, 0],
                      scale: [0.84, 1.06, 0.92],
                    }
              }
              transition={{
                duration: particle.duration,
                ease: "easeInOut",
                repeat: backgroundLoop,
                delay: particle.delay,
              }}
              className="absolute rounded-full pointer-events-none mix-blend-screen"
              style={{
                top: particle.top,
                left: particle.left,
                width: particle.size,
                height: particle.size,
                filter: `blur(${particle.blur})`,
                background:
                  "radial-gradient(circle at 38% 38%, rgba(255, 233, 198, 0.44) 0%, rgba(230, 190, 140, 0.2) 34%, rgba(255, 233, 198, 0) 72%)",
              }}
            />
          ))}

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_58%,transparent_0%,rgba(5,3,2,0.94)_80%)] pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-[#050302] via-[#050302]/96 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#050302] via-[#050302]/70 to-transparent pointer-events-none" />
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
