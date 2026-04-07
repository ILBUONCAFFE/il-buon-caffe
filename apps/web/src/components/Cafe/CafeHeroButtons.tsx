"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Coffee, UtensilsCrossed, CakeSlice, Navigation, Snowflake, CupSoda } from "lucide-react";

// Refined Apple-like spring physics
const mainSpring = { type: "spring" as const, stiffness: 350, damping: 25, mass: 1 };
const microSpring = { type: "spring" as const, stiffness: 450, damping: 25, mass: 0.8 };

export const CafeHeroButtons = () => {
  const [isHoveringMenu, setIsHoveringMenu] = useState(false);
  const [isHoveringMap, setIsHoveringMap] = useState(false);

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 relative w-full pt-4">
      {/* MENU BUTTON */}
      <motion.button
        onMouseEnter={() => setIsHoveringMenu(true)}
        onMouseLeave={() => setIsHoveringMenu(false)}
        onClick={(e) => !isHoveringMenu && scrollToSection("menu", e)}
        className="relative overflow-hidden w-[280px] h-[56px] bg-transparent border border-white/30 text-white rounded-full font-bold text-[13px] uppercase tracking-[0.1em] transition-all duration-500 hover:border-white/10 hover:bg-brand-900 group"
        style={{ perspective: "1000px" }}
        whileTap={{ scale: 0.97 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {!isHoveringMenu ? (
            <motion.div
              key="menu-default"
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              style={{ transformOrigin: "center center" }}
              className="absolute inset-0 flex items-center justify-center gap-3 bg-transparent group-hover:bg-brand-900 transition-colors duration-500"
            >
              <Coffee className="w-4 h-4 transition-transform duration-500 group-hover:scale-110" />
              <span className="mt-[2px]">Zobacz menu</span>
            </motion.div>
          ) : (
            <motion.div
              key="menu-hover"
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              style={{ transformOrigin: "center center" }}
              className="absolute inset-0 flex items-stretch justify-between p-1 bg-brand-900 text-white"
            >
              {/* Inner mini cards */}
              {[
                { label: "Klasyki", icon: Coffee, target: "klasyki" },
                { label: "Specjały", icon: CupSoda, target: "specjaly" },
                { label: "Desery", icon: CakeSlice, target: "desery" },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  onClick={(e) => scrollToSection(item.target, e)}
                  className="relative flex-1 flex flex-col items-center justify-center rounded-full hover:bg-brand-800 transition-colors duration-300 cursor-pointer group/item overflow-hidden"
                >
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + idx * 0.05, duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center z-10"
                  >
                    <item.icon className="w-3.5 h-3.5 mb-1 text-brand-300 group-hover/item:scale-110 transition-transform" />
                    <span className="text-[9px] leading-none tracking-[0.05em] font-medium text-white/90">{item.label}</span>
                  </motion.div>
                  {/* Subtle highlight effect on hover inside the mini pill */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-500/20 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* MAP BUTTON */}
      <motion.button
        onMouseEnter={() => setIsHoveringMap(true)}
        onMouseLeave={() => setIsHoveringMap(false)}
        onClick={(e) => !isHoveringMap && scrollToSection("location", e)}
        className="relative overflow-hidden w-[280px] h-[56px] bg-transparent border border-white/30 text-white rounded-full font-bold text-[13px] uppercase tracking-[0.1em] transition-colors duration-500 hover:border-white/10 hover:bg-brand-900 group"
        whileTap={{ scale: 0.97 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {!isHoveringMap ? (
            <motion.div
              key="map-default"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={mainSpring}
              className="absolute inset-0 flex items-center justify-center gap-3 bg-transparent"
            >
              <MapPin className="w-4 h-4 transition-transform duration-500 group-hover:scale-110" />
              <span className="mt-[2px]">Jak dojechać</span>
            </motion.div>
          ) : (
            <motion.div
              key="map-hover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full text-white"
              onClick={(e) => scrollToSection("location", e)}
            >
              {/* Aesthetic gradients to simulate geography/water */}
              <div className="absolute w-32 h-32 bg-brand-700/20 rounded-full -top-12 -left-8 blur-[20px]" />
              <div className="absolute w-32 h-32 bg-brand-500/10 rounded-full -bottom-10 -right-8 blur-[20px]" />
              
              {/* Refined Map background pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:16px_16px] opacity-60" style={{ backgroundPosition: 'center center' }} />

              {/* Apple Maps style drawn route */}
              <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" overflow="visible">
                {/* Thick glow under route */}
                <motion.path
                  d="M 40,28 C 90,0 150,56 220,24"
                  fill="none"
                  stroke="#6f5038" 
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.25 }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                />
                {/* Main bright route line */}
                <motion.path
                  d="M 40,28 C 90,0 150,56 220,24"
                  fill="none"
                  stroke="#d1bea8" // Brand 300
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                />
              </svg>

              {/* Pulsing Start Dot (User Location) */}
              <div className="absolute left-[36px] top-[24px] z-20 pointer-events-none">
                <div className="w-[9px] h-[9px] bg-brand-400 rounded-full border border-brand-200/80 shadow-[0_0_12px_rgba(184,156,125,0.9)]" />
                <div className="absolute inset-0 w-[9px] h-[9px] bg-brand-300 rounded-full animate-ping opacity-70" />
              </div>

              {/* Destination Drop Pin (Premium style marker) */}
              <motion.div
                initial={{ y: -40, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.5, duration: 0.7 }}
                className="absolute left-[208px] top-[5px] z-20 flex flex-col items-center pointer-events-none"
              >
                <div className="relative">
                  <div className="w-[22px] h-[22px] bg-brand-500 rounded-full border-2 border-brand-100 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                    <Coffee className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  {/* Pin drop shadow base */}
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ delay: 0.7 }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-black/60 rounded-full blur-[1px]" 
                  />
                </div>
              </motion.div>

              {/* Mini UI ETA tag */}
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, ...microSpring }}
                className="absolute left-3 bottom-[7px] bg-brand-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-brand-400/20 flex items-center gap-1 shadow-lg"
              >
                <Navigation className="w-1.5 h-1.5 text-brand-300" />
                <span className="text-[8px] font-semibold text-brand-50 tracking-widest uppercase">Wyznacz</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
