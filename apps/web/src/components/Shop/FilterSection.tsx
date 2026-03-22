"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";

export const FilterSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, children }) => {
  const sectionId = `filter-section-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  const [isAnimating, setIsAnimating] = useState(false);
  return (
  <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-brand-100 hover:shadow-md transition-shadow">
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={sectionId}
      className="flex items-center justify-between w-full group outline-none"
    >
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 group-hover:text-brand-900 transition-colors">
        {title}
      </h3>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isOpen ? "bg-brand-50" : "group-hover:bg-brand-50"
        }`}
      >
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-brand-400 group-hover:text-brand-700 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>
    </button>

    <motion.div
      id={sectionId}
      initial={false}
      animate={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
        marginTop: isOpen ? 16 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
      className={isAnimating ? "overflow-hidden" : ""}
    >
      {children}
    </motion.div>
  </div>
);
};
