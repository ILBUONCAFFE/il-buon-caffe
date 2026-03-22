"use client";

import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

export const FilterChip: React.FC<{
  label: string;
  onRemove: () => void;
}> = ({ label, onRemove }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    onClick={onRemove}
    aria-label={`Usu\u0144 filtr: ${label}`}
    className="inline-flex items-center bg-white border border-brand-200 text-brand-700 shadow-sm rounded-full px-4 py-1.5 text-xs font-medium hover:border-brand-900 hover:text-brand-900 transition-all gap-2"
  >
    {label}
    <X size={12} aria-hidden="true" />
  </motion.button>
);
