"use client";

import React from "react";
import { motion } from "motion/react";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemVariants } from "./animations";

export const PrimaryButton = ({
  children,
  onClick,
  type = "button",
  disabled,
  isLoading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
}) => (
  <motion.button
    variants={itemVariants}
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    whileHover={{ y: -2, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      "relative w-full overflow-hidden rounded-full bg-white px-8 py-4 text-[13px] font-bold tracking-[0.15em] text-brand-900 uppercase transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2.5 shadow-lg shadow-black/25 hover:shadow-black/35 group"
    )}
  >
    {/* Shimmer sweep on hover */}
    <span
      aria-hidden
      className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-80 group-hover:translate-x-[300%] transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
    />
    {isLoading ? (
      <>
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span className="sr-only">Ładowanie...</span>
      </>
    ) : (
      <>
        <span className="relative z-10">{children}</span>
        <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1.5" />
      </>
    )}
  </motion.button>
);
