"use client";

import React from "react";
import { motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemVariants } from "./animations";

export const Checkbox = ({
  id,
  checked,
  onChange,
  disabled,
  error,
  errorMessage,
  required,
  children,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <>
    <motion.label
      variants={itemVariants}
      className={cn(
        "flex items-start gap-3 group select-none mb-1",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={error}
          aria-describedby={errorMessage && id ? `${id}-error` : undefined}
        />
        <div
          className={cn(
            "w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center",
            error && !checked && "border-red-400/60 bg-red-400/10",
            !error && checked && "bg-brand-400 border-brand-400",
            !error && !checked && "border-white/20 bg-white/[0.05] group-hover:border-white/40"
          )}
        >
          {checked && <CheckCircle2 className="w-3 h-3 text-brand-900" strokeWidth={3} />}
        </div>
      </div>
      <span className="text-[13px] leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
        {children}
      </span>
    </motion.label>
    {errorMessage && id && (
      <p
        id={`${id}-error`}
        role="alert"
        className="flex items-center gap-1.5 px-1 mb-3 -mt-0.5"
      >
        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
        <span className="text-[12px] text-red-400">{errorMessage}</span>
      </p>
    )}
  </>
);
