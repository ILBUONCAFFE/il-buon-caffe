"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { SORT_OPTIONS } from "./constants";
import type { SortOption } from "./constants";

export const SortDropdown: React.FC<{
  current: SortOption;
  onChange: (value: SortOption) => void;
}> = ({ current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === current)?.label;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Sortuj: ${currentLabel}`}
        className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900 transition-colors outline-none bg-white border border-brand-200 rounded-full px-4 py-2 hover:border-brand-300"
      >
        <span className="text-brand-600" aria-hidden="true">Sortuj:</span>
        <span className="font-medium" aria-hidden="true">{currentLabel}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-brand-700 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            role="listbox"
            aria-label="Opcje sortowania"
            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-brand-100 py-2 z-50"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="option"
                aria-selected={current === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                  ${
                    current === opt.value
                      ? "text-brand-900 font-medium bg-brand-50"
                      : "text-brand-600 hover:bg-brand-50 hover:text-brand-900"
                  }
                `}
              >
                {opt.label}
                {current === opt.value && (
                  <Check size={14} aria-hidden="true" className="text-brand-600" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
