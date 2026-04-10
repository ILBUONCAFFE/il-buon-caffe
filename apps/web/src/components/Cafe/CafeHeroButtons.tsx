"use client";

import React from "react";
import { motion } from "motion/react";
import { Coffee, MapPin, ArrowDown } from "lucide-react";

export const CafeHeroButtons = () => {
  const scrollToSection = (id: string) => {
    if (['klasyki', 'specjaly', 'desery'].includes(id)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('changeMenuTab', { detail: id }));
      }
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 relative w-full pt-4">
      {/* MENU BUTTON */}
      <motion.button
        onClick={() => scrollToSection("menu")}
        className="cafe-hero-btn group relative overflow-hidden h-[50px] px-9 bg-transparent border border-white/20 hover:border-brand-400/30 text-white rounded-full text-[12px] uppercase tracking-[0.18em] font-medium cursor-pointer transition-[border-color] duration-700"
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {/* Background sweep */}
        <span className="absolute inset-0 rounded-full bg-white/[0.07] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]" />

        <span className="relative z-10 flex items-center gap-3">
          <Coffee 
            className="w-[15px] h-[15px] transition-all duration-500 ease-out group-hover:rotate-[-12deg] group-hover:text-brand-300" 
            strokeWidth={1.6}
          />
          <span className="transition-colors duration-500">
            Zobacz menu
          </span>
          <ArrowDown 
            className="w-3 h-3 opacity-0 translate-y-[-4px] group-hover:opacity-40 group-hover:translate-y-0 transition-all duration-500 delay-75 ease-out" 
            strokeWidth={1.5}
          />
        </span>
      </motion.button>

      {/* LOCATION BUTTON */}
      <motion.button
        onClick={() => scrollToSection("location")}
        className="cafe-hero-btn group relative overflow-hidden h-[50px] px-9 bg-transparent border border-white/20 hover:border-brand-400/30 text-white rounded-full text-[12px] uppercase tracking-[0.18em] font-medium cursor-pointer transition-[border-color] duration-700"
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {/* Background sweep */}
        <span className="absolute inset-0 rounded-full bg-white/[0.07] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]" />

        <span className="relative z-10 flex items-center gap-3">
          <MapPin 
            className="w-[15px] h-[15px] transition-all duration-500 ease-out group-hover:translate-y-[2px] group-hover:text-brand-300" 
            strokeWidth={1.6}
          />
          <span className="transition-colors duration-500">
            Jak dojechać
          </span>
          <ArrowDown 
            className="w-3 h-3 opacity-0 translate-y-[-4px] group-hover:opacity-40 group-hover:translate-y-0 transition-all duration-500 delay-75 ease-out" 
            strokeWidth={1.5}
          />
        </span>
      </motion.button>
    </div>
  );
};
