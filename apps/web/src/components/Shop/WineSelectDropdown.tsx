"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, X } from "lucide-react";

export const WineSelectDropdown: React.FC<{
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  options: { value: string; count: number }[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}> = ({ label, icon, placeholder, options, value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (disabled) {
    return (
      <div className="opacity-40 pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-400 mb-2 flex items-center gap-2">
          {icon}
          {label}
        </div>
        <div className="w-full border border-dashed border-brand-200 rounded-xl py-3 px-4 text-sm text-brand-300 bg-brand-50/30">
          Wybierz kraj
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </div>

      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={value ? `${label}: ${value}` : `${label}: ${placeholder}`}
        className={`
          w-full flex items-center justify-between gap-2 border rounded-xl py-3 px-4 text-sm transition-all duration-300
          ${isOpen
            ? "border-brand-900 ring-4 ring-brand-900/10 bg-white"
            : value
              ? "border-brand-300 bg-white hover:border-brand-500 shadow-sm"
              : "border-brand-100 bg-brand-50/50 backdrop-blur-sm hover:border-brand-300 hover:bg-white"
          }
        `}
      >
        <span className={value ? "text-brand-900 font-medium" : "text-brand-400"}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Wyczyść ${label}`}
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onChange(null); setIsOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(null); setIsOpen(false); } }}
              className="w-5 h-5 rounded-full bg-brand-100 hover:bg-brand-200 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            >
              <X size={10} className="text-brand-700" />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-brand-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-brand-200 rounded-xl shadow-xl shadow-brand-900/8 overflow-hidden"
          >
            <div role="listbox" aria-label={label} className="max-h-[200px] overflow-y-auto wine-filter-scroll py-1">
              {options.length === 0 ? (
                <p className="text-xs text-brand-600 text-center py-6">Brak opcji</p>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={value === opt.value}
                    onClick={() => {
                      onChange(value === opt.value ? null : opt.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                      ${value === opt.value
                        ? "bg-brand-900 text-white"
                        : "text-brand-700 hover:bg-brand-50"
                      }
                    `}
                  >
                    <span>{opt.value}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] tabular-nums ${value === opt.value ? "text-brand-300" : "text-brand-400"}`}>
                        {opt.count}
                      </span>
                      {value === opt.value && <Check size={13} aria-hidden="true" className="text-white" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
