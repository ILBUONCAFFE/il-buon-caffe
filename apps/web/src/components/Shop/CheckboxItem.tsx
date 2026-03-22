"use client";

import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

export const CheckboxItem: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = ({ label, checked, onChange, count }) => (
  <label
    className="flex items-center gap-3 cursor-pointer group mb-1.5 select-none py-1.5 px-2 rounded-lg hover:bg-brand-50 transition-colors focus-within:ring-2 focus-within:ring-brand-700"
  >
    <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
    />
    <div
      className={`
      w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all duration-300
      ${
        checked
          ? "bg-brand-800 border-brand-800 scale-100"
          : "bg-white border-brand-300 group-hover:border-brand-700"
      }
    `}
    >
      {checked && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Check size={12} className="text-white" strokeWidth={3} />
        </motion.div>
      )}
    </div>
    <span
      className={`text-sm transition-colors flex-1 ${
        checked
          ? "text-brand-900 font-medium"
          : "text-brand-600 group-hover:text-brand-900"
      }`}
    >
      {label}
    </span>
    {count !== undefined && (
      <span className="text-xs text-brand-400 tabular-nums bg-brand-100 px-2 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </label>
);
